# The pipeline — five stages, one book

Each stage **takes** the folder before it and **emits** its own. The contract is the folder.
A stage never edits another stage's folder; a fix goes to the source of the earlier stage and the
stages re-run (they are idempotent and fast).

| # | stage | command | takes | emits | model's job |
|---|---|---|---|---|---|
| 0 | source | `ath new` | a text, a scan, an archive.org id, a PG number | `0-source/`, `book.yaml`, `NOTES.md` | name the canon setting; verify it by printed folio |
| 1 | plan + art | `ath plan`, `ath art`, `ath cover` | the text | `1-plan/plan.md`, art shortlist, cover, plates, `blurb.md` | fill plan.md (five sentences, structure, art brief, blurb); choose from the shortlist or accept the pick; look at `cover-contact.jpg` |
| 2 | text | `ath ocr`, `ath edit` | witnesses | `2-text/consensus.txt`, `manuscript.md`, `edits.csv`, `edit-report.md`, `checks/` | read the OCR report and the dictionary list; fix real errors in the witnesses or add `ocr.restore` pairs; never patch an output |
| 3 | typeset | `ath typeset` | `manuscript.md` | `3-typeset/<edition>.pdf`, `pages/*.png` | look at the pages |
| 4 | epub | `ath epub` | `manuscript.md` | `4-epub/<slug>.epub`, `epub-check.md` | read the check; open the file in a reader when possible |
| 5 | proof | `ath proof`, `ath tracker` | everything | `5-proof/PROOF.md`, `pages-*.jpg`, `CHANGES.md` | run the reading lenses (AGENTS.md); decide every open finding; sign NOTES.md |

`ath all <slug>` runs edit → typeset → epub → cover → proof. `ath status <slug>` says what is next.

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

| edition | trim | margins (in/out/top/bottom) | type | finish | print house |
|---|---|---|---|---|---|
| Deluxe | 5 × 7 in | 0.75 / 0.55 / 0.62 / 0.70 | EB Garamond 10.5/14.7 | hardcover, case laminate | KDP hardcover does not offer 5 × 7 (its smallest is 5.5 × 8.5): use IngramSpark or Lulu for 5 × 7, or set `deluxe` to 5.5 × 8.5 in `house.typ` for KDP |
| Everyman | 4.25 × 6.375 in (the Loeb size) | 0.60 / 0.45 / 0.50 / 0.58 | 9.6/13.8 | paperback, matte | KDP custom trim (4–8.5 × 6–11.69 allowed) |
| Scholar | 5 × 7 in | 0.85 / 1.00 / 0.75 / 0.85 | 10.5/15.3 | paperback, glossy | KDP custom trim |

The inside margin is raised automatically to KDP's minimum for the page count (0.375 to 0.875 in).
A book over 828 pages is flagged; split it into volumes (two `book.yaml`s, `title: … Volume I`).
Spine width = pages × 0.0025 in (cream). Paperback spreads carry a 0.125 in bleed; the Deluxe
spread is built with a 0.591 in wrap for a case-laminate template — check the printer's own
calculator before upload.

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
