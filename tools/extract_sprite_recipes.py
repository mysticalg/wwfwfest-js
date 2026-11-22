"""Extract sprite recipe tables/streams; no executable CPU runtime is produced."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('--output', type=Path, default=Path('assets'))
args = parser.parse_args()
with zipfile.ZipFile(args.archive) as archive:
    even, odd = archive.read('31a14-2.ic18'), archive.read('31a13-2.ic19')
program = bytearray(len(even) * 2)
program[::2], program[1::2] = even, odd
origin = 0x3813a
data = program[origin:]
args.output.mkdir(parents=True, exist_ok=True)
(args.output / 'sprite-recipes.bin').write_bytes(data)
(args.output / 'sprite-recipes.json').write_text(json.dumps({
    'set': 'WWF WrestleFest US rev 2', 'origin': origin,
    'length': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
    'frameIndexTable': 0x3813a, 'recipeBaseTable': 0x381de,
    'sharedColumns': 0x6a2d6, 'frameCounts': [564] * 12 + [18],
}, indent=2) + '\n')
print(f'Extracted {len(data)} bytes of original sprite tables and recipe data')
