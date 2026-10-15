// Engine tests: scoring, recommendations, tags and what each email system receives.
//   node --test funnels/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const ctx = load();
const SQ = ctx.ScepterQuiz;
const seg = SQ.data.segments;
const quizzes = Object.values(SQ.quizzes);
const ids = (xs) => xs.map((x) => x.id);

// every combination is too many; walk each option of each question once, the rest at option 0
function answerSets(quiz) {
  const base = {};
  for (const q of quiz.questions) base[q.id] = q.type === 'multi' ? [q.options[0].id] : q.options[0].id;
  const sets = [base];
  for (const q of quiz.questions) for (const o of q.options) {
    sets.push({ ...base, [q.id]: q.type === 'multi' ? [o.id] : o.id });
  }
  return sets;
}

test('there are at least two quizzes and each one validates', () => {
  assert.ok(quizzes.length >= 2, 'expected two or more quizzes');
  for (const q of quizzes) assert.equal(SQ.validate(q).join('; '), '', q.id);
});

test('every answer path yields a known stage, age, at least one need, three books and a free ebook', () => {
  const stages = ids(seg.stages), needs = ids(seg.needs), ages = ids(seg.ages).concat('unknown');
  for (const quiz of quizzes) {
    for (const a of answerSets(quiz)) {
      const p = SQ.core.computeProfile(quiz, a);
      assert.ok(stages.includes(p.stage), `${quiz.id}: stage ${p.stage}`);
      assert.ok(ages.includes(p.age), `${quiz.id}: age ${p.age}`);
      assert.ok(p.needs.length >= 1 && p.needs.every((n) => needs.includes(n)), `${quiz.id}: needs ${p.needs}`);
      const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3, filter: quiz.result.filter });
      assert.equal(recs.length, 3, `${quiz.id}: ${recs.length} books`);
      assert.equal(new Set(recs.map((r) => r.item.id)).size, 3, `${quiz.id}: duplicate book`);
      const mag = SQ.core.recommend(SQ.data.magnets, p, { count: 1, filter: quiz.result.magnetFilter });
      assert.equal(mag.length, 1, `${quiz.id}: no ebook`);
      if (typeof quiz.plan === 'function') {
        const plan = quiz.plan(p, SQ.data, SQ.core);
        assert.ok(plan && plan.steps && plan.steps.length >= 2, `${quiz.id}: plan`);
      }
    }
  }
});

test('an empty answer set still produces a usable profile', () => {
  for (const quiz of quizzes) {
    const p = SQ.core.computeProfile(quiz, {});
    assert.ok(p.stage, quiz.id);
    assert.ok(p.needs.length >= 1, quiz.id);
  }
});

test('every stage can be reached in every quiz', () => {
  for (const quiz of quizzes) {
    const reached = new Set();
    // try all single-question variations plus each stage-question option with the others varied
    for (const a of answerSets(quiz)) reached.add(SQ.core.computeProfile(quiz, a).stage);
    const qs = quiz.questions;
    for (let i = 0; i < 400; i++) {
      const a = {};
      qs.forEach((q, j) => {
        const o = q.options[(i * (j + 3) + j * 7 + Math.floor(i / (j + 1))) % q.options.length];
        a[q.id] = q.type === 'multi' ? [o.id] : o.id;
      });
      reached.add(SQ.core.computeProfile(quiz, a).stage);
    }
    for (const st of ids(seg.stages)) assert.ok(reached.has(st), `${quiz.id} never reaches ${st}`);
  }
});

test('ranking prefers matches on need, stage and age, and never repeats an author thrice', () => {
  const p = { quiz: 't', recipient: 'self', age: '35-49', stage: seg.stages[2].id, needs: [seg.needs[0].id], lang: 'en', extras: {} };
  const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3 });
  assert.ok(recs[0].reasons.some((r) => r.kind === 'need' || r.kind === 'stage'));
  const authors = recs.map((r) => r.item.author);
  assert.ok(new Set(authors).size >= 2, `authors ${authors}`);
});

test('a Spanish-speaking reader is offered Spanish books first', () => {
  const es = SQ.data.catalog.filter((b) => b.lang === 'es');
  if (!es.length) return;
  const p = { quiz: 't', recipient: 'self', age: '35-49', stage: seg.stages[1].id, needs: [seg.needs[0].id], lang: 'es', extras: {} };
  const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3 });
  assert.equal(recs[0].item.lang, 'es');
});

