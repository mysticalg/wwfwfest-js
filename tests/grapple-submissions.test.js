import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {GrappleActor,cleanupGrappleLinks} from '../src/actors/grapple.js';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {projectedPosition} from '../src/actors/projection.js';
import {initializeHealth,advanceDamageService} from '../src/actors/match-services.js';
import {Referee} from '../src/actors/referee.js';
const fixtureFiles=process.env.THROW_FIXTURE?[process.env.THROW_FIXTURE]:[
 new URL('./fixtures/grapple-submissions-reference.json',import.meta.url),new URL('./fixtures/linked-submissions-reference.json',import.meta.url),
 new URL('./fixtures/damage-submissions-reference.json',import.meta.url),new URL('./fixtures/referee-grapples-reference.json',import.meta.url)];
const fixtures={sequences:fixtureFiles.flatMap(path=>JSON.parse(readFileSync(path)).sequences)};
const bytes=['movementMode','flags32','flags33','flags34','flags35','flags56','hitCounter'];
const words=['type','facing','previousState','speed','direction','holdFlags','timer','contact','pendingDamage','velocityX','velocityY',
 'velocityZ','gravity','offsetX','offsetY','forced','action','reaction','severity','health','maximumHealth','paddingX','paddingY','paddingZ','eliminations',
 'mash','inputBlockA','inputBlockB','supportTimer','healthAccumulator','resultPose','targetX','targetY'];
const attemptOffsets=Array.from({length:11},(_,i)=>0xe8+i*2);
function snapshot(actor,bodies,composed=false,damage=false,referee=false){
 const result={state:actor.state|(actor.pendingState?0:0x8000)|(composed&&actor.state===2&&actor.inputInitialized?0x4000:0),
  clock:{flags:actor.clock.flags,remaining:actor.clock.remaining,index:actor.clock.index,pose:actor.clock.pose},
  xFixed:actor.xFixed,yFixed:actor.yFixed,zFixed:actor.zFixed,
  auxiliary:bodies.includes(actor.auxiliary)?bodies.indexOf(actor.auxiliary):null,unlinkMarked:actor.unlinkMarked,
  projection:actor.projection?Object.values(projectedPosition(actor.projection)):[0,232],
  collision:[actor.collision.kind,actor.collision.flags,actor.collision.x,actor.collision.y,actor.collision.z],
  attempts:attemptOffsets.map(offset=>actor.attempts[offset]||0)};
 result.motionLink=bodies.includes(actor.motionLink)?bodies.indexOf(actor.motionLink):null;
 result.assistanceTarget=bodies.includes(actor.assistanceTarget)?bodies.indexOf(actor.assistanceTarget):null;
 result.attempt26=actor.attempts[0xfc]||0;
 for(const key of [...bytes,...(damage?['flags57','flags104']:[]),...words,...(damage?['comboCount','comboTimer','idleTimer']:[]),...(referee?['pinStatus']:[])])
  result[key]=composed&&key==='previousState'?actor[key]&255:actor[key];
 return result;
}
for(const fixture of fixtures.sequences){
 test(`original ${fixture.composed?'linked':'kernel'} grapple hold ${fixture.action}, type ${fixture.type}, face ${fixture.facing}, x ${fixture.x}, ${fixture.variant}`,()=>{
  const Actor=fixture.composed?LinkedActor:GrappleActor;
  const bodies=fixture.initial.map(initial=>new Actor({...initial,attempts:{...initial.attempts,0xfc:initial.attempt26||0}})),
   partners=fixture.partnerInitial.map(initial=>new Actor({...initial,attempts:{...initial.attempts,0xfc:initial.attempt26||0}})),
   allBodies=[...bodies,...partners],world={...fixture.world,rope:[...fixture.world.rope],textRequests:[...fixture.world.textRequests],actors:allBodies},hash=createHash('sha256');
  let entropy=[],entropyIndex=0,boundary=null;
  for(const[index,body]of allBodies.entries()){
   body.slot=index;
   body.world=world;body.partner=allBodies[index^2];body.opponent=allBodies[index^1];
   body.auxiliary=[...fixture.initial,...fixture.partnerInitial][index].auxiliaryIndex===null?null:allBodies[index^1];body.lastPose=body.clock.pose;
   body.entropy=kind=>{const observed=entropy[entropyIndex++];assert.equal(observed?.kind,kind);return observed.value;};
  }
  if(fixture.damageService)for(const body of allBodies)initializeHealth(body,world);
  let referee=null;
  if(fixture.refereeInitial){
   world.activeA=allBodies[world.activeA];world.activeB=allBodies[world.activeB];world.countTiles=world.countTiles.map(row=>[...row]);
   referee=new Referee({world});
  }
  for(let tick=0;tick<fixture.count;tick++){
   entropy=fixture.entropyFrames[tick];entropyIndex=0;const sounds=[];
   for(const[index,body]of bodies.entries())body.pressedButtons=fixture.buttonInputs?.[tick]?.[index]||0;
   if(fixture.composed)for(const[index,body]of bodies.entries())body.runInput(fixture.runInputs?.[tick]?.[index]||0);
   if(referee){referee.step();sounds.push(...referee.sounds);}
   for(const index of fixture.updateOrder){
    const body=bodies[index];if(body.pendingTransition){boundary=index;break;}
    body.step();sounds.push(...body.sounds);
   }
   assert.equal(entropyIndex,entropy.length,`entropy requests, frame ${tick}`);
   if(boundary===null){
    for(const body of bodies)if(body.clock.pose!==body.lastPose){body.contact=0;body.lastPose=body.clock.pose;}
    cleanupGrappleLinks(bodies);
   }
   if(fixture.damageService&&!(tick&1)&&boundary===null)advanceDamageService(allBodies);
   const worldSnapshot=Object.fromEntries(Object.keys(fixture.world).map(key=>[key,['assistCandidate','activeA','activeB'].includes(key)?allBodies.indexOf(world[key])<0?null:allBodies.indexOf(world[key]):world[key]]));
   const row={actors:bodies.map(body=>snapshot(body,allBodies,fixture.composed,fixture.damageService,Boolean(referee))),sounds,world:worldSnapshot,partners:partners.map(body=>snapshot(body,allBodies,fixture.composed,fixture.damageService,Boolean(referee)))};
   if(referee)row.referee={state:referee.state|(referee.pendingState?0x8000:0),clock:{...referee.clock},xFixed:referee.xFixed,yFixed:referee.yFixed,zFixed:referee.zFixed,
    focus:allBodies.includes(referee.focus)?allBodies.indexOf(referee.focus):null,projection:Object.values(projectedPosition(referee.projection))};
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
