import {actorTables} from '../data/actor-tables.js';
import {addPositionWord,insideRingCollision,outsideRingCollision} from './ring-collision.js';
import {ActorAnimation} from './animation.js';
import {stepMovement,walkSpeed} from './movement.js';
import {projectionSnapshot} from './projection.js';
import {isGrappleThrow,stepGrappleThrow} from './grapple-throws.js';
import {isGrappleCounter,stepGrappleCounter} from './grapple-counters.js';
import {isGrappleSubmission,stepGrappleSubmission} from './grapple-submissions.js';

const u16 = value => value & 65535;

// $0104de dispatches four original probability gates used by move/counter
// handlers. Entropy stays explicit until the complete original RNG is ported.
export function grappleContest({kind,actorAI=false,targetAI=false,mode=0,round=0,
  severity=0,counter=0,randomNibble}) {
  if(kind===1&&actorAI)return true;
  if(!Number.isInteger(randomNibble))throw new RangeError('Grapple contest requires original RNG entropy');
  const data=actorTables.grappleContestTables,nibble=randomNibble&15;
  let threshold;
  if(kind===0)threshold=(targetAI?data.kind0AI:data.kind0Human)[(targetAI?round*3:0)+severity];
  else if(kind===1){
    const table=!targetAI?data.kind1Human:mode&1?data.kind1Rumble:data.kind1AI;
    threshold=table[(targetAI&&!(mode&1)?round*5:0)+Math.min(counter&255,4)];
  }else if(kind===2)threshold=(targetAI?data.kind2AI:data.kind2Human)[severity];
  else if(kind===3)threshold=data.kind3[severity];
  if(threshold===undefined)throw new RangeError('Unsupported grapple contest table index');
  return kind===0?nibble<threshold:nibble<=threshold;
}

// $01fab4 classifies arena regions used by the facing-dependent move remap.
// This is a position bucket, not the player's joystick direction.
export function grappleRegion({x,y,flags32=0,flags33=0,region=0}) {
  const start=flags33&4?12:flags32&1?16:0;
  for(let index=start;index<18;index++){
    const [maximumX,minimumY,next]=actorTables.grappleRegionRules[index];
    if(u16(x)<maximumX&&u16(y)>=minimumY)return next;
  }
  return region;
}

// $00d414 followed by the common table lookup and $00da6e remap.
export function headlockMove(type,severity,toggle,pressed,{facing=0,region=0}={}) {
  const mask=1<<(severity&7),alternate=toggle&mask;
  const row=actorTables.grappleFollowRows[severity*24+(alternate?12:0)+type];
  let action=actorTables.standingMoveTables[type][row*3+(pressed&3)-1];
  const side=actorTables.grappleRegionSides[region];
  if(side!==255){
    for(const [required,from,to]of actorTables.grappleMoveRemaps[type]){
      if(action===from){
        if(required===(side^Boolean(facing&0x8000)))action=to;
        break;
      }
    }
  }
  return {action,toggle:toggle^mask};
}

// $00ea28. State is the original state word, including its initialized bit.
export function canGrapple(actor, mode = 0) {
  if ((actor.flags74 & 128) || actor.forced || (actor.flags32 & 0x11)
    || (actor.flagsB7 & 128) || !(actor.state & 0x8000)
    || ((mode & 2) && !(actor.flags33 & 4)) || actor.auxiliary) return false;
  const state = actor.state & 255;
  return state === 0 || state === 1
    || (state === 4 && [0,1].includes(actor.reaction & 255))
    || (state === 5 && (actor.action & 255) === 114);
}

