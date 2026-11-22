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
const manual=false,expanded=true;
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c){sounds.push(v&255);if(process.env.DEBUG_SOUND)console.log(JSON.stringify({tick:long(0x1c0080),sound:v&255,pc:cpu.pc.toString(16),stack:Array.from({length:5},(_,i)=>(long(cpu.a[7]+i*4)>>>0).toString(16))}));}};
function call(address,actor=bases[0]){
 cpu.pc=address;cpu.a[0]=actor;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x24e6,0x1e204,0x1e234].includes(cpu.pc))entropy.push({kind:'ai',value:cpu.d[0]&255});
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push({kind:'contest',value:cpu.d[0]&15});
  if(cpu.pc===0x102e6)entropy.push({kind:'pin',value:cpu.d[0]&255});
  if(cpu.pc===0xe938)entropy.push({kind:'arbitration',value:cpu.d[0]&15});
  if(cpu.pc===0xff7a)effects.push({actor:bases.indexOf(cpu.a[0]),kind:cpu.d[0]&255});
  cpu._execute();
 }
 assert(steps<100000,`Tag call stuck ${cpu.pc.toString(16)}`);
}

const scenarios=[];
for(let phrase=0;phrase<46;phrase++)scenarios.push({message:0x0f00|phrase,type:0,lead:true,interrupt:false});
for(let type=0;type<24;type++)for(const lead of [false,true])scenarios.push({message:(type<<8)|24,type:type%12,lead,interrupt:false});
for(const phrase of [2,22,32,34,37,39,42,43,44,45])scenarios.push({message:0x0f00|phrase,type:0,lead:true,interrupt:true});
const sequences=[];
for(const config of scenarios){
 memory.fill(0,0x1c0000,0x1c4000);put(0x1c007c,0x8000);putLong(bases[0],0x80000000);memory[bases[0]+0x57]=config.type;memory[bases[0]+0x33]=Number(config.lead);
 put(0x1c15d2,config.message);const rows=[];
 for(let tick=0;tick<2200;tick++){
  sounds.length=0;if(config.interrupt&&tick===4)put(0x1c15d2,0x0f0b);call(0x9ba8);
  rows.push({message:word(0x1c15d2),messagePending:word(0x1c15d4),messageIndex:word(0x1c15d6),messageTimer:word(0x1c15d8),sounds:[...sounds]});
  if(!word(0x1c15d2)&&!word(0x1c15d4))break;
 }
 const hash=createHash('sha256');for(const row of rows)hash.update(JSON.stringify(row)+'\n');
 sequences.push({config,count:rows.length,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Original $009ba8/$009ecc announcer service from explicit message and active-role inputs. All 46 phrase entries, 24 name entries with lead/bench eligibility, and interrupted requests. No full audio synthesis comparison.',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
