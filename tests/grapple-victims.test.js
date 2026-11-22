import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {Knockdown} from '../src/actors/knockdown.js';
import {outsideRingCollision} from '../src/actors/ring-collision.js';
import {projectedPosition} from '../src/actors/projection.js';
const fixtures=JSON.parse(readFileSync(process.env.VICTIM_FIXTURE||new URL('./fixtures/grapple-victims-reference.json',import.meta.url)));
test('normal outside-ring collision matches 32,768 original probe and status cases',()=>{
 let seed=0x56494354;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},hash=createHash('sha256');
 for(let index=0;index<fixtures.collision.count;index++){
  const initial={x:random()%1100,y:random()%800,z:random()%600,facing:random()&0x8000,flags32:[0,1,16,32][index%4],
   paddingX:random()%161-80,paddingY:random()%65-32,paddingZ:random()%65-32,kind:index%4,flags:index&31};
  const c=outsideRingCollision(initial);hash.update(JSON.stringify([c.kind,c.flags,c.x,c.y,c.z])+'\n');
 }
 assert.equal(hash.digest('hex'),fixtures.collision.sha256);
});
for(const fixture of fixtures.scenarios){
 test(`original grapple victim ${JSON.stringify(fixture.initial)}`,()=>{
  const initial=fixture.initial,world={mode:initial.mode,scene:0,rope:[0,0,0,0]},attacker={facing:initial.attackerFacing,eliminations:0,
   xFixed:initial.xFixed,yFixed:initial.yFixed,zFixed:initial.zFixed-72*65536};
  const body=new Knockdown({...initial,pose:initial.facing,clock:{flags:0x8005},world,attacker,motionLink:attacker});
  attacker.auxiliary=body;
  const hash=createHash('sha256');let comboTimer=0;
  for(let tick=0;tick<fixture.count;tick++){
   body.step({pressed:initial.mashEvery&&tick%initial.mashEvery===0?1:0});
   if(body.comboTimerStart)comboTimer=body.comboTimerStart;if(body.comboReset)comboTimer=0;
   const row=[body.state,body.reaction,body.action,body.clock.flags,body.clock.remaining,body.clock.index,body.clock.pose,
    body.xFixed,body.yFixed,body.zFixed,body.movementMode,body.velocityX,body.velocityY,body.velocityZ,body.gravity,
    body.paddingX,body.paddingY,body.paddingZ,body.collision.kind,body.collision.flags,body.recoveryTimer,body.mash,
    body.facing,body.flags32,body.flags33,body.flags34,body.holdFlags,comboTimer,attacker.eliminations,world.rope,
    Object.values(projectedPosition(body.projection)),body.sounds];
   if(fixture.rows)assert.deepEqual(row,fixture.rows[tick],`frame ${tick}`);hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(body.done,fixture.done);assert.equal(body.pendingTransition,fixture.handoff);
  assert.equal(hash.digest('hex'),fixture.sha256);
 });
}
