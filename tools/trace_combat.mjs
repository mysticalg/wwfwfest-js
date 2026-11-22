// Offline original-program comparisons for standing attacks and contact geometry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node tools/trace_combat.mjs mc68000.js program.bin output.json');
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
const putWord = (address, value) => { memory[address] = value >> 8; memory[address + 1] = value; };
const putLong = (address, value) => { putWord(address, value >>> 16); putWord(address + 2, value); };
const actor = 0x1c05b0;
const target = 0x1c06bc;
function call(address, currentActor = actor) {
  cpu.pc = address;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  cpu.a[0] = currentActor;
  cpu.a[1] = target;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 10000) cpu._execute();
  assert(steps < 10000, `Combat routine did not return: $${cpu.pc.toString(16)}`);
  return !(cpu.sr & 1);
}
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}
function record(base, value) {
  putWord(base + 6, value.x);
  putWord(base + 10, value.y);
  putWord(base + 14, value.z);
  putWord(base + 4, value.pose);
  putWord(base + 0x4c, value.contact);
}

const geometry = digest();
const ground = digest();
const offsets = [-80, -64, -40, -1, 0, 16, 40, 64, 79, 80];
const heights = [-96, 0, 48, 96];
for (let a = 0; a < 34; a++) for (let b = 0; b < 34; b++) {
  for (let poseBits = 0; poseBits < 4; poseBits++) {
    for (const dx of offsets) for (const dz of heights) {
      const attacker = {x: 0x280, y: 0x150, z: 0, pose: poseBits & 1 ? 0x8000 : 0, contact: a};
      const other = {x: attacker.x + dx, y: 0x150, z: dz,
        pose: poseBits & 2 ? 0x8000 : 0, contact: b};
      record(actor, attacker);
      record(target, other);
      cpu.a[2] = 0x2411c + a * 7;
      geometry.add(Number(call(0x2340e)));
      // The original distance gate includes state and hit-mask checks. Arrange
      // eligible records here so its result isolates the distance/shape path.
      putWord(target + 0x20, 0x8000);
      putWord(target + 0x32, 0);
      putWord(target + 0xfe, 0);
      putWord(actor + 0x8e, 0);
      const eligible = b !== 0 && call(0x2334c);
      ground.add(Number(Boolean(memory[0x2411c + a * 7] & 128) && eligible && call(0x2340e)));
    }
  }
}

const actions = [];
const depthCases = [];
for (const contact of [1, 12, 20, 32]) for (const dy of [-21, -20, -12, -11, 0, 11, 12, 19, 20]) {
  memory.fill(0, actor, actor + 0x10c * 2);
  record(actor, {x: 0x280, y: 0x150, z: 0, pose: 0x8000, contact: 7});
  record(target, {x: 0x280 + 40, y: 0x150 + dy, z: 0, pose: 0, contact});
  putWord(target + 0x20, 0x8000);
  cpu.a[2] = 0x2411c + 7 * 7;
  const hit = call(0x2334c) && call(0x2340e);
  depthCases.push({contact, dy, hit});
}
for (const button of [0, 1]) for (const facing of [0, 0x8000]) {
  memory.fill(0, actor, actor + 0x10c * 2);
  memory[actor] = 128;
  // Bypass world-boundary correction only. It is a separate untranslated path.
  memory[actor + 0x32] = 32;
  putWord(actor + 4, facing);
  putWord(actor + 0x90, facing);
  putWord(actor + 0x2e, facing);
  putWord(actor + 0x1c, 5);
  putWord(actor + 0x20, 0x8005);
  putWord(actor + 0x60, button ? 114 : 0);
  putWord(actor + 0x4c, 1);
  const rows = [];
  for (let tick = 0; tick < 100; tick++) {
    call(0x1b27e);
    call(0x232b6);
    const done = word(actor + 0x20) === 0;
    rows.push([word(actor + 0x22), word(actor + 0x24), word(actor + 4), word(actor + 0x4c), done]);
    if (done) break;
  }
  assert(rows.length < 100);
  actions.push({button, facing, rows});
}

