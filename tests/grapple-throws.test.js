import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {GrappleActor,cleanupGrappleLinks} from '../src/actors/grapple.js';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {projectedPosition} from '../src/actors/projection.js';
const fixtureFiles=process.env.THROW_FIXTURE?[process.env.THROW_FIXTURE]:[
 new URL('./fixtures/grapple-throws-reference.json',import.meta.url),new URL('./fixtures/linked-throws-reference.json',import.meta.url),
 new URL('./fixtures/grapple-counters-reference.json',import.meta.url),new URL('./fixtures/linked-counters-reference.json',import.meta.url)];
const fixtures={sequences:fixtureFiles.flatMap(path=>JSON.parse(readFileSync(path)).sequences)};
const bytes=['movementMode','flags32','flags33','flags34','flags35','flags56','hitCounter'];
const words=['type','facing','previousState','speed','direction','holdFlags','timer','contact','pendingDamage','velocityX','velocityY',
 'velocityZ','gravity','offsetX','offsetY','forced','action','reaction','severity','health','maximumHealth','paddingX','paddingY','paddingZ','eliminations'];
const attemptOffsets=Array.from({length:11},(_,i)=>0xe8+i*2);
function snapshot(actor,bodies,composed=false){
 const result={state:actor.state|(actor.pendingState?0:0x8000)|(composed&&actor.state===2&&actor.inputInitialized?0x4000:0),
  clock:{flags:actor.clock.flags,remaining:actor.clock.remaining,index:actor.clock.index,pose:actor.clock.pose},
  xFixed:actor.xFixed,yFixed:actor.yFixed,zFixed:actor.zFixed,
  auxiliary:bodies.includes(actor.auxiliary)?bodies.indexOf(actor.auxiliary):null,unlinkMarked:actor.unlinkMarked,
  projection:actor.projection?Object.values(projectedPosition(actor.projection)):[0,232],
  collision:[actor.collision.kind,actor.collision.flags,actor.collision.x,actor.collision.y,actor.collision.z],
  attempts:attemptOffsets.map(offset=>actor.attempts[offset]||0)};
 result.motionLink=bodies.includes(actor.motionLink)?bodies.indexOf(actor.motionLink):null;
 for(const key of [...bytes,...words])result[key]=composed&&key==='previousState'?actor[key]&255:actor[key];
 return result;
}
for(const fixture of fixtures.sequences){
 test(`original ${fixture.composed?'linked':'kernel'} grapple throw ${fixture.action}, type ${fixture.type}, face ${fixture.facing}, x ${fixture.x}, ${fixture.variant}`,()=>{
  const Actor=fixture.composed?LinkedActor:GrappleActor;
  const bodies=fixture.initial.map(initial=>new Actor({...initial,attempts:{...initial.attempts}})),
   world={...fixture.world,rope:[...fixture.world.rope]},partners=fixture.partnerInitial.map(p=>({...p})),hash=createHash('sha256');
  let entropy=[],entropyIndex=0,boundary=null;
  for(const[index,body]of bodies.entries()){
   body.world=world;body.partner=partners[index];body.opponent=bodies[1-index];
   body.auxiliary=fixture.initial[index].auxiliaryIndex===null?null:bodies[1-index];body.lastPose=body.clock.pose;
   body.entropy=kind=>{const observed=entropy[entropyIndex++];assert.equal(observed?.kind,kind);return observed.value;};
  }
  for(let tick=0;tick<fixture.count;tick++){
   entropy=fixture.entropyFrames[tick];entropyIndex=0;const sounds=[];
   if(fixture.composed)for(const[index,body]of bodies.entries())body.runInput(fixture.runInputs?.[tick]?.[index]||0);
   for(const index of fixture.updateOrder){
    const body=bodies[index];if(body.pendingTransition){boundary=index;break;}
    body.step();sounds.push(...body.sounds);
   }
   assert.equal(entropyIndex,entropy.length,`entropy requests, frame ${tick}`);
   if(boundary===null){
    for(const body of bodies)if(body.clock.pose!==body.lastPose){body.contact=0;body.lastPose=body.clock.pose;}
    cleanupGrappleLinks(bodies);
   }
   const row={actors:bodies.map(body=>snapshot(body,bodies,fixture.composed)),sounds,world,partners:partners.map(p=>p.flags34)};
   if(fixture.rows){
    for(const[index,actor]of row.actors.entries())for(const key of Object.keys(actor))
      assert.deepEqual(actor[key],fixture.rows[tick].actors[index][key],`frame ${tick}, actor ${index}, ${key}`);
    assert.deepEqual(row,fixture.rows[tick],`frame ${tick}`);
   }
   hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(boundary,fixture.boundary);
  assert.equal(hash.digest('hex'),fixture.sha256);
 });
}
