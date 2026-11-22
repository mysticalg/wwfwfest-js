import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {participantFacing} from '../src/actors/facing.js';
test('participant facing matches 8,192 original state, pose-anchor and wrapped-coordinate cases',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/facing-reference.json',import.meta.url))),hash=createHash('sha256');
 for(const[x,facing,peerX,peerFacing,state,reaction,action]of fixture.cases){
  hash.update(JSON.stringify(participantFacing({xFixed:x*65536,facing},{xFixed:peerX*65536,facing:peerFacing,state,reaction,action}))+'\n');
 }
 assert.equal(hash.digest('hex'),fixture.sha256);
});
