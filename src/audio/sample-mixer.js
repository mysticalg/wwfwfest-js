import {AdpcmPredictor} from './sample-codec.js';

const volumeLevels = [32, 22, 16, 11, 8, 6, 4, 3, 2, 0, 0, 0, 0, 0, 0, 0];

function voice() {
  return {playing: false, start: 0, nibble: 0, count: 0, volume: 0,
    output: 0, predictor: new AdpcmPredictor()};
}

// Original sample addressing and live bank changes are preserved. Decoding each
// voice incrementally also preserves its predictor through a bank switch.
export class SampleMixer {
  constructor(bytes, sampleEntries) {
    this.bytes = bytes;
    this.samples = new Map(sampleEntries.map(entry => [entry.bank * 128 + entry.sample, entry]));
    this.voices = Array.from({length: 4}, voice);
    this.bank = 0;
  }

  apply(event) {
    if (event.op === 'bank') {
      this.bank = event.bank;
      return;
    }
    const current = this.voices[event.voice];
    if (event.op === 'stop') {
      current.playing = false;
      current.output = 0;
      return;
    }
    if (event.op !== 'sample' || current.playing) return;
    const entry = this.samples.get(this.bank * 128 + event.sample);
    if (!entry) return;
    Object.assign(current, {playing: true, start: entry.start, nibble: 0,
      count: entry.frames, volume: volumeLevels[event.volume & 15],
      predictor: new AdpcmPredictor()});
  }

  clock() {
    for (const current of this.voices) {
      if (!current.playing) { current.output = 0; continue; }
      const address = this.bank * 0x40000 + current.start + (current.nibble >> 1);
      const value = (this.bytes[address] >> (current.nibble & 1 ? 0 : 4)) & 15;
      current.output = current.predictor.clock(value) * current.volume / 32;
      current.nibble++;
      if (current.nibble >= current.count) current.playing = false;
    }
  }

  output() {
    let sum = 0;
    for (const current of this.voices) sum += current.output;
    return sum / 8192;
  }
}
