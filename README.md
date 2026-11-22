# WrestleFest JavaScript reconstruction

An early editable browser reconstruction from the supplied `wwfwfest.zip` US rev 2 ROM set. The requester asked for a native JavaScript project and confirmed permission to reproduce the game and assets.

The browser runs Canvas rendering and JavaScript game objects. Walking, running/braking/rope rebounds, eight running actions and their ordinary paired captures, standing combat, standing grapples/throws/submissions, normal inside-ring knockdown/recovery, covers/escapes/referee counts, camera following and normal-ring crowd animation use translated arcade routines. Other moves, outside-ring behavior, moving rope graphics, AI and complete match rules remain incomplete. Full arcade gameplay reconstruction remains unfinished.

## Run

Use Python 3 from the repository directory.

```sh
python -m http.server 8765
```

Open http://localhost:8765. GitHub Pages serves the same static files.

## Edit

- `src/game.js` connects recovered walking/running, standing combat, grapples, knockdowns and pins with provisional AI and practice-match rules.
- `src/actors/` contains translated movement, descriptor clocks, standing actions, contact geometry, ring collision, running/braking/rebounds, knockdown/recovery and projection.
- `src/actors/native-contact.js` reconstructs physical-pool contact arbitration and all primary/secondary response entries. Punch/kick responses involving shared native participants are connected to the browser; [shared contact research](research/CONTACTS.md) records comparisons and the remaining adapter/move dependencies.
- `src/actors/grapple.js` contains the reconstructed standing grapple core for continued development. Automatic arbitration now connects it to normal practice input; [grapple research](research/GRAPPLES.md) lists verified paths and remaining services.
- `src/actors/grapple-throws.js`, `grapple-counters.js`, `grapple-victims.js` and `linked-actor.js` reconstruct seventeen throw paths, eleven reversals, additional victim reactions and actor handoffs for continued integration. Their reference sequences cover both participants through recovery, forced running/braking or an explicit unimplemented handoff.
- `src/actors/grapple-submissions.js` and `grapple-services.js` reconstruct the other five headlock selections, held participants, submission completion, partner assistance, mash counters and pursuit. All twenty-two headlock-selected handlers now have native component translations; normal practice input now reaches these handlers. Complete multi-actor contact, tag/Rumble and scene services remain unfinished.
- `src/actors/computer-grapple.js` supplies original clinch/headlock choices, carrying, pin/held escapes and downed recovery decisions during linked exchanges. Editable probability rows are in `src/data/ai-tables.js`; [computer research](research/COMPUTER.md) records scope and comparisons. General walking/standing/running AI remains provisional.
- `src/actors/computer-ground.js` and `ground-actor.js` recover ordinary movement/approach decisions and waiting/retreat continuations. [Ground AI research](research/GROUND_AI.md) records the comparisons, development constructor option and remaining full-match dependencies. Complete browser migration remains unfinished.
- `src/actors/tag.js`, `tag-states.js`, `computer-tag.js` and `tag-targets.js` reconstruct the four-participant corner partner attack and normal tag targeting. [Tag research](research/TAG.md) records the matched prefix and remaining assistance/contact work. These components are not yet connected to the two-wrestler practice adapter.
- `src/actors/match-services.js` supplies original character/AI health initialization, DIP decoding and active-pool damage/status timing. [Match services](research/MATCH_SERVICES.md) records their comparisons and damage-enabled paired submission paths.
- `src/actors/referee.js` reconstructs the original eleven referee states, pin/countout clocks, result requests and count graphics. [Referee research](research/REFEREE.md) records combined hold/referee comparisons.
- `src/actors/pin.js` and `match-actors.js` connect original covers, escapes and referee updates to stable pool records in the playable match. [Pin research](research/PINS.md) records their scope, original-program comparisons and remaining tag/Rumble/control work.
- `src/data/actor-tables.js` contains editable original character speeds, directions, descriptors, contact records, rectangles, motion profiles and mash counts.
- `src/camera.js`, `src/scenery.js` and `src/stage-renderer.js` implement original camera rules, crowd clocks and scrolling stage layers.
- `src/data/stage-tables.js` contains editable camera bounds, crowd visibility/sequence data and patch coordinates.
- `assets/arena-palettes.json` preserves editable stage colors. `tools/extract_stage.py` regenerates the scrolling artwork and data from the archive.
- `src/sprite-recipes.js` expands original raw/compressed/paired/list recipes; `src/renderer.js` draws their tile chains and palettes.
- `src/app.js` connects the controls, match screen and animation explorer.
- `src/arcade-input.js` preserves the original alternating action-button sampling; `src/timing.js` records the estimated video timing used by the browser.
- `assets/poses-*.json` contains editable standalone frame snapshots. Set a frame's `override` property to `true` to draw its edited pieces. Available records carry their original source address.
- `assets/palettes.json` contains editable original RGBA palettes.
- `assets/sprite-indices.png` stores the decoded original four-bit sprite pixels. Each grayscale value divided by 17 is a palette index.
- `src/audio/` contains the native sample decoder, effect sequencer and AudioWorklet output.
- `assets/audio/effects.json` contains recovered effect commands, priorities, source addresses and sample sequences.
- `src/audio/music-sequencer.js` contains the translated score interpreter, pitch behavior, gates, repeats, levels and fades.
- `assets/audio/music.json` contains editable music commands, score graphs and FM instruments.
- `third_party/ymfm/` and `tools/fm_bridge.cpp` contain the synthesis library source used to build the generated JavaScript FM renderer.

