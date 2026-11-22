import {tagTables} from '../data/tag-tables.js';

const u16=value=>value&65535;
const lowDirection=(actor,value)=>{actor.direction=(actor.direction&0xff00)|(value&255);};
export const supportsComputerTag=actor=>[8,9,10].includes(actor.state)||(actor.state===1&&[1,2,3,4].includes(actor.walkMode&255));

// AI's corner wait and apron movement run in the same phase as other decisions.
export function stepComputerTag(actor,{choose,action}){
 const state=actor.state;
 if(state===8){actor.controlCounter&=0xff00;return true;}
 if(state===10)return true;
 if(state===9){ // $01e0c6
  actor.controlCounter=(actor.controlCounter&0xff00)|((actor.controlCounter+1)&255);
  if((actor.controlCounter&255)<8)return true;
  if(actor.partner.state===5&&(actor.partner.action&255)===137){actor.change(5,4);return action(actor);}
  const peer=actor.opponent;
  const down=(peer.state===5&&(peer.action&255)===97)||(peer.state===4&&[8,9].includes(peer.reaction&255));
  actor.action=(actor.action&0xff00)|tagTables.jumpMoves[down?0:1][actor.flags57??actor.type];
  if(peer.state===5&&(peer.action&255)!==123&&[4,7,11].includes(actor.flags57??actor.type)
   &&choose(actor,tagTables.jumpCaptureWeights)===0){
   actor.action=1;actor.inputBlockA|=16;actor.change(5);actor.flagsB6|=1;return action(actor);
  }
  actor.action&=255;actor.inputBlockA&=~16;actor.change(5);actor.flagsB6|=1;return action(actor);
 }
 const mode=actor.walkMode&255;
 if(mode===4){if(actor.flags33&1){actor.flags34&=~2;actor.change(0);}return true;}
 if(mode!==1||actor.pendingState)return true;
 // $01c5b8: follow one's partner vertically while waiting on the apron.
 const partner=actor.partner,ownY=actor.yFixed>>>16,partnerY=partner.yFixed>>>16,team=Boolean(actor.flags33&128);
 lowDirection(actor,partnerY<ownY?(team?120:136):(team?248:8));
 if(Math.abs(partnerY-ownY)<8){
  lowDirection(actor,0);
  const held=partner.auxiliary;
  if(!(actor.flags34&1)&&held?.state===5&&(held.action&255)===83&&Math.abs((actor.xFixed>>>16)-(held.xFixed>>>16))<64){
   actor.change(5,57);return true;
  }
 }
 if(!(actor.world.gameFlags??(actor.world.inGame?0x8000:0)))return true;
 const peer=partner.opponent;
 if(!peer||!([0,1].includes(peer.state)||(peer.state===4&&[0,1,10].includes(peer.reaction&255))))return true;
 if(Math.abs((actor.yFixed>>>16)-(peer.yFixed>>>16))>=16||Math.abs((actor.xFixed>>>16)-(peer.xFixed>>>16))>=64){actor.flagsB7&=~2;return true;}
 const prior=actor.flagsB7&2;actor.flagsB7|=2;if(prior)return true;
 const choice=choose(actor,tagTables.benchAttackWeights[actor.world.round]);
 if(choice===0){actor.opponent=peer;actor.change(5,57);return action(actor);}
 if(choice===1&&!peer.auxiliary){actor.inputBlockA|=16;actor.flagsB7&=~2;actor.change(5,28);return action(actor);}
 return true;
}
