import {ActorAnimation} from './animation.js';
import {stepMovement} from './movement.js';
import {insideRingCollision, addPositionWord} from './ring-collision.js';
import {actorTables} from '../data/actor-tables.js';
import {projectionSnapshot} from './projection.js';

// Normal inside-ring states 2/3/6. Input $e58c precedes state initialization;
// handlers $10ec2/$10fce/$11020 precede the descriptor clock and movement.
export class Running {
  constructor({type = 0, xFixed, yFixed, zFixed = 0x1400000,
    facing = 0, pose = facing, movementMode = 0, speed = 0, direction = 0,
    flags32 = 0, flags33 = 0, bounceCount = 0, previousState = 0, clock,
    state = 2, contact = 0, offsetX = 0, offsetY = 0} = {}) {
    if (!Number.isInteger(type) || type < 0 || type >= actorTables.runSpeeds.length) {
      throw new RangeError('Invalid wrestler type');
    }
    Object.assign(this, {type, xFixed, yFixed, zFixed, facing, movementMode,
      speed, direction, flags32, flags33, bounceCount, previousState});
    this.state = state;
    this.pendingState = true;
    this.inputInitialized = false;
    this.clock = new ActorAnimation({...clock, pose});
    this.lastPose = pose;
    this.hits = new Set();
    this.contact = contact;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.done = false;
    this.sounds = [];
    this.ropeEvents = [];
    this.collision = {kind: 0, flags: 0, x: 0, y: 0, z: 0};
  }

  change(state) {
    this.state = state;
    this.pendingState = true;
    this.inputInitialized = false;
  }

  input(mask, stopRequested) {
    if (this.state !== 2) return;
    if (!this.inputInitialized) {
      this.inputInitialized = true;
      // A rebound's direction is already reversed by $11020.
      if ((this.clock.flags & 255) === 6 || this.bounceCount) return;
      const horizontal = mask & 3;
      if (horizontal) {
        const prior = this.facing;
        this.direction = horizontal === 1 ? 0x40 : 0xc0;
        this.facing = horizontal === 1 ? this.facing | 0x8000 : this.facing & 0x7fff;
        if (this.facing !== prior) this.flags32 |= 4;
      } else this.direction = ((this.facing >>> 8 & 0x80) ^ 0x80) + 0x40;
    } else if (!this.bounceCount && (stopRequested || (mask & (this.direction & 128 ? 1 : 2)))) {
      this.change(3);
    }
  }

  step({mask = 0, stopRequested = false, forcedStop = false, sampleInput = true, poseCleanup = true} = {}) {
    this.sounds = [];
    this.ropeEvents = [];
    if (this.done) return this;
    if(sampleInput)this.input(mask, stopRequested);
    if (this.pendingState) {
      this.previousState = this.clock.flags & 255;
      this.clock.flags = this.state | (this.inputInitialized ? 0x4000 : 0);
      this.pendingState = false;
    }
    this.collision = {...this.collision,kind: 0, flags: 0};
    if (this.movementMode) {
      this.collision = insideRingCollision({x: this.xFixed >>> 16, y: this.yFixed >>> 16,
        z: this.zFixed >>> 16, facing: this.facing, flags32: this.flags32});
      for (const [position, correction] of [['xFixed', 'x'], ['yFixed', 'y'], ['zFixed', 'z']]) {
        this[position] = addPositionWord(this[position], this.collision[correction]);
      }
    }
    const initialized = Boolean(this.clock.flags & 0x8000);
    const data = actorTables.runAnimations;
    let descriptor;
    if (this.state === 2) {
      descriptor = data.run;
      if (!initialized) {
        this.movementMode = 1;
        this.flags33 |= 16;
        this.speed = actorTables.runSpeeds[this.type];
      } else if (forcedStop) this.change(3);
      else if (this.collision.flags & (this.facing & 0x8000 ? 1 : 2)) {
        this.change(6);
        this.ropeEvents.push({side: this.collision.flags & 1 ? 'right' : 'left', strength: 2});
        this.bounceCount = Math.max(0, this.bounceCount - 1);
      } else {
        this.contact = 3;
        if (!this.clock.remaining && (this.clock.index === 1 || this.clock.index === 4)) this.sounds.push(0x33);
      }
      // Run entry also reaches $10f7c before loading its first pose.
      if (!initialized) {
        this.contact = 3;
        if (!this.clock.remaining && (this.clock.index === 1 || this.clock.index === 4)) this.sounds.push(0x33);
      }
    } else if (this.state === 3) {
      descriptor = data.brake;
      if (!initialized) this.flags33 &= ~16;
      else {
        this.contact = 1;
        if ((this.collision.kind === 1 || this.collision.kind === 5) && (this.collision.flags & 3)) {
          this.change(6);
          this.ropeEvents.push({side: this.collision.flags & 2 ? 'left' : 'right', strength: 1});
        } else {
          this.speed = (this.speed - 5) & 0xffff;
          if (this.speed & 0x8000) {
            this.change(0);
            this.movementMode = this.speed = 0;
          }
        }
      }
    } else if (this.state === 6) {
      descriptor = data.rebound;
      if (!initialized) {
        this.facing ^= 0x8000;
        this.direction ^= 0x80;
        this.movementMode = 0;
        this.speed = 12;
        this.offsetX = 32;
        this.flags32 &= ~4;
      } else {
        if (this.clock.index === 1) this.movementMode = 1;
        if (this.clock.index === 0xfe) {
          this.change(2);
          this.offsetX = this.offsetY = 0;
        }
      }
      this.contact = 32;
    } else throw new RangeError(`Untranslated running state ${this.state}`);
    this.clock.step(descriptor, this.facing);
    this.projection = projectionSnapshot(this);
    stepMovement(this);
    if (poseCleanup && this.clock.pose !== this.lastPose) {
      this.contact = 0;
      this.hits.clear();
      this.lastPose = this.clock.pose;
    }
    this.done = this.state === 0;
    return this;
  }
}
