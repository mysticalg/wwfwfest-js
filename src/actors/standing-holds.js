import {standingHoldTables as tables} from '../data/standing-hold-tables.js';
import {addPositionWord} from './ring-collision.js';
import {initializeMash,mashHeldInput,finishAssistance,selectRumbleAssistant,beginAttackAssistance,submissionComplete} from './grapple-services.js';

const human=a=>Boolean(a.flags33&2);
const flag=a=>{a.inputBlockA=(a.inputBlockA||0)|128;};
const move=(a,key,delta)=>{a[key]=addPositionWord(a[key],delta);};
const position=(a,p)=>{for(const key of ['xFixed','yFixed'])move(a,key,(p[key]>>>16)-(a[key]>>>16));move(a,'yFixed',-1);};
const effects=(a,...kinds)=>{for(const kind of kinds)(a.world.effectRequests??=[]).push({actor:a,kind});};
const rumbleAssist=a=>{const p=selectRumbleAssistant(a);if(p){p.assistanceTarget=a.auxiliary;a.assistanceTarget=p;}};
const transfer=(a,p)=>{a.flags33&=~2;p.flags33|=2;p.flags35|=8;};

// $020264: the side hold asks for assistance on its first victim entry.
export function assistSideVictim(a){
 const w=a.world;if(!w.inGame)return;
 if(w.mode&1){rumbleAssist(a);return;}
 if((a.auxiliary.flags32&1)||!(a.flags33&1))return;
 const p=a.partner;p.flags34=(p.flags34|1)&~2;
 if(!(p.flags32&1)){
  w.switchTimer=250;
  if(!human(p)&&!(p.flags74&128)){flag(p);p.assistanceTarget=a.auxiliary;a.assistanceTarget=p;}
 }else{
  p.supportTimer=tables.sideVictimTimers[p.severity];
  if(!human(p)){flag(p);p.assistanceTarget=a.auxiliary;a.assistanceTarget=p;}
  p.flags34|=4;p.opponent=a.auxiliary;
 }
}

// $02012a, called when the holder reorients the staggered victim.
function assistHolder(a){
 const w=a.world;if(!w.inGame)return;
 if(w.mode&1){if(!(a.flags56&128))rumbleAssist(a);return;}
 if(!(a.flags33&1))return;
 const p=a.partner;
 if(p.flags32&1){
  if(Math.abs((a.auxiliary.xFixed>>>16)-(p.xFixed>>>16))<80)return;
  p.supportTimer=tables.attackTimers[p.severity];p.flags34=(p.flags34|1)&~2;
  if(human(p)){p.opponent=a.auxiliary;p.flags34|=4;}
  else if(human(a)){p.opponent=a.auxiliary;p.flags34|=4;transfer(a,p);}
  else{p.flags34|=4;flag(p);p.assistanceTarget=a.auxiliary;}
 }else{
  p.flags34=(p.flags34|1)&~2;w.switchTimer=250;
  if(human(p))return;
  if(human(a)){p.flags56&=~64;transfer(a,p);}
  else if(!(p.flags74&128)){flag(p);p.assistanceTarget=a.auxiliary;a.assistanceTarget=p;}
 }
}

// $02033a, called on the first completed victim loop.
function assistVictim(a){
 const w=a.world;if(!w.inGame)return;
 if(w.mode&1){rumbleAssist(a);return;}
 if(!(a.flags33&1))return;
 const p=a.partner,other=a.auxiliary.partner;
 if(other.flags32&1){
  if(Math.abs((a.xFixed>>>16)-(other.xFixed>>>16))<80)return;
  p.supportTimer=tables.victimTimers[p.severity];p.flags34=(p.flags34|1)&~2;
  if(human(p)){p.opponent=a.auxiliary;p.flags34|=4;}
  else{p.flags34|=4;flag(p);p.assistanceTarget=a.auxiliary;}
 }else{
  p.flags34=(p.flags34|1)&~2;w.switchTimer=250;
  if(!human(p)&&!(p.flags74&128)){flag(p);p.assistanceTarget=a.auxiliary;a.assistanceTarget=p;}
 }
}

