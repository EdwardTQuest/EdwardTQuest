# Task: put the Scepter quizzes on edwardthomas.quest as a new "world" (carefully), for my review

You are running on my Mac with terminal access and my Cloudflare login (wrangler). Earlier sessions ran in a
cloud VM that had no Cloudflare access, so they built everything but deployed nothing. Do not assume anything
below is already live.

## Ground rules (read these first)

1. **Careful and additive.** edwardthomas.quest is my live site. Add ONE new, separate "world" only. Never
   modify, redeploy, rename or delete any existing Worker, Pages project, route, DNS record, R2 bucket, KV
   namespace or world. Before any command that changes Cloudflare or pushes to GitHub, show me the exact
   command and what it will touch, then wait for my OK. Read-only commands (`wrangler whoami`, `--dry-run`,
   list commands, `curl`, `git status`, `git diff`) are fine without asking.
2. **Test mode stays on.** The quizzes ship with sign-ups in test mode (`provider: 'demo'`): the email form
   sends nothing and shows what it would have sent. Do not add API keys, Klaviyo or Omnisend IDs, webhooks or
   analytics. Keep the noindex headers and robots rules.
3. **Stay out of the book pipeline.** This repo's `CLAUDE.md` is about the Athanasius book pipeline
   (`bin/ath preflight`, `books/`). This job is only about `funnels/`. Do not run `ath` commands or edit
   anything outside `funnels/`, except where I approve adding the world to the site repo.
4. **Git:** work on a branch, never directly on main/master of the site repo. No force-push. Show
   `git diff --stat` before any push.
5. **If a step does not match what I describe here, stop and tell me.** Do not improvise around it.
6. Report outcomes faithfully: say what you ran, what it returned, and what you did not verify.

## What exists

- Repo: `https://github.com/EdwardTQuest/EdwardTQuest` (public). Branch: **`claude/scepter-quiz-ebook-capture-vqmppd`**.
  Everything is under `funnels/`. Latest commit when this was written: `56a2e0b` (plus this file).
- Two embeddable quizzes for Scepter Publishers (a Catholic publisher; scepterpublishers.org):
  - **Find Your Next Step** (reader, 13+, about 3 minutes): sorts a reader by age band, stage of faith (five
    stages, never shown as a grade) and up to three needs; shows a few small steps, three books with a reason
    for each, and offers a free ebook for an email address, after the result.
  - **Find a Book for Someone You Love** (gift finder, about 1 minute): same idea for a giver choosing for a
    child, teen or adult.
- Catalog: 99 books and 12 free booklets (`funnels/quiz/data/catalog.js`, `magnets.js`). They were found by web
  search, not from the live store, so links and a dozen authors are unverified (see "Optional" below).
- Privacy rules built in: a reader who doesn't tick the email box, or a parent's address for a reader 13 to 17,
  sends only the quiz name and the ebook (no faith stage, age or needs); under-13s are stopped and nothing is
  kept; raw answers are never sent; analytics events carry no stage or age.
- **The world bundle** is already built and committed at `funnels/dist/world/`:

  ```
  funnels/dist/world/
    scepter/                  <- the static site: hub, one page per quiz, assets/, settings.js, _headers, robots.txt
    wrangler.jsonc            <- standalone test site on a *.workers.dev address (assets: ./scepter)
    wrangler.path.jsonc       <- same pages at edwardthomas.quest/scepter/* (route + zone are MY GUESS: check them)
    .assetsignore
  ```

  Every link inside is relative, so it works at any path. `funnels/WORLD.md` explains it. Both wrangler configs
  passed `wrangler deploy --dry-run` (wrangler 4.151.0) in the cloud VM; neither has been deployed.
- Tests: `node --test funnels/test/engine.test.mjs` (36 pass) and `funnels/test/e2e.mjs` (browser suite, needs
  Playwright; includes a mock Shopify store).

## Already checked (do not redo, do not trust blindly)

- The earlier session searched my GitHub repos for edwardthomas.quest deploy instructions and found none:
  `EdwardTQuest/Athanasius` is the athanasius.online library on **Vercel** (not the target); `Heron` holds a
  private Havard temperament test; `athanasius-pipeline` is a book-pipeline backup; `libalex` and `Athanasius_2`
  are empty; the `sites/` folder on branch `claude/wizardly-pasteur-ou7n2z` is a Vercel set of concept bookshops.
  The instructions for edwardthomas.quest are probably in a repo or folder on THIS machine. Find them (step 3).
- **Overlap to flag to me:** branch `claude/scepter-interactive-quizzes-dqo2rl` has a separate, larger
  "Scepter quiz kit" under `scepter/` (three formation quizzes, free-ebook pop-up, temperament test, built as
  Shopify theme sections, with a local demo on a snapshot of the live store, 72 tests). It was built in
  parallel; the two projects do not depend on each other. Do not merge, change or deploy that branch unless I
  ask. When you report, tell me whether the site's existing worlds look like they'd suit it better.

## Steps

