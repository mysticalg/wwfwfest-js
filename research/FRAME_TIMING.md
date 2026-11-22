# Native frame scheduling and input

The match now follows the alternating services in the original main loop. This corrects earlier integrated fixtures that composed the actor/contact kernels with contact and damage service on every update. Those fixtures have been regenerated from the original program with the recovered phase boundary.

## Main loop

The branch at `$000f98` reads bit 0 of the frame counter at `$1c0083`. Both paths update input, camera and actors. Their other work differs:

| Phase | Recovered order used by the native match |
| --- | --- |
| Even, `$000fa8` onward | Input; camera and clamp; actor input/updates; pose cleanup; contact `$023288`; pending damage/combo service `$02407e` |
| Odd, `$00104a` onward | Crowd `$027800`; tile streaming `$025c68`; camera and clamp; input; actor input/updates; pose cleanup |

The original increments the counter at `$0010e8`. Contact acceptance, pending damage and combo timers therefore advance on alternate frames. Actors and descriptor clocks advance every frame. Crowd clocks and chunk streaming also run on alternate frames, before that frame's camera follow. `WorldCamera.stream()` exposes this separation; its standalone `step()` retains an optional combined service for component research.

This is the recovered ordering for the translated subsystems. Grapple arbitration, AI, scene transitions and other unimplemented main-loop services remain separate reconstruction work.

## Input sampling

`src/arcade-input.js` translates `$0050fe`. Directions update each frame. On odd phases the original accumulates physical action buttons, and the following even phase reuses and clears that accumulator. Held values and press edges are derived after this operation. Short physical pulses and releases consequently depend on the sample phase.

The browser passes keyboard, touch and gamepad punch/kick buttons through this latch before calling the match. The dedicated Run and provisional Pin shortcuts remain convenience controls. `Match.step()` accepts logical decoded controls so component fixtures can isolate action handlers; tests of the complete input boundary explicitly use `ArcadeInput` first.

The change applies to all input devices. Standard gamepad mapping, menu/pause/reconnect behavior and dead-zone handling remain in the browser controller adapter. Physical controller acceptance is still unverified.

## Sprite projection

The actor loop at `$00e758` runs collision correction, handler/descriptor clock, screen projection `$00248c`, palette work and then physics `$002218`. Screen coordinates therefore describe the position after the handler but before that update's movement.

Native actors retain this projection snapshot separately from physical positions. A linked actor changed later in the same frame retains its already calculated projection, unless the original handler explicitly projects it again. This avoids displaying movement one original update early and preserves actor-order differences in paired actions.

## Browser pace and audio

`src/timing.js` uses the [MAME WrestleFest machine configuration](https://github.com/mamedev/mame/blob/master/src/mame/technos/ddragon3.cpp): a 28 MHz master divided by four, with 448 horizontal and 272 vertical totals. This gives approximately 57.44485 updates per second, or 17.408 ms per update. MAME marks those totals as estimated; this is a hardware-model estimate, not a measured WrestleFest refresh rate. The data exports `totalsEstimated: true` to keep that limitation explicit.

Audio synthesis retains its independent recovered chip clocks. This frame-rate correction does not resample the music driver or change sample playback pitch. Complete original sound event routing remains unfinished.

## Verification

- 128 input scenarios of 96 updates each compare `$0050fe` against the native latch: **12,288 original input updates**, varying start phases, initial held/accumulated words and physical input bytes.
- 24 composed sequences of 640 updates each compare input, both actors, pre-physics sprite coordinates, camera origins/chunks, every crowd slot, patch events and sound commands: **15,360 original service updates**. All twelve actor types and both starting phases are covered. The passive opponent is outside the controlled actor's depth lane; grapple arbitration and AI therefore do not activate.
- Six standing-combat sequences, six 620-update knockdown/recovery sequences and 612 running-action sequences now run contact/damage on the original phases. The knockdown and running-action comparisons also assert cached sprite projection.
- Standalone handler, geometry, collision and clock fixtures retain their explicitly bounded component scope.

The reference generators execute the supplied program offline with the external analysis interpreter documented in [actor research](ACTORS.md). Browser delivery contains translated functions and recovered data, with no CPU interpreter.

```sh
node tools/trace_arcade_input.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/arcade-input-reference.json
node tools/trace_frame_schedule.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/frame-schedule-reference.json
npm run check
```

These comparisons establish the named services and controlled sequences. They do not establish full match parity, original AI, standing grapples, tag/Rumble rules, entrances or complete scene/audio routing.
