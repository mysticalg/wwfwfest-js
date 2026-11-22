import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const slots=[0,4,1,5],bases=slots.map(i=>0x1c05b0+i*0x10c),word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const words={type:2,facing:0x2e,state:0x20,action:0x60,reaction:0x64,holdFlags:0x44,timer:0x46,inputBlockA:0xb4,inputBlockB:0xb6,
 controlCounter:0xbc,aiDistanceX:0xb0,aiDistanceY:0xb2,direction:0x2c,targetX:0xbe,targetY:0xc0,health:0x66,severity:0x70,
 walkMode:0xae,recoveryTimer:0x9a,mash:0xaa,resultPose:0x4a,contact:0x4c,forced:0xfe,demoAction:0x100,cornerInput:0xac,speed:0x2a,comboCount:0x52};
const bytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags57:0x57,flags74:0x74,flags75:0x75,flagsC6:0xc6,aiFlagsB9:0xb9,region:0x31,demoStep:0x103,movementMode:1,moveToggle:0x62};
const pointers={auxiliaryIndex:0x26,opponentIndex:0x7a,partnerIndex:0x86,assistanceTargetIndex:0x7e,secondaryPinnerIndex:0x9c,secondaryOpponentIndex:0x82};
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

const u16=v=>v&65535;
const cases=[],filter=process.env.HUMAN_FILTER?JSON.parse(process.env.HUMAN_FILTER):{};let seed=0x48554d41;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>16;};
const pick=values=>values[random()%values.length],moves=[0,5,14,15,21,22,26,34,37,53,54,60,61,62,72,73,74,75,81,82,83,93,94,95,96,97,98,99,100,113,123,124];
for(let index=0;index<8192;index++){
 const config={index,type:index%12,mode:Number(process.env.HUMAN_MODE||0)};
 if(!Object.entries(filter).every(([k,v])=>config[k]===v))continue;
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const world={inGame:true,gameFlags:0x8000,mode:config.mode,round:0,cornerOccupancy:pick([0,0,0,1,16,256])};
 put(0x1c007c,world.gameFlags);memory[0x1c0161]=world.mode;putLong(0x1c1670,world.cornerOccupancy);
 putLong(0x1c005c,index*0x523455+17);putLong(0x1c0080,index*53);
 const ax=pick([440,452,453,480,496,497,528,544,559,560,624,640,752,764,768,769,811,828,848,975]),ay=pick([280,281,282,300,301,302,336,337,368,369,389,390,407,408]);
 for(const[bi,base]of bases.entries()){
  put(base,0x8000);put(base+2,bi===0?config.type:random()%12);memory[base+0x57]=word(base+2);
  const state=bi===0?pick([0,0,1,1,2,3,4,5,5,5,6,7,8,9,10,11,12,255]):bi===1?pick([0,1,2,4,4,5,5]):1;
  put(base+0x20,state|0x8000);put(base+0x1c,state|0x8000);
  memory[base+0x56]=bi===0?0:pick([64,128]);memory[base+0x33]=bi===0?pick([3,3,3,2,1,0,7,135,129,131]):bi===1?pick([1,3,17,65,129]):0;
  memory[base+0x32]=bi===0?pick([0,0,0,1,2]):bi>=2?1:0;memory[base+0x34]=bi===0?pick([0,0,0,1,2,4,32]):pick([0,0,0,1,2,4,16]);
  put(base+0xae,bi>=2?pick([1,0x8001,0x8002,2,3,0x8004]):pick([0,0,0,1,5,6,7,8,9,10,11,12,13]));
  put(base+0x66,pick([0,20,80,110,135]));put(base+0x70,random()%3);
  putLong(base+6,((bi===0?ax:bi===1?u16(ax+pick([-100,-80,-64,-40,-32,-16,0,16,32,40,64,80,100])):bi===2?438:828)*65536+0x1234)|0);
  putLong(base+10,((bi===0?ay:bi===1?u16(ay+pick([-32,-16,-4,-1,0,1,4,16,32])):343)*65536+0x5678)|0);putLong(base+14,320*65536);
  put(base+0x2e,pick([0,0x8000]));put(base+0x60,pick(moves)|pick([0,0x4000,0x8000,0xc000]));put(base+0x64,pick([0,1,6,7,8,9]));
  put(base+0x44,pick([0,1,2,0x2000,0x4000,0x6000]));put(base+0x46,0x1234);put(base+0x52,random()%5);
  putLong(base+0x7a,bases[bi^1]);putLong(base+0x86,bases[bi^2]);putLong(base+0x82,bases[bi^1]);putLong(base+0x26,bi<2?pick([0,bases[bi^1],bases[bi^2]]):bases[bi^2]);
  put(base+0xb4,0x1234);put(base+0xb6,0x5678);
 }
 const a=bases[0],p=bases[1];
 if([11,12].includes(word(a+0x20)&255)||((word(a+0x20)&255)===5&&[21,22,123].includes(word(a+0x60)&255))){putLong(a+0x26,p);putLong(p+0x26,a);}
 if((word(p+0x20)&255)===5&&[72,73].includes(word(p+0x60)&255)&&!long(p+0x26))putLong(p+0x26,bases[3]);
 if(index%13===0)put(a+0x20,word(a+0x20)&255);
 if(index%17===0)memory[a+0x56]=pick([64,128,192]);
 put(a+0xfe,index%7?0:pick([1,0x8000]));put(a+0xaa,pick([0,0,0x4000]));memory[a+0x62]=random()&255;memory[a+0x31]=random()%18;
 if(index%19===0)memory[a+0x74]=128;
 put(a+0xac,pick([0,0x8001,0x8002,0x8004]));put(a+0x24,random()%3);
 memory[a+0x36]=pick([0,1,3,4,5]);memory[a+0x37]=pick([0,1,2,3,8,16]);put(a+0x2c,pick([0,64,192]));
 if((word(a+0x20)&255)===2&&index&1)put(a+0x20,word(a+0x20)|0x4000);
 const input={pressed:pick([0,0,1,2,3,3,129]),mask:random()%16};memory[a+0xa3]=input.pressed;put(a+0xa8,input.mask);
 const initial=snapshot(),entropy=[];
 cpu.pc=0xe3ca;cpu.a[0]=a;cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<100000){
  if([0x10534,0x1059e,0x105d2].includes(cpu.pc))entropy.push(cpu.d[0]&15);
  cpu._execute();
 }
 assert(steps<100000,`Human phase stuck ${index}: ${cpu.pc.toString(16)}`);
 const expected=snapshot(),expectedWorld={...world,cornerOccupancy:long(0x1c1670)};
 cases.push({config,world,initial,input,entropy,expected,expectedWorld});
}
let fixture={source:'Original human input phase $00e3ca: selector $00cf1e/$00d0c6/$00d008 and post-selection state controls; other actor records passive; weapon objects absent',cases};
if(output.endsWith('.gz')){
 const fields=Object.keys(cases[0].initial[0]);
 fixture={source:fixture.source,fields,cases:cases.map(({expected,expectedWorld,initial,...row})=>({...row,initial:initial.map(a=>fields.map(key=>a[key])),expectedHash:createHash('sha256').update(JSON.stringify({actors:expected,world:expectedWorld})).digest('hex')}))};
 writeFileSync(output,gzipSync(JSON.stringify(fixture),{level:9}));
}else writeFileSync(output,JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,entropy:cases.reduce((n,c)=>n+c.entropy.length,0)}));
