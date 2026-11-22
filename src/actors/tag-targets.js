// $01fb7e/$01fd6a/$01fef2: tag-mode opponent and alternate-opponent service.
// Role bits, rather than pool positions, identify the two current lead wrestlers.
const initialized=actor=>!actor.pendingState;
const distance=(a,b)=>(Math.abs((a.xFixed>>>16)-(b.xFixed>>>16))+Math.abs((a.yFixed>>>16)-(b.yFixed>>>16)))&65535;
function opposingPair(actor,pool){
 const other=pool.find(body=>body.active&&body!==actor&&body!==actor.partner);
 if(!other)return null;
 return other.flags33&1?[other,other.partner]:[other.partner,other];
}
function humanTarget(actor,pool){
 const pair=opposingPair(actor,pool);if(!pair)return;
 const[main,bench]=pair;let chooseMain=true;
 if(actor.flags33&1){
  if((actor.flags33&4)&&!(main.flags33&4))chooseMain=false;
  else if(!(bench.flags32&1)&&(main.flags33&64)&&!(main.state===5&&(main.action&255)===97)){
   chooseMain=Boolean(main.flags35&2)&&distance(actor,bench)>=distance(actor,main);
  }
 }else if(!(actor.flags32&1)&&!(bench.flags32&1)){
  if(main.flags33&64)chooseMain=Boolean(main.flags35&3)||(main.state===5&&(main.action&255)===29);
  else chooseMain=Boolean(bench.flags33&64);
 }
 actor.opponent=chooseMain?main:bench;actor.secondaryOpponent=chooseMain?bench:main;
}
function computerTarget(actor,pool){
 const pair=opposingPair(actor,pool);if(!pair)return;
 const[main,bench]=pair;
 if(actor.flags33&1)actor.opponent=(main.flags33&64)&&!(actor.partner.flags32&1)?bench:main;
 else if(actor.flags32&1)actor.opponent=bench;
 else actor.opponent=(bench.flags33&64)||(!(actor.flags33&4)&&(bench.flags33&4))?main:bench;
}
export function updateTagTargets(world){
 if(world.mode&1)return false;
 const pool=world.actors;
 for(const actor of pool.slice(0,4)){
  if(!actor.active||(actor.flags56&0xc0)||(actor.flags34&0xc0)||![0,1,9].includes(actor.state))continue;
  humanTarget(actor,pool);
 }
 for(const actor of pool){
  if(!actor.active||!(actor.flags56&0xc0)||(actor.inputBlockA&128)||(actor.flags34&16)||!initialized(actor))continue;
  if(actor.state===0&&!(actor.inputBlockA&8)||actor.state===1&&(actor.walkMode&255)===0)computerTarget(actor,pool);
 }
 return true;
}
