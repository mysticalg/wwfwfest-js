import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {WorldCamera} from '../src/camera.js';
import {SceneryAnimator} from '../src/scenery.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/camera-reference.json', import.meta.url)));
function digest() {
  const hash = createHash('sha256');
  let count = 0;
  return {add(row) { hash.update(JSON.stringify(row) + '\n'); count++; },
    finish() { return {count, sha256: hash.digest('hex')}; }};
}

for (const [index, fixture] of fixtures.cameras.entries()) {
  test(`original camera follow, clamp and register parity ${index}`, () => {
    const camera = new WorldCamera(fixture.initial);
    const hash = digest();
    let row;
    for (let tick = 0; tick < fixture.ticks; tick++) {
      camera.step(fixture.actors.map(actor => ({...actor,
        x: (actor.x + tick * actor.vx) & 0xffff,
        y: (actor.y + tick * actor.vy) & 0xffff,
        z: (actor.z + tick * actor.vz) & 0xffff})), fixture.options);
      row = [camera.x, camera.y, camera.backgroundX, camera.backgroundY, ...camera.registers(),
        camera.chunkX, camera.chunkY];
      hash.add(row);
    }
    assert.deepEqual(row, fixture.final);
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  });
}

for (const [index, fixture] of fixtures.scenery.entries()) {
  test(`original scenery visibility, slots, clocks and patch queues ${index}`, () => {
    const scenery = new SceneryAnimator();
    const hash = digest();
    for (const [x, y] of fixture.chunks) {
      const events = scenery.step(x, y);
      hash.add({state: scenery.snapshot(), events});
    }
    assert.deepEqual(scenery.snapshot(), fixture.final);
    assert.deepEqual(hash.finish(), {count: fixture.count, sha256: fixture.sha256});
  });
}
