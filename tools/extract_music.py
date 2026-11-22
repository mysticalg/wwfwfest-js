"""Recover the music command graph, instruments and pitch tables from the ROM."""
import argparse
import json
import struct
import zipfile
from pathlib import Path

OPERATIONS = {
    0xea: ('noise', 1), 0xeb: ('portamento', 3), 0xec: ('portamentoOff', 0),
    0xed: ('repeatEnd', 0), 0xee: ('repeat', 3), 0xef: ('level', 1),
    0xf0: ('end', 0), 0xf1: ('tieOn', 0), 0xf2: ('tieOff', 0),
    0xf3: ('envelopeOff', 0), 0xf4: ('envelope', 1), 0xf5: ('tempo', 1),
    0xf6: ('transpose', 1), 0xf7: ('sensitivity', 1), 0xf8: ('lfoDepth', 1),
    0xf9: ('lfo', 2), 0xfa: ('fraction', 1), 0xfb: ('stop', 0),
    0xfc: ('gate', 1), 0xfd: ('jump', 2), 0xfe: ('rest', 1), 0xff: ('instrument', 1),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('assets/audio/music.json'))
    args = parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        program = archive.read('31a11-2.ic42')
    tracks = []
    pending = []
    for command in range(1, 31):
        source = 0x2524 + (command - 1) * 20
        channels = list(struct.unpack_from('<9H', program, source))
        tracks.append({'command': command, 'source': source, 'channels': channels})
        pending.extend(channels)
    instructions = {}
    while pending:
        address = pending.pop()
        if str(address) in instructions:
            continue
        if not 0 <= address < 0xc000:
            raise ValueError(f'Music stream points outside program ROM at ${address:04x}')
        opcode = program[address]
        if opcode < 0x80:
            instruction = {'source': address, 'op': 'note', 'args': [opcode, program[address + 1]], 'next': address + 2}
        else:
            name, count = OPERATIONS[opcode]
            instruction = {'source': address, 'op': name,
                           'args': list(program[address + 1:address + count + 1]),
                           'next': address + count + 1}
        instructions[str(address)] = instruction
        if instruction['op'] in ('jump', 'repeat'):
            target = instruction['args'][0] + instruction['args'][1] * 256
            pending.append(target)
        if instruction['op'] not in ('jump', 'repeatEnd', 'end', 'stop'):
            pending.append(instruction['next'])
    instruments = []
    for index in range(128):
        address = struct.unpack_from('<H', program, 0x135f + index * 2)[0]
        instruments.append({'source': address, 'registers': list(program[address:address + 25])})
    result = {'version': 1, 'tracks': tracks, 'instructions': instructions,
              'instrumentRegisterOffsets': list(program[0xfd1:0xfd1 + 25]),
              'instruments': instruments, 'noteCodes': list(program[0xf61:0x1061]),
              'pitchEnvelopes': [list(program[0x1247 + index * 8:0x1247 + index * 8 + 7]) for index in range(31)],
              'trackLevels': list(program[0x133f:0x135f]),
              'initialWrites': [[program[0x3b8 + index * 2], program[0x3b9 + index * 2]] for index in range(program[0x3b7])],
              'timerClock': 3579545, 'timerBDivisor': 1024}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2))
    print(f'Extracted {len(tracks)} tracks, {len(instructions)} music instructions and {len(instruments)} instruments')


if __name__ == '__main__':
    main()
