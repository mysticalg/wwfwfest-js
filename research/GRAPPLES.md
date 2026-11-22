# Standing grapple reconstruction

`src/actors/grapple.js` translates standing grapple arbitration, arena-dependent move selection and the linked clinch/hold kernels. This is a research module. Normal `Match` gameplay does not yet invoke it. The playable release still lacks standing grapples; connecting an incomplete move graph would strand wrestlers in unsupported actions.

## Recovered routines

| Original address | Translated role |
| --- | --- |
| `$00e7b4`, `$00e824` | Pair spacing/status checks, control selection, centering and linking |
| `$00ea28` | Grapple eligibility |
| `$00eab8`, `$00eb10` | Normal-round and Rumble control weights |
| `$00d3c0`, `$00d3f0` | Contested clinch and controlled clinch action choice |
| `$00d414`, `$00da6e` | Headlock follow-up rows, alternating severity bits and move remaps |
| `$0104de` | Four probability gates shared by moves, counters and recovery |
| `$01fab4`, `$01fb12` | Arena position classification and boundary records |
| `$0116b4` | State 11 contested clinch |
| `$01173a` | State 12 controlled clinch, input window and timeout swap |
| `$01180c` | State 255 hidden linked participant and orphan cleanup |
| `$0157c2` | Action 41 clinch strike, sound and control progression |
| `$013f34`, `$013fe2` | Actions 21/22 hold and carry |
| `$014080` | Action 23 rope whip and forced-run handoff |
| `$017dd4` | Action 80 forced break |
| `$019778`, `$0197e0` | Actions 123/124 held participant and escape/reversal |
| `$01a30c` | Reaction 1 stagger after a break |

Editable descriptors, weight tables, move rows, remaps and region boundaries are recovered by `tools/extract_actors.py` into `src/data/actor-tables.js`.

## Pair entry and control

The original requires initialized eligible states, opposite facing bytes, compatible team/status flags, horizontal distance below 72 and depth distance below 16. Ordinary idle/walk, two standing reactions and the standing kick can qualify. Forced, excluded or already linked actors cannot enter.

Control depends on status priorities, stagger state, actor order, frame phase and—in the human-versus-AI branch—round weights plus random entropy. Attract mode compares health instead. The translation preserves those different paths. It centers integer position words with the original wrapping arithmetic while keeping each actor's fractional words, advances the four-entry grapple index and creates mutual links.

`startGrapple()` takes an explicit `randomNibble` for the weighted branch. The original RNG also mixes machine registers and the global frame count; the complete native RNG context is still unfinished. Fixtures observe the actual original RNG return without replacing that routine. These checks establish the arbiter given that entropy, not a complete deterministic game-wide RNG translation.

`grappleContest()` translates the four gates dispatched by `$0104de`. Kind 1 includes the original AI-actor bypass, opponent/mode/round table choice and low-byte attempt index clamped to four. Kind 0 uses a strict random-value comparison; kinds 1–3 use inclusive comparisons. Entropy is explicit here too. Caller-owned attempt counters and the resulting success/counter action changes remain part of each move handler's remaining translation.

## Linked state behavior

`GrappleActor` retains the original separation between pending state, initialized handler/clock state and the previous state. A peer can change another actor before or after its update, and those changes remain pending for that actor's next dispatcher call. The control timeout explicitly projects its peer again, matching the original exception to the usual cached projection order.

The core includes the entry pose, contested strike blocking, two-strike control progression, the controlled input window, timed control swaps, periodic hold damage requests, carrying at half the original walk speed, forced breaks and victim escape/reversal. Rope whips create the original state-2 run handoff with the forced-bounce count and actor links/statuses intact. The external actor dispatcher must complete that handoff.

The headlock follow-up selector alternates a separate bit for each target severity band. Some selected moves are remapped according to facing and an arena position bucket. That bucket comes from world coordinates and status flags, not the player's joystick. The raw selector is translated, but its full set of selected throw/submission handlers and counter branches is not connected yet.

Late auxiliary-link cleanup keeps invisible or forced actors linked. Orphaned hidden participants clear the original status masks and input-block fields. Probe corrections remain in their source fields when a later stationary update does not run collision; only the per-update collision flags are cleared.

## Original-program comparisons

`tools/trace_grapples.mjs` executes the supplied US rev 2 program offline with the external analysis interpreter documented in [actor research](ACTORS.md). The native checks compare:

- **384 eligibility cases**, including initialized states, allowed low-byte reactions/actions, mode gates, forced/exclusion flags and occupied auxiliary links.
- **1,464 pair decisions**, including priority/status combinations, frame phases, round weights with observed entropy, distance boundaries, attract-mode health, wrapping centers and index arithmetic.
- **12,288 probability-gate cases**, covering all four gates, actor/opponent AI combinations, both mode branches, four round values, three severity bands, low-byte attempt boundaries and observed entropy from sixteen RNG seeds per configuration.
- **12,960 headlock move selections**, including all twelve actor types, three severity bands, both alternating sets, three action-button combinations, both facings, hold/carry states and fifteen source region values.
- **1,120 arena region cases** around the original coordinate boundaries and status-dependent row ranges.
- **1,320 linked actor sequences**, including all twelve actor types, both facings, three ring positions, either actor holding control, simultaneous requests, strikes, hold/carry/escape, whips, timeouts, breaks, stagger and orphan cleanup. These compare clocks, state/action/reaction, fixed positions, cached projection, motion fields, collision/probe fields, status, counters, damage requests, links and sound output at each sampled step.

The linked sequences contain **327,960 sampled updates**, including the explicitly recorded handoff boundaries.

The linked sequences stop at a handoff to an actor state outside this module. They use the original input choice, state initialization, handler/clock, projection, physics and late pose/link cleanup. They do not invoke global contact/damage, AI or match-rule services, so pending damage and combo writes are compared before those services. Orphan fixtures isolate the relevant actor kernel; the other actor is retained as linked state without running its unrelated idle handler. These are component comparisons, not full match parity.

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_grapples.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/grapples-reference.json
npm run check
```

For diagnosis, `SEQUENCE_FILTER` accepts a JSON object of sequence fields such as `type`, `plan`, `facing`, `x` and `controllerIndex`. `DETAIL=1` includes sampled rows. `GRAPPLE_FIXTURE` selects an alternate fixture path for the native grapple test. Keep detailed captures outside browser delivery.

## Remaining integration

Next work must translate the headlock-selected throw/submission handlers, their success/counter helpers and victim reactions, then connect the arbiter before normal actor input. Normal runs, knockdowns and idle cleanup must accept grapple handoffs with their full flags and links. Global damage/combo timing, AI decisions, tag/Rumble alternatives and complete sound/scene routing then need composed original-game comparisons and browser gamepad checks.

The recovered headlock tables select action IDs `2,24,25,26,36,37,38,40,43,44,47,48,50,51,52,54,58,59,66,67,68,137`. Their descriptors are addressed through `$011854 + action * 4`. Some invoke additional counter actions and victim states, so translating only those twenty-two attacker handlers will not by itself close the interaction graph. For example, action 25 uses its prior `$f4` attempt count and the kind-1 gate before choosing its ordinary path or action 131; action 38 similarly uses `$f8` and can select action 133. Submission completion at `$010408` also enters match/partner services and remains separate work.

The browser still executes native JavaScript throughout. CPU execution remains confined to offline fixture generation, and the external CPU dependency is excluded from this repository.
