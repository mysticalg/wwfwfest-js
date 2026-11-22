import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {canStartPin} from '../src/actors/pin.js';
import {Match} from '../src/game.js';
import {Knockdown} from '../src/actors/knockdown.js';
import {worldPosition} from '../src/actors/projection.js';

test('pin eligibility matches 8,192 original prone-row and bounds cases',()=>{
 const data=JSON.parse(readFileSync(new URL('./fixtures/pin-input-reference.json',import.meta.url))),hash=createHash('sha256');
 for(const row of data.cases){
  const actor={state:row.state,flags34:row.flags34,xFixed:row.x*65536,yFixed:row.y*65536},
   peer={state:row.peerState,reaction:row.reaction,auxiliary:row.peerLinked?actor:null,facing:row.peerFacing,xFixed:row.peerX*65536,yFixed:row.peerY*65536};
  hash.update(JSON.stringify(canStartPin(actor,peer))+'\n');
 }
 assert.equal(hash.digest('hex'),data.sha256);
});
function down(match,actor,reaction=8,health=0){
 actor.health=health;actor.state='down';
 actor.knockdown=new Knockdown({...worldPosition(actor),reaction,health,maximumHealth:actor.maximumHealth,severity:health<=24?2:0,
  facing:actor.facing>0?0x8000:0,clock:{flags:0x8004,index:0,remaining:8,pose:(reaction===8?18:19)|(actor.facing>0?0x8000:0)},
  recoveryTimer:600,world:match.world});
 actor.knockdown.pendingState=false;actor.animation=actor.knockdown.clock;
}
for(let type=0;type<12;type++)for(const reaction of [8,9])test(`playable type ${type} pins original prone ${reaction} with referee timing`,()=>{
 const match=new Match(type,6,{ai:false}),[a,b]=match.fighters;b.x=a.x+30;b.y=a.y;b.facing=-1;down(match,b,reaction);
 const counts=[],sounds=[];let countStart=null;
 for(let tick=0;tick<900&&match.winner===null;tick++){
  match.step(tick===0?{pin:true}:{});sounds.push(...match.takeSoundCommands());
  if(match.referee.state===6&&countStart===null)countStart=tick;
  if(match.count&&counts.at(-1)?.count!==match.count)counts.push({count:match.count,offset:tick-countStart});
 }
 assert.equal(match.winner,0);assert.deepEqual(counts,[{count:1,offset:52},{count:2,offset:140},{count:3,offset:228}]);
 assert.deepEqual(sounds.filter(c=>[98,99,100].includes(c)),[98,99,100]);
 assert.equal(match.world.actors.length,9);assert.equal(match.world.actors[0],a.original);assert.equal(match.world.actors[2],b.original);
});
test('the playable human escapes an AI cover through original mash and action 75',()=>{
 const match=new Match(0,6),[a,b]=match.fighters;b.x=a.x+30;b.y=a.y;down(match,a,8,78);
 const actions=new Set();let pinned=false;
 for(let tick=0;tick<400;tick++){
  match.step({strike:tick%4===0});match.takeSoundCommands();
  actions.add(a.original.action&255);pinned||=a.state==='pinned';
  if(pinned&&!a.nativeBody&&!b.nativeBody)break;
 }
 assert(pinned);assert(actions.has(75));assert.equal(match.winner,null);
 assert.equal(a.nativeBody,null);assert.equal(b.nativeBody,null);assert.equal(match.count,0);
 match.ai=false;
 for(let tick=0;tick<600;tick++){match.step({});match.takeSoundCommands();}
 assert.notEqual(match.referee.state,7);
 assert.equal(a.original.flags34&2,0);assert.equal(b.original.flags34&2,0);
});
