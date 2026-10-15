# The Scepter quizzes as a test world

`node funnels/build.mjs` writes a self-contained static folder to `funnels/dist/world/scepter/`:

```
index.html              hub: both quizzes, tabbed
next-step/index.html    Find Your Next Step
gift-finder/index.html  Find a Book for Someone You Love
assets/                 the quiz engine (rebuilt, never edited) and settings.js (yours to edit)
_headers, robots.txt    noindex while it is a test, basic security headers
```

Beside that folder, in `funnels/dist/world/`: `wrangler.jsonc` (own address), `wrangler.path.jsonc`
(at `/scepter/`) and `.assetsignore`.

Every link is relative, so the folder works at `edwardthomas.quest/scepter/`, at any other path, or on its
own `*.workers.dev` address. It is in **test mode**: the email form sends nothing and shows what it would
have sent. Pages carry a "Test version" banner and ask search engines not to index them.

## Deploy with wrangler

Run these from a machine where you are logged in to Cloudflare (`npx wrangler login`). The configs were
checked with `wrangler deploy --dry-run` (wrangler 4), which confirms they parse and find the files. They
have not been deployed: the build machine has no Cloudflare access.

```sh
node funnels/build.mjs
cd funnels/dist/world
```

**A. Its own test address (`*.workers.dev`).** No DNS or routing changes:

```sh
npx wrangler deploy                              # uses wrangler.jsonc, publishes ./scepter
```

**B. At `edwardthomas.quest/scepter/`.** For a domain already on Cloudflare:

```sh
npx wrangler deploy --config wrangler.path.jsonc
```

That config answers only `/scepter/*`, so the rest of the site is untouched. Its assets folder is
`dist/world` itself (it contains `scepter/`), which is why requests to `/scepter/...` find `scepter/...`.
`.assetsignore` keeps the wrangler files from being published. Change the route in
`wrangler.path.jsonc` if the zone or path differs.

**C. If your existing worlds are folders in a repo you deploy as a whole**, skip wrangler config: copy
`funnels/dist/world/scepter/` into that repo as `scepter/`, and follow however that repo defines a world.
Everything in the folder is relative, so no edits are needed.

Cloudflare Pages also works: `npx wrangler pages deploy funnels/dist/world/scepter --project-name scepter-quizzes`.

## Going from test to live

1. Edit `assets/settings.js`: set `provider` to `klaviyo` or `webhook` and fill in its block. Public keys
   only. `shopify` works only when the quiz is on the store's own domain, so it does not apply to a world
   hosted separately.
2. Keep `consent.mode` on `checkbox` unless counsel says `notice` is fine for your audience.
3. Remove the "Test version" banner and the noindex lines (`<meta name="robots">`, `robots.txt`, the
   `X-Robots-Tag` header) when you want it found.
4. Read `PLAYBOOK.md`, "Before launch".
