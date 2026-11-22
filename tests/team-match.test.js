import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';

test('normal tag match owns four stable native participants and original role flags',()=>{
 const match=new Match(0,6,{tagTeams:true,ai:false});match.step({});
 assert.deepEqual(match.nativeActors.participants.map(f=>f.slot),[0,1,4,5]);
 assert.deepEqual(match.fighters.map(f=>f.health),[110,110,96,95]);
 assert.deepEqual(match.fighters.map(f=>f.original.flags33),[3,129,0,128]);
 assert.ok(match.fighters.every(f=>f.nativeBody===f.original));
 assert.equal(match.nativeActors.pool.filter(a=>a.active).length,4);
 assert.equal(match.controlledFighter.slot,0);
 assert.equal(match.fighters[0].original.controlPort,match.fighters[2].original.controlPort);
});

test('tag transfers one controller to the incoming teammate without a repeated held press',()=>{
 const match=new Match(0,6,{tagTeams:true,ai:false}),outgoing=match.fighters[0].original,incoming=outgoing.partner;
 match.step({});Object.assign(outgoing,{xFixed:528*65536,yFixed:390*65536});
 match.step({vertical:-1});match.step({});
 for(let i=0;i<120&&!(incoming.walkMode&0x8000);i++)match.step({});
 assert.equal(incoming.walkMode,0x8002);
 match.step({strike:true});assert.equal(outgoing.action&255,76);
 for(let i=0;i<180;i++){match.step({strike:true});assert.equal(match.handoff,undefined);}
 assert.equal(match.controlledFighter.slot,1);assert.deepEqual(match.teamLeads.map(f=>f.slot),[1,4]);
 assert.equal(incoming.state,0);assert.equal(incoming.action&255,77);
 assert.equal(outgoing.flags56&64,64);assert.equal(outgoing.flags33&3,0);
 match.step({});const before=incoming.xFixed;match.step({horizontal:1});
 assert.equal(incoming.state,1);assert.ok(incoming.xFixed>before);
 assert.equal(outgoing.state,1);assert.equal(outgoing.flags32&1,1);
});

test('arbitrating native participants preserves the initialized previous clock word',()=>{
 const match=new Match(0,6,{tagTeams:true,entropy:kind=>kind==='arbitration'?15:0});match.step({});
 for(const[index,f]of match.fighters.slice(0,2).entries())Object.assign(f.original,{xFixed:(index?680:640)*65536,yFixed:337*65536,facing:index?0:32768});
 match.step({});assert.equal(match.fighters[0].original.state,12);
 assert.equal(match.fighters[0].original.previousState,0x8000);
 assert.equal(match.fighters[1].original.previousState,0x8000);
});

test('camera follows the current leads rather than offscreen apron records',()=>{
 const match=new Match(0,6,{tagTeams:true,ai:false});match.step({});
 const before=match.camera.x;
 match.fighters[2].original.xFixed=100*65536;match.fighters[3].original.xFixed=2000*65536;
 match.step({});assert.equal(match.camera.x,before);
});
