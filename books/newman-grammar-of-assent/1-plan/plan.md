# Plan — An Essay in Aid of a Grammar of Assent

*Written by the overseer after skimming the work. Fill every section; the pipeline reads the two
fenced blocks (`art` and `blurb`) with `ath plan newman-grammar-of-assent --sync`.*

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

- Work first published: 1870. Edition/setting used: the Project Gutenberg transcription of the 1870 edition. Public-domain basis: published before 1 January 1931; public domain in the United States
- Any modern apparatus in the source to exclude (introductions, translations, notes after 1930): 

## Risks and open questions

- 

---

## Skim (generated)

**Words:** 138,410. **Headings found:** 94.

Headings (first 40): Part I. Assent And Apprehension. · Chapter I. Modes Of Holding And Apprehending Propo · § 1. Modes of Holding Propositions. · § 2. Modes of apprehending Propositions. · Chapter II. Assent Considered As Apprehensive. · Chapter III. The Apprehension Of Propositions. · Chapter IV. Notional And Real Assent. · § 1. Notional Assents. · § 2. Real Assents. · § 3. Notional and Real Assents Contrasted. · Chapter V. Apprehension And Assent In The Matter O · § 1. Belief in One God. · § 2. Belief in the Holy Trinity. · § 3. Belief in Dogmatic Theology. · Part II. Assent And Inference. · Chapter VI. Assent Considered As Unconditional. · § 1. Simple Assent. · § 2. Complex Assent. · Chapter VII. Certitude. · § 1. Assent and Certitude Contrasted. · § 2. Indefectibility of Certitude. · Chapter VIII. Inference. · § 1. Formal Inference. · § 2. Informal Inference. · § 3. Natural Inference. · Chapter IX. The Illative Sense. · § 1. The Sanction of the Illative Sense. · § 2. The Nature of the Illative Sense. · § 3. The Range of the Illative Sense. · Chapter X. Inference And Assent In The Matter Of R · § 1. Natural Religion. · § 2. Revealed Religion. · PART I. ASSENT AND APPREHENSION. · Chapter I. Modes Of Holding And Apprehending Propo · § 1. Modes of Holding Propositions. · § 2. Modes of apprehending Propositions. · Chapter II. Assent Considered As Apprehensive. · Chapter III. The Apprehension Of Propositions. · Chapter IV. Notional And Real Assent. · § 1. Notional Assents.…

**Opening:**

> The Project Gutenberg EBook of An Essay In Aid Of A Grammar Of Assent by John Henry Newman This eBook is for the use of anyone anywhere at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at http://www.gutenberg.org/license Title: An Essay In Aid Of A Grammar Of Assent Author: John Henry Newman Release Date: October 1, 2010 [Ebook #34022] Language: English Character set encoding: UTF‐8 ***START OF THE PROJECT GUTENBERG EBOOK AN ESSAY IN AID OF A GRAMMAR OF ASSENT*** An Essay In Aid Of A Grammar Of Assent. by John Henry Newman, Of the Oratory. Non in dialecticà complacuit Deo salvum facere populum suum. ST. AMBROSE. London: Burns, Oates, & Co. 17 & 18, Portman Street, and 63, Paternoster Row. 1874 CONTENTS Dedication. Part I. Assent And Apprehension. Chapter I. Modes Of Holding And Apprehending Propositions. § 1. Modes of Holding Propositions. § 2. Modes of apprehending Propositions. Chapter II. Assent Considered As Apprehensive. Chapter III. The Apprehension Of Propositions. Chapter IV. Notional And Real Assent. § 1. Notional Assents. § 2. Real Assents. § 3. Notional and Real Assents Contrasted. Chapter V. Apprehension And Assent In The Matter Of Religion. § 1. Belief in One God. § 2. Belief in the Holy Trinity. § 3. Belief in Dogmatic Theology. Part II. Assent And Inference. Chapter VI. Assent Considered As Unconditional. § 1. Simple Assent. § 2. Complex Assent. Chapter VII. Certitude. § 1. Assent and Certitude Contrasted. § 2. Indefectibility of Certitude. Chapter VIII. Inference. § 1. Formal Inference. § 2. Informal Inference. § 3. Natural Inference. Chapter IX. The Illative Sense. § 1. The Sanction of the Illative Sense. § 2. The Nature of the Illative Sense. § 3. The Range of the Illative Sense. Chapter X. Inference And Assent In The Matter Of Religion. § 1. Natural Religion. § 2. Revealed Religion. Note. Footnotes DEDICATION. To Edward Bellasis, Serjeant At Law, In Remembrance Of A Long, Equable, Sunny Friendship; In Gratitude For

**Closing:**

> please visit: http://www.gutenberg.org/fundraising/donate Section 5. General Information About Project Gutenberg™ electronic works. Professor Michael S. Hart is the originator of the Project Gutenberg™ concept of a library of electronic works that could be freely shared with anyone. For thirty years, he produced and distributed Project Gutenberg™ eBooks with only a loose network of volunteer support. Project Gutenberg™ eBooks are often created from several printed editions, all of which are confirmed as Public Domain in the U.S. unless a copyright notice is included. Thus, we do not necessarily keep eBooks in compliance with any particular paper edition. Each eBook is in a subdirectory of the same number as the eBook’s eBook number, often in several formats including plain vanilla ASCII, compressed (zipped), HTML and others. Corrected _editions_ of our eBooks replace the old file and take over the old filename and etext number. The replaced older file is renamed. _Versions_ based on separate sources are treated as new eBooks receiving new filenames and etext numbers. Most people start at our Web site which has the main PG search facility: http://www.gutenberg.org This Web site includes information about Project Gutenberg™, including how to make donations to the Project Gutenberg Literary Archive Foundation, how to help produce our new eBooks, and how to subscribe to our email newsletter to hear about new eBooks. ***FINIS***
