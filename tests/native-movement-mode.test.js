import assert from 'node:assert/strict';
import test from 'node:test';
import {Match} from '../src/game.js';

test('recovered movement AI retains the CPU record through idle initialization',()=>{
 const match=new Match(0,6,{nativeMovementAI:true,grapples:false}),cpu=match.fighters[1],body=cpu.original;
 assert.ok(cpu.nativeBody===body);
 match.step({});assert.ok(cpu.nativeBody===body);assert.equal(body.state,0);assert.equal(body.pendingState,false);
 match.step({});assert.ok(cpu.nativeBody===body);assert.equal(body.state,1);
});

test('CPU running bypasses the human run-input latch and stays in the native dispatcher',()=>{
 const match=new Match(0,6,{nativeMovementAI:true,grapples:false}),cpu=match.fighters[1],body=cpu.original;
 body.change(2);body.direction=192;body.holdFlags=2;body.controlCounter=77;
 match.step({horizontal:1});
 assert.ok(cpu.nativeBody===body);assert.equal(body.inputInitialized,false);
 assert.equal(body.clock.flags,0x8002);assert.equal(body.direction,192);
 match.step({horizontal:1});
 assert.ok(cpu.nativeBody===body);assert.equal(body.controlCounter,0);assert.equal(body.inputInitialized,false);
});
