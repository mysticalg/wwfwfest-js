import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {LinkedActor} from '../src/actors/linked-actor.js';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const pool=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c),slots=[0,1,4,5],bases=slots.map(i=>pool[i]),ref=0x1c11f4;
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const sounds=[],entropy=[],effects=[];
const d1History=[];
const debugHold=Boolean(process.env.DEBUG_HOLD),debugSound=Boolean(process.env.DEBUG_SOUND);
const manual=false,expanded=true;
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c){sounds.push(v&255);if(debugSound)console.log(JSON.stringify({tick:long(0x1c0080),sound:v&255,pc:cpu.pc.toString(16),stack:Array.from({length:5},(_,i)=>(long(cpu.a[7]+i*4)>>>0).toString(16))}));}};
function call(address,actor=bases[0]){
 cpu.pc=address;cpu.a[0]=actor;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x24e6,0x1e204,0x1e234].includes(cpu.pc))entropy.push({kind:'ai',value:cpu.d[0]&255});
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push({kind:'contest',value:cpu.d[0]&15});
  if(cpu.pc===0x102e6)entropy.push({kind:'pin',value:cpu.d[0]&255});
  if(cpu.pc===0xe938)entropy.push({kind:'arbitration',value:cpu.d[0]&15});
  if(cpu.pc===0xff7a)effects.push({actor:bases.indexOf(cpu.a[0]),kind:cpu.d[0]&255});
  if(debugHold&&cpu.pc===0x14c26)console.log(JSON.stringify({tick:long(0x1c0080),actor:bases.indexOf(cpu.a[0]),d1:cpu.d[1]&255,history:d1History}));
  const priorD1=cpu.d[1],priorPC=cpu.pc;
  cpu._execute();
  if(debugHold&&priorD1!==cpu.d[1]){d1History.push([priorPC.toString(16),cpu.d[1]]);if(d1History.length>8)d1History.shift();}
 }
 assert(steps<100000,`Tag call stuck ${cpu.pc.toString(16)}`);
}
const words={grappleIndex:0x48,lastPose:0x90,type:2,facing:0x2e,state:0x20,action:0x60,reaction:0x64,previousState:0x1e,drawMode:0x12,speed:0x2a,direction:0x2c,
 holdFlags:0x44,timer:0x46,contact:0x4c,pendingDamage:0x68,health:0x66,maximumHealth:0x72,severity:0x70,
 velocityX:0x58,velocityY:0x5a,velocityZ:0x5c,gravity:0x5e,paddingX:0x3e,paddingY:0x40,paddingZ:0x42,offsetX:0x18,offsetY:0x1a,
 inputBlockA:0xb4,inputBlockB:0xb6,aiDistanceX:0xb0,aiDistanceY:0xb2,controlCounter:0xbc,aiEscapeTimer:0xba,
 walkMode:0xae,apronTimer:0xc8,supportTimer:0xe6,recoveryTimer:0x9a,mash:0xaa,healthAccumulator:0x6a,idleTimer:0xd0,
 forced:0xfe,comboCount:0x52,comboTimer:0x54,resultPose:0x4a,pinStatus:0x108};
const bytes={moveToggle:0x62,movementMode:1,flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags57:0x57,flags74:0x74,flags75:0x75,flagsC6:0xc6,hitCounter:0xc7,aiFlagsB9:0xb9,region:0x31};
if(expanded){words.hitMask=0x8e;words.cornerInput=0xac;words.targetX=0xbe;words.targetY=0xc0;}
function actors(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])result[key]=long(base+offset);
 for(const[key,offset]of [['auxiliaryIndex',0x26],['opponentIndex',0x7a],['partnerIndex',0x86]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 if(expanded)for(const[key,offset]of [['lastHitIndex',0x92],['secondaryPinnerIndex',0x9c],['secondaryOpponentIndex',0x82]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 result.assistanceTargetIndex=bases.indexOf(long(base+0x7e)&0x7fffffff);
 result.attempts=Object.fromEntries(attemptOffsets.map(offset=>[offset,word(base+offset)]));
 result.unlinkMarked=Boolean(memory[base+0x26]&128);
 result.clock={flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)};
 result.projection=[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)];return result;
});}