test('English readers are not offered Spanish editions', () => {
  for (const st of ids(seg.stages)) for (const n of ids(seg.needs)) {
    const p = { quiz: 't', recipient: 'self', age: '25-34', stage: st, needs: [n], lang: 'en', extras: {} };
    for (const r of SQ.core.recommend(SQ.data.catalog, p, { count: 3 })) assert.notEqual(r.item.lang, 'es', `${st}/${n}: ${r.item.id}`);
  }
});

test('tags and properties: self, gift, and a reader under 18', () => {
  const self = { quiz: 'next-read', recipient: 'self', age: '25-34', stage: 'growing', needs: ['prayer', 'peace'], life: 'parent-young', lang: 'en', extras: {} };
  assert.deepEqual([...SQ.core.tagsFor(self)], ['quiz-next-read', 'age-25-34', 'stage-growing', 'need-prayer', 'need-peace', 'life-parent-young']);
  const pr = SQ.core.propertiesFor(self, { now: '2026-01-01T00:00:00Z' });
  assert.equal(pr.scepter_stage, 'growing');
  assert.deepEqual([...pr.scepter_needs], ['prayer', 'peace']);

  const gift = { ...self, recipient: 'gift' };
  const gt = SQ.core.tagsFor(gift);
  assert.ok(gt.includes('gift-buyer') && gt.includes('gift-stage-growing') && !gt.includes('stage-growing'));
  const gp = SQ.core.propertiesFor(gift, {});
  assert.equal(gp.scepter_stage, undefined, 'a gift buyer is not given the recipient’s stage');
  assert.equal(gp.scepter_gift_stage, 'growing');

  const teen = { ...self, age: 'teen', life: null };
  assert.ok(SQ.core.tagsFor(teen).includes('guardian-signup'));
  assert.equal(SQ.core.propertiesFor(teen, {}).scepter_guardian_signup, true);
});

test('payload carries readable answers, tags, ebook and books', () => {
  const quiz = quizzes[0];
  const a = answerSets(quiz)[0];
  const p = SQ.core.computeProfile(quiz, a);
  const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3 });
  const magnet = SQ.core.recommend(SQ.data.magnets, p, { count: 1 })[0].item;
  const pl = SQ.capture.buildPayload(quiz, a, p, { email: ' a@b.org ', firstName: 'Ann', consent: true }, { magnet, recs, now: 'T' });
  assert.equal(pl.email, 'a@b.org');
  assert.equal(pl.first_name, 'Ann');
  assert.equal(pl.magnet.id, magnet.id);
  assert.equal(pl.recommendations.length, 3);
  assert.ok(pl.tags.includes('quiz-' + quiz.id));
  assert.equal(pl.answers, undefined, 'raw answers are not sent by default');
  assert.ok(!JSON.stringify(pl).match(/Mass|Confession/i) || pl.recommendations.some((r) => /Mass|Confession/i.test(r.title)), 'no practice details leak');
  ctx.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'demo', includeAnswers: true } };
  const withAnswers = SQ.capture.buildPayload(quiz, a, p, { email: 'a@b.org', consent: true }, { magnet, recs, now: 'T' });
  delete ctx.SCEPTER_QUIZ_SETTINGS;
  const firstQ = quiz.questions[0];
  assert.ok(Array.isArray(withAnswers.answers[firstQ.id]) && typeof withAnswers.answers[firstQ.id][0] === 'string');
});

function payloadFor(consent = true, quizId = 'next-step') {
  const quiz = SQ.quizzes[quizId];
  const a = answerSets(quiz)[0];
  const p = SQ.core.computeProfile(quiz, a);
  const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3 });
  const magnet = SQ.core.recommend(SQ.data.magnets, p, { count: 1 })[0].item;
  return SQ.capture.buildPayload(quiz, a, p, { email: 'a@b.org', consent }, { magnet, recs, now: 'T' });
}

