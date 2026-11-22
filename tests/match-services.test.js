import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {initializeHealth,decodeDipSwitches,defaultMatchSettings,advanceDamageService} from '../src/actors/match-services.js';
import {Match} from '../src/game.js';
import {roster} from '../src/renderer.js';
import {actorTables} from '../src/data/actor-tables.js';
const data=JSON.parse(readFileSync(process.env.MATCH_SERVICE_FIXTURE||new URL('./fixtures/match-services-reference.json',import.meta.url)));
test('original health initialization, human retention, AI rounds and DIP offsets',()=>{
 for(const fixture of data.health){
  const body={...fixture.initial,slot:fixture.slot};initializeHealth(body,fixture.world);
  assert.deepEqual(Object.fromEntries(Object.keys(fixture.initial).map(key=>[key,body[key]])),fixture.result,JSON.stringify(fixture));
 }
});
test('all 65,536 physical DIP combinations match the original input wiring',()=>{
 const hash=createHash('sha256');
 for(let a=0;a<256;a++)for(let b=0;b<256;b++)hash.update(JSON.stringify([a,b,decodeDipSwitches(a,b)])+'\n');
 assert.equal(hash.digest('hex'),data.dips.sha256);assert.equal(defaultMatchSettings.dipSwitches,0x0010);
});
test('playable match initializes every original character and uses AI slot-four health',()=>{
 for(let type=0;type<12;type++){
  const expected=data.health.find(f=>!f.initial.flags56&&(f.initial.flags57&15)===type&&f.initial.flags104===128&&f.world.round===0&&f.world.mode===0).result;
  const match=new Match(type,6,{ai:false});
  for(const key of ['health','maximumHealth','severity','flags104'])assert.equal(match.fighters[0][key],expected[key],`type ${type}, ${key}`);
  assert.equal(match.fighters[1].health,100);
 }
 for(const mode of [0,1])for(let round=0;round<10;round++)for(let difficulty=0;difficulty<4;difficulty++){
  const fixture=data.health.find(f=>f.initial.flags56===128&&f.slot===4&&f.world.mode===mode&&f.world.round===round&&f.world.dipSwitches===(difficulty<<8));
  const match=new Match(0,6,{ai:true,mode,round,dipSwitches:difficulty<<8});
  assert.equal(match.fighters[1].maximumHealth,fixture.result.maximumHealth);
 }
 assert.deepEqual(actorTables.selectableTypes,[0,1,2,3,6,7,8,9,10,11]);
 assert.equal(roster[2],'Jake Roberts');assert.equal(roster[7],'Mr. Perfect');assert.equal(roster[9],'Ted DiBiase');
 assert.equal(roster[10],'Demolition Smash');assert.equal(roster[11],'Demolition Crush');
});
test('match damage phase preserves forced requests and advances original status counters',()=>{
 const match=new Match(0,6,{ai:false}),actor=match.fighters[0];
 Object.assign(actor,{pendingDamage:200,forced:1,comboTimer:1,comboCount:3,flags32:8,idleTimer:1});
 const health=actor.health;match.step({});
 assert.equal(actor.health,health);assert.equal(actor.pendingDamage,200);assert.equal(actor.comboTimer,0);
 assert.equal(actor.comboCount,3);assert.equal(actor.flags32&8,0);assert.equal(actor.idleTimer,0);
 actor.forced=0;match.step({});assert.equal(actor.health,health); // Opposite frame phase.
 match.step({});assert.equal(actor.health,0);assert.equal(actor.pendingDamage,0);assert.equal(actor.healthAccumulator,65336);assert.equal(actor.comboCount,0);
});
for(const[index,fixture]of data.damage.entries())test(`original active-pool damage service ${index}`,()=>{
 const actors=fixture.initial.map(actor=>({...actor})),hash=createHash('sha256');
 for(let tick=0;tick<fixture.count;tick++){
  advanceDamageService(actors);if(fixture.rows)assert.deepEqual(actors,fixture.rows[tick],`frame ${tick}`);
  hash.update(JSON.stringify(actors)+'\n');
 }
 assert.equal(hash.digest('hex'),fixture.sha256);
});
