// Original sprite expander reference. The external CPU is offline research only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node tools/trace_sprite_recipes.mjs mc68000.js program.bin output.json');
const {default: MC68000} = await import(pathToFileURL(hardwarePath));
const memory = new Uint8Array(0x200000);
memory.set(readFileSync(programPath));
const cpu = new MC68000();
for (let page = 0; page < 0x2000; page++) {
  cpu.memorymap[page].base = memory.subarray(page * 256, (page + 1) * 256);
  cpu.memorymap[page].write = null;
}
const word = address => memory[address] * 256 + memory[address + 1];
const putWord = (address, value) => { memory[address] = value >> 8; memory[address + 1] = value; };
const putLong = (address, value) => { putWord(address, value >>> 16); putWord(address + 2, value); };
const actor = 0x1c3000, target = 0x1c3200;
for (let index = 0; index < 16; index++) memory[0x1c1610 + index] = index;
putLong(actor + 0x26, target);
function call() {
  cpu.pc = 0xc43c;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  cpu.a[0] = actor;
  cpu.a[2] = 0xc2000;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 200000) cpu._execute();
  assert(steps < 200000, `Sprite expander did not return: type ${word(actor + 2)} pose ${word(actor + 4)} peer ${word(target + 2)} at $${cpu.pc.toString(16)}`);
  const commands = [];
  for (let address = 0xc2000; address < cpu.a[2]; address += 16) {
    commands.push([0, 2, 4, 6, 8, 10].map(offset => word(address + offset) & (offset === 8 ? 15 : 255)));
  }
  return commands;
}
if (process.env.PIXEL_CASES) {
  const input = JSON.parse(readFileSync(process.env.PIXEL_CASES));
  const frames = [];
  for (const {type, pose, targetType, mirror, x, y} of input.frames || input) {
    putWord(actor + 2, type);
    putWord(actor + 4, pose | (mirror ? 0x8000 : 0));
    putWord(actor + 0x14, x);
    putWord(actor + 0x16, y);
    putWord(target + 2, targetType);
    frames.push({type, pose, targetType, mirror, x, y, commands: call()});
  }
  writeFileSync(outputPath, JSON.stringify({source: 'Original $c43c hardware sprite descriptors', frames}) + '\n');
  console.log(`Captured ${frames.length} original sprite display cases`);
  process.exit(0);
}
const types = process.env.TYPES ? JSON.parse(process.env.TYPES) : Array.from({length: 13}, (_, index) => index);
const targets = process.env.TARGETS ? JSON.parse(process.env.TARGETS) : Array.from({length: 12}, (_, index) => index);
const origins = process.env.ORIGINS ? JSON.parse(process.env.ORIGINS) : [[128, 128]];
const scenarios = process.env.APPEND ? JSON.parse(readFileSync(outputPath)).scenarios : [];
for (const type of types) for (const targetType of targets) for (const mirror of [false, true]) {
  for (const [x, y] of origins) {
    putWord(actor + 2, type);
    putWord(actor + 0x14, x);
    putWord(actor + 0x16, y);
    putWord(target + 2, targetType);
    const hash = createHash('sha256');
    // The last table word is $ffff, a terminator rather than another frame.
    const count = type === 12 ? 18 : 564;
    const rows = [];
    let pieces = 0;
    for (let pose = 0; pose < count; pose++) {
      putWord(actor + 4, pose | (mirror ? 0x8000 : 0));
      const commands = call();
      pieces += commands.length;
      hash.update(JSON.stringify(commands) + '\n');
      if (process.env.DETAIL) rows.push(commands);
    }
    scenarios.push({type, targetType, mirror, x, y, count, pieces, sha256: hash.digest('hex'),
      ...(process.env.DETAIL ? {rows} : {})});
  }
  console.log(`Recorded sprite type ${type}, peer ${targetType}, mirror ${mirror}`);
}
writeFileSync(outputPath, JSON.stringify({source: 'WWF WrestleFest US rev 2 original $c43c sprite expander',
  scenarios}, null, 2) + '\n');
