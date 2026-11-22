import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stepAnnouncer} from '../src/announcer.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/announcer-reference.json',import.meta.url)));
test('original announcer phrases, name eligibility and interrupted requests',()=>{
 for(const {config,count,sha256}of fixture.sequences){
  const world={inGame:true,message:config.message,actors:[{active:true,flags57:config.type,flags33:Number(config.lead)}]},hash=createHash('sha256');
  for(let tick=0;tick<count;tick++){
   if(config.interrupt&&tick===4)world.message=0x0f0b;
   const sounds=stepAnnouncer(world),row=Object.fromEntries(['message','messagePending','messageIndex','messageTimer'].map(key=>[key,world[key]||0]));
   row.sounds=sounds;hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(hash.digest('hex'),sha256,JSON.stringify(config));
 }
});
