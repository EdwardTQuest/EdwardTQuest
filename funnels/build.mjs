#!/usr/bin/env node
// Build the Scepter quizzes into files you can install. No dependencies; Node 18+.
//
//   node funnels/build.mjs            validate every quiz and the catalog, then write funnels/dist/
//   node funnels/build.mjs --check    validate only
//   node funnels/build.mjs --links    list every product link and author, to check by hand before launch
//
// dist/scepter-quiz.js, dist/scepter-quiz.css   Shopify theme assets (all quizzes, one file each)
// dist/sections/scepter-quiz.liquid             Shopify section: add the quiz to any page in the theme editor
// dist/<quiz>.html                              one self-contained page per quiz (host anywhere; opens offline)
// dist/preview.html                             every quiz on one page, demo mode (for review)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const Q = join(HERE, 'quiz');
const DIST = join(HERE, 'dist');
const read = (p) => readFileSync(p, 'utf8');

const DATA_ORDER = ['segments.js', 'catalog.js', 'magnets.js'];
const quizFiles = readdirSync(join(Q, 'quizzes')).filter((f) => f.endsWith('.js')).sort();
const sources = [
  join(Q, 'src', 'core.js'),
  join(Q, 'src', 'capture.js'),
  ...DATA_ORDER.map((f) => join(Q, 'data', f)),
  ...quizFiles.map((f) => join(Q, 'quizzes', f)),
  join(Q, 'src', 'ui.js'),
];
const JS = sources.map((p) => `/* ${p.slice(HERE.length + 1)} */\n${read(p)}`).join('\n');
const CSS = read(join(Q, 'src', 'quiz.css'));
const FONTS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';

// ---- validate: load everything except the UI in a sandbox and check the data -------------------

function load() {
  const ctx = { console, URLSearchParams, setTimeout };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const p of sources.filter((p) => !p.endsWith('ui.js'))) vm.runInContext(read(p), ctx, { filename: p });
  return ctx.ScepterQuiz;
}

