// Build the Scepter quizzes world for edwardthomas.quest/scepter/quizzes/ (--base sets another path): a folder that deploys as it is, with
// the password Worker (worker.js), its wrangler config, and the site in public/quizzes/.
//   node tools/build-world.mjs [--base /scepter/quizzes] [--out DIR] [--havard FILE] [--reader-ref REF|none]
// --out         the bundle (default dist/world, which git ignores).
// --havard      Alexandre Havard's test: the real scepter-temperament-havard.js (Heron, or private/
//               after `npm run import:havard`). Without it the world runs the kit's stand-in questions.
//               A bundle with his file is private: it is never written where git would commit it here.
// --reader-ref  the git ref with the second Claude set's built world (funnels/dist/world/scepter/);
//               default origin/claude/scepter-quiz-ebook-capture-vqmppd; "none" leaves the set out.
// The builder owns worker.js, wrangler.jsonc, the three notes (WORLD.md, HANDOFF.md, NOTE-FOR-CODEX.md)
// and, in public/quizzes/, the hub files, fonts/, claude/ and reader/, except claude/assets/brand.css
// once the bundle has one. Anything else (codex/, any other set) is kept, and so are other sets'
// entries in world.json, so the world can be rebuilt over a bundle that others have added to.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORLD = path.join(KIT, 'world');
const THEME = path.join(KIT, 'theme');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const OUT = path.resolve(opt('out', path.join(KIT, 'dist', 'world')));
const HAVARD = opt('havard', null);
const READER_REF = opt('reader-ref', 'origin/claude/scepter-quiz-ebook-capture-vqmppd');
// Where the world answers on edwardthomas.quest: /scepter/quizzes (inside the Scepter world) by default.
const BASE = '/' + String(opt('base', '/scepter/quizzes')).replace(/^\/+|\/+$/g, '');
if (!/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(BASE)) fail(`--base ${BASE} is not a plain path`);
const Q = path.join(OUT, 'public', ...BASE.slice(1).split('/'));
const fail = (msg) => { console.error('build-world: ' + msg); process.exit(1); };
const git = (...a) => execFileSync('git', ['-C', KIT, ...a], { maxBuffer: 64 << 20 });

// ---- checks before anything is written ----
let havard = null;
if (HAVARD) {
  const file = path.resolve(HAVARD);
  if (!existsSync(file)) fail(`no file at ${file}`);
  havard = require(file);
  if (!havard) fail(`${file} is the public placeholder, not Alexandre Havard's test`);
  const T = require(path.join(THEME, 'assets', 'scepter-temperament.js'));
  const problems = T.twoStage.validateSet(havard);
  if (problems.length) fail(`${file} does not fit the two-stage method: ${problems.join('; ')}`);
  // Never where git would commit it in this (public) repository.
  let top = null;
  try { top = git('rev-parse', '--show-toplevel').toString().trim(); } catch { /* not a checkout */ }
  if (top && (OUT + path.sep).startsWith(top + path.sep)) {
    const probe = path.join(Q, 'claude', 'assets', 'scepter-temperament-havard.js');
    try { git('check-ignore', '-q', probe); } catch { fail(`${OUT} is inside ${top} and not ignored by git; a bundle with Havard's test must not be committed there. Use --out in the private Heron repository.`); }
  }
}
if (existsSync(OUT) && readdirSync(OUT).length && !existsSync(path.join(OUT, 'wrangler.jsonc'))) {
  fail(`${OUT} is not empty and is not a world bundle (no wrangler.jsonc); refusing to write into it.`);
}

// A bundle built for another path: move its world (with codex/ and anything else) to BASE.
for (const old of ['quizzes', 'scepter/quizzes'].map((b) => path.join(OUT, 'public', ...b.split('/')))) {
  if (old !== Q && existsSync(old) && !existsSync(Q)) { mkdirSync(path.dirname(Q), { recursive: true }); cpSync(old, Q, { recursive: true }); }
  if (old !== Q && existsSync(old)) rmSync(old, { recursive: true, force: true });
}

