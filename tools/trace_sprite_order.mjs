import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const[hardware,program,output]=process.argv.slice(2),{default:CPU}=await import(pathToFileURL(hardware));
const memory=new Uint8Array(0x200000),cpu=new CPU();memory.set(readFileSync(program));
for(let page=0;page<0x2000;page++){cpu.memorymap[page].base=memory.subarray(page*256,(page+1)*256);cpu.memorymap[page].write=page<0x800?()=>{}:null;}
const word=a=>memory[a]*256+memory[a+1],long=a=>(word(a)*65536+word(a+2))|0,put=(a,v)=>{memory[a]=v>>>8;memory[a+1]=v;},putLong=(a,v)=>{put(a,v>>>16);put(a+2,v);};
function call(pc,base){cpu.pc=pc;cpu.a[0]=base;cpu.a[7]=0x1c3a00;cpu.sr=0x2700;putLong(cpu.a[7],0x7ff00);let count=0;while(cpu.pc!==0x7ff00&&count++<10000)cpu._execute();assert(count<10000);}
let seed=0x51554555;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>16;},pick=v=>v[random()%v.length];
const bases=[0x1c11f4,...[0,1,4,5].map(slot=>0x1c05b0+slot*0x10c)],camera={x:1024,y:2048},cases=[];
for(let index=0;index<512;index++){
 memory.fill(0,0x1c0000,0x1c4000);cpu.d.fill(0);cpu.a.fill(0);
 const entries=bases.map((base,i)=>{
  const active=pick([true,true,true,false]),state=pick([0,0,5,255]),pose=pick([0,1,32768,65535]),drawMode=random()%6;
  const depth=pick([0,1,280,300,337,337,343,408,32767,32768,65535]),px=pick([-64,-63,0,128,382,383]),py=pick([-64,-63,0,128,318,319]);
  put(base,active?32768:0);put(base+2,i===0?12:i);put(base+0x20,state|32768);put(base+4,pose);put(base+0x12,drawMode);put(base+10,depth);put(base+0x14,px);put(base+0x16,py);
  call(0x27c8,base);
  return{body:{active,state,type:i===0?12:i,clock:{pose},drawMode,yFixed:depth<<16,
   projection:{xFixed:(camera.x+px)*65536,yFixed:(camera.y-320+py)*65536,zFixed:320*65536,facing:0,offsetX:0,offsetY:0}}};
 });
 const expected=[];
 for(const mode of [5,4,3,2,1,0]){
  const list=long(0x2816+mode*8),counter=long(0x281a+mode*8);cpu.a[1]=list;cpu.a[6]=counter;if([0,2,4,5].includes(mode))call(0x2958,bases[0]);
  for(let i=0;i<word(counter);i++){const b=long(list+i*4),entry=bases.indexOf(b);if((word(b+0x20)&255)!==255)expected.push(entry);}
 }
 cases.push({index,entries,camera,expected});
}
writeFileSync(output,JSON.stringify({source:'Original sprite queue enqueue $0027c8, clipping $002198, stable signed-depth sort $002958 and queue traversal $002846/$00290a; no tile expansion',cases})+'\n');
console.log(JSON.stringify({cases:cases.length}));
