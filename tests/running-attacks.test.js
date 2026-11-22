import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {RunningAttack, runningMove, runningHitResponse} from '../src/actors/running-attack.js';
import {Running} from '../src/actors/running.js';
import {Match} from '../src/game.js';
import {actorTables} from '../src/data/actor-tables.js';
import {worldPosition, updateScreenPosition} from '../src/actors/projection.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/running-attacks-reference.json', import.meta.url)));
test('running move selection matches all 216 original type, health, toggle and button cases', () => {
  for (const fixture of fixtures.selections) {
    const choice = runningMove(fixture.type, fixture.severity, fixture.toggle, fixture.buttons);
    assert.equal(choice.action, fixture.action);
    assert.equal(choice.toggle, fixture.nextToggle);
    assert.equal(fixture.state, 5);
  }
});
test('running attack and body-bump responses match original damage, facing, reactions, timers and sound commands', () => {
  for (const fixture of fixtures.responses) {
    const response = runningHitResponse(fixture.contact, fixture.attacker, fixture.target);
    response.facing ??= fixture.target.facing;
    assert.deepEqual(response, fixture.response, JSON.stringify(fixture));
  }
});
function attackSnapshot(body) {
  const ropes = {left:0, right:0};
  for (const event of body.ropeEvents) ropes[event.side] = event.strength;
  return [body.state,body.action,body.reaction,body.clock.flags,body.clock.remaining,body.clock.index,body.clock.pose,
    body.xFixed,body.yFixed,body.zFixed,body.movementMode,body.speed,body.direction,body.facing,
    body.velocityX,body.velocityY,body.velocityZ,body.gravity,body.flags32,body.flags33,body.flags34,
    body.paddingX,body.contact,body.offsetX,body.offsetY,body.collision.kind,body.collision.flags,
    body.selfDamage,body.sounds,ropes.left,ropes.right];
}
for (const fixture of fixtures.scenarios) {
  test(`original running action ${fixture.initial.action}, type ${fixture.initial.type}, facing ${fixture.initial.facing}, origin ${fixture.initial.xFixed}`, () => {
    const body = new RunningAttack(fixture.initial), hash = createHash('sha256');
    for (let tick = 0; tick < fixture.count; tick++) {
      body.step();
      hash.update(JSON.stringify(attackSnapshot(body)) + '\n');
    }
    assert.deepEqual(attackSnapshot(body), fixture.final);
    assert.equal(hash.digest('hex'), fixture.sha256);
  });
}
function seededRun(actor, type, facing) {
  const body = new Running({...worldPosition(actor),type,facing,pose:facing ^ 9,
    clock:{flags:0xc002,remaining:2,index:0},movementMode:1,speed:actorTables.runSpeeds[type],
    direction:facing ? 64 : 192,flags33:18,contact:3});
  body.pendingState = false;
  body.inputInitialized = true;
  body.clock.flags = 0xc002;
  Object.assign(actor,{state:'run',running:body,animation:body.clock,contact:3,
    lastPose:body.clock.pose,movementMode:1});
}
function referenceMatch(initial) {
  const match = new Match(initial.attackerIndex === 0 ? initial.type : 6,
    initial.attackerIndex === 1 ? initial.type : 6);
  match.ai = initial.attackerIndex === 1;
  const actor = match.fighters[initial.attackerIndex], target = match.fighters[1-initial.attackerIndex];
  for (const fighter of match.fighters) {
    updateScreenPosition(fighter,{xFixed:640*65536+0x1234,yFixed:336*65536+0x5678,zFixed:320*65536});
    fighter.animation.flags = 0x8000;
    fighter.contact = 1;
  }
  updateScreenPosition(target,{...worldPosition(target),
    xFixed:(640+(initial.facing ? initial.distance : -initial.distance))*65536+0x1234});
  actor.facing = initial.facing ? 1 : -1;
  target.facing = -actor.facing;
  target.animation.pose = target.lastPose = initial.facing ^ 0x8000;
  target.health = [100,45,20][initial.severity];
  target.severity = initial.severity;
  seededRun(actor,initial.type,initial.facing);
  actor.runningMoveToggle = initial.toggle;
  if (initial.targetRunning) seededRun(target,6,initial.facing ^ 0x8000);
  return match;
}
function matchSnapshot(match) {
  return {actors:match.fighters.map(actor => {
    const body = actor.runningAttack || actor.knockdown || actor.running;
    const state = body ? body.state : ({idle:0,walk:1,strike:5,heavy:5,hurt:4})[actor.state];
    const world = worldPosition(actor);
    return [state,state === 5 ? body.action : state === 4 ? body.reaction : 0,
      actor.animation.pose,actor.contact,world.xFixed,world.yFixed,world.zFixed,
      actor.health,actor.severity,actor.facing > 0 ? 0x8000 : 0,actor.movementMode,
      actor.spriteOffsetX || 0,actor.spriteOffsetY || 0,
      match.drawPosition(actor).x + match.camera.x,232 + match.camera.y - match.drawPosition(actor).y];
  }),sounds:match.takeSoundCommands()};
}
test('holding the dedicated Run shortcut keeps punch/kick edges available', () => {
  const held = new Match(0,6), tapped = new Match(0,6);
  held.ai = tapped.ai = false;
  for (const match of [held,tapped]) {
    match.fighters[0].x = 120;
    match.fighters[1].x = 200;
  }
  for (let tick = 0; tick < 100; tick++) {
    const input = {horizontal:tick === 0 ? 1 : 0,strike:tick === 4};
    held.step({...input,run:tick < 30});
    tapped.step({...input,run:tick === 0});
    assert.deepEqual(matchSnapshot(held),matchSnapshot(tapped));
    if (tick === 4) assert.equal(held.fighters[0].runningAttack.action,45);
  }
  assert.equal(held.fighters[1].health,93);
});
for (const fixture of fixtures.matches) {
  const initial = fixture.initial;
  test(`original running match: type ${initial.type}, action ${initial.action}, health band ${initial.severity}, facing ${initial.facing}, actor ${initial.attackerIndex}, distance ${initial.distance}, moving target ${initial.targetRunning}`, () => {
    const match = referenceMatch(initial), hash = createHash('sha256');
    for (let tick = 0; tick < fixture.count; tick++) {
      const input = tick === 4 ? {strike:Boolean(initial.buttons & 1),heavy:Boolean(initial.buttons & 2)} : {};
      match.computerInput = () => input;
      match.step(initial.attackerIndex === 0 ? input : {});
      const row = matchSnapshot(match);
      if (fixture.rows) assert.deepEqual(row, fixture.rows[tick], `tick ${tick}`);
      hash.update(JSON.stringify(row) + '\n');
    }
    assert.equal(hash.digest('hex'), fixture.sha256);
  });
}
