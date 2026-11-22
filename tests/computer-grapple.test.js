import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {stepComputerGrapple} from '../src/actors/computer-grapple.js';
const fixture=JSON.parse(readFileSync(process.env.COMPUTER_FIXTURE||new URL('./fixtures/computer-grapple-reference.json',import.meta.url)));
for(const[index,row]of fixture.cases.entries())test(`original grapple AI decision ${index}: ${JSON.stringify(row.config)}`,()=>{
 const world={...row.world,inGame:Boolean(row.world.gameFlags)},actors=row.initial.map(initial=>new LinkedActor({...initial,world,attempts:{...initial.attempts}}));
 let cursor=0;
 for(const[index,actor]of actors.entries()){
  for(const key of ['auxiliary','opponent','partner'])actor[key]=actors[row.initial[index][`${key}Index`]]||null;
  actor.entropy=()=>{assert(cursor<row.entropy.length,'unexpected AI random request');return row.entropy[cursor++];};
 }
 stepComputerGrapple(actors[0]);
 assert.equal(cursor,row.entropy.length,'AI random consumption');
 for(const[index,actor]of actors.entries())for(const[key,value]of Object.entries(row.expected[index])){
  const actual=key==='state'?actor.state|(actor.pendingState?0:0x8000):key.endsWith('Index')?actors.indexOf(actor[key.slice(0,-5)]):actor[key];
  assert.deepEqual(actual,value,`actor ${index}, ${key}`);
 }
});
