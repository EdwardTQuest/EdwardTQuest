// Alexandre Havard's two-stage method (twoStage in scepter-temperament.js) and the importer that
// reads his test from virtuousleadership.com. The set here is synthetic: same structure, made-up
// words, because his text is not kept in this public repository. If scepter/private/ holds an
// imported copy, the last test checks it too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { parseLiteral, extract, findTranslation, METHOD } from '../tools/import-havard-test.mjs';

const require = createRequire(import.meta.url);
const T = require('../theme/assets/scepter-temperament.js');
const TS = T.twoStage;
const TYPES = ['COL', 'SAN', 'MEL', 'FLE'];
const PAIRS = { COL: ['SAN', 'MEL'], SAN: ['COL', 'FLE'], MEL: ['COL', 'FLE'], FLE: ['SAN', 'MEL'] };

function syntheticSet() {
  const items = {}, stage1 = {}, tiebreak = {}, stage2 = {}, profiles = {};
  TYPES.forEach((k) => {
    stage1[k] = [1, 2, 3, 4].map((n) => { items[`${k}${n}`] = `${k} statement ${n}`; return `${k}${n}`; });
    tiebreak[k] = [1, 2].map((n) => { items[`T${k}${n}`] = `${k} tie-breaker ${n}`; return `T${k}${n}`; });
    const [A, B] = PAIRS[k];
    stage2[k] = { A, B, items: [1, 2, 3, 4, 5, 6].map((n) => { const id = `S2_${k[0]}${n}`; items[id] = `${k} nuance ${n}`; return { id, adj: n <= 3 ? 'A' : 'B' }; }) };
    [k, `${k}-${A}`, `${k}-${B}`].forEach((key) => { profiles[key] = { name: `PROFILE ${key}`, label: key.toLowerCase(), challenge: `challenge ${key}`, strength: 's', weakness: 'w', text: 't' }; });
  });
  return { format: 'havard', items, stage1, tiebreak, stage2, opposite: { COL: 'FLE', FLE: 'COL', SAN: 'MEL', MEL: 'SAN' }, profiles,
    temperaments: { COL: { name: 'Choleric' }, SAN: { name: 'Sanguine' }, MEL: { name: 'Melancholic' }, FLE: { name: 'Phlegmatic' } },
    virtues: {}, copy: {}, credit: 'credit', creditUrl: 'https://example.com' };
}
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const typeOf = (id) => id.replace(/^T/, '').replace(/\d+$/, '');

// Answers every statement of the current stage with fn(item) until the stage changes.
function answerStage(set, st, fn) {
  const phase = st.phase;
  while (st.phase === phase) TS.answer(set, st, fn(TS.current(st)), seeded(7));
  return st;
}

test('the synthetic set is valid, and a broken one is caught', () => {
  const set = syntheticSet();
  assert.deepEqual(TS.validateSet(set), []);
  delete set.profiles['MEL-FLE'];
  delete set.items.SAN3;
  const problems = TS.validateSet(set);
  assert.ok(problems.some((p) => /MEL-FLE/.test(p)), problems.join('; '));
  assert.ok(problems.some((p) => /SAN3/.test(p)), problems.join('; '));
  assert.ok(TS.validateSet(null).length);
});

test('stage 1: four rounds of one statement per temperament, never the same one twice in a row', () => {
  const set = syntheticSet();
  for (let seed = 1; seed <= 300; seed++) {
    const order = TS.stage1Order(set, seeded(seed));
    assert.equal(order.length, 16);
    assert.equal(new Set(order.map((x) => x.id)).size, 16);
    for (let r = 0; r < 4; r++) assert.deepEqual(order.slice(r * 4, r * 4 + 4).map((x) => x.type).sort(), [...TYPES].sort());
    for (let i = 1; i < 16; i++) assert.notEqual(order[i].type, order[i - 1].type, `seed ${seed} at ${i}`);
    order.forEach((x) => assert.equal(typeOf(x.id), x.type));
  }
});

test('TRUE gives its temperament 1 point, FALSE gives the opposite one half a point', () => {
  const set = syntheticSet();
  const items = [{ id: 'COL1', type: 'COL' }, { id: 'SAN1', type: 'SAN' }, { id: 'MEL1', type: 'MEL' }, { id: 'FLE1', type: 'FLE' }];
  assert.deepEqual(TS.tally(set, items, [true, false, undefined, false]), { COL: 1.5, SAN: 0, MEL: 0.5, FLE: 0 });
});

