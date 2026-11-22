import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {Match} from '../src/game.js';
import {worldPosition} from '../src/actors/projection.js';
import {Knockdown} from '../src/actors/knockdown.js';
const paths=process.env.MATCH_COMPUTER_FIXTURE?[process.env.MATCH_COMPUTER_FIXTURE]:['match-computer-reference.json','match-computer-pins-reference.json'].map(path=>new URL(`./fixtures/${path}`,import.meta.url));
const sequences=paths.flatMap(path=>JSON.parse(readFileSync(path)).sequences);
for(const config of sequences)test(`playable original computer ${config.entry||'clinch'} sequence ${JSON.stringify({...config,inputs:undefined,entropyFrames:undefined,rows:undefined,boundary:undefined,sha256:undefined})}`,()=>{
 let entropy=[],cursor=0;
 const match=new Match(0,config.type,{entropy:kind=>{const row=entropy[cursor++];assert.equal(row?.kind,kind);return row.value;}}),hash=createHash('sha256');

 for(const[index,actor]of match.fighters.entries()){
  actor.x=640+(index?(config.facing?-60:60):0)+0x1234/65536-461;actor.y=240+577-320-(336+0x5678/65536);
  actor.facing=(index?config.facing:config.facing^0x8000)?1:-1;actor.animation.flags=0x8000;actor.animation.pose=actor.lastPose=actor.facing>0?0x8000:0;
  actor.contact=1;
 }
 for(const actor of match.fighters)actor.original.grappleIndex=3;
 Object.assign(match.fighters[0],{health:config.targetHealth,severity:config.severity});
 if(config.entry==='pin'){
  const actor=match.fighters[1];actor.x=670+0x1234/65536-461;actor.health=config.computerHealth;
  actor.state='down';actor.contact=0;
  actor.knockdown=new Knockdown({...worldPosition(actor),reaction:config.reaction,health:actor.health,maximumHealth:actor.maximumHealth,recoveryTimer:600,
   facing:0,clock:{flags:0x8004,index:0,remaining:8,pose:config.reaction===8?18:19},world:match.world});
  actor.knockdown.pendingState=false;actor.animation=actor.knockdown.clock;actor.lastPose=actor.animation.pose;
 }
 for(let tick=0;tick<config.count;tick++){
  cursor=0;entropy=config.entropyFrames[tick];match.step({strike:Boolean(config.inputs[tick]&1),heavy:Boolean(config.inputs[tick]&2)});
  assert.equal(cursor,entropy.length,`frame ${tick}, entropy consumption`);
  assert.equal(match.handoff,undefined,`frame ${tick}, native dispatcher handoff`);
  const ref=match.referee,row={actors:match.fighters.map(actor=>{
   const body=actor.nativeBody||actor.runningAttack||actor.knockdown||actor.running;
   const state=body?body.state:actor.pendingIdle?0:({idle:0,walk:1,strike:5,heavy:5,hurt:4})[actor.state],position=worldPosition(actor),projection=match.drawPosition(actor);
   return[state,state===5?body?.action??(actor.standingAction?.button?114:0):state===4?body?.reaction||0:0,actor.animation.pose,actor.contact,
    position.xFixed,position.yFixed,position.zFixed,actor.health,actor.severity,actor.facing>0?0x8000:0,actor.comboCount,actor.comboTimer,
    [projection.x+match.camera.x-461,projection.y-match.camera.y+577]];
  }),referee:[ref.state|(ref.pendingState?0x8000:0),ref.clock.flags,ref.clock.remaining,ref.clock.index,ref.clock.pose,ref.xFixed,ref.yFixed,ref.zFixed],
  brain:match.fighters.map(f=>{const a=f.original;return[a.aiDistanceX||0,a.aiDistanceY||0,a.inputBlockA,a.inputBlockB,a.controlCounter,a.aiEscapeTimer||0,a.aiFlagsB9||0];}),
  message:match.world.message,sounds:match.takeSoundCommands(),count:match.world.countWord,countTiles:match.world.countTiles[0]};
  if(config.rows){
   const labels=['state','action/reaction','pose','contact','x','y','z','health','severity','facing','combo','comboTimer','projection'];
   for(let actor=0;actor<2;actor++)for(let key=0;key<labels.length;key++)assert.deepEqual(row.actors[actor][key],config.rows[tick].actors[actor][key],`frame ${tick}, actor ${actor}, ${labels[key]}`);
   assert.deepEqual(row,config.rows[tick],`frame ${tick}`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),config.sha256);
});
