# Standing grapple reconstruction

`src/actors/grapple.js` translates standing grapple arbitration, arena-dependent move selection and the linked clinch/hold kernels. Normal `Match` gameplay now invokes automatic arbitration before input and updates linked participants through native JavaScript. Headlock choices, throws, reversals, held participants, submissions and pin/referee handoffs are connected in the two-wrestler practice match. Complete game rules remain unfinished.

`src/actors/grapple-throws.js` translates seventeen selected attacker handlers. `src/actors/grapple-counters.js` translates eleven reversals and the linked counter pose. `src/actors/grapple-victims.js` supplies eleven additional victim reactions through the existing knockdown/recovery code. `src/actors/linked-actor.js` keeps actor identities stable while these paths pass through grapples, knockdowns, get-up, forced running/rebounds/braking and ordinary idle. All twenty-two headlock-selected handlers now have translations. Additional game-wide contact, AI, tag/Rumble, outside and scene services remain unfinished.

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

`grappleContest()` translates the four gates dispatched by `$0104de`. Kind 1 includes the original AI-actor bypass, opponent/mode/round table choice and low-byte attempt index clamped to four. Kind 0 uses a strict random-value comparison; kinds 1–3 use inclusive comparisons. Entropy is explicit here too. The seventeen translated attackers preserve their caller-owned attempt counters, success/counter transitions and unsigned wraparound; other move callers remain separate work.

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

### Translated throw paths

| Action | Attacker handler | Important victim or completion behavior |
| --- | --- | --- |
| 2 | `$011c48` | Reaction 41 short stagger followed by flight reaction 3 |
| 24 | `$014148` | Reaction 34, preserving its distinct landing probe and whole-word reaction reset |
| 25 | `$014246` | Normal/wall descriptors, reactions 33/37, or counter 131 |
| 36 | `$015296` | Reaction 22, including the branch that leaves the ring |
| 38 | `$015498` | Delayed airborne profile 18, heavy reaction 5, or counter 133 |
| 40 | `$015676` | Airborne profile 29, heavy reaction 5, or counter action 125 |
| 43 | `$0158da` | Follow-up entry, wall reaction 37, normal reaction 36, or counter 127 |
| 44 | `$015b38` | Reaction 21, type-dependent automatic pin request |
| 47 | `$015ede` | Repeated lift, character-specific descriptor/release, or counter 129 |
| 48 | `$016088` | Follow-up entry, heavy reaction 19, or counter 126 |
| 50 / 66 | `$0163d4` | Three repeated damage requests, different release timing and damage |
| 51 | `$0164c2` | Suspended wall descriptor, heavy reaction 5/37, or counter 132 |
| 52 | `$0166ea` | Airborne profile 25, reaction 35, or counter action 134 |
| 58 | `$016e58` | Reaction 21 with heavy-status flags and automatic pin request |
| 67 | `$01777c` | Persistent probe, airborne profile 9, reaction 6, or counter 128 |
| 68 | `$0178a8` | Heavy reaction 5, large-target entry descriptor, or counter action 130 |

The additional victim reactions are 14,19,21,22,33,34,35,36,37,38,41. They preserve byte versus whole-word reaction writes, depth velocity, landing probes, position shifts, rope requests and the high status flag that can select a timed stagger after get-up. Reaction 14 uses the distinct motion link at actor offset `$92`, copies only integer position words and delays physical flight until its descriptor requests it. The normal scene's outside-ring collision plane at `$0274ae` is also translated; full outside-ring controls, presentation and rules remain unfinished. Reactions 14/22 can hand off to outside action 104, which remains an explicit dependency.

Reversals 125–135 preserve their original wait/descriptor loops. The first group swaps control back into paired hold actions, with different facing and hold flags. The second group selects victim reaction 14 and the peer's action `$c006`, retaining mutual motion links, damage requests, pose writes and depth adjustments. Action 6's contact/hold behavior is translated separately from ordinary standing attacks.

