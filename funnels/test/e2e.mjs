// Browser walkthrough of every built quiz: mouse, keyboard, phone width, sign-up, persistence.
//   node funnels/build.mjs && node funnels/test/e2e.mjs [--shots DIR]
// Uses the Playwright that ships with the environment (global install or NODE_PATH).
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(p); } catch (e) { /* next */ }
  }
  throw new Error('Playwright not found; install it or set NODE_PATH');
}
const { chromium } = loadPlaywright();

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '..', 'dist');
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > 0 ? resolve(process.argv[shotsArg + 1]) : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const quizPages = readdirSync(DIST).filter((f) => f.endsWith('.html') && f !== 'preview.html');
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };

async function newPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return { page, errors };
}

// Answer every question: pick(qIndex, optionCount, isMulti) -> option index or indexes
async function walk(page, pick, { keyboard = false } = {}) {
  const seen = [];
  for (let guard = 0; guard < 40; guard++) {
    if (await page.locator('.sq-result').count()) break;
    const q = page.locator('.sq-question');
    await q.waitFor({ state: 'visible', timeout: 5000 });
    const legend = (await q.locator('legend').innerText()).trim();
    seen.push(legend);
    if (process.env.DEBUG_E2E) console.log('   q', seen.length, legend.slice(0, 60));
    const opts = q.locator('.sq-option');
    const n = await opts.count();
    const multi = (await q.locator('input[type="checkbox"]').count()) > 0;
    let choice = pick(seen.length - 1, n, multi, legend);
    if (keyboard) {
      const idx = Array.isArray(choice) ? choice[0] : choice;
      await q.locator('input').first().focus();
      if (multi) {
        for (let i = 0; i < idx; i++) await page.keyboard.press('Tab');
        await page.keyboard.press('Space');
      } else {
        await page.keyboard.press('Space');
        for (let i = 0; i < idx; i++) await page.keyboard.press('ArrowDown');
      }
      await page.keyboard.press('Enter');
    } else if (multi) {
      for (const i of [].concat(choice)) await opts.nth(i).locator('label').click();
      await q.locator('button[type="submit"]').click();
    } else {
      await opts.nth([].concat(choice)[0]).locator('label').click();
    }
    await page.waitForFunction((prev) => {
      const l = document.querySelector('.sq-question legend');
      return document.querySelector('.sq-result') || (l && l.textContent.trim() !== prev);
    }, legend, { timeout: 5000 });
  }
  return seen;
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const file of quizPages) {
  const url = pathToFileURL(join(DIST, file)).href;
  const id = file.replace(/\.html$/, '');
  console.log(`\n${id}`);

  // 1. mouse, desktop
  {
    const { page, errors } = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(url);
    await page.locator('.sq-intro').waitFor();
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${id}-1-intro.png`), fullPage: true });
    await page.getByRole('button', { name: /start|begin|find|take/i }).first().click();
    await page.locator('.sq-question').waitFor();
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${id}-2-question.png`), fullPage: true });
    const seen = await walk(page, (i, n, multi) => (multi ? [0, Math.min(1, n - 1)] : (i * 2 + 1) % n));
    ok(seen.length >= 5, `answered ${seen.length} questions`);
    await page.locator('.sq-result').waitFor();
    const title = (await page.locator('.sq-result .sq-title').innerText()).trim();
    ok(title.length > 2, `result title "${title}"`);
    ok((await page.locator('.sq-book').count()) === 3, 'three books');
    ok((await page.locator('.sq-chips li').count()) >= 2, 'shows what the result is based on');
    ok((await page.locator('.sq-capture').count()) === 1, 'free ebook offer shown after results');
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${id}-3-result.png`), fullPage: true });

    // bad email, then good
    await page.locator('.sq-capture input[type="email"]').fill('not-an-email');
    await page.locator('.sq-capture button[type="submit"]').click();
    ok(await page.locator('.sq-capture .sq-error:not([hidden])').first().isVisible(), 'invalid email is explained');
    const consent = page.locator('.sq-capture input[type="checkbox"]');
    if (await consent.count()) await consent.check();
    await page.locator('.sq-capture input[name="first_name"]').fill('Maria');
    await page.locator('.sq-capture input[type="email"]').fill('maria@example.org');
    await page.locator('.sq-capture button[type="submit"]').click();
    await page.locator('.sq-done').waitFor({ timeout: 5000 });
    ok((await page.locator('.sq-done-title').innerText()).includes('Maria'), 'thanks the reader by name');
    const payload = await page.evaluate(() => window.ScepterQuiz.lastCapture);
    ok(payload && payload.email === 'maria@example.org', 'payload has the email');
    ok(payload && payload.tags.includes('quiz-' + id), `payload tags ${payload && payload.tags.join(',')}`);
    ok(payload && payload.magnet && payload.magnet.title, `free ebook "${payload && payload.magnet && payload.magnet.title}"`);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${id}-4-signed-up.png`), fullPage: true });

    // change answers returns to question 1 with answers kept
    await page.getByRole('button', { name: /change my answers/i }).click();
    await page.locator('.sq-question').waitFor();
    ok((await page.locator('.sq-question input:checked').count()) >= 1, 'change answers keeps earlier choices');
    ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
    await page.close();
  }

  // 2. keyboard only, phone width, persistence across reload, Back
  {
    const { page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.goto(url);
    await page.locator('.sq-intro button').first().focus();
    await page.keyboard.press('Enter');
    await page.locator('.sq-question').waitFor();
    const firstLegend = (await page.locator('.sq-question legend').innerText()).trim();
    // arrow keys alone must not advance
    await page.locator('.sq-question input').first().focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    ok((await page.locator('.sq-question legend').innerText()).trim() === firstLegend, 'arrow keys do not skip ahead');
    await page.keyboard.press('Enter');
    await page.waitForFunction((prev) => document.querySelector('.sq-question legend').textContent.trim() !== prev, firstLegend);
    const second = (await page.locator('.sq-question legend').innerText()).trim();
    await page.reload();
    await page.locator('.sq-question').waitFor();
    ok((await page.locator('.sq-question legend').innerText()).trim() === second, 'reload keeps your place');
    await page.getByRole('button', { name: /^back$/i }).click();
    ok((await page.locator('.sq-question legend').innerText()).trim() === firstLegend, 'Back returns to the previous question');
    await page.locator('.sq-question input:checked').focus();
    await page.keyboard.press('Enter');
    await walk(page, (i, n) => (i + 2) % n, { keyboard: true });
    await page.locator('.sq-result').waitFor();
    ok(true, 'keyboard-only path reaches the result');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(overflow <= 0, `no sideways scroll at 390px (${overflow}px)`);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${id}-5-phone-result.png`), fullPage: true });
    ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
    await page.close();
  }
}

// 3. the preview page renders every quiz tab
{
  const { page, errors } = await newPage(browser, { width: 1100, height: 900 });
  await page.goto(pathToFileURL(join(DIST, 'preview.html')).href);
  const tabs = page.locator('.pv-tab');
  const n = await tabs.count();
  console.log('\npreview');
  ok(n >= 2, `${n} quiz tabs`);
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    ok(await page.locator('.pv-panel:not([hidden]) .sq-intro').isVisible(), `tab ${i + 1} shows its quiz`);
  }
  ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall browser checks passed');
process.exit(failures ? 1 : 0);
