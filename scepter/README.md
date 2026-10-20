# Scepter quiz kit

Three formation quizzes, a free e-book pop-up and a temperament test for
[scepterpublishers.org](https://scepterpublishers.org), built as Shopify theme sections.
Everything is editable from the Shopify admin, and a recommendation engine turns each reader's
answers into a twelve-month reading plan, one book a month.

- **Discover your mission!** Dark green, a mission briefing.
- **What adventure is God calling you on?** Light green, a trail map.
- **What hidden treasures has God laid in store for you this week?** Deep green and burgundy, a
  treasure map that digs deeper into the backlist.

![The three quizzes](docs/screens/quiz-intros.jpg)

All three ask the same things, each in its own order and voice:
- **age** and **religion**;
- **gender**: male or female, with **Other** offered unless the reader answered Catholic, Muslim or Latter-day Saint;
- **work**;
- **state in life**, with follow-ups: married asks *how long* and *how many children*; religious asks *which order*; priest asks *secular or religious* and *parochial or not*;
- **how they feel about God, religion and the world** (three dials);
- **their faith**;
- **home life** from 1 to 10;
- **how they feel about work**, and **how much it serves God and others**;
- whether they want to **grow, learn or discover**;
- then **email**, for the plan.

![Questions](docs/screens/quiz-questions.jpg)

The reader sees their plan at once and gets it by email. Each book says why it was chosen, in
their own terms. The first comes with a practice for the week. Any book can be swapped ("Read it
already?"), added to the cart, or all of the first three at once. If God, religion or the world
feel pretty poor, the plan starts with Fr. Jacques Philippe.

![Results](docs/screens/quiz-results.jpg)

The **free e-book pop-up** asks for a name, an email, and one of three interests (peace,
prosperity, enlightenment), each with its own e-book. The **temperament test** gives the reader
their dominant and secondary temperament and the virtue to grow, then offers Scepter's Alexandre
Havard books with add-to-cart buttons.

![Pop-ups](docs/screens/popups.jpg)

*The temperament result above is the stand-in's. Alexandre Havard's own test gives one of his
twelve profiles; its screens are in the private Heron repository, beside his test.*

How books are chosen, with a worked example: **[ALGORITHM.md](ALGORITHM.md)**.

> **The temperament test is Alexandre Havard's own**, read from virtuousleadership.com: his 48
> statements, his two stages, his twelve profiles, scored exactly as his page scores them. His
> words are the copyright of Virtuous Leadership (HVLI), and this repository is public, so they
> live in one file kept in the **private Heron repository**, `scepter-havard/scepter-temperament-havard.js`.
> Upload that file to the theme and the pop-up runs his test. **Ask HVLI's permission before it
> goes live.** Scepter publishes his books, so it should be a short email. Until the file is in
> place, the pop-up runs the kit's own stand-in questions. See [The temperament test](#the-temperament-test).

## Try it without Shopify

```sh
cd EdwardTQuest && npx serve .      # then open http://localhost:3000/scepter/demo/
```

The demo runs the real code on a **snapshot of the live store** (`demo/live/`, taken 26 September
2026): all 632 products with their real covers, prices and best-seller order. Refresh it with
`node scepter/tools/snapshot-store.mjs`. Add `?data=mock` to a page's address for the small mock
catalogue the unit tests use. A "lead inspector" in the corner shows exactly what Klaviyo, Omnisend,
a webhook and Shopify would receive.

## The private preview on edwardthomas.quest

All the quizzes, both pop-ups and Alexandre Havard's full test also run as a private "world" at
**edwardthomas.quest/quizzes/**. It sits behind a password, in test mode, beside the second Claude set
and (soon) Codex's quizzes, for trying them out before anything goes on the store. The sources are in
`world/` and `npm run build:world` builds it. The deployable bundle, with Havard's file, lives in the
private Heron repository (`scepter-world/`). `world/HANDOFF.md` covers deploying it, and
`world/NOTE-FOR-CODEX.md` covers adding Codex's quizzes and aligning the colours with the new brand guide.

In test mode (`"testMode": true` in a section's config, which the world sets), the quiz and pop-ups say
"Test mode: nothing was sent" instead of promising an email, and show no "View cart" link.

## Install on Shopify (about 30 minutes, once)

A developer or anyone comfortable with *Online Store → Themes → Edit code* can do this.

1. **Duplicate your live theme** (Online Store → Themes → ⋯ → Duplicate) and work on the copy.
2. **Upload the files** in `theme/` into the same folders of the theme:
   - `assets/`: the six `scepter-*.js`, `scepter.css`, and the three `.woff2` fonts. For Havard's
     test, use the real `scepter-temperament-havard.js` from Heron in place of the placeholder;
   - `sections/`: four `.liquid` files;
   - `snippets/`: four `.liquid` files;
   - `templates/`: four `page.scepter-*.json` files.

   With the Shopify CLI: `shopify theme push --path scepter/theme --theme <copy id> --nodelete`.
3. **Create the pages** (Online Store → Pages → Add page), each with its template:

   | page title | template | suggested URL |
   |---|---|---|
   | Discover your mission | `scepter-mission` | /pages/discover-your-mission |
   | What adventure is God calling you on? | `scepter-adventure` | /pages/adventure |
   | This week's hidden treasures | `scepter-treasures` | /pages/hidden-treasures |
   | Your reading plan | `scepter-reading-plan` | /pages/reading-plan |

   The quiz templates carry five starter rules, using real Scepter products: Jacques Philippe,
   Havard, *Why Priests?*, *Holiness Through Work* / *The Sanctification of Work*, and *The Faith
   Explained*.
4. **Create the best-selling collection.** The templates read two lists. *Best Sellers*
   (`best-sellers`) exists; its hand-set order is the bestseller rank. The second list,
   `best-selling-products`, does not exist yet, and until it does the quizzes draw on the 15 Best
   Sellers alone (7 are Jacques Philippe's). To create it:
   1. Products → Collections → Create collection. Title *Best-selling products*, type
      **Automated**.
   2. Conditions: *Price is greater than 0*, and *Tag is not equal to Spanish*.
   3. Sort: **Best selling**. Save, and check the handle is `best-selling-products`.

   Its first 50 books join the bestsellers.
5. **Create the book library** (see [Filling in the books](#filling-in-the-books)). Run
   `setup/create-formation-book.mjs`, or create it by hand from `setup/README.md`.
6. **Add the pop-ups.** Customize → Footer → Add section → *Scepter e-book pop-up*, and again for
   *Scepter temperament test*.
   - **E-books:** in each e-book block, pick the free booklet's product. The preset names three
     from the store: *Why Suffer?*, *5 Steps to a Financially Healthy Marriage*, *The
     Reasonableness of Christianity*.
   - **Havard books:** pick one per temperament (see [The pop-ups](#the-pop-ups)).
7. **Connect email** (see [Email](#email)). The store runs **Omnisend**. In each section, tick
   *Send it to Omnisend*, and build the three automations from `setup/omnisend/`.
8. **Check it** on the theme preview, take a quiz yourself, then publish the theme.

## Filling in the books

The engine reads the **whole catalogue** by itself, so a plan works from day one. To steer it,
use the **Formation book** library: *Content → Metaobjects → Formation book → Add entry*. Pick a
product, then tick:

| field | what it does |
|---|---|
| Themes | what the book is about (peace, prayer, work, marriage, leadership …) |
| Good for | who it is for. Without **Everyone**, only those readers get it. With **Everyone**, those readers get it more often |
| Depth | Gentle, Steady or Deep: gentle books come early in a plan |
| Seasons | Advent, Lent, Easter, Our Lady's months … A book tied to Advent or Lent is kept for its season |
| Start with this book when… | pulls it into the first three months for those readers |
| Why this book | a line shown to readers under the book |
| Editorial boost | −3 (rarely) to +3 (often) |
| Never recommend | keeps it out of every plan |

For many at once, fill in a spreadsheet like `setup/formation-books.csv`. It has twenty-eight
titles to start, with suggested tags: review them before use. Then run
`setup/import-formation-books.mjs`. Tick a season only for a book that belongs to it (*In
Conversation with God, Volume 1: Advent*). An evergreen book tied to Lent disappears the rest
of the year.

**Starter rules** live on each quiz page (Customize → the quiz → *Starter rule* blocks): "when the
reader *feels pretty poor about God, religion or the world*, give one of *these books* in
*month 1*". There are thirty-six conditions to choose from: married, parents, priests, leaders,
work that doesn't feel like service, wants to learn … A rule can also name an author ("Jacques
Philippe") instead of books.

Other knobs in each quiz section:
- the **share of bestsellers** (70% by default; the treasure quiz uses 55%);
- the **most books by one author**;
- **books to nudge** in that quiz;
- **topic collections**, which teach the engine whole shelves at once. The default maps 38 of the
  store's real collections (e.g. `fr-jacques-philippe: peace, prayer`). A collection's
  `season:lent` only lifts its books in Lent, and `audience:parents` is only an emphasis:
  collections are merchandising, never a gate. `author:Name` gives an author to the collection's
  books that have no author tag;
- **tags or handles to never recommend** (tag a product `no-quiz`).

## Changing the quizzes

Each quiz section's **Variant** picks the voice. The heading, introduction and start button can
be overridden in the section. The questions' wording lives in `assets/scepter-quiz.js` under
`COPY`, one block per variant. Colours (dark green, light green, burgundy, cream) are section
settings.

- **Burgundy** is the store's own `#84171d`: its logo, its add-to-cart button.
- **The greens** are the brief's; the store itself has none.
- **Type:** the body text uses the store's **Poppins** whenever the theme loads it, as Scepter's
  does. The kit's bundled Source Sans 3 is the fallback. Headings stay in Cormorant Garamond,
  which echoes the serif of the Scepter wordmark.

## The pop-ups

- **Free e-book.** Three *E-book* blocks, one per interest.
  - Each has a label, the free booklet's product (title and cover), and optionally a download
    link: upload the PDF or EPUB in Content → Files.
  - With a link, the reader downloads at once. Without one, the booklet's own page opens: it is a
    $0 product. It opens after a delay, a scroll
  depth, or exit intent (all adjustable). It never shows on a page with a quiz, never twice in a
  session, and stays away 14 days after a dismissal. Any link to `#free-ebook` opens it; so does
  `?sp=ebook` in a URL (useful in ads and emails). The reader can download at once, and gets the
  book by email too when Klaviyo or a webhook is connected. Without one, the thank-you says only
  "ready to download".
- **Temperament test.** A floating button ("What's your temperament?"), plus any link to
  `#temperament-test`.
  - On phones and tablets the button sits 69px up, clear of the store's bottom toolbar (Shop,
    Cart, Account, Search). On product pages it rises above the sticky add-to-cart bar. The
    height is a setting.
  - Pick a book for everyone and one per temperament, matched to the virtue-challenge Havard gives
    each (the dominant temperament decides). The result shows the reader's own book first, marked
    *Written for you*:

    | setting | book | why |
    |---|---|---|
    | For everyone | *From Temperament to Character* | the temperament book itself |
    | Choleric (humility) | *Virtuous Leadership* | leadership as service |
    | Melancholic (boldness) | *Coached by Joan of Arc* | the courageous life |
    | Sanguine (persistence) | *Discovering a Mission* | one mission to persevere in |
    | Phlegmatic (magnanimity) | *Created for Greatness* | magnanimity itself |
    | More books | the `alexandre-havard` collection | |

In the theme editor, clicking either section opens its pop-up so you can see your edits.

## The temperament test

**Alexandre Havard's test, as his page runs it.** Each screen is one statement, answered TRUE or
FALSE, "with the first reaction that appears before thinking".
1. **Stage 1:** sixteen statements, four per temperament, in four rounds. TRUE gives that
   temperament a point. FALSE gives half a point to its opposite (choleric and phlegmatic, sanguine
   and melancholic).
2. **Ties:** if two or more share first place, each asks two more statements. A tie that remains
   goes to more TRUE answers.
3. **Stage 2:** after "Your dominant temperament is …", six statements weigh the two neighbouring
   temperaments.
4. **Result:** one of twelve profiles (*The Doer*, *The Contemplative Doer*, … *The Demonstrative
   Mediator*). It is *pure* when stage 1 was clear and stage 2 was balanced. Otherwise the secondary
   temperament is *light* or *marked*.

A reader answers 22 statements, or 26–30 after a tie. The result gives:
- the profile, and the virtue-challenge (humility, boldness, persistence or magnanimity);
- the four virtue-challenges, the reader's own marked;
- strength, weakness and challenge, in his words, and his line on temperament and character;
- then the Havard books.

`theme/assets/scepter-temperament.js` (`twoStage`) holds the method. Its tests check every rule on
made-up statements. `npm run crosscheck:havard` runs it against Havard's own scoring functions,
taken from his site, on 100,000 random answer sheets: zero differences. A deliberate one-character
change to the purity rule makes it fail.

**Installing it.** The theme ships a placeholder `assets/scepter-temperament-havard.js`. Replace
it with the real file:
- from the private **Heron** repository (branch `claude/scepter-interactive-quizzes-dqo2rl`,
  `scepter-havard/scepter-temperament-havard.js`); or
- by running `npm run import:havard` in `scepter/`. This reads the test from virtuousleadership.com
  and writes `scepter/private/scepter-temperament-havard.js` (git-ignored). Add `--lang es`, `fr`
  or `ru` for his other languages. If his site changes how it scores, the importer refuses and
  says what changed.

Never commit the real file to this public repository. Once HVLI agrees, you can put *"used with
permission"* in the section's **Credit line**. Left blank, the credit reads "Alexandre Havard's
Temperament Test, from Virtuous Leadership (virtuousleadership.com)" and links to his test.

**The stand-in.** Without the file, or with **Question set** switched to *Stand-in questions*,
the pop-up asks twenty-two forced-choice questions of the kit's own. They use the same four
temperaments and the same virtue for each. Each is a block in the section (up to 46). Each of its
four answers counts for one temperament or none, and a question can weigh double. *Stand-in result
words* blocks rewrite the result per temperament. To build a new set from a spreadsheet
(`prompt, answer_1, score_1 … answer_4, score_4, weight`), run
`node scepter/tools/build-temperament-section.mjs questions.csv`. It writes a new preset: remove
and re-add the section to use it. Never present the stand-in as Havard's test.

## Email

Each section sends a new lead to any of the following. Tick or fill in what you use.

- **Omnisend** (the store's platform). Tick *Send it to Omnisend*. The Omnisend app embed must be
  on. The page identifies the reader and records an event on them: *Completed Formation Quiz*,
  *Requested Free E-book* or *Completed Temperament Test*.
  - The event carries everything the email needs, as plain text fields. The quiz event has
    `plan_1_month`, `plan_1_title`, `plan_1_author`, `plan_1_url`, `plan_1_why` … through
    `plan_12_…`, plus `formation_plan_url`, the plan online.
  - Build one automation per event from the templates in `setup/omnisend/`. An event appears as a
    trigger after it has fired once, so take the quiz yourself first.
  - Omnisend's browser API cannot subscribe anyone. The Shopify newsletter path below does that, and
    Omnisend syncs it within the hour.
- **Klaviyo**, if you move to it: the public API key and a list ID. The reader is subscribed (if
  they ticked the box) and the same event is recorded. The flows are in `setup/klaviyo/`.
- **A webhook** (Zapier, Make, your own), as a form-encoded POST including the full JSON. This is
  also a way into Omnisend's server API.
- **Shopify customers**, via the newsletter form, tagged (`scepter-quiz`, `quiz-mission`,
  `persona-peacemaker`, `interest-peace`, `temperament-choleric` …). Only readers who tick the box
  are added. Omnisend syncs them, tags and all, as subscribers.

**Privacy and consent.**
- Religion and gender shape the plan, but they are *not* sent to the email platform unless you tick
  "Send religion and gender" in the quiz section. Neither are the answers that imply them: priest,
  religious, clergy and the order.
- The marketing checkbox is separate from receiving the plan, the e-book or the result. It starts
  unticked, because a pre-ticked box is not valid consent under GDPR or Canada's anti-spam law.
  Only a ticked box subscribes the reader to your list or Shopify's newsletter.
- Under-18s are asked to confirm a parent's permission.
- Plan links carry only book handles, never names or emails.
- The Omnisend event goes to the reader's own contact, and it is what their plan email is made
  from. In Omnisend, send the plan, e-book and result emails to every contact who asked. Keep
  marketing emails to subscribers.
- The plan email itself contains the plan and its title, since that is what the reader asked for.

## For developers

```sh
cd scepter
npm install              # liquidjs and theme-check, for the tests and lint
npm test                 # 72 tests: engine, live catalogue, quiz, temperament, lead capture, Liquid
npm run check:theme      # Shopify theme-check on theme/ (0 offenses)
npm run screenshots      # walks every quiz and pop-up at phone and desktop sizes (Playwright)
node tools/snapshot-store.mjs   # refresh demo/live/ from scepterpublishers.org
npm run import:havard    # Havard's test into private/ (see The temperament test)
npm run crosscheck:havard       # his scoring code against twoStage: must report 0 differences
```

| path | what |
|---|---|
| `theme/assets/scepter-engine.js` | the recommendation engine (pure; runs in the browser and in Node) |
| `theme/assets/scepter-quiz.js` | the quiz: questions, the three voices, branching, results, the plan page |
| `theme/assets/scepter-popups.js` | the pop-up manager, the e-book offer and the temperament test |
| `theme/assets/scepter-temperament.js` | Havard's two-stage method (`twoStage`), the stand-in scoring and questions |
| `theme/assets/scepter-temperament-havard.js` | placeholder for Havard's statements and profiles (the real file is in Heron) |
| `theme/assets/scepter-lead.js` | Klaviyo / Omnisend / webhook / Shopify lead capture |
| `theme/assets/scepter.css` | all styling, as tokens; three variant treatments |
| `theme/sections/*.liquid` | the four sections and their editor settings |
| `theme/snippets/*.liquid` | product JSON, colours, fonts, lead settings |
| `theme/templates/page.scepter-*.json` | the four page templates, pre-filled |
| `setup/` | metaobject definition, CSV import, Omnisend and Klaviyo email templates |
| `demo/` | local preview: `live/` is a snapshot of the store, `mock/` the unit tests' small catalogue |
| `tests/` | `node --test` suites |
| `tools/` | screenshots, theme-check, store snapshot, Havard test importer and cross-check, stand-in preset builder |
| `private/` | git-ignored: where `npm run import:havard` writes Havard's test |

The scripts work on any modern browser and need no build step. They talk to Shopify only through
its public storefront endpoints: `/products.json`, `/products/<handle>.js`, `/cart/add.js` and
`/contact`.

**What was verified, and how:**
- 72 automated tests pass (`npm test`), and theme-check reports 0 offenses.
- **Against the live store** (26 September 2026, public storefront only):
  - All 632 products, 219 collections and every handle the kit names were read.
  - All the product handles in the templates exist and are in stock.
  - One collection, `best-selling-products`, does not exist yet (Install, step 4).
  - Eight very different readers were run through the engine on that catalogue, every plan was
    read, and what read badly was fixed:
    - the store's "Lent" tag had locked *The Way*, its #1 seller, to Lent;
    - a priest never got *Priestly Fatherhood*, because "fatherhood" made it a parents' book;
    - a mother was offered a book for fathers;
    - a business leader got 9 backlist books in 12;
    - some "authors" were "Four Courts Press", "Pocket Size" and "John Paul II. He";
    - prayer books came up as a month's reading;
    - the reasons repeated.

    `tests/live.test.mjs` now holds all eight readers to the promises in ALGORITHM.md.
  - Prices: Shopify's product price is the cheapest variant, usually the $9.99 eBook, while "Add to
    cart" adds the paperback. The kit now shows the price of what it adds.
  - The free work booklet the starter rule used, *Sanctifying Ordinary Work*, is a $0 PDF, which
    plans skip. The rule now names *Holiness Through Work* and *The Sanctification of Work*.
  - The floating temperament button covered the store's mobile toolbar. It now sits above it,
    checked by rendering the kit's CSS over the store's own 390 px screens.
- **Earlier:**
  - An independent review found 12 defects, all fixed and re-checked in Chromium. Among them:
    - the temperament pop-up failed to load when the e-book pop-up sat above it;
    - the result email subscribed people without asking;
    - double taps skipped questions;
    - swapped-out books came back;
    - the Treasures answer colours and focus rings had weak contrast.
  - The Liquid is rendered with liquidjs and mock store objects, and its output is fed through the
    engine.
- Every quiz and both pop-ups were walked end to end in Chromium at 390 px and 1280 px, on the
  live snapshot and with Havard's test, with zero script errors, and every screen was looked at.
- **Not verified:**
  - **Nothing was installed on the store**, so the Liquid has not run on Shopify itself.
  - **Omnisend was not called live.** Its browser API is documented, but whether its templates
    print our fields as written needs one test contact.
  - **The best-selling collection:** once you create it, check that Shopify fills it in
    best-selling order.

  Try all three on a duplicated theme before publishing.

## Store data worth tidying

The kit works around these, but they cost the store elsewhere too:
- **Authors.** About 65 in-stock English books have no author tag (e.g. *The Thoughtful Home*,
  *The Company We Keep*), so no author limit applies to them. The product pages show the author
  from a metafield; adding the same name as a tag fixes it everywhere.
- **Spanish editions without the `Spanish` tag**, e.g. *Moral Fundamental (Fundamental Ethics)*.
  The kit recognises most by their titles.
- **Season tags on evergreen books** (*The Way*: Lent, *Called to Life*: Easter). The kit now
  treats a store tag as a lift, never a lock, so this is only a note.
- **The JSON-LD logo** in the theme points at an old theme-3 asset.
