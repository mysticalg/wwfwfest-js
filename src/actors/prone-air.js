import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
import {aimAtParticipant} from './pin.js';
import {humanMoveBounds} from './human-input.js';

export const isProneAirAction=action=>[16,19,20,70,71].includes(action&255);
const u16=value=>value&65535;
const low=(a,key,value)=>{a[key]=(a[key]&0xff00)|(value&255);};
const pose=(a,value)=>{a.clock.pose=value|(a.facing&0xff00);};
const move=(a,x=0,y=0,z=0)=>{
 for(const[key,delta]of [['xFixed',a.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])a[key]=addPositionWord(a[key],delta);
};
const prone=(a,p)=>p.state===4&&[8,9].includes(p.reaction&255)&&humanMoveBounds(a,p,10);
const held=(a,p)=>p.state===5&&(p.action&255)===97&&humanMoveBounds(a,p,10);
const hit=p=>{p.hitCounter=(p.hitCounter+1)&255;};
const attempt=(p,offset)=>{p.attempts[offset]=u16((p.attempts[offset]||0)+1);};
const reaction=(p,value)=>{p.change(4);p.reaction=value;};
const alignY=(a,p)=>{a.yFixed=addPositionWord(a.yFixed,(p.yFixed>>>16)-(a.yFixed>>>16)-1);};
const copyDepth=(a,p)=>{for(const key of ['yFixed','zFixed'])a[key]=addPositionWord(a[key],(p[key]>>>16)-(a[key]>>>16));};
const faceVelocity=a=>{a.facing=(a.velocityX&0x8000)^0x8000;};
function beside(a,p){
 const x=u16((p.xFixed>>>16)+(p.facing&0x8000?-56:56));
 a.facing&=~0x8000;if(x>=(a.xFixed>>>16))a.facing|=0x8000;
 a.xFixed=addPositionWord(a.xFixed,x-(a.xFixed>>>16));
}
function miss(a,{distance=0,poseBeforeFlip=false,damagePeer=null}={}){
 reaction(a,5);if(poseBeforeFlip)pose(a,31);a.facing^=0x8000;
 if(!poseBeforeFlip)pose(a,31);move(a,distance);
 (damagePeer||a).pendingDamage=3;a.sounds.push(50);a.world.message=0x0f1a;a.unlinkMarked=true;
}

// $01342c/$013698/$013c32/$013da4: original airborne prone attacks. The
// shared dispatcher owns descriptor clocks, collision, projection and physics.
export function stepProneAirAction(a,initialized){
 const action=a.action&255,p=a.auxiliary,descriptor=actorTables.proneAirAnimations[action];
 if(!p)throw new Error('Prone aerial attack requires its linked target');
 const at=index=>(a.clock.index&255)===index&&!a.clock.remaining;
 if(action===16){
  if(!(a.action&0x8000)){
   if(!initialized){
    a.velocityZ=0x300;a.gravity=0x48;
    if(p.state===5&&(p.action&255)===97){aimAtParticipant(a,p,5);faceVelocity(a);}
    else{beside(a,p);copyDepth(a,p);move(a,16,0,16);aimAtParticipant(a,p,(p.reaction&255)===8?10:11);}
    a.movementMode=2;move(a,0,0,64);low(a,'offsetY',16);return descriptor;
   }
   if(at(0))a.offsetX|=0x8000;
   if((a.clock.index&255)===1){
    a.paddingZ=0xffe0;if(!(a.collision.flags&16))return descriptor;
    a.paddingZ=0;a.landingSound();a.movementMode=0;
    if(prone(a,p)){
     a.clock.remaining=0;a.action|=0x8000;alignY(a,p);low(a,'offsetY',12);
     reaction(p,((p.reaction&255)-2)&255);hit(p);p.pendingDamage=10;attempt(p,0xd2);a.sounds.push(43,50);
    }else if(held(a,p)){
     a.clock.remaining=0;a.action|=0x8000;alignY(a,p);low(a,'offsetY',12);
     p.change(5,119);p.pendingDamage=10;a.sounds.push(50);hit(p);
    }else{
     reaction(a,5);move(a,80,-1);a.facing^=0x8000;pose(a,31);a.pendingDamage=3;
     a.sounds.push(50);a.world.message=0x0f1a;a.unlinkMarked=true;
    }
    return descriptor;
   }
  }
  if((a.clock.index&255)===0xfe){a.offsetX|=0x8000;a.change(7);pose(a,104);move(a,24,-1);a.unlinkMarked=true;}
 }else if(action===70||action===71){
  if(!(a.action&0x8000)){
   if(!initialized){a.movementMode=0;a.velocityZ=0x600;a.gravity=0x48;aimAtParticipant(a,p,p.state===5&&(p.action&255)===97?5:2);faceVelocity(a);return descriptor;}
   if(at(0)){a.movementMode=2;return descriptor;}
   if(at(1)){low(a,'offsetX',action===71?0xf8:0xf0);low(a,'offsetY',action===71?0xf0:40);}
   if(a.collision.flags&16){
    a.offsetX|=0x8000;a.landingSound();a.movementMode=0;
    if(prone(a,p)&&p.auxiliary===a){
     a.clock.remaining=0;a.action|=0x8000;alignY(a,p);reaction(p,(p.reaction&255)-2);hit(p);p.pendingDamage=10;
     a.sounds.push(43,50);attempt(p,action===70?0xe0:0xe2);
    }else if(held(a,p)){
     a.clock.remaining=0;a.action|=0x8000;alignY(a,p);low(a,'offsetY',12);p.change(5,119);p.pendingDamage=10;a.sounds.push(43,50);hit(p);
    }else miss(a,{distance:action===70?-48:0});
    return descriptor;
   }
  }
  if((a.clock.index&255)===0xfe){a.offsetX|=0x8000;a.change(7);pose(a,104);a.unlinkMarked=true;move(a,24,-1);}
 }else if(action===19){
  if(!initialized){
   a.movementMode=2;beside(a,p);copyDepth(a,p);move(a,16,0,32);
   a.velocityZ=0x300;a.gravity=0x30;aimAtParticipant(a,p,2);return descriptor;
  }
  if(!(a.action&0x8000)&&a.clock.index===1&&(a.collision.flags&16)){
   a.landingSound();
   if(prone(a,p)){reaction(p,7);p.pendingDamage=10;a.action|=0x8000;a.movementMode=0;a.clock.remaining=24;attempt(p,0xd6);hit(p);a.sounds.push(42,50);}
   else miss(a,{distance:-64});
  }else if((a.clock.index&255)===0xfe){a.change(7);pose(a,104);move(a,64);a.unlinkMarked=true;}
 }else{
  if(!(a.action&0x8000)){
   if(!initialized){
    a.movementMode=0;beside(a,p);a.velocityZ=0x500;a.gravity=0x48;move(a,72,-1);
    aimAtParticipant(a,p,a.facing===p.facing?3:4);return descriptor;
   }
   if(!a.clock.index&&!a.clock.remaining){a.movementMode=2;a.flags33|=8;}
   if(at(1))low(a,'offsetY',32);
   if((a.clock.index&255)===3){
    a.paddingZ=32;if(!(a.collision.flags&16))return descriptor;
    a.offsetX|=0x8000;a.paddingZ=0;a.landingSound();a.movementMode=0;a.clock.remaining=0;
    if(prone(a,p)){a.action|=0x8000;reaction(p,7);attempt(p,0xd8);hit(p);a.sounds.push(50,42);p.pendingDamage=11;}
    // $013ef2 writes the pending damage to A2, even on this miss branch.
    else miss(a,{distance:-32,poseBeforeFlip:true,damagePeer:p});
   }
  }
  if((a.clock.index&255)===0xfe){a.change(7);a.unlinkMarked=true;}
 }
 return descriptor;
}
