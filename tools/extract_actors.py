"""Recover actor movement and animation data from the US rev 2 program pair."""
import argparse
import json
import struct
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('src/data/actor-tables.js'))
    args = parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        even = archive.read('31a14-2.ic18')
        odd = archive.read('31a13-2.ic19')
    program = bytearray(len(even) * 2)
    program[::2], program[1::2] = even, odd

    def words(address, count):
        return list(struct.unpack_from(f'>{count}H', program, address))

    def descriptor(address):
        update, mode, count = struct.unpack_from('>IHH', program, address)
        if not mode:
            count = 0
        return {'source': address, 'update': update, 'mode': mode,
                'delays': words(address + 8, count),
                'poses': words(address + 8 + count * 2, count)}

    # These four descriptors are selected by $010950. They share $010892's
    # update dispatch. Preserve source addresses so later state work can reuse them.
    data = {
        'walkSpeeds': list(program[0x108ee:0x108ee + 12]),
        'alternateWalkSpeeds': list(program[0x108fa:0x108fa + 12]),
        'runSpeeds': list(program[0x10f8a:0x10f8a + 12]),
        'runProximityInput': program[0xa3],
        'runAnimations': {name: descriptor(address) for name, address in {
            'run': 0x10ea2, 'brake': 0x10fc2, 'rebound': 0x11010,
        }.items()},
        'runningMoveRows': list(program[0xd2b0:0xd2f8]),
        'runningMoveTables': [list(program[address:address + 9]) for address in
                              struct.unpack_from('>12I', program, 0xd73e)],
        'runningAttacks': {str(action): descriptor(struct.unpack_from('>I', program, 0x11854 + action * 4)[0])
                           for action in (1, 4, 5, 32, 42, 45, 64, 65)},
        'runningPairedAnimations': {'runningCapture': descriptor(0x12168), 'airborneCapture': descriptor(0x11e32)},
        'grappleWeights': words(0xeab8, 44),
        'grappleRumbleWeights': words(0xeb10, 4),
        'grappleFollowRows': list(program[0xd472:0xd4ba]),
        'standingMoveTables': [list(program[address:address + 64]) for address in
                               struct.unpack_from('>12I', program, 0xd73e)],
        'grappleRegionRules': [words(0x1fb12 + index * 6, 3) for index in range(18)],
        'grappleRegionSides': list(program[0xdb57:0xdb66]),
        'grappleMoveRemaps': [],
        'grappleContestTables': {name: list(program[address:address + count]) for name, address, count in (
            ('kind0AI', 0x105ec, 33), ('kind0Human', 0x1060a, 3),
            ('kind1AI', 0x1060d, 55), ('kind1Human', 0x1063f, 5),
            ('kind1Rumble', 0x10644, 5), ('kind2AI', 0x10649, 3),
            ('kind2Human', 0x1064c, 3), ('kind3', 0x1064f, 3),
        )},
        'grappleThrows': {str(action): descriptor(struct.unpack_from('>I', program, 0x11854 + action * 4)[0])
                          for action in (2, 24, 25, 36, 38, 40, 43, 44, 47, 48, 50, 51, 52, 58, 66, 67, 68)},
        'grappleCounters': {str(action): descriptor(struct.unpack_from('>I', program, 0x11854 + action * 4)[0])
                            for action in (6, *range(125, 136))},
        'grappleSubmissions': {str(action): descriptor(struct.unpack_from('>I', program, 0x11854 + action * 4)[0])
                               for action in (26,37,54,59,137,93,94,95,96,98,99,110,111,138,141)},
        'grappleSubmissionVariants': {'pursuitWait': descriptor(0x1100a)},
        'grappleThrowVariants': {name: descriptor(address) for name,address in (
            ('largeTarget',0x1789c),('wallSlam',0x1421e),('alternateLift',0x15ebe))},
        'automaticPinThresholds': words(0x10308, 12),
        'grappleVictims': {str(reaction): descriptor(struct.unpack_from('>I', program, 0x1a214 + reaction * 4)[0])
                           for reaction in (14, 19, 21, 22, 33, 34, 35, 36, 37, 38, 41)},
        'grappleAnimations': {name: descriptor(address) for name, address in {
            'contested': 0x11690, 'entry': 0x116a8, 'control': 0x11722,
            'hidden': 0x11800, 'hold': 0x13f20, 'carry': 0x13fca,
            'whip': 0x1406c, 'clinchStrike': 0x157aa, 'break': 0x17dce,
            'held': 0x19772, 'escape': 0x197d4, 'stagger': 0x1a2fc,
        }.items()},
        'inputDirections': words(0xe516, 16),
        'polarX': words(0x2388, 65),
        'polarY': words(0x240a, 65),
        'walkAnimations': [descriptor(address) for address in
                           (0x10832, 0x1084a, 0x10862, 0x1087a)],
        'standingAttacks': [descriptor(address) for address in (0x11a90, 0x19206)],
        'standingReactions': [descriptor(address) for address in (0x1a2c0, 0x1a612)],
        'contacts': [list(program[0x2411c + index * 7:0x2411c + (index + 1) * 7])
                     for index in range(34)],
        'attackRectangles': [list(struct.unpack_from('>4b', program, 0x2420a + index * 4))
                             for index in range(11)],
        'hurtRectangles': [list(struct.unpack_from('>4b', program, 0x24236 + index * 4))
                           for index in range(11)],
        'reactionFacingMap': list(program[0x23fde:0x23fde + 36]),
        'motionProfiles': [list(struct.unpack_from('>3H', program, 0x25da + index * 6))
                           for index in range(38)],
        'recoveryMashCounts': list(program[0xff40:0xff44]),
        'heldMashCounts': list(program[0xff2a:0xff40]),
        'directionQuadrants': list(program[0x2194:0x2198]),
        'attackAssistTimers': words(0x20952, 3),
        'victimAssistTimers': words(0x20a1e, 3),
        'teamRecovery': words(0x8c24, 4),
        'knockdownAnimations': {name: descriptor(address) for name, address in {
            'flight': 0x1a354, 'flightSevere': 0x1a364,
            'bounce': 0x1a3f8, 'bounceSevere': 0x1a404,
            'fall': 0x1a4a8, 'fallBack': 0x1a4b8,
            'down': 0x1a540, 'downBack': 0x1a54c,
            'turn': 0x1a67a, 'getup': 0x11076,
            'rollRecovery': 0x16d3e, 'backRecovery': 0x193c6,
            'captureWait': 0x1a940, 'grabbed': 0x1a9d6,
            'ropeStagger': 0x1acc2, 'bump': 0x1ad30, 'released': 0x1ad80, 'runReleased': 0x1ae62,
        }.items()},
    }
    for address in struct.unpack_from('>12I', program, 0xdaee):
        entries = []
        while program[address] != 255:
            entries.append(list(program[address:address + 3]))
            address += 3
        data['grappleMoveRemaps'].append(entries)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        '// Generated by tools/extract_actors.py from wwfwfest US rev 2.\n'
        '// Original table addresses are documented in research/ACTORS.md.\n'
        'export const actorTables = ' + json.dumps(data, indent=2) + ';\n',
        encoding='utf-8')
    print(f'Recovered movement, {len(data["walkAnimations"])} walk descriptors, '
          f'{len(data["standingAttacks"])} standing attacks and {len(data["contacts"])} contact records')


if __name__ == '__main__':
    main()
