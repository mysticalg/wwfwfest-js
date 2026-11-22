# Ordinary movement and approach decisions

`src/actors/computer-ground.js` reconstructs ordinary idle, walking, running,
braking and rebound AI, together with the approach decisions used by selected
attacks. The existing linked-state AI dispatcher calls these routines for their
recovered states. Editable choices and probability tables are in
`src/data/ground-ai-tables.js`.

The complete browser opponent is still unfinished. The default practice adapter
retains its provisional ordinary movement. The development constructor option
`new Match(player, opponent, {nativeMovementAI:true})` keeps the CPU in the
recovered dispatcher through idle and running transitions and enables shared
contact responses. It still exposes unrecovered move handoffs. Four visible
wrestlers, original human move selection, remaining actor handlers and complete
team/Rumble integration are separate work.

The practice adapter limits its AI call to the previously integrated linked
states and initializers. This keeps its provisional pin requests from being
reinterpreted as original approach decisions. Direct component calls retain the
complete recovered scope by default; `stepComputerGrapple(actor,{ground:false})`
selects the adapter's narrower scope.

## Original routines

| Address | Role |
| --- | --- |
| `$01b50c` | Idle cleanup, buffered attacks, assistance, tag intent and weapon requests |
| `$01bb34/$01bb7e` | Walking mode dispatch and ordinary approach/combat decisions |
| `$01c298/$01c326/$01c38a` | Circling phases and attack alignment |
| `$01c426/$01c53e` | Tag-corner approach and corner-attack setup |
| `$01c7c2/$01c96a` | Attack/weapon/exit pursuit and outside return decisions |
| `$01c9d6/$01cc86` | Running attack decisions and braking adjustment |
| `$01dfea` | Rebound attack choice and request timing |
| `$01d086/$01d0cc` | Ordinary/counter move tables and special selection entries |
| `$01d144/$01d1a4` | Retreat/jump positioning and collision probe |
| `$01d4ce-$01d558` | Ordinary punch/kick approach initialization |
| `$01d700-$01d9b8` | Selected attack spacing, pursuit, buffered actions and linked entry |
| `$01dd88/$01ddf4` | Retreat and persistent airborne-wait decisions |
| `$01e382` | Original integer pursuit direction |
| `$01e3d2/$01e536` | Corner opportunity and forward/reverse running choices |
| `$01e680-$01e77c` | Attack-dependent target positions |
| `$01e7d8` | Assistance move choices and approach-side checks |
| `$01ea16` | Bounded attract-script selection; full scene progression remains pending |

Move-table entries `$ff/$fe/$fd` have distinct meanings: continue approaching,
reposition for the retreat/jump path, or clear the action word. They are not
ordinary attacks. The translation preserves low-byte writes, high action flags,
one-shot approach markers and the separate initialized state word.

An idle opponent can cause the original walking AI to wait for an action rather
than repeatedly attack. A controlled browser check therefore uses player
controller punches to verify the recovered response. The random algorithm is
native; complete ambient register context across the entire game is still
unverified, so these routines do not establish whole-game RNG sequence parity.

The AI control gate also preserves the original distinction between bit 6 and
bit 7 at actor offset `$56`: bit 6 can admit a hidden CPU record that the bit-7
path alone would reject.

## Dependent actor continuations

`src/actors/ground-actor.js` translates actions 60, 62 and 117: depth adjustment
into a waiting pose, retreat locomotion, and standing/running hesitation. Action
61 uses the original idle handler while retaining its state-5 clock. These now
run through `LinkedActor` with projection, collision, descriptors and physics in
their original order. Prone reaction 8/9 entry also now clears the original idle
timer at `$01a578`; extended four-actor comparisons exposed that missing write.

## Verification

- **36,864 original AI phases** cover 4,096 idle, walking and running/braking/
  rebound cases each in modes 0, 1 and 2. They compare four actor records, target
  measurements, requested actions/states, flags, links, counters, pursuit,
  collision probes, entropy consumption and relevant globals. Other actors are
  passive during each decision call. Weapon objects are absent in these cases.
- **288 actor sequences / 15,840 updates** compare actions 60/61/62/117 through
  completion or an explicit forced exit. They cover both facings, rope-edge
  positions, auxiliary links, movement variants and held-object/status poses.
- **48 extended four-participant tag sequences / 31,130 updates** combine neutral
  human input, target selection, ground/linked AI, native actors, contacts and
  alternating damage. Forty-seven reach the 650-update observation cap; one
  requests unrecovered action 10. These sequences intentionally omit fresh
  grapple arbitration and the referee, and do not establish complete matches.
- A browser check with native audio and simulated controller punches verifies
  the development movement mode through approach, ordinary punches, hit
  reactions, recovery and a CPU impact. It retains the shared CPU identity and
  original sound requests. Fresh grapples are disabled in that controlled check.
  Physical controller and listening acceptance remain unverified.

Mode-2 weapon acquisition still needs the caller register context for its
single-available-weapon branch. That dependency is explicit. Bounded attract
script selection does not include scene advancement. Remaining move actors,
outside behavior, full human input, all-mode targeting and full browser matches
are still incomplete.

## Reproduce

```sh
python tools/extract_ground_ai.py path/to/wwfwfest.zip
ENTRY=idle GROUND_MODE=0 node tools/trace_ground_ai.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/ground-ai-idle-0.json.gz
GROUND_ACTORS=1 node tools/trace_standing_native.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/ground-actors-reference.json
TAG_EXPANDED=1 node tools/trace_tag.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/tag-ground-reference.json
node --test tests/ground-ai.test.js tests/standing-native.test.js tests/tag.test.js tests/native-movement-mode.test.js
```

Repeat the first trace for `ENTRY=idle/walk/run` and `GROUND_MODE=0/1/2`.
PowerShell users set/remove those environment variables around each command.
Gzip fixtures contain compact JSON inputs and SHA-256 hashes of the original
output records. Output to a `.json` path retains detailed expected fields;
`GROUND_FIXTURE`, `STANDING_FIXTURE` and `TAG_FIXTURE` select diagnostic files.
`GROUND_FILTER` and `TAG_FILTER` accept JSON scenario filters. CPU tracing and
the program image remain offline inputs, excluded from browser execution.
