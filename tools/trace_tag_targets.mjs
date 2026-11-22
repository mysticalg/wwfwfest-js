import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const pool=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c),word=a=>memory[a]*256+memory[a+1],long=a=>word(a)*65536+word(a+2);
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
let seed=0x54415247;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>16;};
const states=[0,1,4,5,8,9,255],actions=[0,29,74,97,102,123],cases=[],hash=createHash('sha256');let fields;
for(let index=0;index<4096;index++){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const roleA=random()&1,roleB=random()&1;
 const initial=pool.map((base,slot)=>{
  const active=[0,1,4,5].includes(slot),team=slot>=4,main=(slot&1)===(team?roleB:roleA),human=!team&&((slot&1)===(index&1));
  const actor={active,flags32:random()&0x17,flags33:(team?128:0)|(main?1:0)|(random()&0x7c),flags34:random()&0xd0,
   flags35:random()&3,flags56:human?0:team?128:64,inputBlockA:random()&0x88,state:states[random()%states.length],
   action:actions[random()%actions.length],walkMode:random()%5,pendingState:!(random()&3),
   xFixed:(random()%1000)*65536,yFixed:(random()%1000)*65536,partnerIndex:(slot^1)<9?slot^1:slot,
   opponentIndex:team?0:4,secondaryOpponentIndex:team?1:5};
  // An apron walker uses modes 1-4; mode 0/idle with apron bit set is
  // unreachable here and reads the caller's scratch A4 in $01fd6a.
  if((actor.flags32&1)&&(actor.state===0||actor.state===1)){
   actor.state=1;if(!actor.walkMode)actor.walkMode=1;
  }
  put(base,active?0x8000:0);put(base+0x20,actor.state|(actor.pendingState?0:0x8000));put(base+0x60,actor.action);put(base+0xae,actor.walkMode);
  for(const[key,offset]of [['flags32',0x32],['flags33',0x33],['flags34',0x34],['flags35',0x35],['flags56',0x56],['inputBlockA',0xb5]])memory[base+offset]=actor[key];
  for(const[key,offset]of [['xFixed',6],['yFixed',10]])putLong(base+offset,actor[key]);
  for(const[key,offset]of [['partnerIndex',0x86],['opponentIndex',0x7a],['secondaryOpponentIndex',0x82]])putLong(base+offset,pool[actor[key]]);
  return actor;
 });
 cpu.pc=0x1fb7e;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<10000)cpu._execute();assert(steps<10000);
 const result=pool.map(base=>[pool.indexOf(long(base+0x7a)),pool.indexOf(long(base+0x82))]);
 fields??=Object.keys(initial[0]);
 hash.update(JSON.stringify(result)+'\n');cases.push({initial:initial.map(actor=>fields.map(key=>actor[key])),result});
}
writeFileSync(output,JSON.stringify({source:'Original normal tag target service $01fb7e, including $01fd6a/$01fef2',fields,cases,sha256:hash.digest('hex')})+'\n');
console.log(JSON.stringify({cases:cases.length}));
