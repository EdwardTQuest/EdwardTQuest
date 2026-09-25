# CLAUDE.md: the Scepter quiz kit

This folder is separate from the Athanasius book pipeline in the rest of the repository. The
pipeline's rules (preflight, gates, run-logs) do not apply here; these do.

- It is a drop-in for a Shopify theme: `theme/` mirrors a theme's folders. There is no build step.
  The scripts are plain browser JavaScript (UMD), loaded by the sections and required by the tests.
- Before and after a change: `cd scepter && npm install && npm test && npm run check:theme`.
  Then `npm run screenshots` and **look** at the results (`docs/screens-tmp/` or a path you pass).
  Screenshots caught five real bugs that no test did.
- The engine promises in `ALGORITHM.md` are tested in `tests/engine.test.mjs`. Change both
  together, never one.
- The admin-facing labels (themes, audiences, seasons, "start when") live in the engine
  (`THEMES`, `AUDIENCES`, `SEASON_LABELS`, `START_WHEN`). The metaobject definition and the CSV
  importer read them from there. Renaming a label breaks every stored entry that uses it.
- Liquid prints JSON config inside `<script type="application/json" data-sp-config>`. Every value
  goes through `| json`, strings get `| default: ''`, and lists end in `null` so there are no
  trailing commas. `tests/liquid.test.mjs` renders the sections and parses what they print.
- Colours: burgundy on dark green fails contrast for anything that carries meaning. Keep meaning on
  cream or light surfaces (see the temperament bars).
- The temperament questions in `scepter-temperament.js` are a stand-in, not Alexandre Havard's
  test. Never present them as his. Replacing them needs HVLI's permission (README).
- Never invent Scepter product handles in `theme/templates/`. The ones there were seen on
  scepterpublishers.org. The demo catalogue may use illustrative ones (`demo/mock/store.json`
  lists which are verified).
