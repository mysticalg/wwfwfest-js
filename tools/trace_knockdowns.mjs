// Original-program reference generation. CPU code is supplied externally for
// offline research and is excluded from browser delivery.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node tools/trace_knockdowns.mjs mc68000.js program.bin output.json');
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
const target = 0x1c06bc;
function call(address, currentActor = actor) {
  cpu.pc = address;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  cpu.a[0] = currentActor;
  cpu.a[1] = currentActor === actor ? target : actor;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 10000) cpu._execute();
  assert(steps < 10000, `Knockdown routine did not return: $${cpu.pc.toString(16)}`);
}
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

putWord(0x1c007e, 0);
putWord(0x1c007c, 1);
const collision = digest();
let seed = 0x4b4e4f43;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
for (let index = 0; index < 32768; index++) {
  memory.fill(0, actor, actor + 0x10c);
  const initial = {x: random() % 1100, y: random() % 800, z: random() % 600,
    facing: random() & 0x8000, flags32: [0, 1, 16, 32][index % 4],
    paddingX: (random() % 161) - 80, paddingY: (random() % 65) - 32,
    paddingZ: (random() % 65) - 32, kind: index % 3, flags: index & 31};
  putWord(actor + 6, initial.x);
  putWord(actor + 10, initial.y);
  putWord(actor + 14, initial.z);
  putWord(actor + 0x2e, initial.facing);
  memory[actor + 0x32] = initial.flags32;
  putWord(actor + 0x3e, initial.paddingX);
  putWord(actor + 0x40, initial.paddingY);
  putWord(actor + 0x42, initial.paddingZ);
  memory[actor + 0x36] = initial.kind;
  memory[actor + 0x37] = initial.flags;
  call(0x27302);
  collision.add([memory[actor + 0x36], memory[actor + 0x37], word(actor + 0x38), word(actor + 0x3a), word(actor + 0x3c)]);
}

const scenarios = [];
for (const reaction of [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13]) {
  for (const facing of [0, 0x8000]) for (const severity of [0, 1, 2]) {
    scenarios.push({reaction: reaction | (severity === 2 && reaction <= 9 ? 0x8000 : 0),
      facing, severity, health: [90, 45, 20][severity], maximumHealth: 100,
      xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1401234});
  }
}
for (const x of [220, 250, 760, 800]) for (const y of [285, 330, 390, 405]) {
  for (const facing of [0, 0x8000]) scenarios.push({reaction: 2, facing, severity: 0, health: 90,
    maximumHealth: 100, xFixed: x * 65536 + 0x1234, yFixed: y * 65536 + 0x5678, zFixed: 0x1401234});
}
for (const reaction of [2, 6, 7, 8, 9]) for (const severity of [0, 1, 2]) {
  scenarios.push({reaction, facing: 0, severity, health: [90, 45, 20][severity], maximumHealth: 100,
    xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1401234, mashEvery: 4});
}
for (const flags56 of [0, 128]) scenarios.push({reaction: 2, facing: 0, severity: 2, health: 20,
  maximumHealth: 100, flags56, flags33: 32, xFixed: 0x2801234, yFixed: 0x1505678,
  zFixed: 0x1401234, pinnedFrom: 80, pinnedUntil: 200});
for (const facing of [0, 0x8000]) scenarios.push({reaction: 0x8002, facing, severity: 2,
  health: 0, maximumHealth: 100, xFixed: 0x2801234, yFixed: 0x1505678, zFixed: 0x1401234});

function snapshot() {
  return [word(actor + 0x20) & 255, word(actor + 0x64), word(actor + 0x60),
    word(actor + 0x1c), word(actor + 0x22), word(actor + 0x24), word(actor + 4),
    long(actor + 6), long(actor + 10), long(actor + 14), memory[actor + 1],
    word(actor + 0x58), word(actor + 0x5a), word(actor + 0x5c), word(actor + 0x5e),
    word(actor + 0x3e), memory[actor + 0x36], memory[actor + 0x37], word(actor + 0x9a),
    word(actor + 0xaa), word(actor + 0x2e), memory[actor + 0x33], [...sounds]];
}
const fixtures = [];
for (const initial of scenarios) {
  memory.fill(0, actor, actor + 0x10c * 2);
  putLong(actor + 6, initial.xFixed);
  putLong(actor + 10, initial.yFixed);
  putLong(actor + 14, initial.zFixed);
  putWord(actor + 0x2e, initial.facing);
  putWord(actor + 4, initial.facing);
  putWord(actor + 0x64, initial.reaction);
  putWord(actor + 0x20, 4);
  putWord(actor + 0x66, initial.health);
  putWord(actor + 0x72, initial.maximumHealth);
  putWord(actor + 0x70, initial.severity);
  memory[actor + 0x56] = initial.flags56 || 0;
  memory[actor + 0x33] = initial.flags33 || 0;
  putLong(actor + 0x7a, target);
  putWord(0x1c17ee, 0x241);
  const hash = digest();
  const rows = [];
  for (let tick = 0; tick < 700; tick++) {
    sounds.length = 0;
    const pressed = initial.mashEvery && tick % initial.mashEvery === 0 ? 1 : 0;
    const pinned = tick >= (initial.pinnedFrom ?? Infinity) && tick < initial.pinnedUntil;
    memory[actor + 0xa3] = pressed;
    memory[target + 0x34] = pinned ? 16 : 0;
    if (pressed && !(memory[actor + 0x56] & 0xc0) && (word(actor + 0x20) & 0x8000)) call(0xde04);
    const state = word(actor + 0x20);
    if (!(state & 0x8000)) {
      putWord(actor + 0x1e, word(actor + 0x1c));
      putWord(actor + 0x1c, state);
      putWord(actor + 0x20, state | 0x8000);
    }
    putWord(actor + 0x36, 0);
    if (memory[actor + 1]) {
      call(0x27302);
      if (memory[actor + 0x37]) {
        for (const [position, correction] of [[6, 0x38], [10, 0x3a], [14, 0x3c]]) {
          putWord(actor + position, word(actor + position) + word(actor + correction));
        }
      }
    }
    call(0x1b27e);
    call(0x2218);
    const row = snapshot();
    hash.add(row);
    rows.push(row);
    if ((word(actor + 0x20) & 255) === 0) break;
  }
  assert(rows.length < 700, `Recovery did not finish: ${JSON.stringify(initial)}`);
  fixtures.push({initial, ...hash.finish(), final: rows.at(-1),
    ...(process.env.DETAIL ? {rows} : {})});
}

