import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';

const create=options=>new Match(0,6,{ai:false,nativeHumanInput:true,grapples:false,...options});
const step=(match,input={})=>{match.step(input);assert.equal(match.handoff,undefined);};

test('native human movement, punch and kick retain the shared participant',()=>{
 const match=create(),player=match.fighters[0],body=player.original;
 step(match);const start=body.xFixed;
 step(match,{horizontal:1});assert.equal(body.state,1);assert.ok(body.xFixed>start);
 step(match,{strike:true});assert.equal(body.state,5);assert.equal(body.action&255,0);
 for(let i=0;i<100;i++)step(match);
 assert.equal(body.state,0);assert.equal(player.nativeBody,body);
 step(match,{heavy:true});assert.equal(body.state,5);assert.equal(body.action&255,114);
});

test('native human running selection reaches the original running row',()=>{
 const match=create(),[player,target]=match.fighters,body=player.original;
 step(match);step(match,{horizontal:1,run:true});assert.equal(body.state,2);
 assert.equal(body.direction,64);assert.equal(body.inputInitialized,true);
 Object.assign(body,{xFixed:560*65536,yFixed:337*65536,facing:32768});
 Object.assign(target.original,{xFixed:640*65536,yFixed:337*65536,facing:0});
 step(match,{horizontal:1});step(match,{horizontal:1,strike:true});
 assert.equal(body.state,5);assert.equal(body.action&255,45);
 assert.equal(player.nativeBody,body);
});

test('native human input continues from an arbitrated clinch to a headlock throw',()=>{
 const match=create({ai:true,grapples:true,entropy:kind=>kind==='arbitration'?15:0}),[player,target]=match.fighters;
 for(const[index,fighter]of match.fighters.entries()){
  const body=fighter.original;Object.assign(body,{xFixed:(index?680:640)*65536,yFixed:337*65536,
   facing:index?0:32768,state:0,pendingState:false,contact:1});
  body.clock.flags=32768;body.clock.pose=body.facing;
 }
 const body=player.original;step(match);assert.equal(body.state,12);
 for(let i=0;i<150&&!(body.state===12&&(body.holdFlags&255)===1);i++)step(match);
 step(match,{strike:true});assert.equal(body.action&255,21);
 step(match);step(match,{heavy:true});assert.equal(body.action&255,24);
 for(let i=0;i<100&&target.health===target.maximumHealth;i++)step(match);
 assert.ok(target.health<target.maximumHealth);assert.equal(player.nativeBody,body);
});

test('native human prone selection enters the original cover and referee finish',()=>{
 const match=create({tagTeams:true}),[player,target]=match.fighters;step(match);
 Object.assign(player.original,{xFixed:610*65536,yFixed:337*65536,facing:32768});
 Object.assign(target.original,{xFixed:640*65536,yFixed:337*65536,facing:0,health:0,recoveryTimer:600});
 target.health=0;target.original.change(4);target.original.reaction=8;
 step(match);step(match,{pin:true});
 assert.equal(player.original.action&255,72);assert.equal(target.original.action&255,74);
 const sounds=[];
 for(let i=0;i<700&&match.winner===null;i++){step(match);sounds.push(...match.takeSoundCommands());}
 assert.equal(match.winner,0);assert.deepEqual(sounds.filter(c=>[98,99,100].includes(c)),[98,99,100]);
});
