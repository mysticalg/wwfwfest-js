import {tagTables} from '../data/tag-tables.js';
import {actorTables} from '../data/actor-tables.js';
import {walkSpeed,walkAnimation,stepMovement} from './movement.js';
import {addPositionWord} from './ring-collision.js';
import {projectionSnapshot} from './projection.js';

const u16=value=>value&65535;
const setWord=(actor,field,value)=>{actor[field]=addPositionWord(actor[field],value-(actor[field]>>>16));};
const faceByte=(actor,value)=>{actor.facing=(actor.facing&255)|((value&255)<<8);};
const directionByte=(actor,value)=>{actor.direction=(actor.direction&0xff00)|(value&255);};
function begin(actor){
 actor.sounds=[];actor.ropeEvents=[];
 if(actor.pendingState){actor.previousState=actor.clock.flags;actor.clock.flags=actor.state;actor.pendingState=false;}
 actor.collision={...actor.collision,kind:0,flags:0};
 if(actor.movementMode){
  actor.collision=actor.collisionAt();
  for(const[key,delta]of [['xFixed','x'],['yFixed','y'],['zFixed','z']])actor[key]=addPositionWord(actor[key],actor.collision[delta]);
 }
 return Boolean(actor.clock.flags&0x8000);
}
function finish(actor,descriptor){
 actor.clock.step(descriptor,actor.facing);
 if(actor.offsetX&0x8000)actor.offsetX=actor.offsetY=0;
 actor.projection=projectionSnapshot(actor);stepMovement(actor);return actor;
}

// $01c746, assistance expiry while a partner is moving on the apron.
export function expireTagAssistance(actor){
 if(!(actor.flags34&1)||!actor.supportTimer)return false;
 actor.supportTimer=u16(actor.supportTimer-1);if(actor.supportTimer)return false;
 actor.flags56|=64;actor.flags34&=~3;
 actor.world[actor.flags33&128?'activeB':'activeA']=actor;
 if((actor.flagsC6||0)&64){actor.flagsC6&=~64;actor.flags33|=32;}
 actor.world.switchTimer=375;actor.change(5,78);return true;
}
function cleanLink(actor){
 if(!actor.forced&&actor.auxiliary&&(actor.auxiliary.unlinkMarked||actor.auxiliary.auxiliary!==actor)){
  actor.auxiliary=null;actor.unlinkMarked=false;actor.secondaryPinner=null;
 }
}
function healApron(actor){
 actor.holdFlags=u16(actor.holdFlags-1);
 if(!actor.holdFlags){
  actor.holdFlags=tagTables.apronRecoveryTimes[actor.type];
  if(actor.maximumHealth>actor.health){actor.health=u16(actor.health+1);actor.healthAccumulator=1;}
 }
}