export const isStandingHold=action=>[28,29,82,83,87,88,109,115,116,118].includes(action&255);
export function stepStandingHold(a,p,initialized){
 const action=a.action&255;let descriptor=tables.actions[action];
 if(!p&&action!==109)throw new Error('Standing hold requires a linked opponent');
 if(action===28){ // $0148bc, side hold and looped damage
  const capture=()=>{
   p.change(5,(p.action&0xff00)|82);p.holdFlags=0;p.facing=(p.facing&255)|(a.facing&0xff00);
   const prior=a.action&0x8000;a.action|=0x8000;
   if(!prior){p.reaction&=255;a.flags33|=64;p.flags33|=64;a.flags35|=2;a.sounds.push(50);beginAttackAssistance(a);a.announce(29);}
  };
  if(!initialized){
   a.movementMode=0;if(!(a.action&0x8000))return descriptor;
   a.clock.flags|=0x8000;a.clock.index=a.clock.remaining=0;p.action=(p.action&255)|0xc000;capture();
  }else{
   if(a.clock.index&&!(a.flags32&1))a.contact=10;
   if(!(a.clock.index&255)&&!a.clock.remaining){
    if(Math.abs((a.yFixed>>>16)-(p.yFixed>>>16))>=16||Math.abs((a.xFixed>>>16)-(p.xFixed>>>16))>=80
      ||(a.facing&0xff00)!==(p.facing&0xff00)||p.auxiliary!==a
      ||!(p.state===4&&(p.reaction&255)===1||[0,1].includes(p.state))){
     a.unlinkMarked=true;if(a.flags32&1){a.change(1);a.walkMode=1;a.clock.pose=a.facing;}else a.change(0);return descriptor;
    }
    capture();
   }else if((a.clock.index&255)===0xfe){
    if(a.forced&0x8000){a.change(0);p.change(0);return descriptor;}
    a.clock.index=a.clock.remaining=0;p.pendingDamage=4;
    if(submissionComplete(a)){a.change(5,111);p.change(5,110);finishAssistance(a);return descriptor;}
   }
  }
  const next=((a.clock.index&255)+Number(!a.clock.remaining))&255;a.world.actorScratch1=next;
  if(!next)effects(a,0);else if(next===1)effects(a,1,3);else effects(a,4);
 }else if(action===82){ // $017f6e, ordinary side-held loop or impact descriptor
  if(a.holdFlags&1){
   descriptor=tables.variants.sideImpact;
   if(!initialized){a.comboCount=(a.comboCount+1)&65535;a.comboTimer=64;}
   else if((a.clock.index&255)===0xfe){a.change(5);a.holdFlags=0;}
  }else if(!initialized){
   a.movementMode=0;initializeMash(a,3);position(a,p);
   const offset=tables.sideOffsets[tables.classes[a.type]];move(a,'xFixed',a.facing&0x8000?-offset:offset);
   const prior=a.action&0x8000;a.action|=0x8000;
   if(!prior){assistSideVictim(a);a.flags35|=4;a.comboCount=0;}
  }else{
   a.contact=9;mashHeldInput(a,a.pressedButtons);
   if((a.clock.index&255)===0xfe){a.clock.flags&=~0x8000;a.clock.index=0;a.clock.remaining=1;}
   // This branch loads D0 but makes no effect-pool call in the original.
   a.world.actorScratch1=((a.clock.index&255)+Number(!a.clock.remaining))&255;
  }
 }else if(action===88){ // $018408, escape from the side-held loop
  if(!initialized){p.change(5,109);a.flags35&=~4;p.flags35&=~2;finishAssistance(a);}
  else{
   if((a.clock.index&255)===1&&!a.clock.remaining){a.sounds.push(42);p.pendingDamage=3;}
   if((a.clock.index&255)===0xfe){a.change(0);a.flags33&=~64;p.flags33&=~64;a.unlinkMarked=true;return descriptor;}
  }
  const next=((a.clock.index&255)+Number(!a.clock.remaining))&255;a.world.actorScratch1=next;
  if(next===0)effects(a,6);else if(next===1)effects(a,7);
 }else if(action===109){ // $018f46, holder struck by the side-hold escape
  if(!initialized){a.movementMode=0;return descriptor;}
  if((a.clock.index&255)===0xfe){a.change(4);a.reaction=a.flags32&1?10:2;return descriptor;}
  const next=((a.clock.index&255)+Number(!a.clock.remaining))&255;a.world.actorScratch1=next;
  if(next<2)effects(a,4);
 }else if(action===29){ // $014ab0
  let finishLoop=false;
  const capture=()=>{a.action|=0x8000;a.flags33|=64;p.flags33|=64;p.change(5,(p.action&0xff00)|83);p.holdFlags=0;};
  if(!initialized){
   a.movementMode=0;
   if(!(a.action&0x8000)){p.comboCount=0;a.holdFlags=0;return descriptor;}
   a.clock.flags|=0x8000;a.clock.index=a.clock.remaining=0;p.action=(p.action&255)|0x8000;capture();
  }else{
   if(a.clock.index)a.contact=13;
   if(!(a.clock.index&255)&&!a.clock.remaining){
    if(p.auxiliary!==a||p.state!==4||(p.reaction&255)!==1){a.unlinkMarked=true;a.change(0);return descriptor;}
    capture();
   }else{
    if(a.forced&0x8000){a.change(0);p.change(0);return descriptor;}
    if((a.clock.index&255)===0xfe){
     a.clock.index=a.clock.remaining=0;
     if(a.world.mode&1)a.facing=(a.facing&255)|((a.xFixed>>>16)<640?0x8000:0);
     else{
      const prior=a.holdFlags&1;a.holdFlags|=1;
      if(prior){a.world.actorScratch1=1;effects(a,8);return descriptor;}
      a.facing=(a.facing&255)|((a.partner.xFixed>>>16)>=(a.xFixed>>>16)?0x8000:0);
     }
     p.facing=(p.facing&255)|(a.facing&0xff00);position(p,a);
     const offset=tables.offsets[tables.classes[p.type]];move(p,'xFixed',p.facing&0x8000?-offset:offset);
     assistHolder(a);finishLoop=true;
    }
   }
  }
  // $014c26 reads the live D1 byte on the reorientation branch; the ordinary
  // branch explicitly loads its descriptor index into that byte at $014c08.
  const next=finishLoop?(a.world.actorScratch1||0)&255:((a.clock.index&255)+Number(!a.clock.remaining))&255;
  if(!finishLoop)a.world.actorScratch1=next;
  if(next===1)effects(a,8);else if(next)effects(a,9);
 }else if(action===83){ // $0180a4, normal held loop and two impact descriptors
  const variant=a.holdFlags&3;
  if(variant){
   if(variant>2)throw new Error('Invalid original standing victim variant');
   descriptor=tables.variants[variant===1?'punch':'kick'];
   if(!initialized){a.comboCount=(a.comboCount+1)&65535;a.comboTimer=64;}
   else if((a.clock.index&255)===0xfe)a.holdFlags=0;
  }else if(!initialized){
   a.movementMode=0;initializeMash(a,2);position(a,p);a.facing=p.facing;
   const offset=tables.offsets[tables.classes[a.type]];move(a,'xFixed',a.facing&0x8000?-offset:offset);
  }else{
   a.contact=12;mashHeldInput(a,a.pressedButtons);
   if((a.clock.index&255)===0xfe){
    a.clock.flags&=~0x8000;const prior=a.action&0x8000;a.action|=0x8000;if(!prior)assistVictim(a);
   }
  }
 }else if(action===87){ // $01838e, elbow escape and holder reaction 118
  if(!initialized){move(a,'yFixed',(p.yFixed>>>16)-(a.yFixed>>>16)-1);p.change(5,118);finishAssistance(a);}
  else{
   if((a.clock.index&255)===1&&!a.clock.remaining){a.sounds.push(42);p.pendingDamage=3;}
   if((a.clock.index&255)===0xfe){a.change(0);a.flags33&=~64;p.flags33&=~64;a.unlinkMarked=true;}
  }
 }else if(action===115||action===116){ // $019260/$01929c, holder impact then recapture
  if(!initialized)a.movementMode=0;
  else if((a.clock.index&255)===0xfe){a.change(5,0xc01d);return descriptor;}
  effects(a,action===115?10:11);
 }else{ // $01934e, holder struck during the elbow escape
  if(!initialized)a.movementMode=0;
  else if((a.clock.index&255)===0xfe){a.change(4);a.reaction=2;}
  if(!a.clock.index&&a.clock.remaining)effects(a,8);
 }
 return descriptor;
}
