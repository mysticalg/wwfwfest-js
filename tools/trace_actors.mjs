// Offline differential reference generation. The externally supplied 68000
// interpreter is an analysis dependency and is never part of browser delivery.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath] = process.argv.slice(2);
if (!hardwarePath || !programPath || !outputPath) {
  throw new Error('Usage: node tools/trace_actors.mjs mc68000.js program.bin output.json');
}
const {default: MC68000} = await import(pathToFileURL(hardwarePath));
const memory = new Uint8Array(0x200000);
memory.set(readFileSync(programPath));
const cpu = new MC68000();
for (let page = 0; page < 0x2000; page++) {
  cpu.memorymap[page].base = memory.subarray(page * 256, (page + 1) * 256);
  cpu.memorymap[page].write = null;
}
const word = address => memory[address] * 256 + memory[address + 1];
const long = address => (word(address) * 65536 + word(address + 2)) | 0;
const putWord = (address, value) => { memory[address] = value >> 8; memory[address + 1] = value; };
const putLong = (address, value) => { putWord(address, value >>> 16); putWord(address + 2, value); };
const actor = 0x1c3000;
function call(address) {
  cpu.pc = address;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  cpu.a[0] = actor;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 2000) cpu._execute();
  assert(steps < 2000, `Actor routine did not return: $${cpu.pc.toString(16)}`);
}
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

const polar = digest();
for (let direction = 0; direction < 256; direction++) {
  for (let speed = 0; speed < 256; speed++) {
    cpu.d[0] = direction;
    cpu.d[1] = speed;
    call(0x22d0);
    polar.add([direction, speed, cpu.d[2], cpu.d[3]]);
  }
}

let seed = 0x57465746;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const motion = [];
for (let index = 0; index < 1024; index++) {
  const initial = {movementMode: index % 3, direction: random() & 0xffff, speed: random() & 0xffff,
    xFixed: random() | 0, yFixed: random() | 0, zFixed: random() | 0,
    velocityX: random() & 0xffff, velocityY: random() & 0xffff,
    velocityZ: random() & 0xffff, gravity: random() & 0xffff};
  memory.fill(0, actor, actor + 0x10c);
  memory[actor + 1] = initial.movementMode;
  putWord(actor + 0x2c, initial.direction);
  putWord(actor + 0x2a, initial.speed);
  putLong(actor + 6, initial.xFixed);
  putLong(actor + 10, initial.yFixed);
  putLong(actor + 14, initial.zFixed);
  putWord(actor + 0x58, initial.velocityX);
  putWord(actor + 0x5a, initial.velocityY);
  putWord(actor + 0x5c, initial.velocityZ);
  putWord(actor + 0x5e, initial.gravity);
  const hash = digest();
  for (let tick = 0; tick < 16; tick++) {
    call(0x2218);
    hash.add([long(actor + 6), long(actor + 10), long(actor + 14), word(actor + 0x5c)]);
  }
  motion.push({initial, ticks: 16, ...hash.finish()});
}

const walks = [];
for (let type = 0; type < 12; type++) {
  for (let combination = 0; combination < 32; combination++) {
    const flags32 = combination & 1 ? 8 : 0;
    const flags33 = combination & 2 ? 32 : 0;
    const flags56 = combination & 4 ? 128 : 0;
    const flags74 = combination & 8 ? 128 : 0;
    const flags75 = combination & 16 ? 1 : 0;
    memory.fill(0, actor, actor + 0x10c);
    putWord(actor + 2, type);
    for (const [offset, value] of [[0x32, flags32], [0x33, flags33], [0x56, flags56],
      [0x74, flags74], [0x75, flags75]]) memory[actor + offset] = value;
    call(0x1098c);
    const speed = word(actor + 0x2a);
    call(0x10950);
    walks.push({type, flags32, flags33, flags56, flags74, flags75, speed,
      descriptor: cpu.a[1], offsetY: word(actor + 0x1a)});
  }
}

const animations = [];
const sources = [0x10832, 0x1084a, 0x10862, 0x1087a, 0x116a8, 0x11722,
  0x11a90, 0x123ac, 0x13f20, 0x13fca, 0x14130];
