# Backlog

Ideas raised but not built. Nothing here is committed to a timeline.

## Set types — built

Supersets, drop sets and sets to failure all shipped. Remaining refinements:

- The last-session order strip still lists supersetted exercises as two
  consecutive entries rather than one unit.
- Progression hints don't yet treat a to-failure set specially — ideally they
  compare against the last to-failure set at the same weight, since you're
  chasing reps rather than load.
- A rest timer, if built, should start after a superset round rather than
  after each set.

## Weight increments

The app assumes one increment everywhere: 2.5 kg (5 lb). That's hardcoded in
two places — the guided session's weight stepper, and the progression hint's
suggested next weight — and it doesn't match how weight actually moves on
different equipment. A cable stack might go up in 5 kg pins, dumbbells in 2 kg
steps, a barbell in 1.25 kg per side (2.5 kg total), and microplates finer
than any of them.

Consequences today: on a machine with 5 kg pins the stepper needs two taps per
notch, and the hint suggests a weight that doesn't physically exist. On
dumbbells the reverse — it offers a jump the rack can't make.

Approach, in order of preference:

- **Per-exercise increment**, set in the Edit dialog alongside target sets.
  Highest fidelity, and it's per-exercise information the way per-hand and
  bodyweight already are.
- **Default it from history** rather than making it another field to fill in:
  the smallest weight change ever recorded for that exercise is a good guess
  at its real increment, so most exercises would configure themselves after a
  couple of sessions.
- **A second, larger step** in the wizard (−5 / −2.5 / +2.5 / +5) for when the
  jump is bigger than one notch, so heavy changes don't need six taps.

Notes:

- The progression hint must use the same per-exercise increment, or it will
  keep suggesting impossible weights.
- For per-hand exercises the increment applies to the per-hand number, so a
  2 kg dumbbell step is a 4 kg total change.
- Bodyweight exercises need this for their optional added weight too.

## Coaching

- **Stall detection** — flag an exercise that has not progressed for 3–4
  sessions and suggest a deload (drop ~10%, build back up). The app currently
  says when to add weight but never says when you are stuck.
- **Rest timer** — the guided session shows elapsed rest, but it is passive:
  no target, no alert when the rest is up.
- **Warm-up set flag** — so light sets don't count toward PRs, averages, or
  the uneven-sets check.

## Guided session refinements

- Supersets aren't reflected in the flow — after logging one half, it should
  offer the partner exercise next rather than returning to the full list.
- The group prediction ignores rest days, so on a rest day it still suggests
  whatever is most overdue rather than saying "nothing due".

## Data and safety

- **Backup health warning** — say so plainly if nothing has synced or been
  exported in ~5 days, instead of quietly holding local-only data.
- **Two-way sheet sync** — pull as well as push, to fix the multi-device split
  properly rather than warning about it. Currently last-writer-wins.
- **Bodyweight log** — one number a day, charted against lifts.

## Engineering

- **Commit the test suite.** Every change so far was verified against a
  headless-browser suite, but those tests live outside the repo, so nothing
  guards against regressions. Committing them makes everything above safer to
  build — particularly the set types, which touch logic used everywhere.
