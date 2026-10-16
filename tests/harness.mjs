import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(HERE, '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

/** Serve the app on an ephemeral port. Returns { origin, close }. */
export function serveApp(extraRoutes) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      if (extraRoutes && extraRoutes(req, res, url)) return;
      const file = path.join(APP_ROOT, decodeURIComponent(url === '/' ? '/index.html' : url));
      if (!file.startsWith(APP_ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.listen(0, () => {
      const { port } = server.address();
      resolve({
        origin: `http://localhost:${port}`,
        close: () => new Promise(r => server.close(r)),
      });
    });
  });
}

export async function launchBrowser() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  });
}

/** Per-spec assertion collector. */
export function makeT() {
  const failures = [];
  const notes = [];
  return {
    failures,
    notes,
    ok(label, cond, detail) {
      if (!cond) failures.push(`${label}${detail === undefined ? '' : ` — got ${JSON.stringify(detail)}`}`);
    },
    eq(label, actual, expected) {
      const a = JSON.stringify(actual), e = JSON.stringify(expected);
      if (a !== e) failures.push(`${label} — expected ${e}, got ${a}`);
    },
    match(label, actual, re) {
      if (!re.test(String(actual))) failures.push(`${label} — ${JSON.stringify(actual)} does not match ${re}`);
    },
    note(msg) { notes.push(msg); },
  };
}

export const STORAGE_KEY = 'gymTracker.v1';

/**
 * Mutate stored state in the page, then reload so the app re-reads it.
 * `fn` runs in the browser and receives the storage key. Any `globals` are
 * set on `window` before it runs, for values the spec computes in Node.
 */
export async function seed(page, fn, globals) {
  if (globals) {
    await page.evaluate(g => Object.assign(window, g), globals);
  }
  await page.evaluate(`(${String(fn)})(${JSON.stringify(STORAGE_KEY)})`);
  await page.reload();
  await page.waitForTimeout(250);
  if (globals) {
    // survive the reload, since specs read them after seeding too
    await page.evaluate(g => Object.assign(window, g), globals);
  }
}

/** Read stored state out of the page. */
export function readState(page) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
}

/** Open a card by exercise name, idempotently. */
export async function openCard(page, name) {
  const card = page.locator('.card', { hasText: name }).first();
  const isOpen = await card.evaluate(el => el.classList.contains('open'));
  if (!isOpen) {
    await card.locator('.card-head').click();
    await page.waitForTimeout(180);
  }
  return card;
}

/** Enter the guided session and land on a group's exercise list. */
export async function openWizard(page, groupName) {
  await page.locator('#wizFab').click();
  await page.waitForTimeout(220);
  if (groupName) {
    const alt = page.locator('.wiz-row .n', { hasText: groupName });
    if (await alt.count()) await alt.first().click();
    else await page.locator('.wiz-foot .btn-big').click();
  } else {
    await page.locator('.wiz-foot .btn-big').click();
  }
  await page.waitForTimeout(250);
}

/** Date key helpers mirroring the app's own, for seeding. */
export const dateHelpers = `
  const key = d => d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
`;
