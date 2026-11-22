import {aiTables} from '../data/ai-tables.js';
import {pursuePoint} from './grapple-services.js';
import {addPositionWord} from './ring-collision.js';

const u16=value=>value&65535;
const flags=actor=>(actor.inputBlockA||0)&255;
const setFlags=(actor,value)=>{actor.inputBlockA=((actor.inputBlockA||0)&0xff00)|(value&255);};
const delay=actor=>actor.controlCounter&255;
const setDelay=(actor,value)=>{actor.controlCounter=(actor.controlCounter&0xff00)|(value&255);};
const gameFlags=world=>world.gameFlags??(world.inGame?0x8000:0);
const lateMatch=world=>(world.clockMinutesBCD??0x30)<0x10;
const random=(actor,context={})=>actor.random('ai',context)&255;

// $0024dc: reject the upper 28% of each byte, at most four draws. The source
// uses a byte accumulator and an inclusive cumulative-weight comparison.
export function computerWeightedChoice(actor,weights){
 let value=50;
 for(let attempt=3;attempt>=0;attempt--){
  const candidate=random(actor,{weighted:true,attempt})>>>1;
  if(candidate<100){value=candidate||1;break;}
 }
 let sum=0;
 for(let index=0;index<weights.length;index++){
  sum=(sum+weights[index])&255;if(sum>=value)return index;
 }
 throw new RangeError('Original AI probability row does not cover its draw');
}

// $01b468. These distances and strategy bits are AI-owned. The back-down
// anchor is 40 here, whereas the separate $fe28 facing service uses 16.
export function updateComputerTarget(actor){
 const peer=actor.opponent;if(!peer)return;
 let peerX=peer.xFixed>>>16;
 if(peer.state===4){
  const offset=(peer.reaction&255)===8?64:(peer.reaction&255)===9?40:0;
  peerX=u16(peerX+(peer.facing&0x8000?-offset:offset));
 }
 const x=actor.xFixed>>>16,ownY=u16((actor.yFixed>>>16)+(peer.state===5&&(peer.action&255)===34?8:0)),y=peer.yFixed>>>16;
 let strategy=flags(actor)&~3;if(peerX>=x)strategy|=1;if(ownY<y)strategy|=2;
 actor.aiDistanceX=Math.abs(peerX-x);actor.aiDistanceY=Math.abs(ownY-y);
 actor.inputBlockA=((actor.aiDistanceX<80?0:actor.aiDistanceX<176?1:2)<<8)|strategy;
}

function selectMove(actor,group){
 const peer=actor.auxiliary,region=actor.region<3?0:actor.region<9?1:2;
 const entry=aiTables[group===1?'clinchMoves':'headlockMoves'][actor.flags57??actor.type][actor.facing&0x8000?1:0][region];
 const severity=lateMatch(actor.world)?2:peer.severity;
 return entry.actions[computerWeightedChoice(actor,entry.weights[severity])];
}

// $01ea16's attract-mode scripted choice is separate from gameplay tables.
// Its data and scene progression have not yet been translated.
function selectedAction(actor,group){
 const world=actor.world;
 if(!gameFlags(world)&&!(world.mode&1)&&actor.opponent.health<actor.health){
  actor.aiHandoff='attract-script';return false;
 }
 if(flags(actor)&128)actor.action=(actor.action&0xff00)|aiTables.assistanceMoves[actor.flags57??actor.type];
 else actor.action=selectMove(actor,group);
 actor.change(5);setFlags(actor,flags(actor)|16);actor.flagsB7|=2;
 actor.holdFlags=actor.timer=0;return stepComputerAction(actor);
}

