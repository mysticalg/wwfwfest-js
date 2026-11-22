"""Independent original descriptor/ROM raster, for native Canvas comparisons."""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('capture', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
with zipfile.ZipFile(args.archive) as archive:
    program = bytearray(0x80000)
    program[::2], program[1::2] = archive.read('31a14-2.ic18'), archive.read('31a13-2.ic19')
    names = ['31j3.ic9', '31j2.ic8', '31j5.ic11', '31j4.ic10',
             '31j6.ic12', '31j7.ic13', '31j9.ic15', '31j8.ic14']
    raw = np.frombuffer(b''.join(archive.read(name) for name in names), dtype=np.uint8)
offsets = np.arange(65536, dtype=np.uint32)[:, None, None] * 256
offsets = offsets + np.arange(0,128,8,dtype=np.uint32)[None,:,None]
offsets = offsets + np.array(list(range(8)) + list(range(128,136)), dtype=np.uint32)[None,None,:]
pixels = np.zeros((65536,16,16), dtype=np.uint8)
for plane in range(4):
    bits = offsets + plane * 0x1000000
    pixels |= ((raw[bits >> 3] >> (7 - (bits & 7))) & 1).astype(np.uint8) << (3 - plane)
palettes = np.array([[(v & 15) * 17, ((v >> 4) & 15) * 17, ((v >> 8) & 15) * 17, 255]
                     for v in struct.unpack_from('>256H', program, 0x2ed2)], dtype=np.uint8)
frames = []
for frame in json.loads(args.capture.read_text())['frames']:
    image = np.empty((240,320,4), dtype=np.uint8)
    image[:] = [24,35,45,255]
    for raw_y, flags, low, high, color, raw_x in frame['commands']:
        if not flags & 1:
            continue
        x = raw_x | ((flags & 4) << 6)
        if x > 496:
            x -= 512
        y = ((256 - (raw_y | ((flags & 2) << 7))) & 511) - 24
        count = (flags >> 5) + 1
        code = low | (high << 8)
        for tile in range(count):
            py = y - tile * 16 if not flags & 8 else y - (count - 1) * 16 + tile * 16
            indices = pixels[(code + tile) & 65535]
            if flags & 16:
                indices = indices[:,::-1]
            if flags & 8:
                indices = indices[::-1,:]
            x0, y0, x1, y1 = max(x,0), max(py,0), min(x+16,320), min(py+16,240)
            if x0 >= x1 or y0 >= y1:
                continue
            source = indices[y0-py:y1-py,x0-x:x1-x]
            destination = image[y0:y1,x0:x1]
            mask = source != 0
            destination[mask] = palettes[color * 16 + source[mask]]
    frames.append({key:value for key,value in frame.items() if key != 'commands'} |
                  {'chains':len(frame['commands']), 'sha256':hashlib.sha256(image.tobytes()).hexdigest()})
args.output.write_text(json.dumps({'source':'Original CPU sprite descriptors and independently decoded ROM pixels',
                                  'background':[24,35,45,255], 'frames':frames}, indent=2) + '\n')
print(f'Hashed {len(frames)} original sprite images')
