// node --test scepter/tests  —  the recommendation engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const E = require('../theme/assets/scepter-engine.js');
const products = JSON.parse(readFileSync(new URL('../demo/mock/products.json', import.meta.url))).products;
const store = JSON.parse(readFileSync(new URL('../demo/mock/store.json', import.meta.url)));

const catalog = E.prepareCatalog({ products, lists: store.lists, topicMap: store.topicMap, library: store.library });
const OCT = { year: 2026, month: 9 };

const base = {
  age: '35-44', religion: 'catholic', gender: 'f', work: 'professional', state: 'married',
  marriedYears: '6-15', kids: 3, feel: { god: 4, religion: 4, world: 3 }, faith: 'growing',
  home: 7, workFeel: 'content', workService: 3, desire: 'grow'
};
function plan(answers, opts = {}) {
  const profile = E.profileFromAnswers({ ...base, ...answers });
  return { profile, plan: E.buildPlan(profile, catalog, { start: OCT, seed: 'test', rules: store.rules, ...opts }) };
}
const handles = (p) => p.months.map((m) => m.item.handle);
const author = (h) => catalog.byHandle[h].authorKey;

test('computus: Easter Sunday for known years', () => {
  const d = (y) => new Date(E._internal.easterSunday(y)).toISOString().slice(0, 10);
  assert.equal(d(2024), '2024-03-31');
  assert.equal(d(2025), '2025-04-20');
  assert.equal(d(2026), '2026-04-05');
  assert.equal(d(2027), '2027-03-28');
  assert.equal(d(2038), '2038-04-25');
});

test('seasons: Lent, Easter, Advent, Christmas and the devotional months land where they should', () => {
  const s = E._internal.seasonsFor;
  assert.ok(s(2027, 2).includes('lent'), 'March 2027 is Lent');
  assert.ok(s(2027, 1).includes('lent'), 'Ash Wednesday 2027 is 10 February');
  assert.ok(!s(2026, 3).includes('lent') && s(2026, 3).includes('easter'), 'April 2026 is Easter, not Lent');
  assert.ok(s(2026, 11).includes('advent') && s(2026, 11).includes('christmas'));
  assert.ok(s(2027, 0).includes('christmas'));
  assert.ok(s(2026, 4).includes('mary') && s(2026, 4).includes('pentecost'), 'May 2026: Our Lady and Pentecost (24 May)');
  assert.ok(s(2026, 10).includes('last-things'));
  assert.deepEqual(s(2026, 6), ['summer']);
});

test('start month: after the 20th the plan starts next month', () => {
  assert.deepEqual(E._internal.startOf(new Date(2026, 8, 25)), { year: 2026, month: 9 });
  assert.deepEqual(E._internal.startOf(new Date(2026, 8, 5)), { year: 2026, month: 8 });
  assert.deepEqual(E._internal.startOf(new Date(2026, 11, 28)), { year: 2027, month: 0 });
});

test('catalogue hygiene: bundles, sets, Spanish editions, free booklets, gift cards and the order product are out', () => {
  const out = Object.fromEntries(catalog.rejected.map((r) => [r.handle, r.reason]));
  assert.equal(out['jacques-philippe-starter-pack'], 'bundle');
  assert.equal(out['in-conversation-with-god-7-volume-set'], 'bundle');
  assert.equal(out['the-founder-of-opus-dei-full-set'], 'bundle');
  assert.equal(out['jacques-philippe-nine-days-at-home-retreat-series'], 'bundle');
  assert.equal(out['la-oracion-camino-de-amor'], 'spanish');
  assert.equal(out['la-fe-explicada'], 'spanish');
  assert.equal(out['la-iglesia-1'], 'spanish');
  assert.equal(out['pentateuco'], 'spanish');
  assert.equal(out['in-gods-house'], 'free');
  assert.equal(out['order'], 'handle');
  assert.equal(out['scepter-gift-card'], 'type');
  assert.ok(catalog.byHandle['marcus'], 'a one-word English title is not Spanish');
  assert.ok(catalog.byHandle['in-conversation-with-god-volume-2-lent-and-eastertide'], 'single volumes stay');
});

test('authors: vendor, person-like tags, honorifics; merchandising tags are not people', () => {
  const k = E._internal.authorKey;
  assert.equal(k('Fr. Jacques Philippe'), 'philippe');
  assert.equal(k('St. Josemaría Escrivá'), 'escriva');
  assert.equal(k('Paul Josef Cardinal Cordes'), 'cordes');
  assert.equal(k('Francis Fernandez-Carvajal'), k('Francis Carvajal'));
  assert.equal(author('searching-for-and-maintaining-peace'), 'philippe', 'vendor is the publisher: the tag is the author');
  const p = E._internal.looksLikePerson;
  assert.ok(p('Leo Trese') && p('Fr. Jacques Philippe') && p('James Stenson'));
  assert.ok(!p('Best Seller') && !p('Opus Dei') && !p('New Testament Paperback') && !p('Lent') && !p('Gift Ideas'));
});

