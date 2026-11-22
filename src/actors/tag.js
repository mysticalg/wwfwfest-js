import {tagTables} from '../data/tag-tables.js';
import {actorTables} from '../data/actor-tables.js';
import {healthSeverity} from './projection.js';
import {addPositionWord} from './ring-collision.js';
import {aimAtParticipant} from './pin.js';
import {computerWeightedChoice} from './probability.js';
import {selectRumbleAssistant,initializeMash,mashHeldInput} from './grapple-services.js';
import {expireTagAssistance} from './tag-states.js';

const u16=value=>value&65535;
const side=actor=>actor.flags33&128?1:0;
const low=(actor,key,value)=>{actor[key]=(actor[key]&0xff00)|(value&255);};
const position=(actor,x,y,z)=>{
 actor.xFixed=addPositionWord(actor.xFixed,x-(actor.xFixed>>>16));
 actor.yFixed=addPositionWord(actor.yFixed,y-(actor.yFixed>>>16));
 if(z!==undefined)actor.zFixed=addPositionWord(actor.zFixed,z-(actor.zFixed>>>16));
};
const activePointer=(world,actor)=>{world[side(actor)?'activeB':'activeA']=actor;};

// $00ef40 visits the first six physical records, including inactive slots.
export function advanceTagTimers(world){
 for(const a of world.actors.slice(0,6)){
  if(a.flags33&32){
   if(a.apronTimer)a.apronTimer=u16(a.apronTimer-1);
   if(a.apronTimer)continue;
   a.apronTimer=a.flagsC6=a.hitCounter=0;a.flags33&=~32;
  }else if(!(a.flags56&128)){
   if(!(a.flags32&1))a.apronTimer=0;
   else if((a.apronTimer||0)>tagTables.benchThresholds[a.flags57??a.type]){a.flagsC6=(a.flagsC6||0)|64;a.apronTimer=937;}
  }else if((a.hitCounter||0)>tagTables.computerHitThresholds[a.flags57??a.type]){
   a.apronTimer=tagTables.boostTimers[world.round];a.flags33|=32;
  }
 }
}

// $00bcae updates the character-owned palette banks for active player slots.
export function refreshTeamPalettes(world){
 if(!world.inGame||(world.mode&1))return;
 world.paletteUpdates??={};
 for(const actor of (world.actors||[]).slice(0,4))if(actor.active){
  const type=(actor.flags57??actor.type)&15;
  world.paletteUpdates[8+type*4]=[...tagTables.playerPalettes[actor.flags33&1?0:1][type]];
 }
}

// $017afc. The physical records stay in place; controller ports and main-team
// flags move between them. CPU partners retain their separate AI flag.
export function exchangeTeamRoles(actor,partner=actor.partner){
 partner.severity=healthSeverity(partner.health,partner.maximumHealth,partner.severity);
 actor.flags33&=~1;partner.flags33|=1;actor.flags32|=1;partner.flags32&=~1;
 if(actor.flags56&128){partner.flags56&=~64;actor.flags56|=64;}
 else if(!(partner.flags33&2)){
  [actor.controlPort,partner.controlPort]=[partner.controlPort,actor.controlPort];
  actor.flags33&=~2;partner.flags33|=2;actor.flags56|=64;partner.flags56&=~64;
 }
 refreshTeamPalettes(actor.world);
}

// $020b9e. Assistance follows the outgoing participant, not the newly marked
// primary partner. The referee's active pointers are not controller pointers.
export function transferTagAssistance(actor,partner=actor.partner){
 actor.flags34|=partner.flags34&7;actor.supportTimer=partner.supportTimer;
 partner.flags34&=~7;partner.supportTimer=0;activePointer(actor.world,actor);
}