const severityCases = [];
for (const maximumHealth of [0, 24, 96, 100, 110, 135, 500]) {
  for (let health = 0; health <= maximumHealth + 8; health++) {
    putWord(actor + 0x66, health);
    putWord(actor + 0x72, maximumHealth);
    putWord(actor + 0x70, 1);
    call(0x240e8);
    severityCases.push({health, maximumHealth, previous: 1, severity: word(actor + 0x70)});
  }
}

const projectionCases = [];
putWord(0x1c17e6, 0x1cd);
putWord(0x1c17ee, 0x241);
for (let index = 0; index < 128; index++) {
  const initial = {xFixed: ((0x1cd + 40 + index * 13 % 240) * 65536 + index * 197) | 0,
    yFixed: ((300 + index * 17 % 100) * 65536 + index * 211) | 0,
    zFixed: ((320 + index * 19 % 100) * 65536 + index * 223) | 0};
  putLong(actor + 6, initial.xFixed);
  putLong(actor + 10, initial.yFixed);
  putLong(actor + 14, initial.zFixed);
  putWord(actor + 0x18, 0);
  putWord(actor + 0x1a, 0);
  call(0x248c);
  const signedWord = address => word(address) << 16 >> 16;
  projectionCases.push({initial, screen: {x: signedWord(actor + 0x14), y: 232 - signedWord(actor + 0x16)}});
}

const matches = [];
for (const attackerIndex of [0, 1]) for (const initialHealth of [100, 20, 3]) {
  memory.fill(0, actor, actor + 0x10c * 2);
  putWord(0x1c17e6, 0x1cd);
  putWord(0x1c17ea, 0x1cd);
  putWord(0x1c17ee, 0x241);
  putWord(0x1c17f2, 0x241);
  for (const base of [actor, target]) {
    memory[base] = 128;
    memory[base + 0x33] = 1;
    putLong(base + 6, (base === actor ? 0x280 : 0x280 + 40) * 65536);
    putLong(base + 10, 0x14c0000);
    putLong(base + 14, 0x1400000);
    putWord(base + 4, base === actor ? 0x8000 : 0);
    putWord(base + 0x90, base === actor ? 0x8000 : 0);
    putWord(base + 0x2e, base === actor ? 0x8000 : 0);
    putWord(base + 0x20, 0x8000);
    putWord(base + 0x1c, 0x8000);
    putWord(base + 0x4c, 1);
    putWord(base + 0x66, initialHealth);
    putWord(base + 0x72, 100);
    putWord(base + 0x70, initialHealth <= 24 ? 2 : 0);
    putLong(base + 0x7a, base === actor ? target : actor);
  }
  memory[target + 0x56] = attackerIndex ? 128 : 0;
  const frames = 620;
  const hash = digest();
  const rows = [];
  const mashFrames = [];
  let sawKnockdown = false;
  let recoveryFinished = false;
  for (let tick = 0; tick < frames; tick++) {
    sounds.length = 0;
    call(0x25b5c);
    call(0x28a62);
    const strike = [0, 49, 98, 147].includes(tick);
    const mash = attackerIndex === 1 && !recoveryFinished && tick > 180 && tick % 4 === 0;
    if (mash) mashFrames.push(tick);
    for (const [index, base] of [actor, target].entries()) {
      const pressed = index === attackerIndex ? Number(strike) : Number(mash);
      memory[base + 0xa3] = pressed;
      const state = word(base + 0x20) & 255;
      if (pressed && index === attackerIndex && state === 0) {
        putWord(base + 0x20, 5);
        putWord(base + 0x60, 0);
      } else if (pressed && index !== attackerIndex && !(memory[base + 0x56] & 0xc0)
        && (word(base + 0x20) & 0x8000)) call(0xde04, base);
      if (state === 0 || state === 1) call(0xfe28, base);
    }
    for (const base of [actor, target]) {
      const state = word(base + 0x20);
      if (!(state & 0x8000)) {
        putWord(base + 0x1e, word(base + 0x1c));
        putWord(base + 0x1c, state);
        putWord(base + 0x20, state | 0x8000);
      }
      putWord(base + 0x36, 0);
      if (memory[base + 1]) {
        call(0x27302, base);
        if (memory[base + 0x37]) {
          for (const [position, correction] of [[6, 0x38], [10, 0x3a], [14, 0x3c]]) {
            putWord(base + position, word(base + position) + word(base + correction));
          }
        }
      }
      call(0x1b27e, base);
      call(0x248c, base);
      call(0x2218, base);
    }
    call(0x232b6);
    if (!(tick & 1)) { call(0x23288); call(0x2407e); }
    const row = {actors: [actor, target].map(base => [word(base + 0x20) & 255, word(base + 4),
      word(base + 0x4c), long(base + 6), long(base + 10), long(base + 14),
      word(base + 0x66), word(base + 0x70), word(base + 0x52), word(base + 0x54), word(base + 0x2e)]),
      sounds: [...sounds], camera: [word(0x1c17e6), word(0x1c17ee), word(0x1c17ea), word(0x1c17f2)],
      projection: [actor,target].map(base=>[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)])};
    hash.add(row);
    rows.push(row);
    if ((word(actor + 0x20) & 255) === 4 && (word(actor + 0x64) & 255) >= 2) sawKnockdown = true;
    if (sawKnockdown && (word(actor + 0x20) & 255) === 0) recoveryFinished = true;
  }
  matches.push({attackerIndex, initialHealth, frames, mashFrames, ...hash.finish(), final: rows.at(-1),
    ...(process.env.DETAIL ? {rows} : {})});
}

