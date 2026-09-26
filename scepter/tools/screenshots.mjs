// Walk each quiz variant (and the pop-ups) with a scripted visitor and save screenshots.
//   node scepter/tools/screenshots.mjs [outDir] [--only=mission,adventure,treasures,popups] [--mobile-only] [--set=standin]
// The temperament test runs Alexandre Havard's test when scepter/private/scepter-temperament-havard.js
// exists (see tools/import-havard-test.mjs), else the stand-in; --set=standin forces the stand-in.
// Needs Playwright with Chromium (preinstalled in Claude Code cloud containers; elsewhere `npx playwright install chromium`).
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = resolve(new URL('../..', import.meta.url).pathname); // repo root, so /scepter/demo/... resolves
const args = process.argv.slice(2);
const OUT = resolve(args.find((a) => !a.startsWith('--')) || join(ROOT, 'scepter/docs/screens-tmp'));
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const mobileOnly = args.includes('--mobile-only');
const questionSet = (args.find((a) => a.startsWith('--set=')) || '').slice(6);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const base = `http://127.0.0.1:${PORT}/scepter/demo/`;
await mkdir(OUT, { recursive: true });

const persona = {
  age: '35-44', religion: 'catholic', gender: 'f', state: 'married', work: 'professional', workFeel: 'stretched',
  faith: 'dry', desire: 'grow', marriedYears: '6-15', kids: '3', workService: 2, home: 4, feel: [2, 3, 2]
};

async function answerStep(page, id, shots, tag) {
  const q = (sel) => page.locator(`.sp-step[data-step="${id}"] ${sel}`);
  if (shots.includes(id)) await page.screenshot({ path: join(OUT, `${tag}-step-${id}.png`), fullPage: false });
  switch (id) {
    case 'marriedDetails':
      await q(`.sp-opt[data-value="${persona.marriedYears}"]`).click();
      await q(`.sp-opt[data-value="${persona.kids}"]`).click();
      if (shots.includes(id + '-filled')) { await page.mouse.move(0, 0); await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, `${tag}-step-${id}-filled.png`) }); }
      await q('.sp-actions .sp-btn--primary').click();
      break;
    case 'feel':
      for (let r = 0; r < 3; r++) await q(`.sp-triple__row:nth-child(${r + 1}) .sp-chip:nth-child(${persona.feel[r]})`).click();
      if (shots.includes(id + '-filled')) { await page.mouse.move(0, 0); await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, `${tag}-step-${id}-filled.png`) }); }
      await q('.sp-actions .sp-btn--primary').click();
      break;
    case 'workService': case 'home':
      await q(`.sp-dot:nth-child(${persona[id]})`).click();
      break;
    case 'email':
      await q('input[name="first_name"]').fill('Maria');
      await q('input[name="email"]').fill('maria@example.com');
      if (shots.includes('email-filled')) await page.screenshot({ path: join(OUT, `${tag}-step-email-filled.png`) });
      await q('button[type="submit"]').click();
      break;
    default:
      await q(`.sp-opt[data-value="${persona[id]}"]`).click();
  }
}

async function runQuiz(browser, variant, viewport, tag, shots) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await preparePage(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + `quiz.html?v=${variant}`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('.sp-intro');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, `${tag}-intro.png`) });
  await page.click('.sp-intro .sp-btn--primary');
  const seen = [];
  for (let guard = 0; guard < 30; guard++) {
    const done = await page.locator('.sp-results').count();
    if (done) break;
    const loading = await page.locator('.sp-loading').count();
    if (loading) { await page.waitForSelector('.sp-results', { timeout: 15000 }); break; }
    const id = await page.locator('.sp-step').first().getAttribute('data-step');
    if (!id || seen.at(-1) === id) { await page.waitForTimeout(250); continue; }
    seen.push(id);
    await page.waitForTimeout(450);
    await answerStep(page, id, shots, tag);
    await page.waitForTimeout(350);
  }
  await page.waitForSelector('.sp-results');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, `${tag}-results.png`), fullPage: true });
  await page.screenshot({ path: join(OUT, `${tag}-results-top.png`) });
  await page.close();
  return { seen, errors };
}

