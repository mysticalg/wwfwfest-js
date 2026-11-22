import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const slots=[0,1,4,5],bases=slots.map(i=>0x1c05b0+i*0x10c),actor=bases[1],target=bases[2],word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0;
const put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
const words={state:0x20,action:0x60,reaction:0x64,facing:0x2e,holdFlags:0x44,timer:0x46,contact:0x4c,pendingDamage:0x68,
 comboCount:0x52,comboTimer:0x54,recoveryTimer:0x9a,pinStatus:0x108,inputBlockA:0xb4,inputBlockB:0xb6,supportTimer:0xe6,
 offsetX:0x18,offsetY:0x1a,hitMask:0x8e,direction:0x2c,severity:0x70,forced:0xfe};
const bytes={flags32:0x32,flags33:0x33,flags34:0x34,flags35:0x35,flags56:0x56,flags74:0x74,flags75:0x75,flagsC6:0xc6,hitCounter:0xc7};
const pointers={auxiliary:0x26,partner:0x86,opponent:0x7a,assistanceTarget:0x7e,lastHit:0x92};
const sounds=[];cpu.memorymap[0x1400].write16=(a,v)=>{if(a===0x14000c)sounds.push(v&255);};
function snapshot(){return bases.map(base=>{
 const result={type:word(base+2),active:Boolean(memory[base]&128)};
 for(const[key,offset]of Object.entries(words))result[key]=word(base+offset);
 for(const[key,offset]of Object.entries(bytes))result[key]=memory[base+offset];
 for(const[key,offset]of Object.entries(pointers))result[`${key}Index`]=bases.indexOf(long(base+offset)&0x7fffffff);
 result.unlinkMarked=Boolean(memory[base+0x26]&128);result.heldObjectIndex=long(base+0x76)?0:-1;
 for(const[key,offset]of [['xFixed',6],['yFixed',10],['zFixed',14]])result[key]=long(base+offset);
 result.clock={flags:word(base+0x1c),remaining:0,index:0,pose:word(base+4)};return result;
});}
const primaryContacts=[0,7,3,4,6,11,15,16,17,18,5,23,19,8,27],secondaryContacts=[1,9,10,12,13,14,20,21,26,29,30,31,4];
const phase=process.env.ENTRY==='phase',cases=[],hash=createHash('sha256');let fields;
for(const attackContact of primaryContacts)for(const targetContact of secondaryContacts)for(let variant=0;variant<16;variant++){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);sounds.length=0;
 const mode=variant&8?2:0;put(0x1c007c,0x8000);put(0x1c0160,mode);put(0x1c15d2,0x1234);
 for(const[index,base]of bases.entries()){
  put(base,0x8000);put(base+2,(variant+index)%12);put(base+0x20,0x8005);put(base+0x60,index===1&&variant&1?65:21);
  put(base+0x64,0x2323);put(base+0x1c,0xc005);put(base+4,3);
  memory[base+0x33]=[3,0,129,128][index]|(index===2&&(variant&2)?16:0);memory[base+0x56]=[0,64,128,192][index];
  memory[base+0x35]=7;memory[base+0x34]=7;memory[base+0x32]=index===3?1:0;
  put(base+0x44,0x1212);put(base+0x46,0x3434);put(base+0xe6,9);put(base+0xb4,0x0180);put(base+0xb6,0x2222);
  put(base+0x108,variant%6);put(base+0x18,19);put(base+0x1a,20);put(base+0x8e,32);put(base+0x70,variant%3);
  put(base+0x2c,variant&1?128:0);put(base+0x2e,index===2&&variant&1?0x8000:0);
  put(base+0x52,variant&4?3:2);put(base+0x68,variant&8?0x1200:0);
  putLong(base+6,(640*65536+0x1234)|0);putLong(base+10,337*65536+0x5678);putLong(base+14,320*65536);
  putLong(base+0x86,bases[index^1]);putLong(base+0x7a,bases[index^2]);putLong(base+0x7e,bases[index^1]);
  putLong(base+0x26,index===0?target:index===2?bases[0]:0);putLong(base+0x76,0x1c2000);put(0x1c201c,9);
 }
 put(actor+0x4c,attackContact);put(target+0x4c,targetContact|(variant===4?0x4000:variant===5?0x8000:0));
 if(variant===6)put(target+0x2e,5);if(variant===7){memory[target+0x74]=128;memory[target+0x75]=17;put(target+0xc6,65535);}
 if(phase){
  // Targets ahead of and behind the attacker exercise the cached attack record.
  if(variant&1)put(bases[0]+0x4c,1);
  if(variant&2)put(bases[3]+0x4c,1);
  if(variant&4)put(actor+0x8e,0x8000);
  if(variant===8)put(target+0x20,5);
  if(variant===9)memory[target+0x32]|=64;
  if(variant===10)memory[target+0x32]|=4;
  if(variant===11)put(target+0xfe,1);
  if(variant===12)put(target+4,65535);
  if(variant===13)put(actor+0x20,5);
  if(variant===14)put(target+6,720);
  if(variant===15)put(target+10,349);
 }
 const initial=snapshot(),world={mode,inGame:true,gameFlags:0x8000,message:0x1234,controlsRefresh:0};
 cpu.pc=phase?0x23288:0x23580;cpu.a[0]=actor;cpu.a[1]=target;cpu.a[2]=0x2411c+attackContact*7;cpu.a[3]=0x2411c+targetContact*7;cpu.d[1]=5;
 cpu.sr=0x2700;cpu.a[7]=0x1c3a00;putLong(cpu.a[7],0x7ff00);let steps=0;
 while(cpu.pc!==0x7ff00&&steps++<10000)cpu._execute();assert(steps<10000,`Contact stalled ${attackContact},${targetContact},${variant}`);
 const result={actors:snapshot(),accepted:phase?null:!(cpu.sr&1),sounds:[...sounds],world:{...world,message:word(0x1c15d2),controlsRefresh:memory[0x1c1697]},heldObjectState:word(0x1c201c)};
 fields??=Object.keys(initial[0]);
 hash.update(JSON.stringify(result)+'\n');cases.push({attackContact,targetContact,variant,initial:initial.map(a=>fields.map(key=>a[key])),world,...(process.env.DETAIL?{result}:{} )});
}
writeFileSync(output,JSON.stringify({source:phase?'Original physical-pool contact phase $023288':'Original primary and secondary contact responses $023580; all 15/13 dispatch entries, valid mutual held graph',phase,fields,cases,sha256:hash.digest('hex')})+'\n');
console.log(JSON.stringify({cases:cases.length}));
