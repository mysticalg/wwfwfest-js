import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {projectedPosition} from '../src/actors/projection.js';
const files=process.env.STANDING_FIXTURE?[process.env.STANDING_FIXTURE]:['standing-native-reference.json','ground-actors-reference.json'].map(name=>new URL(`./fixtures/${name}`,import.meta.url));
const fixture={sequences:files.flatMap(file=>JSON.parse(readFileSync(file)).sequences)};
for(const config of fixture.sequences)test(`native standing ${config.kind}, face ${config.facing}, x ${config.x}, link ${config.link}, variant ${config.variant}`,()=>{
 const actor=new LinkedActor({...config.initial,world:{mode:0,inGame:true,gameFlags:0x8000,rope:[0,0,0,0]}}),peer=new LinkedActor();
 actor.auxiliary=config.link?peer:null;peer.auxiliary=config.link===1||config.link===3?actor:null;peer.unlinkMarked=config.link===3;
 actor.secondaryPinner=peer;actor.lastPose=actor.clock.pose;const bodies=[actor,peer],hash=createHash('sha256');
 for(let tick=0;tick<config.count;tick++){
  if(config.groundActors&&tick===64)actor.forced=0x8000;
  assert.equal(actor.pendingTransition,false);actor.step();
  if(actor.clock.pose!==actor.lastPose){actor.contact=0;actor.lastPose=actor.clock.pose;}
  const result=Object.fromEntries(Object.keys(config.initial).map(key=>{
   let value=actor[key];
   if(key==='state')value=actor.state|(actor.pendingState?0:0x8000);
   else if(key==='clock')value={...actor.clock};
   else if(key.endsWith('Index'))value=bodies.indexOf(actor[key.slice(0,-5)]);
   else if(key==='projection')value=Object.values(projectedPosition(actor.projection));
   return[key,value];
  }));
  const row={actor:result,sounds:actor.sounds};
  if(config.rows)for(const key of Object.keys(result))assert.deepEqual(result[key],config.rows[tick].actor[key],`frame ${tick}, ${key}`);
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(actor.pendingState,true);assert.equal(hash.digest('hex'),config.sha256);
});
