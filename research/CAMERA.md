# Native camera and scrolling stage

The normal ring now scrolls using translated camera rules. The match can walk across the original inside-ring bounds without the previous horizontal practice-view limits. Native actors render between independently scrolling original background and foreground layers. The crowd runs the original visibility, timing and synchronization rules.

## Camera

| Original address | Role |
| --- | --- |
| `$025b5c` | Select camera subjects and accumulate word-coordinate offsets |
| `$025c00` | Signed average of participant offsets |
| `$025c22` | Limit movement to four pixels per axis per update |
| `$028a62`, `$028ada` | Camera clamp and seven bound records |
| `$026040` | Convert camera origins to the four hardware scroll words |
| `$025d00`, `$025d9c` | Select and advance a streamed 32-pixel boundary |

Default participants contribute offsets from the current view center. Priority 1 focuses on one actor, including height with the original mode-dependent ground offset. Priority 2 holds camera following, priority 3 skips an actor, and priority 4 follows the scene's target point. The translation preserves signed word averaging, integer truncation, four-pixel motion limits, unsigned clamping and both layer origins. Streaming advances one changed chunk per update, with horizontal changes first.

The normal ring's camera limits are x 320–640 and y 512–704. The native camera includes all seven recovered clamp records, but only the normal ring's artwork and current practice-match flow are connected. The other scene/match modes remain separate work.

The match's actor-coordinate origin remains the captured reference used by earlier physics fixtures. World conversion uses that stable origin. Rendering now subtracts the moving camera, so panning does not change collision coordinates. Knockdown recovery reads the current camera value, as the original roll handler does. The integrated controlled-input knockdown fixtures now also compare the original camera update and its effect on recovery direction.

## World tile layers

The map pointer tables begin at `$0262c2` for BG0 and `$0262e2` for BG1. Scene zero uses block tables `$026302/$026402`. The lookup at `$025ece` selects a 320 by 256 pixel block from an eight-column world map, then a 16 by 16 tile record. BG0 stores attribute/code pairs. BG1 stores packed code/color words and uses palette index zero as transparent.

`tools/extract_stage.py` recovers both layers throughout the normal camera's legal range. The resulting images are 640 by 432 pixels, with world-image origin (320,1352). Crop y is `2048 - cameraY + 8`, preserving the board's screen offset. BG0 uses the secondary scroll origin and BG1 the primary origin for the normal `$7c` layer order.

The artwork comes from the supplied background ROM pair and the program's world-block tables. Palette values were recovered from original palette RAM in the existing frame-4500 analysis capture. `assets/arena-palettes.json` preserves those editable colors and the capture SHA-256. Regeneration thereafter uses the archive and that palette file, without executing a CPU.

## Crowd animation

The normal ring has 32 visibility entries and 96 original 64 by 64 pixel patches. Their descriptors begin through the pointer table at `$027ea8`. Patch destinations and data are selected through `$0287ca`, with the normal tables at `$02883a/$028c52`.

`SceneryAnimator` translates the normal ring's `$027800-$027e86` path. It maintains the original 47 four-byte slots, removes no-longer-visible animations, allocates new ones, advances initialized slots first, and initializes new slots afterward. Shared groups copy an existing slot's frame and remaining delay. The source searches only the first 46 slots for synchronization, which is preserved. Byte delays advance on underflow. The original patch queue writer is at `$028690`.

`StageRenderer` draws the world layers and recovered patches directly in Canvas. These are game-specific data and JavaScript functions. No CPU interpreter runs in the browser.

In the actual match, crowd and chunk streaming run on odd frame phases before camera follow. Standalone camera/scenery fixture updates remain service-call comparisons. [Frame timing research](FRAME_TIMING.md) adds 24 original composed sequences covering their frame scheduling alongside input, actors and projection.

## Verification

- 128 original camera scenarios, each 100 updates, compare both origins, all four scroll words and chunk streaming. Cases cover the seven clamp records, priorities, one/four/nine default subjects, inactive actors, mode-dependent height, word arithmetic and moving subjects.
- Five original scenery runs compare every slot, visible animation ID, remaining delay, frame, group and emitted patch across fixed views, panning, diagonal changes, disappearance and re-entry.
- 45 browser render cases match independently rendered original tile RAM byte-for-byte: nine camera positions, each at five crowd timing points including the rare patch and wraparound. Each comparison covers the complete 320 by 240 RGBA stage image, including foreground transparency.
- Rebuilding the captured frame-4500 stage view from world layers and its crowd state also produces an identical image.
- Controlled-input match fixtures retain exact actor/contact/damage/knockdown results while comparing camera movement. Boundary walking now includes both axes for two character speeds.
- Simulated gamepad browser checks traverse both sides of the ring, cross the old view limits, keep actors visible during scrolling, and retain pause/rematch/reconnect and recovery behavior.

The pixel cases cover the stage layers, not the complete HUD/actor frame. Dynamic rope sprites, additional scenery handlers/moods, other world scenes, complete match presentation, standing grapples and the remaining match rules are still unfinished. Ordinary native running has separate comparisons in [running research](RUNNING.md). Physical controller acceptance is still unverified.

## Reproduce

The committed palette data supports deterministic extraction from the supplied archive:

```sh
python tools/extract_stage.py path/to/wwfwfest.zip
```

An original analysis snapshot can recover the palettes initially with `--snapshot path/to/frame.bin`. The external offline interpreter documented in [actor research](ACTORS.md) regenerates behavior and tile-RAM references:

```sh
node tools/trace_camera.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/camera-reference.json path/to/temporary-frames
python tools/hash_stage_frames.py path/to/wwfwfest.zip path/to/temporary-frames
npm run check
```

The CPU dependency and temporary tile RAM captures are excluded from browser delivery. The native stage data, palette JSON, images and translated source remain editable.