test('ranking keeps his order among equals: choleric, sanguine, melancholic, phlegmatic', () => {
  const r = TS.rank({ COL: 1, SAN: 3, MEL: 3, FLE: 3 });
  assert.equal(r.top, 'SAN');
  assert.deepEqual(r.tied, ['SAN', 'MEL', 'FLE']);
  assert.equal(r.margin, 0);
  assert.equal(TS.rank({ COL: 5, SAN: 3, MEL: 1, FLE: 0 }).margin, 2);
});

test('a clear choleric: 22 statements, and the profile follows stage 2', () => {
  const set = syntheticSet();
  const st = TS.start(set, seeded(3));
  assert.deepEqual(TS.progress(set, st), { n: 1, total: 22 });
  answerStage(set, st, (it) => it.type === 'COL'); // COL 4 + 2 (FALSE on phlegmatic), SAN 2, MEL 2, FLE 0
  assert.equal(st.phase, 'transition');
  assert.equal(st.dominant, 'COL');
  assert.deepEqual(st.scores, { COL: 6, SAN: 2, MEL: 2, FLE: 0 });
  assert.equal(TS.current(st), null);
  TS.proceed(st);
  assert.equal(st.phase, 'stage2');
  assert.deepEqual(TS.progress(set, st), { n: 17, total: 22 });
  assert.ok(st.s2.every((x) => x.id.startsWith('S2_C')));
  answerStage(set, st, (it) => it.adj === 'A'); // +3: toward sanguine, marked
  assert.equal(st.phase, 'done');
  assert.deepEqual(
    { key: st.result.key, pure: st.result.pure, secondary: st.result.secondary, intensity: st.result.intensity, s2: st.result.s2 },
    { key: 'COL-SAN', pure: false, secondary: 'SAN', intensity: 'marked', s2: 3 });
});

test('pure only with a lead of 2 or more and stage 2 within ±1; the rest by stage 2', () => {
  const set = syntheticSet();
  const s = { COL: 6, SAN: 2, MEL: 3, FLE: 0 };
  assert.deepEqual([TS.decide(set, 'COL', s, 1).key, TS.decide(set, 'COL', s, 1).pure], ['COL', true]);
  assert.deepEqual([TS.decide(set, 'COL', s, -1).key, TS.decide(set, 'COL', s, 0).key], ['COL', 'COL']);
  assert.deepEqual([TS.decide(set, 'COL', s, 2).key, TS.decide(set, 'COL', s, 2).intensity], ['COL-SAN', 'light']);
  assert.deepEqual([TS.decide(set, 'COL', s, -3).key, TS.decide(set, 'COL', s, -3).intensity], ['COL-MEL', 'marked']);
  // A lead of 1 is never pure: a draw in stage 2 goes to the neighbour with more points…
  const close = { COL: 4, SAN: 3, MEL: 3.5, FLE: 0 };
  assert.equal(TS.decide(set, 'COL', close, 0).key, 'COL-MEL');
  // …and to A when they are level.
  assert.equal(TS.decide(set, 'COL', { COL: 4, SAN: 3, MEL: 3, FLE: 0 }, 0).key, 'COL-SAN');
});

test('a tie after stage 1 brings in the tie-breakers of the tied temperaments only', () => {
  const set = syntheticSet();
  const st = TS.start(set, seeded(11));
  // TRUE for choleric and sanguine, FALSE for the others:
  // COL 4 + 2 (FALSE on phlegmatic) = 6, SAN 4 + 2 (FALSE on melancholic) = 6: a tie.
  answerStage(set, st, (it) => it.type === 'COL' || it.type === 'SAN');
  assert.equal(st.phase, 'tie');
  assert.deepEqual(st.tie.map((x) => x.type).sort(), ['COL', 'COL', 'SAN', 'SAN']);
  assert.deepEqual(TS.progress(set, st), { n: 17, total: 26 });
  answerStage(set, st, (it) => it.type === 'SAN'); // SAN 6 + 2; FALSE on choleric's gives phlegmatic 1
  assert.equal(st.phase, 'transition');
  assert.equal(st.dominant, 'SAN');
});

