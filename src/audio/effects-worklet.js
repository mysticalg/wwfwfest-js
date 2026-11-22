import {EffectSequencer} from './effect-sequencer.js';
import {SampleMixer} from './sample-mixer.js';
import {MusicSequencer} from './music-sequencer.js';
import createFm from './vendor/ymfm.js';

const fmBackend = await createFm();

class WrestleFestEffects extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const {manifest, samples, music} = options.processorOptions;
    this.mixer = new SampleMixer(new Uint8Array(samples), manifest.samples);
    this.sequencer = new EffectSequencer(manifest.commands, event => this.mixer.apply(event));
    this.fm = fmBackend._fm_create();
    this.music = new MusicSequencer(music, event => {
      if (event.op === 'fm') fmBackend._fm_write(this.fm, event.register, event.value);
      else this.mixer.apply(event);
    });
    this.manifest = manifest;
    this.timerPhase = 0;
    this.samplePhase = 0;
    this.musicPhase = 0;
    this.fmPhase = 0;
    this.fmOutput = 0;
    this.paused = false;
    this.muted = false;
    this.port.onmessage = ({data}) => {
      switch (data.op) {
        case 'command':
          if (data.command < 0x20) this.music.command(data.command);
          else this.sequencer.command(data.command);
          break;
        case 'stop': this.music.command(0); this.sequencer.reset(); break;
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
      this.musicPhase += this.manifest.timerClock;
      let musicThreshold = sampleRate * 1024 * (256 - this.music.tempo);
      while (this.musicPhase >= musicThreshold) {
        this.musicPhase -= musicThreshold;
        this.music.tick();
        musicThreshold = sampleRate * 1024 * (256 - this.music.tempo);
      }
      this.fmPhase += this.manifest.timerClock;
      while (this.fmPhase >= sampleRate * 64) {
        this.fmPhase -= sampleRate * 64;
        this.fmOutput = fmBackend._fm_sample(this.fm);
      }
      this.samplePhase += this.manifest.chipClock;
      while (this.samplePhase >= sampleThreshold) {
        this.samplePhase -= sampleThreshold;
        this.mixer.clock();
      }
      output[frame] = this.muted ? 0 : this.mixer.output() * 0.66 + this.fmOutput / 32768 * 0.33;
    }
    return true;
  }
}

registerProcessor('wwfwfest-effects', WrestleFestEffects);
