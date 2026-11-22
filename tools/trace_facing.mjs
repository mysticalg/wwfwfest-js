import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},long=(a,v)=>{put(a,v>>>16);put(a+2,v);},actor=0x1c05b0,peer=0x1c06bc;
let seed=0x46414345;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const cases=[],hash=createHash('sha256');
for(let index=0;index<8192;index++){
 const row=[random()&65535,random()&65535,index<64?[0,16,32,63,64,65535][index%6]:random()&65535,
  random()&65535,[0,1,4,5][index%4],[0,6,7,8,9,0x8008,0x2009][Math.trunc(index/4)%7],[0,34,82,114,0x8022,0x8052][Math.trunc(index/28)%6]];
 put(actor+6,row[0]);put(actor+0x2e,row[1]);long(actor+0x7a,peer);put(peer+6,row[2]);put(peer+0x2e,row[3]);
 put(peer+0x20,0x8000|row[4]);put(peer+0x64,row[5]);put(peer+0x60,row[6]);
 cpu.a[0]=actor;cpu.a[7]=0x1c3a00;long(cpu.a[7],0x7ff00);cpu.pc=0xfe28;cpu.sr=0x2700;let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100)cpu._execute();assert(steps<100);
 hash.update(JSON.stringify(memory[actor+0x2e]*256+memory[actor+0x2f])+'\n');cases.push(row);
}
writeFileSync(output,JSON.stringify({source:'Original $00fe28 participant facing anchors and wrapped word comparisons',cases,sha256:hash.digest('hex')},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length}));
