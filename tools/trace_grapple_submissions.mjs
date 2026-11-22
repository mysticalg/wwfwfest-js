// Original attacker kernels and linked-actor handoffs; external offline CPU only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [hardwarePath,programPath,outputPath]=process.argv.slice(2);
const {default:MC68000}=await import(pathToFileURL(hardwarePath));
const memory=new Uint8Array(0x200000);memory.set(readFileSync(programPath));
const cpu=new MC68000(),sounds=[],entropy=[],textRequests=[];
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=null;}
cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
const bases=[0x1c05b0,0x1c06bc],partners=[0x1c07c8,0x1c08d4];
const allBases=[...bases,...partners];
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const putWord=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{putWord(a,v>>>16);putWord(a+2,v);};
function call(address,current=bases[0]){
 cpu.pc=address;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;cpu.a[0]=current;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push({kind:'contest',value:cpu.d[0]&15});
  if(cpu.pc===0x102e6)entropy.push({kind:'pin',value:cpu.d[0]&255});
  if(cpu.pc===0x24262)textRequests.push(cpu.d[0]&65535);
  cpu._execute();
 }
 assert(steps<100000,`Throw kernel stuck at ${cpu.pc.toString(16)}`);
}
const bytes={movementMode:1,flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,hitCounter:0xc7};
const words={type:2,facing:0x2e,previousState:0x1e,speed:0x2a,direction:0x2c,holdFlags:0x44,timer:0x46,
 contact:0x4c,pendingDamage:0x68,velocityX:0x58,velocityY:0x5a,velocityZ:0x5c,gravity:0x5e,offsetX:0x18,offsetY:0x1a,
 forced:0xfe,action:0x60,reaction:0x64,severity:0x70,health:0x66,maximumHealth:0x72,paddingX:0x3e,paddingY:0x40,paddingZ:0x42,eliminations:0xc4,
 mash:0xaa,inputBlockA:0xb4,inputBlockB:0xb6,supportTimer:0xe6,healthAccumulator:0x6a,resultPose:0x4a,targetX:0xbe,targetY:0xc0};
const attemptOffsets=Array.from({length:11},(_,i)=>0xe8+i*2);
const headActions=[26,37,54,59,137];
const actions=process.env.ACTION_SET?JSON.parse(process.env.ACTION_SET):[...headActions,93,94,95,96,98,99,110,111,138,141];
const supportedActions=[...actions,2,24,25,36,38,40,43,44,47,48,50,51,52,58,66,67,68,6,...Array.from({length:11},(_,i)=>125+i)];
const composed=Boolean(process.env.COMPOSE);
const knockdowns=[1,2,3,4,5,6,7,8,9,11,12,13,14,16,18,19,21,22,23,24,25,27,29,33,34,35,36,37,38,41];
const supported=(s,a,r)=>[11,12,255].includes(s)||(s===4&&r===1)||(s===5&&[21,22,23,41,80,123,124,...supportedActions].includes(a&255))
 ||(composed&&([0,2,3,6,7].includes(s)||(s===4&&knockdowns.includes(r&255))||(s===5&&[56,120].includes(a))));
