import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
import {collisionResponse} from './grapple-victims.js';
import {aimAtParticipant} from './pin.js';

export const isRunningAction=action=>Object.hasOwn(actorTables.runningAttacks,action&255);
export const isRunningVictim=value=>[16,18,20,29].includes(value&255);
const u16=value=>value&65535;
const move=(a,x=0,y=0,z=0)=>{
 for(const[key,delta]of [['xFixed',a.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])a[key]=addPositionWord(a[key],delta);
};
const reaction=(a,value)=>{a.change(4);a.reaction=value;};
const low=(a,key,value)=>{a[key]=(a[key]&0xff00)|(value&255);};

// $01a9e2: the running catch uses the accepted contact's $92 pointer, which
// remains distinct from the auxiliary link until this handler initializes it.
export function stepRunningVictim(a,initialized){
 let descriptor=actorTables.runningVictims[a.reaction&255];
 if([16,18].includes(a.reaction&255)){ // $01a946, capture timeout is $44
  a.clock.pose=0xffff;a.clock.remaining=0xff00;a.clock.flags|=0x8000;
  if(!initialized)a.holdFlags=32;
  a.holdFlags=u16(a.holdFlags-1);if(!a.holdFlags)a.change(0);
  return descriptor;
 }
 if(!initialized){
  a.facing^=0x8000;a.auxiliary=a.lastHit;a.unlinkMarked=false;
  a.lastHit.placePeer(a,0,-1,0);a.movementMode=0;
 }else if(a.clock.index===0xfe){
  const running=(a.previousState&255)===2;
  a.change(4);low(a,'reaction',running?27:2);a.facing^=0x8000;move(a,8,-1,running?64:16);
  if(!running)a.clock.pose=17^(a.facing&0xff00);
  return descriptor;
 }
 if((a.reaction&255)!==20)descriptor=actorTables.knockdownAnimations.grabbed;
 return descriptor;
}

// Shared-record versions of the eight running selections. The caller owns the
// descriptor clock, projection, collision correction and movement phases.
export function stepRunningAction(a,initialized){
 const action=a.action&255,at=index=>a.clock.index===index&&!a.clock.remaining;
 let descriptor=actorTables.runningAttacks[action],peer=a.auxiliary;
 if(action===32||action===45){ // $015c56, including the entry update
  if(collisionResponse(a))a.change(6);
  else{
   a.contact=11;a.speed=u16(a.speed-2);
   if(a.speed&0x8000){a.change(0);move(a,8);a.unlinkMarked=true;}
  }
 }else if(action===42){ // $01586c
  if(initialized){
   a.contact=a.clock.index?19:3;
   if(collisionResponse(a))a.change(6);
   else if(a.clock.index===3){
    a.speed=u16(a.speed-3);
    if(a.speed&0x8000){a.movementMode=a.speed=0;a.change(0);a.unlinkMarked=true;}
   }
  }
 }else if(action===64){ // $017644
  if(!initialized){a.profile(11);a.movementMode=0;a.flags33|=8;}
  else if(at(0)){a.movementMode=2;a.flags33|=8;}
  else{
   if(a.clock.index===2){
    if(collisionResponse(a)){reaction(a,23);return descriptor;}
    a.contact=22;
    if(!(a.collision.flags&16))return descriptor;
    a.landingSound();a.flags33&=~8;a.movementMode=0;a.clock.remaining=0;
   }
   if(a.clock.index===0xfe)a.change(0);
  }
 }else if(action===65){ // $0176d8
  if(!initialized)a.lastHit=null;
  else if(collisionResponse(a))a.change(6);
  else{
   if(!(a.action&0x8000)){
    a.contact=16;
    if(a.lastHit?.state===4&&(a.lastHit.reaction&255)===29){
     a.action|=0x8000;a.clock.pose=0xffff;a.clock.remaining=12;a.movementMode=0;
     a.auxiliary=a.lastHit;a.unlinkMarked=false;a.lastHit.auxiliary=a;a.lastHit.unlinkMarked=false;
     return descriptor;
    }
   }
   if(a.clock.index===0xfe){a.change(0);a.unlinkMarked=true;}
  }
 }else if(action===1){ // $011b3a, ordinary or corner launch
  if(!initialized){
   const corner=a.flags32&2;a.flags32&=~2;
   if(!corner){a.profile((a.previousState&255)===2?28:27);a.flags33|=8;}
   else{
    a.velocityZ=1792;a.gravity=96;aimAtParticipant(a,peer||actorTables.absentAuxiliaryAimTarget,0);
    a.world.cornerOccupancy=0;a.movementMode=2;a.resultPose=0;
   }
  }else if(collisionResponse(a)){reaction(a,23);a.pendingDamage=3;a.sounds.push(50);}
  else{
   a.contact=a.clock.index===2?24:0;
   if(a.clock.index===2&&(a.zFixed>>>16)<=(a.flags33&4?272:336)){a.clock.remaining=0;move(a,-40);}
   if(a.clock.index===3){
    if(!(a.collision.flags&16))return descriptor;
    a.movementMode=0;a.clock.remaining=0;a.landingSound();
   }
   if(a.clock.index===0xfe){a.change(7);a.unlinkMarked=true;}
  }
 }else if(action===5){ // $012180, capture/release through the actual last-hit link
  if(!initialized){a.movementMode=1;a.lastHit=null;}
  else{
   if(at(1)||at(4))a.sounds.push(51);
   if(!(a.action&0x8000)){
    a.contact=a.clock.index<4?6:3;
    if((a.lastHit?.reaction&255)===16&&a.lastHit.lastHit===a){
     a.auxiliary=a.lastHit;a.unlinkMarked=false;a.clock.flags=5;a.action|=0x8000;a.requestPin();a.contact=0;
     return actorTables.runningPairedAnimations.runningCapture;
    }
    if(collisionResponse(a)){a.change(6);return descriptor;}
   }
   if((a.action&0x8000)&&at(2)){
    peer.change(4);low(peer,'reaction',25);a.placePeer(peer,16,-1,56);a.partnerSupport(peer);
   }else if(a.clock.index===0xfe){a.change(3);a.unlinkMarked=true;return descriptor;}
  }
  if(a.action&0x8000)descriptor=actorTables.runningPairedAnimations.runningCapture;
 }else{ // action 4, $011e62, ordinary capture and the corner team continuation
  if(!initialized){
   a.lastHit=null;move(a,0,0,48);a.flags33=(a.flags33|8)&~16;
   const corner=a.flags32&2;a.flags32&=~2;
   if(!corner)a.profile(10);
   else{
    a.world.cornerOccupancy=0;a.movementMode=2;a.flags34|=8;a.flags32&=~1;
    a.velocityX=1024;a.velocityZ=512;a.gravity=56;a.velocityY=256;
    if(a.flags33&128){a.velocityY=u16(-a.velocityY);a.velocityX=u16(-a.velocityX);}
   }
  }else{
   let captured=false;
   if(!(a.action&0x8000)&&(a.clock.index&255)<2){
    a.contact=0;
    if((a.zFixed>>>16)<=(a.flags33&4?288:352))return descriptor;
    a.contact=23;
    if((a.lastHit?.reaction&255)===18&&a.lastHit.lastHit===a){
     peer=a.lastHit;a.movementMode=0;a.action|=0x8000;a.partnerSupport(peer);
     a.zFixed=addPositionWord(a.zFixed,(peer.zFixed>>>16)-(a.zFixed>>>16));a.clock.flags=5;
     if(!(a.flags34&8)){a.requestPin();a.auxiliary=peer;}
     else{
      a.xFixed=addPositionWord(a.xFixed,(peer.xFixed>>>16)-(a.xFixed>>>16));
      a.yFixed=addPositionWord(a.yFixed,(peer.yFixed>>>16)-(a.yFixed>>>16));
      low(a,'offsetX',16);low(a,'offsetY',64);a.auxiliary=peer.auxiliary;
     }
     a.unlinkMarked=false;captured=true;
    }
   }
   if(!captured){
    if((a.action&0x8000)&&at(1)){
     const corner=a.flags34&8;a.flags34&=~8;
     if(!corner){
      move(a,0,0,64);a.offsetX|=0x8000;reaction(peer,25);peer.flags34|=8;
      peer.clock.pose=179^(peer.facing&0xff00);a.placePeer(peer,16,-1,16);
     }else{
      a.resultPose=0;const third=peer.auxiliary;third.offsetX|=0x8000;a.offsetX|=0x8000;
      third.change(5,0x8006);third.facing^=0x8000;third.flags34|=8;third.unlinkMarked=true;
      reaction(peer,25);peer.pendingDamage=32;peer.flags33&=~64;third.flags33&=~64;
      third.placePeer(peer,24,-1,112);move(third,-16,-1);move(a,-16,0,112);peer.unlinkMarked=true;
     }
    }
    if(a.clock.index===2){
     a.movementMode=2;
     if(a.collision.flags&16){
      a.landingSound();a.clock.remaining=0;a.movementMode=0;a.flags33&=~24;a.facing^=0x8000;low(a,'offsetX',208);
     }
    }
    if((a.clock.index&255)<3){
     a.paddingX=0xfff0;
     if(collisionResponse(a)){reaction(a,23);a.pendingDamage=3;a.sounds.push(50);a.paddingX=0;return descriptor;}
    }
    if(a.clock.index===0xfe){
     a.offsetX|=0x8000;a.change(7);a.clock.pose=104^(a.facing&0xff00);a.paddingX=0;move(a,-48);a.unlinkMarked=true;
     return descriptor;
    }
   }
  }
  if(a.action&0x8000)descriptor=actorTables.runningPairedAnimations[a.flags34&8?'cornerCapture':'airborneCapture'];
 }
 return descriptor;
}
