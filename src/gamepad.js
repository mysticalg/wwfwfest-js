// Browser standard mapping. Button positions are consistent across standard
// Xbox, PlayStation and compatible layouts even when printed labels differ.
export const gamepadButtons = {
  strike: 0, heavy: 1, run: 2, pin: 3, back: 8, start: 9,
  partnerLeft:4,partnerRight:5,
  up: 12, down: 13, left: 14, right: 15,
};

export function neutralControls() {
  return {horizontal: 0, vertical: 0, strike: false, heavy: false, run: false, pin: false};
}

function pressed(pad, name) {
  const button = pad.buttons?.[gamepadButtons[name]];
  return typeof button === 'number' ? button > 0.5 : Boolean(button?.pressed || button?.value > 0.5);
}

function direction(pad, axis, deadZone) {
  const value = pad.axes?.[axis];
  return Number.isFinite(value) && Math.abs(value) > deadZone ? Math.sign(value) : 0;
}

function snapshot(pad, deadZone) {
  const left = pressed(pad, 'left');
  const right = pressed(pad, 'right');
  const up = pressed(pad, 'up');
  const down = pressed(pad, 'down');
  return {
    horizontal: left || right ? Number(right) - Number(left) : direction(pad, 0, deadZone),
    vertical: up || down ? Number(down) - Number(up) : direction(pad, 1, deadZone),
    strike: pressed(pad, 'strike'), heavy: pressed(pad, 'heavy'),
    run: pressed(pad, 'run'), pin: pressed(pad, 'pin'),
    start: pressed(pad, 'start'), back: pressed(pad, 'back'),
    partners:pressed(pad,'partnerLeft')||pressed(pad,'partnerRight'),
  };
}

export class GamepadInput {
  constructor(readGamepads = () => {
    if (!globalThis.navigator?.getGamepads) throw new Error('Gamepad input is unavailable in this browser.');
    return navigator.getGamepads();
  }) {
    this.readGamepads = readGamepads;
    this.deadZone = 0.25;
    this.identity = null;
    this.previous = {...neutralControls(), start: false, back: false};
    this.requireNeutral = false;
  }

  suspend() {
    this.requireNeutral = true;
    this.previous = {...neutralControls(), start: false, back: false};
  }

  poll(enabled = true) {
    const result = {controls: neutralControls(), connected: false, lost: false,
      startPressed: false, backPressed: false, menuHorizontal: 0, menuVertical: 0,menuPartners:false,
      activity: false, waitingForNeutral: false, id: '', mapping: '', error: ''};
    let pads;
    try { pads = Array.from(this.readGamepads() || []).filter(pad => pad?.connected); }
    catch (error) { result.error = error.message || 'The browser blocked controller access.'; pads = []; }
    const pad = pads.find(pad => `${pad.index}:${pad.id}` === this.identity) || pads[0];
    const identity = pad ? `${pad.index}:${pad.id}` : null;
    if (this.identity !== identity) {
      result.lost = this.identity !== null;
      if (result.lost) this.suspend();
      this.identity = identity;
      this.previous = {...neutralControls(), start: false, back: false};
    }
    if (!pad) return result;
    Object.assign(result, {connected: true, id: pad.id, mapping: pad.mapping});
    const current = snapshot(pad, this.deadZone);
    const active = Object.values(current).some(Boolean);
    if (!enabled) this.requireNeutral = true;
    if (this.requireNeutral) {
      result.waitingForNeutral = active;
      if (enabled && !active) this.requireNeutral = false;
      this.previous = current;
      return result;
    }
    result.controls = {horizontal: current.horizontal, vertical: current.vertical,
      strike: current.strike, heavy: current.heavy, run: current.run, pin: current.pin};
    result.activity = active;
    result.startPressed = current.start && !this.previous.start;
    result.backPressed = current.back && !this.previous.back;
    result.menuHorizontal = current.horizontal !== this.previous.horizontal ? current.horizontal : 0;
    result.menuVertical = current.vertical !== this.previous.vertical ? current.vertical : 0;
    result.menuPartners=current.partners;
    this.previous = current;
    return result;
  }
}
