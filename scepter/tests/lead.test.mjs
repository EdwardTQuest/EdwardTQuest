// Lead capture: consent, sensitive answers, and the four channels (Klaviyo, Omnisend, a webhook,
// Shopify's newsletter form), with fake endpoints.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../theme/assets/scepter-lead.js');

const plan = [1, 2, 3].map((n) => ({ month: `Month ${n}`, title: `Book ${n}`, url: `https://example.com/products/b${n}`, why: `Because ${n}.`, hidden_gem: n === 2 }));
const lead = (extra = {}) => ({ email: 'reader@example.com', firstName: 'Ann', source: 'Scepter quiz', tags: ['scepter-quiz', 'Quiz Mission'],
  properties: { formation_plan_url: 'https://example.com/pages/reading-plan?plan=x', religion: 'catholic', gender: 'f' },
  eventName: 'Completed Formation Quiz', eventProperties: { formation_plan_url: 'https://example.com/pages/reading-plan?plan=x', religion: 'catholic', plan },
  marketing: false, ...extra });
function fakeFetch(log) {
  return (url, init) => { log.push({ url, init }); return Promise.resolve({ ok: true, status: 200, url: String(url) }); };
}

test('Omnisend: identifies the contact and records the event, the plan flattened to strings', async () => {
  const calls = [];
  const win = { omnisend: Object.assign([], { identifyContact: (c) => calls.push(['identify', c]) }) };
  win.omnisend.push = (x) => calls.push(x);
  const r = await L.submit({ omnisend: { enabled: true }, window: win }, lead());
  assert.equal(r.channels.omnisend, true);
  assert.deepEqual(calls[0], ['identify', { email: 'reader@example.com' }]);
  const [kind, name, payload] = calls[1];
  assert.equal(kind, 'track');
  assert.equal(name, 'Completed Formation Quiz');
  assert.equal(payload.contact.email, 'reader@example.com');
  const p = payload.properties;
  assert.equal(p.plan_1_title, 'Book 1');
  assert.equal(p.plan_3_url, 'https://example.com/products/b3');
  assert.equal(p.plan_2_hidden_gem, 'true');
  assert.equal(p.formation_plan_url, 'https://example.com/pages/reading-plan?plan=x');
  assert.equal(p.first_name, 'Ann');
  assert.ok(Object.values(p).every((v) => typeof v === 'string'), 'every property a string');
  assert.equal(p.religion, undefined, 'religion stays out unless the admin allows it');
});

test('Omnisend: without its launcher the event is queued, and not counted as sent', async () => {
  const win = {};
  const r = await L.submit({ omnisend: { enabled: true, waitMs: 0 }, window: win }, lead());
  assert.equal(r.channels.omnisend, false);
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(win.omnisend) && win.omnisend[0][0] === 'track', 'queued for the snippet to pick up');
});

test('consent: only a ticked box subscribes; the plan event is recorded either way', async () => {
  const log = [];
  await L.submit({ klaviyo: { publicKey: 'ABC123', listId: 'L1' }, shopify: true, fetch: fakeFetch(log) }, lead({ marketing: false }));
  assert.ok(!log.some((c) => /subscriptions/.test(c.url)), 'no Klaviyo subscription');
  assert.ok(!log.some((c) => /\/contact/.test(c.url)), 'no Shopify newsletter customer');
  assert.ok(log.some((c) => /events/.test(c.url)), 'the event is still recorded');
  const ticked = [];
  await L.submit({ klaviyo: { publicKey: 'ABC123', listId: 'L1' }, shopify: true, fetch: fakeFetch(ticked) }, lead({ marketing: true }));
  assert.ok(ticked.some((c) => /subscriptions/.test(c.url)));
  const form = ticked.find((c) => /\/contact/.test(c.url)).init.body;
  assert.match(form.get('contact[tags]'), /newsletter, scepter-quiz, quiz-mission/);
});

test('which channels can email the reader', () => {
  assert.equal(L.emails({}), false);
  assert.equal(L.emails({ shopify: true }), false, 'a newsletter signup sends no plan');
  assert.equal(L.emails({ omnisend: { enabled: true } }), true);
  assert.equal(L.emails({ klaviyo: { publicKey: 'X' } }), true);
  assert.equal(L.emails({ webhook: 'https://hooks.example.com' }), true);
});
