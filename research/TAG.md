# Corner partner attack and tag records

The native component dispatcher now reconstructs the action-102 corner carry,
incoming partner, corner climb/wait, attack 13/27, landing and victim release.
Four stable active records participate. This graph is not yet connected to the
two-wrestler practice adapter. The browser still reports that dependency rather
than starting an incomplete tag match.

## Recovered routines

| Address | Role |
| --- | --- |
| `$0188ee` | Action 102: hold victim at the home corner and summon the partner |
| `$017afc` | Exchange lead/apron roles, human controller ports and control flags |
| `$00bcae` | Character-owned human palette-bank requests after the exchange |
| `$020b9e` | Transfer assistance bits/timer to the outgoing wrestler |
| `$017b88`, `$017ce0`, `$017d4e` | Partner entry and apron/return actions 77–79 |
| `$01117a-$0115f8` | Corner climb, wait and dismount states 8–10 |
| `$0109d6-$010d96` | Apron movement, recovery and return modes |
| `$01c5b8`, `$01c746` | Apron following/attack choices and assistance expiry |
| `$01e0be-$01e1b6` | Corner AI counter and jump selection |
| `$0145fc` | Shared corner attack 13/27, including the tag landing |
| `$02064a` | Activate the two assisting wrestlers after landing |
| `$01aeea` | Reaction 28 releases the outgoing holder and knocks down the victim |
| `$01fb7e`, `$01fd6a`, `$01fef2` | Normal tag opponent/alternate-opponent selection |

`src/actors/tag.js`, `tag-states.js`, `computer-tag.js` and `tag-targets.js`
contain the editable translations. `src/data/tag-tables.js` retains the original
positions, descriptors, attack weights, recovery timers and player palettes.
`tools/extract_tag.py` regenerates those tables from the supplied archive.

The controller port moves between physical records; exchanging names or array
positions would lose held links and timing. The main-team bit at offset `$33`
also differs from the assistance/referee pointers at `$1c1684/$1c1688`. Those
pointers can still refer to the outgoing wrestler after the new lead is marked.

Original sound-command requests are preserved in actor updates. The effect
requests at `$00ff7a` and palette-bank writes are retained as data requests;
their full effect-pool and palette ownership rendering remain pending.

## Reference comparisons

- **48 four-participant sequences / 8,232 updates** compare both teams, all 12
  incoming types and both update orders. Reverse order is a component stress
  case; the ordinary source iterator uses physical pool order. Comparisons
  include all four actors, flags, controller ports, links, clocks, health,
  damage phase, projection, sound/effect requests and palette requests.
- These sequences stop before the outgoing wrestler's next ordinary idle AI
  call. They establish the recovered attack prefix, not a complete tag exchange
  or subsequent match. Source input and AI execute before the actor handlers;
  entropy observed offline is replayed at the corresponding native calls.
- **4,096 normal tag target-service cases** compare lead/bench roles, control
  gates, statuses, arena planes and opponent pointers. Apron locomotion uses its
  reachable modes 1–4; an invalid apron/idle or apron/mode-0 record would instead
  read a caller scratch register in the original program. Rumble target selection
  is separate and not covered.

An extended original trace confirms that after this landing both assisting
partners may enter the ring and fight. Ordinary shared standing handlers and the
physical contact service are now recovered in [contact research](CONTACTS.md).
[Ground AI research](GROUND_AI.md) now adds idle/walk/run decisions and extended
four-participant comparisons through subsequent fighting. Original input,
remaining move handlers and complete four-participant browser integration remain dependencies.
The browser's action-102 dependency prompt is still expected. Ordinary tag
action 76, other airborne attacks, outside/Rumble paths and complete team-match
rules remain unfinished. Table extraction alone does not establish those paths.

```sh
python tools/extract_tag.py path/to/wwfwfest.zip
node tools/trace_tag.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/tag-reference.json
node tools/trace_tag_targets.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/tag-target-reference.json
node --test tests/tag.test.js tests/tag-targets.test.js tests/game-tag.test.js
```

`TAG_FILTER` accepts a JSON scenario filter, `DETAIL=1` retains per-update rows,
and `TAG_FIXTURE` selects a private detailed comparison file. `TAG_CONTINUE=1`
is diagnostic only: it observes later original execution beyond the translated
prefix and does not extend the asserted scope. The program image and external
analysis CPU are excluded from browser delivery.
