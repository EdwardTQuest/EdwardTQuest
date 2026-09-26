// Import Alexandre Havard's Temperament Test from virtuousleadership.com into the data file the
// temperament pop-up reads (theme/assets/scepter-temperament-havard.js).
//
//   node scepter/tools/import-havard-test.mjs                    # English, to scepter/private/
//   node scepter/tools/import-havard-test.mjs --lang es          # es, en, fr or ru
//   node scepter/tools/import-havard-test.mjs --out path/to/scepter-temperament-havard.js
//   node scepter/tools/import-havard-test.mjs --bundle index-XXXX.js   # a saved copy of the site's script
//
// The questions and result words belong to Alexandre Havard's Virtuous Leadership (HVLI). Put them
// on scepterpublishers.org only with their permission, and never commit the output to a public
// repository. scepter/private/ is git-ignored for that reason.
//
// His test page is a single-page app, and its words and its method are in one minified script. This
// tool reads four things from it:
//   - the translation for the chosen language: the test's own words, the 46 statements and the 12 profiles;
//   - the four structures behind the method: the stage-1 statements per temperament, the tie-breakers,
//     the stage-2 statements with the two neighbouring temperaments they point to, and the opposites.
// Then it checks that the scoring code still matches the method in scepter-temperament.js (twoStage).
// If it doesn't, it writes nothing and names what changed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = ['COL', 'SAN', 'MEL', 'FLE'];
const SITE = 'https://virtuousleadership.com';
const PAGES = { en: '/en/tests/temperament', es: '/es/tests/temperamento', fr: '/fr/tests/temperament', ru: '/ru/testy/temperament' };
const CREDIT = {
  en: 'Alexandre Havard’s Temperament Test, from Virtuous Leadership (virtuousleadership.com).',
  es: 'El test de temperamento de Alexandre Havard, de Virtuous Leadership (virtuousleadership.com).',
  fr: 'Le test de tempérament d’Alexandre Havard, de Virtuous Leadership (virtuousleadership.com).',
  ru: 'Тест на темперамент Александра Авара, Virtuous Leadership (virtuousleadership.com).'
};

// What the method in scepter-temperament.js assumes about his code, as seen on 2026-09-26.
// Minified names change with every release of his site, so each pattern matches any names.
const N = '[\\w$]+';
export const METHOD = [
  ['a TRUE adds 1 to its temperament, a FALSE adds 0.5 to the opposite one',
    new RegExp(`==="SI"\\?${N}\\[${N}\\]\\+=1:${N}==="NO"&&\\(${N}\\[${N}\\[${N}\\]\\]\\+=\\.5\\)`)],
  ['ties are ranked choleric, sanguine, melancholic, phlegmatic', /\{COL:0,SAN:0,MEL:0,FLE:0\}/],
  ['a tie for first place after stage 1 brings in the tied temperaments’ tie-breakers',
    new RegExp(`\\.length>=2\\)\\{const ${N}=${N}\\.flatMap\\(`)],
  ['a tie that remains goes to the temperament with more TRUE answers in stage 1',
    new RegExp(`==="SI"&&\\(${N}\\[${N}\\[${N}\\[${N}\\]\\.id\\]\\]\\+=1\\)`)],
  ['…and among equals, to the first in that order',
    /\.reduce\(\(([\w$]+),([\w$]+)\)=>[\w$]+\[\2\]>[\w$]+\[\1\]\?\2:\1,[\w$]+\[0\]\)/],
  ['in stage 2 each TRUE counts +1 toward one neighbour and −1 toward the other',
    new RegExp(`==="SI"&&\\(${N}\\+=${N}\\[${N}\\]\\.adj==="A"\\?1:-1\\)`)],
  ['a profile is pure when stage 1 leads by 2 or more and stage 2 stays within ±1', />=2&&Math\.abs\([\w$]+\)<=1/],
  ['a stage-2 draw goes to the neighbour with more points',
    new RegExp(`\\?${N}=${N}\\.A:${N}<0\\?${N}=${N}\\.B:${N}=${N}\\[${N}\\.A\\]>=${N}\\[${N}\\.B\\]\\?${N}\\.A:${N}\\.B`)],
  ['the length is 16 + the tie-breakers asked + 6', new RegExp(`16\\+${N}\\.length\\+6`)],
  ['the secondary is “marked” when stage 2 scores 3', /===3\?"result\.intensity_marked"/]
];

