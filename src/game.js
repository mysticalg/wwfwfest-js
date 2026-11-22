import {ActorAnimation} from './actors/animation.js';
import {walkAnimation, walkDelta, walkSpeed} from './actors/movement.js';
import {groundContact} from './actors/contact.js';
import {StandingAction, StandingReaction, standingHitResponse} from './actors/standing-action.js';
import {Knockdown} from './actors/knockdown.js';
import {Running} from './actors/running.js';
import {worldPosition, updateScreenPosition, spritePosition, healthSeverity} from './actors/projection.js';
import {insideRingCollision, addPositionWord} from './actors/ring-collision.js';
import {actorTables} from './data/actor-tables.js';
import {WorldCamera} from './camera.js';
import {SceneryAnimator} from './scenery.js';

// Ordinary walking and its descriptor clock are translated from the arcade
// routines. Standing punch/kick handlers and their ordinary contact/reaction paths
// are translated too. Normal inside-ring knockdown/recovery now uses its original
// handlers and physics. Running/braking/rebounds use original handlers too. AI and match rules
// remain provisional until their remaining handlers are recovered.
export const rules = {
  frameRate: 60,
  maximumHealth: 100,
  depthTolerance: 17,
  pinFrames: 180,
};

// Walking uses the recovered descriptor clock below. Other action sequences
// remain provisional, with pose numbers from the recovered frame tables.
export const animations = {
  idle: {poses: [0], ticks: 1},
  walk: {poses: walkAnimation().poses, ticks: walkAnimation().delays[0] + 1},
  down: {poses: [111], ticks: 1},
  pin: {poses: [28], ticks: 1},
  victory: {poses: [89, 90, 91, 92], ticks: 12},
};

