import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {insideRingCollision} from '../src/actors/ring-collision.js';
import {Knockdown} from '../src/actors/knockdown.js';
import {healthSeverity, updateScreenPosition, worldPosition, spritePosition} from '../src/actors/projection.js';
import {Match} from '../src/game.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/knockdowns-reference.json', import.meta.url)));
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

test('inside-ring collision matches 32,768 original world/probe/flag cases', () => {
  let seed = 0x4b4e4f43;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const hash = digest();
  for (let index = 0; index < 32768; index++) {
    const initial = {x: random() % 1100, y: random() % 800, z: random() % 600,
      facing: random() & 0x8000, flags32: [0, 1, 16, 32][index % 4],
      paddingX: (random() % 161) - 80, paddingY: (random() % 65) - 32,
      paddingZ: (random() % 65) - 32, kind: index % 3, flags: index & 31};
    const result = insideRingCollision(initial);
    hash.add([result.kind, result.flags, result.x, result.y, result.z]);
  }
  assert.deepEqual(hash.finish(), fixtures.collision);
});

function snapshot(body) {
  return [body.state, body.reaction, body.action, body.clock.flags, body.clock.remaining,
    body.clock.index, body.clock.pose, body.xFixed, body.yFixed, body.zFixed,
    body.movementMode, body.velocityX, body.velocityY, body.velocityZ, body.gravity,
    body.paddingX, body.collision.kind, body.collision.flags, body.recoveryTimer,
    body.mash, body.facing, body.flags33, body.sounds];
}

for (const fixture of fixtures.scenarios) {
  test(`original knockdown parity ${JSON.stringify(fixture.initial)}`, () => {
    const initial = fixture.initial;
    const body = new Knockdown({...initial, pose: initial.facing});
    const hash = digest();
    for (let tick = 0; tick < fixture.count; tick++) {
      const pressed = initial.mashEvery && tick % initial.mashEvery === 0 ? 1 : 0;
      const pinned = tick >= (initial.pinnedFrom ?? Infinity) && tick < initial.pinnedUntil;
      body.step({pressed, pinned});
      const row = snapshot(body);
      if (fixture.rows) assert.deepEqual(row, fixture.rows[tick], `tick ${tick}`);
      hash.add(row);
    }
    assert.deepEqual(snapshot(body), fixture.final);
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
    assert.equal(body.done, true);
  });
}

test('health-severity thresholds match the original damage service', () => {
  for (const fixture of fixtures.severityCases) {
    assert.equal(healthSeverity(fixture.health, fixture.maximumHealth, fixture.previous), fixture.severity);
  }
});

test('airborne/world coordinates round-trip and render at original projected integer positions', () => {
  for (const fixture of fixtures.projectionCases) {
    const actor = {};
    updateScreenPosition(actor, fixture.initial);
    assert.deepEqual(worldPosition(actor), fixture.initial);
    assert.deepEqual(spritePosition(actor), fixture.screen);
  }
});

for (const fixture of fixtures.matches) {
  test(`integrated four-hit knockdown and recovery parity: attacker ${fixture.attackerIndex}, health ${fixture.initialHealth}`, () => {
    const match = new Match(0, 6);
    match.ai = fixture.attackerIndex === 1;
    for (const [index, actor] of match.fighters.entries()) {
      updateScreenPosition(actor, {xFixed: (0x280 + index * 40) * 65536,
        yFixed: 0x14c0000, zFixed: 0x1400000});
      actor.health = fixture.initialHealth;
      actor.maximumHealth=100; // The controlled original reference uses this maximum.
      actor.severity = fixture.initialHealth <= 24 ? 2 : 0;
      actor.animation.flags = 0x8000;
      actor.contact = 1;
    }
    const hash = digest();
    let row;
    for (let tick = 0; tick < fixture.frames; tick++) {
      const strike = [0, 49, 98, 147].includes(tick);
      const mash = fixture.mashFrames.includes(tick);
      match.computerInput = () => ({strike});
      match.step({strike: fixture.attackerIndex === 0 ? strike : mash});
      row = {actors: match.fighters.map(actor => {
        const world = worldPosition(actor);
        return [actor.knockdown ? actor.knockdown.state : actor.pendingIdle ? 0
          : ({idle: 0, walk: 1, strike: 5, heavy: 5, hurt: 4})[actor.state],
        actor.animation.pose, actor.contact, world.xFixed, world.yFixed, world.zFixed,
        actor.health, actor.severity, actor.comboCount, actor.comboTimer, actor.facing > 0 ? 0x8000 : 0];
      }), sounds: match.takeSoundCommands(), camera: [match.camera.x, match.camera.y,
        match.camera.backgroundX, match.camera.backgroundY],
        projection: match.fighters.map(actor=>{const p=match.drawPosition(actor);return[p.x,p.y];})};
      if (fixture.rows) assert.deepEqual(row, fixture.rows[tick], `tick ${tick}`);
      hash.add(row);
    }
    assert.deepEqual(row, fixture.final);
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  });
}

for (const fixture of fixtures.boundaryWalks) {
  test(`native ${fixture.axis} walking reaches and stops at the original ring bounds for type ${fixture.type}`, () => {
    const match = new Match(fixture.type, 6);
    match.ai = false;
    const actor = match.fighters[0];
    updateScreenPosition(actor, {xFixed: 0x2800000, yFixed: 0x14c0000, zFixed: 0x1400000});
    actor.animation.flags = 0x8000;
    actor.contact = 1;
    match.fighters[1].x = 700 - 0x1cd;
    const hash = digest();
    let row;
    let frame = 0;
    for (const {vertical = 0, horizontal = 0, ticks} of fixture.segments) for (let tick = 0; tick < ticks; tick++, frame++) {
      match.step({vertical, horizontal});
      const world = worldPosition(actor);
      row = [world.xFixed, world.yFixed, world.zFixed, actor.animation.pose, actor.contact, actor.movementMode];
      if (fixture.rows) assert.deepEqual(row, fixture.rows[frame], `frame ${frame}`);
      hash.add(row);
    }
    assert.deepEqual(row, fixture.final);
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  });
}

test('match pin controls wait for the downed phase and block its recovery timer while held', () => {
  const match = new Match(0, 6);
  match.ai = false;
  const [player, target] = match.fighters;
  target.x = player.x + 20;
  target.health = 90;
  target.state = 'down';
  target.knockdown = new Knockdown({...worldPosition(target), reaction: 2, health: 90});
  target.animation = target.knockdown.clock;
  let ticks = 0;
  while (!target.knockdown.canPin && ticks++ < 150) {
    match.step({pin: true});
    assert.notEqual(player.state, 'pin');
  }
  assert(ticks < 150);
  match.step({pin: true});
  assert.equal(player.state, 'pin');
  const remaining = target.knockdown.recoveryTimer;
  for (let tick = 0; tick < 30; tick++) match.step({pin: true});
  assert.equal(target.knockdown.recoveryTimer, remaining);
  match.step({});
  assert.equal(target.knockdown.recoveryTimer, remaining - 1);
});
