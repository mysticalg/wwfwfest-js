import {actorTables as tables} from '../data/actor-tables.js';
import {participantFacing} from './facing.js';

const u16=v=>v&65535,x=a=>a.xFixed>>>16,y=a=>a.yFixed>>>16;
const action=a=>a.action&255;
const rawState=a=>a.state|(a.pendingState?0:0x8000)|(a.state===2&&a.inputInitialized?0x4000:0);
const link=(a,p)=>{a.auxiliary=p;a.unlinkMarked=false;if(!p.auxiliary){p.auxiliary=a;p.unlinkMarked=false;}};
const wordAction=(a,v)=>{a.change(5,v);};

// $00db98. Lower edges are exclusive, upper edges inclusive, and every
// coordinate addition wraps as an unsigned word before the comparison.
export function humanMoveBounds(a,p,kind){
 let [left,right,bottom,top]=tables.moveBounds[kind];
 if(p.facing&0x8000)[left,right]=[-right,-left];
 return x(a)>u16(x(p)+left)&&x(a)<=u16(x(p)+right)&&y(a)>u16(y(p)+bottom)&&y(a)<=u16(y(p)+top);
}

class HumanControl {
 constructor(a){this.a=a;this.w=a.world;this.buttons=a.pressedButtons&3;this.mask=a.inputMask&15;}
 tag(){ // $00cf42
  const a=this.a,p=a.partner;
  if(!this.buttons||(this.w.mode&3)||(a.flags32&1)||p?.state!==1||(p.walkMode&0x80ff)!==0x8002)return false;
  if(a.flags33&128?x(a)<752||y(a)>=302:x(a)>=544||y(a)<390)return false;
  if([0,1].includes(a.state)){wordAction(a,76);return true;}
  if(a.state===5&&[21,22].includes(action(a))){wordAction(a,102);return true;}
  return false;
 }
 escape(){ // $00de04
  const a=this.a,p=a.opponent;
  if(a.mash!==0x4000)return false;
  let next;
  if(a.state===5&&[74,81].includes(action(a)))next=75;
  else if(!(p.flags34&16)&&a.state===4&&(a.reaction&255)===8)next=56;
  else if(!(p.flags34&16)&&a.state===4&&(a.reaction&255)===9){
   const peer=a.auxiliary;
   if(peer?.state===5&&[53,14,15,35].includes(action(peer))&&!(peer.action&0x1000))return false;
   next=120;
  }else if(a.state===5)next=({93:103,94:86,95:92,96:91,97:89,98:90,99:85,82:88,83:87,100:75})[action(a)];
  if(next===undefined)return false;wordAction(a,next);a.mash=0;return true;
 }
 weapon(){ // $00e2fa/$00e346/$00e36e
  const a=this.a;
  if(!(this.w.mode&2)||(a.flags74&128)||!(a.flags33&4)||![0,1].includes(a.state))return false;
  for(const p of this.w.weapons||[]){
   if(p.attached||(p.clock.flags&255)!==3||((Math.abs(y(p)-y(a))&255)>=32)||Math.abs(x(p)-x(a))>=32)continue;
   p.attached=a;a.heldObject=p;wordAction(a,112);return true;
  }
  return false;
 }
 rescue(){ // $00dc82, returned action bypasses ordinary row/bounds selection
  const a=this.a,p=a.opponent;
  if(a.flags74&128)return null;
  if([0,1].includes(a.state)){
   if(p.state!==5)return null;
   const value=p.action&0x80ff;
   if([0x8009,0x801a,0x800f,0x800e].includes(value)){
    if(!humanMoveBounds(a,p,[0x8009,0x801a].includes(value)?3:0))return null;
    link(a,p);return 10;
   }
   if([0x8022,0x803b].includes(value)){link(a,p);return 114;}
   if(value===0x8048){
    const victim=p.auxiliary;
    if(victim&&!victim.secondaryPinner&&!(victim.action&0x2000)){
     const next=(this.w.mode&1)&&a.pressedButtons!==1?73:10;
     const bounds=next===73?14:(victim.reaction&255)===8?15:16;
     if(humanMoveBounds(a,p,bounds)){
      a.auxiliary=next===10?p:victim;a.unlinkMarked=false;
      if(next===73)victim.secondaryPinner=a;
      return next;
     }
    }
   }
   if(value===0x8049&&humanMoveBounds(a,p,13)){a.auxiliary=p;a.unlinkMarked=false;p.secondaryPinner=a;return 10;}
   return null;
  }
  if(rawState(a)===0x8006&&a.holdFlags&&!(a.clock.index&255))return a.contest(2)?63:null;
  if(a.state===5&&action(a)===123){
   const attempted=a.action&0x8000;a.action|=0x8000;
   if(!attempted&&a.contest(0))return 124;
  }
  return null;
 }
 selectRow(){ // $00d242-$00d73a, in the original priority order
  const a=this.a,p=a.opponent,standing=[0,1].includes(a.state);
  if(a.flags32&1){if(a.state===1&&(a.walkMode&255)===1){link(a,p);return 19;}return null;}
  if((a.flags74&128)&&standing)return 17;
  if(!(a.flags34&2)&&a.state===2&&!a.holdFlags)return this.alternate(tables.runningMoveRows,p.severity);
  if(!(a.flags34&2)&&standing&&!p.auxiliary&&p.state===4&&[6,7,8,9].includes(p.reaction&255)){
   const row=[6,8].includes(p.reaction&255)?5:p.severity?7:6;link(a,p);return row;
  }
  if(a.state===11&&!(a.holdFlags&0x6000)){a.auxiliary.holdFlags|=0x4000;return 8;}
  if(a.state===12&&(a.holdFlags&255)===1){a.holdFlags=0;return 9;}
  if(a.state===5&&[21,22].includes(action(a))){
   a.holdFlags=a.timer=0;this.remap=true;
   const severity=a.auxiliary.severity,mask=1<<severity,prior=a.moveToggle&mask;a.moveToggle^=mask;
   return tables.grappleFollowRows[severity*24+(prior?12:0)+a.type];
  }
  if(a.state===9){
   if(this.w.mode&2)a.flags33|=4;
   const prone=p.state===4&&[8,9].includes(p.reaction&255)||p.state===5&&action(p)===97;
   link(a,p);return prone?15:14;
  }
  if(!(a.flags34&32)&&(p.flags33&16)&&standing){this.remap=true;const row=this.alternate(tables.humanChargeRows,p.severity);link(a,p);return row;}
  if(!(a.flags34&32)&&(a.state===0||a.state===1&&!(a.walkMode&255))&&!p.auxiliary
   &&p.state===4&&(p.reaction&255)===1&&Math.abs(y(a)-y(p))<16&&Math.abs(x(a)-x(p))<80
   &&(a.facing>>>8)===(p.facing>>>8)){link(a,p);p.comboCount=0;return 16;}
  if(standing&&p.state===5&&action(p)===97){link(a,p);return 18;}
  if(standing&&p.state===5&&[37,54,83,82].includes(action(p))){link(a,p);return 20;}
  if((a.flags32&1)&&a.state===1&&(a.walkMode&255)===1){link(a,p);return 19;}
  if(!(a.flags34&2)&&!(a.flags32&1)&&standing)return 0;
  return null;
 }
 alternate(rows,severity){const a=this.a,prior=a.moveToggle&128;a.moveToggle^=128;return rows[(prior?36:0)+severity*12+a.type];}
 remapAction(value){
  const a=this.a,side=tables.grappleRegionSides[a.region];
  if(side===255)return value;
  for(const[required,from,to]of tables.grappleMoveRemaps[a.type])if(value===from){if(required===(side^Boolean(a.facing&0x8000)))value=to;break;}
  return value;
 }
 pressBounds(value){ // $00e1da, including punch/kick/run fallbacks
  const a=this.a,p=a.opponent,rule=value<74?tables.humanPressBounds[value]:0;
  if(!rule)return {value};
  if(!(rule&128)){if(humanMoveBounds(a,p,rule))return {value};}
  else{
   if(humanMoveBounds(a,p,value===8?1:12))return {value:value===8?value:tables.humanRescueFallbacks[a.type]};
   if(humanMoveBounds(a,p,value===8?3:2))return {value:value===8?10:value};
  }
  if(a.pressedButtons===3)a.change(2);
  else wordAction(a,a.pressedButtons===1?0:114);
  return {handled:true};
 }
 moves(){ // $00d0c6
  const a=this.a,p=a.opponent;
  if((this.w.mode&2)&&!(a.flags32&2)&&!(a.flags33&4)||!this.buttons)return false;
  if(this.escape()||this.weapon())return true;
  if(a.state===4)return false;
  if(!(a.flags32&1)){
   const rescue=this.rescue();if(rescue!==null){wordAction(a,rescue);return true;}
   if(!(p.flags35&7)){
    const standing=a.state===0||a.state===1&&!(a.walkMode&255),next=standing?a.secondaryOpponent:p;
    if(next&&(!standing||next.state===4&&[8,9].includes(next.reaction&255))&&humanMoveBounds(a,next,0)){
     a.secondaryOpponent=p;a.opponent=next;
    }
   }
  }
  const row=this.selectRow();if(row===null)return false;
  let value=tables.standingMoveTables[a.type][row*3+this.buttons-1];
  if(value===255){a.change(2);a.auxiliary=null;a.unlinkMarked=false;return true;}
  if(value===72&&(!(a.opponent.flags33&1)||!(a.flags33&1)||(a.flags33&4)))value=10;
  const result=this.pressBounds(value);if(result.handled)return true;
  value=this.remap?this.remapAction(result.value):result.value;wordAction(a,value);return true;
 }
 directionGate(mask){ // $00e1aa
  const a=this.a;
  if(!(mask&this.mask)){a.cornerInput=0;return false;}
  if(!(a.cornerInput&0x8000))a.cornerInput=0x8004;
  a.cornerInput=(a.cornerInput&0xff00)|((a.cornerInput-1)&255);
  if(!(a.cornerInput&255)){a.cornerInput=0;return true;}return false;
 }
 mount(corner){ // $00e10e; return true on a successful claim
  const a=this.a,bit=1<<corner;
  if(this.w.cornerOccupancy&bit)return false;
  if(!a.cornerInput)a.cornerInput=0x8004;
  this.w.cornerOccupancy=(this.w.cornerOccupancy||0)|bit;a.holdFlags=corner;a.contact=0;a.change(8);return true;
 }
 corner(){ // $00e000
  const a=this.a;
  if((a.flags34&1)||(a.flags33&4)||!(a.collision.flags&3)||this.w.cornerOccupancy)return false;
  if(this.w.mode&2){if(x(a)>=975&&this.mount(9))return true;if(x(a)<625&&this.mount(8))return true;return false;}
  for(const[test,mask,corner]of [[x(a)<453&&y(a)<282,8,2],[x(a)>=811&&y(a)<282,8,3],
   [x(a)<497&&y(a)>=407,4,0],[x(a)>=764&&y(a)>=407,4,1]])if(test&&this.directionGate(mask)&&this.mount(corner))return true;
  return false;
 }
 outside(){ // $00e14a
  const a=this.a;
  if(!(this.w.mode&2)||!(a.flags33&1)||a.collision.kind!==4)return false;
  if(this.directionGate(a.flags33&4?4:8)){wordAction(a,a.flags33&4?105:108);return true;}return false;
 }
 locomotion(){ // $00d008
  const a=this.a;if((a.flags32&1)||(a.flags34&2))return;
  if([0,1].includes(a.state)){
   if(this.mask){if(!this.corner()&&!this.outside()&&a.state!==1)a.change(1);}
   else if(a.state!==0)a.change(0);
  }else if(a.state===5&&action(a)===21&&this.mask)wordAction(a,22);
  else if(a.state===5&&action(a)===22&&!this.mask){wordAction(a,21);a.holdFlags=1;a.direction=0;}
 }
 selector(){ // $00cf1e
  const a=this.a;if(a.pendingState||a.forced)return;
  if(!this.tag()&&!this.moves())this.locomotion();
 }
 partnerPrompt(){ // $0100c6
  const a=this.a,p=a.partner;
  if((this.w.mode&1)||!(a.flags33&1)||(a.flags33&4)||!p||(p.flags32&1)===0)return;
  const near=a.flags33&128?x(a)>768&&y(a)<336:x(a)<560&&y(a)>368;
  if(!near){if(p.state===1&&(p.walkMode&255)===2){p.change(1);p.walkMode=(p.walkMode&0xff00)|1;}return;}
  if(p.state===1&&(p.walkMode&255)===1||p.state===5&&action(p)===113){
   if(p.state===5){p.flagsC6&=~64;p.flags33|=32;}
   p.change(1);p.walkMode=(p.walkMode&0xff00)|2;
  }
 }
 after(){ // $00e424 state input dispatch
  const a=this.a;
  if(a.state===0||a.state===1&&(a.walkMode&63)===0){
   if(a.flags34&2){if(a.flags33&1)a.flags34&=~2;else{a.change(1);a.walkMode=4;}}
   else{
    if(a.state===1)a.direction=tables.inputDirections[this.mask];
    a.facing=participantFacing(a,a.opponent);if(a.state===1)this.partnerPrompt();
   }
  }else if(a.state===1){
   const mode=a.walkMode&63;
   if(mode===1){a.direction=this.mask&4?8:this.mask&8?136:0;if(a.direction&&(a.flags33&128))a.direction^=255;}
   else if(mode>=5&&mode<=10){a.change(0);a.walkMode=0;a.auxiliary=null;a.unlinkMarked=false;}
  }else if(a.state===2)a.runInput(this.mask);
  else if(a.state===5){
   if([60,61,62].includes(action(a)))a.change(0);
   else if(action(a)===22){a.direction=tables.inputDirections[this.mask];this.partnerPrompt();}
  }else if(a.state===9&&(this.mask&8))a.change(10);
 }
}

// One actor from $00e3ca. Hardware button-edge sampling belongs to ArcadeInput;
// this phase consumes the sampled press byte and current joystick word.
export function stepHumanInput(actor,{pressed=0,mask=0}={}){
 if(!actor.active||(actor.flags56&0xc0))return false;
 actor.pressedButtons=pressed&255;actor.inputMask=mask&15;
 const control=new HumanControl(actor);
 if((actor.flags33&2)&&!(actor.flags34&4))control.selector();
 actor.inputBlockA=actor.inputBlockB=0;
 if(actor.state!==255)control.after();
 return true;
}

export function selectHumanMove(actor,{pressed=0,mask=0}={}){
 actor.pressedButtons=pressed&255;actor.inputMask=mask&15;new HumanControl(actor).selector();return actor;
}
