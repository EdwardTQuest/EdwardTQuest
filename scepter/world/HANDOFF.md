# Task: deploy the Scepter quizzes world to edwardthomas.quest/quizzes/ (private preview)

You are on Edward's Mac with a terminal and his Cloudflare login (wrangler). The cloud session that built
this had no Cloudflare access, so **nothing below is live yet**.

## Ground rules

1. **Careful and additive.** edwardthomas.quest is live. This adds ONE new Worker,
   `scepter-quizzes-preview`, which answers only `edwardthomas.quest/quizzes` and `/quizzes/*`. Never
   modify, redeploy, rename or delete any other Worker, route, DNS record, Pages project, R2 bucket, KV
   namespace or world. Before any command that changes Cloudflare or pushes to GitHub, show Edward the
   exact command and what it touches, and wait for his OK. Read-only commands (`wrangler whoami`,
   `--dry-run`, `curl`, `git status`) need no OK.
2. **Private.** The bundle contains Alexandre Havard's Temperament Test, which is HVLI's copyright,
   shown here to ask their permission. It must stay behind the password: never deploy without
   `PREVIEW_PASSWORD` set, never turn on a `workers.dev` address (it is off on purpose), and never copy
   the bundle into a public repository.
3. **Test mode stays on.** Don't add Omnisend, Klaviyo or webhook keys, or analytics.
4. **The password is Edward's.** He types it at wrangler's prompt himself. Never put it in a file, a
   commit, a chat or a command line.
5. If anything differs from this brief, stop and say so. Report what you ran and what it returned.

## What exists

- **Heron** (private), branch `claude/scepter-interactive-quizzes-dqo2rl`, folder `scepter-world/`:
  `wrangler.jsonc`, `worker.js`, `public/quizzes/…` (map in `WORLD.md`). Deploy from this folder.
- Sources: **EdwardTQuest** (public), same branch, `scepter/world/` and `scepter/tools/build-world.mjs`.

## Already checked in the cloud (19–20 Oct 2026; don't trust blindly)

- `https://edwardthomas.quest/quizzes/` answered 404 from the site, so the path is free.
- `/scepter/` is the Scepter bookshop world. The other quiz branch's `wrangler.path.jsonc` guessed
  `/scepter/*`, which would collide with it. Don't deploy that config; its quizzes are inside this world.
- `/betafilms/` and `/family/` answer 303 → `/<world>/login`. This Worker does the same at `/quizzes/login`.
- `wrangler deploy --dry-run` (wrangler 4.151.2) read 58 asset files; worker 8 KiB; binding `ASSETS`.
- `wrangler dev` with a test password: sign-in, wrong password (401), forged cookie, sign-out, redirect
  only inside `/quizzes/`, and Havard's file 303 without the cookie all behaved. A browser walk of every page
  with the CSP enforced passed 64 of 64 checks, with no console errors and no CSP violations.

## Steps

**0. Preflight (read-only)**
```sh
node --version                 # 18 or newer
npx wrangler whoami            # must be the account that owns the edwardthomas.quest zone
```

**1. Get the bundle**
```sh
git clone https://github.com/EdwardTQuest/Heron.git ~/Heron   # skip if already cloned
cd ~/Heron && git checkout claude/scepter-interactive-quizzes-dqo2rl && git pull
cd scepter-world
```

**2. Confirm the path and the name are free (read-only)**
```sh
curl -sI https://edwardthomas.quest/quizzes/ | head -3       # expect 404 today
npx wrangler deployments list --name scepter-quizzes-preview  # expect an error: no such Worker
```
In the Cloudflare dashboard, open edwardthomas.quest → Workers Routes, and check that no route already
matches `/quizzes`. Tell Edward what you found.

**3. Dry run (read-only)**
```sh
npx wrangler deploy --dry-run
```

**4. With Edward's OK: set the password, then deploy**
```sh
npx wrangler secret put PREVIEW_PASSWORD   # Edward types it; if asked to create the Worker, yes
npx wrangler deploy
```
Until the secret exists the Worker serves nothing, only a "no password yet" notice, so the order is safe.

**5. Verify (read-only)**
```sh
curl -sI https://edwardthomas.quest/quizzes/ | grep -i -E "^HTTP|^location"          # 303 → /quizzes/login?next=…
curl -sI https://edwardthomas.quest/quizzes/claude/assets/scepter-temperament-havard.js | head -1   # 303, NEVER 200
curl -sI https://edwardthomas.quest/quizzes/world-cover.svg | head -1                 # 200
curl -sI https://edwardthomas.quest/ | head -1                                        # the portal, unchanged
curl -sI https://edwardthomas.quest/betafilms/ | head -1                              # still 303 to its own login
```
Then sign in with a browser. Take one quiz to the end, open Havard's test from the hub, and check the
"Test mode · what would be sent" panel. Do this at desktop and at phone width.

**6. Add the world to the portal (the site's repo, on a branch, with OK)**

Find the site's repository on this machine: it serves `/js/portal.js` and the root `index.html`. Follow
its own deploy notes, which may differ from what's below. In a new branch:

- `js/portal.js`, in `SITES`, after the `family` entry:
  ```js
  // its own password-protected Worker (scepter-quizzes-preview); the cover and og.jpg are the only public files under /quizzes/
  { key: 'quizzes', href: '/quizzes/', name: 'Scepter quizzes', sub: 'private', img: '/quizzes/world-cover.svg', fit: 'xMidYMid slice', tint: '#a9c5a6' },
  ```
  and in `anchor`: portrait `quizzes: [.2, .8]`, landscape `quizzes: [.92, .5]` (both clear of the others).
- `index.html`: add `<a href="/quizzes/">Scepter quizzes</a>` to `nav.doors`. Change "seven are open" in
  the meta description to "eight are open" and add "a private room for Scepter's quizzes" to the list.
  In the `svg#glass` aria-label, change "seven of them open" to "eight".
- Show `git diff --stat`, push the branch only with OK, and don't merge or deploy the site without OK.

**7. Hand over**

Give Edward the URL `https://edwardthomas.quest/quizzes/`. He shares the password himself.

## Later

- Codex's quizzes: `NOTE-FOR-CODEX.md`. After they are added and committed, `npx wrangler deploy` again
  from `scepter-world/`. It is the same Worker, so no other change is needed.
- Rebuilding Claude's part: `WORLD.md`.
- Taking it down: `npx wrangler delete --name scepter-quizzes-preview` (with OK) and remove the portal entry.
- scepterpublishers.org is a separate step (the kit's `scepter/README.md`). Havard's test goes there only
  with HVLI's written permission.

## Report back

What you ran and what it returned; the live URL; that Havard's file answers 303 without the password;
anything public you didn't expect; what you did not check.
