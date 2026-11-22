import {ActorAnimation} from './animation.js';
import {actorTables} from '../data/actor-tables.js';

export const isStandingAction=action=>[0,114].includes(action&255);

// Shared-record form of $011ac8/$01921a. The actor dispatcher owns collision,
// clock advancement, projection and the delayed initialization of the next state.
export function stepStandingAction(actor,initialized){
  const punch=(actor.action&255)===0;
  let descriptor=actorTables.standingAttacks[punch?0:1];
  if(!initialized){
    actor.movementMode=0;if(punch)actor.nudge(-24);
  }else{
    actor.contact=punch?(actor.clock.index===3?7:33):(actor.clock.index===2?17:1);
    if(actor.clock.index===0xfe){actor.change(0);actor.unlinkMarked=true;}
  }
  if(punch&&(actor.flags56&128)&&(actor.flags33&32))descriptor=actorTables.standingPunchAssist;
  return descriptor;
}

// Normal standing action 0 ($011ac8) and action $72 ($01921a). Entry nudges
// against ring boundaries are handled by the translated world collision path.
export class StandingAction {
  constructor(button, pose, contact = 1) {
    this.button = button;
    this.clock = new ActorAnimation({pose});
    this.contact = contact;
    this.previousPose = pose;
    this.hits = new Set();
    this.done = false;
  }

  step(facing) {
    if (this.clock.flags & 0x8000) {
      if (this.button === 0) this.contact = this.clock.index === 3 ? 7 : 33;
      else this.contact = this.clock.index === 2 ? 17 : 1;
      if (this.clock.index === 0xfe) this.done = true;
    }
    this.clock.step(actorTables.standingAttacks[this.button], facing);
    // $0232b6 runs after all animation updates and before contact dispatch.
    if (this.clock.pose !== this.previousPose) {
      this.contact = 0;
      this.hits.clear();
      this.previousPose = this.clock.pose;
    }
    return this;
  }
}

// Ordinary reactions 0 ($01a2d0) and $0a ($01a61e), before their combo-driven
// knockdown branches. Both increment the hit counter and start a 64-tick window.
export class StandingReaction {
  constructor(kind, pose) {
    this.kind = kind;
    this.clock = new ActorAnimation({pose});
    this.done = false;
  }

  step(facing) {
    if ((this.clock.flags & 0x8000) && this.clock.index === 0xfe) this.done = true;
    this.clock.step(actorTables.standingReactions[this.kind], facing);
    return this;
  }
}

// Standing contact responses $02362e/$023910 followed by secondary response 0
// at $023a78. Keep both original facing-map calls: unusual state combinations
// can pass through that mapping twice.
export function standingHitResponse(button, facing, target) {
  if (!button && (target.contact & 0x4000)) return {accepted: false, damage: 0, reaction: 0, sounds: []};
  let damage = button ? 2 : 1;
  let reaction = button ? 10 : 0;
  const mapFacing = () => {
    if (reaction < 36 && Boolean(facing & 0x8000) === Boolean(target.facing & 0x8000)) {
      reaction = actorTables.reactionFacingMap[reaction];
    }
  };
  if (!(target.contact & 0x8000)) {
    if ((target.flags33 & 16) || target.comboCount >= 3) reaction = 2;
    mapFacing();
    if (target.flags33 & 16) damage++;
  }
  mapFacing();
  return {accepted: true, damage, reaction, sounds: button ? [0x2b] : [0x2a, 0x32]};
}
