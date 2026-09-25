// Rebuild the temperament section's preset (its question blocks) from a question bank.
//   node scepter/tools/build-temperament-section.mjs              # from the stand-in bank in scepter-temperament.js
//   node scepter/tools/build-temperament-section.mjs questions.csv
// CSV columns (header row required): prompt,answer_1,score_1,answer_2,score_2,answer_3,score_3,answer_4,score_4,weight
// Scores: choleric, melancholic, sanguine, phlegmatic, none (or C, M, S, P).
// A preset only fills a section when it is first added; to replace questions in a section that is
// already on the site, edit its blocks in the theme editor (or remove and re-add the section).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../theme/assets/scepter-temperament.js');
const FILE = new URL('../theme/sections/scepter-temperament-popup.liquid', import.meta.url);
const NAME = { c: 'choleric', m: 'melancholic', s: 'sanguine', p: 'phlegmatic', choleric: 'choleric', melancholic: 'melancholic', sanguine: 'sanguine', phlegmatic: 'phlegmatic' };

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), (r[i] || '').trim()])));
}

function score(v) {
  const k = String(v || '').trim().toLowerCase();
  return NAME[k] || NAME[k.charAt(0)] && k.length === 1 && NAME[k.charAt(0)] || 'none';
}

let questions;
const src = process.argv[2];
if (src) {
  questions = parseCsv(readFileSync(src, 'utf8')).map((r) => ({
    prompt: r.prompt, weight: Number(r.weight) || 1,
    answers: [1, 2, 3, 4].map((n) => ({ text: r['answer_' + n] || '', score: score(r['score_' + n]) }))
  }));
} else {
  questions = T.normaliseQuestions(null).map((q) => ({
    prompt: q.prompt, weight: q.weight,
    answers: q.answers.map((a) => ({ text: a.text, score: Object.keys(a.score)[0] || 'none' }))
  }));
}
if (questions.length > 46) throw new Error(`${questions.length} questions: a section holds at most 50 blocks (46 questions + 4 result texts).`);

const blocks = questions.map((q) => {
  const settings = { prompt: q.prompt, weight: q.weight };
  q.answers.slice(0, 4).forEach((a, i) => { settings['answer_' + (i + 1)] = a.text; settings['score_' + (i + 1)] = a.score; });
  return { type: 'question', settings };
});
for (const k of T.KEYS) blocks.push({ type: 'result', settings: { temperament: k } });

const liquid = readFileSync(FILE, 'utf8');
const m = liquid.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/);
const schema = JSON.parse(m[1]);
schema.presets = [{ name: 'Scepter: temperament test', category: 'Scepter', blocks }];
const out = liquid.replace(m[0], '{% schema %}\n' + JSON.stringify(schema, null, 2) + '\n{% endschema %}');
writeFileSync(FILE, out);
console.log(`preset rebuilt: ${questions.length} questions + ${T.KEYS.length} result blocks${src ? ' from ' + src : ' (stand-in bank)'}`);
