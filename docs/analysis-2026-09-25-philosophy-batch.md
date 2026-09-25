# What the philosophy batch showed — 25 September 2026

Twenty-two public-domain philosophy texts (Descartes to Bergson, none of them on the shelf or
in Loeb) were pushed through Athanasius 2.0 end to end: import, edit, three typeset editions,
EPUB, proof battery. This is the honest account of what held, what broke, what it cost, and how
it compares with pipeline 1.

The short version: **the mechanical stages hold at scale and cost nothing per book; the
judgement layer works but only when a person or a model actually looks; and looking is what
found every defect that mattered.** Ten of the thirteen defects below were invisible to every
programmatic check and visible in the first page sample I opened.

{{SUMMARY_TABLE}}

## 1. What was run

- Texts: {{N_BOOKS}} Project Gutenberg transcriptions, {{TOTAL_WORDS}} words, fetched from the
  GITenberg mirrors (gutenberg.org itself is blocked from this container). List in
  `books/_batch-philosophy.yaml`.
- Command: `ath batch books/_batch-philosophy.yaml --through proof --force` — new → plan → edit
  → typeset ×3 → epub → proof for every book, one table at the end (`books/_batch-report.md`).
  `--force` because the batch does not stop for gates; gates are the overseer's, per book.
- Machine time: {{MACHINE_TIME}} for all {{N_BOOKS}} books on a shared four-core container,
  {{PER_BOOK}} per book on average. No model tokens were spent by the commands.
- Model time (mine): the whole of this session's credit went into *building and debugging*
  the importer against these texts, not into running them. Running a book, once the code is
  right, costs the overseer the reading of three reports and two contact sheets — roughly
  eight to twelve thousand tokens of reading per book, and a few hundred of writing (the gate
  notes, the NOTES.md line). Pipeline 1's per-book model cost was the same order for the
  builder, but its reviewer *was* the builder (its own process notes, §4), and its QA passed
  while the shelf got worse.

## 2. Did it hold up across styles at scale?

{{RETENTION_TABLE}}

Retention is the words of the manuscript over the words of the Gutenberg source, net of the
index the importer drops on purpose (an index carries the page numbers of another setting; it
is noise in a re-set book). The remainder is what the importer is *meant* to drop: the licence,
the title page, contents lists (page-numbered, dot-leadered, synopsis, analytical), publisher's
advertisements, "THE END", transcriber's notes.

What the importer had to learn from these twenty-two, in the order the failures came:

