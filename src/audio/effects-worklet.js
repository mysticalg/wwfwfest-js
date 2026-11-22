import {EffectSequencer} from './effect-sequencer.js';
import {SampleMixer} from './sample-mixer.js';

class WrestleFestEffects extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const {manifest, samples} = options.processorOptions;
    this.mixer = new SampleMixer(new Uint8Array(samples), manifest.samples);
    this.sequencer = new EffectSequencer(manifest.commands, event => this.mixer.apply(event));
    this.manifest = manifest;
    this.timerPhase = 0;
    this.samplePhase = 0;
    this.paused = false;
    this.muted = false;
    this.port.onmessage = ({data}) => {
      switch (data.op) {
        case 'command': this.sequencer.command(data.command); break;
        case 'stop': this.sequencer.reset(); break;
        case 'pause': this.paused = data.value; break;
        case 'mute': this.muted = data.value; break;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0][0];
    if (this.paused) { output.fill(0); return true; }
    const timerThreshold = sampleRate * this.manifest.timerADivisor;
    const sampleThreshold = sampleRate * this.manifest.sampleDivisor;
    for (let frame = 0; frame < output.length; frame++) {
      this.timerPhase += this.manifest.timerClock;
      while (this.timerPhase >= timerThreshold) {
        this.timerPhase -= timerThreshold;
        this.sequencer.tick();
      }
      this.samplePhase += this.manifest.chipClock;
      while (this.samplePhase >= sampleThreshold) {
        this.samplePhase -= sampleThreshold;
        this.mixer.clock();
      }
      output[frame] = this.muted ? 0 : this.mixer.output();
    }
    return true;
  }
}

registerProcessor('wwfwfest-effects', WrestleFestEffects);
