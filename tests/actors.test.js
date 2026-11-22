import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {ActorAnimation} from '../src/actors/animation.js';
import {polarDelta, stepMovement, walkSpeed, walkAnimation, walkDelta} from '../src/actors/movement.js';
import {Match} from '../src/game.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/actors-reference.json', import.meta.url)));
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

test('all 65,536 direction/speed pairs match original $0022d0 outputs', () => {
  const hash = digest();
  for (let direction = 0; direction < 256; direction++) {
    for (let speed = 0; speed < 256; speed++) {
      const {x, y} = polarDelta(direction, speed);
      hash.add([direction, speed, x, y]);
    }
  }
  assert.deepEqual(hash.finish(), fixtures.polar);
});

test('all movement modes match 1,024 original multi-frame cases with signed positions and wrap', () => {
  for (const fixture of fixtures.motion) {
    const actor = {...fixture.initial};
    const hash = digest();
    for (let tick = 0; tick < fixture.ticks; tick++) {
      stepMovement(actor);
      hash.add([actor.xFixed, actor.yFixed, actor.zFixed, actor.velocityZ]);
    }
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256}, JSON.stringify(fixture.initial));
  }
});

test('character speeds and walk descriptor selection match all 384 original flag combinations', () => {
  for (const fixture of fixtures.walks) {
    const {type, flags32, flags33, flags56, flags74, flags75} = fixture;
    assert.equal(walkSpeed(type, flags32, flags33, flags56, flags74), fixture.speed);
    assert.equal(walkAnimation(flags32, flags74, flags75).source, fixture.descriptor);
  }
});

for (const fixture of fixtures.animations) {
  test(`original actor clock parity for ${fixture.name}`, () => {
    const clock = new ActorAnimation(fixture.initial);
    const hash = digest();
    for (let tick = 0; tick < fixture.ticks; tick++) {
      clock.step(fixture.descriptor, tick % 37 < 18 ? 0 : 0x8000);
      hash.add([clock.flags, clock.remaining, clock.index, clock.pose]);
    }
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  });
}

test('ordinary walking in a match uses the recovered character speed and eleven-frame poses', () => {
  const match = new Match(0, 6);
  match.ai = false;
  const actor = match.fighters[0];
  const frames = Array.from({length: 565}, () => ({pieces: [{}]}));
  const start = actor.x;
  for (let tick = 0; tick < 11; tick++) {
    match.step({horizontal: 1});
    assert.equal(match.pose(actor, frames), 1);
  }
  assert.equal(actor.x - start, 11 * 5120 * 27 / 65536);
  match.step({horizontal: 1});
  assert.equal(match.pose(actor, frames), 2);
  const stopped = actor.x;
  match.step({});
  assert.equal(actor.x, stopped);
  assert.equal(match.pose(actor, frames), 2);
  match.step({});
  assert.equal(match.pose(actor, frames), 0);
  assert.equal(match.mirrored(actor), true);
});

test('ordinary idle entry and facing match original actor dispatcher', () => {
  for (const fixture of fixtures.idle) {
    const clock = new ActorAnimation({pose: fixture.initialPose, remaining: 77, index: 3});
    const hash = digest();
    for (let tick = 0; tick < fixture.ticks; tick++) {
      clock.idle(tick % 37 < 18 ? 0 : 0x8000);
      hash.add([clock.flags, clock.remaining, clock.index, clock.pose]);
    }
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  }
});

test('diagonal movement uses the original direction table and every wrestler speed', () => {
  for (let type = 0; type < 12; type++) {
    const downRight = walkDelta(type, 1, 1);
    const expected = polarDelta(32, walkSpeed(type));
    assert.deepEqual(downRight, expected);
    assert.equal(walkDelta(type, -1, -1).x, -expected.x);
    assert.equal(walkDelta(type, -1, -1).y, -expected.y);
    assert.deepEqual(walkDelta(type, 0, 0), {x: 0, y: 0});
  }
});

test('match locomotion matches complete original handlers through starts, turns and stops', () => {
  for (const fixture of fixtures.locomotion) {
    const match = new Match(fixture.type, 6);
    match.ai = false;
    const [actor, opponent] = match.fighters;
    actor.x = 160;
    actor.y = 140;
    opponent.x = 300;
    const hash = digest();
    const frames = Array.from({length: 565}, () => ({pieces: [{}]}));
    for (let tick = 0; tick < fixture.ticks; tick++) {
      const [horizontal, vertical] = fixture.requests[Math.floor(tick / 12)];
      match.step({horizontal, vertical});
      const pose = match.pose(actor, frames) | (match.mirrored(actor) ? 0x8000 : 0);
      hash.add([Math.round(actor.x * 65536), Math.round(actor.y * 65536), pose]);
    }
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256}, `type ${fixture.type}`);
  }
});
