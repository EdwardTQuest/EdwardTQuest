# Playbook: what the quizzes decide, and what to send afterwards

For whoever writes the emails and runs the store. `README.md` covers installation.

## How a reader is placed

### Find Your Next Step

1. **What they say** about their faith sets the starting point: *curious / preparing to become
   Catholic* (Seeking), *drifted and drawn back* (Coming Home), *Catholic but unsteady* (Taking Root),
   *practising* (Growing Deeper), *faith is central* (Bearing Fruit).
2. **What they do** corrects it for practising Catholics. Prayer, Mass and reading each score 0 to 4 and
   are averaged. "I can't get to Mass right now" is left out of the average, never counted as zero.
   - average under 2.5: **Taking Root**, whatever they said
   - 2.5 or more: **Growing Deeper**
   - 3.4 or more *and* they invite or encourage others: **Bearing Fruit**
   - someone who says "I'm central" but rarely prays lands in Taking Root, and someone modest who prays
     daily and reads daily is not held back by it. Habits decide; self-description nudges by a quarter point.
3. **Seeking** and **Coming Home** are never changed by habits, with one exception: a returning reader
   who already prays, goes to Mass and reads steadily is **Taking Root**. A seeker who prays daily is still
   Seeking (toward the Catholic faith), and the result tells them their prayer is a gift.