test('editions: a combined volume conflicts with its parts', () => {
  const keys = E._internal.workKeysFor('The Way, Furrow, The Forge');
  assert.ok(keys.includes('the way') && keys.includes('furrow') && keys.includes('the forge'));
  assert.deepEqual(E._internal.workKeysFor('The Way (Mini Edition)'), ['the way']);
  assert.notDeepEqual(E._internal.workKeysFor('In Conversation With God Volume 1 - Advent'),
    E._internal.workKeysFor('In Conversation With God Volume 2 - Lent'));
});

test('a plan is twelve distinct books, no work twice, at most two per author, never the same author two months running', () => {
  const personas = [
    {}, { state: 'single', kids: 0, desire: 'discover', age: '18-24' }, { state: 'priest', gender: 'm', priestType: 'secular', priestRole: 'parochial', kids: 0 },
    { religion: 'none', faith: 'none', gender: 'other', state: 'single', kids: 0 }, { feel: { god: 1, religion: 2, world: 1 }, faith: 'dry', home: 3 }
  ];
  for (const a of personas) {
    const { plan: p } = plan(a);
    const hs = handles(p);
    assert.equal(hs.length, 12, JSON.stringify(a));
    assert.equal(new Set(hs).size, 12);
    const keys = hs.flatMap((h) => catalog.byHandle[h].workKeys);
    assert.equal(new Set(keys).size, keys.length, 'no work twice: ' + hs.join(', '));
    const counts = {};
    hs.forEach((h) => { counts[author(h)] = (counts[author(h)] || 0) + 1; });
    assert.ok(Object.values(counts).every((c) => c <= 2), JSON.stringify(counts));
    for (let i = 1; i < hs.length; i++) assert.notEqual(author(hs[i]), author(hs[i - 1]), `adjacent ${hs[i - 1]} / ${hs[i]}`);
  }
});

test('"If pretty poor, that is a Jacques Philippe": month 1 when God, religion or the world feel poor', () => {
  for (const feel of [{ god: 2, religion: 2, world: 2 }, { god: 1, religion: 4, world: 4 }, { god: 3, religion: 1, world: 2 }]) {
    const { profile, plan: p } = plan({ feel });
    assert.ok(profile.flags.struggling);
    assert.equal(author(p.months[0].item.handle), 'philippe', JSON.stringify(feel) + ' → ' + p.months[0].item.title);
  }
  // And even with no admin rules at all (the built-in rule).
  const { plan: bare } = plan({ feel: { god: 1, religion: 1, world: 1 } }, { rules: [] });
  assert.equal(author(bare.months[0].item.handle), 'philippe');
  // Not struggling: no forced Philippe in month 1.
  const { profile } = plan({ feel: { god: 5, religion: 4, world: 4 } });
  assert.equal(profile.flags.struggling, false);
});

test('mostly bestsellers, some backlist: the share is honoured', () => {
  const { plan: p70 } = plan({});
  assert.ok(p70.stats.bestsellers >= 7 && p70.stats.backlist >= 3, JSON.stringify(p70.stats));
  assert.equal(p70.months[0].tier, 'bestseller', 'month 1 is always a proven favourite');
  const { plan: p55 } = plan({}, { bestsellerShare: 0.55 });
  assert.ok(p55.stats.backlist >= 4, 'the hidden-treasure quiz digs deeper: ' + JSON.stringify(p55.stats));
  assert.ok(p55.stats.backlist > p70.stats.backlist);
});

test('state of life steers the plan', () => {
  const marriedKids = handles(plan({ state: 'married', marriedYears: '1-5', kids: 2 }).plan);
  assert.ok(marriedKids.some((h) => catalog.byHandle[h].themes.marriage >= 0.8 || catalog.byHandle[h].themes.family >= 0.8), marriedKids.join());

  const priest = handles(plan({ state: 'priest', gender: 'm', priestType: 'secular', priestRole: 'parochial', kids: 0 }).plan);
  assert.ok(priest.includes('why-priests-answers-guided-by-the-teaching-of-benedict-xvi'), priest.join());
  assert.ok(!priest.includes('love-marriage-money') && !priest.includes('successful-fathers'), 'no marriage or parenting books for a priest');

  const single = handles(plan({ state: 'single', kids: 0 }).plan);
  assert.ok(!single.includes('why-priests-answers-guided-by-the-teaching-of-benedict-xvi'), 'no priest-only books for lay people');
  assert.ok(!single.includes('successful-fathers') && !single.includes('compass-a-handbook-on-parent-leadership'), 'no parenting books without children');
});

