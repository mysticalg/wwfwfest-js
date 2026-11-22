// Real program arbitration -> human input -> referee -> linked actor updates
// -> contact/damage, with passive AI and explicit run-input sampling.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU(),sounds=[],entropy=[];memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const pool=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c),bases=[pool[0],pool[4]],ref=0x1c11f4;
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
function call(address,actor=bases[0]){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[0]=actor;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if(cpu.pc===0xe938)entropy.push({kind:'arbitration',value:cpu.d[0]&15});
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push({kind:'contest',value:cpu.d[0]&15});
  if(cpu.pc===0x102e6)entropy.push({kind:'pin',value:cpu.d[0]&255});
  cpu._execute();
 }
 assert(steps<100000,`Program call stuck at ${cpu.pc.toString(16)}`);
}
function snapshot(){return{actors:bases.map(base=>{const state=word(base+0x20)&255;
 return[state,state===5?word(base+0x60):state===4?word(base+0x64):0,word(base+4),word(base+0x4c),long(base+6),long(base+10),long(base+14),
  word(base+0x66),word(base+0x70),word(base+0x2e),word(base+0x52),word(base+0x54),
  [word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)]];}),
 referee:[word(ref+0x20),word(ref+0x1c),word(ref+0x22),word(ref+0x24),word(ref+4),long(ref+6),long(ref+10),long(ref+14)],
 message:word(0x1c15d2),sounds:[...sounds],count:word(0x1c169a),countTiles:Array.from({length:32},(_,i)=>word(0xc0744+Math.trunc(i/8)*256+(i%8)*2))};}
const cases=[];
for(let type=0;type<12;type++)for(const facing of [0,0x8000])for(const severity of [0,1,2])for(const toggle of [0,7])for(const buttons of [1,2,3])
 cases.push({type,facing,severity,toggle,buttons});
const filter=process.env.MATCH_GRAPPLE_FILTER?JSON.parse(process.env.MATCH_GRAPPLE_FILTER):{},sequences=[];
for(const config of cases){
 if(!Object.entries(filter).every(([key,value])=>config[key]===value))continue;
 memory.fill(0,0x1c0000,0x1c4000);memory.fill(0,0xc0000,0xc2000);cpu.d.fill(0);cpu.a.fill(0);
 put(0x1c007c,1);put(0x1c0066,16);
 for(const[index,base]of pool.entries()){
  put(base,0x8000*(index===0||index===4));put(base+0x20,0x8000);memory[base+0x32]=1;
  memory[base+0x56]=index<4?64:128;memory[base+0x104]=128;putLong(base+14,320*65536);
  putLong(base+0x86,pool[index^1]||pool[8]);call(0xf9c2,base);
 }
 for(const[index,base]of bases.entries()){
  const type=index?6:config.type,face=index?config.facing^0x8000:config.facing;
  put(base+2,type);memory[base+0x57]=type;memory[base+0x56]=index?128:0;memory[base+0x104]=128;call(0xf9c2,base);
  memory[base+0x32]=0;memory[base+0x33]=index?0x81:3;
  put(base+0x1c,0x8000);put(base+0x4c,1);put(base+4,face);put(base+0x90,face);put(base+0x2e,face);
  putLong(base+6,(640+(index?(config.facing?-60:60):0))*65536+0x1234);putLong(base+10,336*65536+0x5678);
  putLong(base+0x7a,bases[1-index]);putLong(base+0x82,bases[1-index]);
 }
 memory[bases[0]+0x62]=config.toggle;
 const targetHealth=[word(bases[1]+0x72),Math.floor(word(bases[1]+0x72)/2),20][config.severity];
 put(bases[1]+0x66,targetHealth);put(bases[1]+0x70,config.severity);
 putLong(0x1c1684,bases[0]);putLong(0x1c1688,bases[1]);call(0xf958,ref);
 put(0x1c17e6,461);put(0x1c17ea,461);put(0x1c17ee,577);put(0x1c17f2,577);put(0x1c17da,14);put(0x1c17dc,18);
 const inputs=[],entropyFrames=[],rows=[],hash=createHash('sha256');let entered=false,selected=false,previousPress=0,boundary=null,count=0;
 for(let tick=0;tick<1800;tick++){
  const a=bases[0],state=word(a+0x20)&255,action=word(a+0x60)&255;
  if(tick&&bases.some(base=>[1,8,9,10,13,14].includes(word(base+0x20)&255)||((word(base+0x20)&255)===5&&[104,122,140,142].includes(word(base+0x60)&255)))){boundary=snapshot();break;}
  sounds.length=entropy.length=0;putLong(0x1c0080,tick);
  // Start with the first ordinary human-vs-AI arbitration (index zero guarantees control).
  let pressed=0;
  if(!entered&&state===12&&(word(a+0x44)&255)===1){pressed=1;entered=true;}
  else if(entered&&!selected&&state===5&&action===21&&!previousPress){pressed=config.buttons;selected=true;}
  previousPress=pressed;inputs.push(pressed);memory[a+0xa3]=pressed;memory[bases[1]+0xa3]=0;
  put(a+0xa8,0);put(bases[1]+0xa8,0);
  call(0x1fab4);call(0xe7b4);call(0xe3ca);
  if((word(bases[1]+0x20)&255)===2)call(0xe58c,bases[1]);
  const refState=word(ref+0x20)&255;call(long(0x1eb78+refState*4),ref);call(0x1ed16,ref);call(0x248c,ref);
  for(const base of bases){
   const state=word(base+0x20);if(!(state&0x8000)){put(base+0x1e,word(base+0x1c));put(base+0x1c,state);put(base+0x20,state|0x8000);}
   put(base+0x36,0);
   if(memory[base+1]){call(0x27302,base);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])put(base+p,word(base+p)+word(base+c));}
   call(0x1b27e,base);call(0x248c,base);call(0x2218,base);
  }
  call(0x232b6);
  for(const base of bases)if((word(base+4)&0x7fff)!==0x7fff&&(memory[base+0x26]&128)&&!word(base+0xfe))putLong(base+0x26,0);
  if(!(tick&1)){call(0x23288);call(0x2407e);}
  const row=snapshot();hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);entropyFrames.push([...entropy]);count++;
  if(selected&&bases.every(base=>word(base+0x20)===0x8000&&word(base+4)===word(base+0x2e)))break;
 }
 sequences.push({...config,targetHealth,inputs,entropyFrames,count,boundary,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Original standing arbitration, human grapple selection, referee, both participants and alternating contacts/damage; passive AI',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
