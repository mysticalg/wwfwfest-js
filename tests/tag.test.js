import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {cleanupGrappleLinks,grappleRegion} from '../src/actors/grapple.js';
import {stepComputerGrapple} from '../src/actors/computer-grapple.js';
import {advanceDamageService} from '../src/actors/match-services.js';
import {projectedPosition} from '../src/actors/projection.js';
import {participantFacing} from '../src/actors/facing.js';
const fixture=JSON.parse(readFileSync(process.env.TAG_FIXTURE||new URL('./fixtures/tag-reference.json',import.meta.url)));
for(const config of fixture.sequences)test(`native four-participant corner tag ${config.side}, incoming ${config.type}, order ${config.order}`,()=>{
 const world={...config.world,rope:[0,0,0,0],effectRequests:[],paletteUpdates:{}},bodies=config.initial.map(initial=>new LinkedActor({...initial,world}));
 let entropy=[],cursor=0;
 for(const[index,body]of bodies.entries()){
  body.slot=[0,1,4,5][index];
  for(const key of ['auxiliary','opponent','partner'])body[key]=bodies[config.initial[index][`${key}Index`]]||null;
  body.lastPose=body.clock.pose;body.entropy=kind=>{const row=entropy[cursor++];assert.equal(kind,row?.kind);return row.value;};
 }
 world.actors=Array.from({length:9},(_,slot)=>bodies.find(b=>b.slot===slot)||{active:false});world.activeA=bodies[0];world.activeB=bodies[2];
 const hash=createHash('sha256');
 for(let tick=0;tick<config.count;tick++){
  cursor=0;entropy=config.entropyFrames[tick];world.effectRequests=[];const sounds=[];
  for(const body of bodies){
   body.region=grappleRegion({x:body.xFixed>>>16,y:body.yFixed>>>16,...body});
   if(!(body.flags56&0xc0)){
    body.inputBlockA=body.inputBlockB=0;body.input({pressed:0,mask:0});body.runInput(0);
    if(body.state===0)body.facing=participantFacing(body,body.opponent);
   }else body.pressedButtons=0;
  }
  for(const body of bodies)stepComputerGrapple(body);
  const order=config.order?[...bodies].reverse():bodies;
  for(const body of order){assert.equal(body.pendingTransition,false,`frame ${tick}, slot ${body.slot} native dispatcher`);body.step();sounds.push(...body.sounds);}
  for(const body of bodies)if(body.clock.pose!==body.lastPose){body.contact=0;body.lastPose=body.clock.pose;}
  cleanupGrappleLinks(bodies);if(!(tick&1))advanceDamageService(world.actors);
  assert.equal(cursor,entropy.length,`frame ${tick}, random consumption`);
  const actors=bodies.map((body,index)=>Object.fromEntries(Object.keys(config.initial[index]).map(key=>{
   let value=body[key];
   if(key==='state')value=body.state|(body.pendingState?0:0x8000);
   else if(key.endsWith('Index'))value=bodies.indexOf(body[key.slice(0,-5)]);
   else if(key==='clock')value={...body.clock};
   else if(key==='projection')value=body.projection?Object.values(projectedPosition(body.projection)):[0,232];
   return[key,value];
  })));
  const row={actors,sounds,effects:world.effectRequests.map(r=>({actor:bodies.indexOf(r.actor),kind:r.kind})),world:Object.fromEntries(Object.keys(config.world).filter(k=>!['inGame','gameFlags','mode','round','clockMinutesBCD'].includes(k)).map(key=>[key,['activeA','activeB'].includes(key)?bodies.indexOf(world[key]):world[key]]))};
  if(config.rows){
   for(let index=0;index<4;index++)for(const key of Object.keys(actors[index]))assert.deepEqual(actors[index][key],config.rows[tick].actors[index][key],`frame ${tick}, slot ${bodies[index].slot}, ${key}`);
   assert.deepEqual(row,config.rows[tick],`frame ${tick}`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),config.sha256);
});
