# Native result actors

The normal tag playtest now waits for the original actor result byte at offset
`$a0` (`finishFlags`). Bit 6 marks the winning team and bit 7 the losing team;
all-four loss markers are a draw. A forced state is a request to continue, not a
winner. The original scene loop tests these flags at `$00116e/$0011f0`.

`actors/result.js` translates action 139 (`$019f64`, descriptor `$019f50`)
and action 140 (`$019fbc`, mode-zero descriptor `$019fb6`). The first plays the
team celebration and requests sound 48 before writing both teams' final bytes.
The second keeps its own wrapping clock and loss pose, then handles countout
or draw flags. The mode-1 draw branch scans active non-CPU records, as in the
source. It is not a complete Royal Rumble result implementation.

`actors/tag-states.js` also translates walk mode 12 (`$010dac`). The normal
team's lead and partner pursue their distinct result positions, wait for each
other, then enter 139 together. Facing, speed, descriptor replacement, position
fractions and clocks follow the original. The mode-1 branch has its separate
return target and idle/control write. Normal-ring direct camera targets come
from `$00ee08`: x=480, y=560. The browser had previously frozen direct following
at the current camera when the referee requested priority 4.

The browser recognizes the completed flags after the original four-record core
finishes its current update. It then displays the winner or DRAW and accepts a
rematch. This connects recovered outcome actors to the current browser UI;
original result text/cutscenes, selection/campaign advancement, round setup and
clock remain unfinished. The remaining move and outside handlers can still
interrupt ordinary matches before an outcome.

Earlier two-actor submission recordings retain their exact captured prefixes,
including their declared final stop before a later handler. Their tests compare
those original rows without treating that historical stop as proof that the
handler remains untranslated. The new four-record result references below
verify the continuation with the required team graph. Playable pin-finish
checks also use that current four-record mode.

## Original-program evidence

- **192 handler sequences / 25,839 updates** cover all twelve types in both
  modes: main/partner return, already-arrived records, waiting and paired
  arrival, celebration, ordinary loss, countout and draw. Only one handler
  updates while three passive records capture linked writes. Each ends on the
  acting finish byte or at 200 updates. These are not full rounds.
- **84 composed sequences / 27,072 updates** run camera, targets, arbitration,
  timers, announcer, human input, AI, referee, all four actors, alternating
  contact/damage and sprite-queue cleanup. Forty-eight cases begin at explicit
  committed front/back covers on either side. The referee starts in the moving
  state established before such a cover; a cold reset with a pre-existing pin
  would leave that source approach stationary. Another 36 cases start at
  countout/draw forced-tail conditions. These do not exercise outside-ring
  countout entry. Every sequence stops at final source bytes and asserts the
  resulting human/CPU/draw outcome, without inventing a later scene.

A local simulated standard pad selected partners, started play, tagged to the
incoming teammate, moved, paused/resumed, selected a controlled cover, heard
count requests 98/99/100, and reached the native celebration/final bytes. Menu
started a new four-person match. A separate seeded draw accepted the same
restart. Original artwork was visually checked. Audio was enabled; physical
pad and human listening acceptance remain unverified.

Use `trace_result.mjs` for handler observations and `TEAM_RESULT=1` with
`trace_team_match.mjs` for composed references. `DETAIL=1` stores diagnostic
rows privately. `RESULT_FILTER` filters handler profile/mode/type; `TEAM_FILTER`
filters composed profile/type. The external research CPU and program image are
not part of browser delivery.
