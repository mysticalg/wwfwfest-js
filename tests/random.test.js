import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ArcadeRandom} from '../src/actors/random.js';
test('original random generator matches 8,192 complete register/frame/seed cases',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/random-reference.json',import.meta.url))),hash=createHash('sha256');
 for(const row of fixture.cases){const generator=new ArcadeRandom(row.seed,row.registers);
  hash.update(JSON.stringify(generator.next(row.frame))+'\n');assert.deepEqual(generator.registers.map(v=>v>>>0),row.registers);}
 assert.equal(hash.digest('hex'),fixture.sha256);
});
