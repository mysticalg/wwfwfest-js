// Offline reference generation. The browser uses src/audio/effect-sequencer.js.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const [hardwarePath, soundRomPath, outputPath] = process.argv.slice(2);
if (!hardwarePath || !soundRomPath || !outputPath) {
  throw new Error('Usage: node tools/trace_effects.mjs path/to/z80.js path/to/31a11-2.ic42 output.json');
}
const {default: Z80} = await import(pathToFileURL(hardwarePath));
const rom = readFileSync(soundRomPath);
const scenarios = JSON.parse(readFileSync(new URL('../tests/fixtures/effects-reference.json', import.meta.url)));

function createReference() {
  const memory = new Uint8Array(65536);
  memory.set(rom);
  const cpu = new Z80();
  const events = [];
  let tick = 0;
  let bank = 0;
  let pending = -1;
  let busy = 0;
  for (let page = 0; page < 256; page++) {
    const mapping = cpu.memorymap[page];
    mapping.base = memory.subarray(page * 256, (page + 1) * 256);
    if (page >= 0xc0 && page < 0xc8) mapping.write = null;
  }
  cpu.memorymap[0xc8].read = () => 0;
  cpu.memorymap[0xd8].read = () => 0xf0 | busy;
  cpu.memorymap[0xd8].write = (address, value) => {
    if (pending >= 0) {
      for (let voice = 0; voice < 4; voice++) {
        if (value & (0x10 << voice)) {
          events.push({op: 'sample', voice, sample: pending, bank, volume: value & 15, tick});
          busy |= 1 << voice;
        }
      }
      pending = -1;
    } else if (value & 128) {
      pending = value & 127;
    } else {
      for (let voice = 0; voice < 4; voice++) {
        if (value & (8 << voice)) {
          busy &= ~(1 << voice);
          events.push({op: 'stop', voice, tick});
        }
      }
    }
  };
  cpu.memorymap[0xe8].write = (address, value) => {
    bank = value & 1;
    events.push({op: 'bank', bank, tick});
  };
  cpu.reset();
  let steps = 0;
  while (cpu.pc !== 0x3a && steps++ < 100000) cpu._execute();
  assert(steps < 100000, 'Sound initialization did not reach its main loop');
  events.length = 0;

  function call(address) {
    cpu.pc = address;
    cpu.sp = 0xc7f0;
    memory[0xc7f0] = 0xef;
    memory[0xc7f1] = 0xbe;
    let steps = 0;
    while (cpu.pc !== 0xbeef && steps++ < 100000) cpu._execute();
    assert(steps < 100000, `Reference subroutine did not return at $${cpu.pc.toString(16)}`);
  }

  return {
    events,
    command(value) {
      memory[0xc500 + memory[0xc002]] = value;
      memory[0xc002]++;
      call(0x7a);
    },
    tick() {
      tick++;
      call(0x412);
    },
  };
}

const fixtures = [];
for (const scenario of scenarios) {
  const reference = createReference();
  const requests = Map.groupBy(scenario.requests, request => request.tick);
  for (let tick = 0; tick < scenario.ticks; tick++) {
    for (const request of requests.get(tick) || []) reference.command(request.command);
    reference.tick();
  }
  fixtures.push({name: scenario.name, requests: scenario.requests,
    ticks: scenario.ticks, events: reference.events});
}
writeFileSync(outputPath, JSON.stringify(fixtures, null, 2));
console.log(`Generated ${fixtures.length} original-driver effect traces`);
