# Task: deploy the Scepter quizzes world to edwardthomas.quest/scepter/quizzes/ (private preview)

You are on Edward's Mac with a terminal and his Cloudflare login (wrangler). The cloud session that built
this had no Cloudflare access, so **nothing below is live yet**.

## Ground rules

1. **Careful and additive.** edwardthomas.quest is live. This adds ONE new Worker,
   `scepter-quizzes-preview`, which answers only `edwardthomas.quest/scepter/quizzes` and `/quizzes/*`. Never
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
  `wrangler.jsonc`, `worker.js`, `public/scepter/quizzes/…` (map in `WORLD.md`). Deploy from this folder.
- Sources: **EdwardTQuest** (public), same branch, `scepter/world/` and `scepter/tools/build-world.mjs`.

## Already checked in the cloud (19–20 Oct 2026; don't trust blindly)

- `https://edwardthomas.quest/scepter/quizzes/` answered 404 from the Scepter world, so the path is free.
  Edward asked for the quizzes inside the Scepter (US) world, so they live at `/scepter/quizzes/`. A Worker
  route on that path is more specific than the Scepter world's, so Cloudflare sends only those requests
  here and the rest of `/scepter/` is untouched.
- `/scepter/` is the Scepter bookshop world. The other quiz branch's `wrangler.path.jsonc` guessed
  `/scepter/*`, which would take over the whole bookshop. Don't deploy that config; its quizzes are inside this world.
- `/betafilms/` and `/family/` answer 303 → `/<world>/login`. This Worker does the same at `/scepter/quizzes/login`.
- `wrangler deploy --dry-run` (wrangler 4.151.2) read 58 asset files; worker 8 KiB; binding `ASSETS`.
- `wrangler dev` with a test password: sign-in, wrong password (401), forged cookie, sign-out, redirect
  only inside `/scepter/quizzes/`, and Havard's file 303 without the cookie all behaved. A browser walk of every page
  with the CSP enforced passed 64 of 64 checks, with no console errors and no CSP violations.

## Steps

**From a cloud session instead of the Mac:** add a Cloudflare API token to the environment's settings
as `CLOUDFLARE_API_TOKEN`, and the account id as `CLOUDFLARE_ACCOUNT_ID`. The token needs Workers
Scripts: Edit on the account and Workers Routes: Edit on the edwardthomas.quest zone. Start a new
session; it picks them up. The password still goes in only through `wrangler secret put`, typed by Edward.

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
curl -sI https://edwardthomas.quest/scepter/quizzes/ | head -3       # expect 404 today
npx wrangler deployments list --name scepter-quizzes-preview  # expect an error: no such Worker
```
In the Cloudflare dashboard, open edwardthomas.quest → Workers Routes, and check that no route already
matches `/scepter/quizzes` more specifically than the Scepter world's own route. Tell Edward what you found.

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
curl -sI https://edwardthomas.quest/scepter/quizzes/ | grep -i -E "^HTTP|^location"          # 303 → /quizzes/login?next=…
curl -sI https://edwardthomas.quest/scepter/quizzes/claude/assets/scepter-temperament-havard.js | head -1   # 303, NEVER 200
curl -sI https://edwardthomas.quest/scepter/quizzes/world-cover.svg | head -1                 # 200
curl -sI https://edwardthomas.quest/ | head -1                                        # the portal, unchanged
curl -sI https://edwardthomas.quest/betafilms/ | head -1                              # still 303 to its own login
```
Then sign in with a browser. Take one quiz to the end, open Havard's test from the hub, and check the
"Test mode · what would be sent" panel. Do this at desktop and at phone width.

**6. Link it from the Scepter world (its repo, on a branch, with OK)**

The quizzes are part of the Scepter world, not a new window on the portal. Find the repository that
serves `/scepter/` on this machine, then follow its own deploy notes. In a new branch, add one link
where the Scepter US pages list their sections (next to "Reading plans" is a natural place):
`<a href="/scepter/quizzes/">Quizzes</a>`, marked private as that world marks such things. Show
`git diff --stat`, push the branch only with OK, and don't merge or deploy the site without OK. The
portal itself needs no change.

**7. Hand over**

Give Edward the URL `https://edwardthomas.quest/scepter/quizzes/`. He shares the password himself.

## Later

- Codex's quizzes: `NOTE-FOR-CODEX.md`. After they are added and committed, `npx wrangler deploy` again
  from `scepter-world/`. It is the same Worker, so no other change is needed.
- Rebuilding Claude's part: `WORLD.md`.
- Taking it down: `npx wrangler delete --name scepter-quizzes-preview` (with OK) and remove the link from the Scepter world.
- scepterpublishers.org is a separate step (the kit's `scepter/README.md`). Havard's test goes there only
  with HVLI's written permission.

## Report back

What you ran and what it returned; the live URL; that Havard's file answers 303 without the password;
anything public you didn't expect; what you did not check.
