import {actorTables} from '../data/actor-tables.js';
import {contactOverlap} from './contact.js';
import {addPositionWord} from './ring-collision.js';
import {finishAssistance} from './grapple-services.js';
import {finishPinCount} from './pin.js';

const u16=value=>value&65535;
const changeReaction=(actor,reaction)=>{actor.change(4);actor.reaction=reaction;};
const stateWord=(actor,value)=>{actor.state=value&255;actor.pendingState=!(value&0x8000);};
const mapReaction=(actor,target)=>{ // $023fa0, only the reaction's low byte changes
 const reaction=target.reaction&255;
 if(reaction<36&&((actor.facing^target.facing)&0x8000)===0)target.reaction=(target.reaction&0xff00)|actorTables.reactionFacingMap[reaction];
};
const bonus=target=>{if(target.flags33&16)target.pendingDamage=u16(target.pendingDamage+1);};
const damage=(target,value)=>{target.pendingDamage=((target.pendingDamage||0)&0xff00)|(value&255);};
const message=(world,actor,value)=>{world.message=((actor.type&255)<<8)|value;};
const sound=(world,...commands)=>{(world.contactSounds??=[]).push(...commands);};
const rescueMessage=(actor,target,world)=>{if(!(world.mode&1)&&target.partner!==actor)world.message=0x0f19;};
const releaseHeld=target=>{target.flags74=target.flags75=0;if(target.heldObject)target.heldObject.state=2;target.heldObject=null;target.holdFlags=0;};
const clearPair=(target,peer)=>{target.flags33&=~64;peer.flags33&=~64;};
const ordinary=target=>target.reaction===0||target.reaction===10;
const restore=(actor,target,world)=>{stateWord(actor,actor.clock.flags&0x80ff);stateWord(target,0x8005);world.message=0;};

// $0235be dispatch. The unusual type-10/14 comparison really uses the target
// iterator word in D1, not the facing word loaded into D0 immediately before it.
function primary(actor,target,record,world,iterator){
 const kind=record[5],protectedContact=target.contact&0xff00;
 if(kind===0)return true;
 if(kind===1||kind===8){
  if(kind===1&&(target.contact&0x4000))return false;
  sound(world,...(kind===1?[42,50]:[43]));damage(target,record[4]);changeReaction(target,kind===1?0:10);
  if(!(target.contact&0x8000)){
   if((target.flags33&16)||target.comboCount>=3)target.reaction=2;
   mapReaction(actor,target);bonus(target);
  }
  return true;
 }
 if(kind===2){
  if(protectedContact)return false;
  sound(world,43);changeReaction(actor,target.state===2?2:24);if(target.state===2)actor.recoveryTimer=80;
  changeReaction(target,2);target.recoveryTimer=80;mapReaction(actor,target);actor.unlinkMarked=true;return true;
 }
 if(kind===3){
  if(protectedContact||!(target.flags33&16))return false;
  message(world,actor,3);if((actor.facing>>>8)===(target.facing>>>8))return false;
  changeReaction(target,14);damage(target,record[4]);return true;
 }
 if(kind===4){
  if(protectedContact)return false;
  sound(world,43,50);message(world,actor,5);damage(target,record[4]);actor.contact=0;changeReaction(target,16);
  if((actor.direction&128)===(target.facing>>>8)){
   target.facing=(target.facing&255)|((actor.facing^0x8000)&0xff00);bonus(target);
   if(actor.type===0||actor.type===5)target.pendingDamage=u16(target.pendingDamage+3);
  }else changeReaction(target,11);
  return true;
 }
 if([5,6,7,12,13].includes(kind)){
  if(kind!==6&&protectedContact)return false;
  if(kind===12||kind===13)message(world,actor,kind===12?27:12);
  if(kind===6)world.message=0x0f28;
  if(kind===7)message(world,actor,13);
  sound(world,kind===6?46:43,50);damage(target,record[4]);
  changeReaction(target,kind===6?(target.flags33&16?4:3):kind===7?((actor.action&255)===65?29:20):(target.flags33&16?3:2));
  mapReaction(actor,target);bonus(target);return true;
 }
 if(kind===9){
  if(protectedContact)return false;
  sound(world,43,50);message(world,actor,5);actor.contact=0;damage(target,record[4]);changeReaction(target,17);mapReaction(actor,target);return true;
 }
 if(kind===10||kind===14){
  if(protectedContact||!(target.flags33&16)||target.facing===iterator)return false;
  sound(world,41,50);damage(target,record[4]);changeReaction(target,(actor.contact&255)===27?40:31);
  if((actor.contact&255)===27)world.message=0x032d;actor.contact=0;return true;
 }
 if(kind===11){
  if(target.contact&0x8000)return false;
  sound(world,43,50);message(world,actor,22);actor.contact=0;damage(target,record[4]);changeReaction(target,18);
  if((target.contact&255)!==26){mapReaction(actor,target);bonus(target);}return true;
 }
 throw new RangeError(`Untranslated primary contact ${kind}`);
}

