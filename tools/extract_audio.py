"""Recover native sound-effect scripts from the supplied Z80 and sample ROMs."""
import argparse
import json
import struct
import zipfile
from pathlib import Path


def compile_script(program, start):
    steps = []
    addresses = {}
    address = start
    while address not in addresses:
        addresses[address] = len(steps)
        source = address
        command = program[address]
        address += 1
        if command < 0x80 or command == 0xfe:
            ticks = program[address] or 256
            address += 1
            held = program[address] == 0xf1
            address += int(held)
            steps.append({'source': source, 'op': 'sample' if command < 0x80 else 'wait',
                          'sample': command if command < 0x80 else None,
                          'ticks': ticks, 'holdAfter': held})
        elif command == 0xef:
            steps.append({'source': source, 'op': 'volume', 'value': program[address]})
            address += 1
        elif command == 0xf0:
            steps.append({'source': source, 'op': 'end'})
            return steps
        elif command == 0xf2:
            steps.append({'source': source, 'op': 'release'})
        elif command == 0xfd:
            target = struct.unpack_from('<H', program, address)[0]
            if target in addresses:
                steps.append({'source': source, 'op': 'jump', 'target': addresses[target]})
                return steps
            address = target
        else:
            raise ValueError(f'Unmapped effect opcode ${command:02x} at ${source:04x}')
    steps.append({'source': address, 'op': 'jump', 'target': addresses[address]})
    return steps


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('assets/audio'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.archive) as archive:
        program = archive.read('31a11-2.ic42')
        sample_data = archive.read('31j10.ic73')
    commands = []
    for index in range(1, 0x62):
        address = struct.unpack_from('<H', program, 0x21a3 + index * 2)[0]
        commands.append({'command': 0x20 + index, 'priority': program[0x20df + index],
                         'bank': program[0x2141 + index], 'source': address,
                         'steps': compile_script(program, address)})
    samples = []
    for bank in range(2):
        for index in range(128):
            address = bank * 0x40000 + index * 8
            start = int.from_bytes(sample_data[address:address + 3], 'big') & 0x3ffff
            end = int.from_bytes(sample_data[address + 3:address + 6], 'big') & 0x3ffff
            if start < end:
                samples.append({'bank': bank, 'sample': index, 'start': start, 'end': end,
                                'frames': (end - start + 1) * 2})
    manifest = {'version': 1, 'chipClock': 1056000, 'sampleDivisor': 132,
                'sampleClockSource': 'https://github.com/mamedev/mame/blob/master/src/mame/technos/ddragon3.cpp',
                'timerClock': 3579545, 'timerADivisor': (1024 - 0x303) * 64,
                'priorityTableSource': 0x20df, 'bankTableSource': 0x2141,
                'scriptTableSource': 0x21a3, 'commands': commands, 'samples': samples}
    (args.output / 'effects.json').write_text(json.dumps(manifest, indent=2))
    (args.output / 'samples.bin').write_bytes(sample_data)
    print(f'Extracted {len(commands)} sound commands and {len(samples)} banked sample entries')


if __name__ == '__main__':
    main()
