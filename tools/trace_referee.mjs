// Original referee decision/handler/projection kernel. Sprite emission is
// excluded; its pose recipes have separate pixel comparisons. No ROM patches.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));const cpu=new MC68000(),sounds=[],texts=[];
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
// The board maps $000000-$07ffff as ROM, including null-pointer writes.
for(let page=0;page<0x800;page++)cpu.memorymap[page].write=()=>{};
cpu.memorymap[0x1400].write16=(address,value)=>{if(address===0x14000c)sounds.push(value&255);};
const ref=0x1c11f4,overlay=0x1c1164,bases=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c);
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
const index=address=>bases.includes(address)?bases.indexOf(address):null;
function call(address,base=ref){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=base;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){if(cpu.pc===0x24262)texts.push(cpu.d[0]&65535);cpu._execute();}
 assert(steps<100000,`Referee call did not return: ${cpu.pc.toString(16)}`);
}
const bytes={movementMode:1,flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35};
const words={speed:0x2a,direction:0x2c,facing:0x2e,centerX:0x30,centerY:0x1e,targetX:0x60,targetY:0x62,
 offsetX:0x18,offsetY:0x1a,paddingX:0x3e,paddingY:0x40,paddingZ:0x42,soundCommand:0x54,scenePriority:0x12,inputBlockA:0xb4,inputBlockB:0xb6};
function refereeSnapshot(){
 const result={state:word(ref+0x20),clock:{flags:word(ref+0x1c),remaining:word(ref+0x22),index:word(ref+0x24),pose:word(ref+4)},
  xFixed:long(ref+6),yFixed:long(ref+10),zFixed:long(ref+14),focus:index(long(ref+0x56)),participants:[index(long(ref+0x4c)),index(long(ref+0x50))],
  auxiliary:index(long(ref+0x26)),assistanceTarget:index(long(ref+0x7e)),
  collision:[memory[ref+0x36],memory[ref+0x37],word(ref+0x38),word(ref+0x3a),word(ref+0x3c)],
  projection:[word(ref+0x14)<<16>>16,232-(word(ref+0x16)<<16>>16)]};
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[ref+offset];
 for(const[key,offset]of Object.entries(words))result[key]=word(ref+offset);return result;
}
const actorBytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56};
const actorWords={type:2,state:0x20,action:0x60,reaction:0x64,forced:0xfe,health:0x66,maximumHealth:0x72,
 healthAccumulator:0x6a,eliminations:0xc4,resultPose:0x4a,pinStatus:0x108,inputBlockA:0xb4,inputBlockB:0xb6,walkMode:0xae};
function actorsSnapshot(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128),xFixed:long(base+6),yFixed:long(base+10),zFixed:long(base+14)};
 for(const[key,offset]of Object.entries(actorBytes))result[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(actorWords))result[key]=word(base+offset);
 for(const[key,offset]of [['auxiliary',0x26],['partner',0x86],['assistanceTarget',0x7e]])result[key]=index(long(base+offset));
 return result;
});}
function overlaySnapshot(){return{activeWord:word(overlay),type:word(overlay+2),pose:word(overlay+4),scenePriority:word(overlay+0x12),
 xFixed:long(overlay+6),yFixed:long(overlay+10),zFixed:long(overlay+14),facing:word(overlay+0x2e),offsetX:word(overlay+0x18),offsetY:word(overlay+0x1a),
 projection:[word(overlay+0x14)<<16>>16,232-(word(overlay+0x16)<<16>>16)]};}
const tiles=()=>[0xc0744,0xc1188].map(base=>Array.from({length:32},(_,i)=>word(base+Math.trunc(i/8)*256+(i%8)*2)));
function worldSnapshot(){return{mode:memory[0x1c0161],round:word(0x1c0162),inGame:Boolean(word(0x1c007c)),dipSwitches:word(0x1c0066),
 switchTimer:word(0x1c1682),countWord:word(0x1c169a),resultTimer:word(0x1c169e),message:word(0x1c15d2),messageExtra:word(0x1c15d4),
 activeA:index(long(0x1c1684)),activeB:index(long(0x1c1688)),countTiles:tiles(),textRequests:[...texts],refereeOverlay:overlaySnapshot()};}
