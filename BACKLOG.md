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
- No way to add an exercise from inside the guided flow; you have to leave it.
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
