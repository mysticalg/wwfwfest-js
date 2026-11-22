# Native sound reconstruction

## Recovered effect driver

`src/audio/effect-sequencer.js` translates the Z80 command allocator and effect sequencer into JavaScript. `assets/audio/effects.json` contains 97 editable effect scripts, covering commands `$21` through `$81`, plus their original priorities, bank requirements and source addresses. The `$20` effect reset is implemented separately.

The relevant Z80 locations are as follows.

| Address | Role |
| --- | --- |
| `$0066` | Latch command into the circular request queue |
| `$007a` | Dequeue and classify a command |
| `$0097` | Effect command range and priority allocation |
| `$0106` | Stop and reset effect channels |
| `$0150` | Prefer an existing matching priority 11 channel |
| `$017c` | Prefer an existing matching priority 8 channel |
| `$01a7` | Prefer an existing matching priority 6 channel |
| `$026e` | Sample bank selection and affected-channel cancellation |
| `$02f6` | First logical channel script lookup |
| `$0412` | Service all effect channels on Timer A |
| `$0437` | Decrement note delay and interpret a script |
| `$0482` | Sample start command construction |
| `$0523` | Load note duration and optional hold flag |
| `$0550` | Hold the current sample across the next duration |
| `$055f` | Release a held sample |
| `$05b6` | Script jump |
| `$05c6` | Finish a script |
| `$05df` | Stop the current logical channel's sample voice |
| `$060b` | Set sample volume |
| `$20df` | Effect priority table |
| `$2141` | Effect bank table |
| `$21a3` | Effect script pointer table |

The extracted scripts use volume, sample, release and end operations. The extractor also recognizes the driver's jump and timed wait operations. A duration byte of zero represents 256 Timer A services. A hold marker preserves the active sample through following duration records.

Logical channels 0, 1 and 2 route to sample voices 2, 3 and 1 respectively. Voice 0 is reserved for music-related sequencing. The original routines use inconsistent mappings into the started-flag bytes at `$c054-$c056`. The native translation preserves those mappings, including their effect on interruption and bank switching.

## Sample playback

The sample ROM has two 256 KiB banks and 114 valid banked sample-table entries. `src/audio/sample-codec.js` decodes high-nibble-first OKI ADPCM with the original integer predictor and inclusive stop addresses. `src/audio/sample-mixer.js` retains each voice's predictor through live bank changes, ignores a new sample request on an occupied voice, and applies the 16-entry volume table.

`src/audio/effects-worklet.js` runs the sequencer and sample output on the Web Audio rendering thread. Timer A advances from the original 3,579,545 Hz clock and divisor 16,192, recovered from register values `$10=c0` and `$11=03`. Sample output uses the 1,056,000 Hz crystal and divisor 132 specified by the current MAME machine definition. The earlier FBNeo research driver uses a different sample clock, 1,024,188 Hz. The manifest records the selected clock source. Browser output includes four-voice headroom before the destination mix, with final analogue loudness calibration still pending. [MAME machine definition](https://github.com/mamedev/mame/blob/master/src/mame/technos/ddragon3.cpp)

The sample protocol and predictor arithmetic were checked against the primary implementations credited to Mirko Buffoni, Andrew Gardner and Aaron Giles. [MAME OKI sample protocol](https://github.com/mamedev/mame/blob/master/src/devices/sound/okim6295.cpp), [MAME ADPCM predictor](https://github.com/mamedev/mame/blob/master/src/devices/sound/okiadpcm.cpp)

## Verification and its limits

The committed reference fixtures were produced by booting the original Z80 program in an offline analysis CPU and invoking its command service and Timer A effect service. The analysis CPU was iapx86/JavaScript revision `9ca520534893f4348274aa24b979d99697f3102d`. The harness records original sample starts, stops, volume values, bank changes and logical Timer A tick positions.

All 97 isolated commands match. Two targeted overlap scenarios and a seeded 770-request overlap scenario also match, for 100 scenarios total. The comparison preserves note, bank and per-voice order while normalizing consecutive simultaneous stops of independent voices. The busy-status stub acknowledges starts and retains busy flags until explicit stops. These tests establish driver command behavior under that stub. They do not establish cycle-level bus timing or actual note completion under every simultaneous-sound condition.

All 114 banked sample decodes match SHA-256 fixtures produced by an independent integer decoder. Mixer tests cover inclusive sample completion and occupied-voice behavior. Browser checks verify an active AudioWorklet, nonzero generated audio, silence after Stop, concurrent enable requests sharing one context, and desktop/mobile controls. Subjective listening acceptance and physical arcade comparison remain open.

To regenerate the original-driver traces, provide a checkout of the analysis CPU and the extracted Z80 ROM file.

```sh
node tools/trace_effects.mjs path/to/JavaScript/z80.js path/to/31a11-2.ic42 output.json
```

The browser uses the native source in `src/audio`. The offline CPU is an external research dependency of this regeneration tool.

## Remaining audio work

The FM music interpreter, FM instrument rendering, the music sample voice, fade command `$1f`, complete reset behavior, cycle-level timing, and gameplay command routing remain unfinished. The native match continues to use provisional rules. Sound explorer playback provides direct access to the recovered effect commands while those systems are translated.
