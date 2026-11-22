import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';
import {StandingAction} from '../src/actors/standing-action.js';
for(const nativeSide of ['attacker','victim'])test(`standing contact crosses the ${nativeSide} shared-record adapter`,()=>{
 const match=new Match(0,6,{ai:false,grapples:false}),[actor,target]=match.fighters;
 actor.x=target.x=150;actor.y=target.y=165;
 actor.health=target.health=actor.maximumHealth=target.maximumHealth=100;
 match.setState(actor,'strike');actor.standingAction=new StandingAction(0,0x8001);
 Object.assign(actor.standingAction.clock,{flags:0x8005,index:3,remaining:4,pose:0x8001});actor.animation=actor.standingAction.clock;actor.contact=7;
 target.animation.flags=0x8000;target.animation.pose=0;target.contact=1;
 match.nativeActors.sync();
 const native=nativeSide==='attacker'?actor:target;
 if(native===target){target.original.change(4);target.original.reaction=1;target.original.pendingState=false;target.original.clock.flags=0x8004;}
 match.nativeActors.attach([native]);
 const originalClock={...actor.original.clock};
 match.nativeActors.contacts();
 assert.ok(actor.nativeBody===actor.original,'attacker keeps its shared record');assert.ok(target.nativeBody===target.original,'victim keeps its shared record');
 assert.equal(target.original.state,4);assert.equal(target.original.reaction,0);assert.equal(target.original.pendingState,true);
 assert.equal(actor.original.contact,0);assert.equal(target.original.contact,0);
 assert.equal(target.original.pendingDamage,1);assert.equal(actor.original.lastHit,target.original);
 assert.equal(target.original.lastHit,actor.original);assert.equal(actor.original.hitMask,0x2000);
 assert.deepEqual({...actor.original.clock},originalClock);assert.deepEqual(match.soundCommands,[42,50]);
 match.nativeActors.damage();assert.equal(target.health,99);
 target.original.step();assert.equal(target.original.comboCount,1);assert.equal(target.original.comboTimer,64);
 assert.equal(target.original.previousState,native===target?0x8004:0x8000);
});
