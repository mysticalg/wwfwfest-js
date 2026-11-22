import {actorTables} from '../data/actor-tables.js';
import {addPositionWord} from './ring-collision.js';
import {finishAssistance} from './grapple-services.js';
import {finishPinCount} from './pin.js';

const move=(a,x,y=0,z=0)=>{
 for(const [key,delta]of [['xFixed',a.facing&0x8000?-x:x],['yFixed',y],['zFixed',z]])a[key]=addPositionWord(a[key],delta);
};
const unpair=(a,b)=>{a.flags33&=~64;b.flags33&=~64;};
const linked=a=>{if(!a.auxiliary)throw new Error('Rescue requires the held participant link');return a.auxiliary;};
// The $023b26 calls here retain A1's action-10 descriptor, rather than loading
// the contact iterator's actor pointer. Normal-mode calls request $0f19.
const message=a=>{if(!(a.world.mode&1))a.world.message=0x0f19;};
function secondaryPin(a,p,q){ // $012c0e
 p.change(4);p.reaction=15;p.flags35&=~1;q.action&=~0x2000;
 p.flags33&=~64;a.unlinkMarked=true;q.secondaryPinner=null;
}

export const isRescueAction=action=>(action&255)===10;
// $012984-$012c5c: the punch that releases a downed wrestler or interrupts a
// committed pin/hold. Bounds and move selection precede this actor handler.
export function stepRescueAction(a,initialized){
 const descriptor=actorTables.rescueAnimation;
 if(!initialized){a.movementMode=0;return descriptor;}
 a.contact=1;
 let p=a.auxiliary;
 if(!(a.clock.index&255)&&!a.clock.remaining&&p&&!p.forced){
  const action=p.state===5?p.action&0x80ff:-1;let interrupted=false;
  if(p.state===4&&[8,9].includes(p.reaction&255)){
   p.change(4);p.reaction=(p.reaction&0xff00)|(((p.reaction&255)-2)&255);p.pendingDamage=2;
   a.sounds.push(50);a.unlinkMarked=true;p.attempts??={};p.attempts[0xe4]=((p.attempts[0xe4]||0)+1)&65535;
   a.world.message=0x0f0b;interrupted=true;
  }else if(action===0x8048||action===0x800e){
   let q=linked(p);const second=p.secondaryPinner;
   if(action===0x8048&&second?.state===5&&(second.action&255)===73){
    a.auxiliary=p=second;a.unlinkMarked=false;q=linked(p);secondaryPin(a,p,q);
   }else{
    p.reaction=action===0x800e?0x10f:15;if(action===0x8048)p.facing^=0x8000;
    q.placePeer(p,action===0x800e?20:80,-1,32);message(a);p.change(4);p.flags35&=~1;unpair(p,q);
    finishPinCount(q);q.change(7);a.unlinkMarked=true;p.secondaryPinner=null;p.unlinkMarked=true;
   }
   interrupted=true;
  }else if(action===0x801a){
   const q=linked(p);p.change(4);p.reaction=6;p.flags35&=~1;
   move(q,-96,-1);finishPinCount(q);p.offsetX|=0x8000;q.change(7);message(a);unpair(p,q);
   a.unlinkMarked=p.unlinkMarked=true;interrupted=true;
  }else if(action===0x8009){
   const q=linked(p);p.change(4);p.reaction=6;p.flags35&=~2;p.facing^=0x8000;move(p,-48,-1);
   q.change(7);q.facing^=0x8000;q.flags35&=~4;finishAssistance(q);message(a);unpair(p,q);
   a.unlinkMarked=p.unlinkMarked=true;interrupted=true;
  }else if(action===0x8061){message(a);p.change(5,119);interrupted=true;}
  else if(action===0x8049){secondaryPin(a,p,linked(p));interrupted=true;}
  if(interrupted)a.sounds.push(42);
 }
 if((a.clock.index&255)===0xfe){a.change(0);a.unlinkMarked=true;}
 return descriptor;
}