1. **Contents lists come in six shapes.** Page-numbered, dot-leadered, bare labels, synopsis
   entries ("Hypotheses and options, 1. Pascal's wager, 5."), analytical tables with prose
   summaries (James's *Talks*), and lists that restart per part. A run ends at the first block
   that starts text, and the headings just before it are the text's — but a title-page cluster
   ("ESSAYS / IN / POPULAR PHILOSOPHY") just before the first essay must not be.
2. **Notes come in four forms.** `[Footnote N: …]` blocks, `[N] text` paragraphs after the
   paragraph or under a FOOTNOTES heading (numbering restarting per chapter), `(N)` calls with
   `N text` endnotes *after the index* (James's *Varieties*: 360 notes, and the first version
   of the index rule threw them all away), and `[1]In` with no space. An unbound note stays
   visible under *Notes Without a Call in the Source*, never silently dropped.
3. **A signed introduction is front matter; an unsigned one is the author's first chapter.**
   Courtney's introduction to *On Liberty* and Mencken's to *The Antichrist* take roman
   folios; Bergson's own Introduction to *Creative Evolution* does not.
4. **Levels are inferred from how labels repeat, and from typography.** A numeral with its
   title set on its own line is a chapter; a numeral with its title on the same line is a
   section (James's essays and their sections both read "I. …"). A plain heading that divides
   restarting numbered chapters is a part (*Talks to Teachers* / *Talks to Students*).
5. **Furniture words inside real prose.** "etext" inside *pretext*, "produced by" and "denoted
   by" in ordinary sentences, and a line-start "Editor" inside a paragraph each deleted whole
   paragraphs of Mill, James, Kant and Spinoza until the patterns were anchored.
6. **A page-number test that matched prose.** Two spaces and a short word of the letters
   i-v-x-l-c at a line end ("…  ill") made whole paragraphs of Mencken's introduction into
   contents entries. Contents entries are now short blocks whose *last* line ends in a number.

{{STRUCTURE_TABLE}}

What the importer cannot know, and leaves for the overseer (the design, not a failure):
Descartes' *Principles* has Parts II–IV labelled and Part I not (the edition never printed the
label); Kant's table of the material principles of determination is set as columns of words
and comes out as two spurious headings; Spinoza's *Ethics* has 221 propositions as sections
under five parts, which is right, but the Deluxe measure is narrow for his long words
({{SPINOZA_LOOSE}} loose lines, the layout lens says) and the typeset gate should ask for a
wider setting or a hyphenation allowance for that one book.

## 3. What looking found that nothing programmatic did

Every one of these shipped in the first run and would have shipped in a library run of
pipeline 1's kind. The lesson is the one CLAUDE.md already states: look at the pages before
calling a stage done.

| # | defect | how it was found | where it was |
|---|---|---|---|
| 1 | **Every italic in every book was set roman.** A `show emph: set text(style: "italic")` rule on top of Typst's own toggling emphasis toggled it straight back. | A 200-dpi crop of one paragraph of *On Liberty*: "Traveller" was upright. | template |
| 2 | The double-dash em dash was eaten by the hyphen-join rule ("writings--the" → "writings-the"), 74 times in one book. | The rule's own example line in `edit-report.md`. | edit rules |
| 3 | Blank versos before chapter openers carried a running head and folio. | Page 8 of the first sample. | template |
| 4 | Contents entries for chapter I said "vi" in the Scholar edition and the opener carried a running head: the blank-page trick inside the heading's show rule made the blank page the heading's *location*. | The Scholar contact sheet. | template |
| 5 | A wrapped contents entry dropped its folio onto a line of its own. | Same sheet. | template |
| 6 | The blank page before the colophon carried a running head. | Everyman sheet, page 91. | template |
| 7 | The stray-mark lens reported every italic and every note call as a stray mark (80 findings in one book), and the apparatus lens counted 0 note definitions against 13 calls. | Reading PROOF.md as an overseer would. | proof lenses |
| 8 | The EPUB check called 187 words "lost" that were note numbers and small-caps markup. | Spinoza's epub-check.md. | epub check |
| 9 | The part-page rule (a recto of its own for "Talks to Teachers") never fired: the `show` rule sat inside an `if` block and applied to nothing; the part title came out as a line of plain text at the foot of a page. | The *Talks to Teachers* contact sheet. | template |
| 10 | The first fix for defect 3 (a blank page made inside the heading's show rule) did not converge on long books: *Varieties* took twenty minutes an edition and *The Antichrist* carried folio 1 on every page. Replaced by engine page breaks and markers. | Typst's own warning, then the Antichrist sheet. | template |
| 11 | The title page hyphenated the title ("PSY-CHOLOGY"). | Same sheet. | template |
| 12 | Part pages carried a folio; the blank verso after one carried a running head. | Same sheet, after fix 9. | template |
| 13 | An essay's title note ("[1] An Address to the Philosophical Clubs…") sat two hundred paragraphs after its call and was never bound; the first attempt to fix it dropped the note. | James's chapter titles with a bare `[1]`. | importer |

Also found and fixed in the same pass: the dictionary sweep flagged "pp.", "Cf.", "5th", a bare
"B", Latin in italics and roman numerals as likely errors; the structure battery called every
paragraph of a multi-paragraph quotation "unbalanced"; a signature line ("H. L. MENCKEN.")
became a chapter; a numbered definition ("XLI. Cowardice is…") became a speaker.

`ath preflight` now ends with a smoke test: the importer, every edit rule and every check run
on a built-in sample before any book does. It caught a NameError in the very next batch start.

## 4. OCR on a poor scan

archive.org is blocked from this container, so the poorly-scanned texts the question asked
about could not be fetched. Instead I made one: twenty-four pages of the typeset
*Utilitarianism* rasterised at 150 dpi, skewed ±1°, blurred, greyed to a yellowed-paper
contrast, speckled, given a gutter shadow and a mirrored bleed-through of the page beneath
(sample in `docs/samples/poor-scan-page.png`). Then `ath ocr` on it, with no other witness,
and again with the Gutenberg text as a second witness — the situation of a real book.

| configuration | word accuracy against the truth text | errors in 7,034 words |
|---|---|---|
| tesseract alone (psm 3) on the poor scan | 84.9% | 1,059 (851 substitutions, 207 deletions) |
| the Gutenberg text itself (a different edition, footnotes placed differently) | 97.2% | 194, nearly all placement, not reading |
| consensus, OCR as base, Gutenberg voting (`--base tess-psm3.txt`) | 89.9% | 708; 330 corrections applied, 216 refused because both readings were real words |
| consensus, default base (the pipeline ranks Gutenberg above tesseract) | 97.2% | 194; 15 substitutions from the scan applied |

Time: one tesseract pass over 24 pages at 300 dpi took about 35 minutes on this container
while the batch was also running — roughly 1.5 minutes a page on a scan this bad, so a
300-page book is a night's work for the OCR stage alone, and two page-segmentation modes
double it. The dark first attempt (a scan degraded past legibility) read 523 words of 7,000
and the report said so.

What this says. The consensus mechanism does what it was built to do and no more: it never
invents, it refuses a change when both witnesses read a real word, and it reports agreement
per witness so the overseer sees the 0.848 and knows the scan is bad. On its own, tesseract
on a poor scan is not a text (85%); with a second witness it recovers only to 90% because the
refusal rule is deliberately conservative; with the better witness as the base — which is the
pipeline's default ranking — the scan's job becomes correcting the good text, and it did
(15 substitutions, all recorded). So "held up" means: it did not produce a bad book quietly.
A poorly scanned text *with no other witness* is exactly the case the pipeline sends back to
the overseer, and the reading lenses in AGENTS.md exist for it. The real archive.org scans
could not be tested from here (blocked network), and that remains the open item.

## 5. Better than pipeline 1, with fewer credits?

Pipeline 1's own account (`athanasius-pipeline/PROCESS_NOTES_from_the_library_run_2026-09-02.md`)
is the fairest baseline. Its 492-book run: four builds produced nothing because an asset was
missing and nothing checked first; every one of the 492 books shipped with the author's name in
Gutenberg's sorting form ("Forster, E. M. (Edward Morgan)"); twenty Boudins on seventy-three
covers while QA reported zero errors; and a "no painting found" that was never true. Its
conclusion was: write a preflight, put a CLAUDE.md beside the build, give QA the previous run's
numbers, and keep the reviewer separate from the builder.

Pipeline 2 was built to those four points, and the batch is the first test of whether they
hold:

- **Preflight** exists, checks every asset by name, and now runs the rules on a sample. The
  NameError it caught would have been pipeline 1's fifth failed build.
- **Gates with reasons** exist and were enforced (`--force` is logged everywhere it was used;
  none of these books passes a gate until someone writes why).
- **Reports state scope and count**, and the false findings that would have taught an
  overseer to skip them were fixed in this run.
- **The ledger** replaces the spreadsheet for art (not exercised here: Commons is blocked;
  the cover stage was tested earlier on Epictetus).

Quality of the product: the typeset editions are, page for page, better than pipeline 1's
(EB Garamond with real small caps and old-style figures, footnotes at the foot, running heads
and folios placed by edition, a signature page) — *once the italics defect was fixed*. Before
it, every book was worse than pipeline 1's in the one thing a reader notices.

Credits: pipeline 1 spent model credits building each book by conversation and re-discovering
the same failures each night (its notes say six hours were once spent reconstructing a lost
log). Here the per-book model cost is the overseer's reading; the mechanical cost is
{{PER_BOOK}} of CPU. The credits this session did spend went into the importer, and they were
spent once. Whether that is "fewer credits" depends on the horizon: for one book, no; for the
next fifty, yes, by a wide margin — provided the overseer actually reads the reports and looks
at the sheets, because that is the only place the judgement lives.

## 6. What I would do next

1. Run `ath batch` again on the same list from a clean tree (done below, that is the table at
   the top) and treat those numbers as the baseline the next run is compared against — the
   thing pipeline 1's notes asked for and never had.
2. Sit as overseer on three of these books (say *On Liberty*, *The Antichrist*, *Ethics*),
   pass or fail every gate with a note, and fix the sources where the importer left a mark.
   The second book will take half the time of the first; that is the number to record.
3. Get a real poor scan in (archive.org from a machine that can reach it) and run the OCR
   stage on it with the Gutenberg text as the second witness. The synthetic scan says the
   consensus mechanism works; a real one will say whether the furniture and hyphenation
   families are complete.
4. Widen the Spinoza setting, or allow hyphenation in the Deluxe for books with long words —
   a per-book `typeset.hyphenate` value in `book.yaml`, decided at the typeset gate.