function fighter(type, x, y, facing) {
  return {type, x, y, z: 0, facing, health: rules.maximumHealth,
    maximumHealth: rules.maximumHealth, severity: 0, state: 'idle',
    stateTicks: 0, pinTicks: 0, hits: 0,
    contact: 0, comboCount: 0, comboTimer: 0, previousButtons: 0,
    movementMode: 0, moveHorizontal: 0, moveVertical: 0,
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
    this.camera = new WorldCamera();
    this.scenery = new SceneryAnimator();
    this.scenery.step(this.camera.chunkX, this.camera.chunkY);
  }

  setState(actor, state) {
    if (actor.state === state) return;
    actor.state = state;
    actor.stateTicks = 0;
    actor.animation.reset();
    actor.standingAction = null;
    actor.standingReaction = null;
    actor.knockdown = null;
    actor.running = null;
    actor.pendingIdle = false;
    if (state === 'idle') actor.spriteOffsetX = actor.spriteOffsetY = 0;
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
    this.camera.step(this.fighters.map(actor => {
      const world = worldPosition(actor);
      return {x: world.xFixed >>> 16, y: world.yFixed >>> 16, z: world.zFixed >>> 16,
        flags33: actor.cameraFlags ?? 1, priority: actor.cameraPriority || 0, active: true};
    }));
    this.scenery.step(this.camera.chunkX, this.camera.chunkY);
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
    let collision = {kind: 0, flags: 0};
    if (!actor.knockdown && !actor.running && actor.movementMode) {
      const world = worldPosition(actor);
      collision = insideRingCollision({x: world.xFixed >>> 16, y: world.yFixed >>> 16,
        z: world.zFixed >>> 16, facing});
      world.xFixed = addPositionWord(world.xFixed, collision.x);
      world.yFixed = addPositionWord(world.yFixed, collision.y);
      world.zFixed = addPositionWord(world.zFixed, collision.z);
      updateScreenPosition(actor, world);
    }
    if (actor.running) {
      actor.running.step({mask: actor.inputMask});
      updateScreenPosition(actor, actor.running);
      actor.facing = actor.running.facing & 0x8000 ? 1 : -1;
      actor.movementMode = actor.running.movementMode;
      actor.contact = actor.running.contact;
      actor.spriteOffsetX = actor.running.offsetX;
      actor.spriteOffsetY = actor.running.offsetY;
      actor.pendingIdle = actor.running.done;
      this.soundCommands.push(...actor.running.sounds);
    } else if (actor.knockdown) {
      const pinned = this.fighters.some(other => other !== actor && other.state === 'pin');
      actor.knockdown.cameraY = this.camera.y;
      actor.knockdown.step({pressed: actor.pressedButtons, pinned});
      updateScreenPosition(actor, actor.knockdown);
      actor.facing = actor.knockdown.facing & 0x8000 ? 1 : -1;
      actor.contact = 0;
      actor.movementMode = actor.knockdown.movementMode;
      if (actor.knockdown.comboReset) actor.comboCount = actor.comboTimer = 0;
      actor.pendingIdle = actor.knockdown.done;
      this.soundCommands.push(...actor.knockdown.sounds);
    } else if (actor.state === 'walk') {
      actor.movementMode = 1;
      actor.contact = 1;
      actor.animation.step(walkAnimation(), facing);
    } else if (actor.state === 'idle') {
      actor.movementMode = 0;
      if (actor.animation.flags & 0x8000) actor.contact = 1;
      actor.animation.idle(facing);
    } else if (actor.standingAction) {
      if (!(actor.animation.flags & 0x8000)) {
        actor.movementMode = 0;
        if (actor.standingAction.button === 0) {
          const world = worldPosition(actor);
          const correction = insideRingCollision({x: world.xFixed >>> 16, y: world.yFixed >>> 16,
            z: world.zFixed >>> 16, facing, paddingX: 0xffe8,
            kind: collision.kind, flags: collision.flags});
          world.xFixed = addPositionWord(world.xFixed, correction.x);
          updateScreenPosition(actor, world);
        }
      }
      actor.standingAction.step(facing);
      actor.contact = actor.standingAction.contact;
      actor.pendingIdle = actor.standingAction.done;
    } else if (actor.standingReaction) {
      actor.movementMode = 0;
      if (!(actor.animation.flags & 0x8000)) {
        actor.comboCount = (actor.comboCount + 1) & 0xffff;
        actor.comboTimer = 64;
      }
      actor.standingReaction.step(facing);
      actor.pendingIdle = actor.standingReaction.done;
    } else actor.movementMode = 0;

    if (!actor.knockdown && actor.state === 'walk') {
      const delta = walkDelta(actor.type, actor.moveHorizontal, actor.moveVertical);
      const dx = delta.x / 65536;
      actor.x += dx;
      actor.y += delta.y / 65536;
    }
  }

  takeSoundCommands() {
    return this.soundCommands.splice(0);
  }

  updateFighter(actor, target, input, index) {
    actor.stateTicks++;
    const buttons = (input.strike || input.run ? 1 : 0) | (input.heavy || input.run ? 2 : 0);
    const pressed = buttons & ~actor.previousButtons;
    actor.pressedButtons = pressed;
    actor.previousButtons = buttons;
    const horizontal = input.horizontal || 0;
    const vertical = input.vertical || 0;
    actor.inputMask = (horizontal > 0 ? 1 : horizontal < 0 ? 2 : 0)
      | (vertical > 0 ? 8 : vertical < 0 ? 4 : 0);
    if (actor.pendingIdle) {
      this.setState(actor, 'idle');
      actor.facing = Math.floor(target.x) >= Math.floor(actor.x) ? 1 : -1;
      return;
    }
    if (actor.state === 'down') return;
    if (actor.running) return;
    if (actor.standingReaction || actor.standingAction) return;
    const close = Math.abs(actor.x - target.x) < 39 && Math.abs(actor.y - target.y) < rules.depthTolerance;
    if (input.pin && target.state === 'down' && (!target.knockdown || target.knockdown.canPin) && close) {
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
    if (pressed === 3) {
      const body = new Running({...worldPosition(actor), type: actor.type,
        facing: actor.facing > 0 ? 0x8000 : 0, pose: actor.animation.pose,
        movementMode: actor.movementMode, clock: actor.animation});
      this.setState(actor, 'run');
      actor.running = body;
      actor.animation = body.clock;
      return;
    }
    actor.facing = Math.floor(target.x) >= Math.floor(actor.x) ? 1 : -1;
    if (pressed) {
      // Single-button row-zero actions are punch 0 and kick $72.
      const button = pressed & 2 ? 1 : 0;
      const contact = actor.contact;
      this.setState(actor, button ? 'heavy' : 'strike');
      actor.standingAction = new StandingAction(button, actor.animation.pose, contact);
      actor.animation = actor.standingAction.clock;
      return;
    }
    actor.moveHorizontal = horizontal;
    actor.moveVertical = vertical;
    if (horizontal || vertical) {
      // Normal walking faces the linked opponent ($00fe28), including when backing away.
      this.setState(actor, 'walk');
    } else {
      this.setState(actor, 'idle');
    }
  }

  resolveStrike(actor, target) {
    const action = actor.standingAction;
    if (!action || action.hits.has(target) || !actor.contact || !target.contact) return;
    const body = fighter => {
      const world = worldPosition(fighter);
      return {x: world.xFixed >>> 16, y: world.yFixed >>> 16, z: world.zFixed >>> 16,
        pose: fighter.animation.pose, contact: fighter.contact};
    };
    if (!groundContact(body(actor), body(target))) return;
    const response = standingHitResponse(action.button, actor.facing > 0 ? 0x8000 : 0,
      {contact: target.contact, flags33: target.running?.flags33 || 0, comboCount: target.comboCount,
        facing: target.facing > 0 ? 0x8000 : 0});
    if (!response.accepted) return;
    action.hits.add(target);
    action.contact = actor.contact = 0;
    this.soundCommands.push(...response.sounds);
    const reaction = response.reaction | (target.severity === 2 ? 0x8000 : 0);
    target.health = Math.max(0, target.health - response.damage);
    target.severity = healthSeverity(target.health, target.maximumHealth, target.severity);
    target.hits++;
    if (response.reaction !== 0 && response.reaction !== 10) {
      this.setState(target, 'down');
      target.knockdown = new Knockdown({...worldPosition(target), reaction,
        facing: target.facing > 0 ? 0x8000 : 0, pose: target.animation.pose,
        health: target.health, maximumHealth: target.maximumHealth, severity: target.severity,
        flags56: target === this.fighters[1] && this.ai ? 128 : 0, cameraY: this.camera.y,
        movementMode: target.movementMode, speed: walkSpeed(target.type),
        direction: actorTables.inputDirections[(target.moveHorizontal > 0 ? 1 : target.moveHorizontal < 0 ? 2 : 0)
          | (target.moveVertical > 0 ? 8 : target.moveVertical < 0 ? 4 : 0)]});
      target.animation = target.knockdown.clock;
    } else {
      this.setState(target, 'hurt');
      target.standingReaction = new StandingReaction(response.reaction === 10 ? 1 : 0, target.animation.pose);
      target.animation = target.standingReaction.clock;
    }
  }

  pose(actor, frames) {
    if (actor.state === 'idle' || actor.state === 'walk' || actor.standingAction || actor.standingReaction || actor.knockdown || actor.running) {
      return actor.animation.pose & 0x7fff;
    }
    const animation = animations[actor.state];
    const poses = animation.poses.filter(index => frames[index]?.pieces.length && !frames[index].requiresContext);
    return poses[Math.floor(actor.stateTicks / animation.ticks) % poses.length] ?? 0;
  }

  mirrored(actor) {
    if (actor.state === 'idle' || actor.state === 'walk' || actor.standingAction || actor.standingReaction || actor.knockdown || actor.running) {
      return Boolean(actor.animation.pose & 0x8000);
    }
    return actor.facing > 0;
  }

  drawPosition(actor) {
    return spritePosition(actor, this.camera);
  }
}
