"""Decode the original count-layer character tiles and their captured palette."""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('snapshot', type=Path)
parser.add_argument('--output', type=Path, default=Path('assets'))
args = parser.parse_args()
with zipfile.ZipFile(args.archive) as archive:
    raw = archive.read('31a12-0.ic33')
    program = bytearray(0x80000)
    program[::2], program[1::2] = archive.read('31a14-2.ic18'), archive.read('31a13-2.ic19')
snapshot = args.snapshot.read_bytes()
pointers = struct.unpack_from('>21I', program, 0x1f960)
codes = sorted({0xa00 + code for index, pointer in enumerate(pointers)
                for code in program[pointer:pointer + (8 if index < 10 else 16)]})
palette = []
for index in range(0xe0, 0xf0):
    address = 0x180000 + ((index & 15) | ((index & 0x1ff0) << 2)) * 2
    value = struct.unpack_from('>H', snapshot, address)[0]
    palette.append(((value & 15) * 17, ((value >> 4) & 15) * 17, ((value >> 8) & 15) * 17,
                    255 if index & 15 else 0))
atlas = Image.new('RGBA', (128, ((len(codes) + 15) // 16) * 8))
tiles = {}
for index, code in enumerate(codes):
    x0, y0 = (index % 16) * 8, (index // 16) * 8
    tiles[code] = [x0, y0]
    for y in range(8):
        for x, offset in enumerate([1, 0, 65, 64, 129, 128, 193, 192]):
            color = 0
            for plane, start in enumerate([0, 2, 4, 6]):
                bit = code * 256 + y * 8 + offset + start
                color |= ((raw[bit >> 3] >> (7 - (bit & 7))) & 1) << (3 - plane)
            atlas.putpixel((x0 + x, y0 + y), palette[color])
args.output.mkdir(parents=True, exist_ok=True)
atlas.save(args.output / 'count-tiles.png')
(args.output / 'count-tiles.json').write_text(json.dumps({
    'source': 'Original US rev 2 character ROM, count glyph table $01f960, palette bank 14',
    'snapshotSha256': hashlib.sha256(snapshot).hexdigest(), 'tiles': tiles,
    'regions': [[136, 48], [272, 128]], 'palette': palette,
}, indent=2) + '\n')
print(f'Decoded {len(codes)} original count tiles')
