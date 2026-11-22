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
  }else if(action===25){ // $014246
    if(!initialized){
      actor.movementMode=0;peer.change(255);offset(actor,'x',46);offset(actor,'y',78);
      if(!actor.contest(1,actor.attempt(0xf4)))actor.change(5,131);
      else{actor.placePeer(peer,240);actor.announce(7);}
    }else{
      if(at(3))offset(actor,'x',127);
      if(at(2))actor.profile(22);
      if(at(3)&&!(actor.world.mode&2)){
        actor.probe(128);
        if(actor.collision.kind&3){
          actor.action|=0x8000;actor.clock.pose=509|actor.facing;release(peer,0x2025);peer.holdFlags=0;peer.facing^=0x8000;
          actor.placePeer(peer,128,1,57);actor.ropeImpact();unpair(actor,peer);
        }
      }
      if(actor.collision.flags&16){actor.landingSound();actor.movementMode=0;actor.clock.remaining=0;actor.world.shake=14;}
      if(at(5)){
        if(!(actor.action&0x8000)){
          release(peer,0x2021);opposite(actor,peer);actor.placePeer(peer,240,1);unpair(actor,peer);
        }
        peer.hitCounter=(peer.hitCounter+5)&255;peer.flags32|=8;actor.partnerSupport(peer);actor.requestPin();
        peer.pendingDamage=20;actor.sounds.push(50);
      }else{
        if(at(6)){clearOffset(actor);move(actor,48);}
        if(complete()){
          actor.change(7);actor.requestPin();actor.clock.pose=104^actor.facing;actor.unlinkMarked=true;return descriptor;
        }
      }
      if(actor.action&0x8000)descriptor=actorTables.grappleThrowVariants.wallSlam;
    }
  }else if(action===38){ // $015498
    if(!initialized){
      actor.movementMode=0;peer.change(255);
      if(!actor.contest(1,actor.attempt(0xf8)))actor.change(5,133);
      else{actor.profile(18);actor.movementMode=0;actor.announce(20);}
    }else if(at(1)){actor.movementMode=2;actor.flags33|=8;}
    else if(actor.clock.index===3&&(actor.collision.flags&16)){
      actor.landingSound();actor.world.shake=14;actor.movementMode=0;actor.clock.remaining=0;
    }else{
      if(at(4)){
        release(peer,0x2005);actor.partnerSupport(peer);peer.pendingDamage=22;actor.sounds.push(50);peer.flags32|=8;
        peer.hitCounter=(peer.hitCounter+5)&255;actor.placePeer(peer,112,-1,32);unpair(actor,peer);actor.clock.pose=31^actor.facing;
      }
      if(complete()){actor.change(7);actor.requestPin();actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;}
    }
  }else if(action===43){ // $0158da
    if(!initialized){
      actor.movementMode=0;
      if(!peer||peer.unlinkMarked||peer.auxiliary!==actor){actor.unlinkMarked=true;actor.change(0);return actorTables.grappleAnimations.hidden;}
      peer.change(255);offset(actor,'x',176);offset(actor,'y',80);
      if(!actor.contest(1,actor.attempt(0xec))){actor.change(5,127);return descriptor;}
      if(actor.timer){
        actor.clock.flags|=0x8000;actor.clock.index=actor.clock.remaining=0;actor.facing^=0x8000;actor.placePeer(peer,-160);
        actor.flags33|=64;peer.flags33|=64;offset(actor,'x',240);
      }
      actor.announce(8);
    }else{
      if(at(3))actor.profile(30);
      if(actor.clock.index===4&&!(actor.world.mode&2)){
        actor.probe(-80);
        if((actor.collision.flags&3)&&!(actor.action&0x8000)){
          actor.action|=0x8000;actor.clock.pose=288|actor.facing;release(peer,0x2025);peer.flags32|=8;peer.holdFlags=1;
          peer.pendingDamage=24;peer.facing^=0x8000;actor.placePeer(peer,actor.timer?-64:-112,1,64);actor.ropeImpact();unpair(actor,peer);
        }
      }
      if(actor.clock.index===4&&(actor.collision.flags&16)){
        actor.landingSound();actor.movementMode=0;actor.clock.remaining=0;actor.requestPin();actor.partnerSupport(peer);actor.world.shake=14;
        if(!(actor.action&0x8000)){
          release(peer,0x2024);peer.flags32|=8;peer.hitCounter=(peer.hitCounter+5)&255;peer.pendingDamage=24;actor.sounds.push(50);
          actor.placePeer(peer,actor.timer?-128:-176,1,32);unpair(actor,peer);return descriptor;
        }
      }
      if(complete()){
        clearOffset(actor);actor.change(7);move(actor,-112);actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;
      }
    }
  }else if(action===47){ // $015ede
    if(!initialized){
      actor.movementMode=0;peer.change(255);actor.nudge(48);
      if(!actor.contest(1,actor.attempt(0xf0))){actor.change(5,129);return descriptor;}
      actor.announce(38);actor.holdFlags=2;actor.nudge(64);
    }else{
      if(at(1))offset(actor,'y',48);
      if(at(3)){
        actor.holdFlags=(actor.holdFlags-1)&65535;
        if(actor.holdFlags){actor.clock.index=1;actor.clock.remaining=0;}
        else if(actor.type===5){
          clearOffset(actor);release(peer,0x2016);peer.flags32|=8;peer.hitCounter=(peer.hitCounter+1)&255;
          peer.yFixed=addPositionWord(peer.yFixed,-1);peer.pendingDamage=22;actor.sounds.push(50);actor.requestPin();
          peer.facing^=0x8000;actor.placePeer(peer,-16,0,64);
        }else{
          unpair(actor,peer);actor.partnerSupport(peer);release(peer,0x2026);peer.facing^=0x8000;peer.flags32|=8;
          peer.pendingDamage=22;peer.hitCounter=(peer.hitCounter+5)&255;actor.placePeer(peer,32,1,80);
        }
      }
      if(at(4)){clearOffset(actor);move(actor,32);}
      if(complete()){actor.change(0);actor.unlinkMarked=true;return descriptor;}
    }
    if(actor.type!==1)descriptor=actorTables.grappleThrowVariants.alternateLift;
  }else if(action===48){ // $016088
    if(!initialized){
      actor.movementMode=0;offset(actor,'y',32);
      if(!peer||peer.unlinkMarked||peer.auxiliary!==actor){actor.unlinkMarked=true;actor.change(0);return actorTables.grappleAnimations.hidden;}
      peer.change(255);
      if(!actor.contest(1,actor.attempt(0xea))){actor.change(5,126);return descriptor;}
      if(actor.timer){
        actor.clock.flags|=0x8000;actor.clock.index=actor.clock.remaining=0;
        peer.facing=(peer.facing&255)|(actor.facing&0xff00);actor.facing^=0x8000;
        actor.xFixed=addPositionWord(actor.xFixed,(peer.xFixed>>>16)-(actor.xFixed>>>16));move(actor,-24);actor.nudge(-56);
      }
      actor.announce(4);
    }else{
      if(at(2))offset(actor,'x',224);
      if(at(3))actor.sounds.push(43);
      if(at(4)){
        offset(actor,'x',0);release(peer,0x2013);peer.hitCounter=(peer.hitCounter+5)&255;actor.partnerSupport(peer);
        peer.pendingDamage=actor.type===0||actor.type===5?19:17;actor.sounds.push(50);peer.flags32|=8;
        actor.placePeer(peer,80,0,16);unpair(actor,peer);
      }
      if(complete()){
        actor.change(0);move(actor,-56);actor.requestPin();actor.facing^=0x8000;actor.clock.pose=actor.facing;clearOffset(actor);actor.unlinkMarked=true;
      }
    }
  }else if(action===51){ // $0164c2
    if(!initialized){
      actor.movementMode=0;peer.change(255);offset(actor,'x',64);offset(actor,'y',64);
      if(!actor.contest(1,actor.attempt(0xf6)))actor.change(5,132);
      else{actor.placePeer(peer,256,0,16);actor.announce(7);}
    }else{
      if(at(0))offset(actor,'x',76);
      if(at(2))actor.profile(22);
      if(actor.clock.index===3&&!(actor.world.mode&2)){
        actor.probe(128);
        if((actor.collision.flags&3)&&!(actor.action&0x8000)){
          actor.action|=0x8000;actor.clock.pose=309|actor.facing;actor.clock.index=3;actor.clock.remaining=0xff00;
          release(peer,0x2025);peer.flags32|=8;peer.holdFlags=0;peer.pendingDamage=18;peer.facing^=0x8000;
          actor.placePeer(peer,128,1,64);actor.ropeImpact();unpair(actor,peer);
        }
      }
      if(actor.clock.index===3&&(actor.collision.flags&16)){
        actor.landingSound();actor.movementMode=0;actor.clock.remaining=0;actor.partnerSupport(peer);actor.requestPin();actor.sounds.push(50);actor.world.shake=14;
        if(!(actor.action&0x8000)){
          release(peer,0x2005);peer.flags32|=8;peer.hitCounter=(peer.hitCounter+5)&255;peer.pendingDamage=18;
          actor.placePeer(peer,176,0,16);unpair(actor,peer);actor.clock.pose=31^actor.facing;
        }
      }
      if(complete()){clearOffset(actor);actor.change(7);move(actor,32);actor.unlinkMarked=true;actor.clock.pose=104^actor.facing;}
    }
  }else if(action===67){ // $01777c, ending through $015e22
    if(!initialized){
      actor.movementMode=0;peer.change(255);offset(actor,'x',48);offset(actor,'y',80);
      if(!actor.contest(1,actor.attempt(0xee)))actor.change(5,128);else{actor.announce(34);actor.placePeer(peer,192);}
    }else{
      if(at(1))offset(actor,'x',64);
      if(at(2)){actor.profile(9);actor.paddingX=80;}
      if(actor.clock.index===5&&(actor.collision.flags&16)){
        actor.movementMode=0;actor.clock.remaining=0;actor.paddingX=0;actor.landingSound();actor.world.shake=14;
      }
      if(complete()){
        peer.pendingDamage=24;peer.facing^=0x8000;actor.placePeer(peer,128,-1);move(actor,96);actor.requestPin();
        clearOffset(actor);actor.change(7);actor.requestPin();actor.clock.pose=104^actor.facing;
        release(peer,0x2006);peer.pendingDamage=16;actor.partnerSupport(peer);peer.hitCounter=(peer.hitCounter+5)&255;
        peer.clock.pose=(peer.clock.pose&255)|(actor.facing&0xff00);peer.facing^=0x8000;peer.flags32|=8;
        actor.sounds.push(50);actor.unlinkMarked=true;unpair(actor,peer);
      }
    }
  }
  return descriptor;
}
