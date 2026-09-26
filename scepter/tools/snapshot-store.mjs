// Take a snapshot of the live store for the demo and the calibration tests: every product
// (trimmed to what the engine reads), the best-seller order, the topic collections, plus the
// curated library from setup/formation-books.csv and the starter rules from the templates.
//   node scepter/tools/snapshot-store.mjs [--store https://scepterpublishers.org]
// Writes demo/live/products.json and demo/live/store.json. Only public storefront endpoints are
// read (products.json, collections/<handle>/products.json, and one collection page for the
// store-wide best-selling order), at about three requests a second.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../theme/assets/scepter-engine.js');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const STORE = opt('store', 'https://scepterpublishers.org').replace(/\/$/, '');
const HERE = new URL('..', import.meta.url);
const OUT = new URL('demo/live/', HERE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, as = 'json') {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(STORE + path, { headers: { 'User-Agent': 'scepter-quiz-kit (snapshot)' } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    await sleep(340);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return as === 'json' ? res.json() : res.text();
  }
  throw new Error(`${path}: rate-limited`);
}
async function allPages(path) {
  const out = [];
  for (let page = 1; page < 40; page++) {
    const j = await get(`${path}${path.includes('?') ? '&' : '?'}limit=250&page=${page}`);
    if (!j || !j.products || !j.products.length) break;
    out.push(...j.products);
  }
  return out;
}
const text = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function parseCsv(src) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}
const list = (v) => String(v || '').split(/[;|]/).map((x) => x.trim()).filter(Boolean);

// The section's default topic map, from its schema.
const quizSection = readFileSync(new URL('theme/sections/scepter-quiz.liquid', HERE), 'utf8');
const schema = JSON.parse(quizSection.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
const topicMapText = schema.settings.find((x) => x.id === 'topic_map').default;
const topicHandles = Object.keys(E._internal.parseTopicMap(topicMapText));

console.log(`Reading ${STORE} …`);
const raw = await allPages('/products.json');
const products = raw.map((p) => ({
  id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, product_type: p.product_type, tags: p.tags,
  body_html: text(p.body_html).slice(0, 1200),
  variants: (p.variants || []).map((v) => ({ id: v.id, title: v.title, price: v.price, available: v.available })),
  images: p.images && p.images[0] ? [{ src: p.images[0].src }] : []
}));

async function handlesOf(collection, limit = 50) {
  // A missing collection answers 200 with no products, not 404.
  const j = await get(`/collections/${collection}/products.json?limit=${limit}`);
  return j && j.products && j.products.length ? j.products.map((p) => p.handle) : null;
}
const bestsellers = (await handlesOf('best-sellers')) || [];
let trending = await handlesOf('best-selling-products');
let trendingFrom = 'collections/best-selling-products';
if (!trending) {
  // Until that collection exists, read the store-wide best-selling order from the catalogue pages.
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const seen = new Set();
  trending = [];
  for (let page = 1; page <= 8 && trending.length < 50; page++) {
    const html = (await get(`/collections/all?sort_by=best-selling&page=${page}`, 'text')) || '';
    let found = 0;
    for (const m of html.matchAll(/href="\/(?:collections\/[\w-]+\/)?products\/([a-z0-9-]+)/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]); found++;
      const p = byHandle.get(m[1]);
      if (p && p.variants.some((v) => Number(v.price) > 0)) trending.push(m[1]);
    }
    if (!found) break;
  }
  trending = trending.slice(0, 50);
  trendingFrom = 'collections/all?sort_by=best-selling (stands in for the best-selling-products collection)';
}
const topics = {};
for (const h of topicHandles) { const hs = await handlesOf(h); if (hs && hs.length) topics[h] = hs; }

const library = parseCsv(readFileSync(new URL('setup/formation-books.csv', HERE), 'utf8')).map((r) => ({
  handle: r.handle, themes: list(r.themes), good_for: list(r.good_for), depth: r.depth || null, seasons: list(r.seasons),
  start_when: list(r.start_when), why: r.why || null, boost: r.boost ? Number(r.boost) : 0, exclude: /^(1|true|yes)$/i.test(r.exclude || '')
}));
const rules = {}, featured = {};
for (const v of ['mission', 'adventure', 'treasures']) {
  const q = JSON.parse(readFileSync(new URL(`theme/templates/page.scepter-${v}.json`, HERE), 'utf8')).sections.quiz;
  rules[v] = (q.block_order || Object.keys(q.blocks || {})).map((id) => q.blocks[id]).filter((b) => b && b.type === 'starter_rule').map((b) => b.settings);
  featured[v] = q.settings.featured_products || [];
}

mkdirSync(OUT, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('products.json', OUT), JSON.stringify({ snapshot: date, store: STORE, products }));
writeFileSync(new URL('store.json', OUT), JSON.stringify({
  snapshot: date, store: STORE, trendingFrom,
  lists: { bestsellers, trending, topics }, topicMap: topicMapText, library, rules, featured
}, null, 1));
console.log(`demo/live/: ${products.length} products, ${bestsellers.length} best-sellers, ${trending.length} trending (${trendingFrom}), ${Object.keys(topics).length} topic collections, ${library.length} library entries.`);
