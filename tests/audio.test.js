import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {EffectSequencer} from '../src/audio/effect-sequencer.js';
import {decodeSample} from '../src/audio/sample-codec.js';
import {SampleMixer} from '../src/audio/sample-mixer.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/audio/effects.json', import.meta.url)));
const samples = new Uint8Array(readFileSync(new URL('../assets/audio/samples.bin', import.meta.url)));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/effects-reference.json', import.meta.url)));
const sampleFixtures = JSON.parse(readFileSync(new URL('./fixtures/sample-reference.json', import.meta.url)));

// Simultaneous stop commands on independent voices commute. Keep note, bank,
// tick, and per-voice event order intact when comparing with the Z80 trace.
function normalizeStops(events) {
  const result = [];
  for (let index = 0; index < events.length;) {
    const event = events[index];
    if (event.op !== 'stop') { result.push(JSON.stringify(event)); index++; continue; }
    const stops = [];
    while (index < events.length && events[index].op === 'stop' && events[index].tick === event.tick) {
      stops.push(JSON.stringify(events[index++]));
    }
    result.push(...stops.sort());
  }
  return result;
}

for (const fixture of fixtures) {
  test(`original driver event parity for ${fixture.name}`, () => {
    const events = [];
    const sequencer = new EffectSequencer(manifest.commands, event => events.push(event));
    const requests = Map.groupBy(fixture.requests, request => request.tick);
    for (let tick = 0; tick < fixture.ticks; tick++) {
      for (const request of requests.get(tick) || []) sequencer.command(request.command);
      sequencer.tick();
    }
    assert.deepEqual(normalizeStops(events), normalizeStops(fixture.events));
  });
}

test('all banked samples match the independent integer decoder', () => {
  for (const fixture of sampleFixtures) {
    const entry = manifest.samples.find(entry => entry.bank === fixture.bank && entry.sample === fixture.sample);
    const pcm = decodeSample(samples, fixture.bank * 0x40000 + entry.start, fixture.bank * 0x40000 + entry.end);
    const bytes = Buffer.alloc(pcm.length * 2);
    pcm.forEach((value, index) => bytes.writeInt16LE(value, index * 2));
    assert.equal(pcm.length, fixture.frames);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256, `bank ${fixture.bank} sample ${fixture.sample}`);
  }
});

test('incremental voice output matches full sample decoding through the inclusive end', () => {
  const mixer = new SampleMixer(samples, manifest.samples);
  const entry = manifest.samples.find(entry => entry.bank === 0 && entry.sample === 10);
  const pcm = decodeSample(samples, entry.start, entry.end);
  mixer.apply({op: 'sample', voice: 2, sample: 10, volume: 0});
  for (const value of pcm) {
    mixer.clock();
    assert.equal(mixer.voices[2].output, value);
  }
  assert.equal(mixer.voices[2].playing, false);
  mixer.clock();
  assert.equal(mixer.output(), 0);
});

test('a busy sample voice retains its current note until an explicit stop', () => {
  const mixer = new SampleMixer(samples, manifest.samples);
  mixer.apply({op: 'sample', voice: 1, sample: 10, volume: 0});
  mixer.clock();
  const original = {...mixer.voices[1]};
  mixer.apply({op: 'sample', voice: 1, sample: 2, volume: 1});
  assert.equal(mixer.voices[1].start, original.start);
  assert.equal(mixer.voices[1].nibble, original.nibble);
  mixer.apply({op: 'stop', voice: 1});
  assert.equal(mixer.output(), 0);
  mixer.apply({op: 'sample', voice: 1, sample: 2, volume: 1});
  assert.equal(mixer.voices[1].nibble, 0);
  assert.equal(mixer.voices[1].start, manifest.samples.find(entry => entry.bank === 0 && entry.sample === 2).start);
});
