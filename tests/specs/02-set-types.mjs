import { seed, readState, openCard } from '../harness.mjs';

export const name = 'set types — drops, to-failure, grouping, targets';

export async function run({ page, t }) {
  // Last session: 3 straight sets, a drop, and a set to failure.
  // Historically the drop and the failure set both looked like failed sets
  // to the evenness check, which wrongly suppressed the progression hint.
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    const b = s.exercises.find(e => e.name === 'Bench Press');
    const d = new Date(); d.setDate(d.getDate() - 3);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    let i = 0;
    const add = o => s.logs.push(Object.assign(
      { id: 'L' + (i++), exerciseId: b.id, date: key, ts: Date.now() - 3 * 86400000 + i * 1000 }, o));
    add({ weight: 60, reps: 10 }); add({ weight: 60, reps: 10 }); add({ weight: 60, reps: 10 });
    add({ weight: 40, reps: 6, drop: true });
    add({ weight: 60, reps: 7, amrap: true });
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  const bench = page.locator('.card', { hasText: 'Bench Press' }).first();
  const meta = (await bench.locator('.ex-meta').textContent()).trim();
  t.ok('drop rendered chained in summary', meta.includes('60×10 → 40×6'), meta);
  t.ok('to-failure marked', /60×7./.test(meta), meta);
  t.ok('no uneven-sets flag from drop/failure', !meta.includes('uneven'), meta);

  await openCard(page, 'Bench Press');
  t.eq('no uneven-sets warning box', await bench.locator('.warn').count(), 0);

  // Target counts working sets only: 3 straight + 1 to-failure = 4, drop excluded.
  await bench.locator('.field input').first().fill('60');
  await bench.locator('.field input').nth(1).fill('10');
  await bench.locator('.btn-log').click();
  await page.waitForTimeout(250);
  t.match('target after one working set', await bench.locator('.today-label').textContent(), /1 of 4/);

  // A drop must not advance the working-set count.
  await bench.locator('.type-toggle', { hasText: 'Drop set' }).click();
  await page.waitForTimeout(120);
  await bench.locator('.field input').first().fill('40');
  await bench.locator('.field input').nth(1).fill('6');
  await bench.locator('.btn-log').click();
  await page.waitForTimeout(250);
  t.match('drop does not advance target', await bench.locator('.today-label').textContent(), /1 of 4/);
  t.match('drop chained in today chip',
    (await bench.locator('.set-chip').first().textContent()).replace(/\s+/g, ' '), /60 kg × 10.*40 kg × 6/);

  // Identical sets collapse.
  await bench.locator('.repeat-btn').click();
  await page.waitForTimeout(250);
  const state = await readState(page);
  const today = state.logs.filter(l => l.date === new Date().toISOString().slice(0, 10));
  t.ok('drop flag persisted', today.some(l => l.drop === true));
  t.ok('plain sets have no drop flag', today.filter(l => !l.drop).length >= 2);
}
