import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {Running} from '../src/actors/running.js';
import {Match} from '../src/game.js';
import {spritePosition, updateScreenPosition, worldPosition} from '../src/actors/projection.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/running-reference.json', import.meta.url)));
function snapshot(body) {
  const ropes = {left: 0, right: 0};
  for (const event of body.ropeEvents) ropes[event.side] = event.strength;
  return [body.state, body.clock.flags, body.clock.remaining, body.clock.index, body.clock.pose,
    body.xFixed, body.yFixed, body.zFixed, body.movementMode, body.speed, body.direction, body.facing,
    body.flags32, body.flags33, body.bounceCount, body.contact, body.offsetX, body.offsetY,
    body.collision.kind, body.collision.flags, body.sounds, ropes.left, ropes.right];
}
function controls(initial, tick, direction) {
  let mask = initial.mask;
  const stopping = initial.stopAt !== null && tick >= initial.stopAt;
  if (stopping) mask = initial.stopKind === 'release' ? 0
    : initial.stopKind ? initial.mask : (direction & 128 ? 1 : 2);
  return {mask, stopRequested: stopping && initial.stopKind === 'request',
    forcedStop: stopping && initial.stopKind === 'forced'};
}
for (const fixture of fixtures.scenarios) {
  test(`original run/brake/rebound parity ${JSON.stringify(fixture.initial)}`, () => {
    const body = new Running(fixture.initial);
    const hash = createHash('sha256');
    for (let tick = 0; tick < fixture.count; tick++) {
      body.step(controls(fixture.initial, tick, body.direction));
      hash.update(JSON.stringify(snapshot(body)) + '\n');
    }
    assert.deepEqual(snapshot(body), fixture.final);
    assert.equal(hash.digest('hex'), fixture.sha256);
  });
}

test('match controller shortcut preserves original run, brake, rebound, motion and sound output', () => {
  for (const fixture of fixtures.scenarios.filter(fixture => !fixture.initial.bounceCount
    && (!fixture.initial.stopKind || fixture.initial.stopKind === 'release'))) {
    const initial = fixture.initial;
    const match = new Match(initial.type, 6);
    match.ai = false;
    const actor = match.fighters[0];
    updateScreenPosition(actor, initial);
    actor.facing = initial.facing ? 1 : -1;
    actor.animation.pose = actor.lastPose = initial.pose ?? initial.facing;
    Object.assign(actor.animation, initial.clock);
    actor.movementMode = initial.movementMode || 0;
    if (actor.movementMode) actor.state = 'walk';
    const hash = createHash('sha256');
    for (let tick = 0; tick < fixture.count; tick++) {
      const {mask} = controls(initial, tick, actor.running?.direction || 0);
      match.step({run: tick === 0, horizontal: mask & 1 ? 1 : mask & 2 ? -1 : 0});
      const body = actor.running;
      assert.ok(body, `Running object missing at tick ${tick}: ${JSON.stringify(initial)}`);
      const row = snapshot(body);
      hash.update(JSON.stringify(row) + '\n');
      assert.deepEqual(worldPosition(actor), {xFixed: row[5], yFixed: row[6], zFixed: row[7]});
      assert.equal(actor.animation.pose, row[4]);
      assert.equal(actor.contact, row[15]);
      assert.equal(actor.facing > 0 ? 0x8000 : 0, row[11]);
      assert.deepEqual(match.takeSoundCommands(), row[20]);
      const screen = spritePosition(actor, match.camera);
      assert.equal(screen.x, (row[5] >>> 16) - match.camera.x + (row[11] ? -row[16] : row[16]));
    }
    assert.equal(hash.digest('hex'), fixture.sha256, JSON.stringify(initial));
  }
});

test('simultaneous original attack buttons and the dedicated run shortcut select the same action', () => {
  const run = new Match(0, 6);
  const combined = new Match(0, 6);
  run.ai = combined.ai = false;
  for (let tick = 0; tick < 180; tick++) {
    run.step({horizontal: 1, run: tick < 20});
    combined.step({horizontal: 1, strike: tick < 20, heavy: tick < 20});
    const left = run.fighters[0], right = combined.fighters[0];
    assert.equal(left.state, right.state);
    assert.deepEqual(worldPosition(left), worldPosition(right));
    assert.deepEqual(left.running ? snapshot(left.running) : null, right.running ? snapshot(right.running) : null);
    assert.deepEqual(run.takeSoundCommands(), combined.takeSoundCommands());
  }
});
