// Original-program references for standing grapple arbitration and linked states.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));
const cpu=new MC68000();
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
const sounds=[];
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const bases=[0x1c05b0,0x1c06bc];
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
let randomNibble;
function call(address,current=bases[0]){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=current;cpu.a[1]=current===bases[0]?bases[1]:bases[0];
 putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<50000){if([0xe938,0x10534,0x1059e,0x105d2].includes(cpu.pc))randomNibble=cpu.d[0]&15;cpu._execute();}
 assert(steps<50000,`Grapple routine stuck at ${cpu.pc.toString(16)}`);
}
const byteFields={flags32:0x32,flags33:0x33,flags34:0x34,flags56:0x56,flags74:0x74,flagsB7:0xb7};
const wordFields={state:0x20,action:0x60,reaction:0x64,forced:0xfe,health:0x66,grappleIndex:0x48,holdFlags:0x44,
 controlCounter:0xbc,comboCount:0x52,comboTimer:0x54};
const longFields={xFixed:6,yFixed:10,zFixed:14,auxiliary:0x26,opponent:0x7a};
const defaults={state:0x8000,action:0,reaction:0,forced:0,health:100,grappleIndex:0,holdFlags:0x1234,
 controlCounter:17,comboCount:3,comboTimer:64,flags32:0,flags33:2,flags34:255,flags56:64,flags74:0,flagsB7:0,
 xFixed:640*65536+0x1234,yFixed:336*65536+0x5678,zFixed:320*65536,auxiliary:0};
function writeActor(initial,index){
 const base=bases[index];memory[base]=128;putWord(base+0x2e,initial.facing??(index?0:0x8000));
 for(const[name,offset]of Object.entries(byteFields))memory[base+offset]=initial[name]||0;
 for(const[name,offset]of Object.entries(wordFields))putWord(base+offset,initial[name]||0);
 for(const[name,offset]of Object.entries(longFields))putLong(base+offset,name==='opponent'?bases[1-index]:initial[name]||0);
}
function initialize(actors,options={}){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);randomNibble=undefined;
 putWord(0x1c007c,options.inGame===false?0:1);memory[0x1c0161]=options.mode||0;
 putWord(0x1c0162,options.round||0);putLong(0x1c0080,options.phase||0);putLong(0x1c005c,options.seed||0);
 actors.forEach(writeActor);
}
function snapshot(index){
 const base=bases[index],result={};
 for(const[name,offset]of Object.entries(byteFields))result[name]=memory[base+offset];
 for(const[name,offset]of Object.entries(wordFields))result[name]=word(base+offset);
 for(const[name,offset]of Object.entries(longFields)){
  const value=long(base+offset);result[name]=['auxiliary','opponent'].includes(name)&&bases.includes(value)?['actor','target'][bases.indexOf(value)]:value;
 }
 result.facing=word(base+0x2e);return result;
}
const eligibility=[];
for(const state of [0,1,4,5,11,12,255])for(const initialized of [false,true])for(const mode of [0,2]){
 for(const variant of [{},{flags74:128},{forced:1},{flags32:1},{flags32:16},{flagsB7:128},{auxiliary:1},{flags33:6}]){
  for(const reaction of state===4?[0,1,2,0x100]:[0])for(const action of state===5?[114,113,370]:[0]){
   const initial={...defaults,state:state|(initialized?0x8000:0),reaction,action,...variant};
   initialize([initial],{mode});call(0xea28);
   eligibility.push({initial,mode,accepted:!(cpu.sr&1)});
  }
 }
}
const pairs=[];
function pair(a={},b={},options={}){
 const initial=[{...defaults,facing:0x8000,...a},{...defaults,xFixed:675*65536+0xabcd,yFixed:341*65536+0x9876,
   facing:0,health:80,grappleIndex:2,...b}];
 initialize(initial,options);call(0xe7b4);
 pairs.push({initial,options:{...options,...(randomNibble===undefined?{}:{randomNibble})},result:[snapshot(0),snapshot(1)]});
}
for(const phase of Array.from({length:32},(_,i)=>i))for(const flags of [0,32,128,160]){
 for(const otherFlags of [0,32,128,160]){
  pair({flags33:2|(flags&32),flags56:64|(flags&128)},{flags33:2|(otherFlags&32),flags56:64|(otherFlags&128)},
   {phase,seed:phase*217+flags+otherFlags});
 }
}
for(const mode of [0,1])for(let round=0;round<(mode?1:11);round++)for(let grappleIndex=0;grappleIndex<4;grappleIndex++){
 for(let seed=0;seed<16;seed++)pair({grappleIndex},{flags56:192},{mode,round,seed:seed*0x34567+round*31+grappleIndex});
}
for(const facing of [0,0x8000,0x100,0x8100])for(const dx of [-72,-71,-1,0,71,72])for(const dy of [-16,-15,0,15,16]){
 pair({facing},{xFixed:(640+dx)*65536+0xabcd,yFixed:(336+dy)*65536+0x9876},{phase:4});
}
for(const variant of [{},{flags74:128},{forced:0x8000},{flags32:1},{flagsB7:128},{auxiliary:1},
 {state:0},{state:0x8004,reaction:1},{state:0x8005,action:114},{state:0x8005,action:0},{flags33:6}]){
 for(const side of [0,1])for(const mode of [0,2])pair(side?{}:variant,side?variant:{},{phase:11,mode});
}
for(const health of [0,80,100,65535])for(const otherHealth of [0,80,100,65535]){
 pair({health},{health:otherHealth},{inGame:false,phase:4});
}
for(const x of [0,65535])for(const y of [0,65535])pair({xFixed:x*65536+0x1234,yFixed:y*65536+0x5678,grappleIndex:65535},
 {xFixed:x*65536+0xabcd,yFixed:y*65536+0x9876,grappleIndex:3},{phase:4});
