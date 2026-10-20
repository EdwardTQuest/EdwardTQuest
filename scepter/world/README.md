# The quizzes world: sources

The sources of the private preview world at edwardthomas.quest/quizzes/, which shows Claude's formation
quizzes and pop-ups, the second Claude set and Codex's quizzes side by side, in test mode, behind a
password.

- `site/`: the hub (`index.html`, `world.json`, `world.css`, `world.js`), the cover, fonts, and Claude's
  kit pages in `site/claude/` (the kit's own files from `theme/assets/` are added by the builder).
  `site/claude/assets/world-kit.js` stands in for Shopify and the email services (test mode).
- `worker.js`, `wrangler.jsonc`: the password Worker.
- `WORLD.md` (the bundle's map), `HANDOFF.md` (deploying from the Mac), `NOTE-FOR-CODEX.md`.

Build: `npm run build:world` writes a public bundle (stand-in temperament questions) to `dist/world/`,
which git ignores. The deployable private bundle, with Alexandre Havard's test, is built into the
private Heron repository:

```sh
node tools/build-world.mjs --out ../../Heron/scepter-world --havard private/scepter-temperament-havard.js
```

Never commit a bundle with Havard's file to this repository; the builder refuses to.
