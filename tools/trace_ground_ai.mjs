import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const slots=[4,0,5,1],bases=slots.map(i=>0x1c05b0+i*0x10c),word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const words={type:2,facing:0x2e,state:0x20,action:0x60,reaction:0x64,holdFlags:0x44,timer:0x46,inputBlockA:0xb4,inputBlockB:0xb6,
 controlCounter:0xbc,aiDistanceX:0xb0,aiDistanceY:0xb2,direction:0x2c,targetX:0xbe,targetY:0xc0,health:0x66,severity:0x70,
 walkMode:0xae,recoveryTimer:0x9a,mash:0xaa,resultPose:0x4a,contact:0x4c,forced:0xfe,demoAction:0x100,cornerInput:0xac,speed:0x2a};
const bytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags57:0x57,flags74:0x74,flags75:0x75,flagsC6:0xc6,aiFlagsB9:0xb9,region:0x31,demoStep:0x103,movementMode:1};
const pointers={auxiliaryIndex:0x26,opponentIndex:0x7a,partnerIndex:0x86,assistanceTargetIndex:0x7e,secondaryPinnerIndex:0x9c};
function snapshot(){return bases.map(base=>{
 const actor={active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))actor[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))actor[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(pointers))actor[key]=bases.indexOf(long(base+offset)&0x7fffffff);
 actor.unlinkMarked=Boolean(memory[base+0x26]&128);
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14]])actor[key]=long(base+offset);
 actor.clock={flags:word(base+0x1c),remaining:word(base+0x22),index:word(base+0x24),pose:word(base+4)};
 actor.collision={kind:memory[base+0x36],flags:memory[base+0x37],x:word(base+0x38),y:word(base+0x3a),z:word(base+0x3c)};return actor;
});}
const entry=process.env.ENTRY||'idle',walk=entry==='walk',running=entry==='run',cases=[],profiles=[0,1,2,3,4,8,16,32,64,128,129,136,255];let seed=0x47524e44;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>16;};
const filter=process.env.GROUND_FILTER?JSON.parse(process.env.GROUND_FILTER):{};
for(let index=0;index<4096;index++){
 const config={index,type:index%12,facing:index&1?0x8000:0,entry};if(!Object.entries(filter).every(([k,v])=>config[k]===v))continue;
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const gameFlags=Number(process.env.GROUND_GAME_FLAGS??0x8000);
 const world={inGame:Boolean(gameFlags),gameFlags,mode:Number(process.env.GROUND_MODE||0),round:index%10,clockMinutesBCD:index&4?0x30:9,controlsRefresh:0,activeA:1,activeB:0,outsideTimer:0,attractPhase:gameFlags?0:1,cornerOccupancy:walk&&index&1?1:0,inputMode:0};
 put(0x1c007c,world.gameFlags);put(0x1c0162,world.round);put(0x1c16a0,world.clockMinutesBCD);
 memory[0x1c0161]=world.mode;memory[0x1c0167]=world.attractPhase;
 putLong(0x1c1684,bases[1]);putLong(0x1c1688,bases[0]);putLong(0x1c005c,index*0x523455+17);putLong(0x1c0080,index*53);
 putLong(0x1c1670,world.cornerOccupancy);
 const actorX=[440,520,640,760,848][random()%5],peerX=[440,520,640,760,848][random()%5];
 for(const[bi,base]of bases.entries()){
  put(base,0x8000);put(base+2,bi===0?config.type:bi===1?random()%12:6);memory[base+0x57]=word(base+2);
  put(base+0x20,bi===0?0x8000:bi===1?[0x8000,0x8001,0x8004,0x8005][random()%4]:0x8001);put(base+0x1c,word(base+0x20));
  memory[base+0x56]=bi===0?128:0;memory[base+0x33]=bi===0?0x81:bi===1?3:bi===2?128:0;
  memory[base+0x32]=bi>=2?1:0;put(base+0xae,bi>=2?1:0);
  put(base+0x66,[0,20,80,110,135][random()%5]);put(base+0x70,random()%3);
  putLong(base+6,((bi===0?actorX:peerX)*65536+0x1234)|0);putLong(base+10,((bi===0?336:[300,336,370][random()%3])*65536+0x5678)|0);putLong(base+14,320*65536);
  put(base+0x2e,bi===0?config.facing:config.facing^0x8000);
  putLong(base+0x7a,bases[bi^1]);putLong(base+0x86,bases[bi^2]);putLong(base+0x26,bi<2?bases[bi^1]:0);
 }
 const a=bases[0],p=bases[1];
 put(a+0xb4,profiles[random()%profiles.length]);put(a+0xb6,profiles[random()%profiles.length]|(profiles[random()%profiles.length]<<8));
 memory[a+0x34]=[0,1,2,4,16][random()%5];memory[a+0xb9]=random()&3;memory[a+0x31]=random()%18;
 if(index&2)memory[a+0x33]&=~1;
 if(index&16)memory[p+0x33]|=16;
 if(index&32)memory[p+0x33]|=64;
 put(p+0x60,[0,5,21,42,45,65,76,83,97,123][random()%10]);put(p+0x64,[0,1,8,9][random()%4]);
 put(a+0xbc,random()&255);put(a+0x44,0x1234);put(a+0x46,0x2345);put(a+0xae,5);putLong(a+0x7e,p);
 if(walk){
  put(a+0x20,0x8001);put(a+0x1c,0x8001);put(a+0xae,[0,0,0,5,6,7,8,9,10,11,12][random()%11]|(index&4?0x2000:0));
  put(a+0xbc,random()%4);put(a+0x60,[0,10,28,29,61,105][random()%6]);
  memory[p+0x32]=[0,0,1,2,4][random()%5];put(p+0x44,random()%4);memory[p+0x35]=random()%4;
  if(index%7===0)memory[a+0x74]=128;
  put(a+0xbe,actorX+(index&1?0:4));put(a+0xc0,336);memory[a+0x37]=index&4?1:0;
 }
 if(running){
  const state=[2,3,6][random()%3];put(a+0x20,state|(index&2?0:0x8000));put(a+0x1c,0x8002);put(a+0x44,random()%3);
  put(a+0xbc,random()&255);put(a+0x2a,random()&255);memory[a+0x32]=index&4?4:0;
  if(index&8)memory[a+0x33]|=2;
 }
 const initial=snapshot(),entropy=[];
 cpu.a[0]=a;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);cpu.pc=0x1b468;cpu.sr=0x2700;
 for(const address of [0x1b468,running?({2:0x1c9d6,3:0x1cc86,6:0x1dfea}[word(a+0x20)&255]):walk?0x1bb34:0x1b50c]){
  cpu.pc=address;cpu.a[0]=a;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
  while(cpu.pc!==0x7ff00&&steps++<100000){if(cpu.pc===0x24e6)entropy.push(cpu.d[0]&255);cpu._execute();}
  assert(steps<100000,`AI stuck ${index}: ${cpu.pc.toString(16)}`);
 }
 const expected=snapshot(),expectedWorld={...world,controlsRefresh:memory[0x1c1697],activeA:bases.indexOf(long(0x1c1684)),activeB:bases.indexOf(long(0x1c1688)),cornerOccupancy:long(0x1c1670)};
 cases.push({config,world,initial,entropy,expected,expectedWorld});
}
const source=running?'Original running/braking/rebound AI $01c9d6/$01cc86/$01dfea':walk?'Original walking AI target measurement and $01bb34':'Original idle AI target measurement and $01b50c';
let fixture={source:`${source}; other actors passive; weapon objects absent`,cases};
if(output.endsWith('.gz')){
 const fields=Object.keys(cases[0].initial[0]);
 fixture={source:fixture.source,fields,cases:cases.map(({expected,expectedWorld,initial,...row})=>({...row,
  initial:initial.map(a=>fields.map(key=>a[key])),expectedHash:createHash('sha256').update(JSON.stringify({actors:expected,world:expectedWorld})).digest('hex'),
  ...(process.env.DETAIL?{expected,expectedWorld}:{})}))};
}
const data=JSON.stringify(fixture)+'\n';writeFileSync(output,output.endsWith('.gz')?gzipSync(data,{level:9}):data);console.log(JSON.stringify({cases:cases.length}));
