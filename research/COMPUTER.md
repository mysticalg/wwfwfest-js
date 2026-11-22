# Computer decisions in linked exchanges

Current integration update: the default browser now runs a four-person native tag playtest with original input, movement AI and manual tags. See [four-person integration](TEAM_MATCH.md) for current evidence and limitations. Older adapter descriptions below record the earlier component checkpoints.

`src/actors/computer-grapple.js` replaces the provisional simulated button presses while a computer wrestler uses recovered linked states. It translates original target measurements, contested/controlled clinches, headlock move selection, carrying, held escape timers, pin escape decisions and downed recovery decisions. The browser calls it after human input and before the referee, in physical actor order. [Ground AI research](GROUND_AI.md) now records the recovered ordinary movement/approach kernels and development browser mode. Complete migration, tag/Rumble services and the full AI dispatcher remain unfinished. Complete computer-opponent parity is not established.

`src/data/ai-tables.js` contains editable original actions, probability rows, escape times and source addresses. `tools/extract_ai.py` regenerates it from the supplied archive. No CPU executes in the delivered browser game.

## Recovered behavior

| Address | Role |
| --- | --- |
| `$0024dc` | Weighted selection with at most four byte draws, rejection, fallback and inclusive cumulative weights |
| `$01b390` | Active/control/status gates and original AI phase order |
| `$01b468` | Target anchors, unsigned word differences, distance bands and direction bits |
| `$01cc9e` | Downed entry/status cleanup and reaction-specific recovery decisions |
| `$01d208` | AI action dispatch, including per-handler initialization gates |
| `$01d55a-$01d64e`, `$01e780` | Held escape counters and their distinct follow-up requests |
| `$01d678` | Health bands, referee status thresholds and pin/hold escape requests |
| `$01da60`, `$01dc54` | Headlock decision timer, weighted follow-ups and carrying targets |
| `$01e1d0`, `$01e290` | Contested-clinch strikes and controlled-clinch move choices |
| `$01e5fc` | Tag disposition requested by health/status comparisons |

The probability helper takes the lower byte of the original random return, halves it and rejects values of 100 or more. Four rejected draws use 50. Zero becomes one. Weights accumulate with byte wrapping and the first inclusive threshold wins. Runtime uses the native random generator; unknown ambient register context still prevents a claim of whole-game RNG sequence parity.

The controlled clinch waits through its original low-byte decision counter, then indexes the type, facing, arena-region and victim-severity tables. Headlocks have their own sixteen-update decision timer and carry/follow-up branches. The high action flags used by AI initialization remain distinct from the actor descriptor clock. AI state handling does not manufacture human button presses.

Pin victims use the original health thresholds and referee status byte. A sufficiently healthy opponent can escape before a visible count; lower health can permit later counts or a completed pin. Some other held escape requests still lead into actor handlers that have not been reconstructed. Those remain explicit dependencies.

Human headlock input also now includes `$00dc82/$00ddce`: a button edge makes one probability-gated reversal attempt and marks it as attempted. The previous timed held release remains separate. The shared running handoff preserves its descriptor clock before changing the display adapter, preventing an extra initialization update after an AI whip.

## Verification

- **2,145 original linked AI-phase cases** compare actor, peer and partner fields, target measurements, status gates, action requests, counters, pointers, positions and entropy consumption. They cover all twelve types, both facings, region bands, health/severity bands, rounds, pin status, held counters, downed recovery and preserved words. These include zero draws, four rejected draws and the bit-6 control gate for hidden records.
- **288 composed computer exchanges / 48,415 updates** compare arbitration, human recovery input, active AI decisions, both actors, the referee, original alternating contact/damage services, health, poses, projection, AI fields and sounds. There are 260 subsequent-service boundaries, 23 requests for unrecovered actor handlers and five observation caps at 1,800 updates. Original RNG bytes are observed offline and replayed at the corresponding native calls.
- **168 composed computer pin sequences / 38,856 updates** exercise all twelve types, front/back downed victims and seven health bands with the original referee and escape timing. These retain explicit next-service boundaries rather than claiming complete scenes.
- Browser checks use simulated standard gamepads with native audio enabled. Local checks walk into computer-controlled clinches, inspect rendered selections and continue through a clinch strike or the first throw impact, including original sound requests. Hosted checks separately verify rendered choices, controller menus and CPU pin escape. An additional player-applied cover verifies that a 64-health computer escapes after the first original count, without simulated input on the computer's behalf. Physical pad and listening acceptance remain unverified.

The composed fixtures deliberately stop at the next unrecovered AI/actor service. They do not establish complete matches, general contact interruptions, tag/Rumble or outside behavior. Original actor execution continues in the offline reference only for the declared recovered prefix.

Live continuation also reached an ordinary headlock carry followed by action 102, the original corner/tag-partner handoff. Its four-participant attack prefix now has a component translation, documented in [tag research](TAG.md), but the browser's two-wrestler adapter still lacks the required team integration and shows the restart prompt. The broader live exchange check therefore does not pass through that branch. Rendered-choice checks and bounded exchange comparisons are separate evidence; neither establishes a completed tag exchange. Action 102's descriptor is `$0188de`, handler `$0188ee`.

The original active-game flag is `$8000` at `$1c007c`, set by the program at `$0009a4`; earlier component references only needed a nonzero value. AI now accepts an explicit `world.gameFlags` word. Move weighting also reads the original BCD minute word at `$1c16a0`. The current practice adapter supplies a default `$30`; the original match clock and its scene-driven cadence are still pending, so late-match weighting is only compared with explicit clock inputs. Attract-mode scripted choices and complete scene/control routing remain dependencies.

```sh
python tools/extract_ai.py path/to/wwfwfest.zip
node tools/trace_computer_grapple.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/computer-grapple-reference.json
node tools/trace_match_computer.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/match-computer-reference.json
ENTRY=pin node tools/trace_match_computer.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/match-computer-pins-reference.json
npm run check
```

In PowerShell set and remove `ENTRY` around the pin command. `COMPUTER_FILTER` and `MATCH_COMPUTER_FILTER` accept JSON diagnostic filters; `DETAIL=1` adds composed rows. Tests accept `COMPUTER_FIXTURE` or `MATCH_COMPUTER_FIXTURE` for private detailed captures. The original program image and external analysis CPU remain excluded from delivery.
