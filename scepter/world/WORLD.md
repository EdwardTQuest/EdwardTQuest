# The Scepter quizzes world (edwardthomas.quest/scepter/quizzes/)

A private preview of every quiz made for scepterpublishers.org, side by side, in test mode. It runs
as its own Worker behind a password, in the same pattern as the Review room and My family worlds.

```
wrangler.jsonc        Worker "scepter-quizzes-preview": routes edwardthomas.quest/scepter/quizzes and /quizzes/*
worker.js             sign-in page (/quizzes/login), a 30-day cookie, the site's CSP and noindex headers
HANDOFF.md            how to deploy it from the Mac, step by step
NOTE-FOR-CODEX.md     how Codex adds its quizzes as a tab here, and aligns the brand colours
public/scepter/quizzes/
  index.html          the hub: one tab per quiz set, from world.json
  world.json          the sets and their cards (each set has an "owner")
  world.css, world.js, fonts/, world-cover.svg, og.jpg
  claude/             Claude's formation kit: 3 quizzes, the plan page, both pop-ups (Havard's test)
    assets/brand.css  the kit's palette in this world (yours to change: the builder keeps it)
  reader/             the second Claude set: Find Your Next Step, Find a Book for Someone You Love
  codex/              Codex's quizzes go here
```

Public without the password: only `world-cover.svg` (the portal's window) and `og.jpg` (the
link-preview picture). Everything else, including Alexandre Havard's test, needs the password.

## Rules every page follows (the Worker's CSP, the same as the rest of the site)

- No inline `<script>` and no `onclick=`-style attributes: scripts live in `.js` files.
- Scripts, styles and fonts from this world only (self-host fonts). Images may come from any https address.
- `fetch` only to this world: catalogue data ships as JSON files in the set's folder.
- No iframes. Test mode: nothing is sent anywhere, no keys, no analytics.

## Rebuilding Claude's part

From the public EdwardTQuest repository (branch `claude/scepter-interactive-quizzes-dqo2rl`):

```sh
cd scepter
node tools/build-world.mjs --out ../../Heron/scepter-world --havard private/scepter-temperament-havard.js
```

The builder replaces only what it owns (worker, wrangler config, these notes, the hub files, `fonts/`,
`claude/`, `reader/`) and its own entries in `world.json`. It keeps `codex/`, any other folder, other
owners' sets in `world.json`, and `claude/assets/brand.css`. It refuses to write Havard's file anywhere
the public repository would commit it, and fails if any page breaks the CSP rules above.

## Local try-out

```sh
npx wrangler dev --var PREVIEW_PASSWORD:local-test     # then open http://localhost:8787/scepter/quizzes/
```
