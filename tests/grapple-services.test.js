import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {initializeMash,mashHeldInput,beginAttackAssistance,beginVictimAssistance,
 clearPartnerMotion,finishAssistance,clearAssistanceLinks,submissionComplete,pursuitDirection} from '../src/actors/grapple-services.js';
const data=JSON.parse(readFileSync(process.env.SERVICE_FIXTURE||new URL('./fixtures/grapple-services-reference.json',import.meta.url)));
const helpers={attack:beginAttackAssistance,victim:beginVictimAssistance,motion:clearPartnerMotion,
 finish:finishAssistance,clear:clearAssistanceLinks,complete:submissionComplete,mash:initializeMash,button:mashHeldInput};
const pointerKeys=['partner','auxiliary','opponent','assistanceTarget'];
for(const [index,fixture]of data.fixtures.entries())test(`original grapple ${fixture.service} service ${index}`,()=>{
 const bodies=fixture.initial.map(body=>({...body})),world={...fixture.world,textRequests:[...fixture.world.textRequests],actors:bodies};
 world.assistCandidate=world.assistCandidate===null?null:bodies[world.assistCandidate];
 for(const body of bodies){
  for(const key of pointerKeys)body[key]=body[key]===null?null:bodies[body[key]];
  body.world=world;body.sounds=[];
 }
 const result=helpers[fixture.service](bodies[0],fixture.service==='button'?fixture.pressed:fixture.kind);
 const snapshot={actors:bodies.map(body=>Object.fromEntries(Object.keys(fixture.initial[0]).map(key=>[key,
  pointerKeys.includes(key)?body[key]===null?null:bodies.indexOf(body[key]):body[key]]))),
  world:Object.fromEntries(Object.keys(fixture.world).map(key=>[key,key==='assistCandidate'?
   world[key]===null?null:bodies.indexOf(world[key]):world[key]])),sounds:bodies[0].sounds,
  ...(fixture.service==='complete'?{result}:{})};
 if(fixture.result)assert.deepEqual(snapshot,fixture.result);
 assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),fixture.sha256);
});
test('original direction service across word boundaries and saturation',()=>{
 for(const row of data.directions)assert.equal(pursuitDirection(row.x,row.y,row.targetX,row.targetY),row.direction,JSON.stringify(row));
});