function validate(SQ) {
  const out = [];
  const seg = SQ.data.segments || {};
  const idsOf = (k) => (seg[k] || []).map((x) => x.id);
  const stages = idsOf('stages'), needs = idsOf('needs'), ages = idsOf('ages'), lifes = idsOf('lifeSeasons'), langs = idsOf('languages');
  const formats = Object.keys((seg.reasons || {}).format || {});
  const audiences = Object.keys(seg.audiences || {});
  for (const k of ['stages', 'needs', 'ages', 'lifeSeasons']) if (!idsOf(k).length) out.push(`segments.${k} is empty`);
  for (const st of seg.stages || []) {
    for (const f of ['name', 'portrait', 'defaultNeed', 'steps']) if (!st[f]) out.push(`stage ${st.id} has no ${f}`);
    if (st.defaultNeed && !needs.includes(st.defaultNeed)) out.push(`stage ${st.id} defaultNeed ${st.defaultNeed} is not a need`);
  }
  const check = (kind, it, domainRe) => {
    const where = `${kind} ${it.id || it.title}`;
    if (!it.id) out.push(`${where}: no id`);
    if (!it.title) out.push(`${where}: no title`);
    for (const s of it.stages || []) if (!stages.includes(s)) out.push(`${where}: unknown stage ${s}`);
    for (const n of it.needs || []) if (!needs.includes(n)) out.push(`${where}: unknown need ${n}`);
    for (const a of it.ages || []) if (a !== 'all' && !ages.includes(a)) out.push(`${where}: unknown age ${a}`);
    for (const l of it.life || []) if (!lifes.includes(l)) out.push(`${where}: unknown life season ${l}`);
    for (const l of [].concat(it.lifeOnly || [])) if (!lifes.includes(l)) out.push(`${where}: unknown lifeOnly season ${l}`);
    if (it.audience && !audiences.includes(it.audience)) out.push(`${where}: unknown audience ${it.audience}`);
    if (it.lang && !langs.includes(it.lang)) out.push(`${where}: unknown language ${it.lang}`);
    if (it.priority != null && !(Number.isInteger(it.priority) && it.priority >= 0 && it.priority <= 3)) out.push(`${where}: priority must be 0 to 3`);
    if (it.format && formats.length && !formats.includes(it.format)) out.push(`${where}: unknown format ${it.format}`);
    if (!(it.stages || []).length) out.push(`${where}: no stages`);
    if (!(it.needs || []).length) out.push(`${where}: no needs`);
    const link = domainRe === 'product' ? (it.url || it.product) : it.url;
    if (kind === 'book' || kind === 'ebook') {
      if (!/^https:\/\/scepterpublishers\.org\/[A-Za-z0-9\/_.-]+$/.test(it.product || it.url || '')) out.push(`${where}: link must be https://scepterpublishers.org/..., got ${it.product || it.url}`);
    }
    if (kind === 'ebook' && it.url && !/^https:\/\/[^\s"'<>]+$/.test(it.url)) out.push(`${where}: download must be a plain https link`);
    void link;
  };
  const seen = new Set();
  for (const it of SQ.data.catalog || []) {
    check('book', it);
    if (seen.has(it.id)) out.push(`book ${it.id}: duplicate id`);
    seen.add(it.id);
    if (!it.url) out.push(`book ${it.id}: no url`);
    if (!it.source) out.push(`book ${it.id}: no source note`);
  }
  const seenM = new Set();
  for (const m of SQ.data.magnets || []) {
    check('ebook', m);
    if (seenM.has(m.id)) out.push(`ebook ${m.id}: duplicate id`);
    seenM.add(m.id);
  }
  if (!(SQ.data.catalog || []).length) out.push('catalog is empty');
  if (!(SQ.data.magnets || []).length) out.push('no free ebooks (magnets)');
  const quizzes = Object.values(SQ.quizzes);
  if (!quizzes.length) out.push('no quizzes defined');

  // Coverage. For every reachable age x stage x need, the reader must get three distinct books, all
  // in the reader's language, none a children's or teens' book for the wrong age, and one free
  // ebook. Gift quizzes are checked as gifts.
  for (const qz of quizzes) {
    const reach = new Set();
    for (const q of qz.questions) for (const o of q.options) if (o.set && o.set.age) reach.add(o.set.age);
    const recipient = qz.recipient || 'self';
    for (const lang of ['en', 'es'])
    for (const st of stages) for (const nd of needs) for (const ag of reach) {
      const p = { quiz: qz.id, recipient, age: ag, stage: st, needs: [nd], lang, extras: {} };
      const where = `${qz.id}: ${lang}/${st}/${nd}/${ag}`;
      const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3, filter: qz.result && qz.result.filter });
      if (recs.length < 3) out.push(`${where}: only ${recs.length} books`);
      const wrongLang = recs.filter((r) => (r.item.lang || 'en') !== lang && lang === 'en');   // Spanish may fall back to English
      if (wrongLang.length) out.push(`${where}: offered ${wrongLang.map((r) => r.item.id).join(', ')} in the wrong language`);
      const wrongAge = recs.filter((r) => (r.item.ages || []).length && !r.item.ages.includes('all') && !r.item.ages.includes(ag));
      if (wrongAge.length) out.push(`${where}: offered ${wrongAge.map((r) => r.item.id).join(', ')} (written for another age)`);
      const mags = SQ.core.recommend(SQ.data.magnets, p, { count: 1, filter: qz.result && qz.result.magnetFilter });
      if (!mags.length) out.push(`${where}: no free ebook`);
    }
  }
  return out;
}

const SQ = load();
const problems = validate(SQ);
const quizIds = Object.keys(SQ.quizzes);
if (problems.length) {
  console.error(`build: ${problems.length} problem(s)\n  ` + problems.slice(0, 80).join('\n  '));
  if (problems.length > 80) console.error(`  … and ${problems.length - 80} more`);
  process.exit(1);
}
console.log(`build: ${quizIds.length} quizzes (${quizIds.join(', ')}), ${SQ.data.catalog.length} books, ${SQ.data.magnets.length} free ebooks: valid`);
if (process.argv.includes('--links')) {
  for (const it of [...SQ.data.catalog, ...SQ.data.magnets.map((m) => ({ ...m, url: m.product }))]) console.log([it.id, it.url, it.author || '(author not confirmed)'].join('\t'));
  process.exit(0);
}
if (process.argv.includes('--check')) process.exit(0);

// ---- write ------------------------------------------------------------------------------------

