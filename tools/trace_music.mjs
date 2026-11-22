// Offline original-program reference generation for the native music service.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, soundRomPath, outputPath] = process.argv.slice(2);
if (!hardwarePath || !soundRomPath || !outputPath) {
  throw new Error('Usage: node tools/trace_music.mjs path/to/z80.js path/to/31a11-2.ic42 output.json');
}
const {default: Z80} = await import(pathToFileURL(hardwarePath));
const rom = readFileSync(soundRomPath);

function createReference() {
  const memory = new Uint8Array(65536);
  memory.set(rom);
  const cpu = new Z80();
  let tick = 0;
  let register = 0;
  let pending = -1;
  let busy = 0;
  let recording = false;
  let count = 0;
  const prefix = [];
  const hash = createHash('sha256');
  function emit(event) {
    if (!recording) return;
    if (prefix.length < 32) prefix.push(event);
    hash.update(JSON.stringify(event) + '\n');
    count++;
  }
  for (let page = 0; page < 256; page++) {
    cpu.memorymap[page].base = memory.subarray(page * 256, (page + 1) * 256);
    if (page >= 0xc0 && page < 0xc8) cpu.memorymap[page].write = null;
  }
  cpu.memorymap[0xc8].read = () => 0;
  cpu.memorymap[0xc8].write = (address, value) => {
    if (address === 0xc800) register = value;
    else if (address === 0xc801) emit({op: 'fm', register, value, tick});
  };
  cpu.memorymap[0xd8].read = () => 0xf0 | busy;
  cpu.memorymap[0xd8].write = (address, value) => {
    if (pending >= 0) {
      for (let voice = 0; voice < 4; voice++) {
        if (value & (0x10 << voice)) {
          emit({op: 'sample', voice, sample: pending, volume: value & 15, tick});
          busy |= 1 << voice;
        }
      }
      pending = -1;
    } else if (value & 128) pending = value & 127;
    else {
      for (let voice = 0; voice < 4; voice++) {
        if (value & (8 << voice)) {
          busy &= ~(1 << voice);
          emit({op: 'stop', voice, tick});
        }
      }
    }
  };
  cpu.reset();
  let steps = 0;
  while (cpu.pc !== 0x3a && steps++ < 100000) cpu._execute();
  assert(steps < 100000, 'Sound initialization did not return');
  recording = true;

  function call(address) {
    cpu.pc = address;
    cpu.sp = 0xc7f0;
    memory[0xc7f0] = 0xef;
    memory[0xc7f1] = 0xbe;
    let steps = 0;
    while (cpu.pc !== 0xbeef && steps++ < 100000) cpu._execute();
    assert(steps < 100000, `Original music routine did not return at $${cpu.pc.toString(16)}`);
  }
  return {
    command(value) {
      memory[0xc500 + memory[0xc002]] = value;
      memory[0xc002]++;
      call(0x7a);
    },
    tick() { tick++; call(0x620); call(0x668); },
    finish() { return {eventCount: count, sha256: hash.digest('hex'), prefix}; },
  };
}

const scenarios = Array.from({length: 30}, (_, index) => ({name: `track-${index + 1}`,
  ticks: 5000, requests: [{tick: 0, command: index + 1}]}));
scenarios.push({name: 'fade-and-switch', ticks: 2500, requests: [
  {tick: 0, command: 3}, {tick: 150, command: 31}, {tick: 550, command: 4},
  {tick: 820, command: 0}, {tick: 900, command: 8}, {tick: 1300, command: 14},
  {tick: 2000, command: 31},
]});
const fixtures = [];
for (const scenario of scenarios) {
  const reference = createReference();
  const requests = Map.groupBy(scenario.requests, request => request.tick);
  for (let tick = 0; tick < scenario.ticks; tick++) {
    for (const request of requests.get(tick) || []) reference.command(request.command);
    reference.tick();
  }
  fixtures.push({...scenario, ...reference.finish()});
}
writeFileSync(outputPath, JSON.stringify(fixtures, null, 2));
console.log(`Generated ${fixtures.length} original music reference scenarios`);
