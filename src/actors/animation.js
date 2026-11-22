// Hand translation of the descriptor clock at $01b308-$01b38e.
// Delays are 16-bit down counters. A frame advances on underflow, so delay 10
// means eleven calls. Facing is XORed into the pose only when a frame is loaded.
export class ActorAnimation {
  constructor({flags = 0, remaining = 0, index = 0, pose = 0} = {}) {
    Object.assign(this, {flags, remaining, index, pose});
  }

  reset() {
    this.flags &= 0x7fff;
  }

  // Ordinary idle's $0106f2 handler initializes its own clock because its
  // descriptor has mode zero. The previous pose survives the entry frame.
  idle(facing = 0) {
    if (!(this.flags & 0x8000)) {
      this.flags |= 0x8000;
      this.remaining = 0;
      this.index = 0;
    } else this.pose = facing & 0xffff;
    return this.pose;
  }

  step(descriptor, facing = 0) {
    if (!descriptor.mode) return this.pose;
    if (!(this.flags & 0x8000)) {
      this.index = 0;
      this.load(descriptor, facing);
      this.flags |= 0x8000;
      return this.pose;
    }
    if (this.remaining === 0xff00) return this.pose;
    const previous = this.remaining;
    this.remaining = (previous - 1) & 0xffff;
    if (previous !== 0) return this.pose;
    this.index = (this.index + 1) & 0xffff;
    if (this.index >= descriptor.poses.length) {
      this.index = 0xfe;
      if (descriptor.mode !== 2) {
        this.remaining = 0;
        return this.pose;
      }
      this.index = 0;
    }
    this.load(descriptor, facing);
    return this.pose;
  }

  load(descriptor, facing) {
    this.remaining = descriptor.delays[this.index];
    this.pose = (descriptor.poses[this.index] ^ facing) & 0xffff;
  }
}
