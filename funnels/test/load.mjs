// Load the quiz engine, data and quizzes (everything but the DOM layer) into a fresh sandbox.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const Q = join(dirname(fileURLToPath(import.meta.url)), '..', 'quiz');

export function load(extra = {}) {
  const ctx = { console, URLSearchParams, setTimeout, Promise, JSON, ...extra };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const files = [
    join(Q, 'src', 'core.js'),
    join(Q, 'src', 'capture.js'),
    ...['segments.js', 'catalog.js', 'magnets.js'].map((f) => join(Q, 'data', f)),
    ...readdirSync(join(Q, 'quizzes')).filter((f) => f.endsWith('.js')).sort().map((f) => join(Q, 'quizzes', f)),
  ];
  for (const f of files) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx;
}
