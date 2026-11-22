import {stageTables} from './data/stage-tables.js';

const u16 = value => value & 0xffff;
const u8 = value => value & 255;

// $027800-$027e86 for the normal ring's shared crowd handler. The 47 slots,
// initialized-first scheduling, byte counters and group synchronization match
// the original. The sync search examines only the first 46 slots in the source.
export class SceneryAnimator {
  constructor(state = {}) {
    this.visible = [...(state.visible || [])];
    this.records = Array.from({length: 47}, (_, index) => {
      const [flags = 0, frame = 0, remaining = 0, group = 0] = state.records?.[index] || [];
      return {flags, frame, remaining, group};
    });
    this.events = [];
  }

  step(chunkX, chunkY) {
    const minX = u8((u16(chunkX + 1) >>> 1) - 2);
    const maxX = u8((u16(chunkX - 1) >>> 1) + 6);
    const maxY = u8((u16(chunkY + 1) >>> 1) + 2);
    const minY = u8(maxY - 8);
    const visible = stageTables.visibility.filter(entry => entry.x >= minX && entry.x < maxX
      && entry.y < maxY && entry.y >= minY).map(entry => entry.animation);
    for (const id of this.visible) {
      if (visible.includes(id)) continue;
      const record = this.records.find(record => (record.flags & 128) && (record.flags & 63) === id);
      Object.assign(record, {flags: 0, frame: 0, remaining: 0, group: 0});
    }
    for (const id of visible) {
      if (this.visible.includes(id)) continue;
      const record = this.records.find(record => !(record.flags & 128));
      record.flags = id | 128;
    }
    this.visible = visible;
    this.events = [];
    for (let pass = 0; pass < 2; pass++) {
      this.records.forEach((record, index) => {
        if (!(record.flags & 128) || Boolean(record.flags & 64) !== (pass === 0)) return;
        this.advance(record, index);
      });
    }
    return this.events;
  }

  advance(record, index) {
    const data = stageTables.animations[record.flags & 63];
    if (!(record.flags & 64)) {
      record.flags |= 64;
      record.group = data.group;
      const other = record.group ? this.records.slice(0, 46).find((candidate, otherIndex) =>
        otherIndex !== index && (candidate.group & 63) === (record.group & 63)) : null;
      record.frame = other ? other.frame : 0;
      record.remaining = other ? other.remaining : data.frames[0].delay;
    } else {
      const previous = record.remaining;
      record.remaining = u8(previous - 1);
      if (previous !== 0) return;
      record.frame = u8(record.frame + 1);
      if (record.frame >= data.frames.length) record.frame = 0;
      record.remaining = data.frames[record.frame].delay;
    }
    this.events.push({layer: record.group & 128 ? 1 : 0, patch: data.frames[record.frame].patch});
  }

  patches() {
    return this.records.filter(record => (record.flags & 192) === 192).map(record => {
      const animation = stageTables.animations[record.flags & 63];
      return stageTables.patches[animation.frames[record.frame].patch];
    });
  }

  snapshot() {
    return {visible: [...this.visible], records: this.records.map(record =>
      [record.flags, record.frame, record.remaining, record.group])};
  }
}
