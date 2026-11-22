import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const actor=0x1c05b0,peer=0x1c06bc,put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},long=(a,v)=>{put(a,v>>>16);put(a+2,v);};
function call(address){cpu.pc=address;cpu.sr=0x2700;cpu.a[0]=actor;cpu.a[7]=0x1c3a00;long(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<1000)cpu._execute();assert(steps<1000);return Boolean(cpu.sr&1);}
let seed=0x50494e53;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const edgesX=[-97,-96,-95,-33,-32,-31,0,31,32,33,95,96,97],edgesY=[-57,-56,-55,-1,0,1,23,24,25];
const cases=[],hash=createHash('sha256');
for(let index=0;index<8192;index++){
 const x=index<4096?640:random()&65535,y=index<4096?336:random()&65535;
 const initial={state:index%4,flags34:index%17===0?2:0,x:(x+edgesX[index%edgesX.length])&65535,y:(y+edgesY[Math.trunc(index/13)%9])&65535,
  peerState:index%19===0?0:4,reaction:[6,7,8,9,5][Math.trunc(index/117)%5],peerLinked:index%23===0,peerFacing:index&1?0x8000:0,peerX:x,peerY:y};
 memory.fill(0,actor,peer+0x10c);put(actor+0x20,initial.state);memory[actor+0x34]=initial.flags34;put(actor+6,initial.x);put(actor+10,initial.y);
 long(actor+0x7a,peer);put(peer+0x20,initial.peerState);put(peer+0x64,initial.reaction);put(peer+0x2e,initial.peerFacing);put(peer+6,x);put(peer+10,y);
 if(initial.peerLinked)long(peer+0x26,actor);
 let accepted=call(0xd2f8);if(!accepted)accepted=call(0xd350);
 if(accepted){cpu.d[0]=7;accepted=call(0xdb98);}
 cases.push(initial);hash.update(JSON.stringify(accepted)+'\n');
}
writeFileSync(output,JSON.stringify({source:'Original prone row predicates $00d2f8/$00d350 and action-72 bounds $00db98 kind 7',cases,sha256:hash.digest('hex')},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length}));
