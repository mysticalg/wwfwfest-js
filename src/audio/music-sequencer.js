// Native translation of the original music service at Z80 $0668-$0f4a.
// This module emits FM register writes and music sample commands. Chip waveform
// generation is a separate stage. Original byte arithmetic and quirks are kept.
const byte = value => value & 255;
const word24 = (high, middle, low) => high * 65536 + middle * 256 + low;

function modulation() {
  return {type: 0, phase: 0, magnitude: 0, step: 0};
}

function channel(source = 0) {
  return {source, ended: false, delay: 1, rest: 0, tied: false, instrument: 0,
    level: 0, transpose: 0, fraction: 0, gate: 255, note: 0, previousNote: 0,
    repeatCount: 0, repeatStart: 0, repeatReturn: 0,
    pitchEnvelope: modulation(), portamento: modulation()};
}

export class MusicSequencer {
  constructor(data, emit) {
    this.data = data;
    this.emit = emit;
    this.tracks = new Map(data.tracks.map(track => [track.command, track]));
    this.channels = Array.from({length: 9}, () => channel());
    this.enabled = false;
    this.song = 0;
    this.pcmStarted = false;
    this.pcmLevel = 0;
    this.fade = false;
    this.fadeGain = 255;
    this.fadeCounter = 2;
    this.fadeLevel = 0;
    this.fadeDivider = 13;
    this.ticks = 0;
    this.tempo = 224;
  }

  write(register, value) {
    register = byte(register);
    value = byte(value);
    if (register === 0x12) this.tempo = value;
    this.emit({op: 'fm', register, value, tick: this.ticks});
  }

  stopPcm() {
    if (!this.pcmStarted) return;
    this.emit({op: 'stop', voice: 0, tick: this.ticks});
    this.pcmStarted = false;
  }

  stopNotes(first = 0) {
    for (let index = 0; index < 8; index++) this.write(8, first + index);
    this.stopPcm();
  }

  command(value) {
    if (value === 0) {
      this.stopNotes();
      this.enabled = false;
      this.song = 0;
      this.fade = false;
      return true;
    }
    if (value === 0x1f) {
      this.fade = true;
      this.fadeGain = 255;
      this.fadeCounter = 2;
      this.fadeLevel = 0;
      this.fadeDivider = 13;
      return true;
    }
    const track = this.tracks.get(value);
    if (!track) return false;
    this.enabled = true;
    this.song = value;
    this.channels = track.channels.map(source => channel(source));
    this.pcmStarted = false;
    this.pcmLevel = 0;
    this.fade = false;
    this.fadeGain = 255;
    this.fadeCounter = 2;
    this.fadeLevel = 0;
    this.fadeDivider = 13;
    for (const [register, data] of this.data.initialWrites) this.write(register, data);
    // The startup routine retains A=command-1 across its table copy and uses
    // that value as the first key-control byte. Preserve that original quirk.
    this.stopNotes(value - 1);
    return true;
  }

  tick() {
    this.ticks++;
    if (this.fade) this.updateFade();
    if (!this.enabled) { this.stopNotes(); return; }
    for (let index = 0; index < 9 && this.enabled; index++) {
      const current = this.channels[index];
      if (current.ended) continue;
      current.delay = byte(current.delay - 1);
      if (current.delay !== 0) {
        if (index < 8) {
          this.pitch(index);
          if (this.fade) this.levels(index);
        }
        continue;
      }
      if (index === 8) this.stopPcm();
      else {
        if (!current.tied) this.write(8, index);
        if (current.rest) {
          current.delay = current.rest;
          current.rest = 0;
          this.pitch(index);
          if (this.fade) this.levels(index);
          continue;
        }
      }
      this.interpret(index);
    }
  }

  updateFade() {
    this.fadeCounter = byte(this.fadeCounter - 1);
    if (this.fadeCounter) return;
    this.fadeCounter = 2;
    this.fadeGain = byte(this.fadeGain - 1);
    if (this.fadeGain === 64) {
      this.fadeGain = 0;
      this.fade = false;
      this.enabled = false;
      this.song = 0;
      this.stopNotes();
      return;
    }
    this.fadeDivider = byte(this.fadeDivider - 1);
    if (!this.fadeDivider) { this.fadeDivider = 13; this.fadeLevel = byte(this.fadeLevel + 1); }
  }

  duration(current, value) {
    if (value === 1) { current.delay = 1; current.rest = 0; return; }
    current.delay = Math.floor(value * current.gate / 256);
    current.rest = byte(value - current.delay);
  }

  keyOn(index) {
    const current = this.channels[index];
    this.write(8, 0x78 | index);
    const envelope = current.pitchEnvelope;
    if (envelope.type) {
      const preset = this.data.pitchEnvelopes[envelope.type - 1];
      envelope.phase = preset[0];
      envelope.magnitude = word24(preset[1], preset[2], preset[3]);
      envelope.step = word24(preset[4], preset[5], preset[6]);
    }
    const portamento = current.portamento;
    if (!portamento.type) return;
    const difference = current.note - current.previousNote;
    if (difference >= 0) {
      portamento.magnitude = (portamento.magnitude + difference * 65536) & 0xffffff;
    } else {
      const value = portamento.magnitude + difference * 65536;
      if (value < 0) {
        portamento.magnitude = -value;
        portamento.phase = portamento.phase ? 0 : 1;
      } else portamento.magnitude = value;
    }
  }

