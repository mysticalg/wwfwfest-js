import {ActorAnimation} from './animation.js';
import {stepMovement} from './movement.js';
import {insideRingCollision, addPositionWord} from './ring-collision.js';
import {actorTables} from '../data/actor-tables.js';
import {projectionSnapshot} from './projection.js';

const u16 = value => value & 65535;

// $d26e/$d1d6: alternate two row sets, indexed by target health severity.
export function runningMove(type, severity, toggle, buttons) {
  const row = actorTables.runningMoveRows[(toggle & 128 ? 36 : 0) + severity * 12 + type];
  return {action: actorTables.runningMoveTables[type][row * 3 + (buttons & 3) - 1], toggle: toggle ^ 128, row};
}

// Normal ring handlers for the eight actions reachable from $d26e. Paired
// follow-ups share actual body objects, preserving updates to the other actor.
export class RunningAttack {
  constructor({type = 0, action, xFixed, yFixed, zFixed = 0x1400000, facing = 0,
    pose = facing, clock, movementMode = 1, speed = actorTables.runSpeeds[type], direction = 64,
    flags32 = 0, flags33 = 16, flags34 = 0, contact = 0,
    velocityX = 0, velocityY = 0, velocityZ = 0, gravity = 0} = {}) {
    if (!actorTables.runningAttacks[action]) throw new RangeError(`Untranslated running action ${action}`);
    Object.assign(this, {type, action, xFixed, yFixed, zFixed, facing, movementMode, speed,
      direction, flags32, flags33, flags34, contact, velocityX, velocityY, velocityZ, gravity});
    this.clock = new ActorAnimation({...clock, pose});
    this.previousState = this.clock.flags & 255;
    this.clock.flags = 5;
    this.lastPose = pose;
    this.state = 5;
    this.reaction = 0;
    this.paddingX = this.paddingY = this.paddingZ = 0;
    this.offsetX = this.offsetY = 0;
    this.hits = new Set();
    this.target = null;
    this.linked = false;
    this.pendingTransition = this.done = false;
    this.sounds = [];
    this.ropeEvents = [];
    this.selfDamage = 0;
  }

  change(state, reaction = 0) {
    this.state = state;
    this.reaction = reaction;
    this.pendingTransition = true;
  }

  profile(index) {
    [this.velocityX, this.velocityZ, this.gravity] = actorTables.motionProfiles[index];
    this.velocityY = 0;
    if (this.facing & 0x8000) this.velocityX = u16(-this.velocityX);
    this.movementMode = 2;
  }

  nudge(x, y = 0, z = 0) {
    this.xFixed = addPositionWord(this.xFixed, this.facing & 0x8000 ? -x : x);
    this.yFixed = addPositionWord(this.yFixed, y);
    this.zFixed = addPositionWord(this.zFixed, z);
  }

  placeTarget(x, y, z) {
    for (const [field, delta] of [['xFixed', this.facing & 0x8000 ? -x : x], ['yFixed', y], ['zFixed', z]]) {
      this.target[field] = addPositionWord(this.target[field], (this[field] >>> 16) - (this.target[field] >>> 16) + delta);
    }
  }

  wall() {
    if (this.collision.kind !== 1 || !(this.collision.flags & 3)) return false;
    this.ropeEvents.push({side: this.collision.flags & 2 ? 'left' : 'right', strength: 1});
    return true;
  }

