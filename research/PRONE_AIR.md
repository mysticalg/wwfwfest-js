# Prone airborne attacks and rope continuations (0.1.30)

`src/actors/prone-air.js` translates actions 16, 19, 20, 70 and 71 from the
supplied US rev 2 program. Their original handlers begin at `$01342c`,
`$013c32`, `$013da4` and the shared `$013698`. Editable descriptors and the
complete thirteen-entry target-offset table are in `actor-tables.js`.

The handlers preserve their distinct launch placement, facing, gravity,
landing, prone/held-target checks, damage and recovery. Actions 70/71 require
the mutual link for their prone hit. Action 20's miss writes three damage
points to the linked opponent, as the original does; the other misses damage
the attacker. These details are retained even when they look surprising.

`ground-actor.js` also translates rope stop 63 (`$0175ae`), and `tag.js`
translates bench boost 113 (`$01915e`). Each writes only the original upper
rope word. Boost keeps its seven-loop counter/borrow behavior and assistance
expiry. Effect requests are preserved; moving rope/effect graphics are still
unfinished.

## Original-program comparisons

- **840 handler sequences / 48,744 updates** cover the five airborne actions,
  twelve types, two modes and front/back, miss, broken-link, held-97, wrap and
  outside-floor seeds. One actor updates while three passive records capture
  linked writes. Every sequence leaves the tested actions before its cap.
- **360 composed sequences / 141,802 updates** run the four-record core with
  front/back, CPU, miss, broken-link and held-97 seeds. Positive cases require
  the accepted action and actual opponent damage. The held seed uses an
  explicitly passive unassigned bench record so AI cannot restart the hold.
- **192 rope/boost handler sequences / 12,000 updates** cover both sides,
  modes, all types, assistance expiry, counter wrap and preservation of the
  other rope words. Expiry checks stop at the requested continuation.
- **72 composed rope/boost sequences / 28,800 updates** cover human/CPU seeds,
  normal boost, expiry and action 63, with a 400-update cap.
- **12 longer composed sequences / 29,823 updates** use neutral, advance, run
  and tag input across three types. Four reach original final match outcomes;
  eight stop at explicitly untranslated actions. None reaches the 6,000-update
  cap. Each declared result asserts the native winner as well as record hashes.

These are seeded comparisons, not proof that every synthetic state is
naturally reachable. Direct dispatch for every type does not establish that
ordinary input selects every action for every character. Mode-1 and
outside-floor handler checks do not establish Royal Rumble or full outside
gameplay. The composed core includes camera, targets, timers, announcer,
input/AI, referee, actors, contact, damage and queue cleanup. It omits original
clock/HUD scene bookkeeping and full effect-object updates, and replays
observed entropy rather than claiming complete live register/RNG context.

The longer comparisons exposed two integration errors now corrected: the
referee's approach states must enter state 5 when the focused assistant returns
to the apron, and running-pose cleanup belongs after the entire actor loop.
Standalone running component updates retain their own cleanup by default.

Regenerated older prefixes plus these additions give the composed reference
**1,128 sequences / 458,524 updates**. The separate tag component reference
is **192 / 98,535**, including 96 manual-tag sequences / 59,103 updates.
Historical component captures retain their declared original stop points.

## Browser controls and reproduction

A simulated standard Gamepad API device selected each of the five attacks
through normal punch input from a controlled eligible prone setup. All reached
their original impact sound commands and health changes, with native audio
enabled. Additional controlled setups exercised action 63, boost 113 and
Menu pause/resume. The menu/tag/pin/rematch regression also passed. Physical
controller and human listening acceptance remain unverified.

`trace_prone_air.mjs` and `trace_boost.mjs` generate the direct cohorts using
offline original-program tracing. `AIR_FILTER`/`BOOST_FILTER` accept JSON
filters; `AIR_FIXTURE`/`BOOST_FIXTURE` select diagnostic comparison files.
`TEAM_AIR=1`, `TEAM_BOOST=1` or `TEAM_LONG=1` select the composed cohorts in
`trace_team_match.mjs`. The program image and external analysis CPU remain
excluded from browser delivery. The browser executes native JavaScript actors.

Original round scenes, clock integration, remaining actions, outside-ring
behavior, Royal Rumble and complete audio routing remain unfinished.
