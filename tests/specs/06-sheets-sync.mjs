import http from 'node:http';
import { seed, readState } from '../harness.mjs';

export const name = 'sheets sync — payload, confirmation, blocked-reply fallback';

/**
 * The endpoint lives on its own origin, because the behaviour under test is
 * cross-origin: a same-origin stub needs no CORS headers, so withholding them
 * would prove nothing.
 */
function startEndpoint(state) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const data = JSON.parse(body || '{}');
        state.received.push(data);
        const headers = { 'Content-Type': 'application/json' };
        if (!state.block) headers['Access-Control-Allow-Origin'] = '*';
        res.writeHead(200, headers);
        res.end(JSON.stringify(data.type === 'ping'
          ? { ok: true, version: 4, sheet: 'Test Sheet' }
          : { ok: true, sets: (data.logs || []).length }));
      });
    });
    server.listen(0, () => resolve({
      origin: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise(r => server.close(r)),
    }));
  });
}

export async function run({ page, t }) {
  const state = { received: [], block: false };
  const endpoint = await startEndpoint(state);
  try {
    await seed(page, (KEY) => {
      const s = JSON.parse(localStorage.getItem(KEY));
      const b = s.exercises.find(e => e.name === 'Bench Press');
      b.perHand = true;
      s.customCats = [{ id: 'custom-legs', name: 'Legs' }];
      s.exercises.push({ id: 'sq', name: 'Back Squat', category: 'custom-legs' });
      s.settings.sheetsUrl = window.__ENDPOINT__ + '/exec';
      localStorage.setItem(KEY, JSON.stringify(s));
    }, { __ENDPOINT__: endpoint.origin });

    const bench = page.locator('.card', { hasText: 'Bench Press' }).first();
    await bench.locator('.card-head').click();
    await page.waitForTimeout(200);
    await bench.locator('.field input').first().fill('60');
    await bench.locator('.field input').nth(1).fill('8');
    await bench.locator('.btn-log').click();
    await page.waitForTimeout(200);

    await page.locator('#syncPill').click();
    await page.waitForTimeout(200);
    await page.locator('#syncNowBtn').click();
    await page.waitForTimeout(1000);

    const syncs = state.received.filter(r => r.type === 'sync');
    t.ok('a sync reached the endpoint', syncs.length > 0, syncs.length);
    const last = syncs[syncs.length - 1];
    t.ok('payload carries exercises and logs', !!(last && last.exercises && last.logs));
    t.ok('custom group name included in category map',
      !!last && JSON.stringify(last.categories).includes('Legs'));
    t.ok('per-hand flag travels', !!last && last.exercises.some(e => e.perHand === true));
    const confirmed = await readState(page);
    t.eq('confirmed sync is not flagged unconfirmed', confirmed.syncMeta.unconfirmed, false);

    // Withhold CORS headers: the browser blocks reading the reply, but the
    // request itself still reaches the endpoint.
    state.block = true;
    const before = state.received.length;
    await page.locator('#syncNowBtn').click();
    await page.waitForTimeout(1500);
    t.ok('payload still delivered when the reply is blocked',
      state.received.length > before, { before, after: state.received.length });
    const blocked = await readState(page);
    t.eq('reported as unconfirmed rather than failed', blocked.syncMeta.unconfirmed, true);
    t.match('status explains it cannot confirm',
      await page.locator('#settingsSyncStatus').textContent(), /confirm|sending|sent/i);
  } finally {
    await endpoint.close();
  }
}
