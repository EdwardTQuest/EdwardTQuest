# How the catalogues were found (25 September 2026)

## Method and its limits

The build container's network blocks every bookseller and publisher site (amazon.co.uk,
amazon.com, amazon.com.au, scepter.uk, scepterpublishers.org, scepterpublishersafrica.co.ke,
sinagtalapublishers.wordpress.com, veritatis.com.au, freedompublishingbooks.com.au, openlibrary.org).
Page fetches were refused. The only channel was web search. It returns result titles, URLs and a
short summary, and its session budget is 200 queries, which four parallel research runs used up.

Each shop's catalogue came from one research run with five stages:

1. Four angle sweeps: the publisher's own site, Amazon, ISBN and retail catalogues, authors and series.
2. A gap hunt for titles the sweeps missed. It ran dry once the budget was gone.
3. Consolidation into canonical entries and shelves.
4. Per-title verification: a verdict, a reason, sources and a one-sentence description.
5. A skeptic's review of the whole list: duplicates, other publishers' titles, author spellings,
   descriptions that were hype, provenance notes or unverifiable.

Verdicts: **confirmed** means a source ties the title to the house (its own page, or its own ISBN
prefix). **Likely** means strong indirect evidence. **Doubtful** means weak evidence. **Range**
(Kenya only) means an author or series the house says it carries, where this particular title was
not seen on its pages. The shops list confirmed, likely and range titles. Doubtful titles stay in
`data/<shop>.json` and appear only with `build.py --all`.

No description, author, ISBN or price was invented. Where the research found nothing, the field is
empty. Some author names and descriptions were filled by the skeptic reviewer from general
knowledge, after the search budget ran out (for example Footprints in the Snow → Dennis M. Helming;
Opus Dei: A History → González Gullón & Coverdale). The entry's `evidence` field says where each
came from.

## Per shop

| shop | listed | confirmed | likely | range | held back (doubtful) | dropped |
|---|---|---|---|---|---|---|
| Scepter UK | 23 | 17 | 6 | – | 10 | 7 |
| Sinag-Tala | 35 | 29 | 6 | – | 1 | 3 |
| Scepter Kenya | 22 | 4 | – | 18 | – | – |
| Scepter Australia | 45 | 9 | 36 | – | 13 | 8 |

**Scepter UK.**
- Scepter (U.K.)'s own ISBN prefix is 0-906138 / 978-0-906138, confirmed on Furrow, Friends of
  God, The Way of the Cross, Mary of Nazareth, Joseph of Nazareth, In Conversation with God (the
  set) and The Way: Critical-Historical Edition.
- Titles with a scepter.uk page are confirmed: Putting Down Roots, Interior Freedom, Jesus as
  Friend, Christ on Earth, Successful Fathers, The Four Last Things, Our Lives in His Hands and Junia.
- Held back: ten Scepter Publishers (US) editions seen only on Amazon UK (Stenson, Burke, Chevrot,
  Berglar, Saxum, the one-volume Way/Furrow/Forge, a study guide). The owners can confirm which
  they stock; `--all` shows them.
- Dropped: six more US-only editions and a scepter.uk interview page that is not a book.

**Sinag-Tala.**
- Most titles come from its own WordPress catalogue pages (Escrivá, spirituality, Bibles and
  catechism, guidebooks, lives, children, philosophy).
- Its ISBN prefixes are 971-117 and 971-554.
- Christ on Earth (Joseph Pich) is the Sinag-Tala edition that scepter.uk sells.
- Held back: Kristong Hari, a Tagalog homily post, not shown to be a product.

**Scepter Kenya.**
- Its own shop (scepterpublishersafrica.co.ke / .com) was almost invisible to search. Four
  titles were seen there: Way of the Cross, Reasons for Making a Retreat, the Navarre Bible and
  In Conversation with God.
- Its site says it carries St Josemaría's works, Jacques Philippe, Fulton J. Sheen, In Conversation
  with God and the Navarre Bible. The shop is stocked with those authors' Scepter titles from the
  verified UK and Australia lists, marked `range`.
- It also carries Margaret A. Ogola's The River and the Source, a Scepter title by a Kenyan author.
- Confirm the range against Scepter Kenya's stock list.

**Scepter Australia.**
- No stand-alone Scepter Australia was found. Scepter titles reach Australia through Veritatis
  Publishing and Freedom Publishing Books (Melbourne), and this shop lists what they carry.
- Dropped as other publishers' books: Searching for and Maintaining Peace (Alba House), the Daily
  Roman Missal (Midwest Theological Forum) and Moments Divine (TAN).
- Also dropped: five placeholder entries with no author, subject or Scepter evidence.

## Prices

None are shown yet: no Amazon price was visible to search. Five prices were seen elsewhere, and
`data/prices/<shop>.csv` (column `seen_elsewhere`) keeps them for reference only:

- Scepter Kenya's own shop: Way of the Cross, KSh 320.
- Sinag-Tala's 2022 price list: The Catholic Bible in Pictures, ₱795.
- Freedom Publishing Books, from search summaries: three AUD prices.

## To finish the catalogues and prices

Allow these hosts in the environment's network settings. The shops' own pages can then be read
whole, and every Amazon price filled in one pass:

- **Catalogues:** scepter.uk, scepterpublishersafrica.co.ke, sinagtalapublishers.wordpress.com,
  sinagtalapublishersph.wordpress.com, public-api.wordpress.com, veritatis.com.au,
  freedompublishingbooks.com.au, scepterpublishers.org.
- **Prices:** amazon.co.uk, amazon.com, amazon.com.au.

Or raise the web-search budget (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`). Or paste the owners'
stock lists and prices into `data/`.