const selections=[];
const contests=[];
for(const kind of [0,1,2,3])for(const actorAI of [false,true])for(const targetAI of [false,true]){
 for(const mode of [0,1])for(const round of [0,4,9,10])for(const severity of [0,1,2])for(const counter of kind===1?[0,1,4,255,256]:[0]){
  const entropy=[],hash=createHash('sha256');
  for(let seed=0;seed<16;seed++){
   initialize([{...defaults,flags56:actorAI?128:0},{...defaults,flags56:targetAI?128:0}],{mode,round,seed:seed*0x34567+kind});
   putWord(bases[0]+0x70,severity);putLong(bases[0]+0x26,bases[1]);cpu.d[1]=kind;cpu.d[2]=counter;
   call(0x104de);entropy.push(randomNibble??null);
   hash.update(JSON.stringify([randomNibble??null,Boolean(cpu.sr&1)])+'\n');
  }
  contests.push({kind,actorAI,targetAI,mode,round,severity,counter,entropy,sha256:hash.digest('hex')});
 }
}
for(let type=0;type<12;type++)for(const severity of [0,1,2])for(const toggle of [0,7])for(const pressed of [1,2,3]){
 for(const facing of [0,0x8000])for(const action of [21,22]){
  const hash=createHash('sha256');
  for(let region=0;region<15;region++){
   initialize([{...defaults,state:0x8005,action,flags34:0},{...defaults}]);
   const base=bases[0];putWord(base+2,type);putWord(base+0x2e,facing);putWord(base+0x30,region);
   memory[base+0x62]=toggle;memory[base+0xa3]=pressed;putLong(base+0x26,bases[1]);
   putLong(bases[1]+0x26,base);putWord(bases[1]+0x70,severity);
   call(0xd0c6);
   const row=[region,word(base+0x60),memory[base+0x62],word(base+0x44),word(base+0x46),word(base+0x20)];
   hash.update(JSON.stringify(row)+'\n');
  }
  selections.push({type,severity,toggle,pressed,facing,action,sha256:hash.digest('hex')});
 }
}
const regionInputs=[];
for(const x of [0,567,568,575,576,599,600,619,620,639,640,687,688,695,696,703,704,791,792,815,816,831,832,963,964,1151,1152,65535]){
 for(const y of [0,127,128,271,272,321,322,363,364,65535])regionInputs.push([x,y,14]);
}
const regions=[];
for(const flags32 of [0,1])for(const flags33 of [0,4]){
 const hash=createHash('sha256');
 for(const[x,y,prior]of regionInputs){
  initialize([{...defaults,flags32,flags33,xFixed:x*65536,yFixed:y*65536}]);
  putWord(bases[0]+0x30,prior);call(0x1fab4);
  hash.update(JSON.stringify(word(bases[0]+0x30))+'\n');
 }
 regions.push({flags32,flags33,sha256:hash.digest('hex')});
}
const sequences=[];
const inputPrograms={};
const sequenceFilter=process.env.SEQUENCE_FILTER?JSON.parse(process.env.SEQUENCE_FILTER):{};
const supported=(state,action,reaction)=>[11,12,255].includes(state)||(state===4&&reaction===1)
 ||(state===5&&[21,22,23,41,80,123,124].includes(action&255));
