import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const pool=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c),slots=[0,1,4,5],bases=slots.map(i=>pool[i]),ref=0x1c11f4;
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const sounds=[],entropy=[],effects=[];
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
function call(address,actor=bases[0]){
 cpu.pc=address;cpu.a[0]=actor;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x24e6,0x1e204,0x1e234].includes(cpu.pc))entropy.push({kind:'ai',value:cpu.d[0]&255});
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push({kind:'contest',value:cpu.d[0]&15});
  if(cpu.pc===0x102e6)entropy.push({kind:'pin',value:cpu.d[0]&255});
  if(cpu.pc===0xff7a)effects.push({actor:bases.indexOf(cpu.a[0]),kind:cpu.d[0]&255});
  cpu._execute();
 }
 assert(steps<100000,`Tag call stuck ${cpu.pc.toString(16)}`);
}
const words={type:2,facing:0x2e,state:0x20,action:0x60,reaction:0x64,previousState:0x1e,drawMode:0x12,speed:0x2a,direction:0x2c,
 holdFlags:0x44,timer:0x46,contact:0x4c,pendingDamage:0x68,health:0x66,maximumHealth:0x72,severity:0x70,
 velocityX:0x58,velocityY:0x5a,velocityZ:0x5c,gravity:0x5e,paddingX:0x3e,paddingY:0x40,paddingZ:0x42,offsetX:0x18,offsetY:0x1a,
 inputBlockA:0xb4,inputBlockB:0xb6,aiDistanceX:0xb0,aiDistanceY:0xb2,controlCounter:0xbc,aiEscapeTimer:0xba,
 walkMode:0xae,apronTimer:0xc8,supportTimer:0xe6,recoveryTimer:0x9a,mash:0xaa,healthAccumulator:0x6a,idleTimer:0xd0,
 forced:0xfe,comboCount:0x52,comboTimer:0x54,resultPose:0x4a,pinStatus:0x108};
const bytes={movementMode:1,flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags57:0x57,flags74:0x74,flags75:0x75,flagsC6:0xc6,hitCounter:0xc7,aiFlagsB9:0xb9,region:0x31};
function actors(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])result[key]=long(base+offset);
 for(const[key,offset]of [['auxiliaryIndex',0x26],['opponentIndex',0x7a],['partnerIndex',0x86]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 result.unlinkMarked=Boolean(memory[base+0x26]&128);
 result.clock={flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)};
 result.projection=[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)];return result;
});}
function snapshot(){
 const palettes={};
 for(let type=0;type<12;type++){const data=Array.from({length:16},(_,i)=>word(0x180100+type*128+i*2));if(data.some(Boolean))palettes[8+type*4]=data;}
 return{actors:actors(),sounds:[...sounds],effects:[...effects],world:{message:word(0x1c15d2),controlsRefresh:memory[0x1c1697],
  cornerOccupancy:long(0x1c1670),switchTimer:word(0x1c1682),activeA:bases.indexOf(long(0x1c1684)),activeB:bases.indexOf(long(0x1c1688)),paletteUpdates:palettes}};
}
const configs=[];
for(const side of [0,1])for(let type=0;type<12;type++)for(const order of [0,1])configs.push({side,type,order});
const filter=process.env.TAG_FILTER?JSON.parse(process.env.TAG_FILTER):{},sequences=[];
for(const config of configs){
 if(!Object.entries(filter).every(([key,value])=>config[key]===value))continue;
 memory.fill(0,0x1c0000,0x1c4000);memory.fill(0,0x180000,0x181000);cpu.d.fill(0);cpu.a.fill(0);
 put(0x1c007c,0x8000);put(0x1c0066,16);put(0x1c16a0,0x30);
 put(0x1c17e6,461);put(0x1c17ea,461);put(0x1c17ee,577);put(0x1c17f2,577);
 const holder=config.side?2:0,victim=config.side?0:2,incoming=holder+1;
 for(const[index,base]of pool.entries()){putLong(base+0x86,pool[index^1]||pool[8]);memory[base+0x56]=index<4?64:192;}
 for(const[index,base]of bases.entries()){
  const team=index>1,bench=index&1,type=index===incoming?config.type:team?6:0;
  put(base,0x8000);put(base+2,type);memory[base+0x57]=type;memory[base+0x56]=team?(bench?192:128):bench?64:0;memory[base+0x104]=128;
  call(0xf9c2,base);put(base+0x20,bench?0x8001:0x8000);put(base+0x1c,bench?0x8001:0x8000);
  memory[base+0x32]=bench?1:0;memory[base+0x33]=(team?128:0)|(bench?0:team?1:3);
  putLong(base+6,((bench?(team?828:438):640)*65536+0x1234)|0);putLong(base+10,337*65536+0x5678);putLong(base+14,320*65536);
  put(base+0x2e,team?0:0x8000);put(base+4,team?0:0x8000);put(base+0x90,word(base+4));
  put(base+0xae,bench?1:0);put(base+0x12,bench?4:0);put(base+0x44,bench?94:0);
  putLong(base+0x7a,bases[team?0:2]);putLong(base+0x82,bases[team?0:2]);
  putLong(base+0x8a,index===0?0x140020:0);
 }
 const a=bases[holder],b=bases[victim];put(a+0x20,5);put(a+0x60,102);put(a+0x1c,0x8005);
 put(b+0x20,0x80ff);put(b+0x60,123);put(b+0x1c,0x80ff);put(b+4,0xffff);
 putLong(a+0x26,b);putLong(b+0x26,a);memory[a+0x33]|=64;memory[b+0x33]|=64;
 putLong(0x1c1684,bases[0]);putLong(0x1c1688,bases[2]);
 const initial=actors(),world={inGame:true,gameFlags:0x8000,mode:0,round:0,clockMinutesBCD:0x30,message:0,controlsRefresh:0,
  cornerOccupancy:0,switchTimer:0,activeA:0,activeB:2,paletteUpdates:{}};
 const entropyFrames=[],rows=[],hash=createHash('sha256');let count=0,boundary=null;
 for(let tick=0;tick<650;tick++){
  if(!process.env.TAG_CONTINUE&&tick&&(word(a+0x20)===0x8000)){boundary='outgoing-idle-ai';break;}
  sounds.length=entropy.length=effects.length=0;putLong(0x1c0080,tick);
  for(const base of bases){memory[base+0xa3]=0;put(base+0xa8,0);}call(0x1fab4);call(0xe3ca);call(0x1b390);
  const updateOrder=config.order?[...bases].reverse():bases;
  // Alternate order is a component stress fixture, not the original pool iterator.
  for(const base of updateOrder){
   const state=word(base+0x20);if(!(state&0x8000)){put(base+0x1e,word(base+0x1c));put(base+0x1c,state);put(base+0x20,state|0x8000);}
   put(base+0x36,0);if(memory[base+1]){call(0x27302,base);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])put(base+p,word(base+p)+word(base+c));}
   call(0x1b27e,base);call(0x248c,base);call(0x2218,base);
  }
  call(0x232b6);for(const base of bases)if((word(base+4)&0x7fff)!==0x7fff&&(memory[base+0x26]&128)&&!word(base+0xfe))putLong(base+0x26,0);
  if(!(tick&1)){call(0x23288);call(0x2407e);}
  const row=snapshot();hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);entropyFrames.push([...entropy]);count++;
 }
 sequences.push({...config,holder,victim,incoming,initial,world,count,boundary,entropyFrames,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Original four-participant corner tag: human input, active linked/apron/corner AI, actor handlers, contact and damage; stop before ordinary outgoing idle AI',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
