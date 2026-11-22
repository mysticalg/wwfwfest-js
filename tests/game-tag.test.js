import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';
test('two-wrestler adapter reports the four-participant tag dependency',()=>{
 const match=new Match(0,6,{ai:true,grapples:false});
 const actor=match.fighters[1],peer=match.fighters[0];
 actor.original.auxiliary=peer.original;peer.original.auxiliary=actor.original;
 actor.original.change(5,102);match.nativeActors.attach([actor,peer]);
 const position=[actor.original.xFixed,actor.original.yFixed];
 match.nativeActors.advance(actor);
 assert.equal(match.handoff.reason,'tag-team-pool');
 assert.equal(match.handoff.action,102);
 assert.deepEqual([actor.original.xFixed,actor.original.yFixed],position);
 assert.equal(actor.original.partner.active,false);
});
