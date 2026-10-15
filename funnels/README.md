# Scepter reader quizzes

Two short quizzes that help a visitor find the right next book and, in return for an email address,
send them a free ebook. Each reader is sorted by **age**, **where they are in their faith** and
**what they need**, and those three things travel to your email system as tags or properties, so
follow-up emails can be written for the person who is reading them.

| quiz | for | length | page it suits |
|---|---|---|---|
| **Find Your Next Step** (`next-step`) | someone choosing for themselves (13 and older) | 8 to 10 screens, about 3 minutes | homepage banner, social, search, newsletter |
| **Find a Book for Someone You Love** (`gift-finder`) | a parent, grandparent, godparent, spouse or friend | 5 or 6 screens, about 1 minute | gift season, First Communion and Confirmation, Mother's and Father's Day |

Both end the same way: the result first (who this sounds like, a few small steps, three books with a
line on why each was chosen), then the free ebook offer. **Nobody is asked for an email before they
see their result.**

## See it now

Open `funnels/dist/preview.html` in a browser, or `funnels/dist/next-step.html` and
`funnels/dist/gift-finder.html` on their own. They run offline. The email form is in **preview mode**:
nothing is sent, and a "what would be sent" panel shows exactly what your email system would receive.

## Put it online as a test world (Cloudflare)

`funnels/dist/world/scepter/` is a self-contained static folder: a hub page with both quizzes, one page
per quiz, the engine, and a `settings.js` that starts in test mode. Every link is relative, so it works
at `edwardthomas.quest/scepter/` or on its own address. It is marked noindex. See
`funnels/WORLD.md` for the exact commands.

## Put it on the store (Shopify)

1. `node funnels/build.mjs` (Node 18 or newer, no installs). It checks every quiz, book and ebook tag
   and refuses to build if one is wrong.
2. Upload `dist/scepter-quiz.js` and `dist/scepter-quiz.css` to the theme's **assets**, and
   `dist/sections/scepter-quiz.liquid` to **sections**.
3. In the theme editor, make two pages (for example *Find your next step* and *Find a gift*), add the
   **Scepter quiz** section to each, and pick a quiz in the section settings.
4. In the same section, choose where sign-ups go (it starts on **Nowhere (test mode)**, so nothing is
   sent until you choose), the consent style, the privacy link, and the two page links that let each
   result point to the other quiz. Tick or untick covers, prices and Add to cart.
5. Settings you define yourself (for example in `theme.liquid`) win over the section's, and `capture`
   merges one level deep, so you can override just the provider.

Not on Shopify? Host `dist/next-step.html` anywhere and link to it, or paste
`<div data-scepter-quiz="next-step"></div>` plus the two asset files into any page.

## Where the email goes

| provider | what happens | you need |
|---|---|---|
| `shopify` | creates a Shopify customer, subscribed to marketing, with tags like `quiz-next-step`, `age-35-49`, `stage-growing`, `need-prayer`. Nothing is posted for a reader who did not agree. Shows Shopify's captcha in the page if it asks for one, and tells the reader if the sign-up is refused. Tags are only ever added, never removed | the quiz must be on the store's own domain |
| `klaviyo` | creates the profile with properties, subscribes them to your list (only if they agreed), and records a **Completed Scepter Quiz** event your flows can trigger on. The event is sent last and carries a unique id, so a retry cannot start a welcome flow twice | the 6-character public key (never a private key) and the list ID |
| `webhook` | sends the record as JSON to a URL (Zapier, Make, n8n, Google Apps Script). Every record has a `submission_id`; if the response is hidden by CORS the same record is sent once more, so the receiver should drop a repeated id | a URL |
| `custom` | calls `window.ScepterQuizCapture(payload)` | your own function |
| `demo` | nothing leaves the page | nothing |

Only public keys are ever in the page. Secret keys never belong here.

Settings for a hand-built page (the Shopify section builds this for you):

```html
<script>
window.SCEPTER_QUIZ_SETTINGS = {
  capture: {
    provider: 'klaviyo',
    klaviyo: { companyId: 'AbC123', listId: 'XyZ789' },
    consent: { mode: 'checkbox', privacyUrl: '/policies/privacy-policy' },   // 'checkbox' is the safe default; 'notice' for the US
    extraTags: ['source-quiz-site']
  },
  shop: { productCards: true, addToCart: true, currency: 'USD', root: '' }
};
</script>
```

