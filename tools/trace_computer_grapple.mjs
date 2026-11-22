import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const pool=Array.from({length:9},(_,i)=>0x1c05b0+i*0x10c),bases=[pool[4],pool[0],pool[5]];
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const words={type:2,facing:0x2e,forced:0xfe,state:0x20,action:0x60,reaction:0x64,holdFlags:0x44,timer:0x46,inputBlockA:0xb4,inputBlockB:0xb6,
 controlCounter:0xbc,aiEscapeTimer:0xba,aiDistanceX:0xb0,aiDistanceY:0xb2,direction:0x2c,targetX:0xbe,targetY:0xc0,
 health:0x66,severity:0x70,pinStatus:0x108,walkMode:0xae,recoveryTimer:0x9a};
const bytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags57:0x57,aiFlagsB9:0xb9,region:0x31,demoStep:0x103};
const longs={xFixed:6,yFixed:10},pointers={auxiliaryIndex:0x26,opponentIndex:0x7a,partnerIndex:0x86};
const attempts=[0xd2,0xd4,0xd6,0xd8,0xda,0xde,0xe4];
function snapshot(){return bases.map(base=>{
 const actor={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))actor[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))actor[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(longs))actor[key]=long(base+offset);
 for(const[key,offset]of Object.entries(pointers))actor[key]=bases.indexOf(long(base+offset));
 actor.attempts=Object.fromEntries(attempts.map(offset=>[offset,word(base+offset)]));return actor;
});}
const configs=[];
for(let type=0;type<12;type++)for(const facing of [0,0x8000])for(const severity of [0,1,2])for(const region of [0,5,10])for(const clockMinutesBCD of [0x30,9])for(const sample of [0,1])
 configs.push({state:0x800c,type,facing,peerSeverity:severity,region,clockMinutesBCD,sample,controlCounter:48,round:(type+region+sample)%10});
for(const state of [11,0x800b])for(const peerFlags56 of [0,64,128])for(const controlCounter of [0,1,2,32,256,65535])for(const holdFlags of [0,0x4000])
 configs.push({state,peerFlags56,controlCounter,holdFlags,round:controlCounter%10});
for(const action of [74,94])for(const health of [0,1,36,37,63,64,79,80,100,101,127,128,500])for(const pinStatus of [0,1,3,5,8])for(const initialized of [false,true])
 configs.push({state:0x8005,action:action|(initialized?0x4000:0),health,pinStatus,controlCounter:3});
for(const action of [93,95,96,98,99])for(const severity of [0,1,2])for(const initialized of [false,true])for(const aiEscapeTimer of [0,1,2,65535])
 configs.push({state:0x8005,action:action|(initialized?0x4000:0),severity,aiEscapeTimer,controlCounter:92});
for(const action of [21,22,23,24,26,37,54,59,75,80,86,110,111,137])for(const region of [0,2,5,9])for(const sample of [0,1,2,3,4,5])
 configs.push({state:0x8005,action:action|(sample&1?0x4000:0),region,type:sample%2?5:0,round:sample,
  controlCounter:sample&1?1:48,inputBlockA:sample&2?0x10:0,mode:sample&4?1:0,
  x:action===22&&(sample&1)?0x200:640,y:action===22&&(sample&1)?0x130:336});
for(const variant of [{active:false},{flags56:0},{flags56:64},{flags32:128},{flags32:16},{forced:1},{matchFlags:1}])configs.push({state:0x800c,controlCounter:48,...variant});
for(const action of [54,72,75,24])configs.push({state:0x8005,action,aiFlagsB9:255});
for(const reaction of [8,9])for(const severity of [0,1,2])for(const peerAction of [0,8,9,10,11,12,14,15,16,17,18,19,20,21,34,35,53,70])for(const round of [0,6])for(const sample of [0,1])
 configs.push({state:0x8004,reaction,severity,peerState:0x8005,peerAction,round,sample,mode:sample,
  controlCounter:sample?1:16,inputBlockA:sample?16:0,inputBlockB:sample?2:0});
for(const state of [4,0x8004])for(const reaction of [1,2,8,9])for(const health of [0,20,110])for(const flags33 of [0x81,0x83])
 configs.push({state,reaction,health,flags33,walkMode:5,controlCounter:42,inputBlockA:255,inputBlockB:255,flags34:255});
const filter=process.env.COMPUTER_FILTER?JSON.parse(process.env.COMPUTER_FILTER):{},cases=[];
let sequence=0;
for(const config of configs){
 if(!Object.entries(filter).every(([key,value])=>config[key]===value))continue;
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const world={gameFlags:0x8000,mode:0,round:0,clockMinutesBCD:0x30,attractPhase:0,matchFlags:0,...Object.fromEntries(
  ['gameFlags','mode','round','clockMinutesBCD','attractPhase','matchFlags'].filter(key=>key in config).map(key=>[key,config[key]]))};
 put(0x1c007c,world.gameFlags);memory[0x1c0161]=world.mode;put(0x1c0162,world.round);put(0x1c16a0,world.clockMinutesBCD);
 memory[0x1c0167]=world.attractPhase;memory[0x1c16c5]=world.matchFlags;
 putLong(0x1c005c,(sequence++*0x523455+17)>>>0);putLong(0x1c0080,sequence*53);
 for(const[index,base]of bases.entries()){
  put(base,index<2?0x8000:0);put(base+2,index?6:config.type||0);memory[base+0x57]=index?6:config.type||0;
  put(base+0x20,index?0x80ff:config.state);memory[base+0x56]=index?0:128;
  memory[base+0x32]=index===2?1:0;memory[base+0x33]=index?3:0x81;
  put(base+0x66,index?120:110);put(base+0x70,0);put(base+0x72,128);
  putLong(base+6,((index?640:config.x??640)*65536+0x1234)|0);putLong(base+10,((index?336:config.y??336)*65536+0x5678)|0);
  putLong(base+0x7a,bases[index?0:1]);putLong(base+0x86,bases[index===0?2:0]);
 }
 const actor=bases[0],peer=bases[1];
 for(const[key,offset]of Object.entries({...words,...bytes}))if(key in config){if(key in bytes)memory[actor+offset]=config[key];else put(actor+offset,config[key]);}
 put(actor+0x2e,config.facing||0);put(peer+0x2e,(config.facing||0)^0x8000);
 putLong(actor+0x26,peer);putLong(peer+0x26,actor);
 if(config.peerFlags56!==undefined)memory[peer+0x56]=config.peerFlags56;
 // Only the requested actor runs AI; AI-like peers stay inactive for this call.
 if(config.peerFlags56)put(peer,0);
 if(config.peerSeverity!==undefined)put(peer+0x70,config.peerSeverity);
 if(config.peerState!==undefined)put(peer+0x20,config.peerState);
 if(config.peerAction!==undefined)put(peer+0x60,config.peerAction);
 if(config.active===false)put(actor,0);put(actor+0xfe,config.forced||0);
 const initial=snapshot(),entropy=[];
 cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);cpu.pc=0x1b390;cpu.sr=0x2700;let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x24e6,0x1e204,0x1e234].includes(cpu.pc))entropy.push(cpu.d[0]&255);
  cpu._execute();
 }
 assert(steps<100000,`AI stuck at ${cpu.pc.toString(16)} in ${JSON.stringify(config)}`);
 cases.push({config,world,initial,entropy,expected:snapshot()});
}
writeFileSync(output,JSON.stringify({source:'Original $01b390 target update, clinch and recovered linked-action AI decisions; other actors passive',cases},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length}));