test('a tie that remains goes to more TRUE answers in stage 1, then to his order', () => {
  const set = syntheticSet();
  const s1 = TYPES.flatMap((k) => set.stage1[k].map((id) => ({ id, type: k })));
  // Choleric TRUE three times (COL4 FALSE gives phlegmatic 0.5), sanguine TRUE four times, the rest FALSE:
  // COL 3 + 2 (FALSE on phlegmatic) = 5, SAN 4 + 2 (FALSE on melancholic) = 6. Not tied: sanguine.
  const a1 = s1.map((it) => (it.type === 'COL' ? it.id !== 'COL4' : it.type === 'SAN'));
  assert.equal(TS.settle(set, s1, a1, [], []).dominant, 'SAN');
  // Tie-breakers that bring them level: TCOL1 TRUE (COL 6), the rest FALSE (points to the opposites).
  const tie = [{ id: 'TCOL1', type: 'COL' }, { id: 'TCOL2', type: 'COL' }, { id: 'TSAN1', type: 'SAN' }, { id: 'TSAN2', type: 'SAN' }];
  const level = TS.settle(set, s1, a1, tie, [true, false, false, false]);
  assert.equal(level.scores.COL, level.scores.SAN);
  assert.equal(level.dominant, 'SAN', 'sanguine had 4 TRUE in stage 1, choleric 3');
  // Same TRUE count: the first in his order (choleric before sanguine).
  const even = s1.map((it) => it.type === 'COL' || it.type === 'SAN');
  const both = TS.settle(set, s1, even, tie, [false, false, false, false]); // COL 6, SAN 6
  assert.equal(both.scores.COL, both.scores.SAN);
  assert.equal(both.dominant, 'COL');
});

test('a four-way tie asks all eight tie-breakers: 30 statements', () => {
  const set = syntheticSet();
  const st = TS.start(set, seeded(5));
  answerStage(set, st, () => true); // every temperament 4 points
  assert.equal(st.phase, 'tie');
  assert.equal(st.tie.length, 8);
  assert.deepEqual(TS.progress(set, st), { n: 17, total: 30 });
});

test('back moves within a stage only, and keeps the answer given', () => {
  const set = syntheticSet();
  const st = TS.start(set, seeded(9));
  assert.equal(TS.canBack(st), false);
  TS.answer(set, st, true);
  TS.answer(set, st, false);
  assert.equal(st.index, 2);
  TS.back(st);
  assert.equal(TS.given(st), false);
  TS.answer(set, st, true); // changed
  assert.equal(st.a1[1], true);
  answerStage(set, st, (it) => it.type === 'MEL');
  TS.proceed(st);
  assert.equal(st.phase, 'stage2');
  assert.equal(TS.canBack(st), false, 'no way back from stage 2 to stage 1');
});

test('importer: reads minified object literals', () => {
  const src = 'x={a:"q\\"uote",b:\'it\\u2019s\',c:[1,!0,!1,null],"d-e":{f:`tick`},g:h,i(){return 1},j:k.l(2)};';
  const { value } = parseLiteral(src, 2);
  assert.equal(value.a, 'q"uote');
  assert.equal(value.b, 'it’s');
  assert.deepEqual(value.c, [1, true, false, null]);
  assert.equal(value['d-e'].f, 'tick');
  assert.deepEqual(value.g, { $ref: 'h' });
  assert.ok(value.i.$code !== undefined && value.j.$code !== undefined);
});

