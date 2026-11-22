import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {contactOverlap, groundContact} from '../src/actors/contact.js';
import {StandingAction, StandingReaction, standingHitResponse} from '../src/actors/standing-action.js';
import {Match} from '../src/game.js';
import {updateScreenPosition} from '../src/actors/projection.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/combat-reference.json', import.meta.url)));
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

test('all contact-record pairs match original geometry and eligible ground gates', () => {
  const geometry = digest();
  const ground = digest();
  for (let a = 0; a < 34; a++) for (let b = 0; b < 34; b++) {
    for (let poseBits = 0; poseBits < 4; poseBits++) {
      for (const dx of fixtures.offsets) for (const dz of fixtures.heights) {
        const attacker = {x: 0x280, y: 0x150, z: 0, pose: poseBits & 1 ? 0x8000 : 0, contact: a};
        const target = {x: attacker.x + dx, y: 0x150, z: dz,
          pose: poseBits & 2 ? 0x8000 : 0, contact: b};
        geometry.add(Number(contactOverlap(attacker, target)));
        ground.add(Number(groundContact(attacker, target)));
      }
    }
  }
  assert.deepEqual(geometry.finish(), fixtures.geometry);
  assert.deepEqual(ground.finish(), fixtures.ground);
});

test('depth boundaries and the special target-depth offset match the original gate', () => {
  for (const fixture of fixtures.depthCases) {
    assert.equal(groundContact({x: 0x280, y: 0x150, z: 0, pose: 0x8000, contact: 7},
      {x: 0x280 + 40, y: 0x150 + fixture.dy, z: 0, pose: 0, contact: fixture.contact}), fixture.hit);
  }
});

for (const fixture of fixtures.actions) {
  test(`standing button ${fixture.button} facing ${fixture.facing} matches full original handler and pose cleanup`, () => {
    const action = new StandingAction(fixture.button, fixture.facing);
    const rows = [];
    for (let tick = 0; tick < fixture.rows.length; tick++) {
      action.step(fixture.facing);
      rows.push([action.clock.remaining, action.clock.index, action.clock.pose, action.contact, action.done]);
    }
    assert.deepEqual(rows, fixture.rows);
  });
}

for (const fixture of fixtures.reactions) {
  test(`standing reaction ${fixture.kind} facing ${fixture.facing} matches original handler`, () => {
    const action = new StandingReaction(fixture.kind, fixture.facing);
    const rows = [];
    for (let tick = 0; tick < fixture.rows.length; tick++) {
      action.step(fixture.facing);
      rows.push([action.clock.remaining, action.clock.index, action.clock.pose, action.done]);
    }
    assert.deepEqual(rows, fixture.rows);
  });
}

test('standing damage, reaction selection and audio commands match 192 original response cases', () => {
  for (const fixture of fixtures.responses) {
    const response = standingHitResponse(fixture.button, fixture.facing, {
      contact: fixture.targetContact, flags33: fixture.flags33, comboCount: fixture.combo,
      facing: fixture.targetFacing,
    });
    assert.deepEqual(response, {accepted: fixture.accepted, damage: fixture.damage,
      reaction: fixture.reaction, sounds: fixture.sounds}, JSON.stringify(fixture));
  }
});

for (const fixture of fixtures.matches) {
  test(`integrated button ${fixture.button} at distance ${fixture.distance} matches original actor/contact/damage loop`, () => {
    const match = new Match(0, 6);
    match.ai = false;
    for (const [index, actor] of match.fighters.entries()) {
      // These original-program fixtures deliberately initialize both records at 100.
      actor.health=actor.maximumHealth=100;
      updateScreenPosition(actor, {xFixed: (0x280 + index * fixture.distance) * 65536,
        yFixed: 0x1500000, zFixed: 0x1400000});
      actor.animation.flags = 0x8000;
      actor.contact = 1;
    }
    const rows = [];
    for (let tick = 0; tick < fixture.rows.length; tick++) {
      match.step(tick ? {} : {[fixture.button ? 'heavy' : 'strike']: true});
      rows.push({actors: match.fighters.map(actor => [actor.animation.pose, actor.contact,
        actor.pendingIdle ? 0 : ({idle: 0, walk: 1, strike: 5, heavy: 5, hurt: 4})[actor.state],
        actor.health, actor.comboCount, actor.comboTimer]), sounds: match.takeSoundCommands()});
      assert.deepEqual(rows[tick], fixture.rows[tick], `tick ${tick}`);
    }
  });
}

test('holding an attack button does not manufacture new original input edges', () => {
  const match = new Match(0, 6,{ai:false});
  match.ai = false;
  match.fighters[1].x = match.fighters[0].x + 40;
  for (let tick = 0; tick < 150; tick++) match.step({strike: true});
  assert.equal(match.fighters[1].health, 99);
  assert.deepEqual(match.takeSoundCommands(), [0x2a, 0x32]);
  match.step({});
  for (let tick = 0; tick < 60; tick++) match.step({strike: true});
  assert.equal(match.fighters[1].health, 98);
  assert.deepEqual(match.takeSoundCommands(), [0x2a, 0x32]);
});