// $010892's ordinary and apron/return handlers. AI sets directions separately.
export function stepTagWalk(actor){
 const initialized=begin(actor),mode=actor.walkMode&63,team=Boolean(actor.flags33&128);
 let descriptor=actorTables.walkAnimations[0];
 if(!((actor.world.gameFlags??(actor.world.inGame?0x8000:0))&0x8000))actor.flags32&=~8;
 if(mode===1){ // $0109d6
  if(!initialized){
   actor.flags32|=1;actor.flags32&=~8;actor.flags33&=~64;actor.speed=16;actor.drawMode=4;
   actor.holdFlags=tagTables.apronRecoveryTimes[actor.type];actor.timer=0;
   const y=actor.yFixed>>>16;setWord(actor,'xFixed',team?(0xe48-y)>>>2:(y+0x580)>>>2);
  }else{
   faceByte(actor,team?0:128);
   if(actor.forced&0x8000)actor.change(5,78);
   else if(!expireTagAssistance(actor)){
    cleanLink(actor);if(!(actor.flags33&32))actor.apronTimer=u16((actor.apronTimer||0)+1);
    if((actor.flagsC6||0)&64){actor.change(1);actor.walkMode=3;}
    else{
     healApron(actor);
     if(actor.flags34&32){
      if(!actor.timer)actor.timer=32;actor.timer=u16(actor.timer-1);
      if(!actor.timer){actor.flags34&=~32;actor.clock.pose=actor.facing;}
      else{actor.movementMode=0;actor.clock.pose=0x1d3|actor.facing;actor.clock.remaining=2;}
      return finish(actor,actorTables.grappleAnimations.hidden);
     }
     const direction=actor.direction&255;
     if(!direction)actor.movementMode=0;
     else{
      actor.movementMode=1;const y=actor.yFixed>>>16;
      if(direction>=64&&direction<192){if(y>288)return finish(actor,descriptor);else setWord(actor,'yFixed',288);}
      else if(y<402)return finish(actor,descriptor);else setWord(actor,'yFixed',402);
      actor.movementMode=0;
     }
     actor.clock.pose=actor.facing;descriptor=actorTables.grappleAnimations.hidden;
    }
   }
  }
 }else if(mode===2){ // $010b6c
  if(!initialized){
   actor.movementMode=1;actor.speed=16;actor.holdFlags=1;actor.walkMode&=~0x8000;
   faceByte(actor,team?0:128);directionByte(actor,team?120:8);
  }
  if(!(actor.flags33&32))actor.apronTimer=u16((actor.apronTimer||0)+1);
  if((actor.flagsC6||0)&64){actor.flagsC6&=~64;actor.flags33|=32;}
  healApron(actor);
  if(actor.forced&0x8000)actor.change(5,78);
  else if(!expireTagAssistance(actor)){
   if(!(actor.walkMode&0x8000)){
    const y=actor.yFixed>>>16;
    if(team?y>=304:y<=386)return finish(actor,descriptor);
    setWord(actor,'yFixed',team?304:386);actor.walkMode|=0x8000;
   }
   actor.movementMode=0;actor.clock.pose=actor.facing;actor.clock.remaining=2;
  }
 }else if(mode===3){ // $010c60
  if(!initialized){
   actor.speed=16;directionByte(actor,team?248:8);
   if((actor.yFixed>>>16)>=344)directionByte(actor,(actor.direction&255)^128);actor.movementMode=1;
  }
  if(!expireTagAssistance(actor)){
   const direction=actor.direction&255,y=actor.yFixed>>>16;
   const crossed=[8,248].includes(direction)?y>=344:y<344;
   if(crossed){if((actor.flagsC6||0)&64)actor.change(5,113);else{actor.change(1);actor.walkMode=1;}}
  }
 }else if(mode===4){ // $010cfa
  if(!initialized){
   actor.offsetX=actor.offsetY=0;actor.movementMode=1;actor.flags34&=~16;
   const linked=actor.flags34&0xc0;actor.flags34&=~0xc0;
   if(linked&&actor.opponent)actor.opponent.flags34&=~0xc0;
   actor.speed=walkSpeed(actor.type,actor.flags32,actor.flags33,actor.flags56,actor.flags74);
   faceByte(actor,team?128:0);actor.direction=team?64:192;
  }else if(actor.flags34&1){actor.flags34&=~2;actor.change(0);actor.walkMode=0;}
  else{
   cleanLink(actor);
   if(actor.collision.flags&(team?1:2))actor.change(5,79);
  }
  descriptor=walkAnimation(actor.flags32,actor.flags74,actor.flags75);
 }else{ // $010906, also shared by walk modes 5-11
  if(!initialized){actor.movementMode=1;actor.flags33&=~64;}
  actor.speed=walkSpeed(actor.type,actor.flags32,actor.flags33,actor.flags56,actor.flags74);cleanLink(actor);actor.contact=1;
  if(mode<5&&(actor.flags74&128))actor.contact=14;
  descriptor=walkAnimation(actor.flags32,actor.flags74,actor.flags75);if(actor.forced)actor.change(0);
 }
 return finish(actor,descriptor);
}

