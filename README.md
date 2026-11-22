# WrestleFest JavaScript reconstruction

An early editable browser reconstruction from the supplied `wwfwfest.zip` US rev 2 ROM set. The requester asked for a native JavaScript project and confirmed permission to reproduce the game and assets.

The browser runs Canvas rendering and JavaScript game objects. The gameplay loop is in `src/game.js`. Its movement, combat, AI and pinning rules are provisional authored rules. Exact arcade gameplay reconstruction remains unfinished.

## Run

Use Python 3 from the repository directory.

```sh
python -m http.server 8765
```

Open http://localhost:8765. GitHub Pages serves the same static files.

## Edit

- `src/game.js` contains movement speeds, damage, animation sequences, hit checks, recovery, AI and pinning.
- `src/renderer.js` draws recovered sprite chain recipes and original palettes.
- `src/app.js` connects the controls, match screen and animation explorer.
- `assets/poses-*.json` contains editable per-wrestler frame records. Each record carries its ROM source address.
- `assets/palettes.json` contains editable original RGBA palettes.
- `assets/sprite-indices.png` stores the decoded original four-bit sprite pixels. Each grayscale value divided by 17 is a palette index.
- `src/audio/` contains the native sample decoder, effect sequencer and AudioWorklet output.
- `assets/audio/effects.json` contains recovered effect commands, priorities, source addresses and sample sequences.

Controls use arrows to move, Z to strike, X for a heavy strike, C to run, Space to pin, Enter to start and P to pause. Touch controls are available on touch devices.

The animation explorer exposes all recovered frame table entries, including records marked as requiring additional animation context. The first 12 actor types each have 565 entries. The referee has 19 entries. Successful extraction of a frame does not establish the correct gameplay use or timing of that frame.

Native match animations skip unresolved or empty frame records. The explorer preserves those records for continued research.

## Current scope

Recovered material includes 65,536 sprite tiles, 4,096 background tiles, 4,096 character tiles, original palette data, the wrestler frame lookup tables, standalone sprite chain recipes, and sampled arena and selection layouts.

The playable prototype supports ten selectable wrestlers, movement, two provisional attacks, damage, knockdown, pinning, an optional computer opponent, pause, restart and touch input. Sound explorer plays the 97 recovered sample-effect commands through the native JavaScript sequencer. Ring camera movement and scenery animation are pending. Stage images currently preserve one captured layout.

Still pending are faithful arcade state machines, exact move and grapple rules, hitboxes, character statistics, animation timing, tag-team and Royal Rumble rules, entrances, FM music, fade behavior, gameplay sound routing and full-match parity testing. Some compound poses require another object's context. Native match sounds remain unconnected while their original event routing is reconstructed.

Research notes and provenance are in `research/REVERSE_ENGINEERING.md`. Browser delivery contains recovered data and native source. Offline analysis used CPU tracing to observe original rendering routines. Those analysis dependencies are excluded from the browser project.

The independent `tools/inspect_rom.py` script regenerates ROM identity, vectors, selected disassembly, the sprite atlas and palettes. It requires Python packages `pillow`, `numpy` and `capstone`.

```sh
python tools/inspect_rom.py path/to/wwfwfest.zip --output rom-analysis
```

The pose recipe JSON is a separate research export and is preserved by this tool.

`tools/extract_audio.py` regenerates the editable effect scripts and sample data from the ZIP. [Audio research and verification details](research/AUDIO.md) document the original-driver comparisons and their limits. Run `npm run check` with Node.js 22 or newer to check syntax and the audio regression fixtures.

## Rights

Original game artwork, character names, branding and game data retain their original ownership. This repository does not grant third-party rights to those materials. The requester confirmed permission to reproduce them in this session. Hardware research references retain their upstream ownership and licensing.
