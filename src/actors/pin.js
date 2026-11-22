import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
import {initializeMash,mashHeldInput,clearPartnerMotion,beginAttackAssistance,beginVictimAssistance,finishAssistance} from './grapple-services.js';

const u16=value=>value&65535;
const low=(actor,key,value)=>{actor[key]=(actor[key]&0xff00)|(value&255);};
const face=(actor,value)=>{actor.facing=(actor.facing&255)|(value&0xff00);};
const move=(actor,x,y=0,z=0)=>{
 for(const[key,delta]of [['xFixed',actor.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])actor[key]=addPositionWord(actor[key],delta);
};
export const isPinAction=action=>Object.hasOwn(actorTables.pinAnimations,action&255);

// $00d2f8/$00d350 select the prone move row; action 72 then checks original
// $00db98 bounds kind 7. The lower edge is exclusive and upper edge inclusive.
export function canStartPin(actor,peer) {
 if(![0,1].includes(actor.state)||(actor.flags34&2)||actor.forced||peer.auxiliary||peer.state!==4
  ||![6,7,8,9].includes(peer.reaction&255))return false;
 let [left,right,bottom,top]=actorTables.moveBounds[7];
 if(peer.facing&0x8000)[left,right]=[-right,-left];
 const x=actor.xFixed>>>16,y=actor.yFixed>>>16,px=peer.xFixed>>>16,py=peer.yFixed>>>16;
 return x>u16(px+left)&&x<=u16(px+right)&&y>u16(py+bottom)&&y<=u16(py+top);
}

// $0026be. The source estimates airtime from the unsigned initial vertical
// velocity/gravity, then uses integer signed division and independent clamps.
export function aimAtParticipant(actor,peer,kind=1) {
 let [offsetX,offsetY]=actorTables.targetOffsets[kind];if(peer.facing&0x8000)offsetX=-offsetX;
 const frames=u16(Math.trunc(u16(actor.velocityZ)/u16(actor.gravity))*2);if(!frames)return;
 for(const[key,axis,offset,limit]of [['velocityX','xFixed',offsetX,512],['velocityY','yFixed',offsetY,192]]){
  const dividend=((peer[axis]>>>16)+offset-(actor[axis]>>>16))<<8,quotient=Math.trunc(dividend/(frames<<16>>16));
  // DIVS leaves the dividend word unchanged on quotient overflow.
  const velocity=quotient<-32768||quotient>32767?dividend<<16>>16:quotient;
  actor[key]=u16(Math.max(-limit,Math.min(limit,velocity)));
 }
}

// $0204a8: a late escape from count stage 4/5 requests the original message.
export function finishPinCount(actor) {
 if([4,5].includes(actor.pinStatus&255))actor.world.message=0x0f1e;
 actor.pinStatus=0;
 finishAssistance(actor);
}

export function stepPinAction(actor,peer,initialized) {
 const action=actor.action&255,data=actorTables.pinAnimations;
 let descriptor=data[action];
 if(action===72){ // $012534
  if(actor.action&0x8000)return actorTables.grappleAnimations.hidden;
  if(!initialized){
   actor.movementMode=0;actor.velocityZ=0x480;actor.gravity=0x48;aimAtParticipant(actor,peer,1);
   face(actor,(actor.velocityX&0x8000)^0x8000);
   if(!(peer.action&0x8000))peer.change(5,74);
  }else{
   if(!actor.clock.index&&!actor.clock.remaining)actor.movementMode=2;
   if((actor.clock.index&255)>=4){
    actor.paddingZ=0xffe0;
    if(actor.collision.flags&16){
     actor.paddingZ=0;
     if(peer.state===5&&(peer.action&255)===74&&!actor.unlinkMarked&&!peer.unlinkMarked&&peer.auxiliary===actor){
      actor.movementMode=0;actor.change(5,actor.action|0x8000);actor.flags35|=1;actor.flags33|=64;peer.flags33|=64;
      face(actor,peer.facing);peer.copyPeerPosition(actor,true);move(actor,64,-8,0);actor.clock.pose=0xffff;
      beginAttackAssistance(actor);beginVictimAssistance(peer);peer.change(5,peer.action|0x8000);
      descriptor=actorTables.grappleAnimations.hidden;
     }else{
      actor.change(4);actor.reaction=5;actor.clock.pose=31|(actor.facing&0xff00);actor.pendingDamage=3;actor.unlinkMarked=true;peer.secondaryPinner=null;
     }
    }
   }
  }
 }else if(action===74){ // $017304
  if(!initialized){actor.movementMode=0;actor.mash=0;initializeMash(actor,0);}
  else{
   clearPartnerMotion(actor);if(actor.health&&(peer.action&0x8000))mashHeldInput(actor,actor.pressedButtons);
   const valid=peer.state===5&&[72,14,15].includes(peer.action&255);
   if(valid&&((actor.flags32&16)||(actor.forced&0x8000))){
    if(actor.flags32&16){
     actor.announce(41);const second=actor.secondaryPinner;
     if(second?.auxiliary===actor&&second.state===5&&(second.action&255)===73){
      second.change(7);second.flags35&=~1;second.zFixed=addPositionWord(second.zFixed,(actor.zFixed>>>16)-(second.zFixed>>>16));
     }
    }
    peer.change(7);peer.flags35&=~1;peer.unlinkMarked=true;
   }
   if(!valid||(actor.flags32&16)||(actor.forced&0x8000)){
    actor.recoveryTimer=32;actor.change(4);actor.reaction&=255;return descriptor;
   }
  }
  if(actor.state===14||!(actor.action&0x8000)){
   actor.clock.pose=((actor.reaction&255)===8?18:19)|(actor.facing&0xff00);descriptor=actorTables.grappleAnimations.hidden;
  }else if((actor.reaction&255)!==8)descriptor=actorTables.pinVariants.victimBack;
 }else if(action===75){ // $01744c
  if(!initialized){
   peer.flags35&=~1;peer.change(4);peer.reaction=15;peer.clock.pose=240|(peer.facing&0xff00);face(peer,actor.facing);
   actor.flags33&=~64;peer.flags33&=~64;peer.recoveryTimer=80;actor.placePeer(peer,80,-1,16);finishPinCount(actor);
   const second=actor.secondaryPinner;
   if(second?.auxiliary===actor&&second.state===5&&(second.action&255)===73){
    second.change(4);second.reaction=15;second.offsetX|=0x8000;face(second,actor.facing^0x8000);
    second.recoveryTimer=80;second.flags35&=~1;second.clock.pose=240|(second.facing&0xff00);second.flags33&=~64;
    actor.placePeer(second,80,-1,16);
   }
  }else if(actor.clock.index===0xfe){
   actor.change(7);actor.reaction=0;actor.unlinkMarked=true;actor.secondaryPinner=null;return descriptor;
  }
  if((actor.reaction&255)!==8)descriptor=actorTables.pinVariants.escapeBack;
 }else if(action===86){ // $0182c6, escape from action-26's held victim 94
  if(!initialized){peer.change(255);peer.flags35&=~1;low(actor,'offsetX',40);low(actor,'offsetY',96);actor.facing=peer.facing;}
  else{
   if(!(actor.clock.index&255)&&!actor.clock.remaining)actor.sounds.push(41);
   if(actor.clock.index===0xfe){
    actor.offsetX|=0x8000;peer.offsetX|=0x8000;actor.change(7);peer.change(4);peer.reaction=5;peer.pendingDamage=3;
    peer.clock.pose=22|(peer.facing&0xff00);finishPinCount(actor);move(actor,80);actor.unlinkMarked=true;
    actor.clock.pose=104|(actor.facing&0xff00);actor.flags33&=~64;peer.flags33&=~64;
   }
  }
 }
 return descriptor;
}

// $00de04's pin/held escape selections. The caller supplies the original action
// press edge; the handler's mash counter reaches $4000 in the previous update.
export function pinEscapeInput(actor,pressed=0) {
 if(!(pressed&3)||actor.mash!==0x4000||actor.state!==5)return false;
 const action=actor.action&255,next=action===74||action===81?75:action===94?86:null;
 if(next===null)return false;actor.change(5,next);actor.mash=0;return true;
}