Forced running reuses the native `Running` class with input explicitly sampled before either actor updates. A newly released participant can therefore initialize its run later in that same frame without consuming an input sample early. Comparisons retain the separate initialized/input bits in the state word and descriptor flags. The controlled references request braking only after the forced rebound count reaches zero.

The Rumble input path also preserves `$00e61e`'s absolute byte read at ROM `$00a3` (value `$ff` in this set), rather than substituting the actor's action-button byte. Near an opponent, with one forced rebound remaining, it sets the one-time flag in the high byte of word `$46` and invokes probability gate 3 before selecting braking. Entropy for this input-phase request is compared separately from handler requests.

Collision probes also preserve the source's mutable padding word. `$027302` can negate that stored horizontal probe before collision, while the nudge/probe wrappers clear it afterward. Action 67's persistent probe makes this distinction observable. Its completion retains both original automatic-pin requests and the later damage write that supersedes its earlier request.

Automatic pin requests at `$0102cc` use the original per-type thresholds and observed RNG bytes in research comparisons. Partner assistance at `$010320` retains the target partner's status change. Neither establishes complete pin/tag rules. Message IDs, screen shake, sound commands and original motion profiles are retained by the attacker handlers.

Additional original-program comparisons cover:

- **2,928 attacker-kernel sequences, 264,758 sampled updates**, including every actor type, both facings, central/edge origins, human/AI gates, counter selection, attempt wraparound, high action flags, alternate descriptors, follow-up entries, lost/marked links and partner flags.
- **290 victim sequences, 64,166 sampled updates**, including health bands, heavy flags, near-depth boundaries, recovery mash input and outside/Rumble branches.
- **32,768 outside-plane collision cases**, including status flags, probes, facing and slanted barrier boundaries.
- **484 reversal-kernel sequences, 84,440 sampled updates**, covering all eleven reversals, both actor orders/facings, ring positions and status variants.
- **2,928 composed throw sequences, 1,004,190 sampled updates**, using `LinkedActor` to update both participants in their original order. Of these, 2,840 reach initialized idle, 26 stop at outside handoffs, and 62 retain a pending state through the 700-update observation limit.
- **484 composed reversal sequences, 166,578 sampled updates**, including hold swaps, escapes, counter flights, forced runs/rebounds and controlled braking. Of these, 464 reach initialized idle and 20 stop at outside handoffs. These compare actor paths, not complete matches.

The composed throw/reversal references deliberately isolate actor handlers: global hit/damage service, AI action decisions and the main match-rule services are excluded. Pending damage, automatic pin requests and partner flags are compared as requests; practice health is not used to claim final original damage-service integration. Additional hold fixtures described below include damage and the referee; the older throw/reversal pin waits still require their corresponding rule services.

The raw-pointer cleanup at `$010812` treats a peer's high unlink marker as breaking mutual linkage immediately. The hidden-participant handler instead compares masked 24-bit pointers. This distinction matters when the first actor finishes a move before the second actor updates that frame, and is preserved.

```sh
node tools/trace_grapple_throws.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/grapple-throws-reference.json
COMPOSE=1 node tools/trace_grapple_throws.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/linked-throws-reference.json
node tools/trace_grapple_victims.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/grapple-victims-reference.json
npm run check
```

In PowerShell, set `$env:COMPOSE='1'` before the second command and remove it afterward. `THROW_FILTER` and `VICTIM_FILTER` restrict diagnostic scenarios; `DETAIL=1` includes rows. The matching tests accept `THROW_FIXTURE` / `VICTIM_FIXTURE` paths for temporary detailed captures.

Generate the separate reversal fixtures with `ACTION_SET` set to JSON `[125,126,127,128,129,130,131,132,133,134,135]`: first without `COMPOSE` for `grapple-counters-reference.json`, then with `COMPOSE=1` for `linked-counters-reference.json`. Remove both variables before regenerating the ordinary throw fixtures.

### Remaining headlock selections and held participants

`grapple-submissions.js` translates the other five headlock-selected actions. Together with the seventeen throw paths above, this covers the handlers selected by all twenty-two headlock table entries. These translations are now reachable through normal `Match` grapple input, with the limits below.

