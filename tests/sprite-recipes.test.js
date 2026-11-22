import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {SpriteRecipes, recipePieces} from '../src/sprite-recipes.js';

const data = readFileSync(new URL('../assets/sprite-recipes.bin', import.meta.url));
const metadata = JSON.parse(readFileSync(new URL('../assets/sprite-recipes.json', import.meta.url)));
const recipes = new SpriteRecipes(data, metadata);
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/sprite-recipes-reference.json', import.meta.url)));

test('extracted recipe data has the recorded identity and terminal table markers', () => {
  assert.equal(createHash('sha256').update(data).digest('hex'), metadata.sha256);
  assert.equal(data.length, metadata.length);
  for (let type = 0; type < metadata.frameCounts.length; type++) {
    const table = metadata.frameIndexTable;
    const start = table + (recipes.word(table + type * 2) << 16 >> 16);
    assert.equal(recipes.word(start + metadata.frameCounts[type] * 2), 0xffff);
    assert.equal(recipes.expand(type, metadata.frameCounts[type]).missing, true);
  }
});

for (const fixture of fixtures.scenarios) {
  test(`original sprite descriptors: type ${fixture.type}, peer ${fixture.targetType}, mirrored ${fixture.mirror}, origin ${fixture.x},${fixture.y}`, () => {
    const hash = createHash('sha256');
    let pieces = 0;
    for (let pose = 0; pose < fixture.count; pose++) {
      const result = recipes.expand(fixture.type, pose | (fixture.mirror ? 0x8000 : 0), fixture);
      pieces += result.commands.length;
      hash.update(JSON.stringify(result.commands) + '\n');
    }
    assert.equal(pieces, fixture.pieces);
    assert.equal(hash.digest('hex'), fixture.sha256);
  });
}

test('paired layers require a real linked wrestler; missing poses remain empty', () => {
  for (const [type, pose, targetType] of [[0,159,6], [1,159,6], [4,162,6], [3,405,6], [9,406,3]]) {
    const result = recipes.expand(type, pose);
    assert.equal(result.requiresContext, true, `${type}:${pose}`);
    assert.deepEqual(result.commands, []);
    assert.ok(recipes.expand(type, pose, {targetType}).commands.length > 0);
  }
  assert.equal(recipes.expand(0, 0xffff).missing, true);
});

test('hardware coordinate bits convert to the Canvas chain representation', () => {
  assert.deepEqual(recipePieces([[255,7,52,18,3,255]]), [{x:-1,y:233,flags:7,code:0x1234,color:3}]);
});