const bodyWords={type:2,previousState:0x1e,speed:0x2a,direction:0x2c,holdFlags:0x44,timer:0x46,
 grappleIndex:0x48,comboCount:0x52,comboTimer:0x54,controlCounter:0xbc,inputBlockA:0xb4,inputBlockB:0xb6,contact:0x4c,pendingDamage:0x68,
 velocityX:0x58,velocityY:0x5a,velocityZ:0x5c,gravity:0x5e,offsetX:0x18,offsetY:0x1a,forced:0xfe};
function bodySnapshot(index){
 const base=bases[index],result={state:word(base+0x20),action:word(base+0x60),reaction:word(base+0x64),
  clock:{flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)},
  xFixed:long(base+6),yFixed:long(base+10),zFixed:long(base+14),facing:word(base+0x2e),movementMode:memory[base+1],
  auxiliary:bases.includes(long(base+0x26)&0xffffff)?bases.indexOf(long(base+0x26)&0xffffff):null,
  unlinkMarked:Boolean(memory[base+0x26]&128),projection:[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)],
  collision:[memory[base+0x36],memory[base+0x37],word(base+0x38),word(base+0x3a),word(base+0x3c)],hitCounter:memory[base+0xc7]};
 for(const[name,offset]of Object.entries(bodyWords))result[name]=word(base+offset);
 for(const[name,offset]of Object.entries({...byteFields,flags35:0x35}))result[name]=memory[base+offset];
 return result;
}
for(const type of Array.from({length:12},(_,i)=>i))for(const facing of [0,0x8000])for(const x of [475,640,790]){
 for(const plan of ['contested','bothStrike','hold','whip','carry','timeout','forced','carryForced','escapeAI','stagger','orphan'])for(const controllerIndex of [0,1]){
  if(['stagger','orphan'].includes(plan)&&type!==0)continue;
  if(!Object.entries(sequenceFilter).every(([key,value])=>({type,facing,x,plan,controllerIndex})[key]===value))continue;
  const initial=[{...defaults,type,facing,state:plan==='contested'||plan==='bothStrike'?11:12,
    flags34:0,flags56:0,holdFlags:0x2000,comboCount:0,comboTimer:0,grappleIndex:1,
    xFixed:x*65536+0x1234,yFixed:336*65536+0x5678,previousState:0,movementMode:1,inputBlockA:0x1180,inputBlockB:0x2480,
    clock:{flags:0x8001,remaining:3,index:2,pose:facing^3}},
   {...defaults,type:6,facing:facing^0x8000,state:plan==='contested'||plan==='bothStrike'?11:255,
    flags34:0,flags56:plan==='escapeAI'?128:0,holdFlags:plan==='contested'||plan==='bothStrike'?0x8000:0,
    comboCount:0,comboTimer:0,grappleIndex:2,xFixed:x*65536+0xabcd,yFixed:336*65536+0x9876,
    previousState:0,movementMode:1,clock:{flags:0x8001,remaining:3,index:2,pose:(facing^0x8000)^3}}];
  if(plan==='stagger')Object.assign(initial[0],{state:4,reaction:1,comboCount:x===640?3:0});
  if(plan==='orphan'){
   Object.assign(initial[0],{state:255,flags32:32,flags33:0xcf,flags34:0xf3,flags35:0x7f,inputBlockA:0x1234,inputBlockB:0x5678});
   Object.assign(initial[1],{state:0,auxiliaryIndex:null});
  }
  if(controllerIndex)initial.reverse();
  initialize(initial);
  putWord(0x1c17e6,461);putWord(0x1c17ee,577);
  for(const[index,body]of initial.entries()){
   const base=bases[index];putLong(base+0x26,body.auxiliaryIndex===null?0:bases[1-index]);memory[base+1]=body.movementMode;
   for(const[name,offset]of Object.entries(bodyWords))if(Object.hasOwn(body,name))putWord(base+offset,body[name]);
   memory[base+0x35]=body.flags35||0;
   putWord(base+0x1c,body.clock.flags);putWord(base+0x22,body.clock.remaining);putWord(base+0x24,body.clock.index);
   putWord(base+4,body.clock.pose);putWord(base+0x90,body.clock.pose);putWord(base+2,body.type);
  }
  const hash=createHash('sha256'),rows=[],inputs=[];
  const updateOrder=plan==='orphan'?[controllerIndex]:[0,1];
  let boundary=null;
  for(let tick=0;tick<520;tick++){
   sounds.length=0;
   const pressed=[0,0],mask=[0,0],forced=[0,0];
   if(plan==='contested'||plan==='bothStrike'){
    if(tick===30||tick===100)pressed[0]=1;
    if(plan==='bothStrike'&&(tick===30||tick===100))pressed[1]=2;
    if(tick===260)pressed[0]=2;
   }else if(['hold','carry','carryForced','escapeAI'].includes(plan)&&tick===80)pressed[0]=1;
   else if(plan==='whip'&&tick===80)pressed[0]=2;
   if((plan==='carry'||plan==='carryForced')&&tick>=100&&tick<170)mask[0]=[1,8,2,4,5,9,10][Math.floor((tick-100)/10)];
   if(plan==='forced'&&tick===100)forced[0]=0x8000;
   if(plan==='carryForced'&&tick===130)forced[0]=1;
   if(controllerIndex){pressed.reverse();mask.reverse();forced.reverse();}
   inputs.push({pressed,mask,forced});
   for(const[index,base]of bases.entries()){
    putWord(base+0xfe,forced[index]);memory[base+0xa3]=pressed[index];putWord(base+0xa8,mask[index]);
    if(word(base+0x20)&0x8000)call(0xcf1e,base);
    if((word(base+0x20)&255)===5&&(word(base+0x60)&255)===22)call(0xe6a2,base);
   }
   for(const index of updateOrder){
    const base=bases[index];
    const state=word(base+0x20);
    if(!supported(state&255,word(base+0x60),word(base+0x64))){boundary=index;break;}
    if(!(state&0x8000)){putWord(base+0x1e,word(base+0x1c));putWord(base+0x1c,state);putWord(base+0x20,state|0x8000);}
    putWord(base+0x36,0);
    if(memory[base+1]){call(0x27302,base);for(const[p,c]of [[6,0x38],[10,0x3a],[14,0x3c]])putWord(base+p,word(base+p)+word(base+c));}
    call(0x1b27e,base);call(0x248c,base);call(0x2218,base);
   }
   if(boundary===null){
    call(0x232b6);
    for(const base of bases)if((word(base+4)&0x7fff)!==0x7fff&&(memory[base+0x26]&128)&&!word(base+0xfe))putLong(base+0x26,0);
   }
   const row={actors:bases.map((_,index)=>bodySnapshot(index)),sounds:[...sounds],sceneRefresh:memory[0x1c1697]};
   hash.update(JSON.stringify(row)+'\n');if(process.env.DETAIL)rows.push(row);
   if(boundary!==null)break;
  }
  const program=`${plan}:${controllerIndex}`;
  if(!inputPrograms[program]||inputs.length>inputPrograms[program].length)inputPrograms[program]=inputs;
  sequences.push({type,facing,x,plan,controllerIndex,program,initial,updateOrder,boundary,count:inputs.length,sha256:hash.digest('hex'),
   ...(process.env.DETAIL?{rows}:{})});
 }
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2, standing arbitration and linked actor kernels',
 eligibility,pairs,contests,selections,regionInputs,regions,inputPrograms,sequences},null,2)+'\n');
console.log(JSON.stringify({eligibility:eligibility.length,pairs:pairs.length,contests:contests.length*16,selections:selections.length*15,regions:regions.length*regionInputs.length,
 sequences:sequences.length,updates:sequences.reduce((n,s)=>n+s.count,0)}));