| Action | Handler | Recovered behavior |
| --- | --- | --- |
| 26 | `$014468` | Counter 135, landing, pin-hold victim 94, forced/elimination release |
| 37 | `$01536e` | Repeated hold damage, victim 96, contact request `$801e`, completion 138 |
| 54 | `$016b6a` | Mutual-link guard, victim 99, contact request `$8015`, paired completion 110/111 |
| 59 | `$016f52` | Throw into victim 141, wait for landing, pursue an integer target, victim 98 hold and completion 110/111 |
| 137 | `$019e00` | Facing from team status, hidden peer, loop/contact request `$401a`, one-time position shift |

The held participant actions `93,94,95,96,98,99` share `$018776`. They initialize their distinct mash modes, preserve the hidden clock, request partner assistance, and process human mash input after initialization. Action 94 suppresses mashing at zero health. Completion actions 110/111 retain their separate mode-zero timers, pose and depth writes, outside/control handoffs and status cleanup. Action 138 releases a participant with the original facing and position writes; action 141 retains its two landings and the high action flag that releases action 59's pursuit phase.

`grapple-services.js` translates the general mash initializer `$00fea0`, held input `$00ff44`, partner entry `$0207dc/$020958`, partner motion cleanup `$010672`, completion cleanup `$0204c6/$02057e` and submission gate `$010408` for these paths. Submission completion requires two eligible zero-health visits. The second visit retains the match result, forced winner/loser status, team health recovery `$008bd0`, control/assistance changes and the winner text request. Rendering that text and advancing the complete scene remain separate services.

The Rumble victim helper searches eligible actor slots 4–8 by the original wrapped Manhattan distance. Pursuit uses the integer direction service `$0020d8`, including signed word differences, saturation and quadrant offsets, rather than trigonometry. The separate weighted Rumble pin entries 72/74 and the invalid action-83 assistance re-entry remain explicit dependencies; these are not exercised by the five headlock selections above.

Additional original-program comparisons cover **2,560 helper cases** and **3,960 direction cases**. Helper fixtures include actor and partner status, assistance pointers, controller flags, health/recovery words, global requests, sounds and the submission gate's carry result. The headlock/held-state fixtures compare both primary participants and their partner records: **1,392 kernel sequences / 324,566 updates** and **1,392 composed sequences / 691,451 updates**. They exercise every actor type for the five selected moves, both facings, edge/center origins, AI/mode variants, forced release, zero-health completion, partner control, pursuit phase entries, invalid links and held-state mash input.

Of the composed sequences, 540 reach initialized idle, 100 stop at an explicit handoff and 752 remain pending at the 700-update observation limit. The references continue to exclude global damage, contact, AI and complete match-rule processing. Ordinary holds can therefore remain pending at that limit. In particular, action 137 exposes its contact request for the separate multi-actor contact service, and action 26 waits for the pin/elimination services. Those waits do not establish complete move or match parity.

The expanded global comparisons also verify the original refresh byte at `$1c1697` during ordinary flight entry, get-up completion, stagger completion and forced-run idle cleanup. These writes share the same world field as partner control restoration. Held and normal downed mash processing use the same `$00ff44` translation, including its global prompt request.

Forced participants released into running also pass their high forced flag through the shared dispatcher. The original `$010eee` handler selects braking after initialization even while a forced rebound count remains; this is distinct from an ordinary directional brake request in the input phase.

```sh
node tools/trace_grapple_services.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/grapple-services-reference.json
node tools/trace_grapple_submissions.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/grapple-submissions-reference.json
COMPOSE=1 node tools/trace_grapple_submissions.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/linked-submissions-reference.json
```

In PowerShell, set and remove `COMPOSE` as above. The submission tracer accepts `THROW_FILTER` / `DETAIL`; its tests accept `THROW_FIXTURE`. Helper tests accept `SERVICE_FIXTURE` for diagnostic captures.

### Work still required

