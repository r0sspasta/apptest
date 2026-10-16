import { seed, readState, dateHelpers, openCard } from '../harness.mjs';

export const name = 'data integrity — stored logs survive app changes';

export async function run({ page, t }) {
  // A week of history written by the app, as a real user would accumulate.
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    const key = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const ex = n => s.exercises.find(e => e.name === n);
    let i = 0;
    for (const [name, w, r, d] of [
      ['Bench Press', 60, 8, 7], ['Barbell Curl', 30, 10, 7],
      ['Lateral Raise', 10, 12, 5], ['Bench Press', 62.5, 8, 3],
      ['Lat Pulldown', 55, 10, 1],
    ]) {
      s.logs.push({ id: 'd' + (i++), exerciseId: ex(name).id, weight: w, reps: r,
        date: key(ago(d)), ts: Date.now() - d * 86400000 + i * 1000 });
    }
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  const before = await readState(page);
  t.eq('seeded logs present', before.logs.length, 5);

  // Reload: the app must re-read, not reset.
  await page.reload();
  await page.waitForTimeout(300);
  const after = await readState(page);
  t.eq('logs survive reload', after.logs.length, before.logs.length);
  t.eq('exercises survive reload', after.exercises.length, before.exercises.length);

  // Exercising the UI must not drop data.
  await openCard(page, 'Bench Press');
  await page.locator('#prBtn').click();
  await page.waitForTimeout(150);
  await page.locator('#prClose').click();
  await page.locator('#calBtn').click();
  await page.waitForTimeout(150);
  await page.locator('#calClose').click();
  await page.waitForTimeout(150);
  const end = await readState(page);
  t.eq('logs intact after UI interaction', end.logs.length, before.logs.length);

  // The app must never clear storage wholesale.
  const src = await page.evaluate(() => document.documentElement.outerHTML);
  t.ok('no localStorage.clear in app', !/localStorage\.clear\s*\(/.test(src));
  t.ok('no removeItem in app', !/localStorage\.removeItem\s*\(/.test(src));
  t.ok('single storage key', (src.match(/gymTracker\.v\d/g) || []).every(k => k === 'gymTracker.v1'));
}
