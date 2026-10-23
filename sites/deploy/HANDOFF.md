# Deploy: the four bookshops at edwardthomas.quest/projects/bookshops/ (private, behind a password)

Built and tested in a cloud session that has no Cloudflare credentials, so **nothing here is live yet**.

## What it is

- One Worker, `bookshops-preview`, serving `public/projects/bookshops/` (the hub and the four shops).
- Same pattern as `scepter-quizzes`, `sjm-review` and `family-videos`: a sign-in page at
  `/projects/bookshops/login`, then a 30-day cookie. Every page and file is locked until sign-in.
- Routes: `edwardthomas.quest/projects/bookshops` and `/projects/bookshops/*` only. A route on that path
  is more specific than the main site's, so nothing else on edwardthomas.quest changes. No workers.dev
  address, no preview URLs, `noindex` headers.
- The password is a Worker secret, never a file. Changing it signs everyone out.

Tested locally (wrangler 4.152.0, `wrangler dev --local`):
- `wrangler deploy --dry-run` reads 68 files and the Worker is 7.5 KiB.
- Locked paths redirect to sign-in (303), and a wrong password gets 401.
- Every shop renders behind the lock with its fonts, and the browser console shows no errors.

## Deploy (from this folder)

```
npm install                     # wrangler 4, pinned in package.json
python3 build.py                # copies the current shops into public/ (run ../tools/build.py first if data changed)
npx wrangler login              # on the Mac; in a cloud session set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID instead
npx wrangler deploy --dry-run
npx wrangler secret put PREVIEW_PASSWORD
npx wrangler deploy
```

In a cloud session, the API token needs Workers Scripts: Edit and Workers Routes: Edit on the
edwardthomas.quest zone.

Before the first deploy, check in the dashboard (edwardthomas.quest → Workers Routes) that no other
Worker already claims `/projects/bookshops*`. To update later: `python3 build.py && npx wrangler deploy`.

To share: send https://edwardthomas.quest/projects/bookshops/ and the password, separately.
