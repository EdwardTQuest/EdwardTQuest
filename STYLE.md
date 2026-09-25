# Athanasius house style (for the edit stage and the reviewers)

**The setting is the text.** Spelling, wording, capitalisation of words, punctuation *choices*
of the canon setting stand. We normalise *typography*, not language. "parmanent" stands.

## Typography (applied by `ath edit`, each rule counted and capped)

| rule | form |
|---|---|
| quotation marks | curly, double primary, single nested: “ ‘ ’ ” |
| apostrophe | ’ |
| dashes | em dash closed (word—word) for a break; the setting's spaced en dash only if it uses one; hyphen for compounds; en dash for ranges (1909–1910) |
| ellipsis | Chicago spaced points with non-breaking spaces: `. . .`; after a full sentence `. . . .` (book.yaml `typeset.ellipsis: character` switches to the single …) |
| ligatures | plain letters in the manuscript (fi, fl); the typesetter re-ligates |
| spacing | one space after punctuation; none before ,.;:!? ; none inside quotation marks and parentheses |
| line-end hyphens | rejoined when the dictionary knows the joined word; kept when it knows the compound; otherwise flagged |
| paragraph openings | a run of ALL CAPS (the printer's small caps) becomes sentence case; the template sets the opening in small caps; a name keeps its capital |
| headings | Title Case in the manuscript (small words down); the template sets them in small caps regardless |
| numbered points | eighty "I., II., III." with short stretches between are sections (###), not chapters |
| notes | footnotes, `[^n]`, numbered per book by pandoc; no `ibid.`; a note call sits after the punctuation |

## Capitalisation of words

As the setting prints them: *God, Providence, Reason* keep the capitals the translator gave
them; *He/Him* for the divine as printed. We do not impose a house down-style on a public-domain
text. Where the source is inconsistent, the majority form in that book wins and the change is
recorded (category C).

## Structure

- Front matter is structured, never bundled: half title · series page · title page · publication
  page (with the signature block) · contents · then the source's own front divisions (Introductory
  Note, Preface) in `::: {.front}`.
- The source volume's structure is the default; a dropped index or an omitted apparatus is a
  recorded decision in NOTES.md, never an accident.
- Furniture (running heads, folios, signature marks, printer's advertisements) is removed and logged.
- Verse keeps its lines and its indents; the line break is the text.

## What is never done

- Never invent replacement wording for lost text: flag it (`changes.csv` category P/Q, a row with
  the location) and, in the manuscript, leave the gap marked `[…]` with a note.
- Never silently correct a reading a witness printing shares.
- Never delete a token that is a real word. Never judge tokens outside shared anchors.
- Never hand-patch an output; patch the source or the rule and re-run.
- Never modernise spelling, not even "to-day".

## Covers and plates (art rules, from Tom, September 2026)

- The whole picture. A crop of at most 12% to reach the trim, otherwise the painting entire on
  the house green. No zoom to a detail.
- No nudity beyond the partial or a putto; anything titled nude/bather/Venus and the like never
  enters the shortlist. No religious art on covers or plates.
- Preference order: landscape, romantic, impressionist, marine, then genre; portraits and
  mythology last. Created 1926 or earlier; open-access or Commons public-domain files only.
- A painting is used once in the library (`art/used.csv`); a painter at most six times; in one
  book at most two plates by the same hand.
- Plates are grayscale in print (colour interiors cost a multiple at print on demand) and colour
  in the EPUB; each carries its credit beneath it.