// ---- clear what this builder owns, keep the rest ----
// brand.css is the one file of claude/ that is yours once the bundle has it (the brand guide's colours).
const brandFile = path.join(Q, 'claude', 'assets', 'brand.css');
const brand = existsSync(brandFile) ? readFileSync(brandFile) : null;
for (const p of ['index.html', 'world.css', 'world.js', 'world-cover.svg', 'og.jpg', 'fonts', 'claude', 'reader']) rmSync(path.join(Q, p), { recursive: true, force: true });
mkdirSync(Q, { recursive: true });
for (const f of ['WORLD.md', 'HANDOFF.md', 'NOTE-FOR-CODEX.md']) cpSync(path.join(WORLD, f), path.join(OUT, f));
// The Worker and its routes, at BASE.
const worker = readFileSync(path.join(WORLD, 'worker.js'), 'utf8');
if (!worker.includes("const BASE = '/quizzes';")) fail('worker.js no longer declares BASE');
writeFileSync(path.join(OUT, 'worker.js'), worker.replace("const BASE = '/quizzes';", `const BASE = '${BASE}';`));
writeFileSync(path.join(OUT, 'wrangler.jsonc'), readFileSync(path.join(WORLD, 'wrangler.jsonc'), 'utf8').replaceAll('edwardthomas.quest/quizzes', 'edwardthomas.quest' + BASE).replaceAll('/quizzes and /quizzes/*', `${BASE} and ${BASE}/*`));
cpSync(path.join(WORLD, 'gitignore.txt'), path.join(OUT, '.gitignore'));
cpSync(path.join(WORLD, 'site'), Q, { recursive: true, filter: (src) => path.basename(src) !== 'world.json' });

// ---- the Claude formation kit: the theme's own files, unchanged ----
const A = path.join(Q, 'claude', 'assets');
for (const f of ['scepter.css', 'scepter-engine.js', 'scepter-lead.js', 'scepter-quiz.js', 'scepter-popups.js', 'scepter-temperament.js',
  'scepter-temperament-havard.js', 'scepter-cormorant.woff2', 'scepter-cormorant-italic.woff2', 'scepter-source-sans.woff2']) {
  cpSync(path.join(THEME, 'assets', f), path.join(A, f));
}
if (havard) cpSync(path.resolve(HAVARD), path.join(A, 'scepter-temperament-havard.js'));
const brandKept = brand && !brand.equals(readFileSync(brandFile));
if (brand) writeFileSync(brandFile, brand);
cpSync(path.join(THEME, 'assets', 'scepter-cormorant.woff2'), path.join(Q, 'fonts', 'cormorant.woff2'));
cpSync(path.join(THEME, 'assets', 'scepter-cormorant-italic.woff2'), path.join(Q, 'fonts', 'cormorant-italic.woff2'));

