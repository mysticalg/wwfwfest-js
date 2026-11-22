import {actorTables} from '../data/actor-tables.js';

// $0021c4: the original generator mixes D1-D7 and the frame word into its
// persistent seed, then rotates by the low three bits. Callers can supply the
// original scratch values for reference replay. Runtime ambient-register
// reconstruction is incomplete; the default context is explicitly zero.
export class ArcadeRandom {
 constructor(seed=0,registers=Array(7).fill(0)){
  this.seed=seed>>>0;this.registers=Array.from({length:7},(_,i)=>registers[i]|0);
 }
 next(frame=0,registers=this.registers){
  let value=this.seed;
  for(let i=0;i<7;i++)value=(value+(registers[i]|0))>>>0;
  value=(value+(frame|0))>>>0;const bits=value&7;
  this.seed=bits?((value>>>bits)|(value<<(32-bits)))>>>0:value;return this.seed;
 }
 // Known register writes inside $0104de's four probability helpers. Their
 // MOVEM restores D1/D2 afterward, so these modifications remain local.
 contest(actor,kind,counter=0,frame=0){
  const registers=[...this.registers],tables=actorTables.grappleContestTables,
   targetAI=Boolean(actor.auxiliary?.flags56&128),world=actor.world;
  const word=(index,value)=>{registers[index]=(registers[index]&0xffff0000)|(value&65535);};
  word(0,kind*4);
  if(kind===0){registers[0]=(targetAI?tables.kind0AI:tables.kind0Human)[(targetAI?world.round*3:0)+actor.severity];}
  else if(kind===1){
   const table=!targetAI?tables.kind1Human:world.mode&1?tables.kind1Rumble:tables.kind1AI;
   word(1,table[(targetAI&&!(world.mode&1)?world.round*5:0)+Math.min(counter&255,4)]);
  }else word(1,actor.severity);
  return this.next(frame,registers)&15;
 }
}
