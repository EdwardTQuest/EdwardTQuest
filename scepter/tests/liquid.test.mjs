// node --test scepter/tests  —  render the Shopify sections with liquidjs and mock store objects,
// then check that every config they print is valid JSON the scripts can use. Theme-check covers
// Liquid syntax; this covers the contract between the Liquid and the JavaScript.
// Skips itself when liquidjs is not installed (run `npm install` in scepter/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Liquid;
try { ({ Liquid } = await import('liquidjs')); } catch { /* not installed */ }
const E = require('../theme/assets/scepter-engine.js');
const T = require('../theme/assets/scepter-temperament.js');
const THEME = new URL('../theme/', import.meta.url).pathname;
const products = JSON.parse(readFileSync(new URL('../demo/mock/products.json', import.meta.url))).products;
const store = JSON.parse(readFileSync(new URL('../demo/mock/store.json', import.meta.url)));

// Mock Shopify objects.
const product = Object.fromEntries(products.map((p) => [p.handle, {
  id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, tags: p.tags, available: true,
  price: Math.round(Number(p.variants[0].price) * 100),
  selected_or_first_available_variant: { id: p.variants[0].id, price: Math.round(Number(p.variants[0].price) * 100) },
  url: '/products/' + p.handle, featured_image: null, description: p.body_html
}]));
const collection = (handles) => ({ products: handles.filter((h) => product[h]).map((h) => product[h]), products_count: handles.length });
const collections = {
  'best-sellers': collection(store.lists.bestsellers), 'best-selling-products': collection(store.lists.trending),
  'alexandre-havard': collection(store.lists.topics['alexandre-havard']),
  ...Object.fromEntries(Object.entries(store.lists.topics).map(([k, v]) => [k, collection(v)]))
};
const pages = { 'reading-plan': { url: '/pages/reading-plan' }, 'discover-your-mission': { url: '/pages/discover-your-mission' } };
const metaobjectValues = store.library.map((e) => ({
  product: { value: product[e.handle] }, themes: { value: e.themes || null }, good_for: { value: e.good_for || null },
  depth: { value: e.depth || null }, seasons: { value: e.seasons || null }, start_when: { value: e.start_when || null },
  why: { value: e.why || null }, boost: { value: e.boost ?? null }, exclude: { value: null }
}));

