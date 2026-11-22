import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {stepComputerGround,updateComputerTarget} from '../src/actors/computer-grapple.js';
const files=process.env.GROUND_FIXTURE?[process.env.GROUND_FIXTURE]:['idle','walk','run'].flatMap(entry=>[0,1,2].map(mode=>new URL(`./fixtures/ground-ai-${entry}-${mode}.json.gz`,import.meta.url)));
for(const file of files){
 const bytes=readFileSync(file),fixture=JSON.parse(bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes);
 test(`${fixture.source}, mode ${fixture.cases[0].world.mode}: ${fixture.cases.length} phases`,()=>{
 for(const row of fixture.cases){
 const c=fixture.fields?{...row,initial:row.initial.map(values=>Object.fromEntries(fixture.fields.map((key,i)=>[key,values[i]])))}:row;
 const world={...c.world},bodies=c.initial.map(v=>new LinkedActor({...v,world}));let cursor=0;
 world.actors=Array.from({length:9},(_,slot)=>bodies[[4,0,5,1].indexOf(slot)]||{active:false});
 world.activeA=bodies[c.world.activeA];world.activeB=bodies[c.world.activeB];
 for(const[i,b]of bodies.entries()){
  for(const key of ['auxiliary','opponent','partner','assistanceTarget','secondaryPinner'])b[key]=bodies[c.initial[i][`${key}Index`]]||null;
  b.entropy=kind=>{assert.equal(kind,'ai');assert.ok(cursor<c.entropy.length,'unexpected random draw');return c.entropy[cursor++];};
  b.collision={...c.initial[i].collision};
 }
 updateComputerTarget(bodies[0]);stepComputerGround(bodies[0]);assert.equal(cursor,c.entropy.length,'random consumption');
 const actors=bodies.map((body,i)=>Object.fromEntries(Object.keys(c.initial[i]).map(key=>{
  let value=bodies[i][key];if(key==='state')value=bodies[i].state|(bodies[i].pendingState?0:0x8000);
  else if(key.endsWith('Index'))value=bodies.indexOf(bodies[i][key.slice(0,-5)]);
  else if(key==='clock')value={...bodies[i].clock};
  return[key,value];
 })));
 if(c.expected)for(let i=0;i<4;i++)for(const key of Object.keys(c.expected[i])){
  assert.deepEqual(actors[i][key],c.expected[i][key],`case ${c.config.index}, actor ${i}, ${key}`);
 }
 const expectedWorld=Object.fromEntries(Object.keys(c.world).map(key=>[key,['activeA','activeB'].includes(key)?bodies.indexOf(world[key]):world[key]]));
 if(c.expectedWorld)assert.deepEqual(expectedWorld,c.expectedWorld);
 if(c.expectedHash)assert.equal(createHash('sha256').update(JSON.stringify({actors,world:expectedWorld})).digest('hex'),c.expectedHash,`case ${c.config.index}`);
 assert.equal(bodies[0].aiHandoff,undefined,`case ${c.config.index}, owning AI service`);
 }
});
}
