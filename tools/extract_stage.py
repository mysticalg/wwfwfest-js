"""Recover a scrolling stage's two tile layers from the original world blocks."""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image


def decode_tiles(data):
    raw = np.frombuffer(data, dtype=np.uint8)
    offsets = np.arange(4096, dtype=np.uint32)[:, None, None] * 512
    offsets = offsets + np.arange(16, dtype=np.uint32)[None, :, None] * 16
    offsets = offsets + np.array(list(range(8)) + list(range(256, 264)), dtype=np.uint32)[None, None, :]
    pixels = np.zeros((4096, 16, 16), dtype=np.uint8)
    for plane, start in enumerate([8, 0, 0x200008, 0x200000]):
        bits = offsets + start
        pixels |= ((raw[bits >> 3] >> (7 - (bits & 7))) & 1).astype(np.uint8) << (3 - plane)
    return pixels


def capture_palettes(snapshot):
    groups = []
    for base in [0x1000, 0x0c00]:
        colors = []
        for index in range(base, base + 256):
            address = 0x180000 + ((index & 15) | ((index & 0x1ff0) << 2)) * 2
            value = struct.unpack_from('>H', snapshot, address)[0]
            colors.append([(value & 15) * 17, ((value >> 4) & 15) * 17, ((value >> 8) & 15) * 17, 255])
        groups.append(colors)
    return {'source': {'kind': 'original-program palette RAM capture',
                       'sha256': hashlib.sha256(snapshot).hexdigest()}, 'layers': groups}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--snapshot', type=Path, help='Original 2 MiB analysis capture for initial palette recovery')
    parser.add_argument('--palette', type=Path, help='Previously recovered palette JSON, used instead of a snapshot')
    parser.add_argument('--scene', type=int, default=0)
    parser.add_argument('--output', type=Path, default=Path('assets'))
    parser.add_argument('--data-output', type=Path, default=Path('src/data/stage-tables.js'))
    args = parser.parse_args()
    if args.scene != 0:
        raise ValueError('This export currently uses the normal ring scene and its recovered palette')
    with zipfile.ZipFile(args.archive) as archive:
        even, odd = archive.read('31a14-2.ic18'), archive.read('31a13-2.ic19')
        graphics = archive.read('31j1.ic2') + archive.read('31j0.ic1')
    program = bytearray(len(even) * 2)
    program[::2], program[1::2] = even, odd
    args.output.mkdir(parents=True, exist_ok=True)
    if args.snapshot:
        palettes = capture_palettes(args.snapshot.read_bytes())
    else:
        palette_path = args.palette or args.output / 'arena-palettes.json'
        palettes = json.loads(palette_path.read_text(encoding='utf-8'))
    (args.output / 'arena-palettes.json').write_text(json.dumps(palettes, indent=2) + '\n', encoding='utf-8')

    minimum_x, minimum_y, maximum_x, maximum_y = struct.unpack_from('>4H', program, 0x28ada)
    origin_x, origin_y = minimum_x, 2048 - maximum_y + 8
    width, height = maximum_x - minimum_x + 320, maximum_y - minimum_y + 240
    tiles = decode_tiles(graphics)
    sources = []
    for layer, name in enumerate(['back', 'front']):
        table_source = 0x262c2 if layer == 0 else 0x262e2
        table = struct.unpack_from('>I', program, table_source)[0]
        sources.append(table)
        colors = np.array(palettes['layers'][layer], dtype=np.uint8)
        result = Image.new('RGBA', (width, height))
        for tile_y in range(origin_y // 16, (origin_y + height + 15) // 16):
            for tile_x in range(origin_x // 16, (origin_x + width + 15) // 16):
                # $025ece selects a 320x256 block from an 8-column world map.
                # Each block contains 20x16 tiles, stored as attr/code pairs in
                # BG0 and packed code/color words in BG1.
                block = struct.unpack_from('>I', program, table + ((tile_y // 16) * 8 + tile_x // 20) * 4)[0]
                local = (tile_y % 16) * 20 + tile_x % 20
                if layer == 0:
                    attr, code = struct.unpack_from('>2H', program, block + local * 4)
                    pixels = tiles[code & 4095]
                    if attr & 64:
                        pixels = pixels[:, ::-1]
                    if attr & 128:
                        pixels = pixels[::-1, :]
                    rgba = colors[(attr & 15) * 16 + pixels].copy()
                else:
                    attr = struct.unpack_from('>H', program, block + local * 2)[0]
                    pixels = tiles[attr & 4095]
                    rgba = colors[(attr >> 12) * 16 + pixels].copy()
                    rgba[pixels == 0] = 0
                result.alpha_composite(Image.fromarray(rgba), (tile_x * 16 - origin_x, tile_y * 16 - origin_y))
        result.save(args.output / f'arena-scroll-{name}.png', optimize=True)

    visibility_source = struct.unpack_from('>I', program, 0x278a0)[0]
    animation_table = struct.unpack_from('>I', program, 0x27e8c)[0]
    patch_offsets, patch_data = struct.unpack_from('>2I', program, 0x287ca)
    visibility = []
    cursor = visibility_source
    while program[cursor] < 128:
        x, y, animation = program[cursor:cursor + 3]
        visibility.append({'x': x, 'y': y, 'animation': animation})
        cursor += 3
    animations = []
    patches = {}
    for entry in visibility:
        index = entry['animation']
        if index != len(animations):
            raise ValueError('Animation IDs must be consecutive for this scene export')
        address = struct.unpack_from('>I', program, animation_table + index * 4)[0]
        last_index, group = program[address:address + 2]
        frames = []
        for frame in range(last_index + 1):
            patch, delay = program[address + 2 + frame * 2:address + 4 + frame * 2]
            frames.append({'patch': patch, 'delay': delay})
            patch_x, patch_y = (entry['x'] + 1) * 64, 2048 - (entry['y'] + 1) * 64
            destination = struct.unpack_from('>H', program, patch_offsets + patch * 2)[0]
            expected = ((patch_y % 512) // 16) * 128 + ((patch_x % 512) // 16) * 4
            if destination != expected or group & 128:
                raise ValueError('Unexpected patch layout in normal ring scene')
            patches[patch] = {'source': patch_data + patch * 64, 'x': patch_x, 'y': patch_y,
                              'atlasX': patch % 16 * 64, 'atlasY': patch // 16 * 64, 'layer': 0}
        animations.append({'source': address, 'group': group, 'frames': frames})
    atlas = Image.new('RGBA', (1024, ((max(patches) + 16) // 16) * 64))
    colors = np.array(palettes['layers'][0], dtype=np.uint8)
    for patch in patches.values():
        for local in range(16):
            attr, code = struct.unpack_from('>2H', program, patch['source'] + local * 4)
            pixels = tiles[code & 4095]
            if attr & 64:
                pixels = pixels[:, ::-1]
            if attr & 128:
                pixels = pixels[::-1, :]
            atlas.paste(Image.fromarray(colors[(attr & 15) * 16 + pixels]),
                        (patch['atlasX'] + local % 4 * 16, patch['atlasY'] + local // 4 * 16))
    atlas.save(args.output / 'arena-patches.png', optimize=True)

    metadata = {'scene': 0, 'width': width, 'height': height, 'origin': {'x': origin_x, 'y': origin_y},
                'cameraBounds': {'minimumX': minimum_x, 'minimumY': minimum_y,
                                 'maximumX': maximum_x, 'maximumY': maximum_y},
                'allCameraBounds': [list(struct.unpack_from('>4H', program, 0x28ada + index * 8))
                                    for index in range(7)],
                'worldYOrigin': 2048, 'screenTopOffset': 8,
                'visibility': visibility, 'animations': animations, 'patches': patches,
                'sources': {'backgroundTable': sources[0], 'foregroundTable': sources[1],
                            'cameraBounds': 0x28ada, 'blockLookup': 0x25ece,
                            'visibility': visibility_source, 'animationTable': animation_table,
                            'patchOffsets': patch_offsets, 'patchData': patch_data},
                'programSha256': hashlib.sha256(program).hexdigest()}
    (args.output / 'stage.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    args.data_output.parent.mkdir(parents=True, exist_ok=True)
    args.data_output.write_text('// Generated by tools/extract_stage.py from US rev 2.\n'
                                'export const stageTables = ' + json.dumps(metadata, indent=2) + ';\n', encoding='utf-8')
    print(f'Recovered both {width}x{height} stage layers and {len(patches)} crowd patches')


if __name__ == '__main__':
    main()
