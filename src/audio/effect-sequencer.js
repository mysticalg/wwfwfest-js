// High-level translation of Z80 routines $007a-$061d. Commands and stream
// operations are recovered data. The three logical effect channels use physical
// sample voices 2, 3 and 1. Voice 0 belongs to the music driver.
const physicalVoices = [2, 3, 1];
const replaceSamePriority = new Set([6, 8, 11]);
const interruptFlags = [1, 2, 0];
const sampleFlags = [1, 0, 2];

function channel() {
  return {command: 0, priority: 0, step: 0, delay: 1, volume: 0, held: false};
}

export class EffectSequencer {
  constructor(commands, emit) {
    this.commands = new Map(commands.map(command => [command.command, command]));
    this.channels = Array.from({length: 3}, channel);
    this.bank = 0;
    this.emit = emit;
    this.ticks = 0;
    // $c054-$c056 have different index mappings in note-start, note-stop,
    // interruption and bank-change routines. Preserve the original mappings.
    this.startedFlags = [false, false, false];
  }

  stopVoice(index) {
    this.emit({op: 'stop', voice: physicalVoices[index], tick: this.ticks});
  }

  reset() {
    for (let index = 0; index < 3; index++) {
      this.stopVoice(index);
      const volume = this.channels[index].volume;
      this.channels[index] = {...channel(), volume};
    }
    this.bank = 0;
    this.startedFlags.fill(false);
    this.emit({op: 'bank', bank: 0, tick: this.ticks});
  }

  command(value) {
    if (value === 0x20) { this.reset(); return true; }
    const effect = this.commands.get(value);
    if (!effect) return false;
    let selected = replaceSamePriority.has(effect.priority)
      ? this.channels.findIndex(current => current.priority === effect.priority) : -1;
    if (selected < 0) selected = this.channels.findIndex(current => current.command === 0);
    if (selected < 0) {
      selected = 0;
      for (let index = 1; index < 3; index++) {
        if (this.channels[index].priority < this.channels[selected].priority) selected = index;
      }
      if (effect.priority < this.channels[selected].priority) return false;
    }
    const interruptFlag = interruptFlags[selected];
    if (this.startedFlags[interruptFlag]) {
      this.stopVoice(selected);
      this.startedFlags[interruptFlag] = false;
    }
    // Bank 2 denotes samples shared by both banks and retains the active bank.
    if (effect.bank !== 2 && effect.bank !== this.bank) {
      for (let index = 0; index < 3; index++) {
        const current = this.channels[index];
        if (current.command >= 0x34) {
          const flag = interruptFlags[index];
          if (this.startedFlags[flag]) {
            this.stopVoice(index);
            this.startedFlags[flag] = false;
          }
          current.command = 0;
          current.priority = 0;
        }
      }
      this.bank = effect.bank;
      this.emit({op: 'bank', bank: this.bank, tick: this.ticks});
    }
    Object.assign(this.channels[selected], {command: value, priority: effect.priority,
      step: 0, delay: 1, held: false});
    return true;
  }

  tick() {
    this.ticks++;
    for (let index = 0; index < 3; index++) {
      const current = this.channels[index];
      if (!current.command || --current.delay !== 0) continue;
      if (!current.held) {
        this.stopVoice(index);
        this.startedFlags[index] = false;
      }
      const effect = this.commands.get(current.command);
      let waiting = false;
      for (let operations = 0; operations < 1024 && !waiting; operations++) {
        const step = effect.steps[current.step++];
        if (!step) throw new Error(`Missing sound step in command ${effect.command}`);
        switch (step.op) {
          case 'volume':
            current.volume = step.value;
            break;
          case 'release':
            current.held = false;
            this.stopVoice(index);
            this.startedFlags[index] = false;
            break;
          case 'jump':
            current.step = step.target;
            break;
          case 'end':
            current.command = 0;
            current.priority = 0;
            waiting = true;
            break;
          case 'sample':
            if (!current.held) {
              this.emit({op: 'sample', voice: physicalVoices[index], sample: step.sample,
                bank: this.bank, volume: current.volume, tick: this.ticks});
              this.startedFlags[sampleFlags[index]] = true;
            }
            current.delay = step.ticks;
            if (step.holdAfter) current.held = true;
            waiting = true;
            break;
          case 'wait':
            current.delay = step.ticks;
            if (step.holdAfter) current.held = true;
            waiting = true;
            break;
          default:
            throw new Error(`Unknown sound operation ${step.op}`);
        }
      }
      if (!waiting) throw new Error(`Sound script has no timed step in command ${effect.command}`);
    }
  }
}
