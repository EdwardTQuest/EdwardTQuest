# Note for Codex: put your Scepter quizzes in this world, as a tab

Edward wants every Scepter quiz in **one** private world, so he and his boss can take and compare
them side by side: **edwardthomas.quest/quizzes/**. Claude built the world and two sets of quizzes.
Please add yours as a third tab in this same world. Do not make a new world, Worker or route.

## Where

- The deployable world is in the private **Heron** repository, folder `scepter-world/` (branch
  `claude/scepter-interactive-quizzes-dqo2rl` unless Edward says otherwise). `WORLD.md` there maps it.
- Put your quizzes in `scepter-world/public/quizzes/codex/`, as static files (an `index.html` per page,
  your `.js`, `.css` and data). They are served at `/quizzes/codex/...`.
- In `scepter-world/public/quizzes/world.json`, fill in the set whose `"key"` is `"codex"` (it is a
  "coming soon" placeholder now). Keep `"owner": "codex"`: Claude's builder never touches sets it does
  not own, nor the `codex/` folder. Cards look like this:

  ```json
  { "href": "codex/my-quiz/", "kind": "Quiz", "title": "…", "sub": "one line on what it does", "meta": "About 2 minutes", "tone": "dark" }
  ```

  `tone` is optional: `dark`, `warm`, `light`, or leave it out for white.
- Recommended: on each page, link `world.css` and open `<body>` with the world's bar, so people can
  move between the sets (paths relative to `codex/<page>/`):

  ```html
  <link rel="stylesheet" href="../../world.css">
  …
  <header class="w-bar">
    <a class="w-bar__home" href="../../#codex">All quizzes</a>
    <span class="w-bar__set">Codex quizzes</span>
    <span class="w-bar__test">Test mode</span>
  </header>
  ```

## Rules the world enforces (its CSP; the browser blocks anything else)

- No inline `<script>` and no `onclick=`-style attributes. Put scripts in `.js` files.
- Scripts, styles and fonts from this world only. Self-host fonts; no Google Fonts or CDNs.
  Images may come from any https address (Shopify's CDN is fine).
- `fetch` only to this world: ship catalogue data as JSON files in `codex/`.
- No iframes.
- **Test mode:** nothing may be sent anywhere. No Klaviyo, Omnisend or webhook keys, no analytics.
  Show what would have been sent instead (Claude's quizzes use a "Test mode · what would be sent" panel).
- Book links may go to `https://scepterpublishers.org/products/<handle>`.

Check it with the real Worker and its CSP before committing:

```sh
cd scepter-world
npx wrangler dev --var PREVIEW_PASSWORD:local-test    # open http://localhost:8787/quizzes/, sign in
```

Take each of your quizzes to the end with the browser console open: there should be no CSP errors.

## The new brand guide: align Claude's colours too

Edward gave you Scepter's new brand guide. Please bring Claude's quizzes into line with it:

- `scepter-world/public/quizzes/claude/assets/brand.css` holds the kit's palette tokens (each one
  commented with what it colours). Changing them re-colours Claude's three quizzes, the plan page and
  both pop-ups. The builder keeps this file when it rebuilds.
- The world's own frame (hub, bar, cards) uses the `--w-*` tokens at the top of
  `public/quizzes/world.css`. Align those as well. Note that the builder rewrites `world.css`, so also
  tell Edward which values you chose.
- Keep contrast: burgundy text on dark green fails for anything that carries meaning. Keep meaning
  on light surfaces.
- If Edward approves the colours for the store, the same values belong in the public kit:
  `EdwardTQuest/scepter/world/site/claude/assets/brand.css`, `scepter/theme/assets/scepter.css`
  (the `.sp` block) and the colour defaults of the four sections. Ask him first.

## Then

Commit to Heron and, with Edward's OK, redeploy from `scepter-world/` with `npx wrangler deploy`
(the same Worker; see `HANDOFF.md`).

## Don't

- Don't create another world or Worker, or change the routes in `wrangler.jsonc` or the sign-in in `worker.js`.
- Don't remove or edit Claude's sets (`claude/`, `reader/`, their `world.json` entries).
- Don't copy anything from `scepter-world/` into a public repository. It contains Alexandre
  Havard's Temperament Test, which is HVLI's copyright and not yet licensed.
