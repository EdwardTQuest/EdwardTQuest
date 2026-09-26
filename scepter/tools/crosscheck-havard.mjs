// Run Alexandre Havard's own scoring code (from his site's script) and twoStage in
// scepter-temperament.js side by side on random answer sheets, and report any difference.
//   node scepter/tools/crosscheck-havard.mjs                       # downloads his script
//   node scepter/tools/crosscheck-havard.mjs --bundle saved.js --trials 100000
// Only five small scoring functions are taken from his script (found by what they do, since the
// minified names change) and run here: tally, add, rank, the stage-2 score, and the profile
// decision. The order of the stages (tie-breakers, the fallback) is his page's, restated below;
// the importer's METHOD checks confirm his page still does it that way.
import { createRequire } from 'node:module';
import { loadBundle, extract } from './import-havard-test.mjs';

const require = createRequire(import.meta.url);
const TS = require('../theme/assets/scepter-temperament.js').twoStage;
const TYPES = ['COL', 'SAN', 'MEL', 'FLE'];

// The whole "function name(...){...}" that contains position `at`.
function functionAround(src, at) {
  const start = src.lastIndexOf('function ', at);
  const open = src.indexOf('{', start);
  for (let i = open, depth = 0; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return { name: /^function ([\w$]+)/.exec(src.slice(start))[1], src: src.slice(start, i + 1) };
  }
  throw new Error('unbalanced function');
}
function find(bundle, re, what) {
  const m = re.exec(bundle);
  if (!m) throw new Error(`Could not find his ${what} function; his code has changed.`);
  return functionAround(bundle, m.index + m[0].length - 1);
}
function capture(src, re, what) {
  const m = re.exec(src);
  if (!m) throw new Error(`Could not read the ${what} his code uses.`);
  return m[1];
}

export function hisScoring(bundle, set) {
  const tally = find(bundle, /==="SI"\?[\w$]+\[[\w$]+\]\+=1:[\w$]+==="NO"&&/, 'tally');
  const add = find(bundle, /function [\w$]+\(([\w$]+),([\w$]+)\)\{return\{COL:\1\.COL\+\2\.COL/, 'add');
  const rank = find(bundle, /Object\.entries\([\w$]+\)\.sort\([^)]*\)[^}]*tiedTypes/, 'rank');
  const s2 = find(bundle, /\.adj==="A"\?1:-1/, 'stage-2');
  const decide = find(bundle, />=2&&Math\.abs\(/, 'decision');
  const idMap = capture(tally.src, /=([\w$]+)\[[\w$]+\[[\w$]+\]\.id\]/, 'statement map');
  const opposite = capture(tally.src, /\[([\w$]+)\[[\w$]+\]\]\+=\.5/, 'opposites');
  const stage2 = capture(decide.src, /([\w$]+)\[[\w$]+\];if\([\w$]+>=2/, 'stage-2 map');
  const rankRef = capture(decide.src, /\{margin:[\w$]+\}=([\w$]+)\(/, 'ranking');
  if (rankRef !== rank.name) throw new Error(`His decision calls ${rankRef}, not the ranking found (${rank.name}).`);
  const types = {};
  TYPES.forEach((k) => { set.stage1[k].concat(set.tiebreak[k]).forEach((id) => { types[id] = k; }); });
  const body = [tally.src, add.src, rank.src, s2.src, decide.src].join('\n')
    + `\nreturn { tally: ${tally.name}, add: ${add.name}, rank: ${rank.name}, s2: ${s2.name}, decide: ${decide.name} };`;
  return new Function(idMap, opposite, stage2, body)(types, set.opposite, set.stage2);
}

// His page's order of play (component s0: C, H, oe, kt), with his scoring functions.
function hisRun(his, set, s1, ans) {
  const types = {};
  TYPES.forEach((k) => { set.stage1[k].forEach((id) => { types[id] = k; }); });
  const a1 = s1.map((it) => (ans[it.id] ? 'SI' : 'NO'));
  const first = his.tally(s1, a1);
  let scores = first, dominant = his.rank(first).top, tie = [];
  if (his.rank(first).tiedTypes.length >= 2) {
    tie = his.rank(first).tiedTypes.flatMap((k) => set.tiebreak[k].map((id) => ({ id, type: k })));
    scores = his.add(first, his.tally(tie, tie.map((it) => (ans[it.id] ? 'SI' : 'NO'))));
    const r = his.rank(scores);
    dominant = r.top;
    if (r.tiedTypes.length >= 2) {
      const trues = { COL: 0, SAN: 0, MEL: 0, FLE: 0 };
      s1.forEach((it, i) => { if (a1[i] === 'SI') trues[types[it.id]] += 1; });
      dominant = r.tiedTypes.reduce((best, k) => (trues[k] > trues[best] ? k : best), r.tiedTypes[0]);
    }
  }
  const items = set.stage2[dominant].items;
  const d = his.decide(dominant, scores, his.s2(items, items.map((it) => (ans[it.id] ? 'SI' : 'NO'))));
  return { key: d.key, pure: d.isPure, total: 16 + tie.length + 6, intensity: d.isPure ? null : Math.abs(d.score_s2) === 3 ? 'marked' : 'light' };
}

function ours(set, ans, rand) {
  const st = TS.start(set, rand);
  let total = 0;
  while (st.phase !== 'done') {
    if (st.phase === 'transition') { TS.proceed(st); continue; }
    total = TS.progress(set, st).total;
    TS.answer(set, st, !!ans[TS.current(st).id], rand);
  }
  return { key: st.result.key, pure: st.result.pure, total, intensity: st.result.intensity, s1: st.s1 };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
  const trials = Number(opt('trials', 100000));
  const { bundle, from } = await loadBundle({ file: opt('bundle') });
  const { data: set } = extract(bundle, 'en');
  const his = hisScoring(bundle, set);
  let seed = 20260926;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ids = Object.keys(set.items);
  const lengths = {}, profiles = {};
  let differences = 0;
  for (let n = 0; n < trials; n++) {
    const p = n % 4 === 0 ? 0.5 : rand(); // how readily this reader says TRUE
    const ans = Object.fromEntries(ids.map((id) => [id, rand() < p]));
    const mine = ours(set, ans, rand);
    const theirs = hisRun(his, set, mine.s1, ans);
    if (mine.key !== theirs.key || mine.pure !== theirs.pure || mine.total !== theirs.total || mine.intensity !== theirs.intensity) {
      if (differences++ < 5) console.log('DIFFERENT', JSON.stringify({ ours: { ...mine, s1: undefined }, his: theirs }));
    }
    lengths[theirs.total] = (lengths[theirs.total] || 0) + 1;
    profiles[theirs.key] = (profiles[theirs.key] || 0) + 1;
  }
  console.log(`${from}\n${trials} answer sheets, ${differences} differences.`);
  console.log('lengths:', Object.entries(lengths).map(([k, v]) => `${k}: ${(100 * v / trials).toFixed(1)}%`).join(', '));
  console.log('profiles:', Object.entries(profiles).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / trials).toFixed(1)}%`).join(', '));
  process.exit(differences ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
