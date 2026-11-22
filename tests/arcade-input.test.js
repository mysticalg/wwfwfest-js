import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {ArcadeInput} from '../src/arcade-input.js';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/arcade-input-reference.json',import.meta.url)));
for(const [index,fixture]of fixtures.scenarios.entries()){
 test(`original alternate-frame input accumulator ${index}`,()=>{
  const input=new ArcadeInput(fixture.initial),hash=createHash('sha256');
  for(const [tick,active]of fixture.inputs.entries()){
   input.step(active,fixture.startPhase+tick);
   hash.update(JSON.stringify([input.accumulator,input.held,input.pressed,input.directions])+'\n');
  }
  assert.equal(hash.digest('hex'),fixture.sha256);
 });
}
test('directions remain live while original action buttons retain the sampled level',()=>{
 const input=new ArcadeInput();
 assert.deepEqual(input.controls({horizontal:1,strike:true},0),{horizontal:1,strike:false,heavy:false});
 assert.equal(input.controls({horizontal:-1,strike:true},1).strike,true);
 assert.equal(input.controls({horizontal:0,strike:false},2).strike,true);
 assert.equal(input.controls({horizontal:0,strike:false},3).strike,false);
});
