# How a reader gets their books

The formation plan is twelve books, one a month, starting this month (or next month after the
20th). It is built by `theme/assets/scepter-engine.js` in the reader's browser the moment they
enter their email. Nothing is sent to a server to decide it. This page explains every step, and
every knob an admin can turn. The tests in `tests/engine.test.mjs` hold the engine to each promise
made here.

**In one sentence:** the answers become a set of *needs*, every book becomes a set of *themes*,
each month gets a *season* and a *depth*, and the year is filled month 1 first. Each pick weighs
how well a book meets the needs against popularity, season, depth and variety. Then some months
are handed to the backlist, wherever that costs the reader least.

## 1. Answers become needs

Each answer adds weight to one or more of nineteen themes: peace, prayer, hope, virtue, work,
leadership, marriage, family, doctrine, scripture, saints, Our Lady, priesthood, religious life,
friendship, story, classic, seeker (a way in for newcomers) and culture. The strongest need is then
scaled to 1.

| the reader says | the needs it raises |
|---|---|
| God feels pretty poor (1–2 of 5) | peace (strongly), hope, prayer |
| Religion feels pretty poor | a way in (seeker), doctrine, saints, culture |
| The world feels pretty poor | peace, hope, culture |
| All three feel good (4+) | friendship (share it), prayer, leadership |
| Faith: on fire / growing / steady / dry / doubting / distant / none | apostolate and classics / prayer and virtue / doctrine / prayer and peace / doctrine and a way in / a way in and peace / a way in and virtue |
| Married (and how long), engaged, widowed, single | marriage (stronger in the first five years), marriage prep, hope, friendship |
| Children | family, more with each child up to four |
| Home life 4 or lower out of 10 | peace, hope, and family or marriage if they apply |
| Priest (secular or religious, parish or not) | priesthood (strongly), prayer, Scripture; leadership for a parish, doctrine otherwise |
| Religious (and the order) | religious life, prayer, classics. The order is named in the reasons |
| Work: business, a profession, trades, home, ministry, a student, retired… | the matching mix of work, leadership, virtue, family… |
| Work feels stretched, burned out or restless | peace, hope, work |
| Work serves God and others: not at all (1–2 of 5) | work, strongly. This is the heart of Scepter's message |
| Grow / learn / discover | prayer, virtue and classics / doctrine and Scripture / saints, stories and culture |
| Age under 25 / over 65 | friendship and story / hope, prayer, saints |
| Not Catholic (Orthodox, Protestant, LDS, Muslim, Jewish, other, none) | a way in first; bridges before insider books |

Gender only matters for a book an admin has marked "Men" or "Women". It is never used to guess
interests.

**"If pretty poor, that's a Jacques Philippe."** A reader is *struggling* when the average of the
three feelings is 2.3 or lower, or any one of them is at the very bottom. For them, month 1 is a
Jacques Philippe book. This is an editable starter rule (below), *and* it is built into the engine,
so it survives even if every rule is deleted.

## 2. Books become themes

The engine reads the whole published catalogue (`/products.json`, fetched while the reader
answers, cached for six hours) plus what the page itself carries. Every book is described four
ways, most trusted first:

1. **The curated library.** Content → Metaobjects → Formation book: themes, who it is for,
   depth, seasons, "start with this book when…", a "why" line, an editorial boost from −3 to +3,
   and "never recommend".
2. **Scepter's own topic collections.** The "Topic collections" box maps collections to themes.
   For example, `fr-jacques-philippe: peace, prayer`, or `lenten-and-easter-collection: season:lent`.
3. **Tags and words.** Keyword families per theme, weighted three times in the title, twice in
   tags, once in the description. Common words like "work", "home" or "priest" count only in
   titles and tags, because author bios are full of them. "Mother of God", "the Church Fathers"
   and "God the Father" are not family words.
