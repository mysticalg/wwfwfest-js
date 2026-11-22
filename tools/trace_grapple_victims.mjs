// Original victim flight/landing kernels and normal-scene outside collision.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));const cpu=new MC68000(),sounds=[];
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const actor=0x1c05b0,attacker=0x1c06bc;
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
function call(address){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=actor;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<50000)cpu._execute();assert(steps<50000,`Victim kernel stuck at ${cpu.pc.toString(16)}`);
}
let seed=0x56494354;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const collisionHash=createHash('sha256');
for(let index=0;index<32768;index++){
 memory.fill(0,actor,attacker+0x10c);
 const initial={x:random()%1100,y:random()%800,z:random()%600,facing:random()&0x8000,flags32:[0,1,16,32][index%4],
  paddingX:random()%161-80,paddingY:random()%65-32,paddingZ:random()%65-32,kind:index%4,flags:index&31};
 for(const[key,offset]of [['x',6],['y',10],['z',14],['facing',0x2e],['paddingX',0x3e],['paddingY',0x40],['paddingZ',0x42]])putWord(actor+offset,initial[key]);
 memory[actor+0x32]=initial.flags32;memory[actor+0x33]=4;memory[actor+0x36]=initial.kind;memory[actor+0x37]=initial.flags;
 call(0x27302);
 collisionHash.update(JSON.stringify([memory[actor+0x36],memory[actor+0x37],word(actor+0x38),word(actor+0x3a),word(actor+0x3c)])+'\n');
}
const cases=[];
for(const reaction of [19,21,22,34,35,41])for(const facing of [0,0x8000])for(const x of [475,640,790])for(const severity of [0,1,2]){
 cases.push({reaction:reaction|(severity===2?0x2000:0),facing,severity,health:[90,45,20][severity],maximumHealth:100,
  xFixed:x*65536+0x1234,yFixed:336*65536+0x5678,zFixed:384*65536+0x2345,attackerFacing:facing^0x8000,mode:0});
}
for(const reaction of [19,21,22,34,35,41])for(const facing of [0,0x8000])for(const y of [284,404]){
 cases.push({reaction:reaction|0x2000,facing,severity:2,health:20,maximumHealth:100,xFixed:640*65536+0x1234,
  yFixed:y*65536+0x5678,zFixed:352*65536+0x2345,attackerFacing:facing^0x8000,mode:0,mashEvery:4});
}
for(const facing of [0,0x8000])for(const x of [440,475,790,840])for(const attackerFacing of [0,0x8000])for(const mode of [0,1,2]){
 cases.push({reaction:0x2016,facing,severity:1,health:45,maximumHealth:100,xFixed:x*65536+0x1234,
  yFixed:336*65536+0x5678,zFixed:384*65536+0x2345,attackerFacing,mode});
}
const filter=process.env.VICTIM_FILTER?JSON.parse(process.env.VICTIM_FILTER):{},scenarios=[];
for(const initial of cases){
 if(!Object.entries(filter).every(([key,value])=>initial[key]===value))continue;
 memory.fill(0,0x1c0000,0x1c4000);memory[actor]=128;putWord(0x1c007c,1);memory[0x1c0161]=initial.mode;
 putWord(0x1c17e6,461);putWord(0x1c17ee,577);putLong(actor+0x26,attacker);putLong(actor+0x7a,attacker);
 putLong(attacker+0x26,actor);putWord(attacker+0x2e,initial.attackerFacing);
 putWord(actor+0x20,4);putWord(actor+0x1c,0x8005);putWord(actor+0x64,initial.reaction);putWord(actor+4,initial.facing);putWord(actor+0x90,initial.facing);
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14]])putLong(actor+offset,initial[key]);
 for(const[key,offset]of [['facing',0x2e],['severity',0x70],['health',0x66],['maximumHealth',0x72]])putWord(actor+offset,initial[key]);
 const hash=createHash('sha256'),rows=[];let count=0,handoff=false,done=false;
 for(let tick=0;tick<800;tick++){
  sounds.length=0;const pressed=initial.mashEvery&&tick%initial.mashEvery===0?1:0;memory[actor+0xa3]=pressed;
  if(pressed&&(word(actor+0x20)&0x8000))call(0xde04);
  const state=word(actor+0x20);
  if(!(state&0x8000)){putWord(actor+0x1e,word(actor+0x1c));putWord(actor+0x1c,state);putWord(actor+0x20,state|0x8000);}
  putWord(actor+0x36,0);
  if(memory[actor+1]){call(0x27302);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])putWord(actor+p,word(actor+p)+word(actor+c));}
  call(0x1b27e);call(0x248c);call(0x2218);call(0x232b6);
  const row=[word(actor+0x20)&255,word(actor+0x64),word(actor+0x60),word(actor+0x1c),word(actor+0x22),word(actor+0x24),word(actor+4),
   long(actor+6),long(actor+10),long(actor+14),memory[actor+1],word(actor+0x58),word(actor+0x5a),word(actor+0x5c),word(actor+0x5e),
   word(actor+0x3e),word(actor+0x40),word(actor+0x42),memory[actor+0x36],memory[actor+0x37],word(actor+0x9a),word(actor+0xaa),
   word(actor+0x2e),memory[actor+0x32],memory[actor+0x33],memory[actor+0x34],word(actor+0x44),word(actor+0x54),word(attacker+0xc4),
   [word(0x1c1150),word(0x1c1180),word(0x1c11b0),word(0x1c11e0)],
   [word(actor+0x14)<<16>>16,232-(word(actor+0x16)<<16>>16)],[...sounds]];
  hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);count++;
  done=(word(actor+0x20)&255)===0;handoff=(word(actor+0x20)&255)===5&&![56,120].includes(word(actor+0x60));
  if(done||handoff)break;
 }
 scenarios.push({initial,count,done,handoff,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2, victim flight/landing handlers and outside-plane collision',
 collision:{count:32768,sha256:collisionHash.digest('hex')},scenarios},null,2)+'\n');
console.log(JSON.stringify({scenarios:scenarios.length,updates:scenarios.reduce((sum,s)=>sum+s.count,0),handoffs:scenarios.filter(s=>s.handoff).length}));