  applyModulation(pitch, current, addWhenOdd) {
    if (!current.type) return pitch;
    const delta = current.magnitude >>> 8;
    const add = Boolean(current.phase & 1) === addWhenOdd;
    const result = add ? pitch + delta : pitch - delta;
    if (result < 0) return 0;
    if (result >= 0x6000) return 0x5fff;
    return result;
  }

  pitch(index) {
    const current = this.channels[index];
    let note = current.note;
    let fraction = current.fraction;
    if (current.transpose & 128) {
      note -= current.transpose & 127;
      if (note < 0) { note = 0; fraction = 0; }
    } else note = byte(note + current.transpose);
    let pitch = note * 256 + fraction;
    pitch = this.applyModulation(pitch, current.pitchEnvelope, true);
    pitch = this.applyModulation(pitch, current.portamento, false);
    this.write(0x28 + index, this.data.noteCodes[pitch >> 8]);
    this.write(0x30 + index, pitch & 255);
    const envelope = current.pitchEnvelope;
    if (envelope.type) {
      if (envelope.phase < 2) {
        envelope.magnitude -= envelope.step;
        if (envelope.magnitude < 0) { envelope.magnitude = 0; envelope.phase = 1; }
      } else {
        envelope.magnitude = (envelope.magnitude + envelope.step) & 0xffffff;
        if (envelope.magnitude >= 0x600000) envelope.magnitude = 0x5fffff;
      }
    }
    const portamento = current.portamento;
    if (portamento.type) {
      portamento.magnitude -= portamento.step;
      if (portamento.magnitude < 0) { portamento.magnitude = 0; portamento.phase = 1; }
    }
  }

  levels(index) {
    const current = this.channels[index];
    const instrument = this.data.instruments[current.instrument].registers;
    const levels = instrument.slice(4, 8);
    const algorithm = instrument[24] & 7;
    const carriers = algorithm === 7 ? [0, 2, 1, 3] : algorithm >= 5 ? [2, 1, 3] : algorithm === 4 ? [1, 3] : [3];
    for (const operator of carriers) {
      const faded = 127 - Math.floor((127 - levels[operator]) * this.fadeGain / 256);
      levels[operator] = Math.min(127, byte(byte(faded + current.level) + this.data.trackLevels[this.song]));
    }
    for (const [operator, offset] of [[0, 0x60], [2, 0x68], [1, 0x70], [3, 0x78]]) this.write(offset + index, levels[operator]);
  }

  interpret(index) {
    const current = this.channels[index];
    for (let operations = 0; operations < 10000; operations++) {
      const instruction = this.data.instructions[current.source];
      if (!instruction) throw new Error(`Missing music instruction at $${current.source.toString(16)}`);
      current.source = instruction.next;
      const args = instruction.args;
      switch (instruction.op) {
        case 'note':
          if (index === 8) {
            const level = this.fade ? Math.min(9, this.pcmLevel + this.fadeLevel) : this.pcmLevel;
            this.emit({op: 'sample', voice: 0, sample: args[0], volume: level, tick: this.ticks});
            this.pcmStarted = true;
            current.delay = args[1];
          } else {
            current.previousNote = current.note;
            current.note = args[0];
            if (!current.tied) this.keyOn(index);
            this.pitch(index);
            this.duration(current, args[1]);
          }
          return;
        case 'rest':
          if (index === 8) current.delay = args[0];
          else this.duration(current, args[0]);
          return;
        case 'end': current.ended = true; return;
        case 'stop': this.enabled = false; this.song = 0; return;
        case 'jump': current.source = args[0] + args[1] * 256; break;
        case 'repeat':
          current.repeatCount = args[2];
          current.repeatReturn = instruction.next;
          current.repeatStart = args[0] + args[1] * 256;
          current.source = current.repeatStart;
          break;
        case 'repeatEnd': {
          const remaining = byte(current.repeatCount - 1);
          if (remaining) { current.repeatCount = remaining; current.source = current.repeatStart; }
          else current.source = current.repeatReturn;
          break;
        }
        case 'tempo': this.write(0x12, args[0]); break;
        case 'level':
          if (index === 8) this.pcmLevel = args[0];
          else { current.level = args[0]; this.levels(index); }
          break;
        case 'instrument':
          current.instrument = args[0];
          this.data.instruments[args[0]].registers.forEach((value, position) => {
            this.write(this.data.instrumentRegisterOffsets[position] + index, value);
          });
          this.levels(index);
          break;
        case 'transpose': current.transpose = args[0]; break;
        case 'fraction': current.fraction = args[0]; break;
        case 'gate': current.gate = args[0]; break;
        case 'tieOn': current.tied = true; this.keyOn(index); break;
        case 'tieOff': current.tied = false; this.write(8, index); break;
        case 'envelope': current.pitchEnvelope.type = args[0]; break;
        case 'envelopeOff': current.pitchEnvelope.type = 0; break;
        case 'portamento':
          Object.assign(current.portamento, {type: 1, phase: 1, magnitude: 0, step: word24(...args)});
          break;
        case 'portamentoOff': current.portamento.type = 0; break;
        case 'noise': this.write(0x0f, args[0]); break;
        case 'sensitivity': this.write(0x38 + index, args[0]); break;
        case 'lfoDepth': this.write(0x19, args[0]); break;
        case 'lfo': this.write(0x1b, args[0]); this.write(0x18, args[1]); break;
        default: throw new Error(`Unknown music operation ${instruction.op}`);
      }
    }
    throw new Error('Music command graph did not reach a timed event');
  }
}
