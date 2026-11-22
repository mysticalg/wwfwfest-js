import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';

export const isGrappleThrow=action=>Object.hasOwn(actorTables.grappleThrows,action&255);
const move=(actor,x=0,y=0,z=0)=>{
  for(const[key,value]of [['xFixed',actor.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])actor[key]=addPositionWord(actor[key],value);
};
const opposite=(actor,peer)=>{peer.facing=(peer.facing&255)|((actor.facing^0x8000)&0xff00);};
const release=(peer,reaction)=>{peer.change(4);peer.reaction=reaction;};
const unpair=(actor,peer)=>{actor.flags33&=~64;peer.flags33&=~64;};
const offset=(actor,axis,value)=>{const key=axis==='x'?'offsetX':'offsetY';actor[key]=(actor[key]&0xff00)|(value&255);};
const clearOffset=actor=>{actor.offsetX|=0x8000;};

// Hand-translated attacker handlers. The caller retains the original descriptor
// for this update even when a handler requests another state/action.
export function stepGrappleThrow(actor,peer,initialized) {
  const action=actor.action&255,data=actorTables.grappleThrows;
  let descriptor=data[action];
  const at=(index)=>actor.clock.index===index&&actor.clock.remaining===0;
  const complete=()=>actor.clock.index===0xfe;
  if(action===2){ // $011c48
    if(!initialized){actor.movementMode=0;peer.change(255);offset(actor,'y',16);actor.nudge(-24);}
    else if(at(1)){
      clearOffset(actor);actor.profile(7);actor.placePeer(peer,-32);move(actor,32,0,80);
      release(peer,41);peer.pendingDamage=15;unpair(actor,peer);actor.sounds.push(43,50);actor.partnerSupport(peer);
    }else if(actor.collision.flags&16){actor.landingSound();actor.clock.remaining=0;actor.movementMode=0;move(actor,-40);}
    else if(complete()){actor.change(7);actor.unlinkMarked=true;if(actor.type===7)actor.requestPin();}
  }else if(action===24){ // $014148
    if(!initialized){actor.movementMode=0;peer.change(255);actor.announce(2);offset(actor,'x',16);}
    else if(at(2)){
      release(peer,34);peer.hitCounter=(peer.hitCounter+1)&255;peer.pendingDamage=12;actor.sounds.push(50);
      opposite(actor,peer);unpair(actor,peer);actor.placePeer(peer,80,1,80);
    }else if(complete()){
      clearOffset(actor);actor.change(0);actor.facing^=0x8000;actor.clock.pose=actor.facing;actor.unlinkMarked=true;
    }
  }else if(action===36){ // $015296
    if(!initialized){actor.movementMode=0;actor.nudge(-24);peer.change(255);actor.announce(actor.type===8?39:1);}
    else{
      if(at(2)){
        release(peer,22);peer.hitCounter=(peer.hitCounter+1)&255;peer.yFixed=addPositionWord(peer.yFixed,-1);
        peer.pendingDamage=14;actor.sounds.push(50);peer.facing^=0x8000;actor.placePeer(peer,-16,0,64);unpair(actor,peer);
      }
      if(complete()){actor.change(0);actor.clock.pose=actor.facing;move(actor,24);actor.unlinkMarked=true;}
    }
  }else if(action===40){ // $015676
    if(!initialized){
      actor.movementMode=0;actor.nudge(-48);peer.change(255);
      if(!actor.contest(1,actor.attempt(0xe8)))actor.change(5,125);
    }else if(at(1)){actor.announce(17);move(actor,0,0,28);actor.profile(29);}
    else if(actor.collision.flags&16){
      actor.movementMode=0;actor.clock.remaining=0;actor.sounds.push(43,50);actor.world.shake=14;
    }else if(at(3)){
      release(peer,0x2005);peer.pendingDamage=18;actor.partnerSupport(peer);peer.hitCounter=(peer.hitCounter+5)&255;
      peer.flags32|=8;peer.facing^=0x8000;actor.placePeer(peer,-96);unpair(actor,peer);actor.clock.pose=31^actor.facing;
    }else if(complete()){
      actor.change(7);actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;if(actor.type===11)actor.requestPin();
    }
  }else if(action===44){ // $015b38
    if(!initialized){actor.movementMode=0;peer.change(255);actor.announce(16);actor.nudge(48);}
    else{
      if(at(4))actor.sounds.push(43);
      if(at(1))offset(actor,'x',8);
      if(at(4)){
        release(peer,21);peer.hitCounter=(peer.hitCounter+5)&255;peer.pendingDamage=16;actor.sounds.push(50);
        opposite(actor,peer);actor.placePeer(peer,48,-1,40);unpair(actor,peer);
      }else if(complete()){
        clearOffset(actor);actor.change(0);
        if(actor.type!==9){actor.requestPin();actor.partnerSupport(peer);}
        actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;move(actor,32);
      }
    }
  }else if(action===50||action===66){ // $0163d4
    if(!initialized){
      const repeated=actor.action&0x8000;actor.action|=0x8000;
      if(!repeated){actor.movementMode=0;actor.holdFlags=3;peer.change(255);}
    }else{
      if(at(0))actor.sounds.push(42);
      let shouldRelease=false;
      if(at(1)){
        peer.pendingDamage=action===50?5:4;actor.holdFlags=(actor.holdFlags-1)&65535;
        if(actor.holdFlags){actor.clock.flags=5;return descriptor;}
        if(action===50){offset(actor,'y',32);shouldRelease=true;}
      }
      if(!shouldRelease&&complete()){
        clearOffset(actor);actor.change(0);actor.clock.pose=actor.facing;actor.unlinkMarked=true;
        if(action!==50)shouldRelease=true;
      }
      if(shouldRelease){release(peer,2);actor.partnerSupport(peer);actor.placePeer(peer,-16,-1);unpair(actor,peer);}
    }
  }else if(action===52){ // $0166ea
    if(!initialized){
      actor.movementMode=0;peer.change(255);
      if(!actor.contest(1,actor.attempt(0xfa)))actor.change(5,134);else actor.announce(28);
    }else if(at(3))actor.profile(25);
    else{
      if(actor.collision.flags&16){actor.landingSound();actor.world.shake=14;actor.movementMode=0;actor.clock.remaining=0;}
      if(at(6)){
        release(peer,0x2023);peer.flags32|=8;peer.pendingDamage=28;actor.sounds.push(50);actor.partnerSupport(peer);
        peer.hitCounter=(peer.hitCounter+5)&255;actor.placePeer(peer,64,-1,64);unpair(actor,peer);
      }else if(complete()){actor.change(0);actor.clock.pose=actor.facing;actor.unlinkMarked=true;}
    }
  }else if(action===58){ // $016e58
    if(!initialized){actor.movementMode=0;peer.change(255);actor.announce(33);actor.nudge(64);}
    else{
      if(at(3))actor.sounds.push(43);
      if(at(4)){
        release(peer,0x2015);peer.flags32|=8;actor.requestPin();actor.partnerSupport(peer);actor.sounds.push(50);
        peer.hitCounter=(peer.hitCounter+1)&255;peer.pendingDamage=21;opposite(actor,peer);actor.placePeer(peer,80,-1,40);
      }
      if(complete()){actor.change(7);actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;move(actor,32);}
    }
  }else if(action===68){ // $0178a8
    if(!initialized){
      actor.movementMode=0;offset(actor,'y',80);peer.change(255);
      if(!actor.contest(1,actor.attempt(0xf2)))actor.change(5,130);
      else{actor.announce(16);if(peer.type===8)descriptor=actorTables.grappleThrowVariants.largeTarget;}
    }else{
      if(at(4)){
        actor.sounds.push(43);release(peer,0x2005);opposite(actor,peer);peer.hitCounter=(peer.hitCounter+5)&255;
        peer.flags32|=8;peer.pendingDamage=24;actor.sounds.push(50);actor.placePeer(peer,0,-1,32);
        unpair(actor,peer);actor.clock.pose=31^actor.facing;
      }
      if(complete()){clearOffset(actor);actor.change(0);actor.clock.pose=actor.facing;actor.requestPin();actor.unlinkMarked=true;}
    }
  }
  return descriptor;
}
