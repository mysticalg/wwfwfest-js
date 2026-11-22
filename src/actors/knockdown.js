import {ActorAnimation} from './animation.js';
import {stepMovement} from './movement.js';
import {insideRingCollision, addPositionWord} from './ring-collision.js';
import {actorTables} from '../data/actor-tables.js';
import {worldPosition} from './projection.js';

const u16 = value => value & 0xffff;

// The normal inside-ring knockdown/recovery path, translated from the handlers
// at $01a374-$01a69e and $011082. Positions retain the original world convention.
export class Knockdown {
  constructor({xFixed, yFixed, zFixed = 0x1400000, facing = 0, pose = 0,
    reaction = 2, health = 100, maximumHealth = 100, severity = 0,
    flags32 = 0, flags33 = 0, flags56 = 0, recoveryTimer = 0,
    mash = 0, cameraY = 0x241, movementMode = 0, speed = 0, direction = 0,
    state = 4, clock, flags34 = 0, velocityX = 0, velocityY = 0, velocityZ = 0, gravity = 0,
    captureTimer = 0, attacker = null} = {}) {
    Object.assign(this, {xFixed, yFixed, zFixed, facing, health, maximumHealth, severity,
      flags32, flags33, flags56, flags34, recoveryTimer, mash, cameraY, captureTimer, attacker});
    this.state = state;
    this.reaction = reaction;
    this.action = 0;
    this.clock = new ActorAnimation({...clock, pose});
    this.pendingState = true;
    this.previousState = 0;
    Object.assign(this, {movementMode, speed, direction});
    Object.assign(this, {velocityX, velocityY, velocityZ, gravity});
    this.paddingX = this.paddingY = this.paddingZ = 0;
    this.collision = {kind: 0, flags: 0, x: 0, y: 0, z: 0};
    this.done = false;
    this.comboReset = false;
    this.comboTimerStart = 0;
    this.sounds = [];
    this.linked = false;
    this.offsetX = this.offsetY = 0;
  }

  get canPin() {
    return this.state === 4 && [8, 9].includes(this.reaction & 255) && !this.pendingState;
  }

  change(state, value = null) {
    this.state = state;
    if (value !== null) {
      if (state === 4) this.reaction = u16((this.reaction & 0xff00) | value);
      else if (state === 5) this.action = value;
    }
    this.pendingState = true;
  }

  collisionAt(paddingX = this.paddingX, paddingY = this.paddingY) {
    return insideRingCollision({x: this.xFixed >>> 16, y: this.yFixed >>> 16, z: this.zFixed >>> 16,
      facing: this.facing, flags32: this.flags32, paddingX, paddingY, paddingZ: this.paddingZ,
      kind: this.collision.kind, flags: this.collision.flags});
  }

  profile(index) {
    [this.velocityX, this.velocityZ, this.gravity] = actorTables.motionProfiles[index];
    this.velocityY = 0;
    if (this.facing & 0x8000) this.velocityX = u16(-this.velocityX);
    this.movementMode = 2;
  }

  nudgeX(padding) {
    const correction = this.collisionAt(padding);
    if (correction.flags & 3) this.velocityX = 0;
    this.xFixed = addPositionWord(this.xFixed, correction.x);
  }

  initializeMash() {
    if (this.mash && this.mash < 0x8000) return;
    const quarter = this.maximumHealth >>> 2;
    let threshold = quarter;
    let index = 3;
    while (threshold < this.health && index > 0) { threshold += quarter; index--; }
    this.mash = actorTables.recoveryMashCounts[index];
  }

  mashButton(pressed) {
    if (!(this.flags56 & 0xc0) && pressed && this.mash !== 0x4000) {
      this.mash = u16(this.mash - 1);
      if (!this.mash) this.mash = 0x4000;
    }
  }