// $00e7b4/$00e824. The caller supplies the original RNG's low nibble when the
// human-versus-AI branch needs entropy. The source RNG has additional machine
// register inputs; keeping entropy explicit avoids inventing verified parity.
export function startGrapple(actor, target, {mode = 0, inGame = true,
  phase = 0, round = 0, randomNibble} = {}) {
  if (!canGrapple(actor, mode) || !canGrapple(target, mode)
    || (actor.facing >>> 8) === (target.facing >>> 8)
    || ((actor.flags33 ^ target.flags33) & 4)
    || Math.abs((actor.xFixed >>> 16) - (target.xFixed >>> 16)) >= 72
    || Math.abs((actor.yFixed >>> 16) - (target.yFixed >>> 16)) >= 16) return null;

  let winner = null;
  if (!inGame) winner = actor.health >= target.health ? actor : target;
  else {
    for (const body of [actor, target]) {
      body.comboCount = 0;
      body.flags34 &= ~0xc4;
      if (body.flags33 & 2) body.flags56 &= ~64;
    }
    const actorAI = actor.flags56 & 128, targetAI = target.flags56 & 128;
    if (!actorAI && (actor.flags33 & 32)) winner = actor;
    else if (!targetAI && (target.flags33 & 32)) winner = target;
    else if (actorAI && (actor.flags33 & 32)) winner = actor;
    else if (targetAI && (target.flags33 & 32)) winner = target;
    else if ((actor.state & 255) === 4 && (actor.reaction & 255) === 1) winner = target;
    else if ((target.state & 255) === 4 && (target.reaction & 255) === 1) winner = actor;
    else if (!actorAI && targetAI) {
      const weights = mode & 1 ? actorTables.grappleRumbleWeights : actorTables.grappleWeights;
      const offset = (mode & 1 ? 0 : round * 4) + actor.grappleIndex;
      if (weights[offset] === undefined || !Number.isInteger(randomNibble)) {
        throw new RangeError('Grapple arbitration requires a valid round, index and original RNG nibble');
      }
      const score = weights[offset] + (randomNibble & 15);
      if (score >= 20) winner = actor;
      else if (score < 15) winner = target;
    } else {
      const selection = (phase >>> 1) & 7;
      if (selection >= 5) winner = actor;
      else if (selection < 2) winner = target;
    }
  }

  if (!winner) {
    actor.state = target.state = 11;
    actor.holdFlags = 0x2000;
    target.holdFlags = 0x8000;
  } else {
    const loser = winner === actor ? target : actor;
    winner.state = 12;
    winner.controlCounter = 0;
    winner.holdFlags = 0x2000;
    loser.state = 255;
    loser.holdFlags = 0;
  }
  const centerX = u16((actor.xFixed >>> 16) + (target.xFixed >>> 16)) >>> 1;
  const centerY = u16((actor.yFixed >>> 16) + (target.yFixed >>> 16)) >>> 1;
  for (const [body, other] of [[actor,target], [target,actor]]) {
    body.xFixed = addPositionWord(body.xFixed, centerX - (body.xFixed >>> 16));
    body.yFixed = addPositionWord(body.yFixed, centerY - (body.yFixed >>> 16));
    body.grappleIndex = u16(body.grappleIndex + 1);
    if (body.grappleIndex >= 4) body.grappleIndex = 0;
    body.auxiliary = body.opponent = other;
    body.flags33 |= 64;
  }
  return winner === actor ? 'actor' : winner === target ? 'target' : 'contested';
}

// Linked standing-state kernels. State changes remain pending until that actor's
// next dispatcher call, including changes made by its peer later in the frame.
export class GrappleActor {
  constructor(initial = {}) {
    Object.assign(this,{type:0,state:11,action:0,reaction:0,previousState:0,
      xFixed:0,yFixed:0,zFixed:0x1400000,facing:0,movementMode:0,speed:0,direction:0,
      flags32:0,flags33:0,flags34:0,flags35:0,flags56:0,flags74:0,flagsB7:0,forced:0,
      holdFlags:0,timer:0,controlCounter:0,inputBlockA:0,inputBlockB:0,comboCount:0,comboTimer:0,pendingDamage:0,
      hitCounter:0,contact:0,health:100,maximumHealth:100,severity:0,moveToggle:0,region:0,offsetX:0,offsetY:0,
      paddingX:0,paddingY:0,paddingZ:0,velocityX:0,velocityY:0,
      velocityZ:0,gravity:0,auxiliary:null,unlinkMarked:false,sceneRefresh:0,
      attempts:{},partner:null,motionLink:null,eliminations:0,mash:0,supportTimer:0,targetX:0,targetY:0,
      assistanceTarget:null,active:true,healthAccumulator:0,resultPose:0,pressedButtons:0,
      world:{mode:0,round:0,inGame:true,message:0,shake:0,scene:0,rope:[0,0,0,0]},entropy:null},initial);
    this.pendingState=!(this.state&0x8000);
    this.state&=255;
    this.clock=new ActorAnimation(initial.clock||{pose:initial.pose||0});
    this.collision={kind:0,flags:0,x:0,y:0,z:0};
    this.sounds=[];
  }

