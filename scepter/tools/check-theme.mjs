// Lint the theme files with Shopify's theme-check (the same checks the Shopify CLI runs).
//   cd scepter && npm install && npm run check:theme
// The kit is a partial theme, so it is checked in a temporary copy with an empty locale file.
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { themeCheckRun } from '@shopify/theme-check-node';

const src = new URL('../theme', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'scepter-theme-'));
cpSync(src, dir, { recursive: true });
mkdirSync(join(dir, 'locales'), { recursive: true });
writeFileSync(join(dir, 'locales', 'en.default.json'), '{}');
const { offenses } = await themeCheckRun(dir, undefined, () => {});
rmSync(dir, { recursive: true, force: true });
for (const o of offenses) {
  const sev = ['error', 'warning', 'info'][o.severity] ?? o.severity;
  console.log(`${sev.padEnd(7)} ${o.check.padEnd(26)} ${o.uri.replace(/^.*scepter-theme-[^/]+\//, '')}:${(o.start?.line ?? 0) + 1}  ${o.message}`);
}
console.log(offenses.length ? `\n${offenses.length} offenses` : 'theme-check: 0 offenses');
process.exit(offenses.some((o) => o.severity === 0) ? 1 : 0);
