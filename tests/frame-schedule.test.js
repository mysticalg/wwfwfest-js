import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {Match} from '../src/game.js';
import {ArcadeInput} from '../src/arcade-input.js';
import {videoFrameRate,videoTiming} from '../src/timing.js';
import {worldPosition,updateScreenPosition} from '../src/actors/projection.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/frame-schedule-reference.json',import.meta.url)));

test('native video pace follows the documented MAME timing estimate',()=>{
 assert.equal(videoFrameRate,7_000_000/(448*272));
 assert.ok(Math.abs(1000/videoFrameRate-17.408)<1e-12);
 assert.equal(videoTiming.totalsEstimated,true);
});

for(const fixture of fixtures.scenarios){
 test(`original composed frame/input/projection/crowd schedule, type ${fixture.type}, phase ${fixture.startPhase}`,()=>{
  const match=new Match(fixture.type,6),input=new ArcadeInput(),hash=createHash('sha256');
  match.ai=false;match.ticks=fixture.startPhase;
  for(const[index,actor]of match.fighters.entries()){
   actor.health=actor.maximumHealth=100; // Controlled initialization in this timing reference.
   updateScreenPosition(actor,{xFixed:640*65536+0x1234,yFixed:(index?500:336)*65536+0x5678,zFixed:320*65536});
   actor.animation.flags=0x8000;actor.contact=1;if(index)actor.cameraFlags=0;
  }
  for(const[tick,active]of fixtures.inputs.entries()){
   const controls=input.controls({horizontal:active&1?1:active&2?-1:0,vertical:active&4?-1:active&8?1:0,
    strike:Boolean(active&16),heavy:Boolean(active&32)},fixture.startPhase+tick);
   match.step(controls);
   const row={actors:match.fighters.map(actor=>{
    const body=actor.runningAttack||actor.knockdown||actor.running;
    const state=body?body.state:actor.pendingIdle?0:({idle:0,walk:1,strike:5,heavy:5,hurt:4})[actor.state];
    const world=worldPosition(actor),projection=match.drawPosition(actor);
    return[state,state===5?actor.standingAction?actor.standingAction.button?114:0:body.action:state===4?body?.reaction||0:0,
     actor.animation.pose,actor.contact,world.xFixed,world.yFixed,world.zFixed,actor.health,actor.severity,
     actor.facing>0?0x8000:0,actor.comboCount,actor.comboTimer,[projection.x,projection.y]];
   }),camera:[match.camera.x,match.camera.y,match.camera.backgroundX,match.camera.backgroundY,match.camera.chunkX,match.camera.chunkY],
    scenery:match.scenery.snapshot(),events:match.scenery.events,sounds:match.takeSoundCommands(),
    input:[input.accumulator,input.held,input.pressed,input.directions]};
   if(fixture.rows)assert.deepEqual(row,fixture.rows[tick],`frame ${tick}`);
   hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(hash.digest('hex'),fixture.sha256);
 });
}
