# Native music translation

## Recovered data and native interpreter

`src/audio/music-sequencer.js` translates the original Z80 music service into editable JavaScript. `assets/audio/music.json` contains 30 command entries, a reachable graph of 19,369 score instructions, 128 FM instruments, pitch-code data, pitch-envelope presets and track-level adjustments. Commands `$01-$12` contain the 18 populated music scores. Entries `$13-$1e` terminate silently in the recovered program.

The score graph preserves source addresses while naming each operation. It supports notes, rests, instrument changes, levels, transposition, fractional tuning, gates, ties, repeats, jumps, pitch envelopes, portamento, LFO controls, noise, tempo changes and global stop. Fade command `$1f` is translated from its separate service routine.

| Original Z80 address | Native role |
| --- | --- |
| `$0369` | Start a music command and initialize channel data |
| `$0620` | Advance global fade |
| `$0668` | Service eight FM channels and the music sample channel |
| `$06e8` | Music sample-channel service |
| `$080d` | FM channel delay and score interpretation |
| `$08c1` | Calculate pitch and fractional tuning |
| `$0991` | Advance pitch envelope |
| `$0a0b` | Advance portamento |
| `$0a4f` | Split note length into gate and release intervals |
| `$0ab7` | Key on and reset applicable pitch state |
| `$0b68` | Adjust carrier levels using algorithm, track level and fade |
| `$0c37` | Music operation dispatch table |
| `$0e30` | Load the 25-register instrument record |
| `$135f` | Instrument pointer table |
| `$145f` | Start of instrument records |
| `$2524` | Music channel pointer groups |

The translation preserves the startup routine's retained accumulator. Starting command N sends eight key-control writes beginning at N-1. It also preserves the original portamento arithmetic and gate behavior. These quirks were retained after comparing the native register stream with original-program execution.

## FM waveform generation

The native music interpreter writes registers into a JavaScript build of Aaron Giles' BSD-licensed ymfm OPM renderer. The original C++ synthesis source, license, bridge and build script are included. Production delivery uses `src/audio/vendor/ymfm.js`. Provenance and rebuild commands are recorded in [third-party source notes](../third_party/README.md).

The AudioWorklet advances the FM renderer at the original clock divided by 64 and the music service at the original clock divided by `1024 * (256 - tempo)`. A tempo write takes effect after the current Timer B interval. The music sample lane shares the original banked sample mixer with the effects. FM and sample output use the machine definition's relative route factors, 0.33 for each FM output and 0.66 for the mono sample output. Physical loudness and analogue filtering remain uncalibrated.

The prototype's selection phase now sends music command `$03`. Match entry sends stop `$00`, effects reset `$20`, observed opening effect `$2f`, and music `$04`. Those choices follow the observed original-program phase transitions in the offline reference run. The current single-match rules are still provisional, so this routing does not establish complete game-flow fidelity.

## Verification

Original-program references cover 5,000 logical Timer B services for each of the 30 command entries, plus a 2,500-service fade and track-switch scenario. All 1,311,833 FM-register and music-sample events match the native interpreter in order, value and logical tick. The reference invokes original routines directly and stubs sample busy status. It verifies these bounded score runs and transitions. Cycle-level CPU timing, all possible interruption schedules and physical chip output remain outside that proof.

The generated JavaScript FM renderer was compared with a separately compiled WebAssembly build of the same pinned ymfm source. Both generated identical integer samples for one chip-clock second of each populated score and for all 128 instruments including key-off. The 146 cases cover 1,268,884 generated FM samples. Production initialization and rendering were exercised while `globalThis.WebAssembly` was unavailable.

Browser checks exercise original music playback, fade to silence, desktop/mobile controls and AudioWorklet output. The browser makes zero `.wasm` requests. Subjective listening acceptance, longer score runs, analogue output calibration and complete gameplay sound routing remain pending.

Regenerate the original music-driver fixtures with the external offline Z80 analysis dependency and the supplied sound program.

```sh
node tools/trace_music.mjs path/to/JavaScript/z80.js path/to/31a11-2.ic42 music-reference.json
```

To regenerate synthesis references, build the separate QA backend outside the served project, then run the comparator.

```sh
python tools/build_fm.py --emcc path/to/emscripten/emcc.py --reference-wasm path/outside/project/reference.mjs
node tools/trace_fm.mjs path/outside/project/reference.mjs fm-reference.json
```

The browser regression checks and `npm run check` cover the integrated player and committed reference fixtures. The full-game objective remains unfinished while actor state machines, moves, match rules and their audio requests are reconstructed.