function headlock(actor){ // $01da60
 const entry=!(actor.action&0x4000);actor.action|=0x4000;
 if(entry){actor.controlCounter=16;actor.timer=0;}
 actor.controlCounter=u16(actor.controlCounter-1);if(actor.controlCounter)return true;
 const world=actor.world,peer=actor.auxiliary,partner=actor.partner;
 let carry=false,strategic=false;
 if(world.mode&1){
  strategic=(actor.yFixed>>>16)<0x150&&computerWeightedChoice(actor,aiTables.rumbleCarryWeights)===0;
  if(strategic){actor.flagsB6|=8;carry=true;}
 }else if(!(world.mode&2)){
  if(!(gameFlags(world)&0x8000))carry=!world.attractPhase;
  else if(partner&&(partner.flags32&1)&&!(partner.flags34&1)){
   if((actor.flags57??actor.type)===5){
    const home=actor.flags33&128?0x2d0:0x200;
    if(Math.abs(home-(actor.xFixed>>>16))<148){
     const severity=lateMatch(world)?2:peer.severity;
     strategic=computerWeightedChoice(actor,aiTables.bossCarryWeights[severity])===0;
    }
   }
   if(!strategic){
    const region=actor.region,alternate=actor.flags33&128?(region===9||region<7):(region===2||region>=5);
    carry=computerWeightedChoice(actor,aiTables.carryWeights[alternate?1:0][world.round][actor.severity])===0;
   }else carry=true;
  }
 }
 if(!carry&&!strategic&&!gameFlags(world)&&(actor.flags57??actor.type)===7)carry=true;
 if(carry){
  setFlags(actor,strategic?flags(actor)|16:flags(actor)&~16);
  actor.change(5,22);return stepComputerAction(actor);
 }
 return selectedAction(actor,9);
}

function carry(actor){ // $01dc54
 const world=actor.world,entry=!(actor.action&0x4000);
 if(!gameFlags(world)&&(actor.flags57??actor.type)===7){
  actor.action|=0x4000;if(entry)actor.direction=(actor.direction&0xff00)|64;
  if((actor.xFixed>>>16)>=0x308)return selectedAction(actor,9);return true;
 }
 if(actor.flagsB6&8){
  actor.action|=0x4000;
  if(entry){actor.direction&=0xff00;actor.targetY=u16((actor.yFixed>>>16)+48);}
  if(actor.targetY<(actor.yFixed>>>16)){actor.flagsB6&=~8;return finishCarry(actor);}
  return true;
 }
 actor.action|=0x4000;
 if(entry){
  actor.controlCounter=128;
  [actor.targetX,actor.targetY]=flags(actor)&16?[0x200,0x130]:[0x210,0x190];
  if(actor.flags33&128)[actor.targetX,actor.targetY]=flags(actor)&16?[0x2d0,0x178]:[0x2f8,0x128];
 }
 if(pursuePoint(actor)){
  actor.controlCounter=u16(actor.controlCounter-1);
  if(!actor.controlCounter)return finishCarry(actor);return true;
 }
 actor.change(5);
 if(!(flags(actor)&16)){
  if((actor.flags33&1)&&(actor.partner?.flags32&1))actor.action=102;
  else return finishCarry(actor);
 }else{
  actor.xFixed=addPositionWord(actor.xFixed,actor.targetX-(actor.xFixed>>>16));
  actor.yFixed=addPositionWord(actor.yFixed,actor.targetY-(actor.yFixed>>>16));
  actor.action=137;actor.partner.change(5,136);
 }
 return true;
}

function finishCarry(actor){
 const world=actor.world;
 if(!gameFlags(world)&&(actor.flags57??actor.type)===7){
  setFlags(actor,flags(actor)&~16);actor.change(5,22);return stepComputerAction(actor);
 }
 return selectedAction(actor,9);
}

const held={93:[2,103],95:[2,92],96:[3,91],98:[4,90],99:[4,85]};
const noOpHandlers=new Set([0x1d47a]);
export function supportsComputerGrapple(actor){
 if([4,7,11,12].includes(actor.state))return true;
 if(actor.state!==5)return false;
 const action=actor.action&255,handler=aiTables.actionHandlers[action]&0x7fffffff;
 if(!actor.pendingState&&!(aiTables.actionHandlers[action]&0x80000000))return true;
 return noOpHandlers.has(handler)||[21,22,23,74,75,80,86,93,94,95,96,98,99].includes(action)
  ||(handler===0x1d9b8&&Boolean(flags(actor)&16));
}

function tagDisposition(actor){ // $01e5fc
 const world=actor.world;
 let wantsTag=false;
 if(!(actor.flags56&64)&&gameFlags(world)&&!(world.mode&3)&&!(actor.flags33&4)&&(actor.flags33&1)){
  if(flags(actor)&64)wantsTag=true;
  else if(actor.state===4&&(actor.reaction&255)===1)wantsTag=computerWeightedChoice(actor,aiTables.tagStaggerWeights)===0;
  else wantsTag=u16(actor.health+12)<actor.partner.health;
 }
 setFlags(actor,wantsTag?flags(actor)|64:flags(actor)&~64);
}

