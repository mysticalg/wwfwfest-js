import {ActorAnimation} from './actors/animation.js';
import {walkAnimation, walkDelta} from './actors/movement.js';
import {groundContact} from './actors/contact.js';
import {StandingAction, StandingReaction, standingHitResponse} from './actors/standing-action.js';

// Ordinary walking and its descriptor clock are translated from the arcade
// routines. Standing punch/kick handlers and their ordinary contact/reaction paths
// are translated too. Knockdowns, running, arena constraints, AI and match rules
// remain provisional until their handlers are recovered.
export const rules = {
  frameRate: 60,
  runMultiplier: 2.0,
  maximumHealth: 100,
  depthTolerance: 17,
  pinFrames: 180,
};

// Walking uses the recovered descriptor clock below. Other action sequences
// remain provisional, with pose numbers from the recovered frame tables.
export const animations = {
  idle: {poses: [0], ticks: 1},
  walk: {poses: walkAnimation().poses, ticks: walkAnimation().delays[0] + 1},
  run: {poses: [9, 10, 11, 12, 13, 14], ticks: 4},
  down: {poses: [111], ticks: 1},
  pin: {poses: [28], ticks: 1},
  victory: {poses: [89, 90, 91, 92], ticks: 12},
};

function fighter(type, x, y, facing) {
  return {type, x, y, facing, health: rules.maximumHealth, state: 'idle',
    stateTicks: 0, downTicks: 0, pinTicks: 0, hits: 0,
    contact: 0, comboCount: 0, comboTimer: 0, previousButtons: 0,
    lastPose: facing > 0 ? 0x8000 : 0, pendingIdle: false,
    animation: new ActorAnimation({pose: facing > 0 ? 0x8000 : 0})};
}

export class Match {
  constructor(playerType, opponentType) {
    this.fighters = [fighter(playerType, 103, 165, 1), fighter(opponentType, 219, 165, -1)];
    this.ticks = 0;
    this.time = 180;
    this.winner = null;
    this.ai = true;
    this.count = 0;
    this.soundCommands = [];
  }

  setState(actor, state) {
    if (actor.state === state) return;
    actor.state = state;
    actor.stateTicks = 0;
    actor.animation.reset();
    actor.standingAction = null;
    actor.standingReaction = null;
    actor.pendingIdle = false;
    if (state !== 'idle' && state !== 'walk' && state !== 'strike' && state !== 'heavy') actor.contact = 0;
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
    for (const actor of this.fighters) {
      this.advanceActor(actor);
    }
    // Original frame order is all actor updates, pose/contact cleanup, contact
    // dispatch, then damage and combo-window service ($000fe0-$000fec).
    for (const actor of this.fighters) {
      if (actor.animation.pose !== actor.lastPose) {
        actor.contact = 0;
        actor.standingAction?.hits.clear();
        actor.lastPose = actor.animation.pose;
      }
    }
    this.resolveStrike(this.fighters[0], this.fighters[1]);
    this.resolveStrike(this.fighters[1], this.fighters[0]);
    for (const actor of this.fighters) {
      if (actor.comboTimer > 0) actor.comboTimer--;
      else actor.comboCount = 0;
    }
  }

  advanceActor(actor) {
    const facing = actor.facing > 0 ? 0x8000 : 0;
    if (actor.state === 'walk') {
      actor.contact = 1;
      actor.animation.step(walkAnimation(), facing);
    } else if (actor.state === 'idle') {
      if (actor.animation.flags & 0x8000) actor.contact = 1;
      actor.animation.idle(facing);
    } else if (actor.standingAction) {
      actor.standingAction.step(facing);
      actor.contact = actor.standingAction.contact;
      actor.pendingIdle = actor.standingAction.done;
    } else if (actor.standingReaction) {
      if (!(actor.animation.flags & 0x8000)) {
        actor.comboCount = (actor.comboCount + 1) & 0xffff;
        actor.comboTimer = 64;
      }
      actor.standingReaction.step(facing);
      actor.pendingIdle = actor.standingReaction.done;
    }
  }

