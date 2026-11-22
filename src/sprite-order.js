import {projectedPosition} from './actors/projection.js';

// $0027c8/$002846/$002958: six queues, with stable signed-word depth sorting
// in queues 0/2/4/5. Referee enqueue precedes the physical wrestler iterator.
export function canQueueSprite(b,camera){
 if(b.active===false||!b.projection||(b.clock.pose&0x7fff)===0x7fff)return false;
 const p=projectedPosition(b.projection,camera),sy=232-p.y;
 return b.type>=78||p.x>=-63&&p.x<383&&sy>=-63&&sy<319;
}

export function spriteDrawOrder(entries,camera){
 return entries.map((entry,index)=>({...entry,index})).filter(entry=>{
  const b=entry.body;
  return b.state!==255&&(b.clock.pose&0x7fff)!==0x7fff&&(entry.queued||canQueueSprite(b,camera));
 }).sort((a,b)=>{
  const am=a.body.drawMode||0,bm=b.body.drawMode||0;
  if(am!==bm)return bm-am;
  if([0,2,4,5].includes(am)){
   const ay=(a.body.yFixed>>>16)<<16>>16,by=(b.body.yFixed>>>16)<<16>>16;
   if(ay!==by)return by-ay;
  }
  return a.index-b.index;
 });
}