function recoveryWait(actor,peer){ // $01d028
 if(!(flags(actor)&16)||peer.state!==5)return true;
 if([35,53,14].includes(peer.action&255)){
  if(peer.action&0x1000)actor.change(5);return true;
 }
 actor.controlCounter=u16(actor.controlCounter-1);if(!actor.controlCounter)actor.change(5);return true;
}

function downed(actor){ // $01cc9e
 if(actor.pendingState){
  actor.walkMode=actor.controlCounter=0;setFlags(actor,flags(actor)&0xc7);actor.flagsB7&=0x7c;actor.flags34&=~4;
  if(actor.flags33&2)actor.flags56&=~64;return true;
 }
 const reaction=actor.reaction&255,world=actor.world;
 if(reaction===1){
  actor.aiFlagsB9=(actor.aiFlagsB9||0)&~2;setFlags(actor,flags(actor)&63);actor.flagsB7=2;
  tagDisposition(actor);return true;
 }
 if(![8,9].includes(reaction))return true;
 actor.aiFlagsB9=(actor.aiFlagsB9||0)&~2;
 const peer=actor.auxiliary;
 if(reaction===8&&!gameFlags(world)&&!(world.mode&1)){
  if((actor.opponent.flags57??actor.opponent.type)!==9||![7,8].includes(actor.opponent.demoStep))actor.recoveryTimer=4096;
  return true;
 }
 if(reaction===8&&peer?.state===5){
  const action=peer.action&255;
  if(action===8){
   const prior=actor.flagsB7&2;actor.flagsB7|=2;
   if(!prior){
    const weights=world.mode&1?aiTables.rumbleFrontRecoveryWeights[actor.severity]:aiTables.frontRecoveryWeights[world.round][actor.severity];
    if(computerWeightedChoice(actor,weights)===0){actor.change(5,56);return stepComputerAction(actor);}
   }
   return true;
  }
  const kind=[16,70,11].includes(action)?0:[9,34].includes(action)?1:-1;
  if(kind>=0){
   const prior=actor.flagsB7&2;actor.flagsB7|=2;
   if(!prior){
    const weights=world.mode&1?aiTables.rumbleGroundRecoveryWeights[actor.severity]:aiTables.groundRecoveryWeights[kind][world.round][actor.severity];
    if(computerWeightedChoice(actor,weights)!==0)return true;
    actor.controlCounter=kind===1?2:16;actor.action=56;setFlags(actor,flags(actor)|16);
   }
   return recoveryWait(actor,peer);
  }
 }
 if(!gameFlags(world)&&!(world.mode&1))return true;
 if(peer?.state!==5)return true;
 const action=peer.action&255;
 if([17,12,18,15].includes(action)){
  const prior=actor.flagsB7&2;actor.flagsB7|=2;
  if(!prior&&computerWeightedChoice(actor,aiTables.groundRecoveryWeights[2][world.round][actor.severity])===0){
   setFlags(actor,flags(actor)|16);
   if(action===15&&!(peer.flags35&1)){actor.action=84;actor.controlCounter=32;}
   else{actor.controlCounter=16;actor.action=reaction===8?56:120;}
  }
  return recoveryWait(actor,peer);
 }
 const kind=aiTables.recoveryAttackIds.indexOf(action);
 if(kind>=0){
  const prior=actor.flagsB7&2;actor.flagsB7|=2;
  if(prior)return recoveryWait(actor,peer);
  const count=Math.min((actor.attempts[0xd2+kind*2]||0)&255,5);
  if(computerWeightedChoice(actor,aiTables.recoveryAttemptWeights[kind][count])!==0)return true;
  actor.action=action===14&&!(peer.flags35&1)?84:reaction===8?56:120;
  actor.controlCounter=16;setFlags(actor,flags(actor)|16);return recoveryWait(actor,peer);
 }
 if(action===10){
  const prior=actor.flagsB7&2;actor.flagsB7|=2;
  if(prior)return recoveryWait(actor,peer);
  const count=(actor.attempts[0xe4]||0)&255;
  if(count<5&&computerWeightedChoice(actor,aiTables.backAttackRecoveryWeights[world.round][count])!==0)return true;
  actor.action=reaction===8?56:120;actor.controlCounter=2;setFlags(actor,flags(actor)|16);return recoveryWait(actor,peer);
 }
 return true;
}