## What the email system receives

It depends on who is asking.

**A reader who agreed to emails.** Tags (Shopify and any tag-based system):
`quiz-next-step` · `age-35-49` · `stage-growing` · `need-prayer` · `need-peace` · `life-parent-young` · `lang-es`.
Properties (Klaviyo and webhooks): `scepter_quiz`, `scepter_age_band`, `scepter_stage`, `scepter_needs`,
`scepter_life_season`, `scepter_language`, `scepter_reading_format`, `scepter_free_ebook`,
`scepter_recommended` (book IDs), `scepter_quiz_completed_at`.

**A gift buyer.** Every key carries a `gift` prefix and shares nothing with a reader's own record:
tags `gift-buyer`, `gift-age-teen`, `gift-need-peace`, `gift-lang-es`; properties `scepter_gift_quiz`,
`scepter_gift_age_band`, `scepter_gift_stage`, `scepter_gift_needs`, `scepter_gift_language`,
`scepter_gift_recommended`, `scepter_gift_buyer`. Buying for a Spanish-reading mother does not change the
buyer's own language, and a grandmother buying for a drifting grandson is never emailed as the one drifting.
A child recipient has no stage at all.

**A reader who did not agree, or a parent or guardian's address (readers 13 to 17).** Only the quiz name
(`quiz-next-step`, plus `guardian-signup` for a minor) and the chosen ebook. Nothing about faith, age or
needs, no books, and no name for a minor. A parent's address always gets an unticked box, even in `notice`
mode, because the quiz cannot tell who typed it. Readers under 13 are stopped at the first age question and
nothing is saved or sent; they are pointed to the gift finder, which reaches children only through an adult.

Raw answers (Mass, Confession, prayer habits) are never sent unless `capture.includeAnswers` is turned on.

Page events for analytics: `scepter_quiz_start`, `_complete`, `_result`, `_lead`, `_download`, `_book_click`,
`_add_to_cart`, pushed to `dataLayer` and fired as `scepterquiz:*` DOM events. They carry only the quiz id and
a book or ebook id, never stage, age or needs.

## The categories

| | values |
|---|---|
| **Age** | `child` (gift only) · `teen` (under 18) · `18-24` · `25-34` · `35-49` · `50-64` · `65-plus` |
| **Stage** | `exploring` *Seeking* · `returning` *Coming Home* · `beginning` *Taking Root* · `growing` *Growing Deeper* · `deepening` *Bearing Fruit* |
| **Needs** (up to 3) | prayer · peace · suffering · everyday · marriage · parenting · basics · sacraments · virtue · scripture · saints · purpose · sharing · seasons |
| **Life season** | student · single · married · parent-young · parent-teen · grown-children · clergy |

The stages are a journey, never a grade. Nobody is shown a number, a level or a ladder, and every
result says plainly that it is a snapshot. See `PLAYBOOK.md` for how each stage is decided and what to
write to each one.

## Keeping it current

| to change | edit | then |
|---|---|---|
| a book's tags, blurb or link | `quiz/data/catalog.js` | `node funnels/build.mjs` |
| the free ebooks, or add a direct download link | `quiz/data/magnets.js` | same |
| the stage wording, steps, needs, consent text | `quiz/data/segments.js` | same |
| a question or how it scores | `quiz/quizzes/next-step.js` or `gift-finder.js` | same |
| colours and fonts | override the `--sq-*` tokens at the top of `quiz/src/quiz.css` | same |

`node --test funnels/test/engine.test.mjs` runs 36 checks on the scoring, safety rules and email payloads.
`node funnels/test/e2e.mjs` drives both quizzes in a real browser: mouse, keyboard, phone width, the under-13
and guardian paths, consent, and the Shopify sign-up against a mock store (success, captcha, refusal).
`node funnels/build.mjs --links` lists every product link to check by hand.

## Before you launch: read `PLAYBOOK.md`, section "Before launch"

The catalog was built from web searches of scepterpublishers.org because the site could not be opened
from the build machine. Every title carries a `source` note. Prices, stock, release dates and a few
authors still need a human to confirm.
