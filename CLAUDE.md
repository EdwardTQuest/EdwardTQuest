# CLAUDE.md — Athanasius 2.0 (operating rules for any model: Sonnet, Luna, Fable)

This repository builds one public-domain book at a time into three print editions, an EPUB
and a cover, with a record. Read `README.md` (map), `PIPELINE.md` (stages), `STYLE.md` (house
style), `AGENTS.md` (how to divide a title). The commands do the mechanical work; your work is
the judgement at the named points and the record.

## Every session

1. `bin/ath preflight` first. If it does not print `PREFLIGHT OK`, fix what it names; never
   start a run "to see how far it gets".
2. Read `books/<slug>/run-log.md` before touching a book; write a line in it (the commands do)
   and a note in `NOTES.md` when you decide anything. The log, not the session, is the memory.
3. Say what you are picking up. Do not re-derive the pipeline.
4. Work one book at a time. Finish the stage you are in and its report before starting another.
5. Decide the gate before moving on: `ath gate <slug> <gate> pass|fail --note "…"` against
   `GATES.md`. Look first (pages, covers, the museum page), then read the report, then write the
   reason. A fail is cheap; a pass without looking is the one thing this pipeline cannot recover from.

## The rules that were bought with real failures (do not relax them)

- Never invent text. A lost passage is flagged (`changes.csv`, category P or Q) and left marked
  `[…]`, never patched with plausible words.
- Never silently correct a reading a witness printing shares. Never delete a real word.
- Never hand-edit an output (`consensus.txt`, `manuscript.md` after `ath edit`, a PDF, an EPUB).
  Fix the source (`0-source/`, a witness), a rule (`ath/edit.py`), a `book.yaml` value
  (`ocr.restore`), or the template, and re-run. Every stage is idempotent.
- A rule that fires far more than expected is a bug: `ath edit` stops when a rule passes its cap.
  Do not raise the cap to make it pass; find out why it fired.
- Verify a witness by printed folio, not by title page. Below ~95% agreement it is a different
  setting; exclude it and say so in NOTES.md.
- Look at the rendered pages (`3-typeset/pages/`, `5-proof/pages-*.jpg`) and the covers
  (`1-plan/cover-contact.jpg`) with your own eyes before calling a stage done. Six runs out of six,
  looking caught what nothing programmatic did.
- A pass is only clean for what it looked at. Report scope, method and count. Never write
  "clean" without a scope and a number.
- Covers: the whole painting; no nudity; no religious subject; not in `art/used.csv` before this
  book. If the automatic pick breaks any of these, choose another from the shortlist.
- Binaries do not travel through chat or a connector's inline API. Files move by file I/O, git,
  or the R2 bucket.
- Never `--force` past a gate on a book that will ship. It is logged everywhere for a reason.

## The judgement points (where a model earns its keep)

| when | what you do | where it goes |
|---|---|---|
| after `ath plan` | fill plan.md: five sentences, structure, art brief (subjects, movement, avoid), blurb 110–150 words | `1-plan/plan.md`, then `ath plan <slug> --sync` |
| after `ath art` | read the shortlist; accept the pick or choose (`--cover ID`); the shortlist link opens the museum page — look at the picture | `book.yaml` art.cover |
| after `ath ocr` | read `ocr-report.md`: agreement per witness, decisions, refused variants; add `ocr.restore` pairs for named damage (Gop→GOD) | `book.yaml`, NOTES.md |
| after `ath edit` | read `edit-report.md`: the rule counts, the dictionary list (every entry: archaic, name, Latin, or an error to fix in the source), the structure battery | fix the source and re-run; NOTES.md |
| after `ath typeset` | look at the page samples; check openers, running heads, verse, notes | template fix or manuscript fix, re-run |
| after `ath cover` | read cover-report.md (crop, contrast, blurb fit); look at cover-contact.jpg and cover-thumb.jpg; compare candidates; decide the cover gate | `ath gate … cover` |
| after `ath proof` | run at least one reading lens with a reviewer (AGENTS.md); decide every finding; render the tracker; sign NOTES.md; decide the final gate | `5-proof/reports/`, `changes.csv`, NOTES.md |

## Cost discipline

The commands are cheap; reading is where credits go. Read reports, not files: `edit-report.md`,
`ocr-report.md`, `epub-check.md`, `PROOF.md`, the contact sheets. Open `manuscript.md` only at
the locations a report names. Do not paste whole texts into the conversation. A specialist
reviewer gets a brief with paths and a scope, reads inside its scope, writes one report file.

## Network

Wikimedia Commons, archive.org and Project Gutenberg must be reachable for `ath art --commons`,
`ath art --fetch` and `ath ocr` (archive/gutenberg sources). Some containers block them; then
download by hand into `1-plan/art/` or `2-text/witnesses/` and continue. Use
`commons.wikimedia.org/wiki/Special:FilePath/<file>?width=N`, never `upload.wikimedia.org`.
