# Original referee and count services

`src/actors/referee.js` translates the US rev 2 referee decision and state handlers at `$01eb3a-$01f95e`, reset `$00f958`, count graphics and scene-bit-1 foreground record. These are native JavaScript components. Normal `Match` still uses its provisional pin and has not yet integrated this referee, original pin entry/escape input, the full actor pool or scene progression.

## State and frame order

The referee occupies `$1c11f4`; its state word at offset `$20` is **the same address as the global result request `$1c1214`**. `world.matchResult` and `Referee.state/pendingState` share that word. Submission completion can write `$8009` after the referee has already updated, requesting victory initialization on its next update. Bit 15 means pending initialization here, opposite to the wrestler convention. The current handler and initialized flag live separately in the descriptor word `$1c`.

The main loop samples actor input/AI, updates the referee, updates wrestlers, then runs contact and damage on the appropriate service phase. The composed reference runner preserves that order. Referee byte clocks advance when their low byte reaches zero; the countout handler instead decrements a whole-word clock. They are separate from the ordinary wrestler descriptor underflow clock.

| State | Handler | Behavior |
| --- | --- | --- |
| 0 | `$01ed6c` | Follow participant midpoint and avoid the ring edges |
| 1/2/4 | `$01ee48` | Approach a pin, control switch or submission |
| 3 | `$01ef84` | Outside count and countout result |
| 5/10 | `$01f178` | Return to the ring / Rumble exit |
| 6 | `$01f248` | Pin count, result and linked participant flags |
| 7 | `$01f4e0` | Control-switch gesture and input flags |
| 8 | `$01f57a` | Submission gesture |
| 9 | `$01f614` | Victory gesture, message and participant result requests |

Reset sets role/type, integer positions `(640,408,320)`, pending state zero, movement byte and flag word `$34`. It preserves fractions, clocks, links and other record fields. Palette allocation uses the browser's previously extracted original palettes; reset requests the original controls-refresh byte.

## Pins and results

State 6 starts at pose 4 with 20 updates remaining and decrements immediately. Its seven stages advance after cumulative updates `20,52,108,140,196,228,300`. The numbered counts occur at updates **52, 140 and 228**, with original sound commands `$62,$63,$64`; the count word increments its high byte. Every stage increments only the victim's low pin-status byte at `$109`, retaining the high byte.

Clearing the pin flag cancels counting before stage 6. Once stage 6 is reached, the 72-update tail is irrevocable. Normal matches request `$4000/$4001` winner/loser states on both teams, recover eligible human-team health and then enter victory. Victory changes these requests to `$c000/$c001` after its poses, sound and message writes. Rumble increments eliminations and marks the victim for its separate elimination service.

The Rumble branch at `$01f304` calls `$02057e` while A0 still points to the **referee**. Its assistance cleanup therefore reads the referee record, including the action-word alias at target-X `$60`. The translation preserves this call behavior rather than changing it to clean up the winner.

During the Rumble tail the actors can unlink before stage 7. The original then increments `$109` through a null participant pointer, targeting read-only ROM. The board ignores that write; the native component skips the missing participant write. The offline harness now protects the program ROM mapping too.

The same composed path exposed a missing adapter write on recovery into stagger: `LinkedActor` now applies the knockdown component's combo timer/reset requests to its shared record, as normal `Match` already did. This retains the original 64-update combo timer on entry.

Countout increments every 80 updates, voices counts 17–20, distinguishes one or both participants outside, and retains the source's partner-dependent sound branch. Team recovery `$008bd0` visits the first four pool records, including inactive records; losers marked by forced bit zero are excluded. This shared service now lives in `match-services.js`.

## Original graphics and scene records

`drawCountTiles` preserves the original glyph and attribute writes at `$0c0744/$0c0748`, or `$0c1188` for the secondary region. The 21 original templates provide four rows of one or two digits with attribute `$ea`. Clearing affects only the normal count region. These are character-layer words, separate from the provisional browser counter text.

Scene bit 1 invokes `$00eb24`: it updates the referee's priority and a type-14 foreground clipping record with original coordinates, preserved fractional words and projected position. The full type-14 renderer and scene integration remain pending. Normal referee pose recipes already have separate sprite-rendering comparisons; the referee kernel fixtures omit that sprite writer.

## Original-program comparisons

- **603 referee sequences / 367,620 updates** cover all eleven states, both facings, four mode combinations, three origins, pending/initialized entry, high clock bytes, switch/forced/sound gates, round-specific victory, outside outcomes and pin interruption boundaries.
- **32 reset cases** verify overwritten and preserved record fields, including fractional positions and clocks.
- **42 glyph cases** verify all 21 numbers in both regions and normal-region clearing.
- **176 composed hold/referee sequences / 170,176 updates** combine actions 26,37,54,59 with original health initialization, alternating damage and referee updates. They compare both wrestlers, partner records, referee state/projection, count-layer words, result requests and sounds. All stop at explicit subsequent handoffs; none reaches the 4,000-update observation cap. The 40 action-26 cases that waited in the earlier referee-free fixture now reach their original pin/result handoff.

These are controlled component comparisons, not complete arcade matches. Global multi-actor contact, AI decisions, original pin entry and escape selection, full Rumble winner/spawn service `$01f3a0`, tag rules and subsequent scene transitions remain unfinished. The ordinary game still has a two-wrestler practice structure; its actor pool must be unified with the recovered dispatcher before these results can replace provisional pinning.

```sh
node tools/trace_referee.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/referee-reference.json
COMPOSE=1 DAMAGE=1 REFEREE=1 node tools/trace_grapple_submissions.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/referee-grapples-reference.json
npm run check
```

In PowerShell, set and remove the three environment variables around the second command. `REFEREE_FILTER` / `DETAIL` restrict or expand referee captures; tests accept `REFEREE_FIXTURE` or `THROW_FIXTURE` for private diagnostic rows. Original program images and the external analysis CPU are excluded from browser delivery.
