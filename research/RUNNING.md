# Native running, braking and rope rebounds

`src/actors/running.js` translates the ordinary inside-ring state 2/3/6 handlers. `src/game.js` connects them to keyboard, touch and standard gamepad input. Running is a persistent action: releasing the button does not stop the wrestler. Push the opposite horizontal direction to brake. The dedicated Run control supplies the original simultaneous punch/kick press edge. Holding that shortcut leaves the physical punch/kick buttons available for running attacks.

## Original routines

| Address | Purpose |
| --- | --- |
| `$00d0c6`, `$00d1d6`, `$00d208` | Action selection; row-zero simultaneous button edges select state 2 |
| `$00e58c` | Run entry direction and opposite-direction braking |
| `$010ea2`, `$010ec2` | Run descriptor and handler |
| `$010f8a` | Twelve character-specific run speeds |
| `$010fc2`, `$010fce` | Braking descriptor and handler |
| `$011010`, `$011020` | Rope rebound descriptor and handler |
| `$01036e` | Footstep sound command `$33` |
| `$010f96`, `$010206` | Rope animation requests |
| `$00248c` | Signed sprite offsets, including rebound offset 32 |

Speeds are `[47,53,49,45,56,48,44,56,40,47,48,47]` and use the recovered polar tables. Run poses 9–14 each last seven updates. Entry chooses a horizontal direction or uses the existing facing when the stick is neutral. Horizontal entry can change facing and set source flag `$32.2`. A rebound-to-run transition retains its reversed direction.

Braking clears source flag `$33.4`, displays pose 10 indefinitely, and subtracts five from the word speed on each initialized update. Movement stops when subtraction makes that word negative. Ring contact during braking can instead select state 6.

Rebound entry reverses facing and direction, sets movement mode zero, sets speed 12 and sets sprite offset 32. Pose 105 uses descriptor delays 8 and 12, which correspond to nine and thirteen updates. Movement resumes after the second descriptor frame is visible. Completion clears the sprite offset and selects state 2; the following update restores the character's full run speed. The normal ring collision corrections and their fractional-word preservation are unchanged.

The descriptor handler runs before its clock advances. Footsteps therefore use the prior clock's remaining/index fields. Sound command `$33` occurs when that counter is zero on indices 1 or 4; it routes through the native effect sequencer. Run-entry animation counters are retained from the prior action, as in the source.

## Verification

`tools/trace_running.mjs` executes the original routines offline using an externally supplied analysis interpreter. Its 192 scenarios cover all twelve character speeds, both facings, neutral/left/right entry, opposite-direction braking, release without braking, forced/requested stops, edge coordinates at three ring depths, repeated rebounds, one/two/three-bounce counters, and entry from active walking clocks at six counter/index combinations.

Each update compares state, descriptor flags/counters/pose, 16.16 positions, movement mode, speed/direction/facing, source flags, bounce counter, contact record after pose cleanup, sprite offsets, collision type/flags, sound commands and rope requests. Fixtures preserve an SHA-256 digest of every update plus the final full record. A further integrated test runs 182 of those scenarios through the actual JavaScript match/controller shortcut and checks the same reference hashes, world positions, contacts, visible facing, offset projection and routed sounds. A separate input check compares the dedicated run control with simultaneous punch/kick presses.

Browser verification used a simulated standard gamepad, enabled real browser audio output, and exercised persistent running, every run pose, a visible pose-105 rebound, reversed movement, braking speeds, return to idle, and simultaneous face-button entry. The existing menu/pause/disconnect/controller flow also passed. No physical controller or listening acceptance is claimed.

```sh
python tools/extract_actors.py path/to/wwfwfest.zip
node tools/trace_running.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/running-reference.json
npm run check
```

## Remaining work

This implements normal inside-ring locomotion and rebound physics. The rope requests are recovered, but moving rope graphics remain to be integrated. The eight ordinary running actions, paired captures and body collisions are now described in [running action research](RUNNING_ATTACKS.md). Other action-selection rows, standing grapple states, outside-ring collision kinds 3/5 and mode-dependent behavior remain unfinished. The current match AI and rules remain provisional. CPU execution is confined to offline research; the browser runs translated JavaScript functions.
