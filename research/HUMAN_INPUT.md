# Original human input and move selection

Current integration update: the default browser now runs a four-person native tag playtest with original input, movement AI and manual tags. See [four-person integration](TEAM_MATCH.md) for current evidence and limitations. Older adapter descriptions below record the earlier component checkpoints.

`src/actors/human-input.js` translates the per-actor human phase at `$00e3ca`.
It consumes the sampled press byte and joystick word; `ArcadeInput` still owns
the board's separate button-edge sampling boundary.

The selector preserves the original order: manual tag request, escape/pickup,
rescue/counter selection, move rows, spacing/fallback rules, region remapping
and locomotion. The post-selection state input then runs on the resulting state.
It does not substitute a generic attack when the original requests a different
move or a currently unrecovered handler.

## Integration

`new Match(player,opponent,{nativeHumanInput:true})` keeps both human and computer
participants in the shared actor dispatcher, uses the original human input
phase and enables the recovered movement AI/contact path. Human records remain
native through idle and running transitions. Existing controller and keyboard
bindings feed this path through the match's sampled input fields.

This is an integration constructor option. The public page still uses the
two-wrestler practice adapter while the four-visible-wrestler pool, controller
role transfer and remaining actor graph are connected. The new path can still
request an explicit unrecovered move. Complete original input/gameplay across
every match mode is not established.

## Original routines

| Address | Role |
| --- | --- |
| `$00cf1e/$00cf42` | Initialized/forced-state gate and manual tag requests |
| `$00d008` | Idle/walk/carry requests, with corner/outside checks first |
| `$00d0c6` | Main move-selection priority and commit |
| `$00d242-$00d73a` | Held object, running, prone, clinch/headlock, corner, charged target, rescue and apron rows |
| `$00da6e/$00db66` | Region/facing remap and lead-dependent pin remap |
| `$00db98` | Facing-dependent bounds with unsigned wrapping |
| `$00dc82/$00ddce` | Rescue, rebound counter and headlock reversal |
| `$00de04` | Prone, pin and held escape requests after completed mash input |
| `$00e000-$00e1d8` | Corner claim, direction countdown and outside requests |
| `$00e1da` | Press bounds and punch/kick/run fallbacks |
| `$00e2fa-$00e3c8` | Pickup search and auxiliary-link assignment |
| `$00e458-$00e700` | Post-selection state controls |
| `$0100c6` | Partner's near-corner prompt/wait transition |

Editable tables are in `src/data/actor-tables.js`: original move rows, all
seventeen spacing rectangles, press-bound rules, rescue fallbacks and charged
target rows. `tools/extract_actors.py` regenerates them from the supplied set.
The existing running/headlock alternation byte and initialized state flags
retain their distinct meanings.

The comparison also exposed a contest helper error: kinds 0 and 2 inspect the
opponent's AI flag at `$7a`; kind 1 inspects the held auxiliary at `$26`.
`GrappleActor.contest` now preserves that distinction when those links differ.

## Verification

- **24,576 original input phases:** 8,192 each in mode values 0, 1 and 2.
  They cover all twelve types, both facings, initialized/pending and forced
  states, controller/AI gates, joystick combinations, press bytes, counters,
  links, positions, alternate rows, headlock/prone/held/corner/apron states and
  partner prompts. Four records and relevant globals are compared, including
  140 observed contest entropy values. The other records remain passive during
  the tested human call. Weapon objects are absent.
- Linked-state inputs retain their required auxiliary records. The fixtures
  exclude incoherent clinch/headlock records with null held links rather than
  interpreting their incidental ROM reads as ordinary participant behavior.
- Four match integration checks cover native movement/standing actions, running
  row selection, an arbitrated clinch through a headlock throw and a prone
  selection through the referee finish.
- A local browser check uses a simulated standard pad with native audio enabled
  for movement, punch/kick, a running selection, pause/resume, a headlock throw
  and a cover. It retains native participant identity and original sound/count
  requests, with no page errors. Running is checked with a standing target;
  prone targets have their own higher-priority move row. Physical pad and
  listening acceptance remain unverified.

These comparisons prove input decisions, not every requested actor continuation
or complete matches. Available-weapon acquisition, four visible wrestlers,
manual tag action 76's continuation, complete role/port routing, all-mode targets,
remaining move actors, scenes and complete ambient RNG context remain work.
No CPU runs in the browser application.

## Reproduce

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
HUMAN_MODE=0 node tools/trace_human_input.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/human-input-0.json.gz
node --test tests/human-input.test.js tests/native-human-match.test.js
```

Repeat the trace with `HUMAN_MODE=1/2` and corresponding output filenames.
PowerShell users set/remove that environment variable around each command.
`HUMAN_FILTER` accepts a JSON scenario filter. Output to `.json` keeps detailed
records; `.json.gz` stores initial fields and expected output hashes.
`HUMAN_FIXTURE` selects a diagnostic file in the test. The external CPU and
program image are offline research inputs, excluded from browser execution.
