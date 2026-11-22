"""Inspect the supplied ROM set and regenerate the standalone sprite atlas.

Run with Python 3, Pillow, NumPy and Capstone. Pose recipe JSON is a separate
research export. This script preserves those editable records.
"""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

import capstone
import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('rom-analysis'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.archive) as archive:
        program = bytearray(0x80000)
        program[0::2] = archive.read('31a14-2.ic18')
        program[1::2] = archive.read('31a13-2.ic19')
        manifest = []
        for item in archive.infolist():
            raw = archive.read(item)
            manifest.append({'name': item.filename, 'size': len(raw),
                             'crc32': f'{item.CRC:08x}',
                             'sha256': hashlib.sha256(raw).hexdigest()})
        (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        (args.output / 'program.bin').write_bytes(program)
        vectors = struct.unpack_from('>64I', program)
        (args.output / 'vectors.json').write_text(json.dumps([f'0x{x:06x}' for x in vectors], indent=2))
        decoder = capstone.Cs(capstone.CS_ARCH_M68K, capstone.CS_MODE_BIG_ENDIAN | capstone.CS_MODE_M68K_000)
        # Selected bounded ranges avoid interpreting the whole data ROM as code.
        ranges = [(0x400, 0x90e), (0x1e2e, 0x2090), (0x2846, 0x2998),
                  (0xc43c, 0xc4e6), (0x25708, 0x25868)]
        listing = []
        for start, end in ranges:
            listing.append(f'\n; Range ${start:06x} through ${end:06x}')
            for instruction in decoder.disasm(program[start:end + 16], start):
                if instruction.address >= end:
                    break
                listing.append(f'{instruction.address:06x}  {instruction.mnemonic:10} {instruction.op_str}')
        (args.output / 'selected-routines.asm').write_text('\n'.join(listing))
        names = ['31j3.ic9', '31j2.ic8', '31j5.ic11', '31j4.ic10',
                 '31j6.ic12', '31j7.ic13', '31j9.ic15', '31j8.ic14']
        raw = np.frombuffer(b''.join(archive.read(name) for name in names), dtype=np.uint8)
        offsets = np.arange(65536, dtype=np.uint32)[:, None, None] * 256
        offsets = offsets + np.arange(0, 128, 8, dtype=np.uint32)[None, :, None]
        offsets = offsets + np.array(list(range(8)) + list(range(128, 136)), dtype=np.uint32)[None, None, :]
        pixels = np.zeros((65536, 16, 16), dtype=np.uint8)
        for plane in range(4):
            bits = offsets + plane * 0x1000000
            pixels |= ((raw[bits >> 3] >> (7 - (bits & 7))) & 1).astype(np.uint8) << (3 - plane)
        atlas = pixels.reshape(256, 256, 16, 16).transpose(0, 2, 1, 3).reshape(4096, 4096)
        Image.fromarray(atlas * 17).save(args.output / 'sprite-indices.png')
        palettes = []
        for bank in range(16):
            colors = []
            for index in range(16):
                value = struct.unpack_from('>H', program, 0x2ed2 + bank * 32 + index * 2)[0]
                colors.append([(value & 15) * 17, ((value >> 4) & 15) * 17,
                               ((value >> 8) & 15) * 17, 255 if index else 0])
            palettes.append(colors)
        (args.output / 'palettes.json').write_text(json.dumps(palettes))
    print(f'Wrote analysis and graphics to {args.output.resolve()}')


if __name__ == '__main__':
    main()
