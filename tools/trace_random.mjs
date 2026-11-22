import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},long=(a,v)=>{put(a,v>>>16);put(a+2,v);};
let seed=0x524e4721;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const cases=[],hash=createHash('sha256');
for(let index=0;index<8192;index++){
 const initial={seed:index<16?index:random(),frame:index<16?0:random(),registers:Array.from({length:7},()=>index<16?0:random())};
 long(0x1c005c,initial.seed);long(0x1c0080,initial.frame);cpu.d.set([0,...initial.registers]);
 cpu.a[7]=0x1c3a00;long(cpu.a[7],0x7ff00);cpu.pc=0x21c4;cpu.sr=0x2700;let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100)cpu._execute();assert(steps<100);
 assert.deepEqual(Array.from(cpu.d.slice(1),v=>v>>>0),initial.registers);
 const result=(memory[0x1c005c]*0x1000000+(memory[0x1c005d]<<16)+(memory[0x1c005e]<<8)+memory[0x1c005f])>>>0;
 assert.equal(cpu.d[0]>>>0,result);hash.update(JSON.stringify(result)+'\n');cases.push(initial);
}
writeFileSync(output,JSON.stringify({source:'Original $0021c4 generator with explicit D1-D7 and frame inputs',cases,sha256:hash.digest('hex')},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length}));
