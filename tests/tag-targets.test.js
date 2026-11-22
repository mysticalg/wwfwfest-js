import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {updateTagTargets} from '../src/actors/tag-targets.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/tag-target-reference.json',import.meta.url)));
test('original tag opponent service preserves role and link eligibility',()=>{
 const hash=createHash('sha256');
 for(const[index,row]of fixture.cases.entries()){
  const actors=row.initial.map(initial=>Object.fromEntries(fixture.fields.map((key,index)=>[key,initial[index]])));
  for(const actor of actors)for(const key of ['partner','opponent','secondaryOpponent'])actor[key]=actors[actor[`${key}Index`]];
  updateTagTargets({mode:0,actors});
  const result=actors.map(actor=>[actors.indexOf(actor.opponent),actors.indexOf(actor.secondaryOpponent)]);
  assert.deepEqual(result,row.result,`scenario ${index}`);hash.update(JSON.stringify(result)+'\n');
 }
 assert.equal(hash.digest('hex'),fixture.sha256);
});
