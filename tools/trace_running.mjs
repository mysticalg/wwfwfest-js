// Offline reference only: no CPU code is included in the browser application.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node tools/trace_running.mjs mc68000.js program.bin output.json');
const {default: MC68000} = await import(pathToFileURL(hardwarePath));
const memory = new Uint8Array(0x200000);
memory.set(readFileSync(programPath));
const cpu = new MC68000();
const sounds = [];
for (let page = 0; page < 0x2000; page++) {
  cpu.memorymap[page].base = memory.subarray(page * 256, (page + 1) * 256);
  cpu.memorymap[page].write = null;
}
cpu.memorymap[0x1400].write16 = (address, value) => {
  if (address === 0x14000c) sounds.push(value & 255);
};
const word = address => memory[address] * 256 + memory[address + 1];
const long = address => (word(address) * 65536 + word(address + 2)) | 0;
const putWord = (address, value) => { memory[address] = value >> 8; memory[address + 1] = value; };
const putLong = (address, value) => { putWord(address, value >>> 16); putWord(address + 2, value); };
const actor = 0x1c05b0;
function call(address) {
  cpu.pc = address;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  cpu.a[0] = actor;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 10000) cpu._execute();
  assert(steps < 10000, `Running routine did not return: $${cpu.pc.toString(16)}`);
}
putWord(0x1c007c, 1);
const scenarios = [];
for (let type = 0; type < 12; type++) for (const facing of [0, 0x8000]) {
  for (const mask of [0, 1, 2]) for (const stopAt of [20, null]) {
    scenarios.push({type, facing, mask, stopAt, xFixed: 0x2801234, yFixed: 0x1505678,
      zFixed: 0x1400000, frames: stopAt === null ? 480 : 100});
  }
}
for (const x of [245, 270, 775, 800]) for (const y of [280, 340, 408]) {
  for (const mask of [1, 2]) scenarios.push({type: 8, facing: 0, mask,
    xFixed: x * 65536 + 0x1234, yFixed: y * 65536 + 0x5678,
    zFixed: 0x1400000, frames: 300, stopAt: null});
}
for (const bounceCount of [1, 2, 3]) for (const facing of [0, 0x8000]) {
  scenarios.push({type: 0, facing, mask: 0, bounceCount, stopAt: 10, frames: 700,
    xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1400000});
}
for (const stopKind of ['request', 'forced', 'release']) for (const facing of [0, 0x8000]) {
  scenarios.push({type: 4, facing, mask: facing ? 1 : 2, stopKind, stopAt: 20, frames: 100,
    xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1400000});
}
for (const facing of [0, 0x8000]) for (const index of [0, 1, 4]) for (const remaining of [0, 5]) {
  scenarios.push({type: 0, facing, pose: facing ^ 2, clock: {flags: 0x8001, index, remaining},
    movementMode: 1, mask: facing ? 1 : 2, stopAt: 20, frames: 100,
    xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1400000});
}
function snapshot() {
  return [word(actor + 0x20) & 255, word(actor + 0x1c), word(actor + 0x22),
    word(actor + 0x24), word(actor + 4), long(actor + 6), long(actor + 10), long(actor + 14),
    memory[actor + 1], word(actor + 0x2a), word(actor + 0x2c), word(actor + 0x2e),
    memory[actor + 0x32], memory[actor + 0x33], word(actor + 0x44),
    word(actor + 0x4c), word(actor + 0x18), word(actor + 0x1a),
    memory[actor + 0x36], memory[actor + 0x37], [...sounds],
    word(0x1c1150), word(0x1c11b0)];
}
const fixtures = [];
for (const initial of scenarios) {
  memory.fill(0, actor, actor + 0x10c);
  memory[actor] = 128;
  putWord(actor + 2, initial.type);
  putWord(actor + 4, initial.pose ?? initial.facing);
  putWord(actor + 0x1c, initial.clock?.flags || 0);
  putWord(actor + 0x22, initial.clock?.remaining || 0);
  putWord(actor + 0x24, initial.clock?.index || 0);
  memory[actor + 1] = initial.movementMode || 0;
  putWord(actor + 0x2e, initial.facing);
  putLong(actor + 6, initial.xFixed);
  putLong(actor + 10, initial.yFixed);
  putLong(actor + 14, initial.zFixed);
  putWord(actor + 0x20, 2);
  putWord(actor + 0x44, initial.bounceCount || 0);
  const hash = createHash('sha256');
  const rows = [];
  for (let tick = 0; tick < initial.frames; tick++) {
    sounds.length = 0;
    putWord(0x1c1150, 0);
    putWord(0x1c11b0, 0);
    let mask = initial.mask;
    const stopping = initial.stopAt !== null && tick >= initial.stopAt;
    if (stopping) mask = initial.stopKind === 'release' ? 0
      : initial.stopKind ? initial.mask : (memory[actor + 0x2d] & 128 ? 1 : 2);
    putWord(actor + 0xa8, mask);
    memory[actor + 0x34] = stopping && initial.stopKind === 'request' ? 2 : 0;
    putWord(actor + 0xfe, stopping && initial.stopKind === 'forced' ? 0x8000 : 0);
    if ((word(actor + 0x20) & 255) === 2) call(0xe58c);
    const state = word(actor + 0x20);
    if (!(state & 0x8000)) {
      putWord(actor + 0x1e, word(actor + 0x1c));
      putWord(actor + 0x1c, state);
      putWord(actor + 0x20, state | 0x8000);
    }
    putWord(actor + 0x36, 0);
    if (memory[actor + 1]) {
      call(0x27302);
      for (const [position, correction] of [[6, 0x38], [10, 0x3a], [14, 0x3c]]) {
        putWord(actor + position, word(actor + position) + word(actor + correction));
      }
    }
    call(0x1b27e);
    call(0x2218);
    call(0x232b6);
    const row = snapshot();
    hash.update(JSON.stringify(row) + '\n');
    rows.push(row);
    if (!(word(actor + 0x20) & 255)) break;
  }
  fixtures.push({initial, count: rows.length, sha256: hash.digest('hex'), final: rows.at(-1),
    ...(process.env.DETAIL ? {rows} : {})});
}
writeFileSync(outputPath, JSON.stringify({source: 'WWF WrestleFest US rev 2 original 68000 routines',
  scenarios: fixtures}, null, 2) + '\n');
console.log(`Recorded ${fixtures.length} running/braking/rebound scenarios`);