mkdirSync(join(DIST, 'sections'), { recursive: true });
const banner = `/* Scepter quizzes — built by funnels/build.mjs from funnels/quiz/. Do not edit; edit the source and rebuild. */\n`;
writeFileSync(join(DIST, 'scepter-quiz.js'), banner + JS);
writeFileSync(join(DIST, 'scepter-quiz.css'), banner + CSS);

const DEMO_SETTINGS = `window.SCEPTER_QUIZ_SETTINGS = window.SCEPTER_QUIZ_SETTINGS || { capture: { provider: 'demo' } };`;
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const id of quizIds) {
  const qz = SQ.quizzes[id];
  writeFileSync(join(DIST, `${id}.html`), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(qz.meta.title)} | Scepter Publishers</title>
<meta name="description" content="${esc(qz.meta.description || '')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
html { background: #f4f1ed; }
body { margin: 0; padding: 2rem 16px 4rem; background: #f4f1ed; }
${CSS}
</style>
</head>
<body>
<main>
<div data-scepter-quiz="${esc(id)}"></div>
</main>
<script>
/* Settings: change provider to 'klaviyo', 'shopify' or 'webhook' and fill in its block (see funnels/README.md). */
${DEMO_SETTINGS}
</script>
<script>
${safe(JS)}
</script>
</body>
</html>
`);
}

const options = quizIds.map((id) => ({ value: id, label: SQ.quizzes[id].meta.title }));
writeFileSync(join(DIST, 'sections', 'scepter-quiz.liquid'), `{%- comment -%}
  Scepter quiz section. Built by funnels/build.mjs; edit funnels/build.mjs, not this file.
  Install: upload scepter-quiz.js and scepter-quiz.css to the theme's assets/, this file to sections/,
  then add the "Scepter quiz" section to a page in the theme editor.
{%- endcomment -%}
{%- if section.settings.house_fonts -%}
  <link rel="stylesheet" href="${FONTS}">
{%- endif -%}
{{ 'scepter-quiz.css' | asset_url | stylesheet_tag }}
<style>
  #sq-{{ section.id }} { padding-block: {{ section.settings.padding }}px; }
  {%- if section.settings.accent != blank %}
  #sq-{{ section.id }} .sq {
    --sq-accent: {{ section.settings.accent }};
    --sq-accent-hover: color-mix(in srgb, {{ section.settings.accent }} 82%, black);
    --sq-accent-ink: {{ section.settings.accent_text }};
    --sq-panel: {{ section.settings.accent }};
    --sq-panel-ink: {{ section.settings.accent_text }};
  }
  {%- endif %}
  {%- unless section.settings.house_fonts %}
  #sq-{{ section.id }} .sq { --sq-font-body: inherit; --sq-font-ui: inherit; --sq-font-caps: inherit; }
  {%- endunless %}
</style>
{%- assign sq_privacy = section.settings.privacy_url | default: shop.privacy_policy.url -%}
<div id="sq-{{ section.id }}" class="page-width">
  <div data-scepter-quiz="{{ section.settings.quiz }}"></div>
</div>
<script>
  (function () {
    var d = {
      capture: {
        provider: {{ section.settings.provider | json }},
        klaviyo: { companyId: {{ section.settings.klaviyo_public_key | json }}, listId: {{ section.settings.klaviyo_list_id | json }} },
        webhook: { url: {{ section.settings.webhook_url | json }} },
        consent: { mode: {{ section.settings.consent_mode | json }}{% if sq_privacy != blank %}, privacyUrl: {{ sq_privacy | json }}{% endif %} }
      },
      shop: {
        productCards: {{ section.settings.product_cards | json }},
        addToCart: {{ section.settings.add_to_cart | json }},
        currency: {{ cart.currency.iso_code | json }},
        root: {{ routes.root_url | remove_last: '/' | json }}
      },
      quizUrls: { 'next-step': {{ section.settings.url_next_step | json }}, 'gift-finder': {{ section.settings.url_gift_finder | json }} }
    };
    // Settings a theme or another script already defined win over these; capture merges one level deep.
    var u = window.SCEPTER_QUIZ_SETTINGS || {};
    window.SCEPTER_QUIZ_SETTINGS = Object.assign({}, d, u, {
      capture: Object.assign({}, d.capture, u.capture || {}),
      quizUrls: Object.assign({}, d.quizUrls, u.quizUrls || {})
    });
  })();
</script>
<script src="{{ 'scepter-quiz.js' | asset_url }}" defer></script>
{% schema %}
${JSON.stringify({
  name: 'Scepter quiz',
  tag: 'section',
  class: 'section-scepter-quiz',
  settings: [
    { type: 'select', id: 'quiz', label: 'Quiz', options, default: quizIds[0] },
    { type: 'header', content: 'Email sign-up' },
    { type: 'select', id: 'provider', label: 'Send sign-ups to', default: 'demo', options: [
      { value: 'demo', label: 'Nowhere (test mode)' },
      { value: 'shopify', label: 'Shopify customers (tags)' },
      { value: 'klaviyo', label: 'Klaviyo' },
      { value: 'webhook', label: 'Webhook (Zapier, Make, other)' },
    ] },
    { type: 'text', id: 'klaviyo_public_key', label: 'Klaviyo public API key (site ID)', info: 'Exactly six letters and numbers, from Klaviyo > Settings > API keys. Never a private key (those start with pk_). Only for Klaviyo.' },
    { type: 'text', id: 'klaviyo_list_id', label: 'Klaviyo list ID', info: 'The list quiz sign-ups join. Only for Klaviyo.' },
    { type: 'text', id: 'webhook_url', label: 'Webhook URL', info: 'Only for Webhook.' },
    { type: 'select', id: 'consent_mode', label: 'Email consent', default: 'checkbox', options: [
      { value: 'checkbox', label: 'Unticked checkbox (EU, UK, Canada; the safe choice)' },
      { value: 'notice', label: 'Notice under the button (US)' },
    ] },
    { type: 'url', id: 'privacy_url', label: 'Privacy policy link', info: 'Defaults to the shop privacy policy.' },
    { type: 'header', content: 'Links between the quizzes' },
    { type: 'url', id: 'url_next_step', label: 'Page with "Find Your Next Step"' },
    { type: 'url', id: 'url_gift_finder', label: 'Page with "Find a Book for Someone You Love"' },
    { type: 'header', content: 'Books' },
    { type: 'checkbox', id: 'product_cards', label: 'Show covers and prices from the store', default: true },
    { type: 'checkbox', id: 'add_to_cart', label: 'Show Add to cart buttons', default: true },
    { type: 'header', content: 'Look' },
    { type: 'checkbox', id: 'house_fonts', label: 'Use the quiz fonts (EB Garamond, Cinzel)', default: false, info: 'Loads fonts from Google. Leave unticked to use the theme fonts.' },
    { type: 'color', id: 'accent', label: 'Accent color', info: 'Buttons and the free-ebook panel. Leave empty for house green.' },
    { type: 'color', id: 'accent_text', label: 'Text on the accent color', default: '#f4f1ed', info: 'Pick a color that reads clearly on the accent.' },
    { type: 'range', id: 'padding', label: 'Space above and below', min: 0, max: 100, step: 4, unit: 'px', default: 36 },
  ],
  presets: [{ name: 'Scepter quiz' }],
}, null, 2)}
{% endschema %}
`);

// ---- preview: every quiz on one page, demo mode ----------------------------------------------------
const tabs = quizIds.map((id, i) => `<button type="button" class="pv-tab" role="tab" id="pv-tab-${esc(id)}" aria-controls="pv-panel-${esc(id)}" aria-selected="${i === 0}" data-quiz="${esc(id)}"><span class="pv-tab-name">${esc(SQ.quizzes[id].meta.title)}</span><span class="pv-tab-sub">${esc(SQ.quizzes[id].meta.tabNote || '')}</span></button>`).join('\n    ');
const panels = quizIds.map((id, i) => `<div class="pv-panel" role="tabpanel" id="pv-panel-${esc(id)}" aria-labelledby="pv-tab-${esc(id)}"${i === 0 ? '' : ' hidden'}><div data-scepter-quiz="${esc(id)}"></div></div>`).join('\n  ');
const previewCss = `
:root { color-scheme: light; }
html, body { background: #efeae1; }
body { margin: 0; padding-inline: 16px; padding-block: 1.5rem 3rem; color: #17201a; font-family: "EB Garamond", Georgia, serif; }
.pv { max-width: 44rem; margin-inline: auto; display: grid; gap: 1rem; }
.pv-head { display: grid; gap: 0.35rem; }
.pv-kicker { font-family: "Cinzel", Georgia, serif; font-size: 0.75rem; letter-spacing: 0.16em; text-transform: uppercase; color: #76633a; margin: 0; }
.pv-head h1 { margin: 0; font-weight: 500; font-size: 1.6rem; line-height: 1.15; }
.pv-head p { margin: 0; color: #4d5646; font-size: 1.02rem; max-width: 40rem; }
.pv-tabs { display: grid; grid-template-columns: repeat(${quizIds.length}, minmax(0, 1fr)); gap: 0.5rem; }
.pv-tab { display: grid; gap: 0.1rem; text-align: left; padding: 0.6rem 0.8rem; border: 1px solid #8a7f66; border-radius: 6px; background: #f8f5ee; color: #17201a; font: inherit; cursor: pointer; }
.pv-tab-name { font-size: 1.05rem; line-height: 1.2; }
.pv-tab-sub { font-size: 0.88rem; color: #4d5646; }
.pv-tab[aria-selected="true"] { background: #0a2416; border-color: #0a2416; color: #f4f1ed; }
.pv-tab[aria-selected="true"] .pv-tab-sub { color: #d8bf8c; }
.pv-tab:focus-visible { outline: 3px solid #b8862b; outline-offset: 2px; }
@media (max-width: 30rem) { .pv-tabs { grid-template-columns: 1fr; } }
`;
const previewBody = (heading, note) => `<div class="pv">
  <header class="pv-head">
    <p class="pv-kicker">Scepter Publishers · ${esc(note)}</p>
    <h1>${esc(heading)}</h1>
    <p>Take either quiz as a reader would. Results appear without signing up. The email form is in test mode: nothing is sent, and you can see exactly what your email system would receive.</p>
  </header>
  <div class="pv-tabs" role="tablist" aria-label="Quizzes">
    ${tabs}
  </div>
  ${panels}
</div>`;
const tabScript = `(function () {
  var tabs = document.querySelectorAll('.pv-tab');
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener('click', function () {
      Array.prototype.forEach.call(tabs, function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on ? 'true' : 'false');
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });
})();`;
const head = (title) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>`;
writeFileSync(join(DIST, 'preview.html'), `<!doctype html>
<html lang="en">
<head>
${head('Scepter Reader Quizzes')}
<link rel="stylesheet" href="${FONTS}">
<style>${previewCss}
${CSS}
</style>
</head>
<body>
${previewBody('Reader quizzes with a free ebook', 'preview')}
<script>${DEMO_SETTINGS}</script>
<script>
${safe(JS)}
</script>
<script>${tabScript}</script>
</body>
</html>
`);

// ---- the world: a self-contained static folder, safe to mount at any path -------------------------------
// dist/world/scepter/
//   index.html              both quizzes, tabbed
//   next-step/index.html    one quiz per page, for linking and for testing the cross-links
//   gift-finder/index.html
//   assets/scepter-quiz.js, .css      the engine (rebuilt, never edited)
//   assets/settings.js      where sign-ups go: test mode until you change it, no rebuild needed
//   _headers, robots.txt    noindex while it is a test; basic security headers
//   (beside it, in dist/world/: wrangler.jsonc, wrangler.path.jsonc, .assetsignore)
// Every link is relative, so it works at edwardthomas.quest/scepter/ or on its own host.
const W = join(DIST, 'world', 'scepter');
mkdirSync(join(W, 'assets'), { recursive: true });
const SETTINGS_JS = `/* Where the quiz sends sign-ups. This file is yours to edit; the quiz code is not.
 * It is in TEST MODE: nothing leaves the page. To go live, change provider and fill its block
 * (see funnels/README.md, "Where the email goes"). Public keys only; never a secret. */
window.SCEPTER_QUIZ_SETTINGS = {
  capture: {
    provider: 'demo',                 // 'demo' | 'klaviyo' | 'webhook' | 'custom'  ('shopify' only on the store's own domain)
    // klaviyo: { companyId: 'XXXXXX', listId: 'YYYYYY' },
    // webhook: { url: 'https://hooks.example.com/...' },
    consent: { mode: 'checkbox' }     // 'checkbox' (unticked box) is the safe default; 'notice' for the US
  }
};
`;
writeFileSync(join(W, 'assets', 'scepter-quiz.js'), banner + JS);
writeFileSync(join(W, 'assets', 'scepter-quiz.css'), banner + CSS);
writeFileSync(join(W, 'assets', 'settings.js'), SETTINGS_JS);
const testBanner = `<p class="w-test" role="note">Test version. Nothing you enter here is sent or saved.</p>`;
const worldCss = `${previewCss}
.w-test { max-width: 44rem; margin: 0 auto 1rem; padding: 0.5rem 0.8rem; border-radius: 6px; background: #f1e6c9; color: #3f3418; font-size: 0.95rem; }
.w-back { max-width: 44rem; margin: 0 auto 0.75rem; font-size: 1rem; }
.w-back a { color: #4d5646; }
main { max-width: 44rem; margin-inline: auto; }
`;
const page = (title, depth, body, quizUrls) => `<!doctype html>
<html lang="en">
<head>
${head(title)}
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="${depth}assets/scepter-quiz.css">
<style>${worldCss}</style>
</head>
<body>
${body}
<script src="${depth}assets/settings.js"></script>
${quizUrls ? `<script>window.SCEPTER_QUIZ_SETTINGS.quizUrls = ${JSON.stringify(quizUrls)};</script>` : ''}
<script src="${depth}assets/scepter-quiz.js"></script>
</body>
</html>
`;
writeFileSync(join(W, 'index.html'), page('Scepter Reader Quizzes', '', `${testBanner}\n${previewBody('Reader quizzes with a free ebook', 'test world')}\n<script>${tabScript}</script>`));
for (const id of quizIds) {
  mkdirSync(join(W, id), { recursive: true });
  const urls = {}; for (const other of quizIds) urls[other] = `../${other}/`;
  writeFileSync(join(W, id, 'index.html'), page(`${SQ.quizzes[id].meta.title} | Scepter Publishers`, '../',
    `${testBanner}\n<p class="w-back"><a href="../">All quizzes</a></p>\n<main><div data-scepter-quiz="${esc(id)}"></div></main>`, urls));
}
writeFileSync(join(W, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(join(W, '_headers'), `/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://a.klaviyo.com https:; frame-ancestors 'self'
/assets/*
  Cache-Control: public, max-age=300
`);
// Deploy configs live BESIDE the assets folder, so they are never published as files.
const WW = join(DIST, 'world');
writeFileSync(join(WW, 'wrangler.jsonc'), `{
  // Standalone test site (a *.workers.dev address). From this folder: npx wrangler deploy
  // Rename "name" for a different address.
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "scepter-quizzes",
  "compatibility_date": "2025-09-01",
  "assets": { "directory": "./scepter", "html_handling": "auto-trailing-slash", "not_found_handling": "404-page" }
}
`);
writeFileSync(join(WW, 'wrangler.path.jsonc'), `{
  // The same pages mounted at edwardthomas.quest/scepter/ on a zone you already serve from Cloudflare.
  // From this folder: npx wrangler deploy --config wrangler.path.jsonc
  // The assets directory is this folder (it contains scepter/), so requests to /scepter/... find scepter/...
  // Only /scepter/* is answered by this worker; the rest of the site is untouched.
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "scepter-quizzes-path",
  "compatibility_date": "2025-09-01",
  "workers_dev": false,
  "routes": [{ "pattern": "edwardthomas.quest/scepter/*", "zone_name": "edwardthomas.quest" }],
  "assets": { "directory": "./", "html_handling": "auto-trailing-slash", "not_found_handling": "404-page" }
}
`);
writeFileSync(join(WW, '.assetsignore'), `wrangler.jsonc\nwrangler.path.jsonc\n.assetsignore\n.wrangler\nnode_modules\n`);
console.log(`build: wrote ${DIST.slice(HERE.length + 1)}/ (scepter-quiz.js, scepter-quiz.css, sections/scepter-quiz.liquid, ${quizIds.map((i) => i + '.html').join(', ')}, preview.html, world/scepter/)`);
