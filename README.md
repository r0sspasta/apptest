# 🏋️ Gym Tracker

A simple, mobile-friendly dashboard for tracking the weights you lift at the gym,
built as a single self-contained HTML page — no server, no accounts, no install.

## Gym days

Exercises are organised under four tabs, one per gym day:

1. **Chest & Biceps**
2. **Shoulders**
3. **Back & Triceps**
4. **Abs**

Each day comes pre-seeded with common exercises, and every exercise can be
renamed or deleted, so you can shape the list to match your own routine.

## How it works

- **Log between sets** — open an exercise card, type the weight (reps optional)
  and hit **Log set**. Each set is stamped with today's date automatically.
- **See what you did last time** — every card shows your most recent previous
  session (best weight, all sets, and when it was) so you know what to beat.
  The weight input is even pre-hinted with last session's best.
- **Progression at a glance** — once you log today, the card shows
  ▲ / ▼ / = against last session's best weight.
- **History** — tap *History* on any card for your last 20 sessions, with your
  all-time best marked ★.
- **Add exercises** — the **+ Add exercise** button at the bottom of each day
  adds a new exercise to that day.
- **Backup** — *Export data* downloads a JSON backup; *Import data* restores it
  (handy for moving to a new phone).

## Data & privacy

Everything is stored in your browser's `localStorage` on your device. Nothing
leaves your phone. Clearing site data clears your logs, so export a backup now
and then.

## Running it

Open `index.html` in any browser — or host it anywhere static (GitHub Pages
works great) and add it to your phone's home screen for gym use.
