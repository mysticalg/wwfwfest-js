// Offline original-program comparisons. The external analysis CPU is not shipped.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));
const cpu=new MC68000(),sounds=[],textRequests=[];
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const bases=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c);
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
const bytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags74:0x74};
const words={action:0x60,state:0x20,forced:0xfe,health:0x66,maximumHealth:0x72,healthAccumulator:0x6a,mash:0xaa,
 severity:0x70,inputBlockA:0xb4,inputBlockB:0xb6,supportTimer:0xe6,resultPose:0x4a};
const pointers={partner:0x86,auxiliary:0x26,opponent:0x7a,assistanceTarget:0x7e};
const worldWords={switchTimer:0x1c1682,matchResult:0x1c1214,resultTimer:0x1c169e,message:0x1c15d2,assistDistance:0x1c1692};
const worldBytes={mashPrompt:0x1c167a,controlsRefresh:0x1c1697};
function call(address){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=bases[0];putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){if(cpu.pc===0x24262)textRequests.push(cpu.d[0]&65535);cpu._execute();}
 assert(steps<100000,`Service stuck at ${cpu.pc.toString(16)}`);
}
function actor(index){
 const base=bases[index],result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(pointers))result[key]=bases.includes(long(base+offset))?bases.indexOf(long(base+offset)):null;
 result.xFixed=long(base+6);result.yFixed=long(base+10);return result;
}
function world(){
 const result={inGame:Boolean(word(0x1c007c)),mode:memory[0x1c0161],dipSwitches:word(0x1c0066)};
 for(const[key,address]of Object.entries(worldWords))result[key]=word(address);
 for(const[key,address]of Object.entries(worldBytes))result[key]=memory[address];
 result.assistCandidate=bases.includes(long(0x1c168c))?bases.indexOf(long(0x1c168c)):null;
 result.textRequests=[...textRequests];return result;
}
const helpers=process.env.SIDE_SERVICE?{sideVictim:0x20264}:{attack:0x207dc,victim:0x20958,motion:0x10672,finish:0x204c6,clear:0x2057e,complete:0x10408,mash:0xfea0,button:0xff44};
const fixtures=[];
let seed=0x719a50;
const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(const [service,address]of Object.entries(helpers))for(let variant=0;variant<320;variant++){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);sounds.length=textRequests.length=0;
 putWord(0x1c007c,variant%7!==0?1:0);memory[0x1c0161]=variant&1;putWord(0x1c0066,(variant&3)<<13);
 for(const address of Object.values(worldWords))putWord(address,0x1234);
 for(const address of Object.values(worldBytes))memory[address]=0x24;
 putLong(0x1c168c,bases[8]);
 for(const[index,base]of bases.entries()){
  memory[base]=index<4||next()%4?128:0;
  for(const offset of Object.values(bytes))memory[base+offset]=next()>>>24;
  for(const offset of Object.values(words))putWord(base+offset,next()>>>16);
  putWord(base+0x70,next()%3);putWord(base+0x72,135);
  putWord(base+0x66,[0,1,20,42,43,80,135][(variant+index)%7]);
  putLong(base+6,((475+next()%316)*65536+0x1234)|0);putLong(base+10,((280+next()%128)*65536+0x5678)|0);
  putLong(base+0x86,bases[[2,3,0,1,5,4,7,6,4][index]]);
  putLong(base+0x26,bases[index^1]||bases[0]);putLong(base+0x7a,bases[index^1]||bases[0]);
  putLong(base+0x7e,variant%3?bases[(index+2)%9]:0);
  putWord(base+0x60,service==='victim'?[94,96,98,99][variant%4]:[26,37,54,59][variant%4]);
 }
 if(service==='complete'){
  memory[bases[0]+0x33]=variant%5?3:7;memory[bases[1]+0x33]=variant%9?3:2;
  putWord(bases[1]+0x66,variant%4?0:1);if(variant%3)putWord(bases[0]+0x60,word(bases[0]+0x60)|0x800);
 }
 const kind=variant%8,pressed=variant%3;
 if(service==='mash')putWord(bases[0]+0xaa,[0,1,0x7fff,0x8000,0xffff][Math.trunc(variant/8)%5]);
 if(service==='button'){memory[bases[0]+0xa3]=pressed;putWord(bases[0]+0xaa,[0,1,2,0x4000,0xffff][variant%5]);}
 const initial=bases.map((_,i)=>actor(i)),initialWorld=world();cpu.d[0]=kind;
 call(address);
 const result={actors:bases.map((_,i)=>actor(i)),world:world(),sounds:[...sounds],...(service==='complete'?{result:Boolean(cpu.sr&1)}:{})};
 fixtures.push({service,kind,pressed,initial,world:initialWorld,sha256:createHash('sha256').update(JSON.stringify(result)).digest('hex'),
  ...(process.env.DETAIL?{result}:{})});
}
// Exercise direction saturation, signed-word wrapping and all four quadrants.
const directions=[];
for(const x of process.env.SIDE_SERVICE?[]:[0,1,7,8,255,256,475,640,32767,32768,65535])for(const y of [0,7,336,32768,65535])
 for(const targetX of [0,7,8,254,255,256,790,32768,65535])for(const targetY of [0,7,8,255,256,408,32767,65535]){
 putWord(bases[0]+6,x);putWord(bases[0]+10,y);putLong(0x1c15e4,bases[0]);putWord(0x1c15e8,targetX);putWord(0x1c15ea,targetY);
 call(0x20d8);directions.push({x,y,targetX,targetY,direction:memory[0x1c15e4]});
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2 original held/partner/completion services',fixtures,directions},null,2)+'\n');
console.log(JSON.stringify({services:fixtures.length,directions:directions.length}));
