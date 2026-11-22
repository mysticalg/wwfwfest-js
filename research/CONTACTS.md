# Shared native contact dispatcher

`src/actors/native-contact.js` reconstructs the original physical-pool contact
loop, all fifteen primary response entries and all thirteen secondary response
entries. It operates on the stable actor records used by grapples, pins and tag
components. This closes the former browser gap in which ordinary punch/kick
responses were skipped whenever either participant still had a native record.

The browser currently enables these punch/kick responses for pairs involving a
native participant. Existing ordinary standing/running adapters retain their
other contact paths. Complete migration of those adapters, the original input
and AI dispatchers, and four-wrestler team matches remain unfinished. A recovered
contact response can also request a move whose actor handler is still pending;
that request is preserved rather than substituted with another attack.

## Source behavior

| Address | Role |
| --- | --- |
| `$023288-$02334a` | Iterate active attackers and targets in physical pool order |
| `$02334c-$02340c` | Target state/status, distance and per-pose mask gates |
| `$02340e-$023558` | Original attack/hurt rectangle selection and overlap |
| `$02355a` | Mark the target's physical slot in the attacker's hit mask |
| `$023580`, `$0235be` | Primary response dispatch and fifteen-entry table |
| `$0235fa` | Thirteen-entry secondary response table |
| `$02362e-$023a70` | Punch, kick, collision, airborne and capture responses |
| `$023a78-$023f9e` | Ordinary and held-graph interruption responses |
| `$023fa0`, `$024002` | Facing remap and moving-target damage adjustment |
| `$024012-$02407c` | Accepted-hit masks, links, counters, contact and weapon cleanup |

The source caches the attack record before iterating targets. Clearing the
attacker's contact field after a hit therefore does not erase that cached record
for later targets in the same pass. The physical mask and newly pending target
states determine which later visits remain eligible. Pose changes clear both
the mask and contact before this pass.

Secondary responses can interrupt both members of a held pair, restore an
initialized action, request a reversal, release assistance or end a pin count.
They retain the original control/status writes and whole-word versus low-byte
reaction changes. Common cleanup increments the combined `$c6/$c7` word, including
carry into its high status byte, and applies severe-reaction flags after the
secondary response.

The type-10/14 primary response at `$0239aa` loads facing into D0 but compares
D1 with the victim's facing word. In this contact loop D1 is the target iterator
word. The translation preserves that observed comparison; it does not replace
it with the more intuitive attacker-facing comparison.

## Shared standing actor handlers

`stepStandingAction` in `standing-action.js` supplies actions 0/114 to the shared
dispatcher, including the AI/status-dependent punch descriptor at `$011aac`.
Reactions 0, 10 and 32 now run through `LinkedActor`/`grapple-victims.js`, preserving
combo timing, auxiliary cleanup, apron return and the reaction-32 knockdown.
The match adapter copies contact/projection and restores the state bits of legacy
animation clocks when synchronizing a stable record. Accepted native impacts
retain that clock instead of restarting the attack.

## Evidence and limits

- **360 shared standing-handler sequences / 9,072 updates** compare actions
  0/114 and reactions 0/10/32 through their requested next state. They cover both
  facings, center/rope-edge positions, four auxiliary-link conditions, preserved
  reaction flags, apron return and the alternate AI punch descriptor.
- **3,120 response cases** compare the original `$023580` call across all 15
  primary and 13 secondary entries with sixteen status/facing/combo variants.
  Four records preserve a valid mutual held graph and partner links. Comparisons
  include all records, links, requested states, controls, messages, sounds and
  held-object writes.
- **3,120 full contact-phase cases** additionally compare `$023288` physical
  iteration, multiple targets, cached attack records, masks, initialization,
  forced/status gates, hidden poses, distance limits and common cleanup. These
  cases use normal/tag and mode-bit-2 inputs; complete Rumble integration is
  separate work.
- Adapter checks cover impacts from a legacy standing attacker into a shared
  victim and from a shared attacker into a legacy victim, including continuation
  into the next native reaction and alternating damage service.
- A controlled browser check uses a simulated gamepad punch against a shared
  native stagger target. It verifies one-point damage, the original combo-driven
  knockdown, retained attack clock, physical hit mask and routed sound commands
  `$2a/$32` with native audio enabled. Physical pad and listening acceptance
  remain unverified.

These comparisons verify response requests and the declared handler prefixes.
They do not establish every requested move, a complete four-wrestler fight,
whole-match parity or all sound event routing.

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_standing_native.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/standing-native-reference.json
node tools/trace_native_contact.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/native-contact-reference.json
ENTRY=phase node tools/trace_native_contact.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/native-contact-phase-reference.json
node --test tests/standing-native.test.js tests/native-contact.test.js tests/match-native-contact.test.js
```

In PowerShell set and remove `ENTRY` around the phase command. `DETAIL=1` retains
diagnostic rows. `STANDING_FIXTURE` and `CONTACT_FIXTURE` select private detailed
captures. The original program and external CPU remain offline research inputs;
neither executes in the delivered browser game.