// $02064a, called by the incoming corner attack after its original landing.
export function beginTagAssistExit(actor){
 const holder=actor.partner,victimPartner=holder.auxiliary.partner,world=actor.world;
 activePointer(world,holder);holder.flags34|=1;
 activePointer(world,victimPartner);victimPartner.flags34|=1;
 victimPartner.supportTimer=tagTables.assistTimers[victimPartner.severity];
 if(!(holder.flags33&2)){holder.flags56|=64;holder.opponent=victimPartner;}
 actor.flags56&=~64;victimPartner.flags32|=4;victimPartner.flags56|=64;victimPartner.opponent=holder;
}

export const isTagAction=action=>[55,57,76,77,78,79,89,97,102,113,119].includes(action&255);
export const isCornerAttack=action=>[13,27].includes(action&255);

// $01e986: the special normal-tag hold is selected by the downed opponent's
// position/facing, rather than a random probability gate.
export function tagProneOpportunity(actor){
 const p=actor.opponent;if(!actor.world.inGame||p.state!==4||(p.reaction&255)!==8)return false;
 const x=p.xFixed>>>16,y=p.yFixed>>>16;
 return side(actor)?y<352&&(p.facing&0x8000?x>=720&&x<768:x>=664):
  y>=368&&(p.facing&0x8000?x<618:x>=504&&x<584);
}

// $0206e6. Returning false requests the incoming partner's corner mount.
export function beginManualTagAssistance(actor){
 const world=actor.world,p=actor.partner;if(!world.inGame)return true;
 if(world.mode&1){
  const candidate=selectRumbleAssistant(actor);
  if(candidate){candidate.assistanceTarget=actor.auxiliary;actor.assistanceTarget=candidate;}
  return true;
 }
 actor.flags56|=64;p.flags56&=~64;activePointer(world,actor);actor.flags34=(actor.flags34|1)&~2;
 actor.pendingState=true;actor.action=55;actor.inputBlockA&=~16;
 if(p.flags33&2)return true;
 const severity=actor.auxiliary?.severity??tagTables.manualNullSeverity;
 if(computerWeightedChoice(actor,tagTables.manualAssistWeights[p.flags57??p.type][severity])===0){
  p.holdFlags=side(p)?7:4;p.opponent=actor.opponent;p.change(8);return false;
 }
 p.inputBlockA|=128;p.assistanceTarget=actor.opponent;return true;
}

function beginProneVictimAssistance(actor){ // $020412
 const world=actor.world;if(!world.inGame)return;
 if(world.mode&1){const p=selectRumbleAssistant(actor);if(p){p.assistanceTarget=actor.auxiliary;actor.assistanceTarget=p;}return;}
 const p=actor.partner;p.supportTimer=tagTables.proneAssistTimers[p.severity];p.flags34=(p.flags34|5)&~2;
 if(actor.flags33&2)p.opponent=actor.auxiliary;
 else{p.inputBlockA|=128;p.assistanceTarget=actor.auxiliary;}
}

function finishProneVictimAssistance(actor){ // $0205cc
 const world=actor.world,peer=actor.auxiliary;
 if(world.mode&1){if(actor.assistanceTarget)actor.assistanceTarget.inputBlockA&=~128;return;}
 peer.flags34&=~1;if(peer.flags33&2)peer.flags56&=~64;
 if(!(peer.partner.flags33&2)){peer.partner.inputBlockA&=~128;world.controlsRefresh=(world.controlsRefresh||0)|1;}
 actor.partner.flags34&=~4;
 if(actor.partner.flags33&2)actor.partner.flags56&=~64;else actor.partner.inputBlockA&=~128;
}

