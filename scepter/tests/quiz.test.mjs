// node --test scepter/tests  —  the quiz's question logic (no browser needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Q = require('../theme/assets/scepter-quiz.js');
const E = require('../theme/assets/scepter-engine.js');
const values = (opts) => opts.map((o) => o[0]);

test('gender: male/female, plus Other for every answer except Catholic, Muslim or Latter-day Saint', () => {
  for (const r of ['catholic', 'muslim', 'lds']) assert.deepEqual(values(Q.genderOptions({ religion: r })), ['m', 'f'], r);
  for (const r of ['orthodox', 'protestant', 'jewish', 'other', 'none']) assert.deepEqual(values(Q.genderOptions({ religion: r })), ['m', 'f', 'other'], r);
});

test('changing religion to Catholic, Muslim or LDS clears an "Other" gender, so the question is asked again', () => {
  const a = Q.sanitize({ religion: 'catholic', gender: 'other' });
  assert.equal(a.gender, undefined);
  assert.equal(Q.sanitize({ religion: 'none', gender: 'other' }).gender, 'other');
  assert.equal(Q.sanitize({ religion: 'lds', gender: 'f' }).gender, 'f');
});

test('state in life: priest only for Catholic or Orthodox men; religious for Catholic/Orthodox; clergy for other faiths', () => {
  assert.ok(values(Q.stateOptions({ religion: 'catholic', gender: 'm' })).includes('priest'));
  assert.ok(!values(Q.stateOptions({ religion: 'catholic', gender: 'f' })).includes('priest'));
  assert.ok(values(Q.stateOptions({ religion: 'catholic', gender: 'f' })).includes('religious'));
  assert.ok(values(Q.stateOptions({ religion: 'protestant', gender: 'm' })).includes('clergy'));
  assert.ok(!values(Q.stateOptions({ religion: 'protestant' })).includes('religious'));
  assert.ok(!values(Q.stateOptions({ religion: 'none' })).includes('clergy'));
  for (const r of ['catholic', 'protestant', 'none', 'muslim']) {
    assert.deepEqual(values(Q.stateOptions({ religion: r })).slice(0, 4), ['single', 'engaged', 'married', 'widowed']);
  }
  assert.equal(Q.sanitize({ religion: 'catholic', gender: 'f', state: 'priest' }).state, undefined);
});

test('follow-ups: married asks years and children; priest asks secular/religious and parochial; religious asks the order', () => {
  const steps = (a) => Q.visibleSteps('mission', a);
  assert.ok(steps({ state: 'married' }).includes('marriedDetails'));
  assert.ok(!steps({ state: 'single' }).includes('marriedDetails'));
  assert.ok(steps({ state: 'priest' }).includes('priestDetails'));
  assert.ok(!steps({ state: 'priest', priestType: 'secular' }).includes('order'));
  assert.ok(steps({ state: 'priest', priestType: 'religious' }).includes('order'));
  assert.ok(steps({ state: 'religious' }).includes('order'));
  const cleared = Q.sanitize({ state: 'single', marriedYears: '6-15', kids: 3, priestType: 'secular', order: 'Dominicans' });
  assert.equal(cleared.marriedYears, undefined);
  assert.equal(cleared.kids, undefined);
  assert.equal(cleared.priestType, undefined);
  assert.equal(cleared.order, undefined);
});

test('all three variants ask the same twelve things, in different orders, religion before gender and state', () => {
  const main = (v) => Q.FLOW[v].filter((id) => !['marriedDetails', 'priestDetails', 'order'].includes(id));
  const sets = ['mission', 'adventure', 'treasures'].map((v) => [...main(v)].sort().join());
  assert.equal(new Set(sets).size, 1);
  for (const v of ['mission', 'adventure', 'treasures']) {
    const f = Q.FLOW[v];
    assert.equal(main(v).length, 12, v);
    assert.equal(f.at(-1), 'email', v + ' ends with the email gate');
    assert.ok(f.indexOf('religion') < f.indexOf('gender') && f.indexOf('gender') < f.indexOf('state'), v);
    assert.ok(f.indexOf('state') < f.indexOf('marriedDetails'), v);
    assert.equal(Q.stepTotal(Q.visibleSteps(v, { state: 'married' })), 12, 'a follow-up does not change the promised count');
  }
  assert.notDeepEqual(Q.FLOW.mission, Q.FLOW.adventure);
  assert.notDeepEqual(Q.FLOW.adventure, Q.FLOW.treasures);
  for (const q of ['age', 'religion', 'gender', 'work', 'state', 'feel', 'faith', 'home', 'workFeel', 'workService', 'desire', 'email']) {
    assert.ok(Q.FLOW.mission.includes(q), q);
  }
});

test('every archetype the engine can name has words in every variant', () => {
  const keys = new Set();
  const answers = [{}, { state: 'priest' }, { state: 'religious' }, { desire: 'discover', work: 'creative' }, { religion: 'none', faith: 'none' },
    { feel: { god: 1, religion: 1, world: 1 } }, { work: 'business', workService: 5 }, { desire: 'learn' }, { kids: 4, state: 'married', home: 3 }];
  answers.forEach((a) => keys.add(E.profileFromAnswers(a).archetype));
  for (const v of Object.keys(Q.COPY)) {
    for (const k of ['peacemaker', 'contemplative', 'builder', 'leader', 'hearth', 'scholar', 'explorer', 'apostle', 'shepherd', 'consecrated', 'pilgrim']) {
      assert.ok(Q.COPY[v].archetypes[k] && Q.COPY[v].archetypes[k][0], `${v}.${k}`);
    }
    for (const k of keys) assert.ok(Q.COPY[v].archetypes[k], `${v}.${k}`);
  }
});

test('every step has a title in every variant', () => {
  for (const v of Object.keys(Q.COPY)) {
    for (const id of Q.FLOW[v]) {
      if (id === 'email') { assert.ok(Q.COPY[v].email.title); continue; }
      const c = Q.COPY[v].steps[id];
      assert.ok(c && c.title, `${v}.${id}`);
      if (Q.QUESTIONS[id].type === 'compound') for (const f of Q.QUESTIONS[id].fields) assert.ok(c.fields && c.fields[f.key], `${v}.${id}.${f.key}`);
    }
  }
});
