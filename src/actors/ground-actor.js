import {actorTables} from '../data/actor-tables.js';
import {walkAnimation,walkSpeed} from './movement.js';
import {collisionResponse} from './grapple-victims.js';
import {addPositionWord} from './ring-collision.js';

export const isGroundActorAction=action=>[8,60,62,117,121].includes(action&255);
export function stepGroundActorAction(actor,initialized){
 const action=actor.action&255;
 let descriptor=actorTables.groundAnimations[action];
 const walking=()=>{
  if(actor.flags74&128)actor.offsetY=(actor.offsetY&0xff00)|16;
  return walkAnimation(actor.flags32,actor.flags74,actor.flags75);
 };
 if(action===8){ // $0123c0: raise a front-prone opponent into a standing clinch
  const peer=actor.auxiliary;
  if(!peer)throw new Error('Get-up grapple requires its linked opponent');
  if(!initialized){
   actor.movementMode=0;peer.copyPeerPosition(actor,true);
   actor.facing=(actor.facing&255)|(peer.facing&0xff00);actor.offsetX=80;actor.resultPose=2;
  }else if(!actor.clock.index&&!actor.clock.remaining){
   if(peer.auxiliary===actor&&peer.state===4&&(peer.reaction&255)===8){
    peer.change(255);actor.flags33|=64;peer.flags33|=64;actor.facing=(actor.facing&255)|(peer.facing&0xff00);
   }else{
    actor.change(0);actor.offsetX|=0x8000;actor.clock.remaining=2;actor.resultPose=0;
    actor.unlinkMarked=true;actor.clock.pose=actor.facing;
    actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?-128:128);
   }
  }else if((actor.clock.index&255)===0xfe){
   const peerWins=(actor.flags56&128)&&(peer.flags56&128)&&(peer.flags33&32);
   const winner=peerWins?peer:actor,loser=peerWins?actor:peer;
   winner.change(12);winner.holdFlags=0x2000;loser.change(255);loser.holdFlags=0;
   actor.offsetX|=0x8000;actor.resultPose=0;
   peer.recoveryTimer=peer.comboTimer=peer.comboCount=peer.mash=0;
   peer.facing=(peer.facing&255)|((actor.facing^0x8000)&0xff00);
   actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?-128:128);actor.copyPeerPosition(peer);
   actor.nudge(0);peer.nudge(0);
  }
 }else if(action===121){ // $0194ce, character-specific showboating
  if(!initialized){
   const prior=actor.action&0x8000;actor.action|=0x8000;
   if(!prior){actor.movementMode=0;actor.sounds.push(actor.type<6?50:49);actor.holdFlags=actorTables.tauntRepeats[actor.type]&15;}
  }else if((actor.clock.index&255)===0xfe){
   actor.holdFlags=(actor.holdFlags-1)&65535;
   if(actor.holdFlags)actor.change(5);
   else{actor.change(0);actor.clock.pose=actor.facing;actor.flags34&=~16;return descriptor;}
  }
  descriptor=actorTables.tauntAnimations[actor.type];
 }else if(action===60){ // $017268, depth adjustment then a held waiting pose
  if(!(actor.action&0x8000)){
   if(!initialized){
    actor.movementMode=1;actor.speed=walkSpeed(actor.type,actor.flags32,actor.flags33,actor.flags56,actor.flags74);
    actor.direction=(actor.yFixed>>>16)>(actor.flags33&4?296:336)?128:0;descriptor=walking();
   }else if(actor.clock.index===1&&!actor.clock.remaining){
    actor.movementMode=0;actor.action|=0x8000;actor.clock.remaining=0xff00;actor.clock.index=0;actor.unlinkMarked=true;
   }else descriptor=walking();
  }
  if(actor.forced&0x8000){actor.change(0);actor.unlinkMarked=true;}
 }else if(action===62){ // $01755a, retreat locomotion with its facing-dependent direction
  if(!initialized){actor.movementMode=1;actor.direction=actor.facing&0x8000?192:64;}
  actor.speed=walkSpeed(actor.type,actor.flags32,actor.flags33,actor.flags56,actor.flags74);descriptor=walking();
  if(actor.forced&0x8000){actor.change(0);actor.unlinkMarked=true;}
 }else{ // $0192ec, the standing/running hesitation descriptor
  if(!initialized)actor.holdFlags=0;
  else{
   collisionResponse(actor);
   if(!(actor.world.mode&2)&&[1,5].includes(actor.collision.kind)&&(actor.collision.flags&3))actor.change(6);
   else if(actor.clock.index===0xfe)actor.change(actor.movementMode?2:0);
  }
  if(actor.movementMode)descriptor=actorTables.groundAnimations.rushMoving;
  else if(!actor.clock.remaining&&[1,4].includes(actor.clock.index))actor.sounds.push(51);
 }
 return descriptor;
}
