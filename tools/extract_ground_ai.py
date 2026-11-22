"""Extract original ordinary ground-AI choices and their supporting tables."""
import argparse
import json
import struct
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('src/data/ground-ai-tables.js'))
    args = parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        even, odd = archive.read('31a14-2.ic18'), archive.read('31a13-2.ic19')
    program = bytearray(len(even)*2)
    program[::2], program[1::2] = even, odd
    long = lambda address: struct.unpack_from('>I', program, address)[0]
    words = lambda address, count: list(struct.unpack_from(f'>{count}H', program, address))
    pairs = lambda address, count: [list(program[address+i*2:address+i*2+2]) for i in range(count)]

    def row(address):
        count = program[address]
        assert 0 < count < 32
        return {'source': address, 'actions': list(program[address+1:address+1+count]),
                'weights': [list(program[address+1+count*(i+1):address+1+count*(i+2)]) for i in range(3)]}

    def rows(root, count, skip=()):
        return [[None if group in skip else row(long(long(root+kind*4)+group*4))
                 for group in range(count)] for kind in range(12)]

    def script(address):
        end = program.index(255, address)
        return {'source': address, 'actions': list(program[address:end])+[255]}

    data = {
        'ordinaryMoves': rows(0x20bda, 9, (1,)),
        'counterMoves': rows(0x222a2, 3),
        'assistanceMoves': rows(0x22616, 16),
        'idleJumpWeights': pairs(0x1bb32, 1)[0],
        'outsideEntryWeights': pairs(0x1bb30, 1)[0],
        'retreatWeights': pairs(0x1e5e4, 12),
        'chargeWeights': pairs(0x1e5cc, 12),
        'outsideDodgeWeights': pairs(0x1c250, 1)[0],
        'weaponMidWeights': pairs(0x1c286, 1)[0],
        'cornerWaitPositions': [words(0x1c5a8+i*4, 2) for i in range(4)],
        'cornerChasePositions': [words(0x1c288+i*4, 2) for i in range(10)],
        'cornerAttackWeights': [pairs(0x1e506+i*4, 2) for i in range(12)],
        'assistanceAttackIds': list(program[0x1e946:0x1e956]),
        'assistanceExitWeights': [pairs(long(0x23236+i*4), 3) for i in range(10)],
        'weaponPickWeights': [pairs(long(0x230f6+i*4), 10) for i in range(12)],
        'actionApproachDistances': [list(program[a:a+12]) for a in (0x1d7a8, 0x1d7b4)],
        'runningAttackWeights': [[[pairs(long(long(root+kind*4)+round*4), 3)
                                   for round in range(6)] for kind in range(12)]
                                 for root in (0x22d4c, 0x22af4)],
        'rumbleRunningAttackWeights': [pairs(long(0x22a7c+kind*4), 3) for kind in range(12)],
        'reboundAttackWeights': [pairs(long(0x1e05e+round*4), 3) for round in range(10)],
        'attractScripts': [[script(long(0x1ea8c+i*4)) for i in range(2)],
                           [script(long(0x1eaa0+i*4)) for i in range(12)]],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('// Generated from wwfwfest US rev 2 by tools/extract_ground_ai.py.\n'
                          'export const groundAITables = '+json.dumps(data, indent=2)+';\n', encoding='utf-8')


if __name__ == '__main__':
    main()
