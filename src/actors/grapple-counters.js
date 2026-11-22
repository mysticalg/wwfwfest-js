import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
export const isGrappleCounter=action=>Object.hasOwn(actorTables.grappleCounters,action&255);

// $019844-$019d70 counter handlers, plus action 6's linked counter pose.
export function stepGrappleCounter(actor,peer,initialized) {
  const action=actor.action&255,descriptor=actorTables.grappleCounters[action];
  if(action===6){ // $012274
    if(!initialized){
      actor.movementMode=0;
      const preserve=actor.flags34&8;actor.flags34&=~8;
      if(preserve){actor.clock.flags|=0x8000;actor.clock.index=actor.clock.remaining=0;}
      else if(actor.action&0x8000){
        actor.clock.flags|=0x8000;actor.clock.index=0;actor.clock.pose=96^actor.facing;actor.clock.remaining=12;
      }else actor.motionLink=null;
    }else{
      if(!(actor.action&0x8000)){
        actor.contact=actor.clock.index===0?4:1;
        if(actor.clock.index===0&&actor.motionLink){
          actor.contact=0;actor.clock.remaining=12;actor.action|=0x8000;return descriptor;
        }
        if(actor.clock.index===0&&(actor.clock.remaining&255)<2){
          actor.change(0);actor.unlinkMarked=true;actor.contact=0;return descriptor;
        }
      }
      if(actor.clock.index===0xfe){actor.change(0);actor.unlinkMarked=true;actor.contact=0;}
    }
    return descriptor;
  }

  let ready=false;
  if(action===126||action===127){
    if(!initialized)actor.holdFlags=2;
    if(actor.clock.index===0xfe){
      actor.holdFlags=(actor.holdFlags-1)&65535;
      if(actor.holdFlags)actor.clock.index=actor.clock.remaining=0;else ready=true;
    }
  }else{
    if(!initialized){
      const distance=action===133?32:action===134||action===135?16:0;
      if(distance)actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?-distance:distance);
      actor.holdFlags=action===134||action===135?72:80;
    }
    actor.holdFlags=(actor.holdFlags-1)&65535;ready=actor.holdFlags===0;
  }
  if(!ready)return descriptor;
  actor.world.message=0x0f1a;
  if(action<=130){
    actor.change(5,0xc07b);actor.holdFlags=1;peer.change(5,21);peer.facing=actor.facing;
    if(action!==126&&action!==127)peer.facing^=0x8000;
    peer.clock.pose=57^peer.facing;actor.clock.pose=0xffff;
    peer.holdFlags=action<=127?3:0;
  }else{
    actor.change(4);actor.reaction=14;actor.pendingDamage=8;peer.change(5,0xc006);
    actor.clock.pose=43^actor.facing;peer.clock.pose=96^peer.facing;
    actor.zFixed=addPositionWord(actor.zFixed,72);
    if(action===131)peer.yFixed=addPositionWord(peer.yFixed,1);
    actor.motionLink=peer;peer.motionLink=actor;
    if(action===132||action===133){actor.flags33|=64;peer.flags33|=64;}
    else{actor.flags33&=~64;peer.flags33&=~64;}
  }
  actor.offsetX=actor.offsetY=peer.offsetX=peer.offsetY=0;
  return descriptor;
}