test('Klaviyo adapter: profile, subscription and event, with the public key only', async () => {
  const calls = [];
  const c = load({ fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 202, text: async () => '' }; } });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'AbC123', listId: 'LiSt1' } } };
  const res = await c.ScepterQuiz.capture.send(payloadFor(true));
  assert.equal(res.provider, 'klaviyo');
  const paths = calls.map((x) => new URL(x.url).pathname).sort();
  assert.deepEqual(paths, ['/client/events', '/client/profiles', '/client/subscriptions']);
  for (const x of calls) {
    assert.equal(new URL(x.url).searchParams.get('company_id'), 'AbC123');
    assert.ok(x.init.headers.revision);
    assert.equal(x.init.headers['Content-Type'], 'application/vnd.api+json');
  }
  const sub = JSON.parse(calls.find((x) => x.url.includes('subscriptions')).init.body);
  assert.equal(sub.data.relationships.list.data.id, 'LiSt1');
  const ev = JSON.parse(calls.find((x) => x.url.includes('events')).init.body);
  assert.equal(ev.data.attributes.metric.data.attributes.name, 'Completed Scepter Quiz');
  assert.ok(ev.data.attributes.properties.scepter_stage);
});

test('gift payload: the giver is not given the recipient\u2019s stage, and the recipient is not named', () => {
  const pl = payloadFor(true, 'gift-finder');
  assert.equal(pl.properties.scepter_gift_buyer, true);
  assert.equal(pl.properties.scepter_stage, undefined);
  for (const k of ['scepter_language', 'scepter_quiz', 'scepter_free_ebook', 'scepter_recommended', 'scepter_reading_format']) assert.equal(pl.properties[k], undefined, `${k} must not be shared with a reader\u2019s own record`);
  assert.ok(pl.properties.scepter_gift_stage || pl.profile.age === 'child');
  assert.ok(pl.tags.includes('gift-buyer'));
  assert.ok(!JSON.stringify(pl).match(/\bname\b.*recipient/i));
});

test('Klaviyo adapter: no list subscription without consent', async () => {
  const calls = [];
  const c = load({ fetch: async (url) => { calls.push(url); return { ok: true, status: 202, text: async () => '' }; } });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'AbC123', listId: 'LiSt1' } } };
  await c.ScepterQuiz.capture.send(payloadFor(false));
  assert.ok(!calls.some((u) => u.includes('subscriptions')));
});

test('Klaviyo adapter: a rejected request is reported, so the reader can retry', async () => {
  const c = load({ fetch: async () => ({ ok: false, status: 400, text: async () => 'bad' }) });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'AbC123', listId: 'L' } } };
  await assert.rejects(() => c.ScepterQuiz.capture.send(payloadFor(true)));
});

test('webhook adapter: JSON as text/plain, blind resend when CORS fails', async () => {
  const calls = [];
  let first = true;
  const c = load({ fetch: async (url, init) => {
    calls.push(init);
    if (first) { first = false; throw new TypeError('Failed to fetch'); }
    return { ok: false, status: 0, type: 'opaque' };
  } });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'webhook', webhook: { url: 'https://hooks.example.org/x' } } };
  const res = await c.ScepterQuiz.capture.send(payloadFor(true));
  assert.equal(res.opaque, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].mode, 'no-cors');
  assert.match(calls[0].headers['Content-Type'], /^text\/plain/);
  assert.equal(JSON.parse(calls[0].body).email, 'a@b.org');
});

test('unknown provider and missing settings fail loudly', async () => {
  const c = load();
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'nope' } };
  await assert.rejects(() => c.ScepterQuiz.capture.send(payloadFor(true)), /Unknown capture provider/);
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: {} } };
  await assert.rejects(() => c.ScepterQuiz.capture.send(payloadFor(true)), /companyId/);
});

test('validate catches a quiz that scores an unknown need', () => {
  const bad = { id: 'bad', meta: { title: 'x' }, questions: [{ id: 'q', type: 'single', options: [{ id: 'o', label: 'o', score: { need: { nonsense: 1 } } }] }] };
  assert.match(SQ.validate(bad).join(), /unknown need nonsense/);
});