4. **Needs** (up to three) come from what they tick, plus their life season (married gets *marriage*,
   a parent gets *raising children*, a student or single reader gets a nudge toward *purpose*) and the
   optional Confession question (*it's been a long time* adds *Confession and the Mass*).
5. **Age** and **life season** come straight from their answers. Under-18 readers are not asked their life
   season and are treated as students.

### Find a Book for Someone You Love

The giver's best guess about the recipient's faith sets the stage. Children are not given a stage at all;
they are offered only children's titles. Everything about the recipient is stored with a `gift-` prefix,
and the recipient is never named or contacted.

### How books are chosen

Each book is scored on stage (+6, or +2 for a neighbouring stage), each chosen need (+8, +5, +3 in order
of importance), age (+3 if written for that age, −6 if for another), life season (+3), reading format (+2),
language, and a small push for flagship titles. The top three are picked with a penalty for repeating an
author or a series, so three picks are never one author three times. Children's and teens' books are offered
only to that age group, their parents, or a gift buyer. English readers never see Spanish editions and
Spanish readers see Spanish first. *To Be a Man* is excluded from automatic picks (the quiz does not ask
sex, and a girl should not be sent it); show it from a link or a "for young men" page.

## What to send afterwards

Build the flow on the tags or on the **Completed Scepter Quiz** event. Four rules apply to every email:

- **No grades.** Never write that someone has "moved up", never name stages side by side, never say
  "level", "beginner" or "advanced".
- **No quotations** from saints, popes or St. Josemaría unless an editor copies them word for word from
  a Scepter edition and notes the page. Never put a paraphrase in quotation marks.
- **No promotions in the first two emails.** The first is the ebook, the second is one useful idea.
- **One click to fewer emails**, and a frequency cap that counts the newsletter, *Daily Quotes to
  Contemplate* and *Sunday Resources* a reader may already get.

### Welcome series (three emails over about two weeks, branched on `stage`)

| stage | email 1 (day 0) | email 2 (day 3) | email 3 (day 10) |
|---|---|---|---|
| **Seeking** | the ebook; "no pressure, read it when you like" | a short answer to one common question (from *The Faith Explained* or *Life of Jesus*) | an invitation to read one Gospel chapter, plus one book |
| **Coming Home** | the ebook; "you're welcome back, whenever you're ready" | how to find Confession times and what to say (*A Guidebook for Confession*) | an idea from *Home Again*, and Mass times near them if known |
| **Taking Root** | the ebook; one habit to try this week | a ten-minute prayer routine (*Time for God*, *The Way*) | a daily reading book, offered not pushed |
| **Growing Deeper** | the ebook; the step from the result | on Confession and spiritual direction (*Frequent Confession*) | a deeper book in their top need |
| **Bearing Fruit** | the ebook; the step from the result | a saint's life or a retreat (*To Make a Good Retreat*) | a book to lend a friend |

Vary the *content* by top need (use the `need-*` tags), and the *voice* by age and life season
(`life-parent-young` gets "five minutes with children around"; `age-65-plus` gets large print and weekday
Mass). `guardian-signup` readers get the same ebook addressed to the parent and **no marketing to the teen**.

### Gift finder

Email 1 is the ebook. Email 2, a week later, is the three picks again with one line each and an offer of
free shipping if you run one. If the recipient is `gift-stage-returning` or `gift-stage-exploring`, write
for a giver who wants to be gentle: no scripts for conversations, no "how to bring them back".

### Seasonal sends

`need-seasons` readers should be first to hear about Advent, Lent and the feasts. Gift finders go out in
the six weeks before Advent, in spring for First Communion and Confirmation, and before Mother's and
Father's Day.

## Delivery of the free ebook

Each free ebook in `quiz/data/magnets.js` is one of Scepter's own free booklets. Two ways to deliver it:

1. **A direct link (best).** Upload the PDF or EPUB (Shopify > Content > Files, or your storage bucket) and
   paste its URL into that booklet's `download` field. The reader gets a **Download now** button the moment
   they sign up. Send the same link in email 1 as a backup.
2. **Email only.** Leave `download` empty. The reader is told it is on its way, and offered the free Scepter
   app. **Then you must have an email flow that sends the booklet**, triggered by the tag or the event, or the
   page makes a promise nothing keeps.

The delivery email is a service message: send it even to someone who did not tick the marketing box in
`checkbox` mode. Only the later emails need consent.

## Privacy and consent

- **What is sensitive.** Religious belief and practice count as sensitive personal data under GDPR and under
  several US state privacy laws. The record sent to your email system holds only derived categories (age band,
  stage, needs, life season, language), never the raw answers about Mass, Confession or prayer. Switching on
  `capture.includeAnswers` changes that; do so only after legal review.
- **Consent.** Use `mode: 'notice'` for the US (clear notice under the button) and `mode: 'checkbox'`
  (unticked) for the EU, UK and Canada. The Shopify and Klaviyo adapters subscribe someone to marketing only
  if they agreed.
- **Minors.** Under-13s are not offered the reader quiz as such: the youngest age choice is "Under 18" and it
  asks for a **parent or guardian's email**; the gift finder reaches children only through an adult. Have
  counsel confirm this against COPPA and your state's rules before launch.
- **Retakes.** Someone who retakes a quiz replaces their old tags. Remove `quiz-*`, `age-*`, `stage-*`,
  `need-*` and `life-*` before adding the new ones, and never let `gift-*` tags overwrite reader tags.
- **Deletion.** Anyone can ask to have their record removed; the quiz stores nothing else about them. The
  page itself keeps answers only in the browser's session storage, cleared when the tab closes or on
  **Start over**.

## Before launch

1. **Open every link.** `node funnels/build.mjs --links` lists all 99 books and 12 booklets with their URLs
   and authors. They were found through web searches of scepterpublishers.org (the site could not be opened
   from the build machine). A handle may have moved, and some titles had no author in the search result
   (12 lines say *author not confirmed*). Fix or remove anything that does not open.
2. **Check what was flagged while researching.** *Writing "The Way"* was left out of the catalog
   because its author could not be confirmed. Three titles are `preorder` links (*The Busy Parent's Guide*,
   *The Fire and the Silence*, *Rekindled Hearts*; confirm they are available) and *Crucibles* was
   scheduled for release in September 2026. The *Handbook of Prayers* and *Daily Roman Missal* are sold by Scepter, but
   confirm they are Scepter's own editions before calling them that in copy.
3. **Add the ebook files.** Only the booklet titles are known. The 50 or so free booklets that exist can be
   added to `magnets.js`; each needs stage and need tags.
4. **Have the copy read.** A priest or catechist (ideally one who gives spiritual direction) should read every
   stage portrait, step and note, especially the Coming Home steps, the Seeking steps for the unbaptized (they
   are never sent to Confession) and the line pointing to a priest or to 988 for readers going through
   something hard. The 988 line is US-only; replace it for other countries.
5. **Check the look.** Scepter's brand colours and fonts could not be read, so the quizzes use the house
   palette (deep green, sand and cream; EB Garamond and Cinzel). Override the `--sq-*` tokens at the top of
   `quiz/src/quiz.css` to match the store, or tick "use theme fonts" in the section.
6. **Spanish.** The Spanish books appear for readers who choose Español, but the questions and results are
   in English. A full Spanish version is a copy job, not an engineering one.
7. **Run the pilot.** Send the quiz to 150 to 200 newsletter readers first. Watch completion by question
   (`scepter_quiz_*` events), and adjust the habit thresholds in `next-step.js` if too many readers land in
   one stage. A result is a good fit when it feels recognisable to the reader; ask them.

## Known limits

- The recommendations are only as good as the tags in `catalog.js`. They are a first pass made from titles
  and short descriptions and need an editor's eye; the five-stage and fourteen-need vocabulary is meant to be
  tightened as you see what readers pick.
- The Shopify adapter relies on the store's own sign-up form. If Shopify shows a captcha, the quiz shows it
  inside the page and the reader still gets their ebook.
- The covers on the result are plain placeholders unless the quiz runs on the store, where it fetches the real
  cover and price from each product page.
