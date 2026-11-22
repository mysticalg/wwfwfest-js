import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Match} from '../src/game.js';
import {projectedPosition} from '../src/actors/projection.js';

const fixture=JSON.parse(readFileSync(process.env.TEAM_FIXTURE||new URL('./fixtures/team-match-reference.json',import.meta.url)));
const pointerKeys=['auxiliaryIndex','opponentIndex','partnerIndex','lastHitIndex','secondaryPinnerIndex','secondaryOpponentIndex'];
for(const sequence of fixture.sequences)test(`composed native tag match ${JSON.stringify(sequence.config)}`,()=>{
 const match=new Match(sequence.config.type,6,{tagTeams:true}),world=match.world;
 const bodies=match.nativeActors.participants.map(f=>f.original);
 Object.assign(world,sequence.world,{paletteUpdates:{},activeA:bodies[sequence.world.activeA],activeB:bodies[sequence.world.activeB]});
 for(const [i,body]of bodies.entries()){
  for(const [key,value]of Object.entries(sequence.initial[i])){
   if(key==='state'){body.state=value&255;body.pendingState=!(value&0x8000);body.inputInitialized=Boolean(value&0x4000);}
   else if(key==='clock')Object.assign(body.clock,value);
   else if(pointerKeys.includes(key))body[key.slice(0,-5)]=bodies[value]||null;
   else if(key!=='projection')body[key]=value;
  }
 }
 let entropy=[],cursor=0;
 world.entropy=kind=>{const item=entropy[cursor++];assert.equal(kind,item?.kind,`tick ${match.ticks-1}: entropy kind`);return item.value;};
 const hash=createHash('sha256');
 for(let tick=0;tick<sequence.count;tick++){
  entropy=sequence.entropyFrames[tick];cursor=0;match.step(sequence.inputs[tick]);
  assert.equal(cursor,entropy.length,`tick ${tick}: entropy consumption`);
  const actors=bodies.map((body,i)=>Object.fromEntries(Object.keys(sequence.initial[i]).map(key=>{
   let value=body[key]??0;
   if(key==='state')value=body.state|(body.pendingState?0:0x8000)|(body.state===2&&body.inputInitialized?0x4000:0);
   else if(pointerKeys.includes(key))value=bodies.indexOf(body[key.slice(0,-5)]);
   else if(key==='clock')value={...body.clock};
   else if(key==='projection')value=body.projection?Object.values(projectedPosition(body.projection,match.camera)):[0,232];
   return [key,value];
  })));
  const ref=match.referee,row={actors,sounds:match.takeSoundCommands(),effects:world.effectRequests.map(r=>({actor:bodies.indexOf(r.actor),kind:r.kind})),
   world:Object.fromEntries(['message','messagePending','messageIndex','messageTimer','controlsRefresh','cornerOccupancy','switchTimer','activeA','activeB','paletteUpdates'].map(key=>[key,['activeA','activeB'].includes(key)?bodies.indexOf(world[key]):world[key]??0])),
   camera:Object.fromEntries(['x','y','backgroundX','backgroundY'].map(key=>[key,match.camera[key]])),
   referee:[world.matchResult,ref.clock.flags,ref.clock.remaining,ref.clock.index,ref.clock.pose,ref.xFixed,ref.yFixed,ref.zFixed,ref.direction,ref.speed,ref.facing,ref.offsetX,ref.offsetY]};
  if(sequence.rows){
   for(let i=0;i<bodies.length;i++)for(const key of Object.keys(actors[i]))assert.deepEqual(actors[i][key],sequence.rows[tick].actors[i][key],`tick ${tick}, slot ${bodies[i].slot}, ${key}`);
   assert.deepEqual(row,sequence.rows[tick],`tick ${tick}`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),sequence.sha256);
 if(sequence.boundary)assert.deepEqual({tick:match.ticks-1,slot:match.handoff.slot,state:match.handoff.state,action:match.handoff.action,reaction:match.handoff.reaction},sequence.boundary);
 else assert.equal(match.handoff,undefined);
});
