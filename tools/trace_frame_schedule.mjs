// Original alternating frame services composed around a controlled actor lane.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));
const cpu=new MC68000(),sounds=[];
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
const bases=[0x1c05b0,0x1c06bc];
function call(address,actor=bases[0]){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=actor;putLong(cpu.a[7],0x7ff00);
 let steps=0;while(cpu.pc!==0x7ff00&&steps++<500000)cpu._execute();assert(steps<500000,`Frame service stuck at ${cpu.pc.toString(16)}`);
}
const directions=[1,8,2,4,5,9,10,6];
const inputs=Array.from({length:640},(_,tick)=>{
 if(tick<64)return directions[Math.floor(tick/8)];
 if(tick<96)return 16;
 if(tick<128)return 0;
 if(tick<160)return 32;
 if(tick<192)return 0;
 if(tick<196)return 49;
 if(tick<212)return 0;
 if(tick<216)return 16;
 if(tick<384)return 0;
 if(tick<448)return directions[Math.floor((tick-384)/8)];
 if(tick<500)return 16;
 if(tick<544)return 0;
 if(tick<548)return 50;
 if(tick<576)return 0;
 if(tick<580)return 32;
 return 0;
});
function scenery(){const visible=[];for(let a=0x1c185a;memory[a]!==255;a++)visible.push(memory[a]);return {visible,records:Array.from({length:47},(_,i)=>Array.from(memory.subarray(0x1c188a+i*4,0x1c188e+i*4)))};}
const scenarios=[];
for(let type=0;type<12;type++)for(const startPhase of [0,1]){
 memory.fill(0,0x1c0000,0x1c4000);putWord(0x1c007c,1);memory[0x1c185a]=255;
 for(const [index,base]of bases.entries()){
  memory[base]=128;memory[base+0x33]=index?2:3;
  putWord(base+2,index?6:type);putWord(base+0x20,0x8000);putWord(base+0x1c,0x8000);putWord(base+0x4c,1);
  putWord(base+4,index?0:0x8000);putWord(base+0x90,index?0:0x8000);putWord(base+0x2e,index?0:0x8000);
  putLong(base+6,640*65536+0x1234);putLong(base+10,(index?500:336)*65536+0x5678);putLong(base+14,320*65536);
  putWord(base+0x66,100);putWord(base+0x72,100);
  putLong(base+0x7a,bases[1-index]);putLong(base+0x82,bases[1-index]);putLong(base+0x86,bases[1-index]);
  putLong(base+0x8a,0x140020+index*2);
 }
 for(const a of [0x1c17e6,0x1c17ea])putWord(a,461);
 for(const a of [0x1c17ee,0x1c17f2])putWord(a,577);
 putWord(0x1c17da,14);putWord(0x1c17dc,18);call(0x27800);call(0x28690);
 const rows=[],hash=createHash('sha256');
 for(const [tick,input]of inputs.entries()){
  const phase=startPhase+tick;putLong(0x1c0080,phase);sounds.length=0;
  putWord(0x140020,input^255);putWord(0x140022,255);
  if(phase&1){
   call(0x27800);memory[0x1c17fe]=0;call(0x25ca0);call(0x25d00);if(!(cpu.sr&1))call(0x25d9c);
  }
  call(0x25b5c);call(0x28a62);call(0x50fe);call(0xe7b4);call(0xe3ca);
  for(const base of bases){
   const state=word(base+0x20);
   if(!(state&0x8000)){putWord(base+0x1e,word(base+0x1c));putWord(base+0x1c,state);putWord(base+0x20,state|0x8000);}
   putWord(base+0x36,0);
   if(memory[base+1]){call(0x27302,base);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])putWord(base+p,word(base+p)+word(base+c));}
   call(0x1b27e,base);call(0x248c,base);call(0x2218,base);
  }
  call(0x232b6);if(!(phase&1)){call(0x23288);call(0x2407e);}
  const events=[...Array.from({length:word(0x1c19ac)},(_,i)=>({layer:0,patch:memory[0x1c194a+i]})),...Array.from({length:word(0x1c19aa)},(_,i)=>({layer:1,patch:memory[0x1c197a+i]}))];
  const row={actors:bases.map(base=>{const state=word(base+0x20)&255;return[state,state===5?word(base+0x60):state===4?word(base+0x64):0,
   word(base+4),word(base+0x4c),long(base+6),long(base+10),long(base+14),word(base+0x66),word(base+0x70),word(base+0x2e),
   word(base+0x52),word(base+0x54),[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)]];}),
   camera:[word(0x1c17e6),word(0x1c17ee),word(0x1c17ea),word(0x1c17f2),word(0x1c17da),word(0x1c17dc)],
   scenery:scenery(),events,sounds:[...sounds],input:[word(bases[0]+0xa4),word(bases[0]+0xa6),word(bases[0]+0xa2),word(bases[0]+0xa8)]};
  hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);
  call(0x28690);
  for(const base of bases)if((word(base+4)&0x7fff)!==0x7fff&&(memory[base+0x26]&128)&&!word(base+0xfe))putLong(base+0x26,0);
 }
 scenarios.push({type,startPhase,count:inputs.length,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(outputPath,JSON.stringify({source:'Original alternating frame/input/actor/projection/contact/crowd services; passive actor outside the controlled lane',inputs,scenarios},null,2)+'\n');
console.log(`Captured ${scenarios.length} complete scheduled service sequences`);
