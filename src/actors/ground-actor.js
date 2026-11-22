import {actorTables} from '../data/actor-tables.js';
import {walkAnimation,walkSpeed} from './movement.js';
import {collisionResponse} from './grapple-victims.js';

export const isGroundActorAction=action=>[60,62,117].includes(action&255);
export function stepGroundActorAction(actor,initialized){
 const action=actor.action&255;
 let descriptor=actorTables.groundAnimations[action];
 const walking=()=>{
  if(actor.flags74&128)actor.offsetY=(actor.offsetY&0xff00)|16;
  return walkAnimation(actor.flags32,actor.flags74,actor.flags75);
 };
 if(action===60){ // $017268, depth adjustment then a held waiting pose
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
