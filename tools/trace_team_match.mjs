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
if(expanded){words.hitMask=0x8e;words.cornerInput=0xac;words.targetX=0xbe;words.targetY=0xc0;}
function actors(){return bases.map(base=>{
 const result={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])result[key]=long(base+offset);
 for(const[key,offset]of [['auxiliaryIndex',0x26],['opponentIndex',0x7a],['partnerIndex',0x86]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 if(expanded)for(const[key,offset]of [['lastHitIndex',0x92],['secondaryPinnerIndex',0x9c],['secondaryOpponentIndex',0x82]])result[key]=bases.indexOf(long(base+offset)&0x7fffffff);
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
const profiles=process.env.TEAM_TAUNT?['taunt-human','taunt-cpu','taunt-loop']:process.env.TEAM_HOLD?['hold29','hold29-cpu','hold29-broken','hold29-escape','held83-punch','held83-kick']:process.env.TEAM_GETUP?['getup','getup-broken','getup-back','getup-cpu-boost','getup-human-boost']:['neutral','advance','run','tag'];
for(const profile of profiles)for(const type of process.env.TEAM_GETUP||process.env.TEAM_HOLD||process.env.TEAM_TAUNT?Array.from({length:12},(_,i)=>i):[0,7,10]){
 const config={profile,type};if(!Object.entries(filter).every(([k,v])=>config[k]===v))continue;
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
 for(const[slot,base]of pool.entries()){putLong(base+0x86,pool[slot^1]||pool[8]);memory[base+0x56]=slot<4?64:128;memory[base+0x32]=1;}
 for(const[i,base]of bases.entries()){
  const body=seed.nativeActors.pool[slots[i]];put(base,0x8000);
  for(const[key,offset]of Object.entries(words))put(base+offset,key==='state'?body.state|(body.pendingState?0:0x8000):body[key]||0);
  for(const[key,offset]of Object.entries(bytes))memory[base+offset]=body[key]||0;
  for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14],['controlPort',0x8a]])putLong(base+offset,body[key]||0);
  for(const[key,offset]of [['auxiliary',0x26],['opponent',0x7a],['partner',0x86],['secondaryOpponent',0x82]])putLong(base+offset,body[key]?pool[body[key].slot]:0);
  for(const[key,offset]of [['flags',0x1c],['remaining',0x22],['index',0x24],['pose',4]])put(base+offset,body.clock[key]);
 }
 putLong(0x1c1684,bases[0]);putLong(0x1c1688,bases[2]);call(0xf958,ref);
 const initial=actors(),entropyFrames=[],inputs=[],rows=[],hash=createHash('sha256');let previousButtons=0,tagPressed=false,count=0,boundary=null;
 for(let tick=0;tick<400;tick++){
  sounds.length=entropy.length=effects.length=0;putLong(0x1c0080,tick);
  const input={};
  if(profile==='advance'){input.horizontal=tick<55?1:0;input.strike=tick%60>=50&&tick%60<54;input.heavy=tick%120>=90&&tick%120<94;}
  if(profile==='run'){input.horizontal=tick<90?1:tick<150?-1:0;input.run=tick>=3&&tick<8;input.strike=tick>=24&&tick<28;}
  if(profile==='tag'){
   input.vertical=tick<3?-1:0;
   if(!tagPressed&&word(bases[1]+0xae)===0x8002){input.strike=true;tagPressed=true;}
  }
  if(profile==='hold29-escape')input.strike=tick>50&&(tick%4===0);
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
  inputs.push(input);entropyFrames.push([...entropy]);count++;if(boundary)break;
 }
 sequences.push({config,world,initial,inputs,entropyFrames,count,boundary,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(output,JSON.stringify({source:'Composed normal tag playtest from explicit synthetic four-record starting states: original camera, targets, arbitration, tag timers, announcer, human input, AI, referee, actor/collision/projection/physics, alternating contacts/damage and original sprite-queue cleanup; omit title/round/scene/bookkeeping, VRAM stream and effect-object updates; stop before unsupported actor or 400-update cap. Original random observations replayed at native calls.',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0),boundaries:sequences.map(s=>s.boundary)}));
