"""Render original-program tile RAM captures independently of the world export."""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

import numpy as np
from extract_stage import decode_tiles


def render(data, registers, tiles, palettes):
    result = np.zeros((240, 320, 4), dtype=np.uint8)
    for layer in range(2):
        colors = np.array(palettes['layers'][layer], dtype=np.uint8)
        scroll = 2 if layer == 0 else 0
        sx, sy = registers[scroll] & 511, registers[scroll + 1] & 511
        for index in range(1024):
            x = ((index % 32 * 16 - sx + 16) % 512) - 16
            y = ((index // 32 * 16 - sy + 16) % 512) - 24
            if x >= 320 or y >= 240 or x + 16 <= 0 or y + 16 <= 0:
                continue
            if layer == 0:
                attr, code = struct.unpack_from('>2H', data, index * 4)
                pixels = tiles[code & 4095]
                if attr & 64:
                    pixels = pixels[:, ::-1]
                if attr & 128:
                    pixels = pixels[::-1, :]
                color = attr & 15
            else:
                attr = struct.unpack_from('>H', data, 4096 + index * 2)[0]
                pixels = tiles[attr & 4095]
                color = attr >> 12
            x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + 16, 320), min(y + 16, 240)
            source = pixels[y0 - y:y1 - y, x0 - x:x1 - x]
            destination = result[y0:y1, x0:x1]
            mask = np.ones(source.shape, dtype=bool) if layer == 0 else source != 0
            destination[mask] = colors[color * 16 + source[mask]]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('frames', type=Path)
    parser.add_argument('--palette', type=Path, default=Path('assets/arena-palettes.json'))
    parser.add_argument('--output', type=Path, default=Path('tests/fixtures/stage-reference.json'))
    args = parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        tiles = decode_tiles(archive.read('31j1.ic2') + archive.read('31j0.ic1'))
    palettes = json.loads(args.palette.read_text(encoding='utf-8'))
    cases = []
    for frame in json.loads((args.frames / 'index.json').read_text(encoding='utf-8')):
        rgba = render((args.frames / frame['file']).read_bytes(), frame['registers'], tiles, palettes)
        cases.append({'camera': frame['camera'], 'ticks': frame['ticks'],
                      'sha256': hashlib.sha256(rgba.tobytes()).hexdigest()})
    args.output.write_text(json.dumps(cases, indent=2) + '\n', encoding='utf-8')
    print(f'Rendered {len(cases)} original tile-RAM reference views')


if __name__ == '__main__':
    main()
