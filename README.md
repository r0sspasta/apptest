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
  Add an optional note ("felt heavy", "new grip") and it's shown for context
  next session.
- **See what you did last time** — every card shows your most recent previous
  session (best weight, all sets, and when it was) so you know what to beat.
- **Progression hints** — classic double progression: hit 8+ reps at the same
  top weight two sessions running and the card suggests the next increment,
  pre-filled in the weight input.
- **Progress charts** — each card charts your best weight per session, with
  the all-time best highlighted. Tap the chart for exact values.
- **Personal records** — the 🏆 button lists all-time bests per exercise, and
  beating one mid-workout earns a celebration.
- **Training calendar** — the 📅 button shows a month view of your workout
  days and your current weekly streak.
- **Last-session order** — each day shows the order you actually did the
  exercises last time, and ⇅ Reorder lets you arrange cards to match your
  routine.
- **kg / lb** — switch units in settings; data is stored in kg underneath so
  nothing is lost switching back and forth.
- **History** — tap *History* on any card for your last 20 sessions, with your
  all-time best marked ★ and notes shown inline.
- **Installable & offline** — served over HTTPS it's a full PWA: "Add to Home
  Screen" gives a real app icon, full-screen launch, and offline support via a
  service worker.
- **Add exercises** — the **+ Add exercise** button at the bottom of each day
  adds a new exercise to that day.
- **Backup** — *Export data* downloads a JSON backup; *Import data* restores it
  (handy for moving to a new phone). Or set up automatic Google Sheets sync
  (below) and never think about it.

## Google Sheets sync setup

The tracker can automatically push every set you log to your own Google Sheet —
long-term history and an off-device backup in one. It syncs a few seconds after
each change and retries automatically if you're offline at the gym.

One-time setup (about 3 minutes):

1. Go to [sheets.new](https://sheets.new) and create a blank spreadsheet.
   Name it something like *Gym Tracker*.
2. In the sheet's menu, open **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the entire contents of
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs) from this repo.
   Hit the 💾 save icon.
4. Click **Deploy → New deployment**. Click the ⚙️ next to "Select type" and
   choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**, approve the permissions prompt (Google will warn the app
   is unverified — click *Advanced → Go to … (unsafe)*; it's your own script
   reading your own sheet), and copy the **Web app URL** (ends in `/exec`).
6. In the tracker, tap **Sheets sync** in the bottom bar, paste the URL, and
   hit **Save & test**. You should see "Connected ✓" and your sheet fills in.

Your sheet gets four tabs, kept up to date on every sync:

- **Workout Log** — one row per set (`Date | Day | Exercise | Set | Weight |
  Reps | Logged at`), ready for charts or pivot tables.
- **Progress** — an auto-built line chart of best weight per session for your
  most-trained exercises (up to 8 series).
- **Chart Data** — the pivot table feeding that chart.
- **Backup** — a full JSON snapshot. If you ever lose your phone data, join
  the backup cells into a `.json` file and restore via **Import data**.

The sync status dot in the bottom bar shows green (synced), amber (pending),
or red (failed — it retries when you're back online).

Note: the `/exec` URL is unguessable but effectively a "post to my sheet" key —
anyone you give it to could write rows to your sheet, so don't share it.

## Data & privacy

Your logs live in your browser's `localStorage` on your device, and — if you
enable sync — in your own Google Sheet. Nothing is sent anywhere else.

## Running it

The app is deployed with GitHub Pages via `.github/workflows/pages.yml` —
open the Pages URL on your phone and use "Add to Home Screen" to make it feel
like an app. You can also just open `index.html` directly in any browser.
