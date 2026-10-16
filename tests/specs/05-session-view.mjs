import { seed, readState, openCard, openWizard } from '../harness.mjs';

export const name = 'session view — ordering, setup notes, past sessions, summary';

export async function run({ page, t }) {
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const ex = n => s.exercises.find(e => e.name === n);
    let i = 0;
    const at = (e, w, r, d, mins) => {
      const day = ago(d); day.setHours(18, 0, 0, 0);
      s.logs.push({ id: 'v' + (i++), exerciseId: e.id, weight: w, reps: r,
        date: key(ago(d)), ts: day.getTime() + mins * 60000 });
    };
    // Two past sessions, each spanning a measurable duration.
    for (let k = 0; k < 3; k++) at(ex('Overhead Press'), 40, 8, 6, k * 5);
    for (let k = 0; k < 3; k++) at(ex('Lateral Raise'), 10, 12, 6, 25 + k * 5);
    for (let k = 0; k < 3; k++) at(ex('Bench Press'), 60, 8, 2, k * 5);
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  // --- setup notes ---
  const bench = await openCard(page, 'Bench Press');
  await bench.locator('.link-btn', { hasText: 'Edit' }).click();
  await page.waitForTimeout(250);
  await page.locator('#exSetup').fill('Seat 4 · pin 7');
  await page.locator('#exEditSave').click();
  await page.waitForTimeout(300);
  t.match('setup note on the card',
    (await bench.locator('.setup-note').textContent()).replace(/\s+/g, ' '), /Seat 4 · pin 7/);
  const st1 = await readState(page);
  t.eq('setup persisted', st1.exercises.find(e => e.name === 'Bench Press').setup, 'Seat 4 · pin 7');

  await openWizard(page, 'Chest & Biceps');
  await page.locator('.wiz-row', { hasText: 'Bench Press' }).first().click();
  await page.waitForTimeout(250);
  t.match('setup note shown at the machine',
    (await page.locator('#wiz .setup-note').textContent()).replace(/\s+/g, ' '), /Seat 4 · pin 7/);
  await page.locator('#wizClose').click();
  await page.waitForTimeout(200);

  // --- today's exercises order by when started, not stored order ---
  await page.locator('.tab', { hasText: 'Shoulders' }).click();
  await page.waitForTimeout(250);
  // Start the last exercise in the list first, then an earlier one.
  const shrugs = await openCard(page, 'Shrugs');
  await shrugs.locator('.field input').first().fill('50');
  await shrugs.locator('.field input').nth(1).fill('10');
  await shrugs.locator('.btn-log').click();
  await page.waitForTimeout(250);
  const ohp = await openCard(page, 'Overhead Press');
  await ohp.locator('.field input').first().fill('40');
  await ohp.locator('.field input').nth(1).fill('8');
  await ohp.locator('.btn-log').click();
  await page.waitForTimeout(300);

  const doneNames = (await page.locator('.card.done-today .ex-name').allTextContents())
    .map(s => s.replace(/#\d+/, '').trim());
  t.eq('done-today ordered by when started', doneNames, ['Shrugs', 'Overhead Press']);
  t.eq('today position badges',
    (await page.locator('.card.done-today .ex-order-badge').allTextContents()), ['#1', '#2']);
  t.eq('started exercises are not draggable',
    await page.locator('.card.done-today .grip').count(), 0);

  // --- finish summary includes duration ---
  await page.locator('.finish-btn').click();
  await page.waitForTimeout(500);
  const tiles = (await page.locator('.sum-tile').allTextContents()).map(s => s.replace(/\s+/g, ' ').trim());
  t.eq('four summary tiles', tiles.length, 4);
  t.ok('duration tile present', tiles.some(x => /minutes/i.test(x)), tiles);
  await page.locator('#finishClose').click();
  await page.waitForTimeout(200);

  // --- past sessions ---
  await page.locator('#histBtn').click();
  await page.waitForTimeout(300);
  const rowCount = await page.locator('.sess-row').count();
  t.eq('one row per day trained', rowCount, 3);
  const dates = (await page.locator('.sess-row .sess-date').allTextContents()).map(s => s.trim());
  t.eq('newest session first', dates[0], 'today');
  const stats = (await page.locator('.sess-row .sess-stats').allTextContents()).map(s => s.trim());
  t.ok('stats include sets and volume', /sets/.test(stats[1]) && /kg/.test(stats[1]), stats[1]);
  t.ok('past session shows duration', /min/.test(stats[1]), stats[1]);

  await page.locator('.sess-row').nth(1).click();
  await page.waitForTimeout(250);
  t.ok('expands to per-exercise detail', (await page.locator('.sess-row.open .sess-ex').count()) > 0);
  await page.locator('.sess-row').nth(1).click();
  await page.waitForTimeout(200);
  t.eq('collapses again', await page.locator('.sess-row.open').count(), 0);
}