  step() {
    this.sounds = [];
    this.ropeEvents = [];
    this.selfDamage = 0;
    this.collision = {kind: 0, flags: 0, x: 0, y: 0, z: 0};
    if (this.movementMode) {
      this.collision = insideRingCollision({x: this.xFixed >>> 16, y: this.yFixed >>> 16,
        z: this.zFixed >>> 16, facing: this.facing, flags32: this.flags32,
        paddingX: this.paddingX, paddingY: this.paddingY, paddingZ: this.paddingZ});
      for (const [position, correction] of [['xFixed', 'x'], ['yFixed', 'y'], ['zFixed', 'z']]) {
        this[position] = addPositionWord(this[position], this.collision[correction]);
      }
    }
    const initialized = Boolean(this.clock.flags & 0x8000);
    const action = this.action & 255;
    let descriptor = actorTables.runningAttacks[action];
    if (action === 32 || action === 45) {
      if (this.wall()) this.change(6);
      else {
        this.contact = 11;
        this.speed = u16(this.speed - 2);
        if (this.speed & 0x8000) { this.change(0); this.nudge(8); this.linked = false; }
      }
    } else if (action === 42) {
      if (initialized) {
        this.contact = this.clock.index ? 19 : 3;
        if (this.wall()) this.change(6);
        else if (this.clock.index === 3) {
          this.speed = u16(this.speed - 3);
          if (this.speed & 0x8000) {
            this.movementMode = this.speed = 0;
            this.change(0);
            this.linked = false;
          }
        }
      }
    } else if (action === 1) {
      if (!initialized) {
        this.flags32 &= ~2;
        this.profile(this.previousState === 2 ? 28 : 27);
        this.flags33 |= 8;
      } else if (this.wall()) {
        this.change(4, 23);
        this.selfDamage = 3;
        this.sounds.push(0x32);
      } else {
        this.contact = this.clock.index === 2 ? 24 : 0;
        if (this.clock.index === 2 && (this.zFixed >>> 16) <= 0x150) {
          this.clock.remaining = 0;
          this.nudge(-40);
        }
        if (this.clock.index === 3 && !(this.collision.flags & 16)) {
          // This held frame waits for landing before considering completion.
        } else {
          if (this.clock.index === 3) {
            this.movementMode = 0;
            this.clock.remaining = 0;
            this.sounds.push(0x29);
          }
          if (this.clock.index === 0xfe) { this.change(7); this.linked = false; }
        }
      }
    } else if (action === 4) {
      if (!initialized) {
        this.target = null;
        this.zFixed = addPositionWord(this.zFixed, 48);
        this.flags33 = (this.flags33 | 8) & ~16;
        this.flags32 &= ~2;
        this.profile(10);
      } else {
        let continueHandler = true;
        if (!(this.action & 0x8000) && this.clock.index < 2) {
          this.contact = 0;
          if ((this.zFixed >>> 16) <= 0x160) continueHandler = false;
          else {
            this.contact = 23;
            if (this.target?.state === 4 && (this.target.reaction & 255) === 18 && this.target.attacker === this) {
              this.movementMode = 0;
              this.action |= 0x8000;
              this.zFixed = addPositionWord(this.zFixed, (this.target.zFixed >>> 16) - (this.zFixed >>> 16));
              this.clock.flags = 5;
              this.linked = true;
              continueHandler = false;
            }
          }
        }
        if (continueHandler) {
          if ((this.action & 0x8000) && this.clock.index === 1 && !this.clock.remaining) {
            this.zFixed = addPositionWord(this.zFixed, 64);
            this.offsetX = this.offsetY = 0;
            this.target.change(4, 25);
            this.target.reaction = 25;
            this.target.flags34 |= 8;
            this.target.clock.pose = this.target.facing ^ 179;
            this.placeTarget(16, -1, 16);
          }
          if (this.clock.index === 2) {
            this.movementMode = 2;
            if (this.collision.flags & 16) {
              this.sounds.push(0x29);
              this.clock.remaining = 0;
              this.movementMode = 0;
              this.flags33 &= ~24;
              this.facing ^= 0x8000;
              this.offsetX = 0xd0;
            }
          }
          if (this.clock.index < 3) {
            this.paddingX = 0xfff0;
            if (this.wall()) {
              this.change(4, 23);
              this.selfDamage = 3;
              this.sounds.push(0x32);
              this.paddingX = 0;
              continueHandler = false;
            }
          }
          if (continueHandler && this.clock.index === 0xfe) {
            this.offsetX = this.offsetY = 0;
            this.change(7);
            this.clock.pose = this.facing ^ 104;
            this.paddingX = 0;
            this.nudge(-48);
            this.linked = false;
          }
        }
      }
      if (this.action & 0x8000) descriptor = actorTables.runningPairedAnimations.airborneCapture;
    } else if (action === 5) {
      if (!initialized) { this.movementMode = 1; this.target = null; }
      else {
        if (!this.clock.remaining && [1, 4].includes(this.clock.index)) this.sounds.push(0x33);
        let capturedNow = false;
        if (!(this.action & 0x8000)) {
          this.contact = this.clock.index < 4 ? 6 : 3;
          if (this.target?.state === 4 && (this.target.reaction & 255) === 16 && this.target.attacker === this) {
            this.clock.flags = 5;
            this.action |= 0x8000;
            this.linked = true;
            this.contact = 0;
            capturedNow = true;
          } else if (this.wall()) this.change(6);
        }
        if (!capturedNow && !this.pendingTransition) {
          if ((this.action & 0x8000) && this.clock.index === 2 && !this.clock.remaining) {
            this.target.change(4, 25);
            this.placeTarget(16, -1, 56);
          }
          if (this.clock.index === 0xfe) { this.change(3); this.linked = false; }
        }
      }
      if (this.action & 0x8000) descriptor = actorTables.runningPairedAnimations.runningCapture;
    } else if (action === 64) {
      if (!initialized) { this.profile(11); this.movementMode = 0; this.flags33 |= 8; }
      else if (!this.clock.index && !this.clock.remaining) { this.movementMode = 2; this.flags33 |= 8; }
      else {
        if (this.clock.index === 2) {
          if (this.wall()) this.change(4, 23);
          else {
            this.contact = 22;
            if (this.collision.flags & 16) {
              this.sounds.push(0x29);
              this.flags33 &= ~8;
              this.movementMode = 0;
              this.clock.remaining = 0;
            }
          }
        }
        if (this.clock.index === 0xfe) this.change(0);
      }
    } else if (action === 65) {
      if (!initialized) this.target = null;
      else if (this.wall()) this.change(6);
      else {
        let capturedNow = false;
        if (!(this.action & 0x8000)) {
          this.contact = 16;
          if (this.target?.state === 4 && (this.target.reaction & 255) === 29) {
            this.action |= 0x8000;
            this.clock.pose = 0xffff;
            this.clock.remaining = 12;
            this.movementMode = 0;
            this.linked = true;
            capturedNow = true;
          }
        }
        if (!capturedNow && this.clock.index === 0xfe) { this.change(0); this.linked = false; }
      }
    }
    this.clock.step(descriptor, this.facing);
    this.projection = projectionSnapshot(this);
    stepMovement(this);
    if (this.clock.pose !== this.lastPose) {
      this.contact = 0;
      this.hits.clear();
      this.lastPose = this.clock.pose;
    }
    this.done = this.state === 0;
    return this;
  }
}

