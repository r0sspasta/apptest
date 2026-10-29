import { seed, openCard } from '../harness.mjs';

export const name = 'variations — recency tracking and even rotation';

const TAGS = {
  'Flat Barbell Bench': ['barbell', 'flat'],
  'Incline Barbell Bench': ['barbell', 'incline'],
  'Decline Barbell Bench': ['barbell', 'decline'],
  'Flat Dumbbell Press': ['dumbbell', 'flat'],
  'Incline Dumbbell Bench': ['dumbbell', 'incline'],
  'Decline Dumbbell Bench': ['dumbbell', 'decline'],
};

const SEED = `
  const defs = ${JSON.stringify(Object.entries(TAGS))};
  defs.forEach(([name, tags], i) => {
    s.exercises.push({ id: 'bv' + i, name, category: 'chest-biceps',
      variantGroup: 'g-bench', tags });
  });
`;

/** Build a seeder that installs the six variations plus optional history.
 *  Idempotent: it clears any previous run's variations and logs first. */
function seeder(history) {
  return new Function('KEY', `
    const s = JSON.parse(localStorage.getItem(KEY));
    s.exercises = s.exercises.filter(e => e.variantGroup !== 'g-bench');
    s.logs = s.logs.filter(l => !String(l.id).startsWith('vh') && !String(l.exerciseId).startsWith('bv'));
    ${SEED}
    const key = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const byName = n => s.exercises.find(e => e.name === n);
    let i = 0;
    for (const [name, daysAgo] of ${JSON.stringify(history || [])}) {
      s.logs.push({ id: 'vh' + (i++), exerciseId: byName(name).id, weight: 60, reps: 8,
        date: key(ago(daysAgo)), ts: Date.now() - daysAgo * 86400000 + i * 1000 });
    }
    localStorage.setItem(KEY, JSON.stringify(s));
  `);
}

async function openGroup(page) {
  await page.locator('#wizFab').click();
  await page.waitForTimeout(220);
  const alt = page.locator('.wiz-row .n', { hasText: 'Chest & Biceps' });
  if (await alt.count()) await alt.first().click();
  else await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(250);
  await page.locator('.wiz-row', { hasText: '⟳' }).first().click();
  await page.waitForTimeout(250);
}

const dueName = async page =>
  (await page.locator('.wiz-row.current .n').textContent()).replace(/due$/i, '').trim();

export async function run({ page, t }) {
  // ---- collapsing: six variations occupy one row ----
  await seed(page, seeder());
  await page.locator('#wizFab').click();
  await page.waitForTimeout(220);
  const alt = page.locator('.wiz-row .n', { hasText: 'Chest & Biceps' });
  if (await alt.count()) await alt.first().click();
  else await page.locator('.wiz-foot .btn-big').click();
  await page.waitForTimeout(250);
  t.eq('variation group shown as a single row',
    await page.locator('.wiz-row .var-badge').count(), 1);
  t.match('row shows how many variations',
    await page.locator('.wiz-row .var-badge').first().textContent(), /6/);
  await page.locator('#wizClose').click();
  await page.waitForTimeout(150);

  // ---- the pairing rule, against the real app ----
  await seed(page, seeder());
  await openGroup(page);
  t.eq('all six listed', await page.locator('.wiz-row').count(), 6);
  const first = await dueName(page);
  t.ok('a variation is due when none are done', !!TAGS[first], first);

  await page.locator('.wiz-foot .btn-big').click();   // Start the due one
  await page.waitForTimeout(250);
  await page.locator('.wiz-foot .btn-big').click();   // Log a set
  await page.waitForTimeout(350);
  await page.locator('.wiz-back').click();            // back to the variations
  await page.waitForTimeout(300);

  const second = await dueName(page);
  t.ok('second suggestion exists', !!TAGS[second], second);
  t.ok('second shares no tag with the first — one of each kind, different angle',
    TAGS[second] && !TAGS[second].some(x => TAGS[first].includes(x)),
    { first, second });
  t.match('the skipped tags are explained',
    await page.locator('.wiz-h').first().textContent(), /skipping/i);
  t.note(`pairing chosen: ${first} + ${second}`);
  await page.locator('#wizClose').click();
  await page.waitForTimeout(150);

  // ---- never-done beats long-ago ----
  await seed(page, seeder([
    ['Flat Barbell Bench', 20], ['Incline Barbell Bench', 18],
    ['Decline Barbell Bench', 16], ['Flat Dumbbell Press', 14],
    ['Incline Dumbbell Bench', 12],
    // Decline Dumbbell Bench: never done
  ]));
  await openGroup(page);
  t.eq('never-done is due ahead of everything else',
    await dueName(page), 'Decline Dumbbell Bench');
  await page.locator('#wizClose').click();
  await page.waitForTimeout(150);

  // ---- with all done, the stalest is due ----
  await seed(page, seeder([
    ['Flat Barbell Bench', 3], ['Incline Barbell Bench', 9],
    ['Decline Barbell Bench', 21], ['Flat Dumbbell Press', 6],
    ['Incline Dumbbell Bench', 12], ['Decline Dumbbell Bench', 15],
  ]));
  await openGroup(page);
  t.eq('stalest variation is due', await dueName(page), 'Decline Barbell Bench');
  const details = (await page.locator('.wiz-row .d').allTextContents()).map(s => s.trim());
  t.match('recency is spelled out in days', details[0], /\d+d ago/);
  t.ok('listed stalest first',
    /21d/.test(details[0]) && /3d/.test(details[details.length - 1]), details);
  await page.locator('#wizClose').click();
  await page.waitForTimeout(150);

  // ---- the card view shows the rotation too ----
  const card = await openCard(page, 'Flat Barbell Bench');
  t.ok('card marks it as one of a group', (await card.locator('.var-badge').count()) > 0);
  const rot = await card.locator('.setup-note', { hasText: 'Rotation' }).textContent();
  t.match('card names what is due', rot, /due\s*Decline Barbell Bench/i);
  t.match('card lists each variation with its recency', rot, /21d ago/);
}
