"""Recover the original name and move-commentary command/delay tables."""
import argparse
import json
import struct
import zipfile
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('archive', type=Path)
p.add_argument('--output', type=Path, default=Path('src/data/announcer-tables.js'))
args = p.parse_args()
with zipfile.ZipFile(args.archive) as z:
    even, odd = z.read('31a14-2.ic18'), z.read('31a13-2.ic19')
b = bytearray(len(even) * 2)
b[::2], b[1::2] = even, odd
w = lambda a: struct.unpack_from('>H', b, a)[0]
l = lambda a: struct.unpack_from('>I', b, a)[0]
names = [[w(0x9c7e+i*4), w(0x9c80+i*4)] for i in range(24)]
phrases = []
for i in range(46):
    a = l(0x9cde+i*4)
    phrases.append([[w(a+2+j*4), w(a+4+j*4)] for j in range(w(a))])
args.output.write_text('// Original program tables $009c7e and $009cde; US rev 2.\n'
                       'export const announcerTables = ' + json.dumps({'names': names, 'phrases': phrases}, indent=2) + ';\n')
