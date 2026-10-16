import { seed, readState, openWizard } from '../harness.mjs';

export const name = 'guided session — prediction, prefill, repeat, add, clocks';

export async function run({ page, t }) {
  // The real rotation: shoulders oldest, so shoulders is due.
  await seed(page, (KEY) => {
    const s = JSON.parse(localStorage.getItem(KEY));
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const ex = n => s.exercises.find(e => e.name === n);
    let i = 0;
    const add = (e, w, r, d, off) => s.logs.push({ id: 'w' + (i++), exerciseId: e.id, weight: w, reps: r,
      date: key(ago(d)), ts: Date.now() - d * 86400000 + (off || 0) });
    for (let k = 0; k < 4; k++) add(ex('Overhead Press'), 40, 8, 8, k * 1000);
    for (let k = 0; k < 4; k++) add(ex('Lateral Raise'), 10, 12, 8, 10000 + k * 1000);
    for (let k = 0; k < 4; k++) add(ex('Bench Press'), 60, 8, 6, k * 1000);
    for (let k = 0; k < 4; k++) add(ex('Lat Pulldown'), 55, 10, 4, k * 1000);
    for (let k = 0; k < 4; k++) add(ex('Cable Crunch'), 30, 15, 2, k * 1000);
    localStorage.setItem(KEY, JSON.stringify(s));
  });

  await page.locator('#wizFab').click();
  await page.waitForTimeout(250);
  t.eq('least-recently-trained group suggested',
    (await page.locator('.wiz-hero .name').textContent()).trim(), 'Shoulders');
  t.eq('alternatives ordered by due',
    (await page.locator('.wiz-row .n').allTextContents()).map(s => s.trim()),
    ['Chest & Biceps', 'Back & Triceps', 'Abs']);

  await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(250);
  const rows = (await page.locator('.wiz-row .n').allTextContents()).map(s => s.trim());
  t.eq('exercises in last-session order', rows.slice(0, 2), ['Overhead Press', 'Lateral Raise']);

  // Prefill from last session, one tap to log.
  await page.locator('.wiz-row', { hasText: 'Overhead Press' }).first().click();
  await page.waitForTimeout(250);
  t.match('prefilled from history', await page.locator('.wiz-foot .btn-big').textContent(), /Log 40 kg × 8/);
  await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(300);
  t.match('set count against target', await page.locator('.wiz-ref .val').textContent(), /1 of 4/);

  // Repeat is one tap.
  await page.locator('.wiz-foot .btn-big').first().click();
  await page.waitForTimeout(300);
  t.match('repeat advances count', await page.locator('.wiz-ref .val').textContent(), /2 of 4/);

  // Manual entry via tap-to-type.
  await page.locator('.btn-big.ghost', { hasText: 'Adjust' }).click();
  await page.waitForTimeout(200);
  await page.locator('.stepper .val').first().click();
  await page.waitForTimeout(200);
  t.eq('tap-to-type input appears', await page.locator('.step-input').count(), 1);
  await page.locator('.step-input').fill('43.75');
  await page.locator('.step-input').press('Enter');
  await page.waitForTimeout(250);
  t.match('exact value accepted', await page.locator('.wiz-foot .btn-big').textContent(), /43\.75 kg/);
  await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(300);

  // In-progress exercise is marked and the clocks run.
  await page.locator('.btn-big.ghost', { hasText: 'Next exercise' }).click();
  await page.waitForTimeout(300);
  const cur = page.locator('.wiz-row.current');
  t.eq('exactly one current row', await cur.count(), 1);
  t.eq('current row is the one in progress', (await cur.locator('.n').textContent()).trim(), 'Overhead Press');
  t.match('session clock showing', await page.locator('#wizSession').textContent(), /^\d+:\d{2}/);
  t.match('rest clock showing', await page.locator('#wizRest').textContent(), /rest/);

  // Add a new exercise without leaving the flow.
  await page.locator('.wiz-add-row').click();
  await page.waitForTimeout(220);
  t.ok('create disabled until named', await page.locator('.wiz-foot .btn-big').isDisabled());
  await page.locator('.wiz-input').fill('Cable Y-Raise');
  await page.waitForTimeout(120);
  await page.locator('#wiz .seg button', { hasText: 'Bodyweight' }).click();
  await page.waitForTimeout(150);
  t.eq('name kept across mode toggle', await page.locator('.wiz-input').inputValue(), 'Cable Y-Raise');
  await page.locator('#wiz .seg button', { hasText: 'Weighted' }).click();
  await page.waitForTimeout(150);
  await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(350);
  t.eq('lands on the new exercise',
    (await page.locator('#wizTitle').textContent()).trim(), 'Cable Y-Raise');

  const st = await readState(page);
  const made = st.exercises.find(e => e.name === 'Cable Y-Raise');
  t.ok('new exercise created', !!made);
  t.eq('in the right group', made && made.category, 'shoulders');
}
