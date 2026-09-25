# The pipeline — five stages, one book

Each stage **takes** the folder before it and **emits** its own. The contract is the folder.
A stage never edits another stage's folder; a fix goes to the source of the earlier stage and the
stages re-run (they are idempotent and fast).

| # | stage | command | takes | emits | model's job |
|---|---|---|---|---|---|
| 0 | source | `ath new` | a text, a scan, an archive.org id, a PG number | `0-source/`, `book.yaml`, `NOTES.md` | name the canon setting; verify it by printed folio |
| 1 | plan + art | `ath plan`, `ath art`, `ath cover` | the text | `1-plan/plan.md`, art shortlist (with crop per trim and sharpness), cover, candidates side by side, plates, `blurb.md`, `cover-report.md` (crop, contrast of type over picture, scrim, blurb fit, spread geometry) | fill plan.md incl. go/no-go; open the museum pages and look; `--candidates 3` to compare fronts; decide the plan, art and cover gates |
| 2 | text | `ath ocr`, `ath edit` | witnesses | `2-text/consensus.txt`, `manuscript.md`, `edits.csv`, `edit-report.md`, `checks/` | read the OCR report and the dictionary list; fix real errors in the witnesses or add `ocr.restore` pairs; never patch an output |
| 3 | typeset | `ath typeset` | `manuscript.md` | `3-typeset/<edition>.pdf`, `pages/*.png`, `typeset-report.md` (widows, orphans, runts, hyphen stacks, loose lines, stranded headings, thin chapter ends, read from the PDF's own line geometry) | look at the pages; read the report; decide the typeset gate |
| 4 | epub | `ath epub` | `manuscript.md` | `4-epub/<slug>.epub`, `epub-check.md` | read the check; open the file in a reader when possible |
| 5 | proof | `ath proof`, `ath tracker` | everything | `5-proof/PROOF.md`, `pages-*.jpg`, `CHANGES.md` | run the reading lenses (AGENTS.md); decide every open finding; sign NOTES.md |

`ath all <slug>` runs edit → typeset → epub → cover → proof. `ath status <slug>` says what is next.

## Gates — the judgement between stages

Output is not the product; the decision about it is. After each stage the overseer looks at the
evidence the stage names, answers the criteria in `GATES.md`, and records a verdict:

```
ath gate <slug>                                  the table: verdict, date, hand, note, evidence
ath gate <slug> text pass --note "…"             at least 20 characters of reason, always
ath gate <slug> cover fail --note "…"            a fail reopens every later gate
ath check <slug>                                 the cheap checks again, then the table
```

`ath art` needs the plan gate; `ath typeset` and `ath epub` need the text gate; `ath cover` needs
the art gate; the final gate needs all of them. `--force` runs a stage past an unpassed gate and
is written into run-log.md, NOTES.md, `ath status` and PROOF.md. It is for a demo, never for a
book that ships. Every report ends with the questions its gate asks, filled with the numbers.

## The book folder

```
books/<slug>/
  book.yaml        metadata and decisions — the one file edited by hand
  0-source/        scan.pdf, pages/, downloaded texts
  1-plan/          plan.md · art-shortlist.md/.json · art/ (downloads) · cover-front-<ed>.jpg · cover-back-<ed>.jpg
                   cover-spread-<ed>.pdf · cover-epub.jpg · cover-site.jpg · cover-thumb.jpg · plates/{print,epub}/NN.jpg · blurb.md
  2-text/          witnesses/ · consensus.txt · ocr-report.md · flags.csv · manuscript.md · edits.csv · edit-report.md · checks/
  3-typeset/       body.typ · main-<ed>.typ · <ed>.pdf · signature-<ed>.png · pages/<ed>-N.png
  4-epub/          <slug>.epub · epub-check.md
  5-proof/         PROOF.md · pages-<ed>.jpg · reports/ (reviewers write here, and only here)
  NOTES.md         edition, witnesses, decisions, open flags — part of the book
  changes.csv      append-only; CHANGES.md rendered from it (ath tracker)
  run-log.md       one line per command; read first, write last
```

## The manuscript dialect

`2-text/manuscript.md` is pandoc Markdown, restricted (see `ath/manuscript.py`): `#` part,
`##` chapter ("Chapter I. Title" splits into label and title), `###` section, `* * *` section
break, `> ` quotation, `| ` verse line (leading spaces kept), `[^n]` notes, `::: {.front}`,
`::: {.back}`, `::: {.epigraph}` divisions, `*italic*`, `[small caps]{.smallcaps}`. Anything else
is refused by `validate()`, so every renderer handles all of it. Plates are placed by the
typesetter from `book.yaml`, not by hand.

## Editions

| edition | trim | margins (in/out/top/bottom) | type | binding and finish |
|---|---|---|---|---|
| Deluxe | 5 × 7 in | 0.75 / 0.55 / 0.62 / 0.70 | EB Garamond 10.5/14.7 | hardcover, case laminate, matte |
| Everyman | 4.25 × 6.375 in (the Loeb size) | 0.60 / 0.45 / 0.50 / 0.58 | 9.6/13.8 | paperback, matte |
| Scholar | 5 × 7 in | 0.85 / 1.00 / 0.75 / 0.85 | 10.5/15.3 | paperback, gloss, wide margins for the hand |

The print house is IngramSpark by default and every number it needs lives in `ath/print_spec.py`:
paper 0.002602 in/page cream, paperback bleed 0.125 in, case-laminate wrap 0.625 in with 0.5 in
hinges, board width = trim − 0.185, board height = trim + 0.25. The hardcover spine in the spread
is an estimate; take the exact figure from the IngramSpark cover template and pass
`ath cover --spine X`. The inside margin is raised automatically to the house minimum for the
page count (0.60 to 1.00 in). A book over 800 pages is flagged; split it into volumes.

## What `ath edit` does to a Gutenberg text before the rules run

The importer (`ath/manuscript.py`, `prepare_gutenberg` and `import_text`) is where most of the
structure judgement is automated, and it was tuned against twenty-two philosophy texts of every
typographic habit Gutenberg has. It: strips the licence, transcriber's notes, page markers, `#…#`
and `=…=` emphasis markup; binds notes in four forms (`[Footnote N: …]`, `[N] text` paragraphs,
FOOTNOTES blocks, `(N)` calls with `N text` endnotes) to their calls and keeps the unbound ones
visible under *Notes Without a Call in the Source*; drops the title page, a contents list of any
shape (page-numbered, dot-leadered, synopsis entries, analytical tables), a half-title, publisher's
blurbs and advertisements, "THE END", and an index (page numbers of another setting); keeps a
dedication, an epigraph with its attribution, and prose before the first heading as front matter;
infers part / chapter / section from how labels repeat, from a numeral-with-title set on its own
line against one set on one line, and from plain headings that divide restarting sequences; and
wraps prefaces, translator's and editor's notes and *signed* introductions in `::: {.front}` so
they take roman folios. An unsigned Introduction is the author's and stays a chapter. What it
cannot know (a Part I label the edition never printed, a table set as columns of text) it leaves
for the overseer, who fixes the source and re-runs. Retention across the twenty-two texts is
99.7% of the source words net of the indexes dropped; the rest is what the list above names.

`ath batch <list.yaml>` runs new → plan → edit (→ typeset → epub → proof) over a list and writes
`books/_batch-report.md`: one row per book with the numbers the gates need. It carries; it does
not judge. `ath preflight` ends with a smoke test that runs the importer, every edit rule and
every check on a built-in sample, so a rule that cannot run on a sample never runs on a book.

## Where the model comes in, and where it does not

The commands are deterministic and cheap. A Sonnet-class model can run the whole pipeline by
following `CLAUDE.md`; the judgement calls are few and named: the plan, the art choice, reading
the reports, looking at the pages, deciding open findings. Fable in advanced mode does the same
work with more care on the reading lenses and better plans, not with a different pipeline.

## Publishing (unchanged from pipeline 1, deliberately)

`1-plan/cover-site.jpg` (900 px) and `cover-thumb.jpg` (320 px) plus `4-epub/<slug>.epub` are what
athanasius.online takes: `assets/covers/<id>.jpg`, `assets/covers/thumbs/<id>.jpg`, `books/<id>.epub`,
and a catalogue entry. Print files go to the print house from `3-typeset/` and `1-plan/cover-spread-*.pdf`.
Large binaries never go into the site repo's history at print size (see the storage handoff of
2026-09-03: R2 for the library, git for code).
