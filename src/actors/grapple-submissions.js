import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
import {walkAnimation,walkSpeed} from './movement.js';
import {collisionResponse} from './grapple-victims.js';
import {initializeMash,mashHeldInput,beginAttackAssistance,beginVictimAssistance,
 clearPartnerMotion,finishAssistance,submissionComplete,pursuePoint} from './grapple-services.js';

export const isGrappleSubmission=action=>Object.hasOwn(actorTables.grappleSubmissions,action&255);
const offset=(actor,key,value)=>{actor[key]=(actor[key]&0xff00)|(value&255);};
const clearOffset=actor=>{actor.offsetX|=0x8000;};
const move=(actor,x=0,y=0,z=0)=>{
 for(const[key,value]of [['xFixed',actor.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])actor[key]=addPositionWord(actor[key],value);
};
const opposite=(actor,peer)=>{peer.facing=(peer.facing&255)|((actor.facing^0x8000)&0xff00);};
const unpair=(actor,peer)=>{actor.flags33&=~64;peer.flags33&=~64;};
const release=(peer,reaction)=>{peer.change(4);peer.reaction=reaction;};

// Original headlock-selected holds and their participant/completion handlers.
// Contact and pending-damage words remain requests for the main match services.
export function stepGrappleSubmission(actor,peer,initialized) {
 const action=actor.action&255;let descriptor=actorTables.grappleSubmissions[action];
 const at=index=>actor.clock.index===index&&!actor.clock.remaining;
 const complete=()=>actor.clock.index===0xfe;
 if([93,94,95,96,98,99].includes(action)){ // $018776
  actor.clock.flags|=0x8000;
  if(!initialized){
   actor.comboCount=0;actor.movementMode=0;actor.clock.pose=0xffff;actor.clock.remaining=0xff00;
   beginVictimAssistance(actor);actor.mash=0;initializeMash(actor,({93:4,94:0,95:4,96:6,98:7,99:7})[action]);
  }else{
   clearPartnerMotion(actor);if(action!==94||actor.health)mashHeldInput(actor,actor.pressedButtons||0);
  }
 }else if(action===26){ // $014468
  let releaseHold=false;
  if(actor.action&0x8000){
   if((actor.forced&0x8000)||(peer.flags32&16)){
    peer.announce(41);actor.flags35&=~1;releaseHold=true;
   }
  }else if(!initialized){
   actor.movementMode=0;offset(actor,'offsetX',32);offset(actor,'offsetY',96);peer.change(255);
   if(!actor.contest(1,actor.attempt(0xfc)))actor.change(5,135);else actor.announce(35);
  }else{
   if(at(4)){actor.landingSound();actor.world.shake=14;offset(actor,'offsetX',40);}
   if(complete()){
    peer.pendingDamage=22;actor.sounds.push(50);
    if(!(actor.flags33&4)&&(actor.flags33&1)&&(peer.flags33&1)){
     actor.action|=0x8000;peer.change(5,94);peer.pendingDamage=22;actor.flags35|=1;
     peer.reaction|=0x2000;peer.flags32|=8;beginAttackAssistance(actor);
    }else releaseHold=true;
   }
  }
  if(releaseHold){
   clearOffset(actor);actor.change(7);release(peer,6);actor.facing^=0x8000;
   actor.placePeer(peer,-96,1);actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;peer.reaction|=0x2000;peer.flags32|=8;
  }
 }else if(action===37){ // $01536e
  if(!initialized){actor.movementMode=0;actor.nudge(-24);peer.change(255);actor.announce(31);}
  else{
   if(at(0))offset(actor,'offsetY',32);
   if(actor.action&0x8000)actor.contact=0x801e;
   if(complete()){
    if(actor.forced&0x8000){
     clearOffset(actor);actor.change(0);actor.clock.pose=actor.facing;release(peer,2);opposite(actor,peer);
     actor.placePeer(peer,48,-1,48);actor.unlinkMarked=true;
    }else{
     actor.clock.index=1;actor.clock.remaining=0;peer.pendingDamage=5;
     if(submissionComplete(actor)){actor.change(5,138);clearOffset(actor);}
     const prior=actor.action&0x8000;actor.action|=0x8000;
     if(!prior){
      peer.change(5,96);actor.flags35|=2;peer.flags35|=4;peer.reaction|=0x2000;peer.flags32|=8;
      beginAttackAssistance(actor);actor.sounds.push(50);
     }
    }
   }
  }
 }else if(action===54){ // $016b6a
  if(!initialized){
   if(!peer||peer.unlinkMarked||peer.auxiliary!==actor||((peer.action&255)!==123&&(peer.clock.flags&255)!==255)){
    actor.unlinkMarked=true;actor.change(0);return actorTables.grappleAnimations.hidden;
   }
   actor.movementMode=0;peer.facing=(peer.facing&255)|(actor.facing&0xff00);actor.announce(6);peer.change(255);
   actor.flags35|=2;peer.flags35|=4;
  }else{
   actor.contact=actor.action&0x8000?0x8015:0;
   if(complete()){
    if(actor.forced&0x8000){actor.change(5,111);peer.change(0);finishAssistance(actor);}
    else{
     actor.clock.index=1;actor.clock.remaining=0;peer.pendingDamage=5;
     if(submissionComplete(actor)){
      actor.change(5,111);peer.change(5,110);peer.facing^=0x8000;finishAssistance(actor);
     }else{
      const prior=actor.action&0x8000;actor.action|=0x8000;
      if(!prior){peer.change(5,99);peer.reaction|=0x2000;peer.flags32|=8;beginAttackAssistance(actor);actor.sounds.push(50);}
     }
    }
   }
  }
 }else if(action===59){ // $016f52, phase dispatch $016f72
  const repeated=actor.action&0x2000;actor.action|=0x2000;if(!repeated)actor.holdFlags=0;
  const phase=actor.holdFlags&255;
  if(phase===0){
   descriptor=actorTables.grappleThrows[36];
   if(!initialized){actor.movementMode=0;peer.change(255);move(actor,-32);}
   else{
    if(at(2)){
     peer.change(5,141);peer.yFixed=addPositionWord(peer.yFixed,-1);actor.sounds.push(50);peer.facing^=0x8000;
     actor.placePeer(peer,-16,0,64);unpair(actor,peer);
    }
    if(complete()){
     actor.change(5);actor.holdFlags=(actor.holdFlags&0xff00)|((phase+1)&255);actor.clock.pose=actor.facing;move(actor,32);
    }
   }
  }else if(phase===1){
   if(!initialized){actor.movementMode=0;actor.clock.pose=actor.facing;}
   if(peer.action&0x8000){
    const prior=actor.holdFlags&0x8000;actor.holdFlags|=0x8000;
    if(!prior){
     actor.movementMode=1;actor.speed=walkSpeed(actor.type,actor.flags32,actor.flags33,actor.flags56,actor.flags74);
     actor.targetX=((peer.xFixed>>>16)+(peer.facing&0x8000?-80:80))&65535;actor.targetY=peer.yFixed>>>16;
    }
    if(actor.flags74&128)offset(actor,'offsetY',16);
    descriptor=walkAnimation(actor.flags32,actor.flags74,actor.flags75||0);
    if(!pursuePoint(actor)){actor.movementMode=0;actor.change(5);actor.holdFlags=(actor.holdFlags&0xff00)|((phase+1)&255);}
   }else descriptor=actorTables.grappleSubmissionVariants.pursuitWait;
  }else if(phase===2){
   if(!initialized){
    actor.movementMode=0;peer.change(255);actor.announce(36);actor.sounds.push(49);
    for(const key of ['xFixed','yFixed'])actor[key]=addPositionWord(actor[key],(peer[key]>>>16)-(actor[key]>>>16));
    offset(actor,'offsetX',32);actor.facing=(actor.facing&255)|(peer.facing&0xff00);actor.flags33|=64;peer.flags33|=64;
   }else{
    if(actor.action&0x8000)actor.contact=0x801f;
    if(complete()){
     let finish=Boolean(actor.forced&0x8000);
     if(!finish){
      actor.clock.index=2;actor.clock.remaining=0;peer.pendingDamage=5;
      if(submissionComplete(actor)){
       clearOffset(actor);finish=true;if(actor.world.mode&1){peer.announce(41);peer.flags32|=16;}
      }
     }
     if(finish){
      actor.change(5,111);actor.clock.pose=77^actor.facing;peer.change(5,110);unpair(actor,peer);
      actor.flags35&=~2;peer.flags35&=~4;
     }else{
      const prior=actor.action&0x8000;actor.action|=0x8000;
      if(!prior){
       actor.sounds.push(50);actor.flags35|=2;peer.flags35|=4;peer.change(5,98);peer.reaction|=0x2000;peer.flags32|=8;
       beginAttackAssistance(actor);move(actor,64);
       peer.xFixed=addPositionWord(peer.xFixed,(actor.xFixed>>>16)-(peer.xFixed>>>16));offset(actor,'offsetX',208);
      }
     }
    }
   }
  }else throw new Error(`Unsupported original action-59 phase ${phase}`);
 }else if(action===137){ // $019e00
  if(!initialized){
   actor.movementMode=0;peer.change(255);
   for(const key of ['xFixed','zFixed'])peer[key]=addPositionWord(peer[key],(actor[key]>>>16)-(peer[key]>>>16));
   offset(actor,'offsetY',32);actor.flags34|=8;actor.facing=(actor.facing&255)|((actor.flags33&128)<<8);
   peer.facing=(peer.facing&255)|(actor.facing&0xff00);actor.facing^=0x8000;
  }else{
   actor.contact=0x401a;if(at(0))offset(actor,'offsetY',64);
   if(complete()){
    actor.clock.index=2;actor.clock.remaining=0;const prior=actor.action&0x8000;actor.action|=0x8000;
    if(!prior){move(actor,-48);offset(actor,'offsetX',64);peer.xFixed=addPositionWord(peer.xFixed,(actor.xFixed>>>16)-(peer.xFixed>>>16));actor.sounds.push(50);}
   }
  }
 }else if(action===110){ // $018fc2, mode-zero completion wait
  actor.clock.flags|=0x8000;
  if(!initialized){
   actor.movementMode=0;actor.clock.pose=78^actor.facing;actor.flags35&=~4;actor.clock.remaining=128;
   if(actor.world.mode&1)return descriptor;actor.clock.remaining=0xffff;
  }
  if((actor.forced&0x8001)===0x8000)actor.change(0);
  else{
   actor.clock.remaining=(actor.clock.remaining-1)&65535;
   if(!actor.clock.remaining){
    if(!(actor.world.mode&1))actor.clock.remaining=0xffff;
    else{actor.change(5,122);actor.holdFlags=0;actor.flags32|=16;actor.announce(41);}
   }
  }
 }else if(action===111){ // $019054
  actor.clock.flags|=0x8000;
  if(!initialized){
   actor.movementMode=0;actor.clock.pose=77^actor.facing;actor.clock.remaining=64;
   actor.yFixed=addPositionWord(actor.yFixed,(peer.yFixed>>>16)-(actor.yFixed>>>16)+2);offset(actor,'offsetY',32);actor.flags35&=~2;
  }else{
   actor.clock.remaining=(actor.clock.remaining-1)&65535;
   if(!actor.clock.remaining){
    clearOffset(actor);actor.unlinkMarked=true;
    if(actor.flags32&1){actor.change(1);actor.walkMode=1;}
    else{actor.change(0);actor.clock.pose=actor.facing;}
   }
  }
 }else if(action===138){ // $019eb2
  if(!initialized)offset(actor,'offsetY',32);
  else{
   if(at(0)){
    if(actor.world.mode&1){peer.announce(41);peer.flags32|=16;actor.flags35&=~2;peer.flags35&=~4;}
    clearOffset(actor);release(peer,2);opposite(actor,peer);actor.placePeer(peer,48,-1,48);
   }
   if(complete()){actor.change(0);actor.clock.pose=actor.facing;actor.unlinkMarked=true;}
  }
 }else if(action===141){ // $0171f2
  if(!initialized)actor.profile(12);
  else{
   collisionResponse(actor);
   if(actor.clock.index===1&&(actor.collision.flags&16)){
    actor.landingSound();actor.nudge(80);actor.clock.remaining=0;actor.profile(3);
   }
   if(actor.clock.index===2&&(actor.collision.flags&16)){
    actor.landingSound();actor.movementMode=0;actor.clock.remaining=0;actor.action|=0x8000;
   }
  }
 }
 return descriptor;
}
