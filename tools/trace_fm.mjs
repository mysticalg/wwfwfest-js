// Generate synthesis fixtures from a separately compiled reference backend.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {MusicSequencer} from '../src/audio/music-sequencer.js';
import createJavaScript from '../src/audio/vendor/ymfm.js';

const [referencePath, outputPath] = process.argv.slice(2);
if (!referencePath || !outputPath) throw new Error('Usage: node tools/trace_fm.mjs path/to/reference.mjs output.json');
const {default: createReference} = await import(pathToFileURL(referencePath));
const reference = await createReference();
const originalWebAssembly = globalThis.WebAssembly;
globalThis.WebAssembly = undefined;
const data = JSON.parse(readFileSync(new URL('../assets/audio/music.json', import.meta.url)));
try {
  const native = await createJavaScript();
  const scenarios = [];
  for (let command = 1; command <= 18; command++) scenarios.push({name: `track-${command}`, command, frames: 55930});
  for (let instrument = 0; instrument < 128; instrument++) {
    scenarios.push({name: `instrument-${instrument}`, instrument, frames: 2048, keyOffFrame: 1024});
  }
  const results = [];
  for (const scenario of scenarios) {
    const referenceChip = reference._fm_create();
    const nativeChip = native._fm_create();
    try {
      const write = (register, value) => {
        reference._fm_write(referenceChip, register, value);
        native._fm_write(nativeChip, register, value);
      };
      const sequencer = new MusicSequencer(data, event => { if (event.op === 'fm') write(event.register, event.value); });
      if (scenario.command) sequencer.command(scenario.command);
      else {
        data.instruments[scenario.instrument].registers.forEach((value, index) => write(data.instrumentRegisterOffsets[index], value));
        write(0x28, 0x4a);
        write(0x30, 0);
        write(8, 0x78);
      }
      const samples = Buffer.alloc(scenario.frames * 4);
      let phase = 0;
      for (let frame = 0; frame < scenario.frames; frame++) {
        if (scenario.command) {
          phase += 64;
          let threshold = 1024 * (256 - sequencer.tempo);
          while (phase >= threshold) {
            phase -= threshold;
            sequencer.tick();
            threshold = 1024 * (256 - sequencer.tempo);
          }
        } else if (frame === scenario.keyOffFrame) write(8, 0);
        const expected = reference._fm_sample(referenceChip);
        assert.equal(native._fm_sample(nativeChip), expected, `${scenario.name} sample ${frame}`);
        samples.writeInt32LE(expected, frame * 4);
      }
      results.push({...scenario, sha256: createHash('sha256').update(samples).digest('hex')});
    } finally {
      reference._fm_destroy(referenceChip);
      native._fm_destroy(nativeChip);
    }
  }
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Compared and recorded ${results.length} FM synthesis cases`);
} finally {
  globalThis.WebAssembly = originalWebAssembly;
}