Automatic arbitration now precedes normal actor input. Stable pool records update both participants, then release recovered idle/running handoffs into the existing movement adapters. Shared health/damage and the referee continue during holds. Next work must recover full interruption/contact responses, original AI decisions, tag/Rumble alternatives, outside behavior and complete sound/scene routing.

The recovered headlock tables select action IDs `2,24,25,26,36,37,38,40,43,44,47,48,50,51,52,54,58,59,66,67,68,137`. Their descriptors are addressed through `$011854 + action * 4`. Translating these twenty-two attacker handlers and the participant states above does not by itself close the interaction graph. Pin/tag controls, hold interruption, full outside behavior and scene progression still need their owning services. [Original initialization and damage](MATCH_SERVICES.md) are now connected to the playable match and to additional paired submission comparisons. The older component fixtures retain their explicit controlled health values.

[The native referee](REFEREE.md) adds eleven original state handlers and a further 176 composed hold sequences with health, damage, counts and results. All reach an explicit subsequent handoff; this closes the action-26 pin waits in the matching damage-only fixture. The apparent global result word `$1c1214` is actually the referee's state word, so late submission requests and next-frame referee initialization share the same native field. [Original covers and human escapes](PINS.md) now use the shared dispatcher and referee in normal practice input. Standing-grapple arbitration and selected moves now use normal practice input.

The browser still executes native JavaScript throughout. CPU execution remains confined to offline fixture generation, and the external CPU dependency is excluded from this repository.

## Playable integration in 0.1.18

`MatchActors` updates arena regions before original pair arbitration, attaches the two stable actor records, runs original human clinch/headlock input and retains the recovered actor order. The human idle input path also performs the original facing update before pending idle initialization. `participantFacing` translates `$00fe28`, including prone/ground-hold anchor offsets and unsigned word wrapping. Recovered forced-running releases return to the running adapter; unsupported outside/control/scene states remain explicit handoffs with a browser restart prompt.

**432 composed practice sequences / 323,402 updates** compare all twelve actor types, both facings, three target health/severity bands, both headlock-table severity toggles and all three action-button combinations. They include original arbitration, region classification, input, both actor handlers, referee, projection, alternating full contact/damage services, health, sounds and count graphics. The references observe original entropy values and replay those at the corresponding native calls. AI decisions and full scene progression are excluded; sequences stop at a supported idle return, an explicit next-service boundary or the 1,800-update observation limit. These are bounded comparisons, not full-match parity.

Of those sequences, 290 reach the initialized idle stop, 34 reach a next-service boundary and 108 reach the observation cap. Capped holds and the boss partner move still depend on excluded services or further participant input; their matching prefixes do not establish completion.

`ArcadeRandom` translates `$0021c4` and matches **8,192 supplied D1-D7/frame/seed contexts**. Known probability/arbitration register writes are reconstructed, but ambient runtime register context remains incomplete. The practice match uses an explicit zero default for unknown context. The composed references do not establish whole-game RNG sequence parity. An additional **8,192 original facing cases** cover state/action anchors, preserved facing bits and coordinate wrapping.

Browser checks with a simulated standard controller and enabled native audio walk into a grapple and complete a Hogan throw, DiBiase submission result and Mr. Perfect move into a counted pin. Additional checks carry both participants approximately forty world units before a throw, and whip the victim into a rope rebound through collision/recovery. The ordinary body collision correctly retains both health values. General pad menu/pause/reconnect, running actions and pin escape checks remain separate. Physical controller and listening acceptance remain unverified. Optional boss action 137 still waits for its separate partner/multi-actor contact service; it is not remapped to an invented move.

Controlled standing-contact/running fixtures explicitly set `world.grapples=false` when their original reference excludes arbitration. Ordinary browser play leaves it enabled.

```sh
node tools/trace_match_grapples.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/match-grapples-reference.json
node tools/trace_random.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/random-reference.json
node tools/trace_facing.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/facing-reference.json
```

The match tracer accepts `MATCH_GRAPPLE_FILTER` (JSON) and `DETAIL=1`; its tests accept `MATCH_GRAPPLE_FIXTURE` for private diagnostic rows. Original program execution is confined to offline generation.