  get pendingTransition() {
    return ![11,12,255].includes(this.state)
      && !(this.state===4&&this.reaction===1)
      && !(this.state===5&&([21,22,23,41,80,123,124].includes(this.action&255)||isGrappleThrow(this.action)||isGrappleCounter(this.action)||isGrappleSubmission(this.action)));
  }

  // The byte tested at $b7 is the low half of the input-block word at $b6.
  get inputBlockB() { return ((this.flagsB6||0)<<8)|(this.flagsB7&255); }
  set inputBlockB(value) { this.flagsB6=value>>>8&255;this.flagsB7=value&255; }

  change(state,action=this.action) {
    this.state=state;this.action=action;this.pendingState=true;
  }

  input({pressed=0,mask=0}={}) {
    this.pressedButtons=pressed;
    const peer=this.auxiliary;
    if (!this.pendingState&&!this.forced&&peer) {
      if (pressed&&this.state===11&&!(this.holdFlags&0x6000)) {
        peer.holdFlags|=0x4000;this.change(5,41);
      } else if (pressed&&this.state===12&&(this.holdFlags&255)===1) {
        this.holdFlags=0;this.change(5,pressed===2?23:21);
      } else if (pressed&&this.state===5&&[21,22].includes(this.action&255)) {
        this.holdFlags=this.timer=0;
        const choice=headlockMove(this.type,peer.severity,this.moveToggle,pressed,this);
        this.moveToggle=choice.toggle;this.change(5,choice.action);
      } else if (!pressed&&!(this.flags32&1)&&!(this.flags34&2)&&this.state===5) {
        if ((this.action&255)===21&&mask) this.change(5,22);
        else if ((this.action&255)===22&&!mask) {
          this.change(5,21);this.holdFlags=1;this.direction=0;
        }
      }
    }
    // $00e6a2 updates the carry direction even on its uninitialized entry frame.
    if (this.state===5&&(this.action&255)===22) this.direction=actorTables.inputDirections[mask&15];
    return this;
  }

  nudge(paddingX) {
    const previous={kind:this.collision.kind,flags:this.collision.flags};
    this.paddingX=u16(paddingX);
    const correction=this.collisionAt();this.paddingX=0;
    // $00fda2 retains the pre-probe collision word but uses the probe corrections.
    if (correction.flags&3) this.velocityX=0;
    this.xFixed=addPositionWord(this.xFixed,correction.x);
    this.collision={...correction,...previous};
  }

  collisionAt() {
    const result=(this.flags33&4?outsideRingCollision:insideRingCollision)({x:this.xFixed>>>16,y:this.yFixed>>>16,z:this.zFixed>>>16,
      facing:this.facing,flags32:this.flags32,paddingX:this.paddingX,paddingY:this.paddingY,paddingZ:this.paddingZ,
      kind:this.collision.kind,flags:this.collision.flags});
    if(!(this.flags32&32)&&(this.facing&0x8000))this.paddingX=u16(-this.paddingX);
    return result;
  }

  probe(paddingX) {
    this.paddingX=u16(paddingX);this.collision=this.collisionAt();this.paddingX=0;return this.collision;
  }

  ropeImpact() {
    const flags=this.collision.flags;
    if(flags&3){const index=flags&2?0:2;this.world.rope[index]=this.world.rope[index+1]=1;}
  }

  placePeer(peer,x=0,y=0,z=0) {
    for(const[key,delta]of [['xFixed',this.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]]) {
      peer[key]=addPositionWord(peer[key],(this[key]>>>16)-(peer[key]>>>16)+delta);
    }
  }

  copyPeerPosition(peer,includeHeight=false) {
    for(const key of includeHeight?['xFixed','yFixed','zFixed']:['xFixed','yFixed']) {
      peer[key]=addPositionWord(peer[key],(this[key]>>>16)-(peer[key]>>>16));
    }
  }

  breakHold() {
    this.change(5,80);
  }

  profile(index) {
    [this.velocityX,this.velocityZ,this.gravity]=actorTables.motionProfiles[index];
    this.velocityY=0;if(this.facing&0x8000)this.velocityX=u16(-this.velocityX);this.movementMode=2;
  }

  attempt(offset) {
    const prior=this.attempts[offset]||0;this.attempts[offset]=u16(prior+1);return prior;
  }

  random(kind) {
    if(typeof this.entropy!=='function')throw new Error(`Original entropy required for ${kind}`);
    return this.entropy(kind,this);
  }