**0. Preflight (read-only).**
```bash
node --version            # need 18 or newer
git --version
npx wrangler whoami       # must show my account; if "not authenticated", stop and tell me
gh auth status 2>/dev/null || git ls-remote https://github.com/EdwardTQuest/EdwardTQuest.git | head -1
```

**1. Get the code** (skip if already cloned):
```bash
git clone https://github.com/EdwardTQuest/EdwardTQuest.git ~/EdwardTQuest-quizzes
cd ~/EdwardTQuest-quizzes
git checkout claude/scepter-quiz-ebook-capture-vqmppd
git log --oneline | head -3
```

**2. Verify before deploying.**
```bash
node funnels/build.mjs                              # must print "valid", and "git status" must stay clean afterwards
node --test funnels/test/engine.test.mjs            # expect: 36 pass, 0 fail
# Browser suite (optional but good). Keep Playwright OUT of the repo:
mkdir -p ~/.pw && (cd ~/.pw && npm init -y >/dev/null && npm i playwright && npx playwright install chromium)
NODE_PATH=~/.pw/node_modules node funnels/test/e2e.mjs   # expect: "all browser checks passed"
git status --short                                  # must show nothing new; never commit node_modules
```
Also open `funnels/dist/world/scepter/index.html` in a browser, take each quiz once, and look at the result
screens yourself (desktop and a phone-width window). Screens first, then numbers.

**3. Find out how edwardthomas.quest worlds work.** Look on this machine, read-only:
```bash
grep -ril "edwardthomas.quest" ~ --include=*.md --include=*.toml --include=*.json --include=*.jsonc --include=*.yml --include=*.yaml 2>/dev/null | grep -v node_modules | head -30
find ~ -maxdepth 4 \( -name "wrangler.toml" -o -name "wrangler.json" -o -name "wrangler.jsonc" \) -not -path "*/node_modules/*" 2>/dev/null | head -20
```
Open the site's repo/folder, read its README and any deploy notes, look at how an existing world is laid out
and routed (a folder in the repo? its own Worker? a Pages project? a route like `/<world>/*`?), and how it is
deployed (a script, wrangler, GitHub Actions). Summarize it to me in a few lines, including the exact command
the instructions say to use. **Do not deploy until I've seen that summary.**

**4. Deploy a standalone test copy first** (new Worker, own `*.workers.dev` address, touches nothing else):
```bash
cd ~/EdwardTQuest-quizzes/funnels/dist/world
npx wrangler deploy --dry-run          # read-only: shows what would be uploaded
```
Show me the dry-run, confirm the Worker name `scepter-quizzes` does not already exist in my account, ask for
my OK, then `npx wrangler deploy`. Then check it (see step 6) and give me the URL.

**5. Add it as a world on edwardthomas.quest, following the site's own pattern from step 3.**
- Copy `funnels/dist/world/scepter/` into the place that pattern calls for (usually as `scepter/`), unchanged.
  Do NOT use `wrangler.path.jsonc` as-is unless step 3 shows it matches how the site routes worlds; its route
  (`edwardthomas.quest/scepter/*`, zone `edwardthomas.quest`) is a guess. Check first that nothing already
  answers `/scepter/*`.
- Do it on a new branch of the site repo. Show me `git diff --stat` and the file list, wait for my OK, then
  push the branch (and open a PR if that's how the site works). Do not push to main/master.
- If the site's instructions say deploys happen from main or via CI, stop after the PR and tell me.

**6. Verify what's live** (read-only):
```bash
curl -sI https://<the-url>/ | head -5
curl -sI https://<the-url>/next-step/ | head -3
curl -sI https://<the-url>/assets/scepter-quiz.js | head -3
curl -s https://<the-url>/ | grep -i -E "noindex|Test version"
```
Then use a headless browser (Playwright, from `~/.pw`) to load the hub, walk both quizzes to a result, submit
the sign-up form with a fake address, and confirm: three books appear, the "what would be sent" panel shows
and nothing was sent, and there are no console errors. Attach screenshots.

**7. Optional, valuable (this machine has the network the cloud VM lacked):** verify the catalog.
```bash
node funnels/build.mjs --links > /tmp/scepter-links.tsv
```
`curl -sIL` each URL (be polite: a small delay between requests) and report any that don't return 200, any whose
page title doesn't match the catalog title, and the 12 with "author not confirmed". Show me a table; do not edit
`catalog.js` or `magnets.js` without my say-so.

## What to tell me when you finish

1. What you ran and what it returned (commands, URLs, versions).
2. The live URL(s) and whether anything is public that I didn't expect.
3. What you checked and how, with counts; what you did NOT check.
4. Anything in the site's pattern that differed from this brief.
5. The decision I need to make: ship this quiz set, the other branch's kit, or both.

## Still open before any real launch (not part of this task; just don't claim them done)

Product links and authors unverified; free ebooks have no direct download links yet; a priest should read the
copy; counsel should review consent and minors handling; the child gift list is thin (about four titles); Spanish
has no titles for marriage, parenting or hard times. Details are in `funnels/PLAYBOOK.md`, "Before launch".
