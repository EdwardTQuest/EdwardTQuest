// Fill the "Formation book" library from a spreadsheet (CSV), creating or updating one entry per row.
//   SHOP=… TOKEN=… node scepter/setup/import-formation-books.mjs scepter/setup/formation-books.csv [--dry-run]
// Columns: handle,label,themes,good_for,depth,seasons,start_when,why,boost,exclude
// Lists are separated by semicolons. Values must match the choices in the definition (a typo is
// reported, not sent). Rows whose product handle is not in the store are skipped and listed.
import { readFileSync } from 'node:fs';
import { admin, CHOICES } from './shopify-admin.mjs';

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
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}
const list = (v) => v.split(/[;|]/).map((x) => x.trim()).filter(Boolean);

const file = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!file) { console.error('Usage: node import-formation-books.mjs file.csv [--dry-run]'); process.exit(2); }
const rows = parseCsv(readFileSync(file, 'utf8'));
let problems = 0;
const entries = rows.map((r, i) => {
  const fields = [];
  for (const key of ['themes', 'good_for', 'seasons', 'start_when']) {
    const vals = list(r[key] || '');
    const bad = vals.filter((v) => !CHOICES[key].includes(v));
    if (bad.length) { problems++; console.error(`row ${i + 2} (${r.handle}): unknown ${key}: ${bad.join(', ')}. Choices: ${CHOICES[key].join(' | ')}`); }
    if (vals.length) fields.push({ key, value: JSON.stringify(vals.filter((v) => CHOICES[key].includes(v))) });
  }
  if (r.depth) { if (CHOICES.depth.includes(r.depth)) fields.push({ key: 'depth', value: r.depth }); else { problems++; console.error(`row ${i + 2}: depth must be Gentle, Steady or Deep`); } }
  if (r.label) fields.push({ key: 'label', value: r.label });
  if (r.why) fields.push({ key: 'why', value: r.why });
  if (r.boost) fields.push({ key: 'boost', value: String(Math.max(-3, Math.min(3, parseInt(r.boost, 10) || 0))) });
  if (r.exclude) fields.push({ key: 'exclude', value: /^(1|true|yes|y)$/i.test(r.exclude) ? 'true' : 'false' });
  return { handle: r.handle, fields };
});
if (dry) { console.log(JSON.stringify(entries, null, 2)); console.log(`${entries.length} rows, ${problems} problems`); process.exit(problems ? 1 : 0); }

const missing = [];
for (const e of entries) {
  const found = await admin(`query($q: String!) { products(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${e.handle}` });
  const product = found.products.nodes.find((p) => p.handle === e.handle);
  if (!product) { missing.push(e.handle); continue; }
  const res = await admin(`mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) { metaobject { id handle } userErrors { field message } }
  }`, { handle: { type: 'formation_book', handle: e.handle }, metaobject: { fields: [{ key: 'product', value: product.id }, ...e.fields] } });
  const r = res.metaobjectUpsert;
  if (r.userErrors.length) { problems++; console.error(e.handle, r.userErrors); } else console.log('ok', e.handle);
}
if (missing.length) console.log(`Not in the store (skipped): ${missing.join(', ')}`);
console.log(`${entries.length - missing.length} entries written, ${problems} problems.`);
