// Original health initialization, physical DIP wiring and active-pool damage.
// The external analysis CPU is used offline and is not a browser dependency.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));const cpu=new MC68000();
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
const bases=Array.from({length:10},(_,i)=>0x1c05b0+i*0x10c);
const word=a=>memory[a]*256+memory[a+1];
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;};
const putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
function call(address,base=bases[0]){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=base;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000)cpu._execute();assert(steps<100000,'Original service did not return');
}
const healthBytes={flags56:0x56,flags57:0x57,flags104:0x104};
const healthWords={health:0x66,maximumHealth:0x72,severity:0x70,healthAccumulator:0x6a};
function healthSnapshot(base){
 const result={};for(const[key,offset]of Object.entries(healthBytes))result[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(healthWords))result[key]=word(base+offset);return result;
}
const health=[];
for(const flags56 of [0,32,64,96,128])for(let type=0;type<(flags56&128?2:16);type++)
 for(const slot of flags56&128?[0,1,2,3,4,5,6,7,8]:[0])
 for(const mode of [0,1,2,3])for(const round of flags56&128?Array.from({length:10},(_,i)=>i):[0,1,9,256])
 for(const difficulty of flags56&128?[0,1,2,3]:[0])for(const flags104 of [0,128,255]){
  memory.fill(0,0x1c0000,0x1c4000);const base=bases[slot];
  memory[base+0x56]=flags56;memory[base+0x57]=(flags56&128?type?11:0:type)|(type&1?0xa0:0);memory[base+0x104]=flags104;
  putWord(base+0x66,37);putWord(base+0x72,123);putWord(base+0x70,2);putWord(base+0x6a,0xffd0);
  const world={mode,round,dipSwitches:difficulty<<8};
  memory[0x1c0161]=mode;putWord(0x1c0162,round);putWord(0x1c0066,world.dipSwitches);
  const initial=healthSnapshot(base);call(0xf9c2,base);
  health.push({slot,initial,world,result:healthSnapshot(base)});
 }
const dipHash=createHash('sha256');
for(let a=0;a<256;a++)for(let b=0;b<256;b++){
 putWord(0x140020,0xcfff|((b&0xc0)<<6));putWord(0x140022,255|((b&63)<<8));
 putWord(0x140024,255|((a&63)<<8));putWord(0x140026,0xfcff|((a&0xc0)<<2));call(0x1e2e);
 dipHash.update(JSON.stringify([a,b,word(0x1c0066)])+'\n');
}
const bytes={flags32:0x32};
const words={health:0x66,maximumHealth:0x72,severity:0x70,healthAccumulator:0x6a,pendingDamage:0x68,
 forced:0xfe,comboTimer:0x54,comboCount:0x52,idleTimer:0xd0};
function damageSnapshot(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);return result;
});}
let seed=0x2407e;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const damage=[];
for(let scenario=0;scenario<512;scenario++){
 memory.fill(0,0x1c0000,0x1c4000);
 for(const[index,base]of bases.entries()){
  memory[base]=index===9||(random()>>>24)%4?128:0;memory[base+0x32]=random()>>>24;
  putWord(base+0x66,[0,1,24,25,66,67,100,500,65535][(random()>>>16)%9]);
  putWord(base+0x72,[0,1,100,110,500,65535][(random()>>>16)%6]);
  putWord(base+0x70,random()%3);putWord(base+0x6a,random()>>>16);
  putWord(base+0x68,[0,1,2,24,100,65535][(random()>>>16)%6]);
  putWord(base+0xfe,[0,1,0x8000,0x8001][(random()>>>16)%4]);
  putWord(base+0x54,[0,1,2,65535][(random()>>>16)%4]);putWord(base+0x52,random()&15);
  putWord(base+0xd0,[0,1,2,65535][(random()>>>16)%4]);
 }
 const initial=damageSnapshot(),hash=createHash('sha256'),rows=[];
 for(let tick=0;tick<8;tick++){
  call(0x2407e);const row=damageSnapshot();hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);
 }
 damage.push({initial,count:8,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2: $00f9c2, $001e2e, $02407e',health,
 dips:{cases:65536,sha256:dipHash.digest('hex')},damage},null,2)+'\n');
console.log(JSON.stringify({health:health.length,dips:65536,damage:damage.length,damageUpdates:damage.length*8}));
