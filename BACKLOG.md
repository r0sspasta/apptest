# Backlog

Ideas raised but not built. Nothing here is committed to a timeline.

## Set types

All three of these are ways of saying "this set isn't a plain straight set",
and they share a data model: a `type` (and grouping) on the log entry. Worth
building together rather than one at a time.

They also all collide with logic that already exists, so whichever gets built
first needs to teach the existing rules to ignore or special-case it:

- The **uneven-sets warning** flags a session where most sets hit the same rep
  count and a minority fell short. A drop set or a to-exhaustion set looks
  exactly like that, so today both would be wrongly flagged.
- **Target sets** counts rows. Drop-set continuations shouldn't count as
  separate sets toward "3 of 4".
- **PRs, charts and progression hints** should key off the top set, not the
  drops.

### Superset

Two or more exercises done back to back with no rest, alternating rounds.

- Data: a superset group linking exercises (not individual sets), so the
  pairing persists between sessions.
- Display: bracket the paired cards together; the last-session order strip
  should show them as one unit rather than two consecutive entries.
- A rest timer, if built, starts after the round rather than after each set.

### Drop set

A working set, then immediately reduced weight and continued, sometimes
through several drops.

- Data: continuation sets flagged as drops belonging to a parent set.
- Display: nest the drops under their parent chip (`60×8 → 45×6 → 30×5`)
  rather than listing them as separate sets.
- Only the parent set counts toward set targets and PRs.

### Set to exhaustion (AMRAP)

A set taken to failure; the rep count is an outcome, not a target.

- Data: a boolean flag on the set.
- Reps vary by nature, so exclude these from the uneven-sets check.
- Progression differs: you're chasing reps at a fixed weight, so the hint
  should compare against the last to-failure set at the same weight.
- Usually the final set of an exercise — worth showing distinctly in history.

## Coaching

- **Stall detection** — flag an exercise that has not progressed for 3–4
  sessions and suggest a deload (drop ~10%, build back up). The app currently
  says when to add weight but never says when you are stuck.
- **Rest timer** — starts when a set is logged, alerts when rest is up, learns
  the usual gap between sets.
- **Warm-up set flag** — so light sets don't count toward PRs, averages, or
  the uneven-sets check.

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
