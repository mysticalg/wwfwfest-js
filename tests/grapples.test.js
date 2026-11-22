import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {canGrapple,startGrapple,GrappleActor,cleanupGrappleLinks,grappleRegion,headlockMove,grappleContest} from '../src/actors/grapple.js';
import {projectedPosition} from '../src/actors/projection.js';
const fixtures=JSON.parse(readFileSync(process.env.GRAPPLE_FIXTURE||new URL('./fixtures/grapples-reference.json',import.meta.url)));

test('standing grapple eligibility matches the original state and status gates',()=>{
 for(const fixture of fixtures.eligibility)assert.equal(canGrapple(fixture.initial,fixture.mode),fixture.accepted,JSON.stringify(fixture));
});

test('grapple probability gates match original comparisons given observed RNG entropy',()=>{
 for(const fixture of fixtures.contests){
  const hash=createHash('sha256');
  for(const randomNibble of fixture.entropy){
   hash.update(JSON.stringify([randomNibble,grappleContest({...fixture,randomNibble})])+'\n');
  }
  assert.equal(hash.digest('hex'),fixture.sha256,JSON.stringify(fixture));
 }
});

test('headlock move choice, alternating severity bits and arena remaps match the original input routine',()=>{
 for(const fixture of fixtures.selections){
  const hash=createHash('sha256');
  for(let region=0;region<15;region++){
   const choice=headlockMove(fixture.type,fixture.severity,fixture.toggle,fixture.pressed,{facing:fixture.facing,region});
   hash.update(JSON.stringify([region,choice.action,choice.toggle,0,0,5])+'\n');
  }
  assert.equal(hash.digest('hex'),fixture.sha256,JSON.stringify(fixture));
 }
});

test('arena position buckets for grapple move choice match the original boundary rules',()=>{
 for(const fixture of fixtures.regions){
  const hash=createHash('sha256');
  for(const[x,y,region]of fixtures.regionInputs)hash.update(JSON.stringify(grappleRegion({x,y,region,...fixture}))+'\n');
  assert.equal(hash.digest('hex'),fixture.sha256);
 }
});

function snapshot(actor,bodies){
 const result={state:actor.state|(actor.pendingState?0:0x8000),action:actor.action,reaction:actor.reaction,
  clock:{flags:actor.clock.flags,remaining:actor.clock.remaining,index:actor.clock.index,pose:actor.clock.pose},
  xFixed:actor.xFixed,yFixed:actor.yFixed,zFixed:actor.zFixed,facing:actor.facing,movementMode:actor.movementMode,
  auxiliary:bodies.includes(actor.auxiliary)?bodies.indexOf(actor.auxiliary):null,unlinkMarked:actor.unlinkMarked,
  projection:actor.projection?Object.values(projectedPosition(actor.projection)):[0,232],
  collision:[actor.collision.kind,actor.collision.flags,actor.collision.x,actor.collision.y,actor.collision.z],hitCounter:actor.hitCounter};
 for(const key of ['type','previousState','speed','direction','holdFlags','timer','grappleIndex','comboCount','comboTimer',
  'controlCounter','inputBlockA','inputBlockB','contact','pendingDamage','velocityX','velocityY','velocityZ','gravity','offsetX','offsetY','forced',
  'flags32','flags33','flags34','flags56','flags74','flagsB7','flags35'])result[key]=actor[key];
 return result;
}

for(const fixture of fixtures.sequences){
 test(`original linked grapple kernels, type ${fixture.type}, facing ${fixture.facing}, x ${fixture.x}, actor ${fixture.controllerIndex}, ${fixture.plan}`,()=>{
  const bodies=fixture.initial.map(initial=>new GrappleActor(initial)),hash=createHash('sha256');
  for(const[index,body]of bodies.entries()){body.auxiliary=fixture.initial[index].auxiliaryIndex===null?null:bodies[1-index];body.lastPose=body.clock.pose;}
  let boundary=null;
  for(const[tick,input]of fixtures.inputPrograms[fixture.program].slice(0,fixture.count).entries()){
   const sounds=[];
   for(const[index,body]of bodies.entries()){
    body.forced=input.forced[index];body.input({pressed:input.pressed[index],mask:input.mask[index]});
   }
   for(const index of fixture.updateOrder){
    const body=bodies[index];
    if(body.pendingTransition){boundary=index;break;}
    body.step();sounds.push(...body.sounds);
   }
   if(boundary===null){
    for(const body of bodies)if(body.clock.pose!==body.lastPose){body.contact=0;body.lastPose=body.clock.pose;}
    cleanupGrappleLinks(bodies);
   }
   const row={actors:bodies.map(body=>snapshot(body,bodies)),sounds,sceneRefresh:Math.max(...bodies.map(b=>b.sceneRefresh))};
   if(fixture.rows)assert.deepEqual(row,fixture.rows[tick],`frame ${tick}`);
   hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(boundary,fixture.boundary);
  assert.equal(hash.digest('hex'),fixture.sha256);
 });
}

test('standing pair arbitration matches original winner, status, links and word arithmetic',()=>{
 for(const fixture of fixtures.pairs){
  const bodies=fixture.initial.map((initial,index)=>({...initial,id:index?'target':'actor'}));
  for(const [index,body]of bodies.entries())body.opponent=bodies[1-index];
  startGrapple(...bodies,fixture.options);
  for(const [index,body]of bodies.entries()){
   const actual=Object.fromEntries(Object.keys(fixture.result[index]).map(key=>[key,
    ['auxiliary','opponent'].includes(key)&&typeof body[key]==='object'?body[key].id:body[key]]));
   assert.deepEqual(actual,fixture.result[index],JSON.stringify({initial:fixture.initial,options:fixture.options,index}));
  }
 }
});
