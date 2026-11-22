// Offline original camera/scenery execution. Supply the analysis CPU separately.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [hardwarePath, programPath, outputPath, frameDirectory] = process.argv.slice(2);
if (!outputPath) throw new Error('Usage: node tools/trace_camera.mjs mc68000.js program.bin output.json [frame-directory]');
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
function call(address) {
  cpu.pc = address;
  cpu.sr = 0x2700;
  cpu.a[7] = 0x1c3a00;
  putLong(cpu.a[7], 0x7ff00);
  let steps = 0;
  while (cpu.pc !== 0x7ff00 && steps++ < 2000000) cpu._execute();
  assert(steps < 2000000, `Camera/scenery call did not return at $${cpu.pc.toString(16)}`);
}
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

let seed = 0x43414d45;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const cameras = [];
for (let scenario = 0; scenario < 128; scenario++) {
  memory.fill(0, 0x1c0000, 0x1c4000);
  const initial = {x: random() % 1400, y: random() % 2048,
    backgroundX: random() % 1400, backgroundY: random() % 2048, scene: scenario % 7};
  const options = {rumble: Boolean(scenario & 1), targetX: random() % 2048, targetY: random() % 2048};
  const actors = Array.from({length: 9}, (_, index) => ({x: random() % 2048,
    y: random() % 1024, z: 256 + random() % 512, flags33: random() & 7,
    priority: scenario < 20 ? scenario % 5 : (random() >>> 8) % 5,
    active: scenario % 11 !== 0 && (index < 2 || Boolean(random() & 1)),
    vx: random() % 15 - 7, vy: random() % 15 - 7, vz: random() % 5 - 2}));
  if ([5, 10, 15].includes(scenario)) actors.forEach((actor, index) => {
    actor.flags33 = 1;
    actor.priority = 0;
    actor.active = index < ({5: 9, 10: 4, 15: 1})[scenario];
  });
  putWord(0x1c17e6, initial.x);
  putWord(0x1c17ee, initial.y);
  putWord(0x1c17ea, initial.backgroundX);
  putWord(0x1c17f2, initial.backgroundY);
  putWord(0x1c17da, initial.x >>> 5);
  putWord(0x1c17dc, initial.y >>> 5);
  putWord(0x1c007e, initial.scene);
  memory[0x1c0161] = options.rumble ? 2 : 0;
  putWord(0x1c1804, options.targetX);
  putWord(0x1c1806, options.targetY);
  const hash = digest();
  let final;
  for (let tick = 0; tick < 100; tick++) {
    actors.forEach((actor, index) => {
      const base = 0x1c05b0 + index * 0x10c;
      memory[base] = actor.active ? 128 : 0;
      memory[base + 0x33] = actor.flags33;
      memory[base + 0x4b] = actor.priority;
      putWord(base + 6, actor.x + tick * actor.vx);
      putWord(base + 10, actor.y + tick * actor.vy);
      putWord(base + 14, actor.z + tick * actor.vz);
    });
    call(0x25b5c);
    call(0x28a62);
    call(0x26040);
    memory[0x1c17fe] = 0;
    call(0x25ca0);
    call(0x25d00);
    if (!(cpu.sr & 1)) call(0x25d9c);
    final = [word(0x1c17e6), word(0x1c17ee), word(0x1c17ea), word(0x1c17f2),
      ...Array.from({length: 4}, (_, index) => word(0x100000 + index * 2)),
      word(0x1c17da), word(0x1c17dc)];
    hash.add(final);
  }
  cameras.push({initial, options, actors, ticks: 100, ...hash.finish(), final});
}

const paths = [
  Array.from({length: 180}, () => [14, 18]),
  Array.from({length: 360}, (_, tick) => [10 + Math.abs(10 - Math.floor(tick / 12) % 21), 18]),
  Array.from({length: 420}, (_, tick) => [10 + Math.floor(tick / 8) % 11, 16 + Math.floor(tick / 6) % 7]),
  Array.from({length: 300}, (_, tick) => tick < 40 || tick >= 230 ? [0, 0] : [14, 18]),
  Array.from({length: 320}, (_, tick) => [10 + Math.floor(tick / 5) % 11, 16 + Math.floor(tick / 7) % 7]),
];
const scenery = [];
for (const chunks of paths) {
  memory.fill(0, 0x1c0000, 0x1c4000);
  memory[0x1c185a] = 255;
  const hash = digest();
  let final;
  for (const [x, y] of chunks) {
    putWord(0x1c17da, x);
    putWord(0x1c17dc, y);
    call(0x27800);
    const visible = [];
    for (let address = 0x1c185a; memory[address] !== 255; address++) visible.push(memory[address]);
    const events = [
      ...Array.from({length: word(0x1c19ac)}, (_, index) => ({layer: 0, patch: memory[0x1c194a + index]})),
      ...Array.from({length: word(0x1c19aa)}, (_, index) => ({layer: 1, patch: memory[0x1c197a + index]})),
    ];
    final = {visible, records: Array.from({length: 47}, (_, index) =>
      Array.from(memory.subarray(0x1c188a + index * 4, 0x1c188e + index * 4)))};
    hash.add({state: final, events});
    call(0x28690);
  }
  scenery.push({chunks, ...hash.finish(), final});
}

writeFileSync(outputPath, JSON.stringify({cameras, scenery}, null, 2));
if (frameDirectory) {
  mkdirSync(frameDirectory, {recursive: true});
  const frames = [];
  for (const x of [320, 461, 640]) for (const y of [512, 577, 704]) {
    memory.fill(0, 0x1c0000, 0x1c4000);
    memory.fill(0, 0x80000, 0x83000);
    putWord(0x1c1804, x);
    putWord(0x1c1806, y);
    call(0x2608c);
    for (let tick = 0; tick <= 40; tick++) {
      call(0x27800);
      call(0x28690);
      if (![0, 5, 30, 39, 40].includes(tick)) continue;
      const file = `frame-${frames.length}.bin`;
      writeFileSync(join(frameDirectory, file), Buffer.concat([
        memory.subarray(0x80000, 0x81000), memory.subarray(0x82000, 0x83000),
      ]));
      frames.push({file, camera: {x, y, backgroundX: x, backgroundY: y}, ticks: tick + 1,
        registers: Array.from({length: 4}, (_, index) => word(0x100000 + index * 2))});
    }
  }
  writeFileSync(join(frameDirectory, 'index.json'), JSON.stringify(frames, null, 2));
}
console.log(`Captured ${cameras.length} camera and ${scenery.length} scenery scenarios`);
