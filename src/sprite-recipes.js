const byte = value => value & 255;
const word = value => value & 65535;
const signedByte = value => value << 24 >> 24;
const signedWord = value => value << 16 >> 16;
const aligned = address => address + (address & 1);
const bitCount = (value, mask) => {
  let count = 0;
  for (let bit = 1; bit <= mask; bit *= 2) if (bit & mask & value) count++;
  return count;
};

// Hand translation of the sprite data formats at $c452-$cede. This interprets
// tile recipes (columns, lists and paired layers), never CPU instructions.
export class SpriteRecipes {
  constructor(data, metadata) {
    this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.metadata = metadata;
  }

  read(address) {
    const offset = address - this.metadata.origin;
    if (offset < 0 || offset >= this.data.length) throw new RangeError(`Sprite recipe address $${address.toString(16)}`);
    return this.data[offset];
  }

  word(address) { return this.read(address) * 256 + this.read(address + 1); }
  long(address) { return this.word(address) * 65536 + this.word(address + 2); }
  base(type) { return this.long(this.metadata.recipeBaseTable + type * 4); }

  source(type, pose) {
    if (!Number.isInteger(type) || type < 0 || type >= this.metadata.frameCounts.length) return null;
    pose &= 0x7fff;
    if (pose >= this.metadata.frameCounts[type]) return null;
    const table = this.metadata.frameIndexTable;
    const offset = this.word(table + signedWord(this.word(table + type * 2)) + pose * 2);
    return offset >= 0xfffe ? null : this.base(type) + offset;
  }

  expand(type, pose, {targetType = null, x = 128, y = 128,
    paletteMap = Array.from({length: 16}, (_, index) => index)} = {}) {
    const source = this.source(type, pose);
    const commands = [];
    const result = {source, missing: source === null, requiresContext: false, commands};
    if (source === null) return result;
    const state = {x: word(x + 16), y: word(y + 144), mirror: pose & 0x8000 ? 16 : 0,
      dx: 0, dy: 0, paletteMap, commands};
    const header = this.word(source);
    const format = header >>> 14;
    if (format === 2) {
      if (!Number.isInteger(targetType) || targetType < 0 || targetType >= 12) result.requiresContext = true;
      else this.pair(source, type, targetType, state);
    } else if (format === 3) {
      for (const address of this.parts(source, this.base(type))) this.block(address, state);
    } else this.block(source, state);
    return result;
  }

  emit(fields, state, offsets = {x: 0, y: 0, color: 0}) {
    let x = byte(fields[0] + state.dx + offsets.x);
    if (state.mirror) x = byte(-x);
    x = word(state.x + signedByte(x));
    if (x > 0x15f) return;
    const y = word(state.y + signedByte(fields[1] + state.dy + offsets.y));
    if (y > 0x187) return;
    const outputX = word(x - 16), outputY = word(y - 144);
    const flags = ((fields[2] | (outputX & 256 ? 4 : 0) | (outputY & 256 ? 2 : 0)) ^ state.mirror) & 255;
    const color = state.paletteMap[byte(fields[3] + offsets.color)];
    state.commands.push([byte(outputY), flags, fields[5], fields[4], color & 15, byte(outputX)]);
    if (state.commands.length > 512) throw new RangeError('Sprite recipe exceeded the hardware list capacity');
  }

  prefix(address) {
    const header = this.word(address);
    const result = {count: header >>> 8, address: (header & 15) * 65536 + this.word(address + 2),
      x: 0, y: 0, color: 0};
    address += 4;
    for (const [flag, field] of [[64, 'x'], [32, 'y'], [16, 'color']]) {
      if (header & flag) result[field] = this.read(address++);
    }
    return {...result, next: address};
  }

  columns(address, length, bias = 0) {
    const kinds = this.word(address);
    address += 2;
    const columns = [];
    for (let index = 0; index < 6; index++) {
      const kind = (kinds >>> (index * 2)) & 3;
      if (kind === 0) {
        columns.push({at: address + bias});
        address += length;
      } else if (kind === 1) columns.push({constant: this.read(address++)});
      else {
        address = aligned(address);
        columns.push({at: this.metadata.sharedColumns + this.word(address) + (kind === 3 ? 0x8000 : 0) + bias});
        address += 2;
      }
    }
    return {columns, next: address};
  }

  drawColumns(columns, count, state, offsets) {
    for (let index = 0; index < count; index++) {
      this.emit(columns.map(column => column.constant ?? this.read(column.at++)), state, offsets);
    }
  }

  drawRaw(address, count, state, offsets) {
    for (let index = 0; index < count; index++, address += 6) {
      this.emit(Array.from({length: 6}, (_, field) => this.read(address + field)), state, offsets);
    }
    return address;
  }

  attachment(info, state, tail = false) {
    let address = info.address;
    const header = this.word(address);
    address += 2;
    if (!(header & 0x4000)) {
      if (tail) {
        if (header & 0x200) { address += 4 + bitCount(this.word(address), 0x70); }
        address += byte(header - info.count) * 6;
      }
      this.drawRaw(address, info.count, state, info);
      return;
    }
    if (header & 0x200) {
      const skip = bitCount(this.word(address), tail ? 0x70 : 0x888);
      address += 4 + (tail ? (skip + 1) & ~1 : skip);
    }
    const {columns} = this.columns(address, byte(header), tail ? byte(header - info.count) : 0);
    this.drawColumns(columns, info.count, state, info);
  }

  block(source, state) {
    const header = this.word(source);
    let address = source + 2;
    if (header & 0x200) {
      const prefix = this.prefix(address);
      this.attachment(prefix, state);
      address = prefix.next;
    }
    if (header & 0x4000) {
      const columns = this.columns(aligned(address), byte(header));
      this.drawColumns(columns.columns, byte(header), state);
      address = columns.next;
    } else address = this.drawRaw(address, byte(header), state);
    if (header & 0x100) this.attachment(this.prefix(aligned(address)), state, true);
  }

  parts(source, base) {
    const header = this.word(source);
    if (!(header & 0x8000)) return [source];
    return Array.from({length: byte(header)}, (_, index) => base + this.word(source + 2 + index * 2));
  }

  pair(source, type, targetType, state) {
    const targetSource = this.source(targetType, this.word(source + 2));
    if (targetSource === null) return;
    const own = this.parts(this.base(type) + this.word(source + 4), this.base(type));
    const other = this.parts(targetSource, this.base(targetType));
    const offset = source + 6 + targetType * 2;
    const otherState = {...state, dx: this.read(offset), dy: this.read(offset + 1)};
    let order = this.word(source);
    while (own.length || other.length) {
      const target = Boolean(order & 1);
      order >>>= 1;
      const useOther = target ? other.length > 0 : own.length === 0;
      this.block((useOther ? other : own).shift(), useOther ? otherState : state);
    }
  }
}

// Convert hardware descriptor bytes into the existing Canvas chain convention.
export function recipePieces(commands) {
  return commands.map(([rawY, flags, low, high, color, rawX]) => {
    let x = rawX | (flags & 4) << 6;
    if (x > 496) x -= 512;
    return {x, y: ((256 - (rawY | (flags & 2) << 7)) & 511) - 24,
      flags, code: low | high << 8, color};
  });
}
