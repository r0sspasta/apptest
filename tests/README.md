# Tests

Browser tests for the tracker. They drive the real `index.html` in headless
Chromium against seeded `localStorage`, so they exercise the app the way it
actually runs rather than a stubbed version of it.

## Running

```sh
cd tests
npm install          # once
npm test             # all specs
npm test -- guided   # only specs whose filename matches "guided"
```

Chromium is found at `/opt/pw-browsers/chromium`; override with
`CHROMIUM_PATH=/path/to/chromium`.

Exit code is non-zero if any spec fails, so it works in CI as-is.

## Layout

- `harness.mjs` — static server on an ephemeral port, browser launch, seeding
  and assertion helpers.
- `run.mjs` — runs every spec in `specs/` in a fresh browser context, prints
  pass/fail, and fails the run on any uncaught page error.
- `specs/*.mjs` — one file per area. Each exports `name`, `run({ page, t })`,
  and optionally `routes` to stub a server endpoint.

## What's covered

| Spec | Guards against |
|---|---|
| `01-data-integrity` | Losing logged workouts across reloads or app changes; storage key drift; stray `clear()`/`removeItem()` |
| `02-set-types` | Drop sets counting toward targets or PRs; drops and to-failure sets tripping the uneven-sets warning |
| `03-measurement` | Bodyweight exercises measured by weight; per-hand labelling; wrong weight increments, including the hint suggesting unloadable weights |
| `04-guided-session` | Wrong muscle group predicted; prefill, one-tap repeat, tap-to-type, the "now" marker, clocks, adding an exercise mid-flow |
| `05-session-view` | Today's exercises ordered by routine instead of when started; setup notes; past-session list and durations |
| `06-sheets-sync` | Payload losing custom groups or per-hand flags; a browser blocking the reply being reported as failure instead of sending anyway |

## Writing a spec

```js
import { seed, readState, openCard } from '../harness.mjs';

export const name = 'what this protects';

export async function run({ page, t }) {
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    // ...mutate...
    localStorage.setItem(KEY, JSON.stringify(s));
  });
  t.eq('label', actual, expected);
}
```

`seed` runs its function in the page and reloads, so the app re-reads the
state. Assertions are `t.ok`, `t.eq` and `t.match`; `t.note` prints a line
without failing.
