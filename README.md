# Athanasius 2.0

One title at a time. Five stages, each a command that reads the stage before it and writes its
own folder. One record per book. Nothing ships that a script did not make.

```
ath new <slug> --title … --author … [--gutenberg N | --archive ID | --scan F | --text F]
ath plan <slug>            # 1  skim → 1-plan/plan.md (overseer fills it) → ath plan --sync
ath art  <slug> --pick --fetch      cover + ten plates, ledgered, downloaded
ath ocr  <slug>            # 2  witnesses → consensus.txt → report
ath edit <slug>            #    house style by counted rules → 2-text/manuscript.md
ath typeset <slug>         # 3  Deluxe 5×7 · Everyman 4¼×6⅜ · Scholar 5×7 wide margins (Typst)
ath epub <slug>            # 4  EPUB 3 (pandoc) + check
ath cover <slug>           #    fronts, backs, spreads sized from the page counts, e-book and site covers
ath proof <slug>           # 5  the lens battery → 5-proof/PROOF.md ; ath tracker → CHANGES.md
ath gate <slug> <gate> pass|fail --note "…"   the recorded judgement between stages (GATES.md)
ath batch <list.yaml> [--through edit|typeset|epub|proof] [--only slug,…]   many books, one table: books/_batch-report.md
```

Start with `ath preflight`. Read `PIPELINE.md` for the stages and their contracts, `GATES.md` for
what "good enough" means at each of them, `STYLE.md` for the house style, `AGENTS.md` for how an
overseer and its specialists divide a title, `CLAUDE.md` for the operating rules any model follows.

## Layout

| path | what |
|---|---|
| `bin/ath` | the one command |
| `ath/` | one module per stage; `book.py` is the folder contract |
| `templates/typst/house.typ` | the house interior, three editions in one template |
| `templates/typst/filter.lua`, `templates/epub/` | manuscript dialect → Typst / EPUB |
| `templates/briefs/` | the reviewer briefs (read-only specialists) |
| `assets/` | fonts (OFL), ornaments, the hawk, a portable wordlist |
| `art/index.csv` | 3,435 open-access paintings, filtered for the house; `art/used.csv` the ledger |
| `books/<slug>/` | one book: `book.yaml`, `0-source/ … 5-proof/`, `NOTES.md`, `changes.csv`, `run-log.md` |
| `scepter/` | separate from the pipeline: scepterpublishers.org's three formation quizzes, free e-book and temperament pop-ups, and their reading-plan engine, as Shopify theme sections (`scepter/README.md`) |

## Needs

pandoc, typst, tesseract (+eng), poppler (pdftoppm, pdftotext, pdfinfo, pdffonts), qpdf, Python 3
with Pillow and PyYAML. `setup.sh` installs them on a Mac (Homebrew) or Debian/Ubuntu. Wordlists:
`wamerican wbritish` on Linux; on a Mac the bundled `assets/words/english.txt` is used.

## What is different from pipeline 1

- One book, one folder, one record: every stage leaves a report and a run-log line behind it.
- The manuscript is one Markdown file with a small, refused-if-broken dialect; every edition and the
  EPUB are rendered from it. Fixes go into the source or a rule, never into an output.
- Covers show the whole painting (full bleed only if almost nothing is cropped; otherwise the
  painting entire on the house green). No zoomed details. No nudes, no religious art; romantic,
  impressionist and landscape painting first. A ledger, not a sheet column, stops repeats.
- The signature block on the publication page replaces the ISBN block.
- Between stages there are gates: a written pass or fail against fixed criteria, by a named hand.
  The next stage refuses to run until the gate before it is passed. Judgement is the product.
- Every report ends with the questions its gate asks, filled with the numbers; every stage
  measures what a judgement rests on (contrast of type over the picture, crop, blurb fit, widows
  and orphans and runts read from the PDF, suspicious tokens ranked first).
- Proofing is a table of lenses with scopes and counts, not a "clean".
- Every rule that edits text carries a count and a cap; a rule that fires past its cap stops the run.