test('audiences: named audiences gate a book; with "Everyone" they only give emphasis', () => {
  const lib = [{ handle: 'the-thoughtful-home', good_for: ['Everyone', 'Married', 'Parents'] }, { handle: 'love-marriage-money', good_for: ['Married', 'Engaged & newlyweds'] }];
  const cat = E.prepareCatalog({ products, lists: store.lists, topicMap: store.topicMap, library: lib });
  const af = (a, h) => E._internal.audienceFactor(cat.byHandle[h], E.profileFromAnswers(a));
  const single = { state: 'single', kids: 0 }, married = { state: 'married', kids: 2 }, marriedNoKids = { state: 'married', kids: 0 };
  assert.equal(af(single, 'the-thoughtful-home'), 1, 'open to everyone: no demotion');
  assert.equal(af(married, 'the-thoughtful-home'), 1.2, 'emphasis for couples with children');
  assert.equal(af(marriedNoKids, 'the-thoughtful-home'), 1.15, 'partial emphasis');
  assert.equal(af(single, 'love-marriage-money'), 0.3, 'gated to couples');
  assert.equal(af(married, 'love-marriage-money'), 1.3);
});

test('leaders and people whose work feels empty get Havard and the sanctification of work', () => {
  const lead = handles(plan({ work: 'business', workService: 4 }).plan);
  assert.ok(lead.some((h) => author(h) === 'havard'), lead.join());
  const empty = handles(plan({ workService: 1 }).plan);
  assert.ok(empty.includes('sanctifying-ordinary-work'), empty.join());
});

test('newcomers start with bridges, not insider books', () => {
  const { plan: p } = plan({ religion: 'muslim', faith: 'steady', gender: 'm', state: 'married' });
  const early = p.months.slice(0, 4).map((m) => catalog.byHandle[m.item.handle]);
  assert.ok(early.every((it) => !it.insider), early.map((x) => x.title).join(' | '));
  assert.ok(handles(p).includes('the-faith-explained'));
  assert.ok(!handles(p).includes('the-collected-letters-volume-1'));
});

test('seasons: Advent reading lands in December, Lent reading in Lent, never in July', () => {
  const { plan: p } = plan({ desire: 'grow', faith: 'onfire' });
  const byMonth = Object.fromEntries(p.months.map((m) => [m.month, catalog.byHandle[m.item.handle]]));
  for (const [m, it] of Object.entries(byMonth)) {
    if (it.seasons.includes('advent') || it.seasons.includes('christmas')) assert.ok([10, 11, 0].includes(Number(m)), it.title + ' in month ' + m);
    if (it.seasons.includes('lent')) assert.ok([1, 2, 3].includes(Number(m)), it.title + ' in month ' + m);
  }
  const dec = p.months.find((m) => m.month === 11);
  assert.ok(dec.seasons.includes('advent'));
});

test('calendar windows: Ordinary Time weeks and month ranges in titles place a book in its season', () => {
  const m = E._internal.inferMonths;
  assert.deepEqual(m('In Conversation With God: Volume 4, Weeks 13-23'), [5, 6, 7, 8]);
  assert.deepEqual(m('In Conversation With God: Volume 5, Weeks 24-34'), [8, 9, 10]);
  assert.deepEqual(m('In Conversation With God: Volume 6, Feasts, January-June'), [0, 1, 2, 3, 4, 5]);
  assert.equal(m('Interior Freedom'), null);
  for (const a of [{}, { desire: 'grow', faith: 'onfire' }, { state: 'priest', gender: 'm', kids: 0 }, { feel: { god: 2, religion: 2, world: 2 } }]) {
    for (const mo of plan(a).plan.months) {
      const it = catalog.byHandle[mo.item.handle];
      if (it.months) assert.ok(it.months.includes(mo.month), `${it.title} placed in month ${mo.month}`);
    }
  }
});

test('determinism: same seed, same plan; the jitter only nudges', () => {
  const a = handles(plan({}, { seed: 'x@y.org' }).plan);
  const b = handles(plan({}, { seed: 'x@y.org' }).plan);
  assert.deepEqual(a, b);
});