const attemptOffsets=[...Array.from({length:10},(_,i)=>0xd2+i*2),...Array.from({length:11},(_,i)=>0xe8+i*2)];
function snapshot(){return{actors:actors(),sounds:[...sounds],effects:[...effects],world:{message:word(0x1c15d2),controlsRefresh:memory[0x1c1697],switchTimer:word(0x1c1682),assistDistance:word(0x1c1692),assistCandidate:bases.indexOf(long(0x1c168c))}};}
const profiles=['standing0','standing1','stagger1','miss-x80','miss-y16','miss-face','miss-link','apron-miss','committed','held82','held82-impact','escape88','impact109','impact109-apron'];
const filter=process.env.SIDE_FILTER?JSON.parse(process.env.SIDE_FILTER):{},sequences=[];
for(const profile of profiles)for(const mode of [0,1])for(let type=0;type<12;type++){
 const config={profile,mode,type};if(!Object.entries(filter).every(([k,v])=>config[k]===v))continue;
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 put(0x1c007c,0x8000);put(0x1c0160,mode);put(0x1c17e6,461);put(0x1c17ee,577);
 const world={mode,inGame:true,gameFlags:0x8000,message:0x602,controlsRefresh:0x24,switchTimer:17,assistDistance:19,assistCandidate:-1};
 const bs=slots.map((slot,i)=>new LinkedActor({world,slot,type:i?6:type,state:0x8000,
  health:110,maximumHealth:110,flags32:i&1?1:0,flags33:[67,0,193,128][i],flags56:[0,64,128,192][i],flags57:i?6:type,
  xFixed:[600,520,640,800][i]*65536+0x1234+i*0x1111,yFixed:337*65536+0x4321+i*0x1111,zFixed:320*65536+i*0x1111,
  facing:type&1?0:0x8000,flags34:0,flags35:0,inputBlockA:0,inputBlockB:0,supportTimer:17,severity:type%3,clock:{flags:0x8000,index:0,remaining:0,pose:0}}));
 const[a,s,p,t]=bs;for(let i=0;i<4;i++){bs[i].partner=bs[i^1];bs[i].opponent=bs[i<2?2:0];bs[i].lastPose=bs[i].clock.pose;for(const off of attemptOffsets)bs[i].attempts[off]=0;}
 a.change(5,28);a.auxiliary=p;p.auxiliary=a;
 p.state=profile==='standing1'?1:profile==='stagger1'?4:0;p.reaction=1;p.clock.flags=0x8000|p.state;
 if(profile==='miss-x80')p.xFixed=a.xFixed+80*65536;
 if(profile==='miss-y16')p.yFixed=a.yFixed+16*65536;
 if(profile==='miss-face')p.facing^=0x8000;
 if(profile==='miss-link')p.auxiliary=null;
 if(profile==='apron-miss'){a.flags32|=1;p.xFixed=a.xFixed+80*65536;}
 if(profile==='committed'){a.action|=0x8000;p.state=5;p.action=0x8052;a.flags35=2;a.flags33|=64;p.flags35=4;}
 if(profile==='held82'||profile==='held82-impact'){
  a.change(5,82);p.state=5;p.action=0x801c;p.clock.flags=0x8005;p.flags35=2;
  if(profile==='held82-impact'){a.holdFlags=1;a.comboCount=65535;}
 }
 if(profile==='escape88'){a.change(5,88);a.flags35=4;p.state=5;p.action=0x801c;p.flags35=2;a.assistanceTarget=t;p.assistanceTarget=s;}
 if(profile.startsWith('impact109')){a.change(5,109);a.auxiliary=null;if(profile.endsWith('apron'))a.flags32|=1;}
 for(const [i,b]of bs.entries()){
  const base=bases[i];put(base,0x8000);
  for(const[k,o]of Object.entries(words))put(base+o,k==='state'?b.state|(b.pendingState?0:0x8000):b[k]||0);
  for(const[k,o]of Object.entries(bytes))memory[base+o]=b[k]||0;
  for(const[k,o]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])putLong(base+o,b[k]||0);
  for(const[k,o]of [['auxiliary',0x26],['opponent',0x7a],['partner',0x86],['secondaryPinner',0x9c],['assistanceTarget',0x7e]])putLong(base+o,b[k]?bases[bs.indexOf(b[k])]:0);
  for(const[k,o]of [['flags',0x1c],['remaining',0x22],['index',0x24],['pose',4]])put(base+o,b.clock[k]);
  for(const off of attemptOffsets)put(base+off,b.attempts[off]||0);
 }
 put(0x1c15d2,world.message);memory[0x1c1697]=world.controlsRefresh;put(0x1c1682,world.switchTimer);put(0x1c1692,world.assistDistance);
 const initial=actors(),rows=[],hash=createHash('sha256');let count=0;
 for(let tick=0;tick<100;tick++){
  sounds.length=effects.length=0;const base=bases[0],raw=word(base+0x20);
  if(!(raw&0x8000)){put(base+0x1e,word(base+0x1c));put(base+0x1c,raw);put(base+0x20,raw|0x8000);}
  put(base+0x36,0);if(memory[base+1]){call(0x27302,base);for(const[o,c]of [[6,0x38],[10,0x3a],[14,0x3c]])put(base+o,word(base+o)+word(base+c));}
  call(0x1b27e,base);call(0x248c,base);call(0x2218,base);
  const row=snapshot();hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);count++;
  if((word(base+0x20)&255)!==5)break;
 }
 sequences.push({config,world,initial,count,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Original side hold 28, held loop/impact 82, escape 88 and impact 109. Only the acting record updates through initialization, descriptor, collision, projection and physics; three passive records capture linked writes. No input/AI/referee/contact/damage/cleanup. Mode-1 branches are handler evidence, not complete Rumble gameplay. Stop when the acting record leaves state 5 or at 100 updates.',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
