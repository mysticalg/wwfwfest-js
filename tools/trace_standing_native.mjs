import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const base=0x1c05b0,peer=base+0x10c,word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const sounds=[];cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
function call(address){
 cpu.pc=address;cpu.a[0]=base;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<10000)cpu._execute();assert(steps<10000);
}
const words={facing:0x2e,state:0x20,action:0x60,reaction:0x64,previousState:0x1e,drawMode:0x12,speed:0x2a,direction:0x2c,
 holdFlags:0x44,timer:0x46,contact:0x4c,velocityX:0x58,velocityY:0x5a,velocityZ:0x5c,gravity:0x5e,
 paddingX:0x3e,paddingY:0x40,paddingZ:0x42,offsetX:0x18,offsetY:0x1a,walkMode:0xae,comboCount:0x52,comboTimer:0x54};
const bytes={movementMode:1,flags32:0x32,flags33:0x33,flags34:0x34,flags56:0x56};
const groundActors=Boolean(process.env.GROUND_ACTORS);
if(groundActors){words.forced=0xfe;words.idleTimer=0xd0;words.mash=0xaa;bytes.flags74=0x74;bytes.flags75=0x75;}
function snapshot(){
 const result={};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14]])result[key]=long(base+offset);
 result.auxiliaryIndex=(long(base+0x26)&0x7fffffff)===peer?1:-1;result.unlinkMarked=Boolean(memory[base+0x26]&128);
 result.secondaryPinnerIndex=long(base+0x9c)===peer?1:-1;
 result.clock={flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)};
 result.projection=[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)];return result;
}
const sequences=[];
for(const kind of (groundActors?['wait60','idle61','retreat62','rush117']:['punch','kick','hit0','hit10','hit32']))for(const facing of [0,0x8000])for(const x of [440,640,848])for(let link=0;link<4;link++)for(let variant=0;variant<3;variant++){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 put(0x1c007c,0x8000);put(0x1c17e6,461);put(0x1c17ea,461);put(0x1c17ee,577);put(0x1c17f2,577);
 const state=kind.startsWith('hit')?4:5,value=state===4?Number(kind.slice(3)):groundActors?Number(kind.match(/\d+/)[0]):kind==='punch'?0:114;
 put(base,0x8000);put(base+0x20,state);put(base+0x60,state===5?value:0x1234);put(base+0x64,state===4?value|(variant===2?0x8000:variant===1?0x2000:0):0x2345);
 put(base+0x1c,0x8001);put(base+0x22,5);put(base+0x24,2);put(base+4,facing|3);put(base+0x90,facing|3);put(base+0x2e,facing);
 putLong(base+6,(x*65536+0x1234)|0);putLong(base+10,337*65536+0x5678);putLong(base+14,320*65536);
 memory[base+1]=1;memory[base+0x32]=state===4&&variant===1?1:0;memory[base+0x33]=variant===2?0xa1:3;memory[base+0x56]=variant===2?128:0;
 put(base+0x58,321);put(base+0x2a,40);put(base+0x2c,64);put(base+0x18,0x8001);put(base+0x1a,17);put(base+0x52,2);put(base+0x54,19);
 if(groundActors){if(variant===1)memory[base+1]=0;if(variant===2){memory[base+0x74]=128;memory[base+0x75]=1;}}
 putLong(base+0x26,link?peer:0);putLong(peer+0x26,link===1?base:link===3?base|0x80000000:0);putLong(base+0x9c,peer);
 const initial=snapshot(),rows=[],hash=createHash('sha256');let boundary=false;
 for(let tick=0;tick<160;tick++){
  if(groundActors&&tick===64)put(base+0xfe,0x8000);
  sounds.length=0;const s=word(base+0x20);if(!(s&0x8000)){put(base+0x1e,word(base+0x1c));put(base+0x1c,s);put(base+0x20,s|0x8000);}
  put(base+0x36,0);if(memory[base+1]){call(0x27302);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])put(base+p,word(base+p)+word(base+c));}
  call(0x1b27e);call(0x248c);call(0x2218);call(0x232b6);
  const row={actor:snapshot(),sounds:[...sounds]};rows.push(row);hash.update(JSON.stringify(row)+'\n');
  if(!(word(base+0x20)&0x8000)){boundary=true;break;}
 }
 assert(boundary,`Standing sequence did not finish: ${kind}`);
 sequences.push({kind,facing,x,link,variant,groundActors,initial,count:rows.length,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:groundActors?'Original shared-record ground actions 60/61/62/117, through requested next state or forced exit':'Original shared-record standing actions 0/114 and reactions 0/10/32, through requested next state',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
