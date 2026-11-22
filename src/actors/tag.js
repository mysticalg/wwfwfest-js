import {tagTables} from '../data/tag-tables.js';
import {actorTables} from '../data/actor-tables.js';
import {healthSeverity} from './projection.js';
import {addPositionWord} from './ring-collision.js';
import {aimAtParticipant} from './pin.js';

const u16=value=>value&65535;
const side=actor=>actor.flags33&128?1:0;
const low=(actor,key,value)=>{actor[key]=(actor[key]&0xff00)|(value&255);};
const position=(actor,x,y,z)=>{
 actor.xFixed=addPositionWord(actor.xFixed,x-(actor.xFixed>>>16));
 actor.yFixed=addPositionWord(actor.yFixed,y-(actor.yFixed>>>16));
 if(z!==undefined)actor.zFixed=addPositionWord(actor.zFixed,z-(actor.zFixed>>>16));
};
const activePointer=(world,actor)=>{world[side(actor)?'activeB':'activeA']=actor;};

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

export const isTagAction=action=>[77,78,79,102].includes(action&255);
export const isCornerAttack=action=>[13,27].includes(action&255);

export function stepTagAction(actor,peer,initialized){
 const action=actor.action&255,at=index=>actor.clock.index===index&&!actor.clock.remaining;
 let descriptor=tagTables.actions[action];
 if(action===102){ // $0188ee
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