export function runningHitResponse(contact, attacker, target) {
  const record = actorTables.contacts[contact & 255];
  const rejected = record[5] === 11 ? target.contact & 0x8000 : target.contact & 0xff00;
  if (rejected) return {accepted: false, damage: 0, reaction: 0, sounds: []};
  let damage = record[4], reaction;
  let facing = target.facing;
  const map = () => {
    if (reaction < 36 && Boolean(attacker.facing & 0x8000) === Boolean(facing & 0x8000)) reaction = actorTables.reactionFacingMap[reaction];
  };
  if (record[5] === 2) {
    reaction = 2;
    map();
    if (actorTables.contacts[target.contact & 255][6] === 0) map();
    return {accepted: true, damage: 0, reaction, facing,
      selfReaction: target.state === 2 ? 2 : 24, recoveryTimer: 80,
      selfRecoveryTimer: target.state === 2 ? 80 : 0, sounds: [0x2b]};
  } else if (record[5] === 4) {
    reaction = 16;
    if (Boolean(attacker.direction & 128) === Boolean(facing & 0x8000)) {
      facing = attacker.facing ^ 0x8000;
      if (target.flags33 & 16) damage++;
      if (attacker.type === 0 || attacker.type === 5) damage += 3;
    } else reaction = 11;
  } else if (record[5] === 11) {
    reaction = 18;
    if ((target.contact & 255) !== 26) { map(); if (target.flags33 & 16) damage++; }
  } else {
    reaction = record[5] === 7 ? 29 : target.flags33 & 16 ? 3 : 2;
    map();
    if (target.flags33 & 16) damage++;
  }
  const secondary = actorTables.contacts[target.contact & 255][6];
  if (secondary === 0) map();
  else if (secondary === 12 && reaction === 10) { reaction = 2; map(); }
  return {accepted: true, damage, reaction, facing, sounds: [0x2b, 0x32]};
}
