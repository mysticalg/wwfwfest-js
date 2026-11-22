# Running attacks in the shared actor pool

Current integration update: the default browser now runs a four-person native tag playtest with original input, movement AI and manual tags. See [four-person integration](TEAM_MATCH.md) for current evidence and limitations. Older adapter descriptions below record the earlier component checkpoints.

`src/actors/running-action.js` translates actions 1, 4, 5, 32, 42, 45, 64 and 65
directly on the stable `LinkedActor` records. These are the eight ordinary running
selections recovered earlier in the standalone `RunningAttack` adapter. Original
movement AI can now request them without changing actor identity or substituting
a standalone target/attacker graph.

The default practice input still uses the earlier standalone adapter for its
running selections. The development `nativeMovementAI:true` match option retains
the recovered CPU dispatcher and enables the shared contact path. Complete
original human input, four visible wrestlers and full tag/Rumble match services
remain unfinished. This translation does not establish complete matches.

## Original handlers

| Action | Handler | Recovered continuation |
| --- | --- | --- |
| 1 | `$011b3a` | Ordinary/corner launch, contact window, landing, rope self-hit |
| 4 | `$011e62` | Airborne capture, release, landing and corner team follow-up |
| 5 | `$012180` | Running capture, paired descriptor, release and braking |
| 32, 45 | `$015c56` | Entry-update contact, deceleration and rope rebound |
| 42 | `$01586c` | Contact windows, delayed deceleration and rebound |
| 64 | `$017644` | Launch timing, airborne contact and landing |
| 65 | `$0176d8` | Accepted-hit capture, hidden attacker and linked release |
| Reactions 16, 18 | `$01a946` | Hidden capture wait using the original `$44` counter |
| Reactions 20, 29 | `$01a9e2` | Copy the accepted last-hit actor, descriptor variant and release |

The accepted-hit pointer at `$92` remains separate from the auxiliary pointer at
`$26`. Capture handlers transfer it only at the original commit point. Reactions
16/18 use the hold counter, not the unrelated timer at `$46`. Reactions 20/29
preserve their separate descriptors and the running/non-running previous-state
branch. Partner-support flags and automatic pin intent retain their source
timing and entropy requests.

Action 4 includes the corner team path: it follows the holder/victim graph,
requests action `$8006` on the holder and reaction 25 on the victim, positions
both records and clears their paired flags. It retains the corner descriptor
until the original release update. These components do not make four wrestlers
visible in the current practice UI.

`$010206` now returns its original side-rope result as well as making the rope
request. Released reactions 25/27 call that service before landing. Rope-stagger
entry requests the original shake value. The nullable auxiliary sentinel used
by corner aiming is retained as three extracted data fields from `$07f000`;
the browser does not interpret that ROM region as code.

The browser adapter also preserves idle's entry update: the original handler
retains the previous attack pose/contact for that update. Ownership returns to
the practice adapter once the ordinary idle pose is actually installed.

## Verification

- **912 four-record sequences / 118,204 updates** compare all twelve attacking
  wrestler types, both facings, clear runs, side ropes, actual impact contacts, ordinary
  corner launches and controlled capture graphs. They compare positions,
  initialized states, clocks, flags, hit masks, last-hit/auxiliary/partner links,
  health/damage, projection, sound commands, rope requests, shake and relevant
  globals. Sixty automatic-pin entropy values are consumed at the original calls.
- Controlled capture profiles inject accepted last-hit/reaction fields at update
  3 to isolate ordinary captures, the running victim branch, reaction 20's
  descriptor and the three-person corner continuation. They are distinguished
  from the profiles that run actual contact arbitration. Both normal physical
  order and reverse order are exercised for these linked cases; reverse order is
  a stress check rather than the arcade's normal iterator.
- **732 sequences reach observed recovery; 180 reach the 240-update observation
  cap.** No unrecovered actor request occurs within these profiles. Caps include
  continuing rebounds/runs without input; they are not completed matches.
- Eight match-adapter checks enter the shared actions, resolve actual contacts
  and damage, exercise the captures and continue through both participants'
  recovery. They also cover the idle-entry ownership regression.
- Local browser checks exercise actions 4/5/32/65 through real contact, capture
  where applicable, damage and recovery, with native audio enabled and a neutral
  simulated controller connected. They inspect capture screenshots and retain
  the original sound requests, with no page errors. Default controller selection,
  actions, pause/reconnect, pin escapes and referee counts also pass browser
  checks. Physical controller and listening acceptance remain unverified.

These references omit input selection, AI decisions, fresh grapple arbitration
and referee updates. They prove the specified actor/contact/damage phases, not
the entire arcade loop. Full outside behavior and every possible corner/held
state combination remain unverified.

## Reproduce

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_native_running.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/native-running-reference.json
node --test tests/native-running.test.js tests/native-running-match.test.js
```

`RUNNING_FILTER` accepts a JSON scenario filter. `DETAIL=1` retains per-update
records for diagnosis; `NATIVE_RUNNING_FIXTURE` selects that file in the test.
Normal fixtures contain initial records, entropy observations and output hashes.
The external research CPU and program image are offline inputs, excluded from
the browser application.