export function stepTagAction(actor,peer,initialized){
 const action=actor.action&255,at=index=>actor.clock.index===index&&!actor.clock.remaining;
 let descriptor=tagTables.actions[action];
 if(action===113){ // $01915e, apron boost loops before resuming apron movement
  if(!initialized){actor.movementMode=0;actor.holdFlags=6;actor.clock.index=0;}
  else{
   if(expireTagAssistance(actor))return descriptor;
   if((actor.clock.index&255)===0xfe){
    actor.clock.flags&=~0x8000;actor.clock.index=0;actor.clock.remaining=8;
    const prior=actor.holdFlags;actor.holdFlags=u16(prior-1);
    if(prior===0){actor.change(1);actor.walkMode=1;actor.flagsC6=(actor.flagsC6||0)&~64;actor.flags33|=32;}
   }
  }
  if(!actor.clock.index&&!actor.clock.remaining)actor.world.rope[side(actor)?2:0]=4;
  const next=((actor.clock.index&255)+Number(!actor.clock.remaining))&255;actor.world.actorScratch1=next;
  (actor.world.effectRequests??=[]).push({actor,kind:next===0?13:14});
 }else if(action===119){ // $019394, interrupt/re-enter the near-prone tag hold
  if(!peer)throw new Error('Tag-hold interruption requires its paired holder');
  if(!initialized)peer.change(255);
  else if((actor.clock.index&255)===0xfe){actor.change(5,0x8061);peer.change(5,0x8037);}
 }else if(action===57){ // $016db0, apron strike and return to apron movement
  if(!initialized){actor.movementMode=0;return descriptor;}
  actor.contact=actor.clock.index===2?25:0;
  if((actor.clock.index&255)===0xfe){actor.change(1);actor.walkMode=1;actor.unlinkMarked=true;actor.clock.pose=actor.facing;return descriptor;}
  const next=((actor.clock.index&255)+Number(!actor.clock.remaining))&255;
  actor.world.actorScratch1=next;
  (actor.world.effectRequests??=[]).push({actor,kind:next===0||next===3?21:next===1?22:23});
 }else if(action===76){ // $0179ca
  const p=actor.partner;
  if(!initialized){
   actor.movementMode=0;position(actor,...tagTables.tagPositions[side(actor)],320);
   actor.facing=(actor.facing&255)|(actor.flags33&128)<<8;p.change(5,77);actor.flags32&=~8;
  }else{
   if((actor.clock.index&255)===1&&(actor.clock.remaining&255)<2){
    if(tagProneOpportunity(actor)){
     exchangeTeamRoles(actor,p);transferTagAssistance(actor,p);actor.flags32&=~1;
     actor.opponent.recoveryTimer=actor.opponent.mash=4096;
     if(beginManualTagAssistance(actor)){p.change(1);p.walkMode=2;p.flags32|=1;}
     return descriptor;
    }
    actor.drawMode=2;actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?32:-32);actor.world.message=(actor.type<<8)|24;
   }
   if(actor.clock.index===0xfe){
    transferTagAssistance(actor,p);exchangeTeamRoles(actor,p);actor.change(1);actor.walkMode=3;
    actor.unlinkMarked=true;actor.facing^=0x8000;actor.clock.pose=actor.facing;actor.drawMode=4;
    p.clock.remaining=0;actor.direction=0;actor.xFixed=addPositionWord(actor.xFixed,(p.xFixed>>>16)-(actor.xFixed>>>16));
   }
  }
 }else if(action===55){ // $016c98, hold the prone opponent for the partner
  if(!initialized){
   actor.movementMode=0;peer.change(5,97);
   if(!(actor.action&0x8000)){
    peer.copyPeerPosition(actor,true);actor.facing=(actor.facing&255)|(peer.facing&0xff00);
    actor.flags33|=64;peer.flags33|=64;
    const p=actor.partner;if(!(p.flags32&2)){p.change(5,78);if(actor.flagsC6&64){actor.flagsC6&=~64;actor.flags33|=32;}}
    return descriptor;
   }
   actor.clock.flags|=0x8000;actor.clock.index=actor.clock.remaining=0;
  }
  if(at(0))peer.action|=0x8000;
  if(actor.clock.index===0xfe)actor.clock.index=actor.clock.remaining=0;
 }else if(action===97){ // $018710
  actor.clock.flags|=0x8000;
  if(!initialized&&!(actor.action&0x8000)){initializeMash(actor,5);beginProneVictimAssistance(actor);actor.holdFlags=170;}
  else{
   mashHeldInput(actor,actor.pressedButtons||0);
   if(actor.action&0x8000){actor.clock.pose=0xffff;actor.holdFlags=u16(actor.holdFlags-1);if(!actor.holdFlags)actor.change(5,89);}
   else actor.clock.pose=18^(actor.facing&0xff00);
  }
 }else if(action===89){ // $0184b4, escape from the temporary prone hold
  if(!initialized){peer.change(255);actor.flags35&=~4;peer.flags35&=~2;}
  else{
   if(at(0)){
    peer.change(4);peer.reaction=2;peer.pendingDamage=3;peer.facing^=0x8000;actor.unlinkMarked=true;
    actor.flags33&=~64;peer.flags33&=~64;finishProneVictimAssistance(actor);actor.sounds.push(41);
   }
   if(actor.clock.index===0xfe){actor.change(7);actor.clock.pose=104^(actor.facing&0xff00);}
  }
 }else if(action===102){ // $0188ee
  if(!initialized){
   actor.movementMode=0;const[x,y]=tagTables.holdPositions[side(actor)];position(actor,x,y);position(peer,x,y);
   actor.facing=peer.facing=side(actor)?0:0x8000;peer.change(255);
   const partner=actor.partner;partner.flags34|=8;exchangeTeamRoles(actor,partner);transferTagAssistance(actor,partner);
   partner.change(5,77);partner.flags56|=64;actor.flags32&=~1;partner.opponent=peer;
  }else{
   if(!(actor.action&0x8000)&&actor.clock.index===0xfe){actor.action|=0x8000;actor.clock.flags|=0x8000;}
   if(actor.action&0x8000){
    descriptor=actorTables.grappleAnimations.hold;
    if(actor.clock.index===0xfe)actor.clock.index=actor.clock.remaining=0;
   }
  }
 }else if(action===77){ // $017b88
  if(!initialized){actor.movementMode=0;position(actor,...tagTables.entryPositions[side(actor)],320);actor.clock.index=0;}
  else{
   if(at(0))actor.sounds.push(48);
   if(actor.flags34&8){
    if(at(1)){
     actor.clock.remaining=2;actor.drawMode=4;actor.walkMode=0;actor.facing^=0x8000;
     actor.change(8);actor.holdFlags=side(actor)?7:4;
    }
    return descriptor;
   }
   if(at(2))actor.drawMode=2;
   if(actor.clock.index===0xfe){
    actor.flagsC6=(actor.flagsC6||0)&~64;actor.clock.pose=actor.facing;actor.walkMode=0;
    position(actor,...tagTables.tagPositions[side(actor)]);
    const special=actor.flags34&8;actor.flags34&=~8;
    if(special)actor.change(5);
    else{actor.change(0);actor.flags32&=~8;actor.drawMode=0;actor.world.controlsRefresh=1;}
    return descriptor;
   }
  }
  // $ff7a's two short-lived visual requests are retained for the effects layer.
  if(actor.clock.index===0||actor.clock.index===1)(actor.world.effectRequests??=[]).push({actor,kind:actor.clock.index===0?19:20});
 }else if(action===78){ // $017ce0
  if(!initialized){actor.movementMode=0;actor.severity=healthSeverity(actor.health,actor.maximumHealth,actor.severity);actor.drawMode=2;}
  else if(actor.clock.index===0xfe){
   actor.change(0);actor.flagsC6=(actor.flagsC6||0)&~64;actor.flags34&=~16;actor.walkMode=0;
   actor.clock.pose=actor.facing;actor.drawMode=0;actor.flags32&=~1;
   actor.xFixed=addPositionWord(actor.xFixed,side(actor)?-56:56);
  }
 }else if(action===79){ // $017d4e
  if(!initialized){actor.movementMode=0;actor.drawMode=2;actor.facing=(actor.flags33&128)<<8;}
  else if(actor.flags34&1){actor.change(0);actor.world.switchTimer=250;actor.drawMode=0;}
  else if(actor.clock.index===0xfe){
   actor.change(1);actor.walkMode=1;actor.facing^=0x8000;actor.clock.pose=actor.facing;
   actor.flags34&=~2;actor.drawMode=4;actor.xFixed=addPositionWord(actor.xFixed,side(actor)?56:-56);
  }
 }
 return descriptor;
}