test('explanations: every month says why, and tags hidden gems', () => {
  const { plan: p } = plan({ feel: { god: 2, religion: 2, world: 2 } });
  p.months.forEach((m) => {
    assert.ok(m.why && m.why.length > 20, m.item.title);
    assert.ok(m.tags.length >= 1);
  });
  assert.match(p.months[0].why, /peace|Philippe/i);
  assert.ok(p.months.some((m) => m.tags.includes('Hidden gem')));
  assert.ok(p.practice.text.length > 30);
});

test('swap: replaces one month, keeps the others, respects the constraints', () => {
  const { profile, plan: p } = plan({});
  const q = E.swapMonth(p, 5, profile, catalog, {});
  const before = handles(p), after = handles(q);
  assert.notEqual(after[5], before[5]);
  assert.deepEqual(after.filter((_, i) => i !== 5), before.filter((_, i) => i !== 5));
  assert.equal(new Set(after).size, 12);
});

test('rules: admin order is a preference; a missing product falls back to the text match', () => {
  const rules = [{ condition: 'everyone', products: ['does-not-exist'], match: 'Stenson', month: 2 }];
  const { plan: p } = plan({ kids: 2 }, { rules });
  assert.equal(author(p.months[1].item.handle), 'stenson');
});

test('permalink codes round-trip', () => {
  const { plan: p } = plan({});
  p.variant = 'treasures';
  const code = E.encodePlan(p);
  const d = E.decodePlan(code);
  assert.equal(d.variant, 'treasures');
  assert.deepEqual(d.handles, handles(p));
  assert.deepEqual(d.start, OCT);
  assert.equal(E.decodePlan('garbage'), null);
});

test('loadCatalog: pages through /products.json, caches, and degrades to [] on failure', async () => {
  const pages = { 1: Array.from({ length: 250 }, (_, i) => ({ id: i, handle: 'p' + i, title: 'P' + i, variants: [{ id: i, price: '10.00', available: true }], images: [] })), 2: [{ id: 999, handle: 'last', title: 'Last', variants: [], images: [] }] };
  let calls = 0;
  const fakeFetch = async (url) => { calls++; const n = Number(new URL(url, 'https://x').searchParams.get('page')); return { ok: true, json: async () => ({ products: pages[n] || [] }) }; };
  const mem = {}; const storage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  const list = await E.loadCatalog({ fetch: fakeFetch, storage });
  assert.equal(list.length, 251);
  assert.equal(calls, 2);
  await E.loadCatalog({ fetch: fakeFetch, storage });
  assert.equal(calls, 2, 'second load is served from cache');
  const failed = await E.loadCatalog({ fetch: async () => { throw new Error('offline'); }, storage: { getItem: () => null, setItem() {} } });
  assert.deepEqual(failed, []);
});

test('curated library labels map to internal keys, whatever the case', () => {
  const lib = E._internal.normaliseLibrary([{ handle: 'x', themes: ['peace & TRUST', 'Leadership'], good_for: ['Priests'], depth: 'Deep', seasons: ['Advent'], start_when: ['Struggling with God or the world'] }]);
  assert.deepEqual(Object.keys(lib.x.themes).sort(), ['leadership', 'peace']);
  assert.deepEqual(lib.x.audience, ['priests']);
  assert.equal(lib.x.depth, 3);
  assert.deepEqual(lib.x.seasons, ['advent']);
  assert.deepEqual(lib.x.startWhen, ['struggling']);
});

test('the starter spreadsheet: every label maps to an engine key (nothing is silently dropped)', () => {
  const text = readFileSync(new URL('../setup/formation-books.csv', import.meta.url), 'utf8');
  const lines = text.trim().split(/\r?\n/);
  const split = (line) => { const out = []; let cur = '', q = false; for (const c of line) { if (c === '"') q = !q; else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
  const head = split(lines[0]);
  const rows = lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
  const list = (v) => (v || '').split(';').map((x) => x.trim()).filter(Boolean);
  const lib = E._internal.normaliseLibrary(rows.map((r) => ({ handle: r.handle, themes: list(r.themes), good_for: list(r.good_for), seasons: list(r.seasons), start_when: list(r.start_when), depth: r.depth })));
  for (const r of rows) {
    const e = lib[r.handle];
    assert.equal(Object.keys(e.themes).length, list(r.themes).length, r.handle + ' themes');
    assert.equal(e.audience.length, list(r.good_for).length, r.handle + ' good_for');
    assert.equal(e.seasons.length, list(r.seasons).length, r.handle + ' seasons');
    assert.equal(e.startWhen.length, list(r.start_when).length, r.handle + ' start_when');
    if (r.depth) assert.ok(e.depth >= 1 && e.depth <= 3, r.handle + ' depth');
  }
  assert.ok(rows.length >= 25);
});