/**
 * Reads one JavaScript value (object, array, string, number, boolean) starting at src[start].
 * Anything else inside an object, such as a function, is skipped and kept as { $code }.
 * Returns { value, end }.
 */
export function parseLiteral(src, start) {
  let i = start;
  const fail = (msg) => { throw new Error(`${msg} at ${i}: ${JSON.stringify(src.slice(i, i + 40))}`); };
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  function str() {
    const q = src[i++];
    let out = '';
    while (i < src.length) {
      const c = src[i++];
      if (c === q) return out;
      if (q === '`' && c === '$' && src[i] === '{') fail('template expression');
      if (c !== '\\') { out += c; continue; }
      const e = src[i++];
      if (e === 'n') out += '\n';
      else if (e === 't') out += '\t';
      else if (e === 'r') out += '\r';
      else if (e === 'b') out += '\b';
      else if (e === 'f') out += '\f';
      else if (e === 'v') out += '\v';
      else if (e === '0' && !/[0-9]/.test(src[i])) out += '\0';
      else if (e === 'x') { out += String.fromCharCode(parseInt(src.substr(i, 2), 16)); i += 2; }
      else if (e === 'u' && src[i] === '{') { const j = src.indexOf('}', i); out += String.fromCodePoint(parseInt(src.slice(i + 1, j), 16)); i = j + 1; }
      else if (e === 'u') { out += String.fromCharCode(parseInt(src.substr(i, 4), 16)); i += 4; }
      else if (e === '\r') { if (src[i] === '\n') i++; } // line continuation
      else if (e === '\n' || e === ' ' || e === ' ') { /* line continuation */ }
      else out += e;
    }
    fail('unterminated string');
  }
  // Skip an expression we don't read (a function, a call): up to the next , } or ] at this depth.
  function skip() {
    const from = i;
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '"' || c === "'" || c === '`') { str(); continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
      else if (c === ',' && depth === 0) break;
      i++;
    }
    return { $code: src.slice(from, i) };
  }
  function value() {
    ws();
    const c = src[i];
    if (c === '{') {
      i++;
      const obj = {};
      for (;;) {
        ws();
        if (src[i] === '}') { i++; return obj; }
        let key;
        if (src[i] === '"' || src[i] === "'") key = str();
        else {
          const m = /^(?:[A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/.exec(src.slice(i, i + 200));
          if (!m) fail('expected a key');
          key = m[0]; i += key.length;
        }
        ws();
        if (src[i] === ',' || src[i] === '}') obj[key] = { $ref: key }; // shorthand {name}
        else if (src[i] === '(') obj[key] = skip(); // a method
        else { if (src[i] !== ':') fail('expected :'); i++; obj[key] = value(); }
        ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === '}') { i++; return obj; }
        fail('expected , or }');
      }
    }
    if (c === '[') {
      i++;
      const arr = [];
      for (;;) {
        ws();
        if (src[i] === ']') { i++; return arr; }
        arr.push(value());
        ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ']') { i++; return arr; }
        fail('expected , or ]');
      }
    }
    if (c === '"' || c === "'") return str();
    if (c === '`') { const at = i; try { return str(); } catch (e) { i = at; return skip(); } }
    if (src.startsWith('!0', i)) { i += 2; return true; }
    if (src.startsWith('!1', i)) { i += 2; return false; }
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i, i + 40));
    if (num) { i += num[0].length; return Number(num[0]); }
    const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 200));
    if (id) {
      const at = i;
      i += id[0].length;
      if (id[0] === 'true') return true;
      if (id[0] === 'false') return false;
      if (id[0] === 'null') return null;
      ws();
      if (src[i] === ',' || src[i] === '}' || src[i] === ']') return { $ref: id[0] }; // another variable
      i = at;
      return skip();
    }
    return skip();
  }
  const v = value();
  return { value: v, end: i };
}

