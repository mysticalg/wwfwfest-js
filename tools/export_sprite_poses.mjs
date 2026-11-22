// Editable standalone snapshots. Paired recipes remain native dynamic data.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {SpriteRecipes, recipePieces} from '../src/sprite-recipes.js';

const assets = resolve(process.argv[2] || 'assets');
const metadata = JSON.parse(readFileSync(join(assets, 'sprite-recipes.json')));
const recipes = new SpriteRecipes(readFileSync(join(assets, 'sprite-recipes.bin')), metadata);
const summary = [];
for (const [type, count] of metadata.frameCounts.entries()) {
  const frames = [];
  for (let index = 0; index <= count; index++) {
    const result = recipes.expand(type, index);
    frames.push({index, source: result.source, pieces: recipePieces(result.commands).map(piece =>
      ({...piece, x: piece.x - 128, y: piece.y - 104})),
      ...(result.missing ? {missing: true} : {}),
      ...(index === count ? {terminator: true} : {}),
      ...(result.requiresContext ? {requiresContext: true} : {})});
  }
  writeFileSync(join(assets, `poses-${type}.json`), JSON.stringify({type, frames}));
  summary.push({type, entries: frames.length,
    drawable: frames.filter(frame => !frame.missing).length,
    requiresContext: frames.filter(frame => frame.requiresContext).length,
    missing: frames.filter(frame => frame.missing).length});
}
const manifestPath = join(assets, '../research/rom-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath));
manifest.poses = summary;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(summary));