test('a child\u2019s gift carries no faith stage in what is sent', () => {
  const kid = { quiz: 'gift-finder', recipient: 'gift', age: 'child', stage: 'beginning', needs: ['prayer'], lang: 'en', extras: {} };
  const tags = [...SQ.core.tagsFor(kid)];
  assert.ok(tags.includes('gift-age-child') && !tags.some((t) => t.includes('stage')), tags.join());
  assert.equal(SQ.core.propertiesFor(kid, {}).scepter_gift_stage, undefined);
});

test('a child\u2019s gift is only ever offered children\u2019s books', () => {
  const quiz = SQ.quizzes['gift-finder'];
  for (const need of ids(seg.needs)) {
    const p = { quiz: quiz.id, recipient: 'gift', age: 'child', stage: 'beginning', needs: [need], lang: 'en', extras: {} };
    for (const r of SQ.core.recommend(SQ.data.catalog, p, { count: 3, filter: quiz.result.filter })) assert.equal(r.item.audience, 'children', `${need}: ${r.item.id}`);
  }
});

test('a teen reader is offered the teen book first, a retiree never one for children or teens', () => {
  const quiz = SQ.quizzes['next-step'];
  const teen = { quiz: quiz.id, recipient: 'self', age: 'teen', life: 'student', stage: 'beginning', needs: ['prayer'], lang: 'en', extras: {} };
  assert.equal(SQ.core.recommend(SQ.data.catalog, teen, { count: 3, filter: quiz.result.filter })[0].item.id, 'you-can-pray');
  for (const st of ids(seg.stages)) for (const n of ids(seg.needs)) {
    const p = { quiz: quiz.id, recipient: 'self', age: '65-plus', life: 'grown-children', stage: st, needs: [n], lang: 'en', extras: {} };
    for (const r of SQ.core.recommend(SQ.data.catalog, p, { count: 3, filter: quiz.result.filter })) assert.ok(!r.item.audience, `${st}/${n}: ${r.item.id}`);
  }
});

test('placement: habits decide for practising Catholics, a returning reader with a steady practice is Taking Root', () => {
  const quiz = SQ.quizzes['next-step'];
  const base = { age: '35-49', life: 'married', reading: 'sometimes', format: 'minutes', lang: 'en' };
  const run = (a) => SQ.core.computeProfile(quiz, { ...base, ...a }).stage;
  // says "deepening", but rarely prays, goes to Mass monthly, reads rarely: Taking Root
  assert.equal(run({ faith: 'central', prayer: 'sometimes', mass: 'monthly', reading: 'never' }), 'beginning');
  // says "unsteady", but prays daily, every Sunday, reads daily: Growing Deeper (or beyond), not Taking Root
  assert.notEqual(run({ faith: 'unsteady', prayer: 'daily', mass: 'every', reading: 'daily' }), 'beginning');
  // fully practising and reaching out: Bearing Fruit
  assert.equal(run({ faith: 'central', prayer: 'daily', mass: 'more', reading: 'daily' }), 'deepening');
  // a quiet, homebound reader with the same depth is not placed lower for saying little
  assert.equal(run({ faith: 'central', prayer: 'daily', mass: 'home', reading: 'daily' }), 'deepening');
  // can't get to Mass: left out of the average, not counted as zero (a zero would pull this reader down to Growing Deeper)
  assert.equal(run({ faith: 'practising', prayer: 'daily', mass: 'cant', reading: 'daily' }), 'deepening');
  assert.equal(run({ faith: 'practising', prayer: 'daily', mass: 'rare', reading: 'daily' }), 'growing');
  // returning with a steady practice
  assert.equal(run({ faith: 'away', prayer: 'daily', mass: 'every', reading: 'daily' }), 'beginning');
  assert.equal(run({ faith: 'away', prayer: 'never', mass: 'rare', reading: 'never' }), 'returning');
  // a seeker who prays daily is still Seeking
  assert.equal(run({ faith: 'curious', prayer: 'daily', reading: 'daily' }), 'exploring');
});

