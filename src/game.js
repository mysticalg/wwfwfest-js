// Native gameplay reconstruction. These rules are provisional and explicitly
// independent of the arcade executable. Edit these values and methods to change
// behavior. Exact arcade timings, grapples, damage tables, and AI remain open.
export const rules = {
  frameRate: 60,
  walkSpeed: 0.8,
  depthSpeed: 0.5,
  runMultiplier: 2.0,
  maximumHealth: 100,
  strikeDamage: 6,
  heavyDamage: 14,
  strikeRange: 37,
  depthTolerance: 17,
  pinFrames: 180,
};

// Pose numbers refer to recovered frame-table entries shared across the roster.
export const animations = {
  idle: {poses: [0, 1], ticks: 18},
  walk: {poses: [1, 2, 3, 4, 5, 6, 7, 8], ticks: 5},
  run: {poses: [9, 10, 11, 12, 13, 14], ticks: 4},
  strike: {poses: [60, 61, 62, 65], ticks: 4},
  heavy: {poses: [146, 147, 148, 149], ticks: 6},
  hurt: {poses: [15, 16], ticks: 8},
  down: {poses: [111], ticks: 1},
  pin: {poses: [28], ticks: 1},
  victory: {poses: [89, 90, 91, 92], ticks: 12},
};

function fighter(type, x, y, facing) {
  return {type, x, y, facing, health: rules.maximumHealth, state: 'idle',
    stateTicks: 0, downTicks: 0, pinTicks: 0, hits: 0};
}

export class Match {
  constructor(playerType, opponentType) {
    this.fighters = [fighter(playerType, 103, 165, 1), fighter(opponentType, 219, 165, -1)];
    this.ticks = 0;
    this.time = 180;
    this.winner = null;
    this.ai = true;
    this.count = 0;
  }

  setState(actor, state) {
    if (actor.state === state) return;
    actor.state = state;
    actor.stateTicks = 0;
  }

  computerInput(actor, target) {
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const attacking = this.ticks % 49 < 2;
    return {
      horizontal: Math.abs(dx) > 29 ? Math.sign(dx) : 0,
      vertical: Math.abs(dy) > 5 ? Math.sign(dy) : 0,
      strike: attacking && Math.abs(dx) < 40,
      heavy: this.ticks % 157 < 2 && Math.abs(dx) < 40,
      pin: target.state === 'down',
      run: false,
    };
  }

  step(input) {
    if (this.winner !== null) return;
    this.ticks++;
    this.time = Math.max(0, 180 - Math.floor(this.ticks / rules.frameRate));
    if (!this.time) {
      this.winner = this.fighters[0].health >= this.fighters[1].health ? 0 : 1;
      return;
    }
    const opponentInput = this.ai ? this.computerInput(this.fighters[1], this.fighters[0]) : {};
    this.updateFighter(this.fighters[0], this.fighters[1], input, 0);
    this.updateFighter(this.fighters[1], this.fighters[0], opponentInput, 1);
  }

  updateFighter(actor, target, input, index) {
    actor.stateTicks++;
    if (actor.state === 'down') {
      actor.downTicks--;
      if (actor.downTicks <= 0 && actor.health > 0) this.setState(actor, 'idle');
      return;
    }
    if (actor.state === 'hurt') {
      if (actor.stateTicks >= 16) this.setState(actor, 'idle');
      return;
    }
    if (actor.state === 'strike' || actor.state === 'heavy') {
      if (actor.stateTicks === 9) this.resolveStrike(actor, target);
      const animation = animations[actor.state];
      if (actor.stateTicks >= animation.poses.length * animation.ticks) this.setState(actor, 'idle');
      return;
    }
    const close = Math.abs(actor.x - target.x) < 39 && Math.abs(actor.y - target.y) < rules.depthTolerance;
    if (input.pin && target.state === 'down' && close) {
      this.setState(actor, 'pin');
      actor.pinTicks++;
      this.count = Math.min(3, Math.floor(actor.pinTicks / 60));
      if (actor.pinTicks >= rules.pinFrames) {
        this.winner = index;
        this.setState(actor, 'victory');
      }
      return;
    }
    actor.pinTicks = 0;
    if (actor.state === 'pin') this.count = 0;
    actor.facing = target.x >= actor.x ? 1 : -1;
    if (input.heavy) { this.setState(actor, 'heavy'); return; }
    if (input.strike) { this.setState(actor, 'strike'); return; }
    const horizontal = input.horizontal || 0;
    const vertical = input.vertical || 0;
    if (horizontal || vertical) {
      const speed = input.run ? rules.walkSpeed * rules.runMultiplier : rules.walkSpeed;
      actor.x = Math.max(35, Math.min(285, actor.x + horizontal * speed));
      actor.y = Math.max(105, Math.min(179, actor.y + vertical * rules.depthSpeed));
      if (horizontal) actor.facing = horizontal;
      this.setState(actor, input.run ? 'run' : 'walk');
    } else {
      this.setState(actor, 'idle');
    }
  }

  resolveStrike(actor, target) {
    if (target.state === 'down' || target.state === 'hurt') return;
    const dx = target.x - actor.x;
    if (Math.abs(dx) > rules.strikeRange || Math.abs(actor.y - target.y) > rules.depthTolerance) return;
    if (dx * actor.facing < -5) return;
    target.health = Math.max(0, target.health - (actor.state === 'heavy' ? rules.heavyDamage : rules.strikeDamage));
    target.hits++;
    target.x = Math.max(35, Math.min(285, target.x + actor.facing * 5));
    if (!target.health || (actor.state === 'heavy' && target.hits % 3 === 0)) {
      this.setState(target, 'down');
      target.downTicks = target.health > 0 ? 160 : 1000000;
    } else {
      this.setState(target, 'hurt');
    }
  }

  pose(actor, frames) {
    const animation = animations[actor.state];
    const poses = animation.poses.filter(index => frames[index]?.pieces.length && !frames[index].requiresContext);
    return poses[Math.floor(actor.stateTicks / animation.ticks) % poses.length] ?? 0;
  }
}