  takeSoundCommands() {
    return this.soundCommands.splice(0);
  }

  updateFighter(actor, target, input, index) {
    actor.stateTicks++;
    const buttons = (input.strike ? 1 : 0) | (input.heavy ? 2 : 0);
    const pressed = buttons & ~actor.previousButtons;
    actor.previousButtons = buttons;
    if (actor.pendingIdle) {
      this.setState(actor, 'idle');
      return;
    }
    if (actor.state === 'down') {
      actor.downTicks--;
      if (actor.downTicks <= 0 && actor.health > 0) this.setState(actor, 'idle');
      return;
    }
    if (actor.standingReaction || actor.standingAction) return;
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
    if (pressed) {
      // Combined-button grapple selection is still open. Single-button row-zero
      // actions are the recovered punch 0 and kick $72.
      const button = pressed & 2 ? 1 : 0;
      const contact = actor.contact;
      this.setState(actor, button ? 'heavy' : 'strike');
      actor.standingAction = new StandingAction(button, actor.animation.pose, contact);
      actor.animation = actor.standingAction.clock;
      return;
    }
    const horizontal = input.horizontal || 0;
    const vertical = input.vertical || 0;
    if (horizontal || vertical) {
      const delta = walkDelta(actor.type, horizontal, vertical);
      const multiplier = input.run ? rules.runMultiplier : 1;
      actor.x = Math.max(35, Math.min(285, actor.x + delta.x * multiplier / 65536));
      actor.y = Math.max(105, Math.min(179, actor.y + delta.y * multiplier / 65536));
      // Normal walking faces the linked opponent ($00fe28), including when
      // backing away. Running is still the prototype's authored action.
      if (input.run && horizontal) actor.facing = horizontal;
      this.setState(actor, input.run ? 'run' : 'walk');
    } else {
      this.setState(actor, 'idle');
    }
  }

  resolveStrike(actor, target) {
    const action = actor.standingAction;
    if (!action || action.hits.has(target) || !actor.contact || !target.contact) return;
    const body = fighter => ({x: Math.floor(fighter.x), y: Math.floor(fighter.y), z: 0,
      pose: fighter.animation.pose, contact: fighter.contact});
    if (!groundContact(body(actor), body(target))) return;
    const response = standingHitResponse(action.button, actor.facing > 0 ? 0x8000 : 0,
      {contact: target.contact, flags33: 0, comboCount: target.comboCount,
        facing: target.facing > 0 ? 0x8000 : 0});
    if (!response.accepted) return;
    action.hits.add(target);
    action.contact = actor.contact = 0;
    this.soundCommands.push(...response.sounds);
    target.health = Math.max(0, target.health - response.damage);
    target.hits++;
    if (!target.health || (response.reaction !== 0 && response.reaction !== 10)) {
      // The original response selects an airborne/back-hit handler here. The
      // prototype's down state remains until that handler and ring physics land.
      this.setState(target, 'down');
      target.downTicks = target.health > 0 ? 160 : 1000000;
    } else {
      this.setState(target, 'hurt');
      target.standingReaction = new StandingReaction(response.reaction === 10 ? 1 : 0, target.animation.pose);
      target.animation = target.standingReaction.clock;
    }
  }

  pose(actor, frames) {
    if (actor.state === 'idle' || actor.state === 'walk' || actor.standingAction || actor.standingReaction) {
      return actor.animation.pose & 0x7fff;
    }
    const animation = animations[actor.state];
    const poses = animation.poses.filter(index => frames[index]?.pieces.length && !frames[index].requiresContext);
    return poses[Math.floor(actor.stateTicks / animation.ticks) % poses.length] ?? 0;
  }

  mirrored(actor) {
    if (actor.state === 'idle' || actor.state === 'walk' || actor.standingAction || actor.standingReaction) {
      return Boolean(actor.animation.pose & 0x8000);
    }
    return actor.facing > 0;
  }
}