async function runPopups(browser, viewport, tag) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await preparePage(page);
  // The same order of statements every run, so the screens can be compared.
  await page.addInitScript(() => { let s = 20260926; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A 404 for the optional private Havard file is expected where it hasn't been imported.
  page.on('console', (m) => { if (m.type() === 'error' && !/\/scepter\/private\//.test(m.location().url || '')) errors.push(m.text()); });
  const url = base + 'popups.html' + (questionSet === 'standin' ? '?set=standin' : '');
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const test = await page.evaluate((forced) => (forced !== 'standin' && window.ScepterTemperamentSets && window.ScepterTemperamentSets.havard ? 'havard' : 'stand-in'), questionSet);
  await page.click('[data-demo="ebook"]');
  await page.waitForSelector('.sp-ebook');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${tag}-ebook.png`) });
  await page.click('.sp-interest[data-interest="peace"]');
  await page.fill('.sp-ebook input[name="first_name"]', 'Joseph');
  await page.fill('.sp-ebook input[name="email"]', 'joseph@example.com');
  await page.screenshot({ path: join(OUT, `${tag}-ebook-filled.png`) });
  await page.click('.sp-ebook button[type="submit"]');
  await page.waitForSelector('.sp-ebook__done');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${tag}-ebook-done.png`) });
  await page.keyboard.press('Escape');
  await page.click('[data-demo="temperament"]');
  await page.waitForSelector('.sp-temp');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${tag}-temperament-intro.png`) });
  await page.click('.sp-temp .sp-btn--primary');
  let asked = 0, stage2Shot = false;
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.sp-temp__result').count()) break;
    if (await page.locator('.sp-temp__stage').count()) {
      if (!stage2Shot) { await page.waitForTimeout(300); await page.screenshot({ path: join(OUT, `${tag}-temperament-stage2.png`) }); stage2Shot = true; }
      await page.click('.sp-temp__stage .sp-btn--primary');
      await page.waitForTimeout(260);
      continue;
    }
    const opts = page.locator('.sp-temp__q .sp-opt');
    const n = await opts.count();
    if (!n) { await page.waitForTimeout(200); continue; }
    if (asked === 2) await page.screenshot({ path: join(OUT, `${tag}-temperament-question.png`) });
    // Stand-in: mostly the first (choleric-leaning) answer. Havard: a choleric with a marked melancholic
    // side (TRUE to choleric statements, and to the stage-2 ones that point to melancholic).
    let pick = asked % 5 === 0 ? 1 : 0;
    if (test === 'havard') {
      pick = await page.evaluate(() => {
        const id = document.querySelector('.sp-temp__q[data-statement]').getAttribute('data-statement');
        const set = window.ScepterTemperamentSets.havard;
        const yes = set.stage1.COL.concat(set.tiebreak.COL, set.stage2.COL.items.filter((x) => set.stage2.COL[x.adj] === 'MEL').map((x) => x.id));
        return yes.includes(id) ? 0 : 1;
      });
    }
    await opts.nth(pick).click();
    asked++;
    await page.waitForTimeout(260);
  }
  await page.waitForSelector('.sp-temp__result');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, `${tag}-temperament-result.png`) });
  const dialog = page.locator('[data-sp-modal="temperament"] .sp-modal__dialog');
  const height = await dialog.evaluate((d) => d.scrollHeight);
  const step = Math.round(viewport.height * 0.8);
  for (let y = step, k = 2; y < height && k < 9; y += step, k++) {
    await dialog.evaluate((d, top) => d.scrollTo(0, top), y);
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT, `${tag}-temperament-result-${k}.png`) });
  }
  const profile = await page.locator('.sp-temp__result .sp-display').textContent();
  await page.close();
  return { test, asked, profile, errors };
}

import { execFileSync } from 'node:child_process';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
// Behind an intercepting proxy the bundled Chromium may not trust its certificate; fetch web fonts
// and the live store's cover images with curl (which does) and hand them to the page. Elsewhere
// the browser loads them itself.
const remoteCache = new Map();
const TYPE_OF = (url) => (/googleapis/.test(url) ? 'text/css' : /gstatic/.test(url) ? 'font/woff2'
  : /\.png(\?|$)/i.test(url) ? 'image/png' : /\.webp(\?|$)/i.test(url) ? 'image/webp' : /\.gif(\?|$)/i.test(url) ? 'image/gif' : 'image/jpeg');
async function routeRemote(page) {
  if (!process.env.HTTPS_PROXY) return;
  await page.route(/https:\/\/(fonts\.(googleapis|gstatic)\.com|cdn\.shopify\.com)\/.*/, async (route) => {
    const url = route.request().url();
    if (!remoteCache.has(url)) {
      try {
        const body = execFileSync('curl', ['-sS', '--fail', '--max-time', '20', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', url], { maxBuffer: 20e6 });
        remoteCache.set(url, body);
      } catch { remoteCache.set(url, null); }
    }
    const body = remoteCache.get(url);
    if (!body) return route.abort();
    await route.fulfill({ body, headers: { 'Content-Type': TYPE_OF(url), 'Access-Control-Allow-Origin': '*' } });
  });
}
async function preparePage(page) {
  await routeRemote(page);
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '.demo-inspector{display:none!important} *{caret-color:transparent}';
      document.head.appendChild(st);
    });
  });
}
const viewports = mobileOnly ? [['phone', { width: 390, height: 844 }]] : [['phone', { width: 390, height: 844 }], ['desk', { width: 1280, height: 860 }]];
const report = {};
for (const variant of ['mission', 'adventure', 'treasures']) {
  if (only.length && !only.includes(variant)) continue;
  for (const [vp, size] of viewports) {
    const shots = vp === 'phone' ? ['state', 'marriedDetails-filled', 'feel-filled', 'workService', 'desire', 'email-filled', 'home'] : ['state', 'feel-filled', 'desire', 'email-filled'];
    report[`${variant}-${vp}`] = await runQuiz(browser, variant, size, `${variant}-${vp}`, shots);
  }
}
if (!only.length || only.includes('popups')) {
  for (const [vp, size] of viewports) report[`popups-${vp}`] = await runPopups(browser, size, `popups-${vp}`);
}
await browser.close();
server.close();
console.log(JSON.stringify(report, null, 1));
