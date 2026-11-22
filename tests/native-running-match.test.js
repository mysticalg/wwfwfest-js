import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';
import {actorTables} from '../src/data/actor-tables.js';

// Exercise the development shared-record contact path through the browser match
// adapter. Original-program field/clock comparisons live in native-running.test.
for(const action of [1,4,5,32,42,45,64,65])test(`shared running action ${action} hits and recovers in a match`,()=>{
 const match=new Match(0,6,{ai:false,nativeMovementAI:true,grapples:false}),[player,target]=match.fighters;
 match.nativeActors.attach(match.fighters);
 for(const[index,fighter]of match.fighters.entries()){
  const body=fighter.original;
  Object.assign(body,{xFixed:(index?640:560)*65536,yFixed:337*65536,zFixed:320*65536,
   facing:index?0:32768,contact:1,state:0,pendingState:false});
  body.clock.flags=0x8000;body.clock.pose=body.facing;
 }
 const actor=player.original;actor.change(5,action);
 Object.assign(actor.clock,{flags:0xc002,index:0,remaining:2});
 Object.assign(actor,{movementMode:1,speed:actorTables.runSpeeds[0],direction:64});
 for(const fighter of match.fighters)match.nativeActors.syncVisible(fighter);
 let captured=false;const reactions=new Set(),sounds=new Set();
 for(let tick=0;tick<400;tick++){
  match.step({});assert.equal(match.handoff,undefined);
  reactions.add(target.original.reaction&255);captured||=Boolean(actor.action&0x8000);
  for(const command of match.soundCommands)sounds.add(command);match.soundCommands=[];
 }
 assert.ok(target.health<target.maximumHealth);assert.equal(player.health,player.maximumHealth);
 assert.ok(sounds.has(43)&&sounds.has(50)&&sounds.has(41));
 assert.equal(player.state,'idle');assert.equal(target.state,'idle');
 if([4,5,65].includes(action)){
  assert.ok(captured);assert.ok(reactions.has(action===4?18:action===5?16:29));
 }
 assert.equal(player.nativeBody,null);assert.equal(target.nativeBody,null);
});
