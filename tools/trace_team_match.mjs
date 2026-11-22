import {Match} from '../src/game.js';
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
const boost=Boolean(process.env.TEAM_BOOST),longMode=Boolean(process.env.TEAM_LONG),air=Boolean(process.env.TEAM_AIR),resultMode=Boolean(process.env.TEAM_RESULT),side=Boolean(process.env.TEAM_SIDE),rescue=Boolean(process.env.TEAM_RESCUE),attemptOffsets=[...Array.from({length:10},(_,i)=>0xd2+i*2),...Array.from({length:11},(_,i)=>0xe8+i*2)];
if(resultMode||longMode)bytes.finishFlags=0xa0;
if(expanded){words.hitMask=0x8e;words.cornerInput=0xac;words.targetX=0xbe;words.targetY=0xc0;}
function actors(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])result[key]=long(base+offset);
 for(const[key,offset]of [['auxiliaryIndex',0x26],['opponentIndex',0x7a],['partnerIndex',0x86]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 if(expanded)for(const[key,offset]of [['lastHitIndex',0x92],['secondaryPinnerIndex',0x9c],['secondaryOpponentIndex',0x82]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 if(rescue||side||air){result.assistanceTargetIndex=bases.indexOf(long(base+0x7e)&0x7fffffff);result.attempts=Object.fromEntries(attemptOffsets.map(offset=>[offset,word(base+offset)]));}
 result.unlinkMarked=Boolean(memory[base+0x26]&128);
 result.clock={flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)};
 result.projection=[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)];return result;
});}
function snapshot(){
 const palettes={};
 for(let type=0;type<12;type++){const data=Array.from({length:16},(_,i)=>word(0x180100+type*128+i*2));if(data.some(Boolean))palettes[8+type*4]=data;}
 return{actors:actors(),sounds:[...sounds],effects:[...effects],world:{message:word(0x1c15d2),messagePending:word(0x1c15d4),messageIndex:word(0x1c15d6),messageTimer:word(0x1c15d8),controlsRefresh:memory[0x1c1697],
  cornerOccupancy:long(0x1c1670),switchTimer:word(0x1c1682),activeA:bases.indexOf(long(0x1c1684)),activeB:bases.indexOf(long(0x1c1688)),paletteUpdates:palettes},camera:{x:word(0x1c17e6),y:word(0x1c17ee),backgroundX:word(0x1c17ea),backgroundY:word(0x1c17f2)},referee:[word(ref+0x20),word(ref+0x1c),word(ref+0x22),word(ref+0x24),word(ref+4),long(ref+6),long(ref+10),long(ref+14),word(ref+0x2c),word(ref+0x2a),word(ref+0x2e),word(ref+0x18),word(ref+0x1a)]};
}

