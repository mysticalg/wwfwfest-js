import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath] = process.argv.slice(2);
const {default:MC68000} = await import(pathToFileURL(hardwarePath));
const memory = new Uint8Array(0x200000);memory.set(readFileSync(programPath));
const cpu = new MC68000();
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
const word=a=>memory[a]*256+memory[a+1];
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;};
const putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
const actor=0x1c05b0;
function call(){cpu.pc=0x50fe;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;while(cpu.pc!==0x7ff00&&steps++<10000)cpu._execute();assert(steps<10000);}
let seed=0x494e5054;
const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const scenarios=[];
for(let index=0;index<128;index++){
 memory.fill(0,actor,actor+0x10c);memory[actor]=128;putLong(actor+0x8a,0x140020);
 const initial={accumulator:random()&0x107,held:random()&0x107};
 putWord(actor+0xa4,initial.accumulator);putWord(actor+0xa6,initial.held);
 const startPhase=random()&255,inputs=Array.from({length:96},()=>random()>>>24),hash=createHash('sha256');
 for(const [tick,input]of inputs.entries()){
  memory[0x1c0083]=(startPhase+tick)&255;putWord(0x140020,input^255);call();
  hash.update(JSON.stringify([word(actor+0xa4),word(actor+0xa6),word(actor+0xa2),word(actor+0xa8)])+'\n');
 }
 scenarios.push({initial,startPhase,inputs,sha256:hash.digest('hex')});
}
writeFileSync(outputPath,JSON.stringify({source:'Original US rev 2 $50fe alternating-frame input service',scenarios},null,2)+'\n');
console.log(`Captured ${scenarios.length*96} original input updates`);
