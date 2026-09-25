# Plan — On Liberty

*Written by the overseer after skimming the work. Fill every section; the pipeline reads the two
fenced blocks (`art` and `blurb`) with `ath plan mill-on-liberty --sync`.*

## The work in five sentences

(what it is, who wrote it, why it lasts, what a reader gets, why Athanasius publishes it)

## Structure decisions

- Divisions: (parts? chapters? numbered points? verse?) — the source's own structure is the default
- Front matter to keep as divisions: (Introductory Note? Preface?) — and what is furniture to drop
- Back matter: (Notes? Glossary? none)
- Apparatus: (footnotes present? how numbered? per chapter?)
- External sequence proof: (e.g. "189 numbered sayings", "12 books", "59 essays") →
  put the number in book.yaml `checks.expected_sections`

## Art brief

Mood and setting in a line: (e.g. "a Roman garden at dusk; stillness; stone and cypress")

```yaml
art:
  movement: landscape        # landscape | romantic | impressionist | marine | genre  (house preference order)
  subjects:                  # phrases matched against painting titles and keywords, best first
    - garden
    - cypress
    - roman ruins
  avoid:                     # extra stop words for this title
    - battle
  cover_note: ""             # anything the picker should know ("no figures", "prefer a river")
```

## Blurb (back cover, 110–150 words)

```blurb
(the back-cover paragraph: plain, confident, no adjectives about the edition, no spoilers;
end with one sentence on why this book belongs on a shelf now)
```

## Go / no-go

- Source quality: (is the best witness the canon setting? scan clean? text layer usable? how many witnesses of the same setting exist?)
- Rights: (work and edition both pre-1931 US? any modern apparatus to cut?)
- Worth the shelf: (who reads this, and why this edition rather than the free Gutenberg file?)
- Decision: GO / NO-GO, in one sentence.

## Edition notes

- Deluxe / Everyman / Scholar: anything edition-specific (an epigraph only in Deluxe? none)
- Signature font: (default La Belle Aurore)

## Rights

- Work first published: 1859. Edition/setting used: the Project Gutenberg transcription of the 1869 fourth edition (Longmans). Public-domain basis: published before 1 January 1931; public domain in the United States
- Any modern apparatus in the source to exclude (introductions, translations, notes after 1930): 

## Risks and open questions

- 

---

## Skim (generated)

**Words:** 55,074. **Headings found:** 18.

Headings (first 40): I. · II. · III. · CHAPTER I. · CHAPTER II. · CHAPTER III. · CHAPTER IV. · CHAPTER V. · CHAPTER I. · CHAPTER II. · CHAPTER III. · CHAPTER IV. · CHAPTER V. · Section 1.  General Terms of Use and Redistributin · Section  2.  Information about the Mission of Proj · Section 3.  Information about the Project Gutenber · Section 4.  Information about Donations to the Pro · Section 5.  General Information About Project Gute

**Opening:**

> The Project Gutenberg EBook of On Liberty, by John Stuart Mill This eBook is for the use of anyone anywhere at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at www.gutenberg.org Title: On Liberty Author: John Stuart Mill Release Date: January 10, 2011 [EBook #34901] Language: English Character set encoding: ASCII *** START OF THIS PROJECT GUTENBERG EBOOK ON LIBERTY *** Produced by Curtis Weyant, Martin Pettit and the Online Distributed Proofreading Team at http://www.pgdp.net On Liberty. By John Stuart Mill. With an Introduction by W. L. Courtney, LL.D. The Walter Scott Publishing Co., Ltd. London and Felling-on-Tyne New York and Melbourne _To the beloved and deplored memory of her who was the inspirer, and in part the author, of all that is best in my writings--the friend and wife whose exalted sense of truth and right was my strongest incitement, and whose approbation was my chief reward--I dedicate this volume. Like all that I have written for many years, it belongs as much to her as to me; but the work as it stands has had, in a very insufficient degree, the inestimable advantage of her revision; some of the most important portions having been reserved for a more careful re-examination, which they are now never destined to receive. Were I but capable of interpreting to the world one-half the great thoughts and noble feelings which are buried in her grave, I should be the medium of a greater benefit to it than is ever likely to arise from anything that I can write, unprompted and unassisted by her all but unrivalled wisdom._ INTRODUCTION. I. John Stuart Mill was born on 20th May 1806. He was a delicate child, and the extraordinary education designed by his father was not calculated to develop and improve his physical powers. "I never was a boy," he says; "never played cricket." His exercise was taken in the form of walks with his father, during which the elder Mill lectured

**Closing:**

> states who approach us with offers to donate. International donations are gratefully accepted, but we cannot make any statements concerning tax treatment of donations received from outside the United States. U.S. laws alone swamp our small staff. Please check the Project Gutenberg Web pages for current donation methods and addresses. Donations are accepted in a number of other ways including checks, online payments and credit card donations. To donate, please visit: http://pglaf.org/donate Section 5. General Information About Project Gutenberg-tm electronic works. Professor Michael S. Hart is the originator of the Project Gutenberg-tm concept of a library of electronic works that could be freely shared with anyone. For thirty years, he produced and distributed Project Gutenberg-tm eBooks with only a loose network of volunteer support. Project Gutenberg-tm eBooks are often created from several printed editions, all of which are confirmed as Public Domain in the U.S. unless a copyright notice is included. Thus, we do not necessarily keep eBooks in compliance with any particular paper edition. Most people start at our Web site which has the main PG search facility: http://www.gutenberg.org This Web site includes information about Project Gutenberg-tm, including how to make donations to the Project Gutenberg Literary Archive Foundation, how to help produce our new eBooks, and how to subscribe to our email newsletter to hear about new eBooks.