export function stepCornerState(actor){
 const initialized=begin(actor),state=actor.state,corner=actor.holdFlags;
 let descriptor=actorTables.grappleAnimations.hidden;
 const at=index=>actor.clock.index===index&&!actor.clock.remaining;
 if(state===8){ // $01117a and its three mount handlers
  descriptor=tagTables.mountAnimations[corner];
  if(!initialized){
   actor.movementMode=0;actor.flags32|=2;
   const[x,y]=corner<8?tagTables.mountPositions[corner&3]:tagTables.alternateMountPositions[corner-8];
   setWord(actor,'xFixed',x);setWord(actor,'yFixed',y);
   if(corner>=4&&corner<8){
    actor.walkMode=0;actor.drawMode=4;setWord(actor,'zFixed',384);
    actor.xFixed=addPositionWord(actor.xFixed,corner&1?24:-24);faceByte(actor,corner&1?0:128);
    if(!(corner&2))actor.drawMode=0;
   }else{setWord(actor,'zFixed',320);faceByte(actor,corner&1?128:0);if(corner<4)actor.drawMode=2;}
   actor.world.message=((actor.type&255)<<8)|23;actor.sounds.push(50);
   if(corner<4&&!(actor.world.mode&1))actor.resultPose=1;
  }else if(corner>=4&&corner<8){if(actor.clock.index===0xfe){actor.change(9);actor.drawMode=0;}}
  else if(at(1)){
   actor.xFixed=addPositionWord(actor.xFixed,corner&1?24:-24);setWord(actor,'zFixed',384);actor.facing^=0x8000;
   if(corner<4)actor.drawMode=corner&2?0:4;
  }else if(actor.clock.index===0xfe){actor.change(9);if(corner<4)actor.drawMode=0;}
 }else if(state===9){ // $011426
  if(!initialized){
   actor.clock.flags|=0x8000;actor.movementMode=0;actor.drawMode=0;actor.timer=128;
   const[x,y]=tagTables.waitPositions[corner];setWord(actor,'xFixed',x);setWord(actor,'yFixed',y);setWord(actor,'zFixed',384);
   actor.clock.pose=(actor.facing&0xff00)|tagTables.waitPoses[corner&3];
  }else{
   if(actor.forced&0x8000)actor.change(10);
   else{actor.timer=u16(actor.timer-1);if(!actor.timer)actor.change(10);}
  }
  actor.auxiliary=null;actor.unlinkMarked=false;
 }else{ // $011526, dismount
  const alternate=Boolean(actor.world.mode&2);
  descriptor=tagTables.dismountAnimations[alternate?2:corner&2?0:1];
  if(!initialized){
   if(alternate)actor.flags33&=~4;
   const[x,y]=alternate?tagTables.alternateMountPositions[corner-8]:tagTables.mountPositions[corner];
   setWord(actor,'xFixed',x);setWord(actor,'yFixed',y);setWord(actor,'zFixed',384);
   actor.xFixed=addPositionWord(actor.xFixed,corner&1?24:-24);actor.drawMode=alternate?0:corner&2?0:4;
  }else{
   if(at(alternate?4:corner&2?4:2)){actor.drawMode=2;setWord(actor,'zFixed',320);}
   if(actor.clock.index===0xfe){
    actor.change(0);actor.clock.pose=alternate?actor.facing:(actor.clock.pose&255)|(actor.facing&0xff00);
    actor.world.cornerOccupancy=0;actor.resultPose=0;actor.flags32&=~2;actor.drawMode=0;
    actor.xFixed=addPositionWord(actor.xFixed,(corner&1?-1:1)*(alternate?24:40));
   }
  }
  if(alternate)actor.drawMode=0;
 }
 return finish(actor,descriptor);
}