function snapshot(index){
 const base=allBases[index],result={state:word(base+0x20),clock:{flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)},
  xFixed:long(base+6),yFixed:long(base+10),zFixed:long(base+14),
  auxiliary:allBases.includes(long(base+0x26)&0xffffff)?allBases.indexOf(long(base+0x26)&0xffffff):null,unlinkMarked:Boolean(memory[base+0x26]&128),
  projection:[word(base+0x14)<<16>>16,232-(word(base+0x16)<<16>>16)],
  collision:[memory[base+0x36],memory[base+0x37],word(base+0x38),word(base+0x3a),word(base+0x3c)],
  attempts:attemptOffsets.map(offset=>word(base+offset))};
 result.motionLink=allBases.includes(long(base+0x92))?allBases.indexOf(long(base+0x92)):null;
 result.assistanceTarget=allBases.includes(long(base+0x7e))?allBases.indexOf(long(base+0x7e)):null;
 result.attempt26=word(base+0xfc);
 for(const[name,offset]of Object.entries(bytes))result[name]=memory[base+offset];
 for(const[name,offset]of Object.entries(words))result[name]=word(base+offset)&(composed&&name==='previousState'?255:65535);
 return result;
}
const cases=[];
for(const action of actions)for(const type of headActions.includes(action)?Array.from({length:12},(_,i)=>i):[0,1])for(const facing of [0,0x8000])for(const x of [475,640,790]){
 cases.push({action,type,facing,x,variant:'human',attackerIndex:type&1,both:false});
}
for(const action of actions)for(const type of headActions.includes(action)?[0,5,8,11]:[0,1])for(const facing of [0,0x8000]){
 for(const variant of ['ai','opponentAI','rumble','counterWrap','partner','linked','zeroHealth','forced','outsidePartner','humanPartner','mash',
  ...([54].includes(action)?['orphan','marked']:[]),...([59].includes(action)?['phase1','phase2']:[])]){
  cases.push({action,type,facing,x:640,variant,attackerIndex:type&1,both:variant==='linked'});
 }
}
const filter=process.env.THROW_FILTER?JSON.parse(process.env.THROW_FILTER):{};
const sequences=[];
for(const config of cases){
 if(!Object.entries(filter).every(([key,value])=>config[key]===value))continue;
 const {action,type,facing,x,variant,attackerIndex,both}=config;
 const attackerAI=variant==='ai',targetAI=variant==='opponentAI'||variant==='rumble';
 const initial=[{type,state:5,action:action|(variant==='highAction'?0x8000:0),reaction:0,facing,
   xFixed:x*65536+0x1234,yFixed:336*65536+0x5678,zFixed:320*65536+0x2345,
   movementMode:action>=125?0:1,speed:47,direction:facing?64:192,flags32:0,flags33:attackerAI?65:67,flags34:0,flags35:0,
   flags56:attackerAI?128:0,hitCounter:0,previousState:0,holdFlags:3,timer:variant==='followUp'?1:0,contact:0,pendingDamage:0,
   velocityX:0,velocityY:0,velocityZ:0,gravity:0,offsetX:0,offsetY:0,forced:0,severity:1,health:100,maximumHealth:100,paddingX:0,paddingY:0,paddingZ:0,eliminations:0,
   clock:{flags:0x8005,remaining:7,index:1,pose:facing^249},attempts:Object.fromEntries(attemptOffsets.map(offset=>[offset,variant==='counterWrap'?65535:0]))},
  {type:variant==='large'?8:6,state:0x8005,action:123,reaction:0,facing:facing^0x8000,
   xFixed:x*65536+0xabcd,yFixed:336*65536+0x9876,zFixed:320*65536+0x4567,
   movementMode:0,speed:0,direction:0,flags32:0,flags33:targetAI?65:67,flags34:0,flags35:0,flags56:targetAI?128:0,
   hitCounter:0,previousState:0,holdFlags:100,timer:0,contact:0,pendingDamage:0,
   velocityX:0,velocityY:0,velocityZ:0,gravity:0,offsetX:0,offsetY:0,forced:0,severity:1,health:100,maximumHealth:100,paddingX:0,paddingY:0,paddingZ:0,eliminations:0,
   clock:{flags:0x8005,remaining:0,index:0,pose:0xffff},attempts:Object.fromEntries(attemptOffsets.map(offset=>[offset,0]))}];
 if(variant==='orphan'||variant==='marked'){
  Object.assign(initial[1],{state:0x8000,action:0,clock:{flags:0x8000,remaining:0,index:0,pose:facing^0x8000},
   ...(variant==='orphan'?{auxiliaryIndex:null}:{unlinkMarked:true})});
 }
 if(attackerIndex)initial.reverse();
 for(const body of initial){
  Object.assign(body,{mash:0,inputBlockA:0,inputBlockB:0,supportTimer:0,healthAccumulator:0,resultPose:0,targetX:0,targetY:0,attempt26:variant==='counterWrap'?65535:0});
 }
 if(variant==='zeroHealth')initial[1-attackerIndex].health=0;
 if(variant==='forced')initial[attackerIndex].forced=0x8000;
 if(variant==='phase1'||variant==='phase2'){
  initial[attackerIndex].action|=0x2000;initial[attackerIndex].holdFlags=variant==='phase1'?1:2;
  initial[1-attackerIndex].action=0x808d;
 }
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const world={mode:variant==='rumble'?1:0,round:variant==='opponentAI'?4:0,inGame:true,message:0,shake:0,modeValue:1,scene:0,rope:[0,0,0,0],secondaryShake:0,
  switchTimer:0,mashPrompt:0,controlsRefresh:0,matchResult:0,resultTimer:0,dipSwitches:0,textRequests:[],assistDistance:0,assistCandidate:null};
 putWord(0x1c007c,1);memory[0x1c0161]=world.mode;putWord(0x1c0162,world.round);
 putWord(0x1c17e6,461);putWord(0x1c17ee,577);putLong(0x1c005c,type*0x12345+action*17+facing);
 const partnerInitial=[0,1].map((_,index)=>({...initial[index],type:0,state:variant==='partner'?1:0,walkMode:1,flags32:variant==='outsidePartner'?1:0,
  flags33:variant==='humanPartner'?2:0,flags34:0,flags35:0,flags56:0,action:0,reaction:0,forced:0,movementMode:0,
  xFixed:0,yFixed:0,zFixed:0,facing:0,holdFlags:0,clock:{flags:0,remaining:0,index:0,pose:0},attempts:{},attempt26:0}));
 const allInitial=[...initial,...partnerInitial];
 for(const[index,body]of allInitial.entries()){
  const base=allBases[index];memory[base]=128;putWord(base+0x20,body.state);
  putLong(base+0x26,body.auxiliaryIndex===null?0:allBases[index^1]|(body.unlinkMarked?0x80000000:0));
  putLong(base+0x7a,allBases[index^1]);putLong(base+0x86,allBases[index^2]);
  for(const[name,offset]of Object.entries(bytes))memory[base+offset]=body[name];
  for(const[name,offset]of Object.entries(words))putWord(base+offset,body[name]);
  for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14]])putLong(base+offset,body[key]);
  for(const[key,offset]of [['flags',0x1c],['remaining',0x22],['index',0x24],['pose',4]])putWord(base+offset,body.clock[key]);
  putWord(base+0x90,body.clock.pose);for(const offset of attemptOffsets)putWord(base+offset,body.attempts[offset]||0);
  putWord(base+0xfc,body.attempt26||0);if(index>=2)memory[base+0xaf]=1;
 }
 const updateOrder=both||composed?[0,1]:[attackerIndex],hash=createHash('sha256'),rows=[],entropyFrames=[],runInputs={},buttonInputs={};
 textRequests.length=0;
 let boundary=null,count=0;
 for(let tick=0;tick<(composed?700:260);tick++){
  sounds.length=entropy.length=0;
  const presses=bases.map(base=>variant==='mash'&&tick%2===0&&(word(base+0x20)&255)===5
   &&[93,94,95,96,98,99].includes(word(base+0x60)&255)?3:0);
  for(const[index,base]of bases.entries())memory[base+0xa3]=presses[index];
  if(presses.some(Boolean))buttonInputs[tick]=presses;
  if(composed){
   const masks=[0,0];let sampled=false;
   for(const[index,base]of bases.entries())if((word(base+0x20)&255)===2){
    sampled=true;masks[index]=!word(base+0x44)&&(word(base+0x20)&0x8000)?word(base+0x2e)&0x8000?2:1:0;
    putWord(base+0xa8,masks[index]);call(0xe58c,base);
   }
   if(sampled)runInputs[tick]=masks;
  }
  for(const index of updateOrder){
   const base=bases[index],state=word(base+0x20);
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
  const row={actors:bases.map((_,i)=>snapshot(i)),sounds:[...sounds],world:{...world,message:word(0x1c15d2),shake:word(0x1c1800),
    rope:[word(0x1c1150),word(0x1c1180),word(0x1c11b0),word(0x1c11e0)],secondaryShake:word(0x1c1802)},
   partners:partners.map((_,i)=>snapshot(i+2))};
  Object.assign(row.world,{switchTimer:word(0x1c1682),mashPrompt:memory[0x1c167a],controlsRefresh:memory[0x1c1697],
   matchResult:word(0x1c1214),resultTimer:word(0x1c169e),textRequests:[...textRequests],assistDistance:word(0x1c1692),
   assistCandidate:allBases.includes(long(0x1c168c))?allBases.indexOf(long(0x1c168c)):null});
  entropyFrames.push([...entropy]);hash.update(JSON.stringify(row)+'\n');count++;
  if(process.env.DETAIL)rows.push(row);
  if(boundary!==null)break;
  if(composed&&bases.every(base=>word(base+0x20)===0x8000&&word(base+4)===word(base+0x2e)))break;
 }
 sequences.push({...config,composed,initial,world,partnerInitial,updateOrder,boundary,count,entropyFrames,
  ...(composed?{runInputs}:{}),buttonInputs,sha256:hash.digest('hex'),...(process.env.DETAIL?{rows}:{})});
}
writeFileSync(outputPath,JSON.stringify({source:'wwfwfest US rev 2, original attacker kernels and linked handoffs',sequences},null,2)+'\n');
console.log(JSON.stringify({sequences:sequences.length,updates:sequences.reduce((sum,s)=>sum+s.count,0)}));
