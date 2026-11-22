# Native knockdown, landing and recovery

Normal inside-ring knockdowns now run translated JavaScript handlers and original motion/animation data. They replace the practice prototype's fixed down timer on recovered standing-hit paths. The match renders original world height and routes original landing sounds.

## Recovered paths

| Original address | Role |
| --- | --- |
| `$00259e`, `$0025da` | Select velocity/gravity profile, mirror horizontal velocity |
| `$00de04` | Button-edge recovery selection after the mash threshold |
| `$00fea0`, `$00ff40` | Initialize health-dependent mash count |
| `$00ff44` | Service human button presses during recovery |
| `$010196` | Initialize downed recovery timer from severity/status |
| `$0101dc` | Depth velocity near front/back boundaries during flight |
| `$01034e` | Landing sound, normally command `$29` |
| `$011082` | Get-up handler, descriptor `$011076` |
| `$016d52` | Face-up recovery roll, descriptor `$016d3e` |
| `$0193d2` | Face-down recovery action, descriptor `$0193c6` |
| `$01a374` | Flight reactions 2/3/4, descriptors `$01a354/$01a364` |
| `$01a410` | Landing bounce reaction 5, descriptors `$01a3f8/$01a404` |
| `$01a4c8` | Falling reactions 6/7, descriptors `$01a4a8/$01a4b8` |
| `$01a558` | Downed reactions 8/9, descriptors `$01a540/$01a54c` |
| `$01a680` | Back-hit turn for reactions 11/12/13 |
| `$0240e8` | Health-severity calculation after damage |
| `$027302`, `$0273b4` | Normal inside-ring collision/probe correction |

The ordinary fourth hit within the combo window can select reaction 2. It loads the original signed velocity/gravity profile, advances its descriptor clock, applies a timed position adjustment and detects landing from the ring collision flags. It then enters reaction 5's bounce, another landing, reaction 8/9's downed state, and state 7's get-up animation. Each handler transition retains the original one-update initialization boundary. Back-hit reactions first turn the actor and select their corresponding flight reaction.

Twenty-four original motion profiles are available in `src/data/actor-tables.js`. The normal flight profile has horizontal velocity `$00c0`, vertical velocity `$0300` and gravity `$0038` in signed 8.8 units. Ring ground height is world `$0140`. Collision correction adds to the integer position words while preserving their fractional words. The inside-ring routine includes slanted side boundaries, depth limits `$0118/$0198`, and separate flags for mat/rope contact.

The normal downed timer is 48,128 or 224 updates according to severity, with the recovered status-dependent overrides. The health service uses a literal low-health threshold of 24, followed by twice the truncated maximum-health/3 threshold. Mash counts come from the original four-entry table and maximum-health quarters. Recovery uses button edges, and the edge that reaches the mash threshold is followed by another edge to select the recovery action. A newly changed state cannot consume that recovery request until initialization, matching the original input/update ordering.

The face-up recovery action rolls in depth according to the camera value, then gets up. The face-down action uses its own pose before getting up. A linked pin flag blocks the normal downed timer. The match's existing pin input now waits for the downed phase before it can hold that timer. Pin counting, escapes and win rules still require their complete original handlers.

Zero health does not itself set a permanent-down state in these original handlers. The translated damage response and recovery path now preserve that behavior. Original match defeat is a separate remaining task.

The high reaction flag `$2000`, used by several throws, can select reaction 1's timed stagger after get-up. This now retains the original previous-state and forced-state gates. The standing grapple research adds victim reactions 19,21,22,34,35,41, the normal outside-ring collision plane, rope requests and explicit outside-state handoffs. Those additional throw paths are component-tested and remain separate from normal `Match` gameplay while the rest of the grapple graph is reconstructed. [Grapple research](GRAPPLES.md) records their attacker and paired-sequence coverage.

Probe results now retain the source's collision-word behavior: the face-down downed-state probe replaces the current collision flags, while the horizontal nudge helper preserves the previous flags and refreshes its correction fields. Orphan link cleanup also recognizes a peer's pending unlink marker before the late frame cleanup.

## Projection and current scene

Actor-coordinate conversion uses the reference origin captured with the earlier arena layout, x `$01cd` and y `$0241`. World positions remain independent of the now-moving camera. Rendering uses integer position words as `$00248c` does, then the sprite recipe's inverted projected-y convention. It caches that result before physics, matching the original actor service order. This preserves height and avoids rounding flight/depth fractions into invented pixel positions. [Camera research](CAMERA.md) covers the scrolling layers and camera logic.

Normal walking runs ring correction before movement, including the original boundary overshoot/correction timing. Both the fixed rectangular depth clamp and the former horizontal view limits have been removed. The standing punch's entry nudge also uses the recovered inside-ring routine. Recovery reads the moving camera when selecting roll direction, matching the original global-camera read.

## Verification

`tools/trace_knockdowns.mjs` generates fixtures by executing original routines with the external offline analysis interpreter documented in [actor research](ACTORS.md). The native tests compare:

- 32,768 inside-ring collision cases, including probes, facing, existing flags, depth/mat boundaries and slanted sides.
- 117 complete knockdown/recovery sequences, comparing every update's state, reaction/action, animation clock, pose word, fixed-point position, velocities, gravity, collision flags, recovery/mash counters, facing, status and sound output. Cases cover both directions, normal/severe reactions, near-rope positions, button-mash recovery, blocked recovery and zero health.
- 1,028 health/severity cases and 128 original projection cases, including fractional position round trips.
- Six integrated 620-update controlled-input runs of camera following, actor updates, pose/contact cleanup, contact dispatch and damage service. Four timed standing punches produce a knockdown followed by recovery. Comparisons cover either actor receiving the hits, normal/low/zero remaining health, and human recovery inputs. Positions, poses, ordinary states, contacts, health/severity, combo counters/timers, facing, sound commands and camera origins match each original run.
- Four 428-update walking runs through both axes of the original ring boundaries, with different character speeds, starts and stops.
- Match wiring that prevents a pin during flight and blocks/resumes the downed timer when the provisional pin control is held/released.

Browser checks used a simulated standard gamepad. They observed flight height, bounce/down/roll/get-up states, recovery-button edges, original punch/landing command order, movement after recovery and no page errors. Physical controllers remain unverified.

The integrated fixtures now follow the original alternating contact/damage phase and compare each actor's cached pre-physics screen coordinates. [Frame timing research](FRAME_TIMING.md) covers this correction and the browser input latch.

These checks cover the named normal inside-ring paths. They exclude outside-ring collision modes, rope animation, other throw/airborne handlers, special stagger follow-ups, full pin rules and complete match logic. Practice health initialization and AI remain provisional; ordinary running paths now have separate comparisons in [running research](RUNNING.md). Camera scrolling has separate original-program and pixel comparisons in [camera research](CAMERA.md). The browser contains translated functions and recovered tables. CPU execution is confined to offline fixture generation.

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_knockdowns.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/knockdowns-reference.json
npm run check
```
