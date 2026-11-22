import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MusicSequencer} from '../src/audio/music-sequencer.js';
import createFm from '../src/audio/vendor/ymfm.js';

const data = JSON.parse(readFileSync(new URL('../assets/audio/music.json', import.meta.url)));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/music-reference.json', import.meta.url)));
const fmFixtures = JSON.parse(readFileSync(new URL('./fixtures/fm-reference.json', import.meta.url)));

for (const fixture of fixtures) {
  test(`original music register parity for ${fixture.name}`, () => {
    const hash = createHash('sha256');
    let count = 0;
    const prefix = [];
    const sequencer = new MusicSequencer(data, event => {
      if (prefix.length < 32) prefix.push(event);
      hash.update(JSON.stringify(event) + '\n');
      count++;
    });
    const requests = Map.groupBy(fixture.requests, request => request.tick);
    for (let tick = 0; tick < fixture.ticks; tick++) {
      for (const request of requests.get(tick) || []) sequencer.command(request.command);
      sequencer.tick();
    }
    assert.deepEqual(prefix, fixture.prefix);
    assert.equal(count, fixture.eventCount);
    assert.equal(hash.digest('hex'), fixture.sha256);
  });
}

test('JavaScript FM synthesis matches the reference with WebAssembly unavailable', async () => {
  const originalWebAssembly = globalThis.WebAssembly;
  globalThis.WebAssembly = undefined;
  try {
    const backend = await createFm();
    for (const fixture of fmFixtures) {
      const synthesizer = backend._fm_create();
      try {
        const write = (register, value) => backend._fm_write(synthesizer, register, value);
        const sequencer = new MusicSequencer(data, event => {
          if (event.op === 'fm') write(event.register, event.value);
        });
        if (fixture.command) sequencer.command(fixture.command);
        else {
          data.instruments[fixture.instrument].registers.forEach((value, index) => write(data.instrumentRegisterOffsets[index], value));
          write(0x28, 0x4a);
          write(0x30, 0);
          write(8, 0x78);
        }
        const samples = Buffer.alloc(fixture.frames * 4);
        let phase = 0;
        for (let frame = 0; frame < fixture.frames; frame++) {
          if (fixture.command) {
            phase += 64;
            let threshold = 1024 * (256 - sequencer.tempo);
            while (phase >= threshold) {
              phase -= threshold;
              sequencer.tick();
              threshold = 1024 * (256 - sequencer.tempo);
            }
          } else if (frame === fixture.keyOffFrame) write(8, 0);
          samples.writeInt32LE(backend._fm_sample(synthesizer), frame * 4);
        }
        assert.equal(createHash('sha256').update(samples).digest('hex'), fixture.sha256, fixture.name);
      } finally {
        backend._fm_destroy(synthesizer);
      }
    }
  } finally {
    globalThis.WebAssembly = originalWebAssembly;
  }
});
