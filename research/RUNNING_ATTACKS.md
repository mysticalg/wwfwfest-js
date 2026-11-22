# Native running actions and paired releases

Press punch or kick after starting a run. `src/actors/running-attack.js` implements the eight actions reachable through the ordinary inside-ring running selector. The match connects their original contact records, sounds, paired artwork, release physics and subsequent recovery. Standing grapples and other move-table rows remain separate work.

## Source locations

| Address | Role |
| --- | --- |
| `$00d26e` | Running move selection and alternating row-set flag |
| `$00d2b0` | Two sets of three health-band rows for twelve types |
| `$00d1d6`, `$00d73e` | Three-button columns and per-character move tables |
| `$011b3a` | Action 1 airborne strike |
| `$011e62` | Action 4 airborne capture and release |
| `$012180` | Action 5 running capture and release |
| `$015c56` | Actions `$20/$2d` decelerating strikes |
| `$01586c` | Action `$2a` strike with held final frame |
| `$017644` | Action `$40` airborne strike |
| `$0176d8` | Action `$41` shared grab reaction |
| `$02368e` | Running body collision and both actors' reactions |
| `$023750`, `$023816`, `$0238b0`, `$023a12` | Running contact responses |
| `$01a946` | Reactions `$10/$12`, temporary invisible capture state |
| `$01a9e2` | Reaction `$1d`, paired grab artwork and release |
| `$01acd2`, `$01ad48`, `$01ad8c`, `$01ae76` | Rope impact, bump stagger and release reactions |
| `$00fe28` | Facing offsets for downed opponents |

The selector toggles bit 7 of actor byte `$62` each time an eligible running attack is chosen. The pre-toggle value selects one of two 36-byte sets. Target health severity selects a twelve-byte row, and wrestler type selects the move-table row number. Button press edges 1/2/3 choose the row's three columns. Selection is blocked during the source's forced-bounce count.

Attack descriptors, three move rows per type and all 38 motion profiles are extracted into editable `actor-tables.js`. The eight native actions retain the original handler-before-clock order, byte/word arithmetic, profile velocities, gravity and fractional position words. Follow-up states reuse the existing native braking, rebound, knockdown and get-up handlers.

## Contact and paired behavior

Running strikes use contacts 6, 11, 16, 19, 22, 23 and 24; ordinary running also attacks through body-contact record 3. Accepted attack impacts normally send `$2b,$32`; a body collision sends `$2b`. Damage and facing remapping come from the contact handlers. Running targets can take an additional point. The capture path for contact 6 adds three further points for types 0 and 5. A back hit can select an ordinary knockdown instead of a hold.

Contact dispatch now follows the current contact record rather than requiring a still-active action object. This matters when a final contact survives the first idle update. Per-target hit masks persist until the pose changes. Pending state transitions, hidden poses and normal-ring exclusion flags use the original eligibility gates.

Actions 4 and 5 can move the target into a 32-update invisible capture state, reset the attack clock, then select shared poses. Their target release writes integer position words while preserving the target's fractional words. Action 4 clears the whole reaction word on release; action 5 writes its low byte. The different severity-bit behavior is preserved.

Action `$41` lets reaction `$1d` draw both wrestlers, while the attacking actor becomes invisible. A previously running target follows reaction `$1b` with a different airborne profile and mat probe. Other targets follow the ordinary airborne knockdown. Shared body references preserve physical changes when the target has already had its update that frame, while its already calculated sprite projection retains the original actor-order timing.

Body collision against another runner knocks both actors back with the original eighty-update recovery override. Against another eligible actor it gives the runner the short reaction `$18` stagger and knocks the target down. Those collision hits do not subtract health. The short stagger still starts the original combo timer.

## Verification

`tools/trace_running_attacks.mjs` executes the original routines offline using the external research interpreter documented in [actor research](ACTORS.md). The production suite compares:

- **216 move selections**: twelve types, three target health bands, both alternating sets and all three button-edge combinations.
- **2,592 response cases**: attack/body contacts, attacker types and facings, run directions, target facings/statuses, ordinary and special contact records, and both idle/running collision targets.
- **300 complete action-handler sequences**: every reachable type/action pair, both facings, central/edge origins and fractional/integer positions. Each update covers state/action/reaction, clock/pose, positions, movement and velocity fields, flags, padding, contacts, offsets, collision fields, self damage, sounds and rope requests.
- **612 controlled 420-update sequences** through the original input choice, state initialization, collision, all actor updates, movement, pose cleanup, contact dispatch and damage service. These total **257,040 updates** and cover all eight actions, both actor update orders, both facings, three health bands, hit/miss distances and moving targets for the shared grab. The actual native `Match` produces identical state/action/reaction, pose, contact, fixed positions, health/severity, facing, movement mode, offsets and sound-command streams at every update, as checked by complete sequence hashes.

Browser checks exercise all eight actions through simulated standard gamepad input with browser audio enabled. They verify selected actions, expected damage, impact commands, running and airborne poses, three visible paired captures, and attacking while the dedicated Run shortcut remains held. The menu, pause, reconnect and other controller flow also passed. Physical controller and listening acceptance remain unverified.

The 612 integrated sequences have been regenerated with contact/damage on the original alternate frames. Their sequence hashes now include both actors' cached pre-physics sprite projection. [Frame timing research](FRAME_TIMING.md) explains the corrected main-loop composition and independent input-latch comparisons.

The locomotion-only reference has no second actor in its lane. Its native integration check now parks the passive opponent at a different depth, so newly translated body collisions do not change that isolated test's purpose. Body collisions have their own original response and integrated sequence coverage above.

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_running_attacks.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/running-attacks-reference.json
npm run check
```

Set `DETAIL=1` to include per-update rows when diagnosing differences. `MATCH_FILTER` accepts a JSON object of initial-case fields to restrict the longer integration runs. The CPU implementation and temporary disassembly are excluded from browser delivery.

## Remaining work

This covers ordinary inside-ring running action paths. Tag-specific capture branches, outside-ring alternatives, special status-dependent variants, other primary/secondary contact handlers, standing grapple arbitration, AI automatic pin requests and full match rules remain unfinished. Controlled original references use the human-control flag to exclude the source's AI pin-request RNG and retain explicit 100-point health. Fresh matches now use original health initialization, and [covers, escapes and the referee](PINS.md) use their original handlers. Computer decisions and complete match rules remain provisional; moving rope graphics are still pending. This does not establish complete game parity.
