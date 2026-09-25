# Plan — {title}

*Written by the overseer after skimming the work. Fill every section; the pipeline reads the two
fenced blocks (`art` and `blurb`) with `ath plan {slug} --sync`.*

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

- Work first published: {year_first}. Edition/setting used: {edition_credit}. Public-domain basis: {pd_basis}
- Any modern apparatus in the source to exclude (introductions, translations, notes after 1930): 

## Risks and open questions

- 

---

## Skim (generated)

{skim}
