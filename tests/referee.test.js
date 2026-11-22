import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {Referee,drawCountTiles,clearCountTiles,initializeReferee} from '../src/actors/referee.js';
import {GrappleActor} from '../src/actors/grapple.js';
import {projectedPosition} from '../src/actors/projection.js';
const data=JSON.parse(readFileSync(process.env.REFEREE_FIXTURE||new URL('./fixtures/referee-reference.json',import.meta.url)));
if(data.glyphCases)test('original count tile writes and clears in both character-layer regions',()=>{
 for(const fixture of data.glyphCases){
  const world={countTiles:fixture.initial.map(row=>[...row])};drawCountTiles(world,fixture.number);
  assert.deepEqual(world.countTiles,fixture.result,`glyph ${fixture.number}`);clearCountTiles(world);assert.deepEqual(world.countTiles,fixture.cleared);
 }
});
const pointers=['auxiliary','partner','assistanceTarget'];
function actorSnapshot(actor,actors,keys){return Object.fromEntries(keys.map(key=>[key,
 pointers.includes(key)?actors.includes(actor[key])?actors.indexOf(actor[key]):null:
 key==='state'?actor.state|(actor.pendingState?0:0x8000):actor[key]]));}
function refereeSnapshot(ref,actors,keys){return Object.fromEntries(keys.map(key=>[key,
 key==='state'?ref.state|(ref.pendingState?0x8000:0):key==='clock'?{...ref.clock}:
 key==='focus'||key==='auxiliary'||key==='assistanceTarget'?actors.includes(ref[key])?actors.indexOf(ref[key]):null:
 key==='participants'?ref.participants.map(a=>actors.includes(a)?actors.indexOf(a):null):
 key==='collision'?Object.values(ref.collision):key==='projection'?Object.values(projectedPosition(ref.projection)):ref[key]]));}
if(data.initializationCases)test('original referee reset preserves fractions, clocks and links',()=>{
 const actors=Array.from({length:9},()=>({}));
 for(const fixture of data.initializationCases){
  const initial=fixture.initial,world={controlsRefresh:0x24};
  const ref=new Referee({...initial,state:initial.state&255,pendingState:Boolean(initial.state&0x8000),world,
   focus:actors[initial.focus],participants:initial.participants.map(i=>actors[i]),
   auxiliary:initial.auxiliary===null?null:actors[initial.auxiliary],assistanceTarget:actors[initial.assistanceTarget]});
  ref.collision=Object.fromEntries(['kind','flags','x','y','z'].map((key,i)=>[key,initial.collision[i]]));
  initializeReferee(ref);
  // The reset does not call projection; keep its already-cached hardware words.
  const snapshot=Object.fromEntries(Object.keys(initial).map(key=>[key,key==='projection'?initial.projection:
   refereeSnapshot(ref,actors,[key])[key]]));
  assert.deepEqual(snapshot,fixture.result);assert.equal(world.controlsRefresh,fixture.controlsRefresh);
 }
});
for(const fixture of data.sequences)test(`original referee state ${fixture.state}, mode ${fixture.mode}, face ${fixture.facing}, x ${fixture.x}, initialized ${fixture.initialized}, ${fixture.variant}${fixture.breakAt??''}`,()=>{
 const actors=fixture.actors.map(initial=>new GrappleActor(initial));
 const world={...fixture.world,actors,countTiles:fixture.world.countTiles.map(a=>[...a]),textRequests:[...fixture.world.textRequests],
  refereeOverlay:{...fixture.world.refereeOverlay}};
 for(const[index,body]of actors.entries()){
  body.world=world;for(const key of pointers)body[key]=fixture.actors[index][key]===null?null:actors[fixture.actors[index][key]];
 }
 world.activeA=actors[world.activeA];world.activeB=actors[world.activeB];
 const ref=new Referee({...fixture.initial,state:fixture.initial.state&255,pendingState:Boolean(fixture.initial.state&0x8000),world,
  focus:actors[fixture.initial.focus],participants:fixture.initial.participants.map(i=>actors[i]),
  auxiliary:fixture.initial.auxiliary===null?null:actors[fixture.initial.auxiliary],
  assistanceTarget:fixture.initial.assistanceTarget===null?null:actors[fixture.initial.assistanceTarget]});
 ref.collision=Object.fromEntries(['kind','flags','x','y','z'].map((key,i)=>[key,fixture.initial.collision[i]]));
 const hash=createHash('sha256');
 for(let tick=0;tick<fixture.count;tick++){
  for(const event of fixture.events)if(event.tick===tick)actors[event.index].flags35=event.flags35;
  ref.step();
  const overlay=world.refereeOverlay;
  const worldSnapshot=Object.fromEntries(Object.keys(fixture.world).map(key=>[key,key==='activeA'||key==='activeB'?actors.indexOf(world[key]):
   key==='refereeOverlay'?Object.fromEntries(Object.keys(fixture.world.refereeOverlay).map(k=>[k,k==='projection'?
    Array.isArray(overlay.projection)?overlay.projection:overlay.projection?Object.values(projectedPosition(overlay.projection)):fixture.world.refereeOverlay.projection:overlay[k]])):world[key]]));
  const row={referee:refereeSnapshot(ref,actors,Object.keys(fixture.initial)),actors:actors.map(a=>actorSnapshot(a,actors,Object.keys(fixture.actors[0]))),world:worldSnapshot,sounds:ref.sounds};
  if(fixture.rows){
   for(const key of Object.keys(row.referee))assert.deepEqual(row.referee[key],fixture.rows[tick].referee[key],`frame ${tick}, referee ${key}`);
   assert.deepEqual(row.actors,fixture.rows[tick].actors,`frame ${tick}, participants`);
   assert.deepEqual(row.world,fixture.rows[tick].world,`frame ${tick}, globals`);
   assert.deepEqual(row.sounds,fixture.rows[tick].sounds,`frame ${tick}, sounds`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),fixture.sha256);
});
