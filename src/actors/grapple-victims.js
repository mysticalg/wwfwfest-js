import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
const u16=value=>value&65535;
export const isGrappleVictim=reaction=>[0,10,14,15,19,21,22,28,32,33,34,35,36,37,38,41].includes(reaction&255);

function depthVelocity(actor,amount=48) {
  const y=actor.yFixed>>>16;
  if(u16(y+32)>=408)actor.velocityY=u16(-amount);
  else if(u16(y-32)<280)actor.velocityY=amount;
}
function rope(actor,left,force=false,strength=1) {
  const index=left?0:2,state=actor.world.rope;
  if(force||!(state[index]&255)){state[index]=state[index+1]=strength;actor.ropeEvents.push({side:left?'left':'right',strength});}
}
// $010206: the two ordinary side ropes and the outside-plane barrier.
export function collisionResponse(actor) {
  const {kind,flags}=actor.collision;
  if(!(actor.world.mode&2)&&(kind===1||kind===5)){
    if(flags&2){rope(actor,true);return true;}else if(flags&1){rope(actor,false);return true;}
  }else if(kind===3){actor.change(4);actor.reaction=23;actor.sounds.push(40,50);}
  return false;
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
  let descriptor=data[reaction];
  if([0,10,32].includes(reaction)){ // $01a2d0/$01a61e, ordinary standing impacts
    if(!initialized){actor.movementMode=0;actor.comboCount=u16(actor.comboCount+1);actor.comboTimer=64;}
    else{
      if(reaction!==0)actor.cleanupLink();
      if(actor.clock.index===0xfe){
        if(reaction===32){actor.change(4,2);actor.reaction=2;}
        else if(reaction===10&&(actor.flags32&1)){actor.change(1);actor.walkMode=1;}
        else actor.change(0);
      }
    }
  }else if(reaction===28){ // $01aeea, partner's corner attack releases the holder
    const peer=actor.auxiliary;
    if(!initialized)peer.change(255);
    else if(actor.clock.index===0xfe){
      actor.change(4,2);actor.reaction=2;actor.facing^=0x8000;peer.change(0);
      actor.unlinkMarked=true;actor.flags33&=~64;peer.flags33&=~64;
    }
  }else if(reaction===15){ // $01a8c4, thrown away by a pin escape
    if(!initialized){
      actor.profile(5);depthVelocity(actor);
      const skip=actor.reaction&0x1000;actor.reaction&=~0x1000;
      if(skip){actor.clock.flags|=0x8000;actor.clock.index=actor.clock.remaining=0;}
    }else{
      collisionResponse(actor);
      if((actor.clock.index&255)===3){
        actor.paddingZ=0xffe0;
        if(actor.collision.flags&16){landingSound(actor);actor.paddingZ=0;land(actor);}
      }
    }
  }else if(reaction===41){ // $01ad48, short stagger then flight reaction 3
    if(!initialized){actor.movementMode=0;actor.comboTimerStart=64;}
    else if(actor.clock.index===0xfe){actor.change(4,3);actor.reaction=3;}
  }else if(reaction===19||reaction===21||reaction===35){
    if(!initialized){actor.profile(({19:6,21:8,35:26})[reaction]);if(reaction===19)depthVelocity(actor);}
    else{
      collisionResponse(actor);
      if(actor.collision.flags&16){landingSound(actor);land(actor,{shift:reaction===19?0:-56});}
    }
  }else if(reaction===33){ // $01afac
    if(!initialized){actor.profile(3);actor.mash=0;actor.initializeMash();descriptor=actorTables.knockdownAnimations.bounce;}
    else{
      actor.mashButton(actor.pressedButtons||0);actor.nudgeX(80);collisionResponse(actor);
      if(actor.collision.flags&16){landingSound(actor);actor.change(4,actor.severity===2?9:8);}
      else descriptor=actorTables.knockdownAnimations.bounce;
    }
  }else if(reaction===36){ // $01b118
    if(!initialized)actor.movementMode=0;
    else if(actor.clock.index===0xfe)land(actor);
  }else if(reaction===37){ // $01b15c
    if(!initialized){
      actor.profile(37);if(actor.holdFlags)actor.velocityX=u16(-actor.velocityX);actor.facing^=0x8000;depthVelocity(actor);
    }else{
      collisionResponse(actor);
      if(actor.clock.index===2){
        actor.paddingZ=0xfff0;
        if(actor.collision.flags&16){
          landingSound(actor);actor.paddingZ=0;actor.change(4,5);actor.reaction=5;
          actor.clock.pose=(actor.clock.pose&255)|(actor.facing&0xff00);
          actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?56:-56);
        }
      }
    }
  }else if(reaction===38){ // $01b1e6
    if(!initialized){actor.profile(3);actor.velocityY=128;}
    else{
      if(actor.clock.index===0&&!actor.clock.remaining){
        actor.facing^=0x8000;actor.xFixed=addPositionWord(actor.xFixed,actor.facing&0x8000?56:-56);
        actor.zFixed=addPositionWord(actor.zFixed,-16);
      }
      if(actor.collision.flags&16){landingSound(actor);actor.change(4,5);}
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
  }else if(reaction===22||reaction===14){ // $01ab0a / $01a6b8
    if(!initialized){
      const counter=reaction===14,peer=counter?actor.motionLink:actor.attacker;
      if(counter){
        if(!peer)throw new Error('Counter flight requires its motion link');
        actor.holdFlags=0;actor.auxiliary=peer;actor.unlinkMarked=false;
        for(const[key,delta]of [['xFixed',peer.facing&0x8000?16:-16],['yFixed',-1],['zFixed',72]])
          actor[key]=addPositionWord(actor[key],(peer[key]>>>16)-(actor[key]>>>16)+delta);
      }
      let outside=false;
      if(actor.world.scene!==1&&!(actor.world.mode&2)){
        actor.holdFlags=0;
        const y=actor.yFixed>>>16,x=actor.xFixed>>>16;
        const face=counter?actor.facing:peer?.facing;
        if(face&0x8000)outside=x>u16(-Math.trunc((y*256-(counter?0x96000:0x9c000))/0x2e0));
        else outside=x<=u16(Math.trunc((y*256+(counter?0x4b000:0x48000))/0x2e0));
      }
      if(outside){
        actor.profile(counter?14:32);actor.flags33|=4;
        if(actor.world.mode&1){actor.flags32|=16;if(peer)peer.eliminations=u16((peer.eliminations||0)+1);}
      }else{actor.profile(counter?4:12);depthVelocity(actor);}
      if(counter)actor.movementMode=0;
    }else{
      if(actor.collision.kind===6){
        const repeated=actor.holdFlags&1;actor.holdFlags|=1;if(!repeated)actor.sounds.push(40,50);
        if(reaction===14){actor.velocityX=0;actor.world.secondaryShake=14;}
        else if((actor.zFixed>>>16)<384)rope(actor,Boolean(actor.collision.flags&2),true);
      }
      if(reaction===14){
        if(actor.collision.kind===5)rope(actor,!(actor.collision.flags&1),true,2);
        collisionResponse(actor);
        if(actor.clock.index===0&&!actor.clock.remaining){actor.movementMode=2;return descriptor;}
      }
      if(actor.clock.index===(reaction===14?3:1)){
        actor.paddingZ=0xffe0;if(reaction===22)collisionResponse(actor);
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