Controls use arrows to move, Z to punch, X to kick, C to run, Space to pin, Enter to start and P to pause. Kick near a prone opponent also starts the original cover. Tap punch or kick to escape a cover or help recover while down. Walk close to enter a grapple. When the hold is ready, punch for a headlock or kick for a whip. From a headlock, press punch, kick or both for the selected move, or use directions to carry. Press punch or kick while held to attempt the original headlock reversal. Start running with Run or simultaneous punch/kick presses. Punch or kick while running to attack; push the opposite horizontal direction to brake. Touch controls are available on touch devices.

Standard gamepads use the left stick or D-pad for movement, bottom face button A/Cross for punches, right B/Circle for kicks, left X/Square for running, and top Y/Triangle for pinning. Menu/Options starts a match, pauses, resumes or starts a rematch after the result. View/Share returns to selection while paused. In selection, left/right cycles the player wrestler and up/down cycles the opponent. Connect a controller, focus the page and press a button to expose it to the browser.

The first connected controller is used for the current single-player prototype. A 25% stick dead zone suppresses drift. Losing the active pad pauses the match. Reconnection and background-tab recovery require neutral controls before input resumes. Pads without the browser's standard mapping use the default button order, which may differ by device.

The animation explorer exposes the original frame tables and paired artwork. Use Other wrestler to choose the linked type for holds and throws. The first twelve tables each contain 564 indexed entries and a final terminator; the referee has eighteen indexed entries and a terminator. Missing entries and unsupported pairs remain empty. Correct artwork does not establish the gameplay use or timing of a pose.

Match rendering expands original sprite data at actual projected coordinates, including mirroring and hardware clipping. The explorer preserves standalone JSON snapshots, paired poses and unused markers for continued research.

The translated main loop alternates contact/damage and crowd/streaming services on their original phases. Sprite positions are captured before each physics update, as in the original actor loop. [Frame timing research](research/FRAME_TIMING.md) documents the input latch, service ordering, original-program comparisons and estimated video pace.

## Current scope

Recovered material includes 65,536 sprite tiles, 4,096 background tiles, 4,096 character tiles, original palette data, the wrestler frame lookup tables, standalone sprite chain recipes, and sampled arena and selection layouts.

The playable prototype supports the ten original selectable wrestlers plus optional Legion of Doom bosses, original character/AI health, recovered walking/running/braking/rebounds, eight running actions with ordinary paired captures, standing combat, automatic standing grapples with headlock/throw/submission paths, normal knockdown/recovery, original covers/escapes/referee counts, scrolling through the full normal ring, animated crowd, an optional computer opponent, pause, restart and touch input. Standing/running attack impacts, grapple/throw/submission events, body collisions, landings, footsteps, referee counts and cover results route original sound commands after audio is enabled. Sound explorer plays 97 sample-effect commands and 18 populated music scores through native JavaScript sequencers. Selection and match music also play after enabling audio. FM synthesis uses a JavaScript build of the BSD-licensed ymfm renderer.

Gamepad mapping, menu selection, actions, grapple selection, submission/pin finishes, start/pause, rematch and reconnect behavior are covered by unit checks and browser tests using simulated Gamepad API devices. Physical controller acceptance remains unverified.

Still pending are other move/airborne paths and special running variants, outside-ring behavior, moving rope graphics, other scenery modes, tag-team and Royal Rumble rules, entrances, complete audio routing and full-match parity. Health now follows the original initialization tables, and queued damage uses the original service phase. Paired artwork renders with the linked wrestler type. The ordinary running captures are connected; other shared actions still need integration. Further combat vocalizations and effects await their original event routing. Unsupported scene/outside/control handoffs show a restart prompt. The optional boss double-team move still requires partner/contact services. The recovered random algorithm accepts original register context; complete runtime context and the remaining original AI states remain unfinished. Linked exchanges now use recovered computer decisions; the original match clock, attract scripts and general movement/standing/running AI still need integration.

Research notes and provenance are in `research/REVERSE_ENGINEERING.md`. Browser delivery contains recovered data and native source. Offline analysis used CPU tracing to observe original rendering routines. Those analysis dependencies are excluded from the browser project.

The independent `tools/inspect_rom.py` script regenerates ROM identity, vectors, selected disassembly, the sprite atlas and palettes. It requires Python packages `pillow`, `numpy` and `capstone`.

```sh
python tools/inspect_rom.py path/to/wwfwfest.zip --output rom-analysis
```

This inspection tool preserves pose JSON. `tools/extract_sprite_recipes.py` extracts native recipe data; `tools/export_sprite_poses.mjs` regenerates the standalone snapshots and missing-entry labels without an analysis CPU.

`tools/extract_audio.py` regenerates effect scripts/sample data, `tools/extract_music.py` the score graph/instruments, `tools/extract_actors.py` actor data, and `tools/extract_stage.py` the normal ring layers/crowd. Run `npm run check` with Node.js 22 or newer for syntax, original-program comparisons and controller checks. [Sprite recipes and pixel comparisons](research/SPRITES.md), [actors](research/ACTORS.md), [combat](research/COMBAT.md), [running and rope rebound physics](research/RUNNING.md), [running actions and captures](research/RUNNING_ATTACKS.md), [knockdowns](research/KNOCKDOWNS.md), [camera and stage pixel verification](research/CAMERA.md), [effects](research/AUDIO.md), [music](research/MUSIC.md)

## Rights

Original game artwork, character names, branding and game data retain their original ownership. This repository does not grant third-party rights to those materials. The requester confirmed permission to reproduce them in this session. Hardware research references retain their upstream ownership and licensing.
