# Original health, damage and character identity

`src/actors/match-services.js` translates the US rev 2 health initializer `$00f9c2`, DIP input wiring `$001e2e` and active-pool damage service `$02407e`. `Match` uses these routines for fresh health and the alternating damage phase. Native gameplay and audio remain JavaScript; the original CPU is used only for offline comparisons.

## Initialization

The character identity byte `$57` selects human health from `$00fa70`. The control byte `$56` selects the computer branches. A human's high reset bit at byte `$104` is cleared and tested before the low round byte: later rounds retain health unless that bit requested initialization. A fresh browser match requests a reset; continuing the full original game lifecycle is still separate work.

| Type | Character | Human starting maximum |
| --- | --- | --- |
| 0 | Hulk Hogan | 110 |
| 1 | Ultimate Warrior | 106 |
| 2 | Jake Roberts | 98 |
| 3 | Big Boss Man | 102 |
| 4 | Hawk | 500 |
| 5 | Animal | 500 |
| 6 | Sgt. Slaughter | 100 |
| 7 | Mr. Perfect | 104 |
| 8 | Earthquake | 106 |
| 9 | Ted DiBiase | 96 |
| 10 | Demolition Smash | 104 |
| 11 | Demolition Crush | 96 |

The Legion of Doom records, types 4/5, are bosses in the normal game; the prototype retains them as optional player/opponent selections after the ten ordinary wrestlers. Their human branch values are preserved when the user chooses them. Computer initialization uses its own rules, regardless of character.

Normal computer health uses ten round values at `$00fa88`, subtracts 15 except for actor pool slot 4, then applies the signed difficulty offset at `$00fa9c`. The four offsets are normal 0, easy -15, hard +15 and hardest +30. Rumble computer records initialize to 135. The native helper preserves word wrapping and the original separation between current health, maximum and severity.

The original index masks the identity to four bits. The extracted human table includes the four adjacent words read by indexes 12–15, although ordinary wrestler identities use only 0–11. Original-program comparisons include these boundary reads; they are not additional selectable wrestlers.

The hardware driver's raw default DIP banks are A `$ef`, B `$ff`. `$001e2e` combines and inverts their physical bit groups, producing game word `$0010`. Normal difficulty and 24-point clear-stage recovery are selected. `Match` accepts `mode`, `round`, `dipSwitches` and `ai` settings; the browser starts the existing practice match with its checkbox's current AI setting. Changing control during a match does not create a new health initialization.

## Damage phase

`$00251e` iterates the first nine pool records and skips inactive records. Damage is applied only when the pending word is nonzero and the forced word is zero. A forced actor retains the pending request. Subtraction saturates at zero on unsigned borrow; the display/health accumulator at `$6a` receives the negative complete request, and the request is cleared. Severity uses the separately verified `$0240e8` thresholds.

The combo timer decrements on each service call. Reaching zero from one retains the combo for that call; the next zero/underflow call clears it. The `$d0` status timer decrements only while flag `$32` bit 3 is set, clearing that flag at zero.

The playable match queues the primary contact's low damage-byte write, retaining any high byte. Ordinary body collision does not write damage. Both contact directions run before the shared damage service. Running handlers' self-damage uses the original whole-word request. New reaction adapters receive the resulting health/severity before their next update. Existing controlled combat fixtures retain their explicit 100-point initialization to isolate their recorded actions; fresh match initialization has separate original-program coverage.

Health bars divide by each wrestler's original maximum, including the 500-point optional boss records. Selection previews draw native pose recipes, so Demolition's records do not depend on the earlier ten-image preview sheet.

## Corrected identity labels

The original name scripts at `$024ef2-$02501a`, addressed by text IDs 64–75, identify Jake Roberts, Mr. Perfect, Ted DiBiase, Demolition Smash and Demolition Crush. The earlier prototype mislabeled their sprite records. Types 10/11 contain Demolition artwork, as verified by rendering the supplied recipes; they are not alternate Legion of Doom records. The ten-type word list at `$008998` is `0,1,2,3,6,7,8,9,10,11`; the menu places these before optional boss types 4/5.

## Original-program comparisons

- 11,712 health-initialization cases cover human retention/reset, identity masking, all nine slots, AI rounds, difficulty, mode flags and preserved words.
- All 65,536 DIP combinations compare the original hardware reads and game-word assembly.
- 512 active-pool damage scenarios run eight service calls each, comparing ten records. The tenth active record verifies the original nine-record iterator limit. Cases cover forced requests, unsigned subtraction, zero maxima, severity, combo timing and status expiry.
- 176 paired hold sequences use original initialization and alternate-frame damage processing for actions 26,37,54,59, totaling 310,930 actor updates. They compare both wrestlers, partner records, health, severity, combo/status timers, damage/display words, descriptors, motion, requests and sound output. The selected submission paths reach their original normal win-result request or mode-specific handoff after depletion. Forced-result variants also retain their distinct early exits.

The older damage-only paired references stop at explicit outside/scene/control handoffs. Forty action-26 cases remain pending at the 4,000-update observation limit because that fixture excludes the referee; the other 136 sequences stop at a handoff. An additional [combined referee fixture](REFEREE.md) now includes original pin counting: all 176 sequences reach explicit handoffs within 170,176 updates, including those 40 pins. [Original covers and human escapes](PINS.md) now run in practice play through stable nine-record pool identities, and the active-pool damage service visits those records. Global contact, full input/AI, tag/Rumble rules and scene progression remain separate work. Standing grapples are still outside normal `Match` input while those dependencies are integrated.

```sh
node tools/trace_match_services.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/match-services-reference.json
COMPOSE=1 DAMAGE=1 node tools/trace_grapple_submissions.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/damage-submissions-reference.json
npm run check
```

In PowerShell, set and remove `COMPOSE` / `DAMAGE` environment variables around the second command. Both tracers accept `DETAIL=1` for temporary diagnostic rows; the submission tracer also accepts `THROW_FILTER`. Tests accept `MATCH_SERVICE_FIXTURE` / `THROW_FIXTURE` for private captures. No original program image or external analysis CPU is included in browser delivery.
