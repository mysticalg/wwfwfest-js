# Reverse engineering notes

## Identity and program layout

The supplied ZIP contains the US rev 2 program pair `31a14-2.ic18` and `31a13-2.ic19`. The even bytes come from IC18 and the odd bytes from IC19, producing a 524,288-byte big-endian Motorola 68000 program. The initial stack is `$1c3bd4` and the reset entry is `$000654`.

`rom-manifest.json` records each input member's length, CRC32 and SHA-256. The original Z80 program is `31a11-2.ic42`. ADPCM data is `31j10.ic73`.

## Confirmed addresses

| Address | Observed role |
| --- | --- |
| `$000434` | Level 2 interrupt, coin input accounting |
| `$000654` | Reset and boot sequence |
| `$000826` | Level 3 interrupt and frame service dispatch |
| `$001e2e` | DIP switch read and packing |
| `$001e7c` | Wait over frame service flag |
| `$001f2e` | Clear working RAM |
| `$001f7c` | Clear background layout buffers |
| `$001fae` | Clear character tile layer |
| `$001fee` | Clear sprite descriptors |
| `$002846` | Assemble ordered sprite list |
| `$002958` | Depth sort object pointers by object word at offset `$0a` |
| `$002a16` | Load palette groups |
| `$002afa` | Allocate sprite palette bank |
| `$002ed2` | Base of 32-byte sprite palette records |
| `$00c43c` | Object sprite preparation |
| `$00c452` | Frame table lookup and sprite recipe expansion |
| `$025708` | Palette transition routine |
| `$03813a` | Relative actor frame-index table offsets |
| `$0381de` | Actor recipe-data base pointers |

The selected assembly listing preserves instructions for boot, input accounting, layer clearing and palette handling. Bounded code ranges include extra decode context before truncating the displayed listing.

## Recovered graphics

Sprite data is assembled from IC9, IC8, IC11, IC10, IC12, IC13, IC15 and IC14 in that order. Four planes occupy offsets 0, `$1000000`, `$2000000`, `$3000000` in bits. Each 16 by 16 tile advances 256 bits within its plane. The x offsets are 0 through 7 and 128 through 135. Y offsets are 0 through 120 in steps of 8.

The renderer ports the recovered chain descriptor behavior. Flag bit 4 flips x, bit 3 flips y, and bits 5 through 7 encode the vertical tile count minus one. The native recipe decoder now expands raw/compressed/paired/list formats into original hardware descriptor coordinates; [sprite research](SPRITES.md) documents its full-frame and pixel comparisons.

The original expander supplies offline reference traces. The native JavaScript decoder reproduces 488,592 frame expansions, including paired types, mirroring and clipping. The animation explorer supplies the other wrestler type for compound artwork. Standalone JSON snapshots now distinguish missing table markers from paired records and support explicit edited-piece overrides. Gameplay action semantics remain a separate translation task.

Each of the first twelve frame tables has 564 indexed entries followed by a terminal word. The referee table has eighteen indexed entries and a terminal word. Snapshot JSON retains those final markers for inspection. Types 10 and 11 contain alternate Legion of Doom graphics. The application exposes their frame records in the explorer.

## Native source and fidelity

[Frame timing research](FRAME_TIMING.md) documents the alternating main-loop services, original action-button latch, pre-physics sprite projection and estimated browser video pace. Integrated actor/contact fixtures now follow the recovered phase scheduling.

`src/renderer.js` reproduces the recovered tile-chain interpretation in Canvas. The legacy `arena.png` files preserve the earlier captured reference view. Normal match rendering now uses recovered scrolling world layers and crowd patches, with native camera/scenery functions documented in [camera research](CAMERA.md).

`src/game.js` combines translated walking/running/rebounds, eight ordinary running actions/captures, standing combat, normal inside-ring knockdown/recovery and camera behavior with provisional match rules. [Actor research](ACTORS.md) covers locomotion, [combat research](COMBAT.md) standing attacks, [knockdown research](KNOCKDOWNS.md) ring collision/recovery, and [camera research](CAMERA.md) scrolling/scenery. [Running research](RUNNING.md) documents ordinary runs, braking and rope rebound physics. [Running action research](RUNNING_ATTACKS.md) covers the eight ordinary running actions, their contacts and paired releases. Other moves, outside-ring behavior, moving rope graphics, AI and pinning remain incomplete.

Next reverse engineering work must map object states and routines to each combat action, recover actual hit regions and damage tables, implement dependent grapple poses, connect original action descriptors and test complete tag and Rumble matches against reference runs.

[Standing grapple research](GRAPPLES.md) now records translated pair arbitration, arena-dependent headlock move choice and linked clinch/hold/carry/whip/escape kernels. They are verified as components and remain separate from normal matches while their selected throws, counters and victim reactions are reconstructed.

The native sample-effect sequencer matches original-driver event traces across 100 scenarios. Its sample playback and verification scope are documented in [audio research](AUDIO.md). The native music interpreter matches 31 original-driver scenarios and drives the JavaScript FM renderer. The score data, synthesis checks and remaining audio work are described in [music research](MUSIC.md). Standing punch/kick hit sounds now use original response commands. Complete gameplay sound routing remains unfinished.

## Actor state work

The first observed player object starts at `$1c05b0`, with a stride of `$10c` bytes for subsequent actor records. Sprite preparation at `$00c43c` and the nearby frame lookup read the actor type at offset `$02`, pose word at `$04`, projected x/y at `$14/$16`, and an auxiliary recipe pointer at `$26`. The pose word's high bit participates in facing. Depth sorting at `$002958` compares the word at `$0a`.

The original routines around `$00cf1e-$00d1d0` inspect the state byte at `$21`, action data near `$60`, input-related bytes near `$a3/$a9`, and linked actor pointers. Ordinary state 0/1 idle/walk paths now have bounded native comparisons. The remaining authored state names do not yet correspond to translated arcade handlers. Combat dispatch and its callees remain the next gameplay translation work.

## Research references

- [FinalBurn Neo hardware driver](https://github.com/finalburnneo/FBNeo/blob/master/src/burn/drv/pst90s/d_wwfwfest.cpp) supplied hardware memory and bitplane descriptions. Its driver source is not included in the browser bundle.
- [iapx86 JavaScript hardware project](https://github.com/iapx86/JavaScript) supplied a temporary offline 68000 trace tool. Its CPU implementation is excluded from the delivered project.
- [Capstone](https://www.capstone-engine.org/) decoded the 68000 instructions for inspection.