const cases=[];
for(let state=0;state<11;state++)for(const mode of [0,1,2,3])for(const facing of [0,0x8000])for(const x of [600,640,900])for(const initialized of [false,true])
 cases.push({state,mode,facing,x,initialized,variant:'normal'});
for(const state of [0,1,2,3,4,5,6,7,8,9,10])for(const variant of ['round4','round9','focusForced','switch','noSound','clockBytes'])
 cases.push({state,mode:0,facing:0x8000,x:640,initialized:false,variant});
for(const variant of ['outsideBoth','insideBoth','outsideB'])cases.push({state:3,mode:0,facing:0,x:640,initialized:false,variant});
for(const tick of [5,227,228,300])cases.push({state:6,mode:0,facing:0,x:640,initialized:false,variant:'pinBreak',breakAt:tick});
cases.push({state:6,mode:1,facing:0,x:640,initialized:false,variant:'refereeAssist'});
cases.push({state:4,mode:0,facing:0,x:640,initialized:false,variant:'nestedPin'});
const filter=process.env.REFEREE_FILTER?JSON.parse(process.env.REFEREE_FILTER):{};
const sequences=[];
for(const config of cases){
 if(!Object.entries(filter).every(([key,value])=>Array.isArray(value)?value.includes(config[key]):config[key]===value))continue;
 const {state,mode,facing,x,initialized,variant}=config;
 memory.fill(0,0x1c0000,0x1c4000);memory.fill(0,0xc0000,0xc2000);cpu.d.fill(0);cpu.a.fill(0);texts.length=sounds.length=0;
 putWord(0x1c007c,variant==='noSound'?0:1);memory[0x1c0161]=mode;putWord(0x1c0162,variant==='round4'?4:variant==='round9'?9:0);
 putWord(0x1c0066,variant==='noSound'?32:0);putWord(0x1c1682,variant==='switch'?1:0);putWord(0x1c169e,0x1234);
 putLong(0x1c1684,bases[0]);putLong(0x1c1688,bases[2]);putWord(0x1c17e6,461);putWord(0x1c17ee,577);
 for(const[i,base]of bases.entries()){
  memory[base]=i<4?128:0;putWord(base+2,i%12);putWord(base+0x20,0x8000);putWord(base+0x66,80-i);putWord(base+0x72,110);
  putWord(base+0x6a,10+i);putWord(base+0x108,0x1200);putWord(base+0xb4,0x0080);putWord(base+0xb6,0x1234);
  memory[base+0x33]=i===0?3:i===2?0x83:i===3?0x80:0;
  memory[base+0x56]=i<4?i%2?64:0:128;
  putLong(base+6,((i<2?540:740)*65536+0x1234)|0);putLong(base+10,336*65536+0x5678);putLong(base+14,320*65536+0x2345);
  putLong(base+0x86,bases[i^1]||bases[0]);putLong(base+0x26,bases[i<4?i^2:0]);
 }
 if([1,6,9].includes(state))memory[bases[0]+0x35]|=1;
 if([4,8].includes(state)){memory[bases[0]+0x35]|=2;memory[bases[2]+0x35]|=4;}
 if(variant==='nestedPin')memory[bases[2]+0x35]|=1;
 if(state===3){
  if(variant!=='insideBoth'&&variant!=='outsideB')memory[bases[0]+0x33]|=4;
  if(variant==='outsideBoth'||variant==='outsideB')memory[bases[2]+0x33]|=4;
 }
 if(state===9){for(const i of [0,1])putWord(bases[i]+0xfe,0x4000);for(const i of [2,3])putWord(bases[i]+0xfe,0x4001);}
 if(variant==='focusForced')putWord(bases[0]+0xfe,0x8000);
 memory[ref]=128;memory[ref+1]=state?1:0;putWord(ref+2,12);putWord(ref+0x20,state|(initialized?0:0x8000));
 putWord(ref+0x1c,initialized?0x8000|state:0);putWord(ref+0x2e,facing);putWord(ref+4,facing|(state===6?4:state===9?15:0));
 putLong(ref+6,x*65536+0x1111);putLong(ref+10,408*65536+0x2222);putLong(ref+14,320*65536+0x3333);
 putWord(ref+0x22,state===6?20:8);putWord(ref+0x24,state===6||state===3?0:4);putWord(ref+0x2a,22);putWord(ref+0x54,0x3162);
 putWord(ref+0x30,640);putWord(ref+0x1e,336);putWord(ref+0x60,620);putWord(ref+0x62,336);
 putLong(ref+0x4c,bases[0]);putLong(ref+0x50,bases[2]);putLong(ref+0x56,bases[0]);
 if(variant==='clockBytes'){
  putWord(ref+0x22,0xab14);putWord(ref+0x24,0xcd04);putWord(ref+4,0xef02);putWord(ref+0x2c,0x1200);putWord(ref+0x2e,facing|0x005a);
  for(const base of [0xc0744,0xc1188])for(let i=0;i<32;i++)putWord(base+Math.trunc(i/8)*256+(i%8)*2,0x1200+i);
 }
 if(variant==='refereeAssist')putLong(ref+0x7e,bases[4]);
 const initial=refereeSnapshot(),actors=actorsSnapshot(),world=worldSnapshot(),hash=createHash('sha256'),rows=[],events=[];
 let count=0;
 const limit=state===3?1660:500;
 for(let tick=0;tick<limit;tick++){
  sounds.length=0;
  if(tick===config.breakAt){memory[bases[0]+0x35]&=~1;events.push({tick,index:0,flags35:memory[bases[0]+0x35]});}
  const current=word(ref+0x20)&255;call(long(0x1eb78+current*4));call(0x1ed16);call(0x248c);
  if(mode&2)call(0xeb24);
  const row={referee:refereeSnapshot(),actors:actorsSnapshot(),world:worldSnapshot(),sounds:[...sounds]};
  hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);count++;
 }
 sequences.push({...config,initial,actors,world,events,count,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
const initializationCases=[];
for(let scenario=0;scenario<32;scenario++){
 memory.fill(0,0x1c0000,0x1c4000);
 for(const offset of Object.values(words))putWord(ref+offset,(scenario*0x1234+offset*19)&65535);
 for(const offset of Object.values(bytes))memory[ref+offset]=(scenario*17+offset)&255;
 putWord(ref,0x1234);putWord(ref+2,7);putWord(ref+0x20,9);putWord(ref+0x1c,0x8009);putWord(ref+0x22,0x1234);putWord(ref+0x24,0x5678);putWord(ref+4,0xabcd);
 for(const[offset,value]of [[6,0x12345678],[10,0x23456789],[14,0x3456789a]])putLong(ref+offset,(value+scenario*7)|0);
 putLong(ref+0x4c,bases[0]);putLong(ref+0x50,bases[2]);putLong(ref+0x56,bases[0]);putLong(ref+0x7e,bases[4]);
 memory[0x1c1697]=0x24;
 const snapshot=()=>({activeWord:word(ref),type:word(ref+2),...refereeSnapshot()});
 const initial=snapshot();call(0xf958);
 initializationCases.push({initial,result:snapshot(),controlsRefresh:memory[0x1c1697]});
}
const glyphCases=[];
for(const flag of [0,0x8000])for(let number=0;number<=20;number++){
 for(const base of [0xc0744,0xc1188])for(let i=0;i<32;i++)putWord(base+Math.trunc(i/8)*256+(i%8)*2,0x1200+i);
 const initial=tiles();cpu.d[0]=number|flag;call(0x1f8a2);const result=tiles();call(0x1f924);
 glyphCases.push({number:number|flag,initial,result,cleared:tiles()});
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2 original referee kernel, count tiles and linked requests',sequences,glyphCases,initializationCases},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