export function stepComputerAction(actor){ // $01d208 and the recovered handlers
 actor.aiFlagsB9=(actor.aiFlagsB9||0)&~2;
 const action=actor.action&255,entry=aiTables.actionHandlers[action],handler=entry&0x7fffffff;
 if(!(entry&0x80000000)&&actor.state===5&&!actor.pendingState)return true;
 if(noOpHandlers.has(handler))return true;
 if(action===21)return headlock(actor);
 if(action===22)return carry(actor);
 if(action===23){setFlags(actor,flags(actor)|8);actor.flagsB7&=~12;return true;}
 if(action===80){actor.flagsB7|=128;return true;}
 if([75,86].includes(action)){actor.pinStatus=0;return true;}
 if([74,94].includes(action)){
  if(!(actor.action&0x4000)){
   actor.action|=0x4000;
   setDelay(actor,!actor.health?8:actor.health>=128?0:actor.health>=101?1:actor.health>=80?2:actor.health>=64?3:actor.health>=37?4:5);
  }
  if((actor.pinStatus&255)===delay(actor))actor.change(5,action===74?75:86);
  return true;
 }
 if(held[action]){
  if(!(actor.action&0x4000)){
   actor.action|=0x4000;actor.aiEscapeTimer=aiTables.heldEscapeTimes[held[action][0]][actor.severity];actor.controlCounter=held[action][1];
  }
  actor.aiEscapeTimer=u16(actor.aiEscapeTimer-1);
  if(!actor.aiEscapeTimer)actor.change(5,actor.controlCounter);return true;
 }
 if(handler===0x1d9b8&&(flags(actor)&16)){
  if(!(actor.action&0x4000)){
   actor.action|=0x4000;const peer=actor.opponent;
   if([43,48].includes(action)&&peer.state===4&&(peer.reaction&255)===1)actor.timer=u16(actor.timer+256);
   actor.auxiliary=peer;if(!peer.auxiliary)peer.auxiliary=actor;
   // The action-29 / Rumble branch is outside the headlock-selected paths.
  }
  return true;
 }
 return false;
}

// Recovered portion of $01b390, called after human input and before the referee.
// Other AI states remain a separate translation task, not fabricated decisions.
export function stepComputerGrapple(actor){
 if(!actor.active||!(actor.flags56&0xc0)||((actor.flags56&128)&&(actor.flags32&128))
  ||actor.state===255||actor.forced||(actor.flags32&16)||((actor.world.matchFlags||0)&1))return false;
 updateComputerTarget(actor);
 if(!gameFlags(actor.world))for(const[offset,value]of [[0xd2,3],[0xd4,2],[0xd6,3],[0xd8,2],[0xda,3],[0xde,3],[0xe4,4]])actor.attempts[offset]=value;
 if(!supportsComputerGrapple(actor))return false;
 if(actor.state===4)return downed(actor);
 if(actor.state===7)return true;
 if(actor.state===5)return stepComputerAction(actor);
 if(actor.state===12){
  if(delay(actor)<48){setDelay(actor,delay(actor)+1);return true;}
  actor.inputBlockB=0;actor.aiFlagsB9=(actor.aiFlagsB9||0)&~2;return selectedAction(actor,1);
 }
 const peer=actor.auxiliary;
 const resetDelay=()=>{
  setDelay(actor,peer.flags56&0xc0?32:aiTables.clinchStrikeDelays[actor.world.round]);
  setDelay(actor,delay(actor)+(random(actor,{weighted:false})&3));
 };
 if(actor.pendingState){actor.inputBlockB=0;actor.aiFlagsB9=(actor.aiFlagsB9||0)&~2;resetDelay();}
 setDelay(actor,delay(actor)-1);
 if(!delay(actor)){
  resetDelay();
  if(!(actor.holdFlags&0x4000)&&computerWeightedChoice(actor,aiTables.clinchStrikeWeights)===0){actor.change(5,41);peer.holdFlags|=0x4000;}
 }
 return true;
}