test('a married reader gets the marriage need, a parent of teens gets parenting; Confession answers add sacraments', () => {
  const quiz = SQ.quizzes['next-step'];
  const base = { age: '35-49', faith: 'unsteady', prayer: 'weekly', mass: 'most', reading: 'weekly', 'needs-practising': ['prayer'] };
  const a = SQ.core.computeProfile(quiz, { ...base, life: 'married' });
  assert.ok(a.needs.includes('marriage'), a.needs.join());
  const b = SQ.core.computeProfile(quiz, { ...base, life: 'parent-teen' });
  assert.ok(b.needs.includes('parenting'), b.needs.join());
  const c = SQ.core.computeProfile(quiz, { ...base, life: 'single', confession: 'unsure' });
  assert.ok(c.needs.includes('sacraments'), c.needs.join());
});

test('questions that do not apply are hidden, so the quiz stays short for newcomers', () => {
  const quiz = SQ.quizzes['next-step'];
  const seeker = SQ.core.visibleQuestions(quiz, { age: '25-34', faith: 'curious' }).map((q) => q.id);
  assert.ok(!seeker.includes('mass') && !seeker.includes('confession'), seeker.join());
  const teen = SQ.core.visibleQuestions(quiz, { age: 'teen', faith: 'practising' }).map((q) => q.id);
  assert.ok(!teen.includes('life'), 'a teen is not asked their life season');
  const dev = SQ.core.visibleQuestions(quiz, { age: '50-64', faith: 'central' }).map((q) => q.id);
  assert.ok(dev.length <= 11, dev.length + ' screens');
});

test('the "n of N" count only ever goes down as a reader answers', () => {
  for (const quiz of quizzes) for (const a of answerSets(quiz)) {
    const answers = {};
    let last = Infinity;
    for (const q of quiz.questions) {
      if (!SQ.core.shown(q, answers)) continue;
      const total = SQ.core.estimateTotal(quiz, answers);
      assert.ok(total <= last, `${quiz.id}: ${q.id} total rose from ${last} to ${total}`);
      last = total;
      if (a[q.id] !== undefined) answers[q.id] = a[q.id];
    }
  }
});

