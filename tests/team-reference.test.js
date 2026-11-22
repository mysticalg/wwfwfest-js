import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Match} from '../src/game.js';
import {projectedPosition} from '../src/actors/projection.js';

const files=process.env.TEAM_FIXTURE?[process.env.TEAM_FIXTURE]:['team-match-reference.json','getup-match-reference.json','standing-hold-match-reference.json','taunt-match-reference.json','catch39-match-reference.json','prone34-apron57-reference.json','launch46-match-reference.json','rescue-match-reference.json','side-hold-match-reference.json','result-match-reference.json','prone-air-match-reference.json','boost-match-reference.json','long-match-reference.json'].map(name=>new URL(`./fixtures/${name}`,import.meta.url));
const fixture={sequences:files.flatMap(file=>JSON.parse(readFileSync(file)).sequences)};
const pointerKeys=['auxiliaryIndex','opponentIndex','partnerIndex','lastHitIndex','secondaryPinnerIndex','secondaryOpponentIndex','assistanceTargetIndex'];
for(const sequence of fixture.sequences)test(`composed native tag match ${JSON.stringify(sequence.config)}`,()=>{
 const match=new Match(sequence.config.type,6,{tagTeams:true}),world=match.world;
 const bodies=match.nativeActors.participants.map(f=>f.original);
 // The older synthetic fixtures clear these two globals; result fixtures
 // explicitly seed the normal round setup's $00ee08 targets instead.
 Object.assign(world,{cameraTargetX:0,cameraTargetY:0},sequence.world,{paletteUpdates:{},activeA:bodies[sequence.world.activeA],activeB:bodies[sequence.world.activeB]});
 for(const [i,body]of bodies.entries()){
  for(const [key,value]of Object.entries(sequence.initial[i])){
   if(key==='state'){body.state=value&255;body.pendingState=!(value&0x8000);body.inputInitialized=Boolean(value&0x4000);}
   else if(key==='clock')Object.assign(body.clock,value);
   else if(pointerKeys.includes(key))body[key.slice(0,-5)]=bodies[value]||null;
   else if(key==='attempts')body.attempts={...value};
   else if(key!=='projection')body[key]=value;
  }
 }
 if(sequence.refereeInitial)for(const [key,value]of Object.entries(sequence.refereeInitial)){if(key==='clock')Object.assign(match.referee.clock,value);else match.referee[key]=value;}
 let entropy=[],cursor=0;
 world.entropy=kind=>{const item=entropy[cursor++];assert.equal(kind,item?.kind,`tick ${match.ticks-1}: entropy kind`);return item.value;};
 const hash=createHash('sha256');let acceptedApronHit=false,acceptedLaunch=false,acceptedRescue=false,acceptedSide=false,acceptedAir=false;
 for(let tick=0;tick<sequence.count;tick++){
  entropy=sequence.entropyFrames[tick];cursor=0;match.step(sequence.inputs[tick]);
  assert.equal(cursor,entropy.length,`tick ${tick}: entropy consumption`);
  const actors=bodies.map((body,i)=>Object.fromEntries(Object.keys(sequence.initial[i]).map(key=>{
   let value=body[key]??0;
   if(key==='state')value=body.state|(body.pendingState?0:0x8000)|(body.state===2&&body.inputInitialized?0x4000:0);
   else if(pointerKeys.includes(key))value=bodies.indexOf(body[key.slice(0,-5)]);
   else if(key==='clock')value={...body.clock};
   else if(key==='attempts')value=Object.fromEntries(Object.keys(sequence.initial[i].attempts).map(offset=>[offset,body.attempts[offset]||0]));
   else if(key==='projection')value=body.projection?Object.values(projectedPosition(body.projection,match.camera)):[0,232];
   return [key,value];
  })));
  if(sequence.acceptedApronHit){
   const cpu=sequence.config.profile.includes('cpu'),target=cpu?0:2,attacker=cpu?3:1;
   if(actors[target].health<sequence.initial[target].health&&actors[target].lastHitIndex===attacker)acceptedApronHit=true;
  }
  if(sequence.acceptedLaunch){
   const cpu=sequence.config.profile==='launch46-cpu',attacker=cpu?2:0,target=cpu?0:2;
   if((actors[attacker].action&0x8000)&&actors[attacker].auxiliaryIndex===target)acceptedLaunch=true;
  }
  if(sequence.acceptedRescue){const [q,a,p]=actors,profile=sequence.config.profile;if(profile.startsWith('rescue-prone')&&p.attempts[0xe4]===((sequence.initial[2].attempts[0xe4]+1)&65535))acceptedRescue=true;else if(profile.startsWith('rescue-pin')&&(q.state&255)===7&&(p.state&255)===4&&p.reaction===15)acceptedRescue=true;else if(profile==='rescue-hold97'&&(p.state&255)===5&&(p.action&255)===119)acceptedRescue=true;}
  if(sequence.acceptedSide){const profile=sequence.config.profile,ai=['side28-cpu','side82-escape','side88-apron'].includes(profile),a=actors[ai?2:0],p=actors[ai?0:2];if(['side28','side28-cpu','side28-standing'].includes(profile)&&(a.action&0x8000)&&(p.state&255)===5&&(p.action&255)===82)acceptedSide=true;else if(profile==='side82-escape'&&(p.state&255)===5&&(p.action&255)===88)acceptedSide=true;}
  if(sequence.acceptedAir){const cpu=sequence.config.profile==='air-cpu',a=actors[cpu?2:0],p=actors[cpu?0:2];if((a.action&255)===sequence.config.action&&(a.action&0x8000)&&p.health<sequence.initial[cpu?0:2].health)acceptedAir=true;}
  const ref=match.referee,row={actors,sounds:match.takeSoundCommands(),effects:world.effectRequests.map(r=>({actor:bodies.indexOf(r.actor),kind:r.kind})),
   world:Object.fromEntries(['message','messagePending','messageIndex','messageTimer','controlsRefresh','cornerOccupancy','switchTimer','activeA','activeB','paletteUpdates'].map(key=>[key,['activeA','activeB'].includes(key)?bodies.indexOf(world[key]):world[key]??0])),
   camera:Object.fromEntries(['x','y','backgroundX','backgroundY'].map(key=>[key,match.camera[key]])),
   referee:[world.matchResult,ref.clock.flags,ref.clock.remaining,ref.clock.index,ref.clock.pose,ref.xFixed,ref.yFixed,ref.zFixed,ref.direction,ref.speed,ref.facing,ref.offsetX,ref.offsetY]};
  if(sequence.rows){
   for(let i=0;i<bodies.length;i++)for(const key of Object.keys(actors[i]))assert.deepEqual(actors[i][key],sequence.rows[tick].actors[i][key],`tick ${tick}, slot ${bodies[i].slot}, ${key}`);
   assert.deepEqual(row,sequence.rows[tick],`tick ${tick}`);
  }
  hash.update(JSON.stringify(row)+'\n');
 }
 assert.equal(hash.digest('hex'),sequence.sha256);
 if(sequence.resultRequest)assert.equal(world.matchResult&0x80ff,0x8009,'declared submission result request');
 if(sequence.acceptedApronHit)assert.equal(acceptedApronHit,true,'original accepted apron hit');
 if(sequence.acceptedLaunch)assert.equal(acceptedLaunch,true,'original accepted counter');
 if(sequence.acceptedRescue)assert.equal(acceptedRescue,true,'original rescue interruption');
 if(sequence.acceptedSide)assert.equal(acceptedSide,true,'original side hold/escape');
 if(Object.hasOwn(sequence,'outcome'))assert.equal(match.winner,sequence.outcome,'original finish-byte outcome');
 if(sequence.acceptedAir)assert.equal(acceptedAir,true,'original accepted prone air hit');
 if(sequence.boundary)assert.deepEqual({tick:match.ticks-1,slot:match.handoff.slot,state:match.handoff.state,action:match.handoff.action,reaction:match.handoff.reaction},sequence.boundary);
 else assert.equal(match.handoff,undefined);
});
