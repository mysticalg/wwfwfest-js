import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {LinkedActor} from '../src/actors/linked-actor.js';
import {applyNativeContact,advanceNativeContacts} from '../src/actors/native-contact.js';
import {actorTables} from '../src/data/actor-tables.js';
const files=process.env.CONTACT_FIXTURE?[process.env.CONTACT_FIXTURE]:['native-contact-reference.json','native-contact-phase-reference.json'].map(name=>new URL(`./fixtures/${name}`,import.meta.url));
for(const file of files){
const fixture=JSON.parse(readFileSync(file));
test(`original native contact ${fixture.phase?'phase':'responses'} preserves the whole held graph`,()=>{
 const hash=createHash('sha256');
 for(const[index,config]of fixture.cases.entries()){
  const initial=config.initial.map(values=>Object.fromEntries(fixture.fields.map((key,index)=>[key,values[index]])));
  const world={...config.world,contactSounds:[]},bodies=initial.map(values=>new LinkedActor({...values,world})),heldObject={state:9};
  world.actors=Array.from({length:9},(_,slot)=>bodies[[0,1,4,5].indexOf(slot)]||{active:false});
  for(const[bi,body]of bodies.entries()){
   for(const key of ['auxiliary','partner','opponent','assistanceTarget','lastHit'])body[key]=bodies[initial[bi][`${key}Index`]]||null;
   body.heldObject=heldObject;
  }
  let accepted=null;
  if(fixture.phase)advanceNativeContacts(world);
  else accepted=applyNativeContact(bodies[1],bodies[2],actorTables.contacts[config.attackContact],actorTables.contacts[config.targetContact],world,5);
  const actors=bodies.map((body,bi)=>Object.fromEntries(Object.keys(initial[bi]).map(key=>{
   let value=body[key];
   if(key==='state')value=body.state|(body.pendingState?0:0x8000);
   else if(key==='clock')value={...body.clock};
   else if(key.endsWith('Index'))value=key==='heldObjectIndex'?(body.heldObject?0:-1):bodies.indexOf(body[key.slice(0,-5)]);
   return[key,value];
  })));
  const result={actors,accepted,sounds:world.contactSounds,world:Object.fromEntries(Object.keys(config.world).map(key=>[key,world[key]])),heldObjectState:heldObject.state};
  if(config.result){
   for(let bi=0;bi<4;bi++)for(const key of Object.keys(actors[bi]))assert.deepEqual(actors[bi][key],config.result.actors[bi][key],`case ${index}, actor ${bi}, ${key}`);
   assert.deepEqual(result,config.result,`case ${index}`);
  }
  hash.update(JSON.stringify(result)+'\n');
 }
 assert.equal(hash.digest('hex'),fixture.sha256);
});
}