  step({pressed = 0, pinned = false, linkedFlags34 = 0} = {}) {
    this.sounds = [];
    this.comboReset = false;
    this.comboTimerStart = 0;
    // $00de04 is an input-phase transition. It initializes the selected recovery
    // action during this update, while handler transitions initialize next time.
    const lowReaction = this.reaction & 255;
    if (pressed && !this.pendingState && !(this.flags56 & 0xc0)
      && this.mash === 0x4000 && this.state === 4 && !pinned
      && !(linkedFlags34 & 16) && (lowReaction === 8 || lowReaction === 9)) {
      this.change(5, lowReaction === 8 ? 0x38 : 0x78);
      this.mash = 0;
    }
    if (this.pendingState) {
      this.previousState = this.clock.flags & 255;
      this.clock.flags = this.state;
      this.pendingState = false;
    }
    this.collision = {kind: 0, flags: 0, x: 0, y: 0, z: 0};
    if (this.movementMode) {
      this.collision = this.collisionAt();
      if (this.collision.flags) {
        this.xFixed = addPositionWord(this.xFixed, this.collision.x);
        this.yFixed = addPositionWord(this.yFixed, this.collision.y);
        this.zFixed = addPositionWord(this.zFixed, this.collision.z);
      }
    }
    const initialized = Boolean(this.clock.flags & 0x8000);
    const data = actorTables.knockdownAnimations;
    let descriptor;
    if (this.state === 7) {
      descriptor = data.getup;
      if (!initialized) {
        this.movementMode = 0;
        this.flags33 &= ~0x58;
        this.mash = this.recoveryTimer = 0;
      } else if (this.clock.index === 0xfe) this.change(0);
    } else if (this.state === 5) {
      descriptor = this.action === 0x38 ? data.rollRecovery : data.backRecovery;
      if (!initialized) {
        this.movementMode = this.action === 0x38 ? 1 : 0;
        if (this.movementMode) {
          this.direction = this.cameraY >= 0x240 ? 0x80 : 0;
          this.speed = 0x18;
        }
      } else if (this.clock.index === 0xfe) {
        this.reaction = 0;
        this.change(7);
      }
    } else {
      const reaction = this.reaction & 255;
      if (reaction >= 11 && reaction <= 13) {
        descriptor = data.turn;
        this.facing ^= 0x8000;
        this.change(4, reaction - 9);
        this.clock.pose = 0xffff;
      } else if (reaction >= 2 && reaction <= 4) {
        descriptor = this.reaction & 0x8000 ? data.flightSevere : data.flight;
        if (!initialized) {
          this.profile(reaction - 2);
          const y = this.yFixed >>> 16;
          if (u16(y + 32) >= 0x198) this.velocityY = 0xffc0;
          else if (u16(y - 32) < 0x118) this.velocityY = 0x40;
        } else {
          if (this.clock.index === 0 && this.clock.remaining === 0) {
            this.xFixed = addPositionWord(this.xFixed, this.facing & 0x8000 ? 16 : -16);
            this.zFixed = addPositionWord(this.zFixed, 16);
          }
          this.paddingX = 0x40;
          if (this.collision.flags & 16) {
            this.paddingX = 0;
            this.change(4, 5);
            this.sounds.push(0x29);
          }
        }
      } else if (reaction === 5) {
        if (!initialized) {
          this.flags33 &= ~16;
          this.nudgeX(0x50);
          this.profile(3);
          this.mash = 0;
          this.initializeMash();
          if (this.severity === 2) this.reaction |= 0x8000;
        } else {
          this.mashButton(pressed);
          if (this.collision.flags & 16) {
            this.sounds.push(0x29);
            this.change(4, this.reaction & 0x8000 ? 9 : 8);
          }
        }
        descriptor = this.reaction & 0x8000 ? data.bounceSevere : data.bounce;
      } else if (reaction === 6 || reaction === 7) {
        descriptor = reaction === 6 ? data.fall : data.fallBack;
        if (!initialized) {
          this.profile(0x15);
          this.nudgeX(0x50);
          this.initializeMash();
        } else {
          this.mashButton(pressed);
          if (this.clock.index === 0 && (this.collision.flags & 16)) {
            this.sounds.push(0x29);
            this.movementMode = 0;
            this.clock.remaining = 0;
          } else if (this.clock.index === 0xfe) this.change(4, reaction === 6 ? 8 : 9);
        }
      } else if (reaction === 8 || reaction === 9) {
        descriptor = reaction === 8 ? data.down : data.downBack;
        if (!initialized) {
          this.movementMode = 0;
          this.flags33 &= ~0x58;
          this.comboReset = true;
          if (!this.recoveryTimer) {
            this.recoveryTimer = (this.flags56 & 128) && (this.flags33 & 0x24) ? 48
              : this.severity === 2 ? 224 : this.severity === 1 ? 128 : 48;
          }
          if (reaction === 8) this.nudgeX(0x50);
          else {
            const correction = this.collisionAt(0x30, 0xffe8);
            this.xFixed = addPositionWord(this.xFixed, correction.x);
            this.yFixed = addPositionWord(this.yFixed, correction.y);
          }
        } else if (this.flags32 & 16) {
          this.change(7);
          this.reaction &= 0x7fff;
        } else if (!pinned && !(linkedFlags34 & 16)) {
          this.mashButton(pressed);
          if (!this.recoveryTimer || !--this.recoveryTimer) {
            this.change(7);
            this.reaction &= 0x7fff;
          }
        }
      } else if (reaction === 16 || reaction === 18) {
        descriptor = data.captureWait;
        this.clock.pose = 0xffff;
        this.clock.remaining = 0xff00;
        this.clock.flags |= 0x8000;
        if (!initialized) this.captureTimer = 32;
        this.captureTimer = u16(this.captureTimer - 1);
        if (!this.captureTimer) this.change(0);
      } else if (reaction === 29) {
        descriptor = data.grabbed;
        if (!initialized) {
          this.facing ^= 0x8000;
          this.linked = true;
          if (!this.attacker) throw new Error('Running grab requires its linked attacker');
          const attacker = this.attacker.owner ? worldPosition(this.attacker.owner) : this.attacker;
          for (const [field, offset] of [['xFixed', 0], ['yFixed', -1], ['zFixed', 0]]) {
            this[field] = addPositionWord(this[field], (attacker[field] >>> 16) - (this[field] >>> 16) + offset);
          }
          this.movementMode = 0;
        } else if (this.clock.index === 0xfe) {
          const wasRunning = this.previousState === 2;
          this.change(4, wasRunning ? 27 : 2);
          this.facing ^= 0x8000;
          this.xFixed = addPositionWord(this.xFixed, this.facing & 0x8000 ? -8 : 8);
          this.yFixed = addPositionWord(this.yFixed, -1);
          this.zFixed = addPositionWord(this.zFixed, wasRunning ? 64 : 16);
          if (!wasRunning) this.clock.pose = this.facing ^ 17;
          this.linked = false;
        }
      } else if (reaction === 24) {
        descriptor = data.bump;
        if (!initialized) { this.movementMode = 0; this.comboTimerStart = 64; }
        else if (this.clock.index === 0xfe) this.change(0);
      } else if (reaction === 23 || reaction === 25 || reaction === 27) {
        descriptor = reaction === 23 ? data.ropeStagger : reaction === 25 ? data.released : data.runReleased;
        if (!initialized) {
          if (reaction === 23) {
            this.flags33 &= ~16;
            this.profile(13);
          } else if (reaction === 25) {
            this.profile(this.flags34 & 8 ? 36 : 19);
            this.flags34 &= ~8;
          } else {
            this.profile(20);
            const y = this.yFixed >>> 16;
            if (u16(y + 32) >= 0x198) this.velocityY = 0xffd0;
            else if (u16(y - 32) < 0x118) this.velocityY = 0x30;
          }
        } else if (this.collision.flags & 16) {
          this.sounds.push(0x29);
          this.change(4, 5);
          if (reaction === 27) { this.reaction = 5; this.paddingZ = 0; }
          this.clock.pose = this.facing ^ (reaction === 25 && this.severity !== 2 ? 20 : 31);
          if (reaction === 25 || reaction === 27) {
            const distance = reaction === 25 ? -64 : -56;
            this.xFixed = addPositionWord(this.xFixed, this.facing & 0x8000 ? -distance : distance);
          }
        }
        if (reaction === 27 && initialized && !(this.collision.flags & 16)) this.paddingZ = 0xfff0;
      } else throw new RangeError(`Untranslated knockdown reaction ${reaction}`);
    }
    this.clock.step(descriptor, this.facing);
    stepMovement(this);
    this.done = this.state === 0;
    return this;
  }
}