function engine() {
  const liquid = new Liquid({ root: [THEME + 'snippets', THEME + 'sections'], extname: '.liquid', jsTruthy: false });
  liquid.registerTag('schema', { parse(token, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:endschema', () => s.stop()).on('template', () => {}).on('end', () => { throw new Error('schema not closed'); }); s.start(); }, * render() { return ''; } });
  liquid.registerTag('paginate', {
    parse(token, remain) {
      this.tpls = [];
      const s = this.liquid.parser.parseStream(remain);
      s.on('tag:endpaginate', () => s.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('paginate not closed'); });
      s.start();
    },
    * render(ctx, emitter) { yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); }
  });
  const same = (v) => v;
  liquid.registerFilter('image_url', (img) => (img ? img.src || String(img) : ''));
  liquid.registerFilter('asset_url', (name) => '/cdn/shop/t/1/assets/' + name);
  liquid.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
  for (const f of ['color_darken', 'color_lighten', 'color_mix']) liquid.registerFilter(f, same);
  liquid.registerFilter('json', (v) => JSON.stringify(v === undefined ? null : v)); // Shopify prints nil as null
  return liquid;
}

function schemaOf(file) {
  const src = readFileSync(THEME + 'sections/' + file, 'utf8');
  return JSON.parse(src.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
}
function defaults(settings) {
  return Object.fromEntries(settings.filter((s) => s.id).map((s) => [s.id, s.default ?? (s.type === 'checkbox' ? false : s.type === 'product_list' ? [] : null)]));
}
// Resolve template settings the way Shopify does: handles become objects.
function resolve(schemaSettings, values) {
  const types = Object.fromEntries(schemaSettings.filter((s) => s.id).map((s) => [s.id, s.type]));
  const out = { ...defaults(schemaSettings), ...values };
  for (const [k, v] of Object.entries(out)) {
    if (types[k] === 'collection') out[k] = v ? collections[v] || null : null;
    if (types[k] === 'product') out[k] = v ? product[v] || null : null;
    if (types[k] === 'product_list') out[k] = (v || []).map((h) => product[h]).filter(Boolean);
    if (types[k] === 'page') out[k] = v ? pages[v] || null : null;
  }
  return out;
}
async function render(file, section, globals = {}) {
  const html = await engine().renderFile(file.replace('.liquid', ''), {
    section, routes: { root_url: '/' }, cart: { currency: { iso_code: 'USD' } }, collections,
    shop: { privacy_policy: { url: '/policies/privacy-policy' }, metaobjects: { formation_book: { values_count: metaobjectValues.length, values: metaobjectValues } } },
    ...globals
  });
  const m = html.match(/<script type="application\/json" data-sp-config>([\s\S]*?)<\/script>/);
  assert.ok(m, file + ' prints a config');
  return { html, config: JSON.parse(m[1]) };
}

test('quiz section: every variant template prints JSON the engine turns into a twelve-month plan', { skip: !Liquid && 'liquidjs not installed' }, async () => {
  const schema = schemaOf('scepter-quiz.liquid');
  for (const v of ['mission', 'adventure', 'treasures']) {
    const tpl = JSON.parse(readFileSync(THEME + `templates/page.scepter-${v}.json`, 'utf8')).sections.quiz;
    const blockSchema = schema.blocks[0].settings;
    const blocks = tpl.block_order.map((id) => ({ type: tpl.blocks[id].type, settings: resolve(blockSchema, tpl.blocks[id].settings) }));
    const { html, config: c } = await render('scepter-quiz.liquid', { id: 'template--1__quiz', settings: resolve(schema.settings, tpl.settings), blocks });
    assert.match(html, new RegExp(`sp-v-${v}`));
    assert.equal(c.variant, v);
    assert.equal(c.rootUrl, '/');
    assert.equal(c.lists.bestsellers[0], store.lists.bestsellers[0]);
    assert.ok(Object.keys(c.lists.topics).includes('fr-jacques-philippe'), 'topic collections resolved from the textarea');
    assert.equal(c.rules.filter(Boolean).length, 5);
    assert.deepEqual(c.rules[0].products, ['searching-for-and-maintaining-peace', 'interior-freedom']);
    assert.equal(c.library.filter(Boolean).length, store.library.length);
    assert.ok(c.library[0].product && c.library[0].product.handle, 'curated entries carry their product');
    assert.equal(c.planPageUrl, '/pages/reading-plan');
    assert.equal(c.settings.bestsellerShare, v === 'treasures' ? 0.55 : 0.7);
    assert.equal(c.lead.klaviyo.publicKey, '');
    // Hand it to the engine, as the browser would (plus the fetched catalogue).
    const catalog = E.prepareCatalog({ products: c.products.concat(products), lists: c.lists, topicMap: c.topicMap, library: c.library, settings: c.settings });
    const profile = E.profileFromAnswers({ religion: 'catholic', state: 'married', kids: 2, feel: { god: 1, religion: 2, world: 2 }, desire: 'grow' });
    const plan = E.buildPlan(profile, catalog, { rules: c.rules, featured: c.featured, bestsellerShare: c.settings.bestsellerShare, start: { year: 2026, month: 9 } });
    assert.equal(plan.months.length, 12);
    assert.equal(plan.months[0].item.handle, 'searching-for-and-maintaining-peace');
  }
});

test('quiz section: an empty store (no collections, no metaobjects, no rules) still prints valid JSON', { skip: !Liquid && 'liquidjs not installed' }, async () => {
  const schema = schemaOf('scepter-quiz.liquid');
  const { config: c } = await render('scepter-quiz.liquid', { id: 'x', settings: resolve(schema.settings, { topic_map: '' }), blocks: [] },
    { shop: { privacy_policy: null, metaobjects: {} }, collections: {} });
  assert.deepEqual(c.lists.bestsellers, []);
  assert.deepEqual(c.library, [null]);
  assert.deepEqual(c.rules, [null]);
  assert.equal(c.planPageUrl, '/pages/reading-plan');
});

test('e-book pop-up: the preset prints three interests and the lead settings', { skip: !Liquid && 'liquidjs not installed' }, async () => {
  const schema = schemaOf('scepter-ebook-popup.liquid');
  const blocks = schema.presets[0].blocks.map((b) => ({ type: b.type, settings: resolve(schema.blocks[0].settings, b.settings) }));
  const { config: c } = await render('scepter-ebook-popup.liquid', { id: 'footer-ebook', settings: resolve(schema.settings, {}), blocks });
  const interests = c.interests.filter(Boolean);
  assert.deepEqual(interests.map((i) => i.key), ['peace', 'prosperity', 'enlightenment']);
  assert.equal(c.triggers.hash, 'free-ebook');
  assert.equal(c.triggers.delay, 20);
  assert.deepEqual(c.excludePaths.map((s) => s.trim()), ['/cart', '/checkout', '/account', '/pages/reading-plan']);
  assert.equal(c.lead.eventName, 'Requested Free E-book');
});

test('temperament pop-up: the preset prints 22 questions the scorer reads, and the Havard books', { skip: !Liquid && 'liquidjs not installed' }, async () => {
  const schema = schemaOf('scepter-temperament-popup.liquid');
  const bs = Object.fromEntries(schema.blocks.map((b) => [b.type, b.settings]));
  const blocks = schema.presets[0].blocks.map((b) => ({ type: b.type, settings: resolve(bs[b.type], b.settings) }));
  const settings = resolve(schema.settings, {
    book_all: 'from-temperament-to-character', book_melancholic: 'created-for-greatness-the-power-of-magnanimity',
    book_phlegmatic: 'created-for-greatness-the-power-of-magnanimity', more_books: 'alexandre-havard'
  });
  const { config: c, html } = await render('scepter-temperament-popup.liquid', { id: 'footer-temp', settings, blocks });
  // Havard's test by default: its data file loads before the pop-ups, and no credit overrides his.
  assert.equal(c.questionSet, 'havard');
  const scripts = [...html.matchAll(/assets\/([\w.-]+\.js)/g)].map((m) => m[1]);
  assert.ok(scripts.indexOf('scepter-temperament-havard.js') > scripts.indexOf('scepter-temperament.js'));
  assert.ok(scripts.indexOf('scepter-temperament-havard.js') < scripts.indexOf('scepter-popups.js'));
  assert.equal(c.copy.attribution, null, 'blank credit: the set supplies its own');
  const standIn = await render('scepter-temperament-popup.liquid', { id: 'footer-temp', settings: { ...settings, question_set: 'standin' }, blocks });
  assert.equal(standIn.config.questionSet, 'standin');
  assert.ok(!standIn.html.includes('scepter-temperament-havard.js'), 'the stand-in does not load his file');
  const qs = T.normaliseQuestions(c.questions.filter(Boolean));
  assert.equal(qs.length, 22);
  assert.ok(qs.every((q) => q.answers.length === 4 && q.answers.every((a) => Object.keys(a.score).length === 1)));
  assert.equal(qs[20].weight, 2);
  const r = T.score(c.questions.filter(Boolean), qs.map(() => 0));
  assert.ok(T.KEYS.includes(r.dominant));
  const books = c.books.filter(Boolean);
  assert.equal(books[0].for[0], 'all');
  assert.equal(books[0].product.handle, 'from-temperament-to-character');
  assert.ok(books.length >= 5, 'picked books plus the collection');
  assert.deepEqual(Object.keys(c.results).sort(), ['choleric', 'melancholic', 'phlegmatic', 'sanguine']);
  assert.equal(c.results.choleric.name, null, 'blank result fields stay blank (the built-in words apply)');
});

test('reading plan section prints its config', { skip: !Liquid && 'liquidjs not installed' }, async () => {
  const schema = schemaOf('scepter-reading-plan.liquid');
  const tpl = JSON.parse(readFileSync(THEME + 'templates/page.scepter-reading-plan.json', 'utf8')).sections.plan;
  const { config: c } = await render('scepter-reading-plan.liquid', { id: 'plan', settings: resolve(schema.settings, tpl.settings), blocks: [] });
  assert.equal(c.quizUrl, '/pages/discover-your-mission');
});
