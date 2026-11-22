# Native covers, escapes and playable referee integration

Current integration update: the default browser now runs a four-person native tag playtest with original input, movement AI and manual tags. See [four-person integration](TEAM_MATCH.md) for current evidence and limitations. Older adapter descriptions below record the earlier component checkpoints.

The practice match now uses original pin action 72, victim 74, escape 75 and the recovered referee. The earlier 180-update pin timer and authored cover pose have been removed. Kick near a prone opponent selects the cover; Space or the gamepad's top button supplies the same action as a convenience. Human victims tap punch/kick to advance the original mash counter, then press again to select escape. Releasing the cover button does not cancel a committed original pin.

## Original handlers

| Action | Descriptor / handler | Behavior |
| --- | --- | --- |
| 72 | `$012518 / $012534` | Aim a jump at the prone participant, land, validate mutual links, enter a hidden paired cover |
| 74 | `$0172ec / $017304` | Prone cover victim, front/back descriptor, health-dependent mash, forced/elimination release |
| 75 | `$01742c / $01744c` | Escape the cover, release attacker into reaction 15, restore assistance and clear count status |
| 86 | `$0182b6 / $0182c6` | Escape action-26 victim 94, release the attacker with damage and linked get-up |

`src/actors/pin.js` translates these handlers. Action 86 is available in the shared dispatcher for recovered grapple integration; ordinary standing grapples remain outside practice input. The optional secondary-pinner writes in 74/75 are retained, but action 73's own handler and the full multi-actor path remain unfinished.

The pin jump uses `$0026be`: integer airtime estimation, signed division, original target offsets and velocity clamps. Successful landing writes the high action bits, pin flag, paired-animation flags, integer coordinates and partner-assistance requests before the other participant updates. Existing fractional position words survive these integer writes.

The original downed predicates `$00d2f8/$00d350` accept front reactions 6/8 and back reactions 7/9. The kick entry selects action 72 in all twelve character move tables. Its `$00db98` kind-7 bounds mirror around the target's facing, with exclusive lower and inclusive upper edges. The practice shortcut checks these same eligibility and geometry rules. Other prone-row moves, selection fallbacks and the complete general input selector remain unfinished.

## Escapes and recovery

The victim initializes the kind-zero mash counter: high health can require one tap, low health requires more, and zero health uses 256 while the pin handler suppresses mashing. `$00de04` consumes the `$4000` completion sentinel on a subsequent action press, selecting 75 from victim 74 or 86 from victim 94. The outer `$00cf1e` gate requires an initialized, unforced human record before this input selection. Downed recovery transitions share this input phase; a state written later by another participant waits for its initialization before accepting a recovery press.

`$0204a8` clears the pin-status word, requests message `$0f1e` for late escapes from stages 4/5, then **falls through** to ordinary assistance cleanup `$0204c6`. Reaction 15 retains its original profile, depth velocity, high reaction flag and landing behavior. Recovery actions 56/120 now retain their original unlink/secondary-pointer cleanup; the common dispatcher also clears offset words when their high clear marker is set.

## Practice integration

`src/actors/match-actors.js` supplies nine stable physical records. Human slots and computer slots retain their original positions in the pool; inactive partner records remain available for the referee and first-four-record health recovery. Dormant partners carry the apron flag, keeping assistance requests on the correct branch rather than requesting an in-ring control-switch gesture after an escape. Existing normal movement/contact adapters synchronize into these records. Pin participants use `LinkedActor` directly through the paired actions, escapes, knockdown, get-up and idle handoffs. Damage now runs through the same active pool.

The referee updates after input and before wrestlers. The pin begins counting after its original approach. Counts occur 52, 140 and 228 updates after entry to the count state; victory follows the original tail and gesture requests. Referee effects `$62,$63,$64`, victory sound and escape/landing requests route to the native audio engine. The browser renders its original pose recipes at the recovered projection and depth.

`tools/extract_count_graphics.py` decodes the 72 character tiles used by all 21 count glyphs from the supplied character ROM. The palette comes from the recorded normal-ring palette RAM, with its capture hash retained. `Renderer.drawCounts` draws the original normal/secondary tile-word regions, rather than a replacement font counter. This includes original tile-code high bits, palette, screen positions and transparency.

## Verification and remaining scope

- **576 original-program paired sequences / 478,848 updates** cover all twelve types, both actor update orders/facings, front/back victims, no input, repeated escape input and zero health. These include health initialization, alternating damage, referee state/count words, participant/partner records, recovery timers, sounds and projection. Direct victim-74 entries can retain the reset referee's zero movement mode and wait at the 4,000-update observation cap; the complete action-72 entry and playable-match checks initialize the referee's roaming before the cover.
- **8,192 original input cases** cover prone-state gates, existing links, control blocks, facing, strict bounds and wrapping coordinates.
- **24 practice-match pin checks** cover all twelve wrestlers against both downed positions, the three count offsets and sounds. A further integration case verifies human escape from a computer-applied cover.
- Browser checks use a simulated standard controller and enabled native audio. They verify a complete cover/count/result and a human escape, with original count artwork and referee poses inspected. Physical controller and listening acceptance remain unverified.

This is still a two-wrestler practice match. Computer decisions and control routing are provisional. Original tag partner activation, assistance AI, second pinners, weighted Rumble pin services, outside interruptions, all other contact/move paths and complete match/scene progression remain unfinished. These comparisons do not establish full arcade parity.

```sh
COMPOSE=1 DAMAGE=1 REFEREE=1 PINS=1 node tools/trace_grapple_submissions.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/pins-reference.json
node tools/trace_pin_input.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/pin-input-reference.json
python tools/extract_count_graphics.py path/to/wwfwfest.zip path/to/normal-ring-palette-capture.bin
npm run check
```

In PowerShell, set and remove the four environment variables around the first command. `DETAIL` / `THROW_FILTER` support diagnostic rows. The original CPU and program image are used only offline and are excluded from delivery.

Original AI pin escape decisions are now connected during native linked updates. [Computer research](COMPUTER.md) includes 168 additional composed pin sequences with active computer decisions, seven health bands and original referee timing. General pin approach/selection AI remains provisional; these checks do not establish complete computer matches.