  contest(kind,counter=0) {
    const actorAI=Boolean(this.flags56&128),targetAI=Boolean(this.auxiliary?.flags56&128);
    return grappleContest({kind,counter,actorAI,targetAI,severity:this.severity,...this.world,
      randomNibble:kind===1&&actorAI?undefined:this.random('contest')});
  }

  announce(id) { this.world.message=((this.type&255)<<8)|(id&255); }
  landingSound() { this.sounds.push(this.flags33&4?45:41); }

  requestPin() {
    if(this.world.inGame&&!(this.flags33&2)&&(this.random('pin')&255)<actorTables.automaticPinThresholds[this.type])this.flags34|=16;
  }

  partnerSupport(peer) {
    const partner=peer.partner;
    if(!(this.world.mode&1)&&partner&&(partner.state&255)===1&&(partner.walkMode&255)===1)partner.flags34|=32;
  }

  step() {
    this.sounds=[];
    this.ropeEvents=[];
    if(this.pendingTransition)return this;
    if(this.pendingState){
      this.previousState=this.clock.flags;
      this.clock.flags=this.state;
      this.pendingState=false;
    }
    this.collision={...this.collision,kind:0,flags:0};
    if(this.movementMode){
      this.collision=this.collisionAt();
      for(const[key,delta]of [['xFixed','x'],['yFixed','y'],['zFixed','z']])this[key]=addPositionWord(this[key],this.collision[delta]);
    }
    const data=actorTables.grappleAnimations,peer=this.auxiliary;
    const initialized=Boolean(this.clock.flags&0x8000);
    let descriptor;
    if(this.state===11||this.state===12){
      const controlled=this.state===12;
      descriptor=controlled?data.control:data.contested;
      if(!initialized){
        this.movementMode=0;this.nudge(24);if(controlled)this.nudge(-24);
        this.flags33|=64;if(peer)peer.flags33|=64;
        if(controlled){this.timer=224;this.holdFlags&=0xff00;this.controlCounter=0;}
      }
      if(this.forced&0x8000)this.breakHold();
      else if(!controlled&&(this.holdFlags&0x8000)){
        this.clock.pose=0xffff;descriptor=data.hidden;
      }else{
        if(controlled){
          this.timer=u16(this.timer-1);
          if(this.timer===160)this.holdFlags=(this.holdFlags&0xff00)|1;
          else if(this.timer===0){
            this.change(255);peer.change(12);this.controlCounter=0;peer.holdFlags=0;
            peer.clock.pose=57^peer.facing;
            // $0117cc explicitly projects an already updated peer again.
            peer.projection=projectionSnapshot(peer);this.clock.pose=0xffff;
          }
        }
        if(this.timer!==0||!controlled){
          if(this.holdFlags&0x2000){descriptor=data.entry;if(this.clock.index===0xfe)this.holdFlags&=~0x2000;}
        }
      }
    }else if(this.state===255){
      descriptor=data.hidden;this.movementMode=0;this.clock.pose=0xffff;
      if(!peer||peer.auxiliary!==this){
        this.change(0);this.auxiliary=null;this.unlinkMarked=false;
        this.flags32=0;this.flags33&=0x87;this.flags34&=3;this.flags35=0;
        this.inputBlockA=this.inputBlockB=0;
      }
    }else if(this.state===4){
      descriptor=data.stagger;
      if(!initialized){
        this.movementMode=0;this.timer=128;
        if(!this.comboCount){this.comboCount=4;this.comboTimer=64;}
      }else{
        if(!this.forced&&peer&&(peer.unlinkMarked||peer.auxiliary!==this)){this.auxiliary=null;this.unlinkMarked=false;}
        this.contact=1;this.timer=u16(this.timer-1);
        if(!this.timer){this.change(0);this.sceneRefresh=1;this.world.controlsRefresh=1;}
      }
    }else{
      const action=this.action&255;
      descriptor=data[({21:'hold',22:'carry',23:'whip',41:'clinchStrike',80:'break',123:'held',124:'escape'})[action]];
      if(isGrappleCounter(action))descriptor=stepGrappleCounter(this,peer,initialized);
      else if(isGrappleSubmission(action))descriptor=stepGrappleSubmission(this,peer,initialized);
      else if(isGrappleThrow(action))descriptor=stepGrappleThrow(this,peer,initialized);
      else if(action===41){
        if(!initialized){
          this.movementMode=0;this.holdFlags&=~0x8000;peer.holdFlags|=0x8000;peer.change(255);
        }else{
          if(this.clock.index===1&&!this.clock.remaining)this.sounds.push(42);
          if(this.clock.index===0xfe){
            peer.pendingDamage=1;peer.hitCounter=(peer.hitCounter+1)&255;
            peer.comboTimer=256;peer.comboCount=u16(peer.comboCount+1);
            if(peer.comboCount<2){this.change(11);peer.change(11);this.holdFlags=0;peer.holdFlags=0x8000;}
            else{this.change(12);this.holdFlags=0x2000;peer.change(255);peer.holdFlags=0;}
          }
        }
      }else if(action===21){
        if(!initialized){
          this.movementMode=0;
          if(this.holdFlags===1){this.clock.flags|=0x8000;this.clock.index=0;this.clock.remaining=0;}
          else if((this.previousState&255)===12)this.xFixed=addPositionWord(this.xFixed,this.facing&0x8000?-32:32);
          if(this.holdFlags!==3)peer.change(5,123);
        }else{
          this.copyPeerPosition(peer);peer.facing=(peer.facing&255)|((this.facing^0x8000)&0xff00);
          if(this.forced&0x8000)this.breakHold();
          else if(this.clock.index===0xfe){this.clock.index=0;this.clock.remaining=0;peer.pendingDamage=1;}
        }
      }else if(action===22){
        if(!initialized){
          this.movementMode=1;const speed=walkSpeed(this.type,this.flags32,this.flags33,this.flags56,this.flags74);
          this.speed=(speed&0xff00)|((speed&255)>>>1);
        }else if(this.forced)this.breakHold();
        else{
          if(this.direction!==0&&this.direction!==128){
            this.facing=(this.facing&255)|((this.direction&128)<<8);
            peer.facing=(peer.facing&255)|((this.facing^0x8000)&0xff00);
          }
          this.nudge(-40);this.copyPeerPosition(peer,true);
          this.clock.pose=(this.clock.pose&0x7fff)|(this.facing&0x8000);
        }
      }else if(action===23){
        if(!initialized){this.movementMode=0;peer.change(255);this.nudge(-24);this.copyPeerPosition(peer);}
        else if(this.clock.index===1&&!this.clock.remaining){
          peer.change(2);peer.unlinkMarked=true;this.flags34|=128;peer.flags34|=64;
          this.flags33&=~64;peer.flags33&=~64;peer.holdFlags=2;
          peer.facing=this.facing^0x8000;peer.direction=peer.facing&0x8000?64:192;
          this.placePeer(peer,80,-2,0);
        }else if(this.clock.index===0xfe){this.change(0);this.facing^=0x8000;this.unlinkMarked=true;}
      }else if(action===80){
        this.change(0);this.clock.pose=this.facing;peer.change(4);peer.reaction=1;peer.clock.pose=22^peer.facing;
        this.xFixed=addPositionWord(this.xFixed,this.facing&0x8000?-32:32);
        peer.xFixed=addPositionWord(peer.xFixed,this.facing&0x8000?32:-32);
        this.unlinkMarked=peer.unlinkMarked=true;this.flags33&=~64;peer.flags33&=~64;
      }else if(action===123){
        this.clock.flags|=0x8000;
        if(!initialized){
          this.clock.pose=0xffff;if(peer.flags33&32)this.action|=0x8000;
          if(this.holdFlags===1||(this.previousState&255)!==5)this.holdFlags=peer.flags56&128?187:128;
        }else if(!(this.holdFlags=u16(this.holdFlags-1))){this.change(5,124);peer.change(255);}
      }else if(action===124){
        if(!initialized){this.movementMode=peer.movementMode=0;this.facing^=0x8000;peer.change(255);peer.clock.pose=0xffff;}
        else if(this.clock.index===0xfe){
          this.change(5,23);peer.change(255);this.facing^=0x8000;
          this.xFixed=addPositionWord(this.xFixed,this.facing&0x8000?-32:32);
        }
      }
    }
    this.clock.step(descriptor,this.facing);
    if(this.offsetX&0x8000)this.offsetX=this.offsetY=0;
    this.projection=projectionSnapshot(this);stepMovement(this);
    return this;
  }
}

// The original late auxiliary-pointer cleanup preserves invisible/forced links.
export function cleanupGrappleLinks(actors) {
  for(const actor of actors)if(actor.unlinkMarked&&(actor.clock.pose&0x7fff)!==0x7fff&&!actor.forced){
    actor.auxiliary=null;actor.unlinkMarked=false;
  }
}
