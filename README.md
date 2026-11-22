# WrestleFest JavaScript reconstruction

An early editable browser reconstruction from the supplied `wwfwfest.zip` US rev 2 ROM set. The requester asked for a native JavaScript project and confirmed permission to reproduce the game and assets.

The browser runs Canvas rendering and JavaScript game objects. Ordinary walking, standing punches/kicks, contact rules, ordinary hit reactions and normal inside-ring knockdown/recovery now follow translated arcade routines. Other moves, outside-ring behavior, running, camera scrolling, AI and pinning remain incomplete. Full arcade gameplay reconstruction remains unfinished.

## Run

Use Python 3 from the repository directory.

```sh
python -m http.server 8765
```

Open http://localhost:8765. GitHub Pages serves the same static files.

## Edit

- `src/game.js` connects recovered locomotion, standing combat and knockdowns with provisional AI and pinning.
- `src/actors/` contains translated movement, descriptor clocks, standing actions, contact geometry, ring collision, knockdown/recovery and projection.
- `src/data/actor-tables.js` contains editable original character speeds, directions, descriptors, contact records, rectangles, motion profiles and mash counts.
- `src/renderer.js` draws recovered sprite chain recipes and original palettes.
- `src/app.js` connects the controls, match screen and animation explorer.
- `assets/poses-*.json` contains editable per-wrestler frame records. Each record carries its ROM source address.
- `assets/palettes.json` contains editable original RGBA palettes.
- `assets/sprite-indices.png` stores the decoded original four-bit sprite pixels. Each grayscale value divided by 17 is a palette index.
- `src/audio/` contains the native sample decoder, effect sequencer and AudioWorklet output.
- `assets/audio/effects.json` contains recovered effect commands, priorities, source addresses and sample sequences.
- `src/audio/music-sequencer.js` contains the translated score interpreter, pitch behavior, gates, repeats, levels and fades.
- `assets/audio/music.json` contains editable music commands, score graphs and FM instruments.
- `third_party/ymfm/` and `tools/fm_bridge.cpp` contain the synthesis library source used to build the generated JavaScript FM renderer.

Controls use arrows to move, Z to punch, X to kick, C to run, Space to pin, Enter to start and P to pause. Tap punch or kick while down to help recover. Touch controls are available on touch devices.

Standard gamepads use the left stick or D-pad for movement, bottom face button A/Cross for punches, right B/Circle for kicks, left X/Square for running, and top Y/Triangle for pinning. Menu/Options starts a match, pauses, resumes or starts a rematch after the result. View/Share returns to selection while paused. In selection, left/right cycles the player wrestler and up/down cycles the opponent. Connect a controller, focus the page and press a button to expose it to the browser.

The first connected controller is used for the current single-player prototype. A 25% stick dead zone suppresses drift. Losing the active pad pauses the match. Reconnection and background-tab recovery require neutral controls before input resumes. Pads without the browser's standard mapping use the default button order, which may differ by device.

The animation explorer exposes all recovered frame table entries, including records marked as requiring additional animation context. The first 12 actor types each have 565 entries. The referee has 19 entries. Successful extraction of a frame does not establish the correct gameplay use or timing of that frame.

Provisional action animations skip unresolved or empty frame records. Idle/walk use their original resolved pose sequences. The explorer preserves every frame record for continued research.

## Current scope

Recovered material includes 65,536 sprite tiles, 4,096 background tiles, 4,096 character tiles, original palette data, the wrestler frame lookup tables, standalone sprite chain recipes, and sampled arena and selection layouts.

The playable prototype supports ten selectable wrestlers, recovered walking, standing punch/kick, normal knockdown/recovery paths, provisional pinning, an optional computer opponent, pause, restart and touch input. Punch/kick hits and knockdown landings route their original sound commands after audio is enabled. Sound explorer plays the 97 recovered sample-effect commands and 18 populated music scores through their native JavaScript sequencers. Selection and match music also play after enabling audio. FM synthesis uses the bundled JavaScript build of the BSD-licensed ymfm renderer. Ring camera movement and scenery animation are pending. Stage images currently preserve one captured layout, with horizontal view limits for practice play.

Gamepad mapping, menu selection, actions, start/pause, rematch and reconnect behavior are covered by unit checks and browser tests using simulated Gamepad API devices. Physical controller acceptance remains unverified.

Still pending are the remaining arcade state machines, other move/grapple/airborne paths, outside-ring behavior, original health initialization, tag-team and Royal Rumble rules, entrances, complete gameplay sound routing and full-match parity testing. Practice health remains 100 points. Some compound poses require another object's context. Further combat vocalizations and effects await their original event routing.

Research notes and provenance are in `research/REVERSE_ENGINEERING.md`. Browser delivery contains recovered data and native source. Offline analysis used CPU tracing to observe original rendering routines. Those analysis dependencies are excluded from the browser project.

The independent `tools/inspect_rom.py` script regenerates ROM identity, vectors, selected disassembly, the sprite atlas and palettes. It requires Python packages `pillow`, `numpy` and `capstone`.

```sh
python tools/inspect_rom.py path/to/wwfwfest.zip --output rom-analysis
```

The pose recipe JSON is a separate research export and is preserved by this tool.

`tools/extract_audio.py` regenerates effect scripts and sample data from the ZIP. `tools/extract_music.py` regenerates the native score graph and instruments. `tools/extract_actors.py` regenerates actor, contact, motion and recovery data. Run `npm run check` with Node.js 22 or newer for syntax, original-program comparisons and controller checks. [Actor verification](research/ACTORS.md), [combat verification](research/COMBAT.md), [knockdown verification](research/KNOCKDOWNS.md), [effects](research/AUDIO.md), [music](research/MUSIC.md)

## Rights

Original game artwork, character names, branding and game data retain their original ownership. This repository does not grant third-party rights to those materials. The requester confirmed permission to reproduce them in this session. Hardware research references retain their upstream ownership and licensing.