const boundaryWalks = [];
for (const type of [0, 8]) for (const axis of ['depth', 'horizontal']) {
  memory.fill(0, actor, actor + 0x10c * 2);
  memory[actor] = 128;
  putWord(actor + 2, type);
  putLong(actor + 6, 0x2800000);
  putLong(actor + 10, 0x14c0000);
  putLong(actor + 14, 0x1400000);
  putWord(actor + 4, 0x8000);
  putWord(actor + 0x90, 0x8000);
  putWord(actor + 0x2e, 0x8000);
  putWord(actor + 0x20, 0x8000);
  putWord(actor + 0x1c, 0x8000);
  putWord(actor + 0x4c, 1);
  putWord(target + 6, 700);
  putLong(actor + 0x7a, target);
  const segments = axis === 'depth' ? [{vertical: -1, ticks: 140}, {vertical: 0, ticks: 4},
    {vertical: 1, ticks: 280}, {vertical: 0, ticks: 4}]
    : [{horizontal: -1, ticks: 200}, {horizontal: 0, ticks: 4},
      {horizontal: 1, ticks: 220}, {horizontal: 0, ticks: 4}];
  const hash = digest();
  const rows = [];
  for (const {vertical = 0, horizontal = 0, ticks} of segments) for (let tick = 0; tick < ticks; tick++) {
    const desiredState = vertical || horizontal ? 1 : 0;
    if ((word(actor + 0x20) & 255) !== desiredState) putWord(actor + 0x20, desiredState);
    const direction = (horizontal > 0 ? 1 : horizontal < 0 ? 2 : 0)
      | (vertical < 0 ? 4 : vertical > 0 ? 8 : 0);
    putWord(actor + 0x2c, word(0xe516 + direction * 2));
    call(0xfe28);
    const state = word(actor + 0x20);
    if (!(state & 0x8000)) {
      putWord(actor + 0x1e, word(actor + 0x1c));
      putWord(actor + 0x1c, state);
      putWord(actor + 0x20, state | 0x8000);
    }
    putWord(actor + 0x36, 0);
    if (memory[actor + 1]) {
      call(0x27302);
      if (memory[actor + 0x37]) for (const [position, correction] of [[6, 0x38], [10, 0x3a], [14, 0x3c]]) {
        putWord(actor + position, word(actor + position) + word(actor + correction));
      }
    }
    call(0x1b27e);
    call(0x2218);
    call(0x232b6);
    const row = [long(actor + 6), long(actor + 10), long(actor + 14), word(actor + 4),
      word(actor + 0x4c), memory[actor + 1]];
    hash.add(row);
    rows.push(row);
  }
  boundaryWalks.push({type, axis, segments, ...hash.finish(), final: rows.at(-1),
    ...(process.env.DETAIL ? {rows} : {})});
}

writeFileSync(outputPath, JSON.stringify({collision: collision.finish(), scenarios: fixtures,
  severityCases, projectionCases, matches, boundaryWalks}, null, 2));
console.log(`Captured 32,768 ring collision cases and ${fixtures.length} complete knockdown/recovery scenarios`);
