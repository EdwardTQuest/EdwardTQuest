// Browser walkthrough of every built quiz: mouse, keyboard, phone width, sign-up, persistence.
//   node funnels/build.mjs && node funnels/test/e2e.mjs [--shots DIR]
// Uses the Playwright that ships with the environment (global install or NODE_PATH).
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

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
    if (/^How old are you/.test(legend) && [].concat(choice)[0] === 0) choice = 3;
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


// ---- consent, minors and the Shopify sign-up, against a mock store ------------------------------------------
// A tiny local server stands in for the shop: it serves dist/world/scepter and answers POST /contact the way
// Shopify does (302 to /contact?contact_posted=true on success, to /challenge when it wants a captcha, 422 on error).
console.log('\nconsent and minors');
let contactMode = 'ok';
const posts = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const WORLD = join(DIST, 'world', 'scepter');
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/contact') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      posts.push(Object.fromEntries(new URLSearchParams(body)));
      if (contactMode === 'ok') { res.writeHead(302, { Location: '/contact?contact_posted=true' }); res.end(); }
      else if (contactMode === 'challenge') { res.writeHead(302, { Location: '/challenge' }); res.end(); }
      else { res.writeHead(422, { 'Content-Type': 'text/html' }); res.end('<p class="errors">Email is invalid</p>'); }
    });
    return;
  }
  if (u.pathname === '/contact' || u.pathname === '/challenge') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<p id="stub">${u.pathname}</p>`); return; }
  let f = join(WORLD, u.pathname);
  if (existsSync(f) && !f.endsWith('.html') && !f.endsWith('.js') && !f.endsWith('.css') && !f.endsWith('.txt')) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

async function openQuiz(browser, quiz, settings, viewport = { width: 1100, height: 900 }) {
  const { page, errors } = await newPage(browser, viewport);
  await page.addInitScript((st) => { window.__sqSettings = st; }, settings);
  await page.route('**/assets/settings.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.SCEPTER_QUIZ_SETTINGS = ${JSON.stringify(settings)};` }));
  await page.goto(`${BASE}/${quiz}/`);
  await page.locator('.sq-intro').waitFor();
  await page.locator('.sq-intro button').first().click();
  return { page, errors };
}
async function answer(page, labelRe) {
  const q = page.locator('.sq-question');
  await q.waitFor({ state: 'visible' });
  await q.locator('label', { hasText: labelRe }).first().click();
}
async function nextOrWait(page) {
  await page.waitForTimeout(500);
}
// reach the result of the reader quiz as a seeker of a given age band
async function seekerResult(page, ageLabel) {
  await page.locator('.sq-question').waitFor();
  await page.getByRole('button', { name: /skip this one/i }).click();                       // language
  await answer(page, /curious about the Catholic faith/);                                    // faith
  await page.locator('.sq-question legend', { hasText: /How old/ }).waitFor();
  await answer(page, ageLabel);                                                              // age
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.sq-result').count()) break;
    const q = page.locator('.sq-question');
    if (!(await q.count())) { await page.waitForTimeout(200); continue; }
    const legend = (await q.locator('legend').innerText()).trim();
    if (/What is your life like/.test(legend) || /How often do you pray/.test(legend) || /read or listen/.test(legend) || /kind of reading/.test(legend)) {
      await page.getByRole('button', { name: /skip this one/i }).click();
    } else if (/like to know more/.test(legend)) {
      await q.locator('label', { hasText: /What Catholics believe/ }).click();
      await q.locator('button[type="submit"]').click();
    }
    await page.waitForTimeout(350);
  }
  await page.locator('.sq-result').waitFor({ timeout: 5000 });
}

{ // under 13: the quiz ends, nothing is saved or sent
  const { page, errors } = await openQuiz(browser, 'next-step', { capture: { provider: 'demo' } });
  await page.getByRole('button', { name: /skip this one/i }).click();
  await answer(page, /curious about the Catholic faith/);
  await answer(page, /^Under 13$/);
  await page.locator('.sq-stop').waitFor({ timeout: 3000 });
  ok(/13 and older/.test(await page.locator('.sq-stop .sq-title').innerText()), 'under 13 sees the stop screen');
  const stored = await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('sq:')).map((k) => sessionStorage.getItem(k)).join(''));
  ok(stored === '', 'nothing is kept in the browser for an under-13');
  await page.getByRole('button', { name: /go back/i }).click();
  ok(await page.locator('.sq-question legend').first().isVisible(), 'Go back returns to the first question');
  ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
  await page.close();
}

{ // 13-17: a parent's address, an unticked box even in notice mode, no faith data sent
  const { page, errors } = await openQuiz(browser, 'next-step', { capture: { provider: 'demo', consent: { mode: 'notice' } } });
  await seekerResult(page, /^13–17$/);
  ok((await page.locator('.sq-capture input[type="checkbox"]').count()) === 1, 'a parent’s address always gets an unticked checkbox, even in notice mode');
  ok(/Parent or guardian/.test(await page.locator('.sq-capture-form').innerText()), 'the form asks for a parent or guardian');
  ok(!(await page.locator('.sq-capture input[type="checkbox"]').isChecked()), 'the box starts unticked');
  await page.locator('.sq-capture input[name="first_name"]').fill('Timmy');
  await page.locator('.sq-capture input[type="email"]').fill('parent@example.org');
  await page.locator('.sq-capture input[type="checkbox"]').check();
  await page.locator('.sq-capture button[type="submit"]').click();
  await page.locator('.sq-done').waitFor();
  const pl = await page.evaluate(() => window.ScepterQuiz.lastCapture);
  ok(pl.limited === true && pl.first_name === null, 'the child’s name is not sent');
  ok(pl.tags.join() === 'quiz-next-step,guardian-signup' || pl.tags.slice().sort().join() === 'guardian-signup,quiz-next-step', `tags ${pl.tags.join()}`);
  ok(pl.properties.scepter_stage === undefined && pl.properties.scepter_age_band === undefined, 'no stage or age band for a minor');
  await page.close();
}

