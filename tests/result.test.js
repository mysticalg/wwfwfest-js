import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {projectedPosition} from '../src/actors/projection.js';

const fixture=JSON.parse(readFileSync(process.env.RESULT_FIXTURE||new URL('./fixtures/result-reference.json',import.meta.url)));
const pointers=['auxiliaryIndex','opponentIndex','partnerIndex','secondaryPinnerIndex','secondaryOpponentIndex','lastHitIndex','assistanceTargetIndex'];
for(const sequence of fixture.sequences)test(`original result handler ${JSON.stringify(sequence.config)}`,()=>{
 const world={...sequence.world,rope:[0,0,0,0]};
 const bodies=sequence.initial.map(initial=>new LinkedActor({...Object.fromEntries(Object.entries(initial).filter(([key])=>key!=='projection')),
  world,attempts:{...initial.attempts}}));
 for(const [i,body]of bodies.entries()){
  body.slot=[0,1,4,5][i];
  for(const key of pointers)body[key.slice(0,-5)]=bodies[sequence.initial[i][key]]||null;
  body.entropy=()=>{throw new Error('Original handler must not request random entropy');};
 }
 world.assistCandidate=bodies[world.assistCandidate]||null;
 world.actors=Array.from({length:9},(_,slot)=>bodies.find(b=>b.slot===slot)||{active:false});
 const hash=createHash('sha256');
 for(let tick=0;tick<sequence.count;tick++){
  world.effectRequests=[];bodies[0].step();
  const actors=bodies.map((body,i)=>Object.fromEntries(Object.keys(sequence.initial[i]).map(key=>{
   let value=body[key]??0;
   if(key==='state')value=body.state|(body.pendingState?0:0x8000);
   else if(pointers.includes(key))value=bodies.indexOf(body[key.slice(0,-5)]);
   else if(key==='clock')value={...body.clock};
   else if(key==='attempts')value=Object.fromEntries(Object.keys(sequence.initial[i].attempts).map(offset=>[offset,body.attempts[offset]||0]));
   else if(key==='projection')value=body.projection?Object.values(projectedPosition(body.projection)):[0,232];
   return [key,value];
  })));
  const row={actors,sounds:[...bodies[0].sounds],effects:world.effectRequests.map(r=>({actor:bodies.indexOf(r.actor),kind:r.kind})),world:{message:world.message,controlsRefresh:world.controlsRefresh,switchTimer:world.switchTimer,assistDistance:world.assistDistance,assistCandidate:bodies.indexOf(world.assistCandidate)}};
  if(sequence.rows){
   for(let i=0;i<4;i++)for(const key of Object.keys(actors[i]))assert.deepEqual(actors[i][key],sequence.rows[tick].actors[i][key],`tick ${tick}, slot ${bodies[i].slot}, ${key}`);
   assert.deepEqual(row,sequence.rows[tick],`tick ${tick}`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),sequence.sha256);
});
