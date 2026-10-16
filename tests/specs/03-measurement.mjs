import { seed, readState, openCard } from '../harness.mjs';

export const name = 'measurement — bodyweight, per-hand, increments';

export async function run({ page, t }) {
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const ex = n => s.exercises.find(e => e.name === n);
    const hang = { id: 'bw1', name: 'Knee Raise', category: 'chest-biceps', mode: 'bodyweight' };
    s.exercises.push(hang);
    ex('Incline Dumbbell Press').perHand = true;
    let i = 0;
    const add = (e, w, r, d) => s.logs.push({ id: 'm' + (i++), exerciseId: e.id, weight: w, reps: r,
      date: key(ago(d)), ts: Date.now() - d * 86400000 + i * 1000 });
    for (const d of [7, 3]) for (let k = 0; k < 4; k++) add(hang, 0, 10, d);
    add(ex('Incline Dumbbell Press'), 22.5, 10, 3);
    // Bench history with a 1.25 step, so the increment is inferable.
    for (const [w, d] of [[58.75, 12], [60, 6], [60, 3]]) for (let k = 0; k < 3; k++) add(ex('Bench Press'), w, 8, d);
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  // Bodyweight: reps are the metric.
  const bw = page.locator('.card', { hasText: 'Knee Raise' }).first();
  t.match('bodyweight headline in reps', await bw.locator('.ex-meta').textContent(), /10 reps/);
  await openCard(page, 'Knee Raise');
  t.match('bodyweight hint targets reps', await bw.locator('.hint').textContent(), /12 reps/);
  const caps = await bw.locator('.field-label').allTextContents();
  t.ok('weight field is optional added weight', /Added/.test(caps[0]), caps);

  // Per-hand labelling.
  const db = page.locator('.card', { hasText: 'Incline Dumbbell Press' }).first();
  t.match('per-hand shown in summary', await db.locator('.ex-meta').textContent(), /kg\/hand/);

  // Increment inferred from history (1.25), driving the hint.
  const bench = page.locator('.card', { hasText: 'Bench Press' }).first();
  await openCard(page, 'Bench Press');
  t.match('hint uses inferred 1.25 increment', await bench.locator('.hint').textContent(), /61\.25 kg/);

  // Explicit increment overrides, and the hint follows it.
  await bench.locator('.link-btn', { hasText: 'Edit' }).click();
  await page.waitForTimeout(250);
  await page.locator('#exIncrement').selectOption('5');
  await page.locator('#exEditSave').click();
  await page.waitForTimeout(300);
  t.match('hint follows explicit 5 kg increment', await bench.locator('.hint').textContent(), /65 kg/);
  const st = await readState(page);
  t.eq('increment stored in kg', st.exercises.find(e => e.name === 'Bench Press').increment, 5);
}