// A bundle shaped like his site's script: translations by language, the structures, the method.
function syntheticBundle(set) {
  const js = (v) => JSON.stringify(v).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:');
  const profiles = Object.fromEntries(Object.entries(set.profiles).map(([k, p]) => [k, { name: p.name, label: p.label, challenge: p.challenge, fortaleza: p.strength, debilidad: p.weakness, reto: p.text }]));
  const tr = (word) => js({
    nav: { home: word },
    test: { welcome: { eyebrow: 'Test', byline: 'By', intro: 'Intro', notice: 'Notice', duration_label: '22 to 30', duration_text: '5 min', button: 'Begin' },
      question: { progress: 'Q {n}/{total}', yes: 'TRUE', no: 'FALSE', back: 'Back' },
      transition: { eyebrow: 'Stage 2', title_template: 'You are ', title_template_suffix: '.', text: 'More', button: 'Go' },
      items: set.items },
    result: { subtitle: 'Profile', pure_note: 'pure', challenge_label: 'Challenge', intensity_label: 'Intensity', intensity_marked: 'marked', intensity_light: 'light',
      fortaleza: 'Strength', debilidad: 'Weakness', reto: 'Challenge', havard_quote: 'Quote', havard_attribution: 'AH', virtues_panel_title: 'Virtues',
      virtues: { COL: { name: 'V1', detail: 'd' }, MEL: { name: 'V2', detail: 'd' }, SAN: { name: 'V3', detail: 'd' }, FLE: { name: 'V4', detail: 'd' } }, profiles },
    temperaments: { COL: { name: 'Choleric', focus: 'f', archetype: 'a' }, SAN: { name: 'Sanguine' }, MEL: { name: 'Melancholic' }, FLE: { name: 'Phlegmatic' } }
  });
  const code = 'function Vs(e,t){const n={COL:0,SAN:0,MEL:0,FLE:0};for(let a=0;a<e.length;a++){const r=t[a];if(!r)continue;const o=_f[e[a].id];r==="SI"?n[o]+=1:r==="NO"&&(n[Yx[o]]+=.5)}return n}'
    + 'function Xx(e,t){let n=0;for(let a=0;a<e.length;a++)t[a]==="SI"&&(n+=e[a].adj==="A"?1:-1);return n}'
    + 'function Zx(e,t,n){const{margin:a}=ni(t),r=xf[e];if(a>=2&&Math.abs(n)<=1)return{key:e};let o;return n>0?o=r.A:n<0?o=r.B:o=t[r.A]>=t[r.B]?r.A:r.B,{key:`${e}-${o}`}}'
    + 'function C(){if(ye.length>=2){const ve=ye.flatMap(ot=>bf[ot])}}'
    + 'function H(){for(let te=0;te<o.length;te++)l[te]==="SI"&&(Ue[_f[o[te].id]]+=1);Je=ot.reduce((te,Cn)=>Ue[Cn]>Ue[te]?Cn:te,ot[0])}'
    + 'const A=16+v.length+6;r(n===3?"result.intensity_marked":"result.intensity_light");';
  return `const Sx=${tr('Home')},Ex=${tr('Дом')};const zz={es:Ex,en:Sx};`
    + `vf=${js(set.stage1)},bf=${js(set.tiebreak)},xf=${js(set.stage2)},Yx=${js(set.opposite)};${code}`;
}

test('importer: extracts the test from a bundle shaped like his, and checks the method', () => {
  const set = syntheticSet();
  const bundle = syntheticBundle(set);
  assert.ok(findTranslation(bundle, 'en'));
  const { data, changed } = extract(bundle, 'en');
  assert.deepEqual(changed, [], 'every method check matches');
  assert.deepEqual(TS.validateSet(data), []);
  assert.equal(Object.keys(data.items).length, 48);
  assert.deepEqual(data.stage2.MEL.A, 'COL');
  assert.equal(data.profiles['FLE-SAN'].name, 'PROFILE FLE-SAN');
  assert.equal(data.copy.duration, '22 to 30 · 5 min');
  // A change in his scoring code is reported, not silently imported.
  const edited = bundle.replace('+=.5', '+=1');
  assert.ok(extract(edited, 'en').changed.some((c) => /FALSE/.test(c)));
  assert.equal(METHOD.length, 10);
});

const PRIVATE = new URL('../private/scepter-temperament-havard.js', import.meta.url);
test('the imported Havard file, if present, is complete and runs', { skip: !existsSync(PRIVATE) && 'no private import here' }, () => {
  const set = require(PRIVATE.pathname);
  assert.deepEqual(TS.validateSet(set), []);
  assert.equal(Object.keys(set.items).length, 48);
  const st = TS.start(set, seeded(1));
  let guard = 0;
  while (st.phase !== 'done' && guard++ < 40) { if (st.phase === 'transition') TS.proceed(st); else TS.answer(set, st, guard % 3 !== 0, seeded(guard)); }
  assert.equal(st.phase, 'done');
  assert.ok(set.profiles[st.result.key].name);
});
