import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
const u16=value=>value&65535;
export const isGrappleVictim=reaction=>[19,21,22,34,35,41].includes(reaction&255);

function depthVelocity(actor,amount=48) {
  const y=actor.yFixed>>>16;
  if(u16(y+32)>=408)actor.velocityY=u16(-amount);
  else if(u16(y-32)<280)actor.velocityY=amount;
}
function rope(actor,left,force=false) {
  const index=left?0:2,state=actor.world.rope;
  if(force||!(state[index]&255)){state[index]=state[index+1]=1;actor.ropeEvents.push({side:left?'left':'right',strength:1});}
}
// $010206: the two ordinary side ropes and the outside-plane barrier.
export function collisionResponse(actor) {
  const {kind,flags}=actor.collision;
  if(!(actor.world.mode&2)&&(kind===1||kind===5)){
    if(flags&2)rope(actor,true);else if(flags&1)rope(actor,false);
  }else if(kind===3){actor.change(4,23);actor.reaction=23;actor.sounds.push(40,50);}
}
const landingSound=actor=>actor.sounds.push(actor.flags33&4?45:41);
function land(actor,{whole=false,shift=0}={}) {
  actor.change(4,5);if(whole)actor.reaction=5;actor.clock.pose=31^actor.facing;
  if(shift)actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?-shift:shift);
}

// The original victim descriptors keep their high reaction flags unless the
// handler writes the whole word. State-5 outside handoffs remain explicit.
export function stepGrappleVictim(actor,initialized) {
  const reaction=actor.reaction&255,data=actorTables.grappleVictims;
  const descriptor=data[reaction];
  if(reaction===41){ // $01ad48, short stagger then flight reaction 3
    if(!initialized){actor.movementMode=0;actor.comboTimerStart=64;}
    else if(actor.clock.index===0xfe){actor.change(4,3);actor.reaction=3;}
  }else if(reaction===19||reaction===21||reaction===35){
    if(!initialized){actor.profile(({19:6,21:8,35:26})[reaction]);if(reaction===19)depthVelocity(actor);}
    else{
      collisionResponse(actor);
      if(actor.collision.flags&16){landingSound(actor);land(actor,{shift:reaction===19?0:-56});}
    }
  }else if(reaction===34){ // $01b028
    if(!initialized){actor.profile(24);depthVelocity(actor);}
    else{
      if(actor.clock.index===0&&!actor.clock.remaining)actor.zFixed=addPositionWord(actor.zFixed,-16);
      collisionResponse(actor);
      if(actor.clock.index===1){
        actor.paddingZ=0xffe0;
        if(actor.collision.flags&16){landingSound(actor);actor.paddingZ=0;land(actor,{whole:true,shift:-56});}
      }
    }
  }else if(reaction===22){ // $01ab0a
    if(!initialized){
      let outside=false;
      if(actor.world.scene!==1&&!(actor.world.mode&2)){
        actor.holdFlags=0;
        const y=actor.yFixed>>>16,x=actor.xFixed>>>16;
        if(actor.attacker?.facing&0x8000)outside=x>u16(-Math.trunc((y*256-0x9c000)/0x2e0));
        else outside=x<=u16(Math.trunc((y*256+0x48000)/0x2e0));
      }
      if(outside){
        actor.profile(32);actor.flags33|=4;
        if(actor.world.mode&1){actor.flags32|=16;if(actor.attacker)actor.attacker.eliminations=u16((actor.attacker.eliminations||0)+1);}
      }else{actor.profile(12);depthVelocity(actor);}
    }else{
      if(actor.collision.kind===6){
        const repeated=actor.holdFlags&1;actor.holdFlags|=1;if(!repeated)actor.sounds.push(40,50);
        if((actor.zFixed>>>16)<384)rope(actor,Boolean(actor.collision.flags&2),true);
      }
      if(actor.clock.index===1){
        actor.paddingZ=0xffe0;collisionResponse(actor);
        let outsideHandoff=false,finish=false;
        if(actor.collision.flags&16){
          if((actor.flags33&4)&&!(actor.world.mode&2))outsideHandoff=true;
          else{land(actor,{shift:-56});landingSound(actor);finish=true;}
        }else if(actor.collision.kind===3){
          if(actor.world.mode&2)finish=true;else outsideHandoff=true;
        }
        if(outsideHandoff){
          actor.change(5,104);actor.holdFlags=0;actor.clock.pose=22^actor.facing;
          actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?-16:16);finish=true;
        }
        if(outsideHandoff||(finish&&!(actor.collision.flags&16)))actor.sounds.push(40);
        if(finish)actor.paddingZ=0;
      }
    }
  }
  return descriptor;
}