4. **Its shape:**
   - **Author:** a vendor that is not a publisher, else a person-like tag, else a byline ("*Title*
     by X", "By X", "written by X"). Otherwise the author named for one of its topic collections
     (`author:Name`), else the author of another edition of the same work. Scepter's store tags
     *The Way* with no author, but *The Way, Furrow, The Forge* with St. Josemaría, so both get
     him.
   - **Never an author:** co-publishers (Four Courts Press, Relevant Radio …); series and format
     tags (Pocket Size, Little Douglings); a saint named in the title, who is the subject (*Simon
     Peter* is by Georges Chevrot). Of two spellings, the fuller wins (Alexandre over Alex Havard).
   - **Depth:** a booklet is gentle, a commentary deep.
   - **Seasons, in the title** ("Advent", "Lent", "Passion", "Risen", "Holy Spirit" …).
   - **Calendar windows:** *In Conversation with God, Weeks 13–23* belongs to June–September;
     *Feasts, January–June* to the first half of the year.

**Kept out:**
- sold-out items and free booklets;
- gift cards and missals, breviaries and lectionaries;
- sets, packs, bundles, "… Collection" boxes, mystery books and study guides, unless curated;
- Spanish editions, by tag or by title ("*La misa explicada (The Mass Explained)*");
- anything tagged `no-quiz` or `Missal`, and handles listed in the settings.

On the live store that keeps 332 of 632 products. **Editions are
one work:** *The Way (Mini Edition)* and *Large Print — The Way, Furrow, The Forge* never both
appear. Nor do *The Faith Explained* and *The Faith Explained Today*.

**Who a book is for.** Named audiences are a gate: a book for "Married" goes only to married or
engaged readers. With "Everyone" added, the named audiences become an emphasis instead: "Everyone;
Married; Parents" goes to anyone, and a little more often to couples with children.

Audiences come from the curated library, or from a title that plainly names them. Priests,
marriage, parents and religious life count. A book for fathers ("*Father, The Family
Protector*") must match both parenthood and sex. *Priestly Fatherhood*, the Church Fathers and
*Mother of God* name no family audience.

An audience given to a topic collection (`audience:parents`) is only an emphasis, never a gate.
Store collections are merchandising: Scepter's "Great Books for Fathers and Fr.'s" mixes dads and
priests.

**Bestseller or backlist.** A book is a bestseller if it is in the Bestsellers collection (whose
order is its rank) or in the first 50 of the best-selling collection (an automated collection
sorted by *Best selling*). Everything else is backlist. On the live store that makes 48
bestsellers.

## 3. The calendar

Easter is computed (the Gregorian computus), and from it Lent, Holy Week, Pentecost; with
Advent (the Sunday between 27 November and 3 December) and Christmas. Each month carries the
seasons that cover at least a week of it, plus its devotional character: May and October for Our
Lady, June the Sacred Heart, November the saints and souls, July–August summer reading, January
the new year, September back to work.

A book tied to a liturgical season is kept for that season: an Advent book is never read in July.
"Tied" means the season is in its title, or ticked in the library. A book for Advent and Christmas
belongs to Advent, not January. A book with a calendar window stays inside it.

A store's season **tags** and seasonal **collections** only lift a book in its season. They never
hold it there. Scepter tags *The Way* "Lent" because it is good Lenten reading, not because it
belongs to Lent alone. Such a book is labelled "For Lent" only in the month where Lent is the
main season.

## 4. The score for one book in one month

```
relevance  = how closely the book's themes match the reader's needs (cosine),
             × how sure we are of those themes (√ of the evidence, capped at 1)
             + a small lift if it serves the reader's single strongest need
score      = (0.15 + relevance)
             × audience   (0.3 closed to them … 1.0 open … 1.3 made for them; ×1.1 more if a
                           topic collection names their audience)
             × faith fit  (newcomers: bridges ×1.35, insider books ×0.2 early)
             × depth fit  (0.55 + 0.45 × closeness to this month's target depth)
             × season     (×1.45 in its season, ×0.25–0.3 out of it; a store tag or collection
                           only lifts, ×1.15 in season)
             × reference  (prayer books and bibles ×0.35 in month 1, ×0.5 later)
           + popularity   (0.11–0.22 for a bestseller by rank; a little for trending)
           + editorial    (boost × 0.06; "featured in this quiz" +0.12; "start with this
                           book when…" +0.35 in months 1–3; large print −0.05)
```

Depth rises through the year, from about 1.5 ("gentle") to about 2.5. It starts higher for
priests, religious, readers on fire and readers who want to learn, and lower for newcomers and the
young. Month 1 is kept gentle; summer is a little lighter.

## 5. Building the year

1. **Starter rules first**, top to bottom: "when the reader … give one of these books in month N".
   The admin's listed order is a preference, and relevance breaks near-ties. If the month is
   taken, the next free month is used. Rules ship for struggling (Jacques Philippe, month 1),
   priests (month 1), leaders (Havard, month 2), work that feels empty (*Sanctifying Ordinary
   Work*, month 3) and non-Catholics (*The Faith Explained*, month 4).
2. **Month 1** leans twice as hard on the reader's strongest need and stays gentle. Unless a rule
   placed it, month 1 is always a bestseller, a proven favourite, even when a backlist book scores
   higher.
3. **Then every other month**, in order: the best-scoring eligible book, bestsellers preferred.
   A backlist book still wins if the best bestseller is under 80% as good. Each pick is also
   penalised for resembling what is already chosen (maximal marginal relevance), so the year
   covers the reader's needs rather than repeating the first one.
4. **Hard rules:** no work twice, at most two books by one author (adjustable), never the same
   author two months running.
5. **Then the bestsellers come back in** if strong backlist books took more months than the share
   allows. The engine swaps favourites in where it costs least, but only a favourite at least 60% as
   good. A reader whose needs the favourites serve poorly still gets the best books for them.
6. **Then the backlist comes in** where it costs least. With a 70% bestseller share, four of twelve
   months (the treasure quiz uses 55%, so five). Each time, the engine finds the month whose best
   *still-available* backlist book loses least against the bestseller there, adds a penalty for
   sitting next to another gem, and switches it. It never touches month 1 or a rule's month. It
   never takes a backlist book that is less than half as good as the book it replaces: quality
   beats the quota.
7. **A seeded shuffle.** A tiny random nudge (at most 0.05), seeded by the reader's email and the
   quiz, means the same reader always gets the same plan. Two similar readers still discover
   slightly different backlist books, so the whole backlist gets seen over time.

## 6. The words

Every month says why, in the reader's own terms: "Because you are raising three children, and
you have been married more than five years." The strongest reason always leads. A second reason
is added only if it is at least 45% as strong and has not already been given twice. So twelve
months don't all say the same two things, and none gives a weak reason. An
admin's "why" line, or a rule's note, is shown beside it. Each book is tagged **Reader favorite**
(any bestseller) or **Hidden gem** (the backlist), plus its season (**For Lent**, **For Advent**, **In season**,
**Summer read** …). The result also names the reader's road (eleven archetypes, worded differently in
each quiz, e.g. *The Peacemaker* / *The Road to Still Waters* / *The Peace That Passes
Understanding*). It gives one practice for the first week, drawn from the strongest need.

A reader who has already read a book can **swap** it, month 1 included. The next-best book for
that month comes in, from the month's own shelf (bestseller or backlist), under the same rules. No
book the reader has swapped out comes back, in any month.

## A worked example

A Catholic mother of three, 35–44, married for more than five years, in an office job that feels
stretched and does not feel like service (2 of 5). God and the world feel poor (2), religion so-so
(3). Prayer is dry, home is a 5 of 10, and she wants to grow. Her needs: peace 1.0, prayer 0.69,
work 0.65, hope 0.54, family 0.46. She is struggling, so she is *The Peacemaker*.

This plan comes from the snapshot of the live catalogue (`demo/live/`, 26 September 2026),
starting October 2026, with the section's default settings:

| month | book | author | tags | why |
|---|---|---|---|---|
| Oct | Interior Freedom | Fr. Jacques Philippe | Reader favorite | God, the Church or the world feel heavy right now, and prayer has felt dry lately |
| Nov | Praying from the Depths of the Psalms | Fr. John Henry Hanson | Reader favorite | (the same two reasons) |
| Dec | Holiness Through Work | Fernando Ocáriz | Hidden gem | you would like your work to mean more, and you want to grow in virtue |
| Jan | Nine Days to Rediscover the Joy of Prayer | Fr. Jacques Philippe | Reader favorite | God, the Church or the world feel heavy right now |
| Feb | From Resentment to Forgiveness | Francisco Ugarte | Reader favorite, For Lent | … feel heavy right now, and some stretches of the road are hard |
| Mar | The Way of the Cross | St. Josemaría Escrivá | Reader favorite, For Lent | some stretches of the road are hard |
| Apr | Anchor: God's Promises of Hope to Parents | James Stenson | Hidden gem | you are raising three children |
| May | A Man Who Knew How to Forgive | Francesc Faus | Hidden gem | God, the Church or the world feel heavy right now |
| Jun | The Bishop of the Abandoned Tabernacle | Victoria Schneider | Reader favorite | prayer has felt dry lately |
| Jul | Three to Get Married | Archbishop Fulton Sheen | Reader favorite, Summer read | you are raising three children, and you have been married more than five years |
| Aug | Decisive Parenting | Michael Moynihan | Hidden gem | God, the Church or the world feel heavy right now |
| Sep | How to Profit from Your Faults | Joseph Tissot | Reader favorite | prayer has felt dry lately, and you want to grow in virtue |

- **Mix:** eight favourites and four gems, by eleven authors. Jacques Philippe comes first, as
  his rule says, and he is limited to two books.
- **The work rule:** *Holiness Through Work* arrives in month 3.
- **Seasons:** Lent books fall in Lent.
- **Prices:** each is the paperback's, as "Add to cart" charges.

Her first-week practice: *"Each morning this week, before you look at your phone, give God five
quiet minutes and hand Him one worry by name."*

`tests/live.test.mjs` runs eight very different readers against the same snapshot. It checks the
promises on this page: twelve English books a year at cart prices, the author and work rules,
the bestseller share, the rules for struggling readers, priests and newcomers, fathers' books,
seasons, and authors.

## What to tune, and where

| to… | do this |
|---|---|
| change how many backlist books appear | quiz section → Share of bestsellers (50–95%) |
| put a book in front of certain readers | quiz section → add a Starter rule |
| make a book come up more, or never | Formation book → Editorial boost, or Never recommend |
| say who a book is for | Formation book → Good for (with or without "Everyone") |
| keep a book for its season | Formation book → Seasons |
| teach the engine a whole shelf | quiz section → Topic collections (`collection-handle: themes`, `season:lent`, `audience:parents`, `author:Name`) |
| nudge books in one quiz only | quiz section → Give these books a nudge |
| stop a product ever appearing | tag it `no-quiz` |

The engine is only as good as what it knows. The keyword reading gets a sensible plan from an
untagged catalogue. Curating the fifty titles that matter most, in the Formation book library,
makes it excellent. `setup/formation-books.csv` is a starting point for twenty-eight of them.