for (const source of sources) {
  const count = word(source + 6);
  const descriptor = {source, mode: word(source + 4),
    delays: Array.from({length: count}, (_, index) => word(source + 8 + index * 2)),
    poses: Array.from({length: count}, (_, index) => word(source + 8 + count * 2 + index * 2))};
  animations.push({name: `descriptor-${source.toString(16)}`, descriptor, initial: {flags: 0x1234,
    remaining: 99, index: 3, pose: 555}, ticks: 600});
}
// Synthetic descriptors exercise the same original routine at counter and flag
// boundaries, including held frames and values with pose/facing bits already set.
for (const mode of [0, 1, 2, 3]) {
  for (const delay of [0, 1, 0xfeff, 0xff00, 0xffff]) {
    for (const initialized of [false, true]) {
      animations.push({name: `mode-${mode}-delay-${delay}-initialized-${initialized}`,
        descriptor: {source: 0x1c2800, mode, delays: [delay, 0, 2], poses: [0x8004, 5, 0x4006]},
        initial: {flags: initialized ? 0x9234 : 0x1234, remaining: delay, index: 0, pose: 0x4321}, ticks: 300});
    }
  }
}
for (const fixture of animations) {
  const {descriptor, initial} = fixture;
  if (descriptor.source === 0x1c2800) {
    putWord(descriptor.source + 4, descriptor.mode);
    putWord(descriptor.source + 6, descriptor.poses.length);
    descriptor.delays.forEach((value, index) => putWord(descriptor.source + 8 + index * 2, value));
    descriptor.poses.forEach((value, index) =>
      putWord(descriptor.source + 8 + descriptor.poses.length * 2 + index * 2, value));
  }
  memory.fill(0, actor, actor + 0x10c);
  putWord(actor + 0x1c, initial.flags);
  putWord(actor + 0x22, initial.remaining);
  putWord(actor + 0x24, initial.index);
  putWord(actor + 4, initial.pose);
  const hash = digest();
  for (let tick = 0; tick < fixture.ticks; tick++) {
    putWord(actor + 0x2e, tick % 37 < 18 ? 0 : 0x8000);
    cpu.a[1] = descriptor.source;
    call(0x1b308);
    hash.add([word(actor + 0x1c), word(actor + 0x22), word(actor + 0x24), word(actor + 4)]);
  }
  Object.assign(fixture, hash.finish());
}

const idle = [];
for (const initialPose of [0, 4, 0x8004, 0x7fff]) {
  memory.fill(0, actor, actor + 0x10c);
  putWord(actor + 4, initialPose);
  putWord(actor + 0x22, 77);
  putWord(actor + 0x24, 3);
  const hash = digest();
  for (let tick = 0; tick < 60; tick++) {
    putWord(actor + 0x2e, tick % 37 < 18 ? 0 : 0x8000);
    // The complete dispatcher runs the ordinary idle handler then mode-zero
    // animation, which must leave the handler's retained entry pose intact.
    call(0x1b27e);
    hash.add([word(actor + 0x1c), word(actor + 0x22), word(actor + 0x24), word(actor + 4)]);
  }
  idle.push({initialPose, ticks: 60, ...hash.finish()});
}

const locomotion = [];
for (let type = 0; type < 12; type++) {
  memory.fill(0, actor, actor + 0x10c);
  putWord(actor + 2, type);
  putWord(actor + 4, 0x8000);
  putLong(actor + 6, 160 * 65536);
  putLong(actor + 10, 140 * 65536);
  putLong(actor + 0x7a, 0x1c2c00);
  // Complete update handlers require a linked opponent for facing. Keep it
  // outside contact range so this comparison isolates normal locomotion.
  putWord(0x1c2c06, 300);
  let previousState = -1;
  const requests = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 0]];
  const hash = digest();
  for (let tick = 0; tick < 120; tick++) {
    const [horizontal, vertical] = requests[Math.floor(tick / 12)];
    const state = horizontal || vertical ? 1 : 0;
    if (state !== previousState) {
      putWord(actor + 0x1c, state);
      putWord(actor + 0x20, 0x8000 | state);
      previousState = state;
    }
    const mask = (horizontal > 0 ? 1 : horizontal < 0 ? 2 : 0)
      | (vertical > 0 ? 8 : vertical < 0 ? 4 : 0);
    putWord(actor + 0x2c, word(0xe516 + mask * 2));
    call(0xfe28);
    call(0x1b27e);
    call(0x2218);
    // Match coordinates are in browser space. Normalize original world depth
    // around the same initial origin before comparing movement trajectories.
    hash.add([long(actor + 6), 280 * 65536 - long(actor + 10), word(actor + 4)]);
  }
  locomotion.push({type, ticks: 120, requests, ...hash.finish()});
}

writeFileSync(outputPath, JSON.stringify({polar: polar.finish(), motion, walks, animations, idle, locomotion}, null, 2));
console.log(`Captured 65,536 polar cases, ${motion.length} movement sequences, ${walks.length} walk settings, ${animations.length} animation sequences, ${idle.length} idle and ${locomotion.length} integrated locomotion runs`);
