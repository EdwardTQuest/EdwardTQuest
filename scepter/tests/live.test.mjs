// The engine on a snapshot of the live store (demo/live, from tools/snapshot-store.mjs): eight
// very different readers, the promises every plan must keep, and the calibration findings of
// 26 September 2026. Refresh the snapshot with `node tools/snapshot-store.mjs`; these tests should
// still pass, because they assert properties, not titles (except where a title is the point).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const E = require('../theme/assets/scepter-engine.js');
const LIVE = new URL('../demo/live/', import.meta.url);
const present = existsSync(new URL('store.json', LIVE));
const skip = !present && 'no live snapshot (node tools/snapshot-store.mjs)';
const products = present ? JSON.parse(readFileSync(new URL('products.json', LIVE))).products : [];
const store = present ? JSON.parse(readFileSync(new URL('store.json', LIVE))) : {};
// The quiz section's defaults, as a store would have them.
const quiz = readFileSync(new URL('../theme/sections/scepter-quiz.liquid', import.meta.url), 'utf8');
const schema = JSON.parse(quiz.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
const dflt = (id) => schema.settings.find((x) => x.id === id).default;
const settings = { excludeTags: dflt('exclude_tags'), excludeHandles: dflt('exclude_handles'), publisherNames: dflt('publisher_names'), maxPerAuthor: 2 };
const catalog = present ? E.prepareCatalog({ products, lists: store.lists, topicMap: store.topicMap, library: store.library, settings }) : null;

const READERS = {
  mother: ['mission', { age: '35-44', religion: 'catholic', gender: 'f', state: 'married', marriedYears: '6-15', kids: 3, work: 'professional', workFeel: 'stretched', workService: 2, feel: { god: 2, religion: 3, world: 2 }, faith: 'dry', home: 5, desire: 'grow' }],
  student: ['adventure', { age: '18-24', religion: 'catholic', gender: 'm', state: 'single', work: 'student', workFeel: 'good', workService: 3, feel: { god: 4, religion: 4, world: 3 }, faith: 'growing', home: 7, desire: 'learn' }],
  priest: ['mission', { age: '45-54', religion: 'catholic', gender: 'm', state: 'priest', priestType: 'secular', priestRole: 'parochial', work: 'ministry', workFeel: 'stretched', workService: 5, feel: { god: 4, religion: 3, world: 2 }, faith: 'steady', home: 6, desire: 'grow' }],
  protestant: ['adventure', { age: '25-34', religion: 'protestant', gender: 'f', state: 'married', marriedYears: '1-5', kids: 1, work: 'healthcare', workFeel: 'good', workService: 4, feel: { god: 4, religion: 3, world: 3 }, faith: 'growing', home: 7, desire: 'discover' }],
  leader: ['mission', { age: '45-54', religion: 'catholic', gender: 'm', state: 'married', marriedYears: '16-30', kids: 4, work: 'business', workFeel: 'good', workService: 4, feel: { god: 4, religion: 4, world: 3 }, faith: 'steady', home: 8, desire: 'grow' }],
  widow: ['treasures', { age: '65+', religion: 'catholic', gender: 'f', state: 'widowed', work: 'retired', workFeel: 'good', workService: 3, feel: { god: 3, religion: 4, world: 2 }, faith: 'onfire', home: 6, desire: 'discover' }],
  seeker: ['treasures', { age: '25-34', religion: 'none', gender: 'm', state: 'single', work: 'creative', workFeel: 'restless', workService: 2, feel: { god: 2, religion: 1, world: 2 }, faith: 'none', home: 5, desire: 'learn' }],
  sister: ['adventure', { age: '35-44', religion: 'catholic', gender: 'f', state: 'religious', order: 'Carmelite', work: 'ministry', workFeel: 'good', workService: 5, feel: { god: 5, religion: 4, world: 3 }, faith: 'onfire', home: 7, desire: 'grow' }]
};
const plans = {};
if (present) {
  for (const [name, [variant, a]] of Object.entries(READERS)) {
    const profile = E.profileFromAnswers(a);
    plans[name] = { profile, variant, plan: E.buildPlan(profile, catalog, { rules: store.rules[variant], featured: store.featured[variant],
      bestsellerShare: variant === 'treasures' ? 0.55 : 0.7, start: { year: 2026, month: 9 }, seed: name + '@example.com', variant }) };
  }
}
const items = (name) => plans[name].plan.months.map((m) => catalog.byHandle[m.item.handle]);

test('every reader gets twelve months, each a book the store sells in English, at the cart price', { skip }, () => {
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  for (const name of Object.keys(READERS)) {
    const months = plans[name].plan.months;
    assert.equal(months.length, 12, name);
    for (const m of months) {
      const p = byHandle.get(m.item.handle);
      assert.ok(!p.tags.includes('Spanish'), `${name}: ${p.title} is a Spanish edition`);
      const first = p.variants.find((v) => v.available) || p.variants[0];
      assert.equal(m.item.price, Number(first.price), `${name}: ${p.title} priced as its first available variant`);
      assert.ok(m.item.price > 0 && !/\b(set|pack|bundle|collection|missal)\b/i.test(p.title), `${name}: ${p.title}`);
    }
  }
});

test('the hard rules: no work twice, at most two by an author, never one author two months running', { skip }, () => {
  for (const name of Object.keys(READERS)) {
    const its = items(name);
    const keys = its.map((i) => i.authorKey);
    keys.forEach((k, i) => { if (i) assert.notEqual(k, keys[i - 1], `${name}: same author in months ${i} and ${i + 1}`); });
    const count = {};
    keys.forEach((k) => { count[k] = (count[k] || 0) + 1; });
    Object.entries(count).forEach(([k, n]) => assert.ok(n <= 2, `${name}: ${n} books by ${k}`));
    const works = its.flatMap((i) => i.workKeys);
    assert.equal(new Set(works).size, works.length, `${name}: a work appears twice`);
  }
});

test('mostly bestsellers: at least the share, less one where the shelf runs thin', { skip }, () => {
  for (const [name, { variant, plan }] of Object.entries(plans)) {
    const want = Math.round(12 * (variant === 'treasures' ? 0.55 : 0.7));
    assert.ok(plan.stats.bestsellers >= want - 1, `${name}: ${plan.stats.bestsellers} bestsellers, share wants ${want}`);
    assert.ok(plan.stats.backlist >= 12 - want - 1, `${name}: ${plan.stats.backlist} from the backlist`);
  }
});

test('struggling readers start with Fr. Jacques Philippe; a priest gets priestly books; month 1 is never a prayer book', { skip }, () => {
  for (const name of ['mother', 'seeker']) assert.match(items(name)[0].author, /Jacques Philippe/, name);
  const priest = items('priest').map((i) => i.title).join(' | ');
  assert.match(priest, /Why Priests\?/);
  assert.match(priest, /Priestly Fatherhood/, 'not gated away as a parents’ book');
  for (const name of Object.keys(READERS)) assert.ok(!items(name)[0].reference, `${name}: ${items(name)[0].title}`);
});

test('books for fathers go to fathers only; a newcomer gets The Faith Explained by month 4', { skip }, () => {
  for (const name of ['mother', 'protestant', 'widow', 'sister']) {
    items(name).forEach((i) => assert.ok(!(i.audience.includes('men') && i.audience.includes('parents')), `${name}: ${i.title}`));
  }
  for (const name of ['protestant', 'seeker']) {
    const at = items(name).findIndex((i) => i.handle === 'the-faith-explained');
    assert.ok(at >= 0 && at <= 3, `${name}: The Faith Explained in month ${at + 1}`);
  }
});

test('the store’s season tags no longer lock evergreen best-sellers; titled Lent books stay in Lent', { skip }, () => {
  const way = catalog.byHandle['the-way-mini-edition'];
  assert.ok(way && way.author, 'The Way is kept and has its author');
  assert.deepEqual(way.seasons, [], 'tagged Lent by the store, not held to Lent');
  const cross = catalog.byHandle['the-way-of-the-cross'];
  assert.ok(cross.seasons.includes('lent'));
  const placedOutsideLent = Object.values(plans).some(({ plan }) => plan.months.some((m) => m.item.handle === 'the-way-mini-edition' && !m.seasons.includes('lent')));
  assert.ok(placedOutsideLent, 'The Way appears outside Lent for someone');
  for (const { plan } of Object.values(plans)) {
    plan.months.filter((m) => m.item.handle === 'the-way-of-the-cross').forEach((m) => assert.ok(m.seasons.includes('lent'), m.label));
  }
});

test('no author is a publisher, a series or a sentence fragment', { skip }, () => {
  for (const it of catalog.items) {
    if (!it.author) continue;
    assert.ok(!/press|university|publishers|pocket size|douglings|\.\s+(He|She|It|They|The|This|His|Her)$/.test(it.author), `${it.title}: "${it.author}"`);
  }
});

test('the reasons are the reader’s own, and the plan does not say one thing over and over', { skip }, () => {
  for (const [name, { plan }] of Object.entries(plans)) {
    const n = {};
    plan.months.forEach((m) => { n[m.because] = (n[m.because] || 0) + 1; });
    const worst = Math.max(...Object.values(n));
    assert.ok(worst <= 11, `${name}: one sentence ${worst} times`);
    plan.months.forEach((m) => assert.match(m.because, /^Because .+\.$/, name));
  }
});