test('catalog entries point at scepterpublishers.org and carry evidence', () => {
  for (const b of SQ.data.catalog) {
    assert.match(b.url, /^https:\/\/scepterpublishers\.org\//, b.id);
    assert.ok(b.source, `${b.id} has no source note`);
  }
});


// ---- fixes from the independent reviews: each of these was a real defect --------------------------------

const sampleProfile = (over) => ({ quiz: 'next-step', recipient: 'self', age: '35-49', stage: 'growing', needs: ['prayer', 'peace'], life: 'married', lang: 'en', extras: {}, ...over });

test('a reader who did not agree, or a minor’s parent address, sends nothing about faith, age or needs', () => {
  const quiz = SQ.quizzes['next-step'];
  const a = { faith: 'practising', age: '35-49', prayer: 'daily', reading: 'daily', 'needs-practising': ['prayer'] };
  const p = SQ.core.computeProfile(quiz, a);
  const recs = SQ.core.recommend(SQ.data.catalog, p, { count: 3 });
  const magnet = SQ.core.recommend(SQ.data.magnets, p, { count: 1 })[0].item;
  for (const form of [{ email: 'a@b.org', consent: false }, { email: 'a@b.org', consent: true, guardian: true }]) {
    const pl = SQ.capture.buildPayload(quiz, a, p, form, { magnet, recs });
    assert.equal(pl.limited, true);
    assert.ok(pl.tags.every((t) => !/^(age|stage|need|life|gift-)/.test(t)), pl.tags.join());
    for (const k of ['scepter_stage', 'scepter_needs', 'scepter_age_band', 'scepter_life_season', 'scepter_recommended']) assert.equal(pl.properties[k], undefined, k);
    assert.equal(pl.profile.stage, undefined);
    assert.equal(pl.recommendations.length, 0);
    assert.equal(pl.properties.scepter_free_ebook, magnet.id, 'the ebook is still delivered');
  }
  const ok = SQ.capture.buildPayload(quiz, a, p, { email: 'a@b.org', consent: true }, { magnet, recs });
  assert.equal(ok.limited, false);
  assert.ok(ok.properties.scepter_stage);
});

test('a reader under 18 is never tagged with a stage, age or needs, even if the box is ticked', () => {
  const quiz = SQ.quizzes['next-step'];
  const a = { faith: 'curious', age: 'teen', prayer: 'weekly', reading: 'sometimes', 'needs-seeking': ['basics'] };
  const p = SQ.core.computeProfile(quiz, a);
  const pl = SQ.capture.buildPayload(quiz, a, p, { email: 'parent@b.org', consent: true, guardian: true }, {});
  assert.equal([...pl.tags].sort().join(), 'guardian-signup,quiz-next-step');
  assert.equal(pl.properties.scepter_guardian_signup, true);
  assert.equal(pl.first_name, null);
});

test('a gift buyer with no consent keeps a separate, minimal record', () => {
  const quiz = SQ.quizzes['gift-finder'];
  const a = { age: '35-49', faith: 'lapsed', needs: ['prayer'], lang: 'es' };
  const p = SQ.core.computeProfile(quiz, a);
  const pl = SQ.capture.buildPayload(quiz, a, p, { email: 'a@b.org', consent: false }, {});
  assert.equal([...pl.tags].sort().join(), 'gift-buyer,gift-lang-es,quiz-gift-finder');
});

test('analytics events carry no stage, age or needs', () => {
  const seen = [];
  const c = load({ CustomEvent: class { constructor(n, i) { this.type = n; this.detail = i.detail; } }, document: { dispatchEvent: (e) => seen.push(e.detail) }, dataLayer: { push: (o) => seen.push(o) } });
  c.ScepterQuiz.track('result', { quiz: 'next-step', stage: 'returning', age: 'teen', needs: ['sacraments'], book: 'x' });
  assert.ok(seen.length >= 2);
  for (const o of seen) { assert.equal(o.stage, undefined); assert.equal(o.age, undefined); assert.equal(o.needs, undefined); assert.equal(o.quiz, 'next-step'); }
});

test('Catholic-practice books never go to a Seeking reader; pointed books are never a gift to someone away; gift ebooks are neutral', () => {
  const quiz = SQ.quizzes['next-step'];
  for (const n of ids(seg.needs)) for (const age of ['18-24', '50-64']) {
    const seeker = sampleProfile({ stage: 'exploring', needs: [n], age });
    for (const r of SQ.core.recommend(SQ.data.catalog, seeker, { count: 3, filter: quiz.result.filter })) assert.ok(!r.item.catholic, `${n}: ${r.item.id}`);
    const mags = SQ.core.recommend(SQ.data.magnets, seeker, { count: 1 });
    assert.ok(!mags[0].item.catholic, `${n}: ebook ${mags[0].item.id}`);
    const gift = sampleProfile({ recipient: 'gift', quiz: 'gift-finder', stage: 'returning', needs: [n], age, life: null });
    for (const r of SQ.core.recommend(SQ.data.catalog, gift, { count: 3 })) assert.ok(!r.item.pointed, `gift ${n}: ${r.item.id}`);
  }
  const giftQuiz = SQ.quizzes['gift-finder'];
  for (const st of ids(seg.stages)) for (const n of ids(seg.needs)) {
    const p = sampleProfile({ recipient: 'gift', quiz: 'gift-finder', stage: st, needs: [n], life: null });
    const m = SQ.core.recommend(SQ.data.magnets, p, { count: 1, filter: giftQuiz.result.magnetFilter })[0].item;
    assert.ok(['how-to-pray', 'treasury-of-prayers', 'norms-of-piety', 'sanctifying-ordinary-work', 'advent-christmas-carols'].includes(m.id), `${st}/${n}: ${m.id}`);
  }
});

test('books for couples and parents are not offered to minors, nor to readers in another life season', () => {
  for (const n of ids(seg.needs)) for (const st of ids(seg.stages)) {
    const teen = sampleProfile({ age: 'teen', life: 'student', stage: st, needs: [n] });
    for (const r of SQ.core.recommend(SQ.data.catalog, teen, { count: 3 })) assert.ok(!r.item.lifeOnly, `teen ${st}/${n}: ${r.item.id}`);
    const single = sampleProfile({ life: 'single', stage: st, needs: [n] });
    for (const r of SQ.core.recommend(SQ.data.catalog, single, { count: 3 })) assert.ok(!r.item.lifeOnly || r.item.lifeOnly.includes('single'), `single ${st}/${n}: ${r.item.id}`);
  }
});

test('an unknown audience or language is refused, never offered to everyone', () => {
  const p = sampleProfile({ age: '65-plus' });
  assert.equal(SQ.core.eligible({ id: 'x', audience: 'child' }, p), false, 'a typo in audience fails closed');
  assert.equal(SQ.core.eligible({ id: 'x', audience: 'children' }, p), false);
  assert.equal(SQ.core.eligible({ id: 'x', lang: 'es' }, p), false, 'a Spanish edition is not offered to an English reader');
  assert.equal(SQ.core.eligible({ id: 'x', lang: 'es' }, { ...p, lang: 'es' }), true);
  assert.equal(SQ.core.eligible({ id: 'x' }, { ...p, lang: 'es' }), true, 'a Spanish reader may fall back to English');
});

test('an answer left behind by a hidden question is never scored, shown or sent', () => {
  const quiz = { id: 't', questions: [
    { id: 'a', type: 'single', options: [{ id: 'adult' }, { id: 'child' }] },
    { id: 'b', type: 'single', showIf: { a: ['adult'] }, options: [{ id: 'x' }, { id: 'y' }] },
    { id: 'c', type: 'single', showIf: { b: ['x'] }, options: [{ id: 'z', score: { need: { peace: 9 } } }] }
  ] };
  const stale = { a: 'child', b: 'x', c: 'z' };
  assert.equal(SQ.core.visibleQuestions(quiz, stale).map((q) => q.id).join(), 'a');
  assert.equal((SQ.core.tally(quiz, stale).scores.need || {}).peace, undefined);
});

test('validate catches the mistakes that used to build clean', () => {
  const base = (over, opt) => ({ id: 'v', meta: { title: 'v' }, questions: [
    { id: 'faith', type: 'single', options: [{ id: 'practising' }, { id: 'curious' }] },
    { id: 'q', type: 'single', ...over, options: [{ id: 'o', ...opt }] }
  ] });
  assert.match(SQ.validate(base({ showIf: { faith: ['practicing'] } })).join(), /not an option/);
  assert.match(SQ.validate(base({}, { set: { life: 'marired' } })).join(), /unknown life season/);
  assert.match(SQ.validate(base({}, { set: { lang: 'ES' } })).join(), /unknown language/);
  assert.match(SQ.validate(base({ type: 'multiple' })).join(), /type must be/);
});

test('Klaviyo: the event goes last, carries a unique id, and a private key is refused', async () => {
  const calls = [];
  const c = load({ fetch: async (url, init) => { calls.push({ path: new URL(url).pathname, body: JSON.parse(init.body) }); return { ok: true, status: 202, text: async () => '' }; } });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'AbC123', listId: 'L1' } } };
  const pl = payloadFor(true);
  await c.ScepterQuiz.capture.send(pl);
  assert.equal(calls.map((x) => x.path).join(), '/client/profiles,/client/subscriptions,/client/events');
  assert.equal(calls[2].body.data.attributes.unique_id, pl.submission_id);
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'pk_1234567890abcdef', listId: 'L1' } } };
  await assert.rejects(() => c.ScepterQuiz.capture.send(pl), /public API key/);
});

test('an unticked Klaviyo sign-up has no subscription and no faith data on the profile or event', async () => {
  const calls = [];
  const c = load({ fetch: async (url, init) => { calls.push({ path: new URL(url).pathname, body: JSON.parse(init.body) }); return { ok: true, status: 202, text: async () => '' }; } });
  c.SCEPTER_QUIZ_SETTINGS = { capture: { provider: 'klaviyo', klaviyo: { companyId: 'AbC123', listId: 'L1' } } };
  await c.ScepterQuiz.capture.send(payloadFor(false));
  assert.ok(!calls.some((x) => x.path.endsWith('subscriptions')));
  for (const x of calls) {
    const props = x.body.data.attributes.properties || {};
    assert.equal(props.scepter_stage, undefined, x.path);
    assert.equal(props.scepter_needs, undefined, x.path);
    assert.ok((props.scepter_tags || []).every((t) => /^quiz-/.test(t)), x.path + ' carries only the quiz tag');
  }
});

test('every payload carries a submission id so a receiver can drop a duplicate', () => {
  const a = payloadFor(true), b = payloadFor(true);
  assert.ok(a.submission_id && a.submission_id !== b.submission_id);
});
