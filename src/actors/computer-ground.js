import {groundAITables as tables} from '../data/ground-ai-tables.js';
import {participantFacing} from './facing.js';
import {addPositionWord} from './ring-collision.js';
import {pursuePoint,selectRumbleAssistant} from './grapple-services.js';

const u16=v=>v&65535;
const flag=a=>(a.inputBlockA||0)&255;
const setFlag=(a,v)=>{a.inputBlockA=(a.inputBlockA&0xff00)|(v&255);};
const direction=(a,v)=>{a.direction=(a.direction&0xff00)|(v&255);};
const x=a=>a.xFixed>>>16,y=a=>a.yFixed>>>16;
const game=w=>w.gameFlags??(w.inGame?0x8000:0);
const type=a=>a.flags57??a.type;
const sameFace=(a,b)=>(a.facing>>>8)===(b.facing>>>8);
const lowAction=(a,v)=>{a.action=(a.action&0xff00)|(v&255);};
export const supportsComputerGround=actor=>[0,2,3,6].includes(actor.state)||(actor.state===1&&[0,5,6,7,8,9,10,11,12].includes(actor.walkMode&255));

// Services supply the existing weighted draw, distance measurement, action
// dispatcher and tag-disposition routines. Actor identities remain stable.
export class GroundComputer {
 constructor(actor,services){this.a=actor;this.w=actor.world;this.s=services;}
 face(){this.a.facing=participantFacing(this.a,this.a.opponent);}
 choose(weights){return this.s.choose(this.a,weights);}
 action(){
  const result=this.s.action(this.a);
  if(!result)this.a.aiHandoff='action-initializer';
  return result;
 }
 run(reverse=false){
  const a=this.a;a.change(2);direction(a,a.facing&0x8000?64:192);a.flagsB7&=~2;
  if(reverse){a.flags32|=4;direction(a,(a.direction&255)^128);a.facing^=0x8000;}
  return true;
 }
 probeX(delta,{clear=false}={}){
  const a=this.a,old=a.xFixed;a.xFixed=addPositionWord(old,delta);
  if(clear)a.collision={...a.collision,kind:0,flags:0};
  a.collision=a.collisionAt();a.xFixed=old;return a.collision.flags!==0;
 }
 retreat(){ // $01b83a; true when the non-lead actually starts returning
  const a=this.a,p=a.partner;
  if(!(a.flags33&1)){a.change(1);a.walkMode=4;return true;}
  a.flags34&=~2;p.flags34|=2;this.w[a.flags33&128?'activeA':'activeB']=p;return false;
 }
 jumpPosition(){ // $01d144
  const a=this.a,p=a.opponent;
  if(p.facing&0x8000?x(p)<624:x(p)>=672){a.change(5,62);return true;}
  setFlag(a,flag(a)&~32);a.change(1);a.walkMode=5;return false;
 }
 jumpBlocked(){ // $01d1a4
  const a=this.a,distance=u16(192-a.aiDistanceX);
  if(!this.probeX(a.facing&0x8000?-distance:distance))return false;
  setFlag(a,flag(a)&~32);a.change(1);a.walkMode=5;return true;
 }
 select(group,counter=false){ // $01d086/$01d0cc
  const a=this.a,p=a.opponent;
  if(!counter&&group===0&&!(a.flags33&1)&&(p.flags32&1)){
   a.flags34=(a.flags34|2)&~1;a.change(0);return true;
  }
  if(!counter&&!game(this.w)&&!(this.w.mode&1))return this.approachWait();
  const row=tables[counter?'counterMoves':'ordinaryMoves'][type(a)][group];
  const severity=(this.w.clockMinutesBCD??0x30)<16?2:p.severity;
  lowAction(a,row.actions[this.choose(row.weights[severity])]);
  const action=a.action&255;
  if(action===255)return this.approachWait();
  if(action===254)return this.jumpPosition()?this.action():true;
  if(action===253){a.action=0;return true;}
  if(action===62&&this.jumpBlocked())return true;
  a.action&=255;a.change(5);setFlag(a,flag(a)&~16);a.flagsB7&=~64;return this.action();
 }
 approachWait(){const a=this.a;a.change(1);a.aiFlagsB9=(a.aiFlagsB9||0)|2;a.walkMode=0;a.action=0;return true;}
 attackDistance(){ // $01b7f6
  const a=this.a;
  if(sameFace(a,a.opponent)||a.aiDistanceX>=a.controlCounter)return true;
  setFlag(a,(flag(a)&~8)|16);a.action&=255;a.change(5);return this.action();
 }
 attract(){ // $01ea16, the bounded script selection (scene progression separate)
  const a=this.a,p=a.opponent;
  if(game(this.w)||(this.w.mode&1)||p.health>=a.health)return false;
  const script=tables.attractScripts[this.w.attractPhase?1:0][type(a)];
  if(!script)throw new RangeError('Original attract scene requires its selected character script');
  const next=script.actions[(a.demoStep||0)&255];
  if(next===255)return false;
  if(next===undefined)throw new RangeError('Original attract script index exceeded its terminator');
  a.demoAction=((a.demoAction||0)&0xff00)|next;
  if(next&128)a.flags34|=16;a.demoAction&=~128;a.demoStep=((a.demoStep||0)+1)&255;return true;
 }
 assist(){ // $01ba22-$01babe
  const a=this.a,p=a.assistanceTarget;
  if(!(flag(a)&128)||!p)return this.idleCommon();
  if((p.flags32&16)||!p.active||((p.flags35&1)&&(a.flags56&128)&&this.choose(tables.assistanceExitWeights[this.w.round][a.severity])!==0)){
   a.assistanceTarget=null;setFlag(a,flag(a)&~128);return true;
  }
  a.opponent=p;this.s.measure(a);this.face();
  if((a.flags33&4)||!(p.flags33&4)){a.action=0;a.change(1);a.walkMode=0;}
  return true;
 }
 idleCommon(){ // $01bac0
  const a=this.a,p=a.opponent;
  if(p.state===4&&![6,7,8,9].includes(p.reaction&255))a.flagsB6&=~1;
  if((this.w.mode&1)&&(!p.active||(p.flags32&16))){a.flagsB6|=128;return true;}
  this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;a.action=0;a.change(1);a.walkMode=0;return true;
 }
 outsideIdle(){ // $01b8f6, mode-bit-2 exits and weapon search
  const a=this.a;
  if(!(this.w.mode&2)||(a.flags74&128))return this.assist();
  if(!(a.flags56&32)&&(a.flags33&1)&&(this.w.outsideTimer||0)>=10){
   setFlag(a,flag(a)|32);a.action=105;a.targetX=784;a.targetY=312;a.change(1);a.walkMode=10;return true;
  }
  const weapons=this.w.weapons||[],available=weapons.filter(p=>p.active&&p.state===3&&!p.attached);
  if(!available.length)return this.assist();
  // A lone available weapon in the original reads an unfilled coordinate pair
  // from the caller's registers. Retain that dependency until context is mapped.
  if(available.length!==2){a.aiHandoff='weapon-register-context';return false;}
  const selected=Math.abs(x(available[1])-x(a))<Math.abs(x(available[0])-x(a))?available[1]:available[0];
  a.heldObject=selected;
  if(Math.abs(x(selected)-x(a))>=a.aiDistanceX)return this.assist();
  if(this.choose(tables.weaponPickWeights[type(a)][this.w.round])!==0)return this.assist();
  a.action=112;a.targetX=x(selected);a.targetY=y(selected);a.change(1);a.walkMode=10;return true;
 }
 idle(){ // $01b50c
  const a=this.a;
  if(a.pendingState)return true;
  this.face();a.walkMode=a.holdFlags=a.timer=0;a.flags32&=0xfb;a.flags33&=0xa7;
  setFlag(a,flag(a)&0xcb);a.inputBlockB&=0xf1fd;a.flagsB7&=~32;
  if(this.w.mode&1){const prior=a.flagsB6&64;a.flagsB6&=~64;if(prior&&!(flag(a)&128)){a.flagsB6|=128;return true;}}
  if(a.flagsB6&16){if(this.w.mode&2){a.flagsB6&=~16;a.change(5,108);}return true;}
  if((a.flags34&16)&&!(flag(a)&8)){a.change(5,121);return true;}
  if(a.flags34&4)return this.assist();
  if(a.flagsB7&1){a.flagsB7&=~1;a.change(5);return true;}
  if(a.flagsB7&16){a.flagsB7&=~16;a.action=a.controlCounter;a.change(5);return true;}
  if(a.flagsB7&128){
   if(this.choose(tables.idleJumpWeights)===0){this.jumpPosition();return true;}
   if(this.jumpBlocked())return true;
   a.flagsB7&=~128;a.change(5,62);return true;
  }
  if(flag(a)&128)return this.assist();
  const p=a.opponent;
  if((a.flags33&1)&&!(p.flags33&1)&&(p.flags32&1)){this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;return true;}
  if(a.aiFlagsB9&1){if(p.flags33&64){a.flagsB6|=128;return true;}a.aiFlagsB9&=~1;}
  if(p.flags34&16){a.flagsB6|=128;return true;}
  if(flag(a)&8){
   if(!(p.flags33&16)){setFlag(a,flag(a)&~8);return this.assist();}
   if(game(this.w)&&!(a.flags33&4)&&!(a.flagsB7&4)){
    a.flagsB7|=4;
    if((a.region<3&&(a.facing&0x8000))||(a.region>=9&&!(a.facing&0x8000))){
     if(this.choose(tables.retreatWeights[0])===0){setFlag(a,flag(a)&~8);return this.run(true);}
    }
   }else if(game(this.w)&&!(a.flags33&4))a.flagsB7|=4;
   if(!(a.flagsB7&8)){
    if(this.attract()){
     a.flagsB7|=8;a.action=a.demoAction;a.flags33&=~16;a.action|=0x4000;setFlag(a,flag(a)|16);
     const result=this.action();a.action&=255;if(a.flags33&16)return this.run(true);return result;
    }
    if(sameFace(a,p))return true;
    a.flagsB7|=8;
    if(a.aiDistanceX<104){setFlag(a,flag(a)&~8);if(!this.select(0,true))return false;}
    else{
     a.flags33&=~16;if(!this.select(a.aiDistanceX<176?1:2,true))return false;
     a.action&=255;a.change(0);if(a.flags33&16)return this.run();
    }
   }
   return this.attackDistance();
  }
  if((a.flags34&2)&&this.retreat())return true;
  if(flag(a)&64){
   if(!p.health)setFlag(a,flag(a)&~64);
   else if(!(p.state===4&&(p.reaction&255)===1)){
    const partner=a.partner;
    if(partner.state===1&&[1,2].includes(partner.walkMode&255)||partner.state===5&&(partner.action&255)===113){
     if(partner.state===5){partner.flagsC6&=~64;partner.flags33|=32;}
     a.change(1);a.walkMode=8;return true;
    }
   }
  }else this.s.tag(a);
  return this.outsideIdle();
 }
 horizontal(){direction(this.a,flag(this.a)&1?64:192);return true;}
 diagonal(){
  const a=this.a;if(a.opponent.flags33&16)return this.horizontal();
  direction(a,flag(a)&2?(flag(a)&1?32:224):(flag(a)&1?96:160));return true;
 }
 waitOrHorizontal(){if((this.a.flags34&2)&&this.retreat())return true;return this.horizontal();}
 releaseHuman(){
  const a=this.a;a.flags56&=~64;if(!(a.partner.flags33&2))a.flags35|=8;a.change(0);return true;
 }
 joinPartner(){
  const a=this.a;if(Math.abs(x(a.partner)-x(a))>=160)return this.run();
  a.flags34&=~4;return a.flags33&2?this.releaseHuman():this.horizontal();
 }
 beginRush(){this.a.movementMode=0;this.a.change(5,117);return true;}
 counterOrRush(){return this.a.opponent.state!==5||[5,42,45,32,65].includes(this.a.opponent.action&255)?this.select(0,true):this.beginRush();}
 weaponAttack(){
  const a=this.a,p=a.opponent;
  if(p.state===4&&[8,9].includes(p.reaction&255)){a.flagsB7&=~64;a.flagsB7|=64;a.change(5,61);}
  else a.change(5,30);return true;
 }
 tryRun(){ // $01e536
  const a=this.a,far=a.aiDistanceX>=224;
  if(far){
   if((a.flags33&4)||(a.flagsB6&4))return false;a.flagsB6|=4;
   if(this.choose(tables.retreatWeights[type(a)])!==0)return false;this.run(true);return true;
  }
  if(a.aiDistanceX>=200||(a.flagsB6&2))return false;a.flagsB6|=2;
  if(this.choose(tables.chargeWeights[type(a)])!==0)return false;this.run();return true;
 }
 cornerOpportunity(group){ // $01e3d2
  const a=this.a,p=a.opponent;
  if((this.w.mode&2)||(a.flagsB6&1)||!p.severity||(a.flags56&64))return this.select(group);
  const px=x(p),py=y(p);let corner=-1;
  if(!(p.facing&0x8000)){
   if(px<528){if(py>=368)corner=0;else if(px<512&&py<336)corner=2;}
   else if(px>=608){if(py>=368)corner=1;else if(px>=616&&py<336)corner=3;}
  }else if(px<648){if(py>=368)corner=0;else if(px<632&&py<336)corner=2;}
  else if(px>=728){if(py>=368)corner=1;else if(px>=736&&py<336)corner=3;}
  if(corner<0)return this.select(group);a.controlCounter=corner;
  if(this.choose(tables.cornerAttackWeights[type(a)][p.severity===1?0:1])!==0)return this.select(group);
  p.recoveryTimer=u16(p.recoveryTimer+256);p.mash=(p.mash&0xff00)|((p.mash+20)&255);a.change(1);a.walkMode=9;return true;
 }
 assistAttack(){ // $01e7d8
  const a=this.a,p=a.opponent;a.aiFlagsB9=(a.aiFlagsB9||0)&~2;
  if(p.state!==5)return this.assistLost();
  if((p.action&255)===74&&(this.w.mode&1)){a.action=73;return this.approachAction();}
  const rowIndex=tables.assistanceAttackIds.indexOf(p.action&255);if(rowIndex<0)return this.assistLost();
  const row=tables.assistanceMoves[type(a)][rowIndex];lowAction(a,row.actions[this.choose(row.weights[p.severity])]);
  if((a.action&255)===62&&this.probeX(a.facing&0x8000?-184:184))lowAction(a,0);
  a.action&=255;
  const facingBlocked=[28,29].includes(p.action&255)?!sameFace(a,p):(p.action&255)===83?sameFace(a,p):false;
  if(facingBlocked){
   const old=a.xFixed;a.xFixed=addPositionWord(old,u16(x(p)+(flag(a)&1?32:-32))-x(a));
   a.collision={...a.collision,kind:0,flags:0};a.collision=a.collisionAt();a.xFixed=old;
   if(!a.collision.flags){setFlag(a,flag(a)|32);a.change(1);a.walkMode=5;return true;}
  }
  setFlag(a,flag(a)&~16);a.change(5);return this.action();
 }
 assistLost(){
  const a=this.a;this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;a.flagsB6|=128;setFlag(a,flag(a)&~128);a.change(0);return true;
 }
 walk0(){ // $01bb7e-$01c284
  const a=this.a;a.flagsB7&=~128;this.face();let p=a.opponent;
  if(this.w.mode&1){
   const previous=a.flagsB6&64;a.flagsB6&=~64;
   if(previous&&!(flag(a)&128)||!p.active||(p.flags33&4)||(p.flags32&16)){a.flagsB6|=128;a.change(0);return true;}
  }else if(!(a.flags33&4)&&(p.flags33&4)){
   if(a.flags33&1){
    if(!(p.flags33&1)){a.opponent=p.partner;this.s.measure(a);this.face();this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;}
    else if(this.choose(tables.outsideEntryWeights)===0){a.flagsB6|=16;a.change(0);return true;}
    else{a.flagsB7|=64;a.change(5,61);return true;}
   }else if(!(p.flags33&1)){
    a.opponent=p.partner;this.s.measure(a);this.face();if(a.opponent.flags33&64){a.flagsB6|=32;a.change(0);return true;}
   }
  }else if((a.flags33&4)&&!(p.flags33&4)){
   if(a.flags33&1){setFlag(a,flag(a)|32);a.action=105;a.targetX=784;a.targetY=319;a.change(1);a.walkMode=10;}
   else a.opponent=p.partner;return true;
  }
  a.flagsB6&=~32;p=a.opponent;
  if(p.flags32&2){
   [a.targetX,a.targetY]=tables.cornerChasePositions[p.holdFlags];a.action=61;a.walkMode=10;
   // $01bf54 clears only the high state byte: this walk re-enters next frame.
   a.pendingState=true;setFlag(a,flag(a)|32);a.flagsB7|=96;return true;
  }
  const band=a.inputBlockA>>>8;
  if(band===0&&a.aiDistanceY<12){
   const prior=a.flags34&4;a.flags34&=~4;if(prior&&(a.flags33&2))return this.releaseHuman();
   if(a.flags74&128)return this.weaponAttack();
   if(flag(a)&128)return this.assistAttack();
   if(a.aiFlagsB9&2){
    if([0,1].includes(p.state)&&(p.state!==1||(p.walkMode&255)===0)||p.state===4&&(p.reaction&255)===1)return this.waitOrHorizontal();
    a.aiFlagsB9&=~2;if(this.w.mode&1){a.change(0);a.flagsB6|=128;}return true;
   }
   if([0,1,7].includes(p.state))return this.select(0);
   if(p.state===5){
    if(p.flags33&16)return sameFace(a,p)?true:this.counterOrRush();
    if((p.action&255)===76){a.opponent=p.partner;a.flagsB7|=64;a.change(5,61);return true;}
    if((p.flags33&64)&&(this.w.mode&1)){a.flagsB6|=128;a.aiFlagsB9=(a.aiFlagsB9||0)|1;a.change(0);return true;}
    setFlag(a,flag(a)&~16);a.change(5,0);return this.action();
   }
   if(p.state===4){
    const reaction=p.reaction&255;
    if([0,10].includes(reaction))return this.select(0);
    if([8,9].includes(reaction)){
     const group=reaction===8?2:3;
     if(this.attract()){a.action=a.demoAction;a.change(5);setFlag(a,flag(a)&~16);a.flagsB7&=~64;return this.action();}
     if(!(this.w.mode&2)&&!p.health){a.action=72;a.change(5);setFlag(a,flag(a)&~16);return this.action();}
     return this.cornerOpportunity(group);
    }
    if(reaction===1){
     if(!sameFace(a,p))return this.select(5);
     if(!this.attract())return this.select(7);
     a.action=a.demoAction;a.change(5);setFlag(a,flag(a)&~16);return this.action();
    }
    a.flagsB7|=64;a.change(5,61);return true;
   }
   if(!(p.flags33&16)){a.flagsB7|=64;a.change(5,61);return true;}
   return sameFace(a,p)?this.waitOrHorizontal():this.select(0,true);
  }
  if(a.aiDistanceY>=12){
   if(band>1)return this.diagonal();
   if(p.state===5&&(p.action&255)===76){a.flagsB7|=64;a.change(5,61);return true;}
   if((this.w.mode&1)&&!(flag(a)&128)&&(p.flags33&64)){a.change(0);a.flagsB6|=128;a.aiFlagsB9=(a.aiFlagsB9||0)|1;return true;}
   return this.diagonal();
  }
  if(a.flags34&4)return this.joinPartner();
  if(a.flags74&128){
   if(a.aiDistanceX<104)return this.weaponAttack();
   if(a.aiDistanceX<144&&this.choose(tables.weaponMidWeights)===0){a.change(5,31);return true;}
   return this.horizontal();
  }
  if(band!==1){
   if(p.flags33&16){
    if(sameFace(a,p))return this.waitOrHorizontal();
    if((this.w.inputMode||0)!==1&&!(a.flags33&4)&&this.choose(tables.outsideDodgeWeights)!==0)return this.run(true);
   }else if(p.state===4&&(p.reaction&255)===1)return sameFace(a,p)?this.waitOrHorizontal():this.select(6);
   else if(!(p.flags32&1)&&this.tryRun())return true;
  }
  if(!(p.flags33&16)||sameFace(a,p))return this.waitOrHorizontal();
  if(a.aiDistanceX>=176||(a.aiDistanceX>=104&&p.state!==5)){a.change(5,60);return true;}
  if(a.aiDistanceX>=104){return p.state===5&&[45,32,65].includes(p.action&255)?this.select(0):this.beginRush();}
  return this.counterOrRush();
 }
 approachAction(kind='normal'){ // $01e680/$01e6f4/$01e744
  const a=this.a,p=a.opponent;let tx=x(p),ty=y(p),offset=kind==='wide'?160:72;
  if(kind==='close')tx=u16(tx+(p.facing&0x8000?8:-8));
  else if(kind==='normal'&&((p.flags35&1)||(p.state===5&&(p.action&255)===9))){
   if(p.state===5)tx=u16(tx+((p.action&255)===26?(p.facing&0x8000?-32:32):(p.facing&0x8000?32:-32)));
   ty=u16(ty+(ty<352?16:-16));
  }else{
   if((a.action&255)===61)ty=u16(ty+16);
   else if((p.reaction&255)!==8&&(p.action&255)!==97){ty=u16(ty-24);offset=kind==='wide'?96:48;}
   tx=u16(tx+(p.facing&0x8000?-offset:offset));
  }
  a.targetX=tx;a.targetY=ty;a.change(1);a.walkMode=10;setFlag(a,flag(a)&~32);return this.walk10();
 }
 walk10(){ // $01c7c2
  const a=this.a;if((a.flags34&2)&&this.retreat())return true;this.face();const p=a.opponent,action=a.action&255;
  if(action===112){
   if(!a.heldObject||a.heldObject.state!==3||a.heldObject.attached)return this.abortApproach();
  }else if(action!==105){
   if(flag(a)&32){
    if(p.flags33&16){a.flagsB7&=~32;return this.select(4);}
    if(!(a.flagsB7&32)){
     if([28,29].includes(action)&&!(p.state===4&&(p.reaction&255)===1)){
      a.controlCounter=0;setFlag(a,flag(a)&~32);a.flagsB7&=~32;a.flagsB6|=128;this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;a.change(0);a.walkMode=0;return true;
     }
     this.horizontal();if(a.aiDistanceX<a.controlCounter){a.controlCounter=0;setFlag(a,flag(a)&~32);a.flagsB7&=~32;a.change(5);a.action&=255;return this.action();}return true;
    }
   }else{
    if(!(p.flags35&3)&&!(p.state===5&&[97,74].includes(p.action&255))&&!(p.state===4&&[8,9].includes(p.reaction&255)))return this.abortApproach();
    if(a.collision?.flags){
     a.collision.flags=0;if(action===61)return this.commitApproach(true);
     if(game(this.w)){a.action=10;return this.approachAction();}
    }else return this.commitApproach();
   }
  }
  if(pursuePoint(a))return true;
  if(action===112)a.heldObject.attached=a;
  return this.commitApproach(true);
 }
 commitApproach(arrived=false){
  const a=this.a;if(!arrived&&pursuePoint(a))return true;
  a.change(5);setFlag(a,(flag(a)|16)&~32);a.flagsB7&=~32;a.action&=255;return this.action();
 }
 abortApproach(){const a=this.a;setFlag(a,flag(a)&~32);a.flagsB7&=~32;a.change(0);return true;}
 walkOther(mode){
  const a=this.a,p=a.opponent;
  if(mode===12)return true;
  if(mode===11){
   if(y(a)<224)return true;direction(a,192);if(x(a)>=633)return true;
   a.xFixed=addPositionWord(a.xFixed,633-x(a));direction(a,0);if(y(a)<256)return true;
   a.yFixed=addPositionWord(a.yFixed,256-y(a));if(a.flags56&128)a.flagsB6|=128;
   a.flags56&=~64;a.resultPose=0;a.change(5,105);return true;
  }
  if(mode===10)return this.walk10();
  if(mode>=5&&mode<=7){
   if((a.flags34&2)&&this.retreat()){if(mode===7)a.flagsB7&=~128;return true;}
   this.face();const initial=!(a.walkMode&0x2000);a.walkMode|=0x2000;
   if(mode===5){
    if(initial){setFlag(a,(flag(a)&~4)|(flag(a)&1?4:0));const lower=y(p)>(this.w.mode&2?288:352);direction(a,lower?(flag(a)&1?96:160):(flag(a)&1?32:224));}
    if(a.aiDistanceY>=18){a.walkMode=6;a.change(1);}return true;
   }
   if(mode===6){
    if(initial)direction(a,flag(a)&4?64:192);
    if(Boolean(flag(a)&4)!==Boolean(flag(a)&1)&&a.aiDistanceX>=24){a.walkMode=7;a.change(1);}return true;
   }
   if(initial){direction(a,flag(a)&2?32:96);if(!(flag(a)&4))a.direction=u16(-a.direction);}
   if(a.aiDistanceY<5){
    const wasApproach=flag(a)&32;setFlag(a,flag(a)&~32);a.flagsB7&=~128;
    if(wasApproach){a.flagsB7&=~2;setFlag(a,flag(a)&~16);a.change(5);a.action&=255;return this.action();}
    a.change(1);a.walkMode=0;
   }return true;
  }
  if(mode===8){
   this.face();const initial=!(a.walkMode&0x2000);a.walkMode|=0x2000;
   if(initial){a.partner.change(1);a.partner.walkMode=2;[a.targetX,a.targetY]=a.flags33&128?[776,296]:[512,400];}
   if(a.aiDistanceY<8){
    if((a.inputBlockA>>>8)===0){
     if([0,1].includes(p.state))return this.select(0);
     if([2,6].includes(p.state))return this.select(4);
     if(p.state===5&&(p.flags33&16))return sameFace(a,p)?true:([45,32,65].includes(p.action&255)?this.select(0,true):this.beginRush());
    }else if(p.flags33&16){a.change(5,60);return true;}
   }
   if(!pursuePoint(a)){a.movementMode=0;a.clock.remaining=(a.clock.remaining&0xff00)|96;if(a.partner.walkMode&0x8000){setFlag(a,flag(a)&~64);a.change(5,76);}}
   return true;
  }
  if(mode===9){
   this.face();const initial=!(a.walkMode&0x2000);a.walkMode|=0x2000;
   if(initial)[a.targetX,a.targetY]=tables.cornerWaitPositions[a.controlCounter];
   if(((this.w.cornerOccupancy||0)&(1<<a.controlCounter))||p.state!==4){a.change(0);return true;}
   if(!pursuePoint(a)){
    if(!a.cornerInput)a.cornerInput=0x8004;
    this.w.cornerOccupancy=(this.w.cornerOccupancy||0)|(1<<a.controlCounter);a.holdFlags=a.controlCounter;a.contact=0;a.change(8);
   }return true;
  }
  return false;
 }
 walk(){const mode=this.a.walkMode&255;return mode===0?this.walk0():this.walkOther(mode);}
 waitAirborne(){ // $01ddf4, persistent action-61 decisions
  const a=this.a,p=a.opponent,abort=()=>{a.change(0);this.w.controlsRefresh=(this.w.controlsRefresh||0)|1;return true;};
  if(this.w.mode&2){
   if(a.flags74&128)return [0,1].includes(p.state)||p.state===4&&[0,1,10].includes(p.reaction&255)?abort():true;
   if(!(a.flags56&32)&&(a.flags33&1)&&(this.w.outsideTimer||0)>=10){setFlag(a,flag(a)|32);a.action=105;a.targetX=784;a.targetY=312;a.change(1);a.walkMode=10;return true;}
  }
  if(p.flags32&16)return abort();if((a.flags34&2)&&this.retreat())return true;
  if((flag(a)&64)&&!(a.partner.flags34&1)&&(a.partner.flags32&1)){
   if(!p.health)setFlag(a,flag(a)&~64);else{a.change(1);a.walkMode=8;return true;}
  }
  if(flag(a)&128)return abort();
  if(a.flagsB7&64){
   if(!(a.flags33&4)&&(p.flags33&4))return true;
   if([0,1].includes(p.state))return abort();
   if(p.state===4)return [8,9].includes(p.reaction&255)?abort():true;
   if(p.state===5)return [76,77,13,12,18,17,15,27].includes(p.action&255)||(p.flags33&64)?true:abort();
   return (p.flags33&64)||(p.flags32&2)?true:abort();
  }
  if(!(flag(a)&16))return this.approachAction('wide');
  return p.state===4&&[8,9].includes(p.reaction&255)?true:abort();
 }
 running(){ // $01c9d6, with the separate brake/rebound decisions
  const a=this.a,p=a.opponent;
  if(a.state===3){if(!a.pendingState&&(a.flagsB7&1))a.speed=u16(a.speed-2);return true;}
  if(a.state===6){
   if(!game(this.w)||!(a.holdFlags&255))return true;
   if(a.pendingState){
    setFlag(a,flag(a)&~16);
    if(this.choose(tables.reboundAttackWeights[this.w.round][a.severity])===0)setFlag(a,flag(a)|16);
    else{a.controlCounter=0;a.flagsB7&=~2;}
   }else{
    const previous=flag(a)&16;setFlag(a,flag(a)&~16);if(previous){a.holdFlags=0;a.change(5,63);}
   }return true;
  }
  if(a.pendingState)return true;
  if(a.holdFlags&255){
   if((a.holdFlags&255)===2){
    if((this.w.mode&2)&&a.aiDistanceX>=192){a.change(3);return true;}
    a.controlCounter=0;a.flagsB7&=~1;return true;
   }
   if(!game(this.w)&&!(this.w.mode&1))return true;
   if(sameFace(a,p))a.flagsB7&=~2;
   else if(a.aiDistanceY<10&&a.aiDistanceX<160&&!(a.flagsB7&2)){
    a.flagsB7|=2;a.controlCounter=0;
    if((p.flags33&16)||(p.state===5&&(p.action&255)===3)){
     if(this.choose(tables.runningAttackWeights[0][type(a)][Math.min(this.w.round,5)][a.severity])===0){
      a.flags32|=4;a.action=117;a.controlCounter=80;
     }
    }else{
     const weights=this.w.mode&1?tables.rumbleRunningAttackWeights[type(a)][a.severity]:tables.runningAttackWeights[1][type(a)][Math.min(this.w.round,5)][a.severity];
     if(this.choose(weights)!==0)return true;
     a.action=114;a.flagsB7|=1;a.controlCounter=72;
    }
   }
   if(a.controlCounter&&a.controlCounter>=a.aiDistanceX){if(a.flagsB7&1)a.change(3);else{a.flagsB7&=~2;a.change(5);}}return true;
  }
  if(a.flags34&4){
   const busy=(this.w.actors||[]).find(p=>p.active&&(p.flags35&3));
   if(busy&&Math.abs(x(busy)-x(a))>=128)return true;
   a.flags34&=~4;if(a.flags33&2){a.flags56&=~64;if(!(a.partner.flags33&2))a.flags35|=8;}
   a.change(3);return true;
  }
  if(a.flags32&4)return true;
  if(p.flags32&1){this.w.controlsRefresh=1;a.change(3);return true;}
  if(a.aiDistanceY>=8){a.change(3);return true;}
  if(!(a.flagsB7&2)&&!(flag(a)&8)){
   a.flagsB7|=2;if(!this.select(8))return false;a.state=2;a.pendingState=false;
  }else a.flagsB7|=2;
  if(p.state===4&&![0,1,10].includes(p.reaction&255)&&!(flag(p)&128)){this.w.controlsRefresh=1;a.change(3);return true;}
  if(a.aiDistanceX<a.controlCounter){setFlag(a,flag(a)&~8);a.change(5);a.action&=255;return this.action();}
  if((p.flags33&64)||(p.flags32&2)){a.change(3);return true;}
  if(p.state===5&&[72,26,35].includes(p.action&255))a.change(3);
  return true;
 }
}