// Every "{es:a,en:b,…}" map of language codes to variable names, then each variable's "name={…}".
export function findTranslation(bundle, lang) {
  for (const m of bundle.matchAll(/\{((?:[a-z]{2}:[\w$]+,)+[a-z]{2}:[\w$]+)\}/g)) {
    const names = Object.fromEntries(m[1].split(',').map((pair) => pair.split(':')));
    const name = names[lang];
    if (!name) continue;
    const def = new RegExp(`(?:^|[^\\w$.])${name.replace(/\$/g, '\\$')}=\\{`, 'g');
    for (const d of bundle.matchAll(def)) {
      try {
        const { value } = parseLiteral(bundle, d.index + d[0].length - 1);
        if (value && value.test && value.test.items && value.result && value.result.profiles) return value;
      } catch (e) { /* not this one */ }
    }
  }
  return null;
}

function findStructure(bundle, pattern, fits) {
  for (const m of bundle.matchAll(pattern)) {
    try {
      const { value } = parseLiteral(bundle, m.index);
      if (fits(value)) return value;
    } catch (e) { /* keep looking */ }
  }
  return null;
}

/** Reads the test from the site's script. Throws with a plain explanation when something is missing. */
export function extract(bundle, lang = 'en') {
  const tr = findTranslation(bundle, lang);
  if (!tr) throw new Error(`No "${lang}" translation with test.items and result.profiles was found in the script.`);
  const t = tr.test, r = tr.result, items = t.items;
  const has = (id) => typeof items[id] === 'string' && items[id].trim() !== '';
  const isType = (k) => TYPES.includes(k);
  const stage1 = findStructure(bundle, /\{COL:\["COL1"/g, (v) => TYPES.every((k) => Array.isArray(v[k]) && v[k].length && v[k].every(has)));
  const tiebreak = findStructure(bundle, /\{COL:\["TCOL1"/g, (v) => TYPES.every((k) => Array.isArray(v[k]) && v[k].length && v[k].every(has)));
  const stage2 = findStructure(bundle, /\{COL:\{A:"/g, (v) => TYPES.every((k) => v[k] && isType(v[k].A) && isType(v[k].B) && Array.isArray(v[k].items)
    && v[k].items.length && v[k].items.every((x) => has(x.id) && (x.adj === 'A' || x.adj === 'B'))));
  const opposite = findStructure(bundle, /\{(?:COL|SAN|MEL|FLE):"(?:COL|SAN|MEL|FLE)",/g, (v) => TYPES.every((k) => isType(v[k]) && v[k] !== k));
  const missing = Object.entries({ stage1, tiebreak, stage2, opposite }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`The test's structure has changed: could not find ${missing.join(', ')}.`);

  const changed = METHOD.filter(([, re]) => !re.test(bundle)).map(([what]) => what);
  const profiles = {};
  const keys = [];
  TYPES.forEach((k) => { keys.push(k, `${k}-${stage2[k].A}`, `${k}-${stage2[k].B}`); });
  keys.forEach((k) => {
    const p = r.profiles[k];
    if (!p || !p.name) throw new Error(`The ${lang} translation has no profile ${k}.`);
    profiles[k] = { name: p.name, label: p.label || '', challenge: p.challenge || '', strength: p.fortaleza || '', weakness: p.debilidad || '', text: p.reto || '' };
  });
  const w = t.welcome || {}, q = t.question || {}, tr2 = t.transition || {};
  const strings = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => typeof v === 'string'));
  const perType = (o) => Object.fromEntries(TYPES.map((k) => [k, strings(o && o[k])]));
  return {
    changed,
    data: {
      format: 'havard',
      lang,
      credit: CREDIT[lang] || CREDIT.en,
      creditUrl: SITE + (PAGES[lang] || PAGES.en),
      copy: {
        eyebrow: w.eyebrow || '', byline: w.byline || '', intro: w.intro || '', notice: w.notice || '',
        duration: [w.duration_label, w.duration_text].filter(Boolean).join(' · '), begin: w.button || '',
        progress: q.progress || '', yes: q.yes || '', no: q.no || '', back: q.back || '',
        stage2Kicker: tr2.eyebrow || '', stage2Title: tr2.title_template || '', stage2TitleEnd: tr2.title_template_suffix || '',
        stage2Text: tr2.text || '', continue: tr2.button || '',
        profile: r.subtitle || '', pure: r.pure_note || '', challenge: r.challenge_label || '',
        intensity: r.intensity_label || '', marked: r.intensity_marked || '', light: r.intensity_light || '',
        strength: r.fortaleza || '', weakness: r.debilidad || '', yourChallenge: r.reto || '',
        quote: r.havard_quote || '', quoteBy: r.havard_attribution || '', virtues: r.virtues_panel_title || ''
      },
      temperaments: perType(tr.temperaments),
      virtues: perType(r.virtues),
      items: Object.fromEntries(Object.entries(items).filter(([, v]) => typeof v === 'string')),
      stage1, tiebreak, stage2, opposite, profiles
    }
  };
}

export function moduleText(data, meta) {
  return `/*!
 * Alexandre Havard's Temperament Test: the statements and result words the Scepter temperament
 * pop-up asks and shows. © Alexandre Havard / Virtuous Leadership (HVLI), virtuousleadership.com.
 *
 * Imported on ${meta.date} from ${meta.from}
 * by scepter/tools/import-havard-test.mjs (${data.lang}; ${Object.keys(data.items).length} statements, ${Object.keys(data.profiles).length} profiles).
 * Use it on scepterpublishers.org only with HVLI's permission. Do not commit it to a public repository.
 * Upload it to the theme's assets in place of the placeholder with the same name.
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) { module.exports = data; return; }
  var sets = root.ScepterTemperamentSets = root.ScepterTemperamentSets || {};
  sets.havard = data;
})(typeof self !== 'undefined' ? self : this, ${JSON.stringify(data, null, 1)});
`;
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'scepter-quiz-kit (import-havard-test)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** His site's main script: from a saved copy (file), else downloaded. Returns { bundle, from }. */
export async function loadBundle({ file, lang = 'en' } = {}) {
  if (file) return { bundle: readFileSync(file, 'utf8'), from: file };
  const page = SITE + (PAGES[lang] || PAGES.en);
  const html = await download(page);
  const src = (html.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/) || [])[1];
  if (!src) throw new Error(`No /assets/index-….js script on ${page}. The site has changed; save its main script and pass --bundle.`);
  const from = new URL(src, page).href;
  return { bundle: await download(from), from };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
  const lang = opt('lang', 'en');
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(opt('out', resolve(here, '../private/scepter-temperament-havard.js')));
  const { bundle, from } = await loadBundle({ file: opt('bundle'), lang });
  const { data, changed } = extract(bundle, lang);
  if (changed.length && !args.includes('--force')) {
    console.error('Havard’s scoring code no longer matches the method in scepter-temperament.js. Not written. What changed:');
    changed.forEach((c) => console.error('  - ' + c));
    console.error('Update twoStage in scepter-temperament.js and METHOD here, or pass --force to write anyway.');
    process.exit(2);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, moduleText(data, { date: new Date().toISOString().slice(0, 10), from }));
  const counts = ['stage1', 'tiebreak'].map((k) => `${k} ${TYPES.map((t) => data[k][t].length).join('/')}`).join(', ');
  console.log(`Wrote ${out}\n  ${Object.keys(data.items).length} statements (${counts}, stage2 ${TYPES.map((t) => data.stage2[t].items.length).join('/')}), ${Object.keys(data.profiles).length} profiles, method ${changed.length ? 'CHANGED (forced)' : 'verified'}.`);
  console.log('Upload it to the theme as assets/scepter-temperament-havard.js. Keep it out of public repositories.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