const sequences=[],filter=process.env.TEAM_FILTER?JSON.parse(process.env.TEAM_FILTER):{};
const profiles=boost?['boost-human','boost-cpu','boost-expire-human','boost-expire-cpu','counter63-human','counter63-cpu']:longMode?['neutral','advance','run','tag']:air?['air-front','air-back','air-cpu','air-miss','air-broken','air-held97']:resultMode?['result-pin-front','result-pin-back','result-pin-cpu-front','result-pin-cpu-back','result-countout-human','result-countout-cpu','result-draw']:side?['side28','side28-cpu','side28-broken','side28-standing','side82-impact','side82-escape','side28-zero','side28-forced','side88-apron']:rescue?['rescue-prone-front','rescue-prone-back','rescue-pin-front','rescue-pin-back','rescue-pin-control','rescue-hold97','rescue-forced','rescue-null']:process.env.TEAM_LAUNCH?['launch46-hit','launch46-run','launch46-miss','launch46-cpu','launch46-clash']:process.env.TEAM_PRONE?['prone34','prone34-cpu','prone34-broken','prone34-escape','prone34-zero','apron57','apron57-cpu','apron57-hit','apron57-cpu-hit']:process.env.TEAM_CATCH?['catch39-hit','catch39-miss','catch39-run','catch39-cpu']:process.env.TEAM_TAUNT?['taunt-human','taunt-cpu','taunt-loop']:process.env.TEAM_HOLD?['hold29','hold29-cpu','hold29-broken','hold29-escape','held83-punch','held83-kick']:process.env.TEAM_GETUP?['getup','getup-broken','getup-back','getup-cpu-boost','getup-human-boost']:['neutral','advance','run','tag'];
for(const action of air?[16,19,20,70,71]:[null])for(const profile of profiles)for(const type of process.env.TEAM_GETUP||process.env.TEAM_HOLD||process.env.TEAM_TAUNT||process.env.TEAM_CATCH||process.env.TEAM_PRONE||process.env.TEAM_LAUNCH||rescue||side||resultMode||air||boost?Array.from({length:12},(_,i)=>i):[0,7,10]){
 const config={profile,type,...(air?{action}:{}),...(longMode?{long:true}:{})};if(!Object.entries(filter).every(([k,v])=>config[k]===v))continue;
 memory.fill(0,0x1c0000,0x1c4000);memory.fill(0,0x180000,0x181000);memory.fill(0,0xc0000,0xc4000);cpu.d.fill(0);cpu.a.fill(0);
 put(0x1c007c,0x8000);put(0x1c0066,16);put(0x1c16a0,0x30);putLong(0x1c005c,0);
 put(0x1c17e6,461);put(0x1c17ea,461);put(0x1c17ee,577);put(0x1c17f2,577);put(0x1c17da,14);put(0x1c17dc,18);
 for(let i=0;i<16;i++)memory[0x1c1610+i]=i;
 const seed=new Match(type,6,{tagTeams:true}),world={inGame:true,gameFlags:0x8000,mode:0,round:0,clockMinutesBCD:0x30,dipSwitches:seed.world.dipSwitches,
  message:0,controlsRefresh:1,cornerOccupancy:0,switchTimer:0,activeA:0,activeB:2,paletteUpdates:{}};
 if(profile==='tag')Object.assign(seed.fighters[0].original,{xFixed:528*65536,yFixed:390*65536});
 if(profile.startsWith('getup')){
  const a=seed.fighters[0].original,p=seed.fighters[1].original;
  a.change(5,8);a.auxiliary=p;p.auxiliary=profile==='getup-broken'?null:a;
  a.facing=p.facing=type&1?0:0x8000;a.xFixed=(type%3===0?480:type%3===1?640:784)*65536+0x1234;
  p.xFixed=a.xFixed+24*65536;p.yFixed=a.yFixed+0x4321;p.change(4);p.reaction=profile==='getup-back'?9:8;p.recoveryTimer=600;
  if(profile.includes('boost')){p.flags33|=32;p.apronTimer=1000;}
  if(profile==='getup-cpu-boost')a.flags56=128;
 }
 if(profile.startsWith('hold')||profile.startsWith('held')){
  let a=seed.fighters[0].original,p=seed.fighters[1].original;
  p.type=p.flags57=(type+3)%12;
  if(profile==='hold29-cpu'||profile==='hold29-escape')[a,p]=[p,a];
  a.change(5,29);a.auxiliary=p;p.auxiliary=profile==='hold29-broken'?null:a;
  a.facing=p.facing=type&1?0:0x8000;a.xFixed=(type%3===0?500:type%3===1?640:768)*65536+0x1234;
  p.xFixed=a.xFixed+24*65536;p.yFixed=a.yFixed+0x4321;p.change(4);p.reaction=1;
  if(profile.startsWith('held')){
   a.change(5,0xc053);a.holdFlags=profile==='held83-punch'?1:2;
   p.change(5,profile==='held83-punch'?0xc073:0xc074);a.flags33|=64;p.flags33|=64;
  }
 }
 if(profile.startsWith('taunt')){
  const a=seed.fighters[profile==='taunt-cpu'?1:0].original;
  a.type=a.flags57=type;a.change(5,profile==='taunt-loop'?0x8079:121);
  a.holdFlags=profile==='taunt-loop'?2:0;a.facing=type&1?0:0x8000;a.flags34|=16;
 }
 if(profile.startsWith('catch39')){
  let a=seed.fighters[0].original,p=seed.fighters[1].original;
  if(profile==='catch39-cpu')[a,p]=[p,a];
  a.type=a.flags57=type;a.change(5,39);a.auxiliary=null;
  const face=type&1?0:0x8000;a.facing=face;p.facing=face^0x8000;
  a.xFixed=640*65536+0x1234;p.xFixed=(640+(face?1:-1)*(profile==='catch39-miss'?180:48))*65536+0x4321;
  a.yFixed=p.yFixed=337*65536;a.zFixed=p.zFixed=320*65536;
  if(profile==='catch39-run'){p.change(2);p.direction=face?192:64;p.holdFlags=0;}
 }
 if(profile.startsWith('launch46')){
  let a=seed.fighters[0].original,p=seed.fighters[1].original;
  const cpu=profile==='launch46-cpu'||profile==='launch46-clash';
  if(cpu)[a,p]=[p,a];
  a.type=a.flags57=type;a.change(5,46);a.auxiliary=null;
  if(cpu){a.action|=0x4000;a.inputBlockA|=16;}
  const face=type&1?0:0x8000;a.facing=face;p.facing=face^0x8000;
  const gap=profile==='launch46-miss'?180:profile==='launch46-cpu'?80:32;
  a.xFixed=640*65536+0x1234;p.xFixed=(640+(face?1:-1)*gap)*65536+0x4321;
  a.yFixed=p.yFixed=337*65536;a.zFixed=p.zFixed=320*65536;
  if(profile!=='launch46-run')p.flags56=0;
  if(profile!=='launch46-miss'){p.change(2);p.direction=face?192:64;p.holdFlags=0;}
 }
 if(profile.startsWith('prone34')){
  let a=seed.fighters[0].original,p=seed.fighters[1].original;
  if(profile==='prone34-cpu'||profile==='prone34-escape')[a,p]=[p,a];
  a.type=a.flags57=type;a.change(5,34);a.auxiliary=p;p.auxiliary=profile==='prone34-broken'?null:a;
  a.facing=p.facing=type&1?0:0x8000;a.xFixed=p.xFixed=(type%3===0?520:type%3===1?640:760)*65536;
  a.yFixed=p.yFixed=337*65536;p.change(4);p.reaction=8;p.recoveryTimer=600;
  if(profile==='prone34-escape'||profile==='prone34-zero'){
   a.action|=0x8000;a.pendingState=false;a.clock.flags=0x8005;a.clock.index=3;a.clock.remaining=5;
   a.clock.pose=(word(0x14dac+8+word(0x14dac+6)*2+3*2)^a.facing)&65535;
   a.flags35|=2;p.flags35|=4;a.flags33|=64;p.flags33|=64;p.change(5,95);
   if(profile==='prone34-zero'){p.health=0;p.severity=2;}
  }
 }
 if(profile.startsWith('apron57')){
  const cpu=profile.includes('cpu'),hit=profile.endsWith('-hit'),a=seed.nativeActors.pool[cpu?5:1],p=seed.nativeActors.pool[cpu?0:4];
  a.type=a.flags57=type;a.change(5,57);a.facing=cpu?0:0x8000;
  a.xFixed=(cpu?828:438)*65536;a.yFixed=p.yFixed=343*65536;p.xFixed=(cpu?796:470)*65536;
  p.facing=a.facing^0x8000;
  if(hit){p.change(0);if(!cpu)p.flags56=0;}
  else p.change(5,121);
 }
 if(boost){
  const cpu=profile.endsWith('-cpu'),counter=profile.startsWith('counter63'),a=seed.nativeActors.pool[counter?(cpu?4:0):(cpu?5:1)];
  a.type=a.flags57=type;a.change(5,counter?63:113);a.direction=cpu?192:64;
  if(counter){a.xFixed=(cpu?700:580)*65536;a.yFixed=337*65536;}
  else a.flagsC6|=64;
  if(profile.includes('expire')){a.flags34|=1;a.supportTimer=2;}
 }
 if(longMode){world.cameraTargetX=480;world.cameraTargetY=560;put(0x1c1804,480);put(0x1c1806,560);}
 if(air){
  let a=seed.nativeActors.pool[0],p=seed.nativeActors.pool[4];
  if(profile==='air-cpu')[a,p]=[p,a];
  a.type=a.flags57=type;p.type=p.flags57=(type+3)%12;
  a.change(5,action);a.auxiliary=p;p.auxiliary=profile==='air-broken'?null:a;
  if(profile==='air-cpu'){a.action|=0x4000;a.inputBlockA|=16;}
  a.facing=p.facing=type&1?0:0x8000;
  a.xFixed=[520,640,760][type%3]*65536+0x1234;p.xFixed=a.xFixed+24*65536+0x2345;
  a.yFixed=337*65536+0x1234;p.yFixed=337*65536+0x4321;a.zFixed=p.zFixed=320*65536;
  p.change(profile==='air-miss'?0:4);p.reaction=profile==='air-back'?9:8;p.recoveryTimer=600;
  if(profile==='air-held97'){
   const q=seed.nativeActors.pool[1];q.flags32=0;q.flags56=0;q.flags33=64;q.drawMode=0;
   q.xFixed=p.xFixed;q.yFixed=p.yFixed;q.zFixed=p.zFixed;q.facing=p.facing;q.auxiliary=p;
   q.change(5,0x8037);q.pendingState=false;Object.assign(q.clock,{flags:0x8005,index:0,remaining:5,pose:18|q.facing});
   p.auxiliary=q;p.flags33|=64;p.change(5,0x8061);p.pendingState=false;p.holdFlags=170;
   Object.assign(p.clock,{flags:0x8005,index:0,remaining:0,pose:0xffff});
  }
 }
 if(resultMode){
  world.cameraTargetX=480;world.cameraTargetY=560;put(0x1c1804,480);put(0x1c1806,560);
  let a=seed.nativeActors.pool[0],p=seed.nativeActors.pool[4];
  if(profile.includes('-cpu'))[a,p]=[p,a];
  a.type=a.flags57=type;
  if(profile.includes('-pin')){
   a.change(5,0x8048);a.pendingState=false;a.flags35=1;a.flags33|=64;
   p.change(5,0x804a);p.pendingState=false;p.flags33|=64;p.health=0;p.severity=2;p.mash=256;p.reaction=profile.endsWith('back')?9:8;
   a.auxiliary=p;p.auxiliary=a;a.facing=p.facing=type&1?0:0x8000;
   a.xFixed=(a.facing?576:704)*65536;p.xFixed=640*65536;a.yFixed=p.yFixed=337*65536;
   Object.assign(a.clock,{flags:0x8005,index:0,remaining:0xff00,pose:0xffff});
   Object.assign(p.clock,{flags:0x8005,index:0,remaining:0xff00,pose:18|p.facing});
  }else{
   for(const b of [a,a.partner,p,p.partner]){b.flags32&=~1;b.change(0);}
   if(profile==='result-draw')for(const b of [a,a.partner,p,p.partner])b.forced=0x8005;
   else{a.forced=a.partner.forced=0x8002;p.forced=p.partner.forced=0x8003;}
  }
 }
 if(side){
  let a=seed.nativeActors.pool[0],p=seed.nativeActors.pool[4];
  if(['side28-cpu','side82-escape','side88-apron'].includes(profile))[a,p]=[p,a];
  a.type=a.flags57=type;p.type=p.flags57=(type+3)%12;
  a.change(5,28);a.auxiliary=p;p.auxiliary=profile==='side28-broken'?null:a;
  a.facing=p.facing=type&1?0:0x8000;a.xFixed=640*65536+0x1234;p.xFixed=664*65536+0x4321;
  a.yFixed=337*65536+0x2345;p.yFixed=337*65536+0x5432;a.zFixed=p.zFixed=320*65536;
  p.change(profile==='side28-standing'?0:4);p.reaction=1;
  if(['side82-impact','side82-escape','side28-zero','side28-forced','side88-apron'].includes(profile)){
   a.action|=0xc000;a.pendingState=false;Object.assign(a.clock,{flags:0x8005,index:1,remaining:5,pose:word(0x148a8+8+word(0x148a8+6)*2+2)^a.facing});
   a.flags33|=64;a.flags35|=2;a.inputBlockA|=16;p.flags33|=64;p.flags35|=4;
   p.change(5,82);
   if(profile==='side82-impact')p.holdFlags=1;
   if(profile==='side82-escape'){p.mash=1;p.action|=0x8000;}
   if(profile==='side28-zero'){p.health=0;p.severity=2;}
   if(profile==='side28-forced')a.forced=0x8000;
   if(profile==='side88-apron'){a.flags32|=1;p.change(5,88);}
  }
 }
 if(rescue){
  const [q,a,p,s]=slots.map(slot=>seed.nativeActors.pool[slot]);
  const face=type&1?0:0x8000;
  for(const b of [q,a,p,s]){b.yFixed=337*65536;b.zFixed=320*65536;}
  Object.assign(a,{type,flags57:type,flags32:0,flags33:2,flags56:0,facing:face,xFixed:(face?600:680)*65536+0x1234,auxiliary:p});a.change(5,10);
  Object.assign(q,{flags33:1,flags56:64,facing:face,xFixed:640*65536+0x2345,auxiliary:p,assistanceTarget:a});
  Object.assign(p,{flags33:193,flags35:1,facing:face,xFixed:640*65536+0x3456,auxiliary:q,assistanceTarget:s});
  q.change(5,0x804a);q.pendingState=false;Object.assign(q.clock,{flags:0x8005,index:0,remaining:0xff00,pose:18|face});q.flags33|=64;q.reaction=profile==='rescue-pin-back'?9:8;
  p.change(5,0x8048);p.pendingState=false;Object.assign(p.clock,{flags:0x8005,index:0,remaining:0,pose:0xffff});
  if(profile.startsWith('rescue-prone')){p.change(4);p.reaction=profile.endsWith('front')?8:9;p.recoveryTimer=600;p.flags33&=~64;p.flags35=0;p.auxiliary=null;p.attempts[0xe4]=[0,0xffff,7][type%3];q.change(0);q.flags33&=~64;q.auxiliary=null;q.xFixed=520*65536;}
  if(profile==='rescue-pin-control')q.flags56=0;
  if(profile==='rescue-hold97'){q.flags56=0;p.action=0x8061;p.holdFlags=170;p.flags35=0;q.action=0x8037;q.clock.remaining=5;}
  if(profile==='rescue-forced')p.forced=0x8000;
  if(profile==='rescue-null')a.auxiliary=null;
 }
 for(const[slot,base]of pool.entries()){putLong(base+0x86,pool[slot^1]||pool[8]);memory[base+0x56]=slot<4?64:128;memory[base+0x32]=1;}
 for(const[i,base]of bases.entries()){
  const body=seed.nativeActors.pool[slots[i]];put(base,0x8000);
  for(const[key,offset]of Object.entries(words))put(base+offset,key==='state'?body.state|(body.pendingState?0:0x8000):body[key]||0);
  for(const[key,offset]of Object.entries(bytes))memory[base+offset]=body[key]||0;
  for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])putLong(base+offset,body[key]||0);
  for(const[key,offset]of [['auxiliary',0x26],['opponent',0x7a],['partner',0x86],['secondaryOpponent',0x82]])putLong(base+offset,body[key]?pool[body[key].slot]:0);
  if(rescue||side||air){putLong(base+0x7e,body.assistanceTarget?pool[body.assistanceTarget.slot]:0);for(const offset of attemptOffsets)put(base+offset,body.attempts[offset]||0);}
  for(const[key,offset]of [['flags',0x1c],['remaining',0x22],['index',0x24],['pose',4]])put(base+offset,body.clock[key]);
 }
 putLong(0x1c1684,bases[0]);putLong(0x1c1688,bases[2]);call(0xf958,ref);
 const refereeInitial=resultMode?(profile.includes('-pin')?{movementMode:1}:{state:5,pendingState:true,movementMode:1,clock:{flags:0,remaining:0,index:0,pose:0}}):null;
 if(refereeInitial){memory[ref+1]=1;if(!profile.includes('-pin')){put(ref+0x20,0x8005);put(ref+0x1c,0);}}
 const initial=actors(),entropyFrames=[],inputs=[],rows=[],hash=createHash('sha256');let previousButtons=0,tagPressed=false,count=0,boundary=null,resultRequest=false,acceptedApronHit=false,acceptedLaunch=false,acceptedRescue=false,acceptedSide=false,acceptedAir=false,outcome=null;
 for(let tick=0;tick<(longMode?6000:resultMode?1200:400);tick++){
  sounds.length=entropy.length=effects.length=0;putLong(0x1c0080,tick);
  const input={};
  if(profile==='advance'){input.horizontal=tick<55?1:0;input.strike=tick%60>=50&&tick%60<54;input.heavy=tick%120>=90&&tick%120<94;}
  if(profile==='run'){input.horizontal=tick<90?1:tick<150?-1:0;input.run=tick>=3&&tick<8;input.strike=tick>=24&&tick<28;}
  if(profile==='tag'){
   input.vertical=tick<3?-1:0;
   if(!tagPressed&&word(bases[1]+0xae)===0x8002){input.strike=true;tagPressed=true;}
  }
  if(profile==='hold29-escape')input.strike=tick>50&&(tick%4===0);
  if(profile==='prone34-escape')input.strike=tick>40&&(tick%4===0);
  if(profile==='side82-escape')input.strike=tick>40&&(tick%4===0);
  const buttons=(input.strike?1:0)|(input.heavy?2:0),pressed=(buttons&~previousButtons)|((input.run&&!inputs.at(-1)?.run)?3:0);previousButtons=buttons;
  const mask=(input.horizontal>0?1:input.horizontal<0?2:0)|(input.vertical<0?4:input.vertical>0?8:0);
  for(const base of bases){memory[base+0xa3]=long(base+0x8a)===0x140020?pressed:0;put(base+0xa8,long(base+0x8a)===0x140020?mask:0);}
  if(tick&1){call(0x25b5c);call(0x28a62);call(0x1fab4);call(0x1fb7e);}
  else{call(0x1fab4);call(0x1fb7e);call(0x25b5c);call(0x28a62);}
  call(0xe7a0);call(0xe3ca);call(0x1b390);call(0x1eb3a);
  for(const base of bases){
   if(memory[base+0x32]&128)continue;
   const raw=word(base+0x20),check=new LinkedActor({state:raw,action:word(base+0x60),reaction:word(base+0x64),walkMode:word(base+0xae)});
   if(check.pendingTransition){boundary={tick,slot:pool.indexOf(base),state:raw&255,action:word(base+0x60),reaction:word(base+0x64)};break;}
   if(!(raw&0x8000)){put(base+0x1e,word(base+0x1c));put(base+0x1c,raw);put(base+0x20,raw|0x8000);}
   put(base+0x36,0);if(memory[base+1]){call(0x27302,base);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])put(base+p,word(base+p)+word(base+c));}
   call(0x1b27e,base);call(0x248c,base);call(0x27c8,base);call(0x2218,base);
  }
  if(!boundary){call(0x232b6);if(!(tick&1)){call(0x23288);call(0x2407e);}call(0x2846);}
  const row=snapshot();hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);
  if(profile.startsWith('apron57')&&profile.endsWith('-hit')){
   const cpu=profile.includes('cpu'),target=cpu?0:2,attacker=cpu?3:1;
   if(row.actors[target].health<initial[target].health&&row.actors[target].lastHitIndex===attacker)acceptedApronHit=true;
  }
  if(profile==='launch46-hit'||profile==='launch46-cpu'){
   const cpu=profile==='launch46-cpu',attacker=cpu?2:0,target=cpu?0:2;
   if((row.actors[attacker].action&0x8000)&&row.actors[attacker].auxiliaryIndex===target)acceptedLaunch=true;
  }
  if(rescue){const [q,a,p]=row.actors;if(profile.startsWith('rescue-prone')&&p.attempts[0xe4]===((initial[2].attempts[0xe4]+1)&65535))acceptedRescue=true;else if(profile.startsWith('rescue-pin')&&(q.state&255)===7&&(p.state&255)===4&&p.reaction===15)acceptedRescue=true;else if(profile==='rescue-hold97'&&(p.state&255)===5&&(p.action&255)===119)acceptedRescue=true;}
  if(side){const ai=['side28-cpu','side82-escape','side88-apron'].includes(profile),a=row.actors[ai?2:0],p=row.actors[ai?0:2];if(['side28','side28-cpu','side28-standing'].includes(profile)&&(a.action&0x8000)&&(p.state&255)===5&&(p.action&255)===82)acceptedSide=true;else if(profile==='side82-escape'&&(p.state&255)===5&&(p.action&255)===88)acceptedSide=true;}
  if(air){const cpu=profile==='air-cpu',a=row.actors[cpu?2:0],p=row.actors[cpu?0:2];if((a.action&255)===action&&(a.action&0x8000)&&p.health<initial[cpu?0:2].health)acceptedAir=true;}
  inputs.push(input);entropyFrames.push([...entropy]);count++;
  resultRequest=['prone34-zero','side28-zero'].includes(profile)&&Boolean(word(ref+0x20)&0x8000)&&(word(ref+0x20)&255)===9;
  if((resultMode||longMode)&&row.actors.every(a=>a.finishFlags&0xc0)){outcome=row.actors.some(a=>(a.flags33&128)&&(a.finishFlags&64))?1:row.actors.some(a=>!(a.flags33&128)&&(a.finishFlags&64))?0:'draw';}
  if(boundary||resultRequest||outcome!==null)break;
 }
 if(profile.startsWith('apron57')&&profile.endsWith('-hit'))assert(acceptedApronHit,'Declared accepted apron strike must hit its target');
 if((profile==='launch46-hit'||profile==='launch46-cpu')&&!process.env.LAUNCH_DIAG)assert(acceptedLaunch,`Declared counter must capture its running target: ${profile}, type ${type}`);
 if(rescue&&!['rescue-forced','rescue-null'].includes(profile))assert(acceptedRescue,`Declared rescue must interrupt its target: ${profile}, type ${type}`);
 if(side&&['side28','side28-cpu','side82-escape'].includes(profile))assert(acceptedSide,`Declared side hold/escape must occur: ${profile}, type ${type}`);
 if(air&&(['air-front','air-back','air-cpu'].includes(profile)||profile==='air-held97'&&[16,70,71].includes(action)))assert(acceptedAir,`Declared prone air hit must occur: ${JSON.stringify(config)}`);
 if(resultMode)assert(outcome!==null,`Original result must finish: ${profile}, type ${type}, ${JSON.stringify({boundary,count,ref:snapshot().referee,flags35:actors().map(a=>a.flags35),actors:actors().map(a=>({state:a.state,action:a.action,finish:a.finishFlags,forced:a.forced,walkMode:a.walkMode,x:a.xFixed>>>16,y:a.yFixed>>>16,clock:a.clock}))})}`);
 sequences.push({config,world,initial,...(refereeInitial?{refereeInitial}:{}),...(outcome!==null?{outcome}:{}),inputs,entropyFrames,count,boundary,...(resultRequest?{resultRequest:true}:{}),...(acceptedApronHit?{acceptedApronHit:true}:{}),...(acceptedLaunch?{acceptedLaunch:true}:{}),...(acceptedRescue?{acceptedRescue:true}:{}),...(acceptedSide?{acceptedSide:true}:{}),...(acceptedAir?{acceptedAir:true}:{}),sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Composed normal tag playtest from explicit synthetic four-record starting states: original camera, targets, arbitration, tag timers, announcer, human input, AI, referee, actor/collision/projection/physics, alternating contacts/damage and original sprite-queue cleanup; omit title/round/scene/bookkeeping, VRAM stream and effect-object updates; stop before unsupported actor, at the declared observation cap (400 ordinary, 1200 result or 6000 long-core updates), at original final outcome bytes, or at the first submission result request in the declared zero-health scenario. Original random observations replayed at native calls.',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0),boundaries:sequences.map(s=>s.boundary)}));