export const supportsGroundAction=handler=>[0x1d51c,0x1d4ce,0x1d924,0x1d934,0x1d964,0x1d974,
 0x1d700,0x1d71c,0x1d738,0x1d750,0x1d758,0x1d760,0x1d788,
 0x1d7d4,0x1d81c,0x1d852,0x1d88a,0x1d896,0x1d8a2,0x1d8ca,0x1d902,0x1d9b8,0x1dd88,0x1ddf4,0x1d650].includes(handler);
export function stepGroundAction(actor,handler,services){
 const c=new GroundComputer(actor,services),peer=actor.opponent;
 if(handler===0x1ddf4)return c.waitAirborne();
 if(handler===0x1d650){c.face();if(!(peer.flags33&16)||sameFace(actor,peer))actor.change(0);return true;}
 if(handler===0x1dd88){
  if(peer.state===4&&(peer.reaction&255)===1||peer.state===5&&[82,83].includes(peer.action&255)){
   if(actor.aiDistanceX>=128)return c.run();
   actor.collision={...actor.collision,kind:0,flags:0};actor.collision=actor.collisionAt();if(!actor.collision.flags)return true;
  }
  actor.change(0);actor.world.controlsRefresh=(actor.world.controlsRefresh||0)|1;return true;
 }
 const link=()=>{if(!(actor.action&0x4000)){actor.action|=0x4000;actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;}return true;};
 if(handler===0x1d902){setFlag(actor,flag(actor)|16);return link();}
 if(handler===0x1d8a2){
  if(!(actor.action&0x4000)){actor.action|=0x4000;actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;else if(!peer.secondaryPinner)peer.secondaryPinner=actor;}return true;
 }
 if(handler===0x1d9b8){
  const prior=flag(actor)&16;setFlag(actor,flag(actor)|16);
  if(!prior&&actor.aiDistanceX>=40){actor.controlCounter=40;actor.change(1);actor.walkMode=10;setFlag(actor,flag(actor)|32);return c.walk10();}
  if(actor.action&0x4000)return true;actor.action|=0x4000;
  if([43,48].includes(actor.action&255)&&peer.state===4&&(peer.reaction&255)===1)actor.timer=u16(actor.timer+256);
  actor.auxiliary=peer;if(peer.auxiliary)return true;peer.auxiliary=actor;
  if((actor.action&255)===29){
   if(actor.world.mode&1){
    if(selectRumbleAssistant(actor)){peer.assistanceTarget=actor.auxiliary;actor.assistanceTarget=peer;return true;}
   }else if(peer.flags33&1)return true;
   lowAction(actor,28);
  }return true;
 }
 if(handler===0x1d7d4){
  if(flag(actor)&16){if(!(actor.action&0x4000))peer.opponent=actor;return link();}
  return c.approachAction(x(peer)>=512&&x(peer)<768?'close':'normal');
 }
 if([0x1d81c,0x1d852,0x1d88a,0x1d896,0x1d8ca].includes(handler)){
  if((flag(actor)&16)||(handler===0x1d852&&!game(actor.world)))return link();
  if(handler===0x1d896)return c.approachAction('close');
  if(handler===0x1d8ca){if((actor.world.mode&2)||!game(actor.world)||!(peer.flags33&1)||!(actor.flags33&1))lowAction(actor,10);return c.approachAction();}
  if(handler===0x1d81c||handler===0x1d852){
   const outside=peer.facing&0x8000?x(peer)<(handler===0x1d81c?608:592):x(peer)>=(handler===0x1d81c?656:672);
   if(!outside)return c.approachAction('wide');actor.action=10;
  }
  return c.approachAction();
 }
 if([0x1d700,0x1d71c,0x1d738,0x1d750,0x1d758,0x1d760,0x1d788].includes(handler)){
  let distance=handler===0x1d700?tables.actionApproachDistances[1][type(peer)]:handler===0x1d71c?tables.actionApproachDistances[0][type(peer)]
   :handler===0x1d738?92+(type(peer)===7?4:0):handler===0x1d750?96:handler===0x1d758?112:handler===0x1d788?168:120;
  if(handler===0x1d760){if(type(peer)===7)distance=128;if(type(actor)===8)distance=(distance&0xff00)|((distance-6)&255);}
  actor.controlCounter=u16(distance-(peer.flags33&16?0:34));actor.flags33|=16;return true;
 }
 const entry=!(flag(actor)&16);setFlag(actor,flag(actor)|16);
 if(!entry){
  if([0x1d924,0x1d934,0x1d964,0x1d974].includes(handler)&&!(actor.action&0x4000)){
   actor.action|=0x4000;actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;
  }
  return true;
 }
 const buffer=distance=>{
  actor.controlCounter=distance;setFlag(actor,flag(actor)|8);actor.flagsB7|=12;actor.change(0);return c.attackDistance();
 };
 if(handler===0x1d51c||handler===0x1d4ce){
  if(peer.flags33&16)return buffer(112);
  const distance=handler===0x1d51c?48:40;
  if((peer.flags33&64)&&actor.aiDistanceX>=distance){actor.controlCounter=distance;setFlag(actor,flag(actor)|32);actor.change(1);actor.walkMode=10;}
  return true;
 }
 let distance=handler===0x1d924?128:handler===0x1d974?96:112;
 if(handler===0x1d934){if(type(peer)!==7)distance-=8;if(type(peer)===8)distance-=8;}
 return buffer(distance);
}
