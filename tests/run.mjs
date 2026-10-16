import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveApp, launchBrowser, makeT } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.join(HERE, 'specs');

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));

const specFiles = fs.readdirSync(SPEC_DIR)
  .filter(f => f.endsWith('.mjs'))
  .filter(f => !only.length || only.some(o => f.includes(o)))
  .sort();

if (!specFiles.length) {
  console.error('No specs matched', only);
  process.exit(1);
}

const browser = await launchBrowser();
let failed = 0;
const started = Date.now();

for (const file of specFiles) {
  const spec = await import(path.join(SPEC_DIR, file));
  const t = makeT();
  const { origin, close } = await serveApp(spec.routes);
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  let threw = null;
  try {
    await page.goto(origin + '/index.html');
    await page.waitForTimeout(250);
    await spec.run({ page, t, origin });
  } catch (e) {
    threw = e;
  }

  for (const e of pageErrors) t.failures.push(`uncaught page error: ${e}`);
  if (threw) t.failures.push(`threw: ${threw.message.split('\n')[0]}`);

  const name = spec.name || file.replace(/\.mjs$/, '');
  if (t.failures.length) {
    failed++;
    console.log(`\x1b[31mFAIL\x1b[0m  ${name}`);
    for (const f of t.failures) console.log(`        ${f}`);
  } else {
    console.log(`\x1b[32mpass\x1b[0m  ${name}`);
  }
  for (const n of t.notes) console.log(`        · ${n}`);

  await context.close();
  await close();
}

await browser.close();
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${specFiles.length - failed}/${specFiles.length} specs passed in ${secs}s`);
process.exit(failed ? 1 : 0);
