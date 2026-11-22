// $0050fe: directions update each frame; action buttons use the alternate
// frame accumulator at actor offsets $a4/$a6. This is the original board input
// sampling boundary, independent of the game's action-state handlers.
export class ArcadeInput {
  constructor(initial = {}) { this.reset(initial); }

  reset({accumulator = 0, held = 0} = {}) {
    Object.assign(this, {accumulator, held, pressed: 0, directions: 0});
  }

  step(activeByte, phase) {
    this.directions = activeByte & 15;
    const buttons = ((activeByte >>> 4) & 7) | ((activeByte & 128) << 1);
    let next;
    if (phase & 1) this.accumulator = next = (this.accumulator | buttons) & 65535;
    else { next = this.accumulator; this.accumulator = 0; }
    this.pressed = next & ~this.held & 65535;
    this.held = next;
    return this;
  }

  controls(raw, phase) {
    const directions = (raw.horizontal > 0 ? 1 : raw.horizontal < 0 ? 2 : 0)
      | (raw.vertical < 0 ? 4 : raw.vertical > 0 ? 8 : 0);
    this.step(directions | (raw.strike ? 16 : 0) | (raw.heavy ? 32 : 0), phase);
    return {...raw, strike: Boolean(this.held & 1), heavy: Boolean(this.held & 2)};
  }
}
