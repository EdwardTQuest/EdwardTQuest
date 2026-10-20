# CLAUDE.md: the Scepter quiz kit

This folder is separate from the Athanasius book pipeline in the rest of the repository. The
pipeline's rules (preflight, gates, run-logs) do not apply here; these do.

- It is a drop-in for a Shopify theme: `theme/` mirrors a theme's folders. There is no build step.
  The scripts are plain browser JavaScript (UMD), loaded by the sections and required by the tests.
- Before and after a change: `cd scepter && npm install && npm test && npm run check:theme`.
  Then `npm run screenshots` and **look** at the results (`docs/screens-tmp/` or a path you pass).
  Screenshots caught five real bugs that no test did.
- The engine promises in `ALGORITHM.md` are tested in `tests/engine.test.mjs` (on the mock) and
  `tests/live.test.mjs` (eight readers on `demo/live/`, a snapshot of scepterpublishers.org). Change
  both together, never one. Refresh the snapshot with `node tools/snapshot-store.mjs`, then read a
  few plans (`demo/quiz.html`), not only the test results: reading plans on the live catalogue
  found seven faults the mock never showed.
- The admin-facing labels (themes, audiences, seasons, "start when") live in the engine
  (`THEMES`, `AUDIENCES`, `SEASON_LABELS`, `START_WHEN`). The metaobject definition and the CSV
  importer read them from there. Renaming a label breaks every stored entry that uses it.
- Liquid prints JSON config inside `<script type="application/json" data-sp-config>`. Every value
  goes through `| json`, strings get `| default: ''`, and lists end in `null` so there are no
  trailing commas. `tests/liquid.test.mjs` renders the sections and parses what they print.
- Colours: burgundy on dark green fails contrast for anything that carries meaning. Keep meaning on
  cream or light surfaces (see the temperament bars).
- The temperament pop-up runs Alexandre Havard's own test from `scepter-temperament-havard.js`.
  His words are HVLI's copyright and this repository is public: the file in `theme/assets/` is a
  placeholder, and the real one lives in the private Heron repo (`scepter-havard/`) or in the
  git-ignored `private/` (`npm run import:havard`). Never commit the real file, or screenshots of
  his test, here. `twoStage` in `scepter-temperament.js` is his method. If you change it, run
  `npm run crosscheck:havard` (his own scoring code against yours; it must report 0 differences).
  The stand-in questions are the kit's own; never present them as his.
- Never invent Scepter product handles in `theme/templates/`. The ones there were seen on
  scepterpublishers.org. The demo catalogue may use illustrative ones (`demo/mock/store.json`
  lists which are verified).
- The private preview world (`world/`, `tools/build-world.mjs`) must keep the site's CSP: no inline
  scripts or handlers, no outside scripts, styles or fonts, `fetch` only to itself. The builder checks
  this and fails. Its bundle with Havard's file goes only to Heron (`scepter-world/`); after a kit change,
  rebuild it there and run a browser walk through `wrangler dev` (the Worker enforces the real CSP).