// The store snapshot, and the settings the quiz section prints for each variant (its defaults, then
// the template's values), so the world's plans are the ones the store would make.
const LIVE = path.join(KIT, 'demo', 'live');
if (!existsSync(path.join(LIVE, 'store.json'))) fail('no store snapshot in demo/live (node tools/snapshot-store.mjs)');
mkdirSync(path.join(A, 'live'), { recursive: true });
for (const f of ['products.json', 'store.json']) cpSync(path.join(LIVE, f), path.join(A, 'live', f));
const quizSrc = readFileSync(path.join(THEME, 'sections', 'scepter-quiz.liquid'), 'utf8');
const schema = JSON.parse(quizSrc.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
const dflt = (id) => (schema.settings.find((s) => s.id === id) || {}).default;
const sections = {};
for (const v of ['mission', 'adventure', 'treasures']) {
  const t = JSON.parse(readFileSync(path.join(THEME, 'templates', `page.scepter-${v}.json`), 'utf8')).sections.quiz.settings;
  const val = (id) => (id in t ? t[id] : dflt(id));
  sections[v] = { settings: {
    bestsellerShare: val('bestseller_share') / 100, maxPerAuthor: val('max_per_author'),
    excludeTags: val('exclude_tags') || '', excludeHandles: val('exclude_handles') || '',
    excludeSpanish: !!val('exclude_spanish'), excludeBundles: !!val('exclude_bundles'), publisherNames: val('publisher_names') || ''
  } };
}
writeFileSync(path.join(A, 'live', 'sections.json'), JSON.stringify(sections, null, 1));

// An example plan for the hub's plan-page card: the "mother" reader of tests/live.test.mjs.
const E = require(path.join(THEME, 'assets', 'scepter-engine.js'));
const products = JSON.parse(readFileSync(path.join(LIVE, 'products.json'), 'utf8')).products;
const store = JSON.parse(readFileSync(path.join(LIVE, 'store.json'), 'utf8'));
const catalog = E.prepareCatalog({ products, lists: store.lists, topicMap: store.topicMap, library: store.library,
  settings: Object.assign({ rootUrl: 'https://scepterpublishers.org/' }, sections.mission.settings) });
const mother = E.profileFromAnswers({ age: '35-44', religion: 'catholic', gender: 'f', state: 'married', marriedYears: '6-15', kids: 3,
  work: 'professional', workFeel: 'stretched', workService: 2, feel: { god: 2, religion: 3, world: 2 }, faith: 'dry', home: 5, desire: 'grow' });
const example = E.buildPlan(mother, catalog, { rules: store.rules.mission, featured: store.featured.mission, variant: 'mission',
  bestsellerShare: sections.mission.settings.bestsellerShare, maxPerAuthor: sections.mission.settings.maxPerAuthor, seed: 'example-reader|mission' });
if (example.months.length !== 12) fail(`the example plan has ${example.months.length} months`);

// ---- the second Claude set (reader & gift quizzes), from its own branch ----
let reader = false;
if (READER_REF !== 'none') {
  const SRC = 'funnels/dist/world/scepter/';
  let files = [];
  try { files = git('ls-tree', '--full-tree', '-r', '--name-only', READER_REF, SRC).toString().split('\n').filter(Boolean); } catch { /* ref not fetched */ }
  if (!files.length) {
    console.warn(`build-world: ${READER_REF} not found (git fetch origin ${READER_REF.replace(/^origin\//, '')}); the reader & gift set is left out.`);
  } else {
    const R = path.join(Q, 'reader');
    for (const file of files) {
      const rel = file.slice(SRC.length);
      if (rel === '_headers' || rel === 'robots.txt') continue; // the Worker sets headers for the whole world
      const dest = path.join(R, rel);
      mkdirSync(path.dirname(dest), { recursive: true });
      const bytes = git('show', `${READER_REF}:${file}`);
      writeFileSync(dest, rel.endsWith('.html') ? readerPage(bytes.toString('utf8'), rel, R) : bytes);
    }
    reader = true;
  }
}

// The world's CSP forbids inline scripts, so each moves to a file; the page gets the world's bar, which
// takes the place of its own "All quizzes" link. Nothing else in their pages changes.
function readerPage(html, rel, R) {
  const depth = rel.split('/').length - 1;          // index.html 0, next-step/index.html 1
  const up = '../'.repeat(depth);                    // to reader/
  html = html.replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (all, attrs = '', body) => {
    if (/\bsrc=/.test(attrs) || /type=["']application\/(ld\+)?json/.test(attrs) || !body.trim()) return all;
    const name = 'inline-' + createHash('sha256').update(body).digest('hex').slice(0, 10) + '.js';
    mkdirSync(path.join(R, 'assets'), { recursive: true });
    writeFileSync(path.join(R, 'assets', name), body.trim() + '\n');
    return `<script src="${up}assets/${name}"></script>`;
  });
  const page = rel.replace(/\/?index\.html$/, '');
  const link = (to, label) => `<a href="${up}${to}/"${page === to ? ' aria-current="page"' : ''}>${label}</a>`;
  const bar = `<header class="w-bar w-bar--card">\n  <a class="w-bar__home" href="${up}../#reader">All quizzes</a>\n` +
    `  <span class="w-bar__set">Reader &amp; gift quizzes · Claude</span>\n` +
    `  <nav class="w-bar__nav" aria-label="Reader and gift quizzes">${link('next-step', 'Next step')}${link('gift-finder', 'Gift finder')}</nav>\n` +
    `  <span class="w-bar__test">Test mode</span>\n</header>`;
  const css = `<link rel="stylesheet" href="${up}../world.css">`;
  html = /<link rel="stylesheet"/.test(html) ? html.replace(/<link rel="stylesheet"/, `${css}\n$&`) : html.replace(/<\/head>/, `${css}\n$&`);
  html = html.replace(/<body([^>]*)>/, (m) => `${m}\n${bar}`);
  return html.replace(/<p class="w-back"><a href="\.\.\/">All quizzes<\/a><\/p>\n?/, '');
}

// ---- world.json: this builder's sets replace their old entries; everyone else's stay ----
const snapshotDate = new Date(store.snapshot + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fill = {
  SNAPSHOT: snapshotDate,
  PLAN: encodeURIComponent(E.encodePlan(example)),
  HAVARD_NOTE: havard
    ? 'Alexandre Havard’s Temperament Test appears in full, credited to him, so that Scepter and Virtuous Leadership (HVLI) can see it in place while we ask permission. It is HVLI’s copyright and will not go on scepterpublishers.org without that permission.'
    : 'This build runs the kit’s own stand-in questions. Alexandre Havard’s test goes only into the private build.',
  TEMP_TITLE: havard ? 'Alexandre Havard’s Temperament Test' : 'The temperament test',
  TEMP_SUB: havard ? 'His full two-stage test and twelve profiles, with his books for each temperament.' : 'The kit’s stand-in questions, with Alexandre Havard’s books for each temperament.',
  TEMP_META: havard ? 'About 5 minutes · 22 to 30 statements' : 'About 3 minutes'
};
const template = JSON.parse(readFileSync(path.join(WORLD, 'site', 'world.json'), 'utf8'), (k, v) =>
  typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in fill ? fill[key] : m)) : v);
const mine = template.sets.filter((s) => s.owner === 'claude' && (s.key !== 'reader' || reader));
let existing = null;
try { existing = JSON.parse(readFileSync(path.join(Q, 'world.json'), 'utf8')); } catch { /* first build */ }
let sets;
if (existing && Array.isArray(existing.sets)) {
  sets = existing.sets.filter((s) => s && s.owner !== 'claude');
  sets.unshift(...mine);
  for (const s of template.sets) if (s.owner !== 'claude' && !sets.some((x) => x.key === s.key)) sets.push(s);
} else {
  sets = template.sets.filter((s) => s.owner !== 'claude' || mine.includes(s));
}
writeFileSync(path.join(Q, 'world.json'), JSON.stringify(Object.assign({}, existing || {}, { version: template.version, title: template.title, sets }), null, 2) + '\n');

// ---- the world's rules, checked on every page: no inline scripts or handlers, nothing from elsewhere ----
const problems = [];
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const file of walk(Q)) {
  const rel = path.relative(Q, file);
  if (file.endsWith('.html')) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1] || '';
      if (!/\bsrc=/.test(attrs) && !/type=["']application\/(ld\+)?json/.test(attrs) && m[2].trim()) problems.push(`${rel}: an inline script`);
      if (/\bsrc=["']?(https?:)?\/\//.test(attrs)) problems.push(`${rel}: a script from another site`);
    }
    if (/<link[^>]+href=["']?(https?:)?\/\//.test(html)) problems.push(`${rel}: a stylesheet or font from another site`);
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) problems.push(`${rel}: an inline event handler`);
    if (/<iframe/i.test(html)) problems.push(`${rel}: an iframe`);
  }
  if (file.endsWith('.css') && /url\(\s*["']?(https?:)?\/\//.test(readFileSync(file, 'utf8'))) problems.push(`${rel}: a font or image from another site in CSS`);
}
if (problems.length) fail('the world breaks its CSP:\n  ' + problems.join('\n  '));

const size = walk(path.join(OUT, 'public')).reduce((n, f) => n + statSync(f).size, 0);
console.log(`World built in ${OUT} (${(size / 1048576).toFixed(1)} MB of pages and files):`);
console.log(`  formation quizzes (Claude): the kit, the ${store.snapshot} snapshot, ${havard ? 'ALEXANDRE HAVARD’S TEST (private: keep this bundle out of public repositories)' : 'the stand-in questions (no --havard)'}`);
console.log(`  reader & gift quizzes: ${reader ? 'from ' + READER_REF : 'left out'}`);
if (brandKept) console.log('  kept the bundle’s own claude/assets/brand.css (it differs from world/site/claude/assets/brand.css)');
console.log(`  sets in world.json: ${sets.map((s) => s.key + (s.owner === 'claude' ? '' : ' (kept)')).join(', ')}`);
console.log('  CSP check: no inline scripts, handlers, frames or outside fonts');