{ // an unknown consent mode fails closed; an unticked box sends only the quiz name and the ebook
  const { page } = await openQuiz(browser, 'next-step', { capture: { provider: 'demo', consent: { mode: 'Notice ' } } });
  await seekerResult(page, /^35–49$/);
  ok((await page.locator('.sq-capture input[type="checkbox"]').count()) === 1, 'a mistyped consent mode still shows the checkbox');
  await page.locator('.sq-capture input[type="email"]').fill('reader@example.org');
  await page.locator('.sq-capture button[type="submit"]').click();       // box left unticked
  await page.locator('.sq-done').waitFor();
  const pl = await page.evaluate(() => window.ScepterQuiz.lastCapture);
  ok(pl.consent === false && pl.limited === true, 'unticked means no consent recorded');
  ok(pl.tags.join() === 'quiz-next-step' && pl.properties.scepter_stage === undefined, `only the quiz tag leaves: ${pl.tags.join()}`);
  await page.close();
}

for (const mode of ['ok', 'challenge', 'error']) { // the Shopify sign-up against a mock store
  contactMode = mode; posts.length = 0;
  const { page, errors } = await openQuiz(browser, 'next-step', { capture: { provider: 'shopify', consent: { mode: 'checkbox' } } });
  await seekerResult(page, /^35–49$/);
  await page.locator('.sq-capture input[type="email"]').fill('reader@example.org');
  await page.locator('.sq-capture input[type="checkbox"]').check();
  await page.locator('.sq-capture button[type="submit"]').click();
  if (mode === 'ok') {
    await page.locator('.sq-done').waitFor({ timeout: 6000 });
    ok(posts.length === 1 && posts[0]['contact[accepts_marketing]'] === 'true', 'shopify: one customer posted, subscribed');
    ok(/quiz-next-step/.test(posts[0]['contact[tags]']) && /stage-exploring/.test(posts[0]['contact[tags]']), `shopify: tags ${posts[0] && posts[0]['contact[tags]']}`);
  } else if (mode === 'challenge') {
    await page.locator('.sq-done').waitFor({ timeout: 6000 });
    ok(await page.locator('.sq-shopify-frame').count() === 1 && await page.locator('.sq-shopify-frame').isVisible(), 'shopify: the captcha frame stays on screen');
    ok(/complete the check/.test(await page.locator('.sq-challenge-note').innerText()), 'shopify: the reader is told what to do');
  } else {
    await page.locator('.sq-capture .sq-error[role="alert"]:not([hidden])').waitFor({ timeout: 6000 });
    ok(await page.locator('.sq-done').count() === 0, 'shopify: a rejected sign-up is not reported as success');
    ok(await page.locator('.sq-capture button[type="submit"]').isEnabled(), 'shopify: the reader can try again');
  }
  const unexpected = errors.filter((e) => !(mode === 'error' && /422|did not accept the sign-up/.test(e)));   // the rejection is the point of that case
  ok(unexpected.length === 0, `shopify ${mode}: no unexpected page errors ${unexpected.join(' | ')}`);
  await page.close();
}

{ // unticked on shopify: nothing is posted, and the page does not claim an email is coming
  contactMode = 'ok'; posts.length = 0;
  const { page } = await openQuiz(browser, 'next-step', { capture: { provider: 'shopify', consent: { mode: 'checkbox' } } });
  await seekerResult(page, /^35–49$/);
  await page.locator('.sq-capture input[type="email"]').fill('reader@example.org');
  await page.locator('.sq-capture button[type="submit"]').click();
  await page.locator('.sq-done').waitFor();
  ok(posts.length === 0, 'shopify: nothing posted without agreement');
  ok(/haven.t added you/i.test(await page.locator('.sq-done').innerText()), 'shopify: the reader is told they were not added');
  await page.close();
}

{ // the world: hub tabs and the cross-link between quizzes
  const { page, errors } = await newPage(browser, { width: 1100, height: 900 });
  await page.goto(`${BASE}/`);
  ok((await page.locator('.w-test').innerText()).includes('Test version'), 'world: marked as a test version');
  ok((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'), 'world: asks search engines not to index it');
  await page.goto(`${BASE}/gift-finder/`);
  await page.locator('.sq-intro').waitFor();
  await page.locator('.sq-intro button').first().click();
  await answer(page, /^A child/);
  for (let i = 0; i < 8 && !(await page.locator('.sq-result').count()); i++) {
    const q = page.locator('.sq-question');
    if (await q.locator('button', { hasText: /skip this one/i }).count()) await q.locator('button', { hasText: /skip this one/i }).click();
    else { await q.locator('label').first().click(); if (await q.locator('input[type=checkbox]').count()) await q.locator('button[type=submit]').click(); }
    await page.waitForTimeout(350);
  }
  await page.locator('.sq-result').waitFor();
  ok((await page.locator('.sq-book').count()) === 3, 'world: gift for a child gives three books');
  const titles = await page.locator('.sq-book-title').allInnerTexts();
  ok(titles.every((t) => /Douglings|Newman|Confession|Brave|Little/i.test(t)), `world: only children's books for a child: ${titles.join(' | ')}`);
  ok((await page.getByRole('link', { name: /Find Your Next Step/ }).getAttribute('href')) === '../next-step/', 'world: link to the other quiz is relative');
  ok(errors.length === 0, `world: no page errors ${errors.join(' | ')}`);
  await page.close();
}
server.close();

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall browser checks passed');
process.exit(failures ? 1 : 0);