// $0235fa dispatch. Secondary responses interrupt the held graph as a whole.
function secondary(actor,target,kind,world){
 if(kind===0){actor.unlinkMarked=target.unlinkMarked=true;target.holdFlags=0;mapReaction(actor,target);return;}
 if(kind===5){releaseHeld(target);return;}
 if(kind===8){if((target.reaction&255)===18){world.message=0x0f28;changeReaction(target,18);}return;}
 if(kind===12){if((target.reaction&255)===10){changeReaction(target,2);mapReaction(actor,target);}return;}
 const peer=target.auxiliary,same=(actor.facing>>>8)===(target.facing>>>8);
 if(kind===1){
  if(same){stateWord(target,0x8005);return;}
  clearPair(target,peer);target.flags35&=~4;peer.flags35&=~2;
  if(ordinary(target)){
   rescueMessage(actor,target,world);
   if(target.comboCount<3){target.change(5,0xc052);target.holdFlags=1;peer.change(5,0xc065);return;}
   changeReaction(target,2);
  }
  peer.change(5,111);finishAssistance(target);target.unlinkMarked=true;return;
 }
 if(kind===2){
  if(!same){stateWord(target,0x8005);return;}
  clearPair(target,peer);peer.flags35&=~4;target.flags35&=~2;peer.change(0);
  if(target.reaction===0)mapReaction(actor,target);rescueMessage(actor,target,world);changeReaction(target,11);
  finishAssistance(peer);target.unlinkMarked=true;return;
 }
 if(kind===3){
  if(same){stateWord(target,0x8005);return;}
  clearPair(target,peer);rescueMessage(actor,target,world);
  if(ordinary(target)&&target.comboCount<3){
   const kick=target.reaction===10;target.change(5,0xc053);target.holdFlags=kick?2:1;peer.change(5,kick?0xc074:0xc073);return;
  }
  changeReaction(target,2);peer.change(5,111);finishAssistance(target);target.unlinkMarked=true;return;
 }
 if(kind===4){
  if(!same){stateWord(target,0x8005);return;}
  clearPair(target,peer);rescueMessage(actor,target,world);changeReaction(peer,1);changeReaction(target,2);target.holdFlags=0;
  mapReaction(actor,target);finishAssistance(peer);target.unlinkMarked=true;return;
 }
 if(!ordinary(target)){
  restore(actor,target,world);if([6,7,9].includes(kind))target.holdFlags=0;return;
 }
 rescueMessage(actor,target,world);changeReaction(target,2);mapReaction(actor,target);
 if(kind===9){
  changeReaction(peer,9);peer.recoveryTimer=8;clearPair(target,peer);target.flags35&=~1;finishPinCount(peer);
 }else{
  if(kind===6||kind===11)peer.change(7);
  else if(kind===7){actor.contact=0;actor.hitMask=65535;peer.change(0);}
  else if(kind===10){changeReaction(peer,11);peer.facing=(peer.facing&255)|(target.facing&0xff00);peer.recoveryTimer=8;}
  else throw new RangeError(`Untranslated secondary contact ${kind}`);
  clearPair(target,peer);target.flags35&=~2;peer.flags35&=~4;finishAssistance(peer);
 }
 target.unlinkMarked=true;
 if(kind===11){
  actor.offsetX|=0x8000;peer.facing=(peer.facing&255)|(target.facing&0xff00);
  peer.xFixed=addPositionWord(peer.xFixed,peer.facing&0x8000?-48:48);
 }
 if([7,9].includes(kind))target.holdFlags=0;
}

export function applyNativeContact(actor,target,attackRecord,targetRecord,world,iterator){
 if(!primary(actor,target,attackRecord,world,iterator))return false;
 secondary(actor,target,targetRecord[6],world);return true;
}

const geometry=actor=>({x:actor.xFixed>>>16,y:actor.yFixed>>>16,z:actor.zFixed>>>16,pose:actor.clock.pose,contact:actor.contact});
// $023288: physical pool order, per-pose hit mask and common accepted-hit writes.
export function advanceNativeContacts(world,{acceptPair=()=>true,onHit=()=>{}}={}){
 world.contactSounds=[];
 const pool=world.actors.slice(0,9);
 for(const actor of pool){
  if(!actor.active||!actor.contact||actor.pendingState)continue;
  const contact=actor.contact,record=actorTables.contacts[contact&255];if(!(record[0]&128))continue;
  for(const[index,target]of pool.entries()){
   if(target===actor||!target.active||!target.contact||target.pendingState||(target.flags32&64)||target.forced
    ||((target.flags32&4)&&!(world.mode&2))||target.clock.pose===65535||((actor.hitMask||0)&(0x8000>>>index)))continue;
   const own=geometry(actor),other=geometry(target);own.contact=contact;
   if(Math.abs(own.y-u16(other.y-((target.contact&255)===20?8:0)))>=12||Math.abs(own.x-other.x)>=80||!contactOverlap(own,other))continue;
   const targetRecord=actorTables.contacts[target.contact&255];
   if(!acceptPair(actor,target,record,targetRecord))continue;
   if(!applyNativeContact(actor,target,record,targetRecord,world,index+1))continue;
   actor.hitMask=(actor.hitMask||0)|(0x8000>>>index);actor.holdFlags=actor.timer=actor.contact=0;actor.lastHit=target;
   if(target.flags74&128)releaseHeld(target);
   const counter=u16(((target.flagsC6||0)<<8)|(target.hitCounter||0))+1;
   target.flagsC6=(counter>>>8)&255;target.hitCounter=counter&255;
   target.contact=target.timer=target.offsetX=target.offsetY=0;target.flags33&=~16;target.lastHit=actor;
   if(target.severity===2)target.reaction|=0x8000;
   onHit(actor,target);
  }
 }
}