// $0145fc, shared by actions 13 and 27. The tag branch acts on the victim
// directly on landing; it is not replaced by an ordinary contact response.
export function stepCornerAttack(actor,peer,initialized){
 const action=actor.action&255;
 if(!initialized){
  actor.movementMode=0;actor.world.cornerOccupancy=0;actor.flags32&=~2;actor.velocityZ=0x680;actor.gravity=0x48;
  actor.holdFlags=actor.flags34&8?0:peer.state===5&&(peer.action&255)===83?1:2;
  if((actor.holdFlags&255)===2){actor.facing=0;if((actor.xFixed>>>16)<(peer.xFixed>>>16))actor.facing|=0x8000;}
  let offset=actor.holdFlags&255?16:-16;if(actor.facing&0x8000)offset=-offset;
  peer.xFixed=addPositionWord(peer.xFixed,offset);aimAtParticipant(actor,peer,0);peer.xFixed=addPositionWord(peer.xFixed,-offset);
 }else{
  if(actor.clock.index===0&&!actor.clock.remaining)actor.movementMode=2;
  if(actor.clock.index===3){
   actor.paddingZ=0xfff0;
   if(!(actor.collision.flags&16))return tagTables.actions[action];
   actor.sounds.push(actor.flags33&4?45:41);actor.clock.remaining=0;actor.movementMode=0;actor.paddingZ=0;
   if(actor.holdFlags===0){
    actor.flags34&=~8;peer.change(4);peer.reaction=28;peer.pendingDamage=18;actor.world.message=0x0f19;
    actor.sounds.push(43,50);beginTagAssistExit(actor);
   }else if(actor.holdFlags===1){
    if(peer.state===5&&(peer.action&255)===83&&Math.abs((actor.xFixed>>>16)-(peer.xFixed>>>16))<24&&Math.abs((actor.yFixed>>>16)-(peer.yFixed>>>16))<20){
     peer.change(4);peer.reaction=3;peer.auxiliary.change(5,111);actor.flags33&=~64;peer.flags33&=~64;peer.pendingDamage=18;
    }
   }else if(!(peer.flags32&1)&&(!(actor.world.mode&2)||(peer.flags33&4))
     &&([0,1].includes(peer.state)||(peer.state===4&&(peer.reaction&255)===1))
     &&Math.abs((peer.xFixed>>>16)-(actor.xFixed>>>16))<48&&Math.abs((peer.yFixed>>>16)-(actor.yFixed>>>16))<48){
    actor.sounds.push(43,50);peer.change(4);peer.reaction=32;
    peer.facing=(peer.facing&255)|((actor.facing^0x8000)&0xff00);peer.pendingDamage=18;peer.hitCounter=((peer.hitCounter||0)+1)&255;
    if(peer.flags74&128){peer.flags74=peer.flags75=0;if(peer.heldObject)peer.heldObject.state=2;peer.heldObject=null;}
    peer.offsetX|=0x8000;actor.world.message=((actor.type&255)<<8)|(action===27?15:14);
    return tagTables.actions[action];
   }
  }
  if(actor.clock.index===0xfe){actor.change(0);actor.clock.pose=actor.facing;actor.resultPose=0;actor.unlinkMarked=true;}
 }
 return tagTables.actions[action];
}
