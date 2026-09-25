# Plan — Ethics

*Written by the overseer after skimming the work. Fill every section; the pipeline reads the two
fenced blocks (`art` and `blurb`) with `ath plan spinoza-ethics --sync`.*

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

- Work first published: 1677. Edition/setting used: the Elwes translation of 1883 (Project Gutenberg #3800). Public-domain basis: published before 1 January 1931; public domain in the United States
- Any modern apparatus in the source to exclude (introductions, translations, notes after 1930): 

## Risks and open questions

- 

---

## Skim (generated)

**Words:** 90,985. **Headings found:** 281.

Headings (first 40): PART I. CONCERNING GOD. · PROP. I.  Substance is by nature prior to its modi · PROP. II.  Two substances, whose attributes are di · PROP. III.  Things which have nothing in common ca · PROP. IV.  Two or more distinct things are disting · PROP. V.  There cannot exist in the universe two o · PROP. VI.  One substance cannot be produced by ano · PROP. VII.  Existence belongs to the nature of sub · PROP. VIII.  Every substance is necessarily infini · PROP. IX.  The more reality or being a thing has,  · PROP. X.  Each particular attribute of the one sub · PROP. XI.  God, or substance, consisting of infini · PROP. XII.  No attribute of substance can be conce · Prop. v.) will perforce consist of a different att · PROP. XIII.  Substance absolutely infinite is indi · PROP. XIV.  Besides God no substance can be grante · PROP. XV.  Whatsoever is, is in God, and without G · Prop. xii.).  Wherefore the weapon which they aime · PROP. XVI.  From the necessity of the divine natur · PROP. XVII.  God acts solely by the laws of his ow · PROP. XVIII.  God is the indwelling and not the tr · PROP. XIX.  God, and all the attributes of God, ar · Prop. vii.); therefore, eternity must appertain to · PROP. XX.  The existence of God and his essence ar · PROP. XXI.  All things which follow from the absol · PROP. XXII.  Whatsoever follows from any attribute · PROP. XXIII.  Every mode, which exists both necess · PROP. XXIV.  The essence of things produced by God · PROP. XXV.  God is the efficient cause not only of · PROP. XXVI.  A thing which is conditioned to act i · PROP. XXVII.  A thing, which has been conditioned  · PROP. XXVIII.  Every individual thing, or everythi · PROP. XXIX.  Nothing in the universe is contingent · PROP. XXX.  Intellect, in function (actu) finite,  · PROP. XXXI.  The intellect in function, whether fi · Prop. xv. and Def. vi.), through some attribute of · PROP. XXXII.  Will cannot be called a free cause,  · PROP. XXXIII.  Things could not have been brought  · PROP. XXXIV.  God's power is identical with his es · PROP. XXXV.  Whatsoever we conceive to be in the p…

**Opening:**

> The Project Gutenberg EBook of The Ethics, by Benedict de Spinoza This eBook is for the use of anyone anywhere at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at www.gutenberg.net Title: The Ethics Author: Benedict de Spinoza Posting Date: May 28, 2009 [EBook #3800] Release Date: February, 2003 First Posted: September 26, 2001 Last Updated: December 11, 2017 Language: English Character set encoding: ASCII *** START OF THIS PROJECT GUTENBERG EBOOK THE ETHICS *** Produced by Tom Sharpe. HTML version by Al Haines. The Ethics (Ethica Ordine Geometrico Demonstrata) by Benedict de Spinoza Translated from the Latin by R. H. M. Elwes PART I. CONCERNING GOD. DEFINITIONS. I. By that which is self--caused, I mean that of which the essence involves existence, or that of which the nature is only conceivable as existent. II. A thing is called finite after its kind, when it can be limited by another thing of the same nature; for instance, a body is called finite because we always conceive another greater body. So, also, a thought is limited by another thought, but a body is not limited by thought, nor a thought by body. III. By substance, I mean that which is in itself, and is conceived through itself: in other words, that of which a conception can be formed independently of any other conception. IV. By attribute, I mean that which the intellect perceives as constituting the essence of substance. V. By mode, I mean the modifications[1] of substance, or that which exists in, and is conceived through, something other than itself. [1] "Affectiones" VI. By God, I mean a being absolutely infinite--that is, a substance consisting in infinite attributes, of which each expresses eternal and infinite essentiality. Explanation--I say absolutely infinite, not infinite after its kind: for, of a thing infinite only after its kind, infinite attributes may be denied; but that which is absolutely infinite, contains in its essence whatever expresses reality, and involves no negation.

**Closing:**

> who approach us with offers to donate. International donations are gratefully accepted, but we cannot make any statements concerning tax treatment of donations received from outside the United States. U.S. laws alone swamp our small staff. Please check the Project Gutenberg Web pages for current donation methods and addresses. Donations are accepted in a number of other ways including including checks, online payments and credit card donations. To donate, please visit: http://pglaf.org/donate Section 5. General Information About Project Gutenberg-tm electronic works. Professor Michael S. Hart is the originator of the Project Gutenberg-tm concept of a library of electronic works that could be freely shared with anyone. For thirty years, he produced and distributed Project Gutenberg-tm eBooks with only a loose network of volunteer support. Project Gutenberg-tm eBooks are often created from several printed editions, all of which are confirmed as Public Domain in the U.S. unless a copyright notice is included. Thus, we do not necessarily keep eBooks in compliance with any particular paper edition. Most people start at our Web site which has the main PG search facility: http://www.gutenberg.net This Web site includes information about Project Gutenberg-tm, including how to make donations to the Project Gutenberg Literary Archive Foundation, how to help produce our new eBooks, and how to subscribe to our email newsletter to hear about new eBooks.