const reactions = [];
for (const kind of [0, 1]) for (const facing of [0, 0x8000]) {
  memory.fill(0, actor, actor + 0x10c * 2);
  memory[actor] = 128;
  putWord(actor + 4, facing);
  putWord(actor + 0x2e, facing);
  putWord(actor + 0x1c, 4);
  putWord(actor + 0x20, 0x8004);
  putWord(actor + 0x64, kind ? 10 : 0);
  const rows = [];
  for (let tick = 0; tick < 100; tick++) {
    call(0x1b27e);
    const done = word(actor + 0x20) === 0;
    rows.push([word(actor + 0x22), word(actor + 0x24), word(actor + 4), done]);
    if (done) break;
  }
  assert(rows.length < 100);
  reactions.push({kind, facing, rows});
}

const responses = [];
putWord(0x1c007c, 1); // Enable the original sound-command output.
for (const button of [0, 1]) for (const combination of [0, 1, 2, 3, 4, 5, 6, 7]) {
  for (const combo of [0, 2, 3, 4]) for (const highFlags of [0, 0x4000, 0x8000]) {
    memory.fill(0, actor, actor + 0x10c * 2);
    sounds.length = 0;
    const facing = combination & 1 ? 0x8000 : 0;
    const targetFacing = combination & 2 ? 0x8000 : 0;
    const flags33 = combination & 4 ? 16 : 0;
    const contact = (button ? 17 : 7);
    putWord(actor + 0x2e, facing);
    putWord(target + 0x2e, targetFacing);
    putWord(target + 0x4c, highFlags | 1);
    putWord(target + 0x52, combo);
    memory[target + 0x33] = flags33;
    cpu.a[2] = 0x2411c + contact * 7;
    cpu.a[3] = 0x2411c + 7;
    const accepted = call(0x23580);
    responses.push({button, facing, targetFacing, flags33, combo, targetContact: highFlags | 1,
      accepted, damage: word(target + 0x68), reaction: word(target + 0x64), sounds: [...sounds]});
  }
}

const matches = [];
for (const button of [0, 1]) for (const distance of [40, 70, 80]) {
  memory.fill(0, 0x1c05b0, 0x1c05b0 + 9 * 0x10c);
  sounds.length = 0;
  for (const base of [actor, target]) {
    memory[base] = 128;
    memory[base + 0x32] = 32;
    putWord(base + 0x1c, 0x8000);
    putWord(base + 0x20, 0x8000);
    putWord(base + 0x4c, 1);
    putWord(base + 0x66, 100);
    putWord(base + 0x72, 100);
    putWord(base + 6, base === actor ? 0x280 : 0x280 + distance);
    putWord(base + 10, 0x150);
    putLong(base + 0x7a, base === actor ? target : actor);
  }
  putWord(actor + 4, 0x8000);
  putWord(actor + 0x90, 0x8000);
  putWord(actor + 0x2e, 0x8000);
  putWord(actor + 0x20, 5);
  putWord(actor + 0x60, button ? 114 : 0);
  const rows = [];
  for (let tick = 0; tick < 100; tick++) {
    const firstSound = sounds.length;
    for (const base of [actor, target]) {
      const state = word(base + 0x20);
      if (!(state & 0x8000)) {
        putWord(base + 0x1c, state);
        putWord(base + 0x20, state | 0x8000);
      }
      call(0x1b27e, base);
    }
    call(0x232b6);
    call(0x23288);
    call(0x2407e);
    rows.push({actors: [actor, target].map(base => [word(base + 4), word(base + 0x4c),
      word(base + 0x20) & 255, word(base + 0x66), word(base + 0x52), word(base + 0x54)]),
      sounds: sounds.slice(firstSound)});
  }
  matches.push({button, distance, rows});
}

writeFileSync(outputPath, JSON.stringify({offsets, heights, geometry: geometry.finish(),
  ground: ground.finish(), depthCases, actions, reactions, responses, matches}, null, 2));
console.log(`Captured ${34 * 34 * 4 * offsets.length * heights.length} geometry/gate cases, ${actions.length} standing actions, ${reactions.length} reactions and ${responses.length} hit responses`);
