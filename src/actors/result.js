import {tagTables} from '../data/tag-tables.js';

export const isResultAction=action=>[139,140].includes(action&255);
const markTeam=(a,value)=>{
 if(!a?.partner)throw new Error('Result flags require both team records');
 a.finishFlags=value;a.partner.finishFlags=value;
};

// $019f64/$019fbc. Offset $a0's win/loss bytes are consumed by the original
// scene loop at $00116e/$0011f0; a forced-state word alone is not a result.
export function stepResultAction(a,initialized){
 const action=a.action&255,descriptor=tagTables.actions[action];
 if(action===139){
  if(!initialized)a.movementMode=0;
  else{
   if(!(a.clock.index&255)&&!a.clock.remaining)a.sounds.push(48);
   if((a.clock.index&255)===0xfe){markTeam(a,64);markTeam(a.opponent,128);}
  }
 }else{
  if(!initialized){a.clock.flags|=0x8000;a.clock.pose=0x1d3|a.facing;a.clock.remaining=64;}
  const previous=a.clock.remaining;a.clock.remaining=(previous-1)&65535;
  if(previous===0){
   if((a.forced&255)===3){markTeam(a,128);markTeam(a.opponent,64);}
   else if((a.forced&255)===5){
    if(!(a.world.mode&1)){markTeam(a,128);markTeam(a.opponent,128);}
    else for(const b of a.world.actors||[])if(b.active&&!(b.flags56&128))b.finishFlags=128;
   }
  }
 }
 return descriptor;
}
