# The Golden Sayings of Epictetus — Epictetus (tr. Hastings Crossley)

**Imprint:** Athanasius. **Created:** 2026-09-25, as the pipeline's first end-to-end run.
**Status:** built through every stage as a test of the pipeline; NOT a publishable edition —
the cover and plates are stand-in photographs (the site's hero images), not paintings, because
this container cannot reach the museums or Wikimedia Commons. Re-run `ath art --fetch` and
`ath cover` from a machine with network before any of it ships.

## Edition used

The Harvard Classics, volume II (P. F. Collier & Son, 1909), via the prep-ebooklets edited text
`HC-02b-epictetus-edited-text.txt` (pipeline 1, 2026-08). Canon setting verified there by
printed folio against `harvardclassics02elio` on archive.org (see that project's NOTES).

## Public-domain basis

Translation first published 1903 (Golden Treasury), this setting 1909; before 1 January 1931.

## Editorial decisions

- The 80 numbered sayings are sections (###) under one chapter, as the 1909 setting prints them
  (numbers centred, no page breaks); `ath edit` demoted them automatically and the sequence
  proof runs 1..80 without gap.
- The 1909 Introductory Note is kept as a front division (roman folios).
- "Dis- — courses" in the source rejoined to "Discourses" by dictionary (category O).
- Three paragraph openings set in the printer's capitals lowered to sentence case (category C);
  the template sets the opening words in small caps.

## Witnesses

- The edited text only (an edited text is itself a witness of high quality). An OCR test on six
  rendered pages of this book's own Deluxe PDF gave tesseract psm 3 / psm 4 agreement 1.000 and
  0.984 against the text layer, with all 22 variants correctly refused (base words real).

## Open flags (from 5-proof/PROOF.md, lens 3 and lens 5 — to fix in the source text and re-run)

- Four lost footnote calls survive as bare asterisks: "Antisthenes?*", "Guardian Spirit,*",
  "But* the Good", "God's * sight". The 1909 notes must be recovered from the scan and set as
  `[^n]` notes, or the asterisks removed with a category P row each.
- Three stray underscores ("God: _ that is my work", "of _ thyself", "fully _ modelled") — an
  italics marker lost in transcription; check the page image.
- "Tf then all things" → "If"; "It ts a kingly thing" → "is" (OCR, category O).
- "Xxviti Concerning the Gods" — saying XXVIII's number glued to its first line; split into a
  `### XXVIII` heading (the sequence proof counts 80 because the number was absorbed).
- Four "unbalanced double quotes" findings are multi-paragraph quotations (Chicago reopens the
  quotation each paragraph) — verify against the page and leave.
- "at present,especially" — missing space (category N).
- "Rufus' used to say" (saying V) — check the page: probably "Rufus used to say".

## Cover candidates

Shortlist in `1-plan/art-shortlist.md`; automatic pick was Corot, *Dance under the Trees at the
Edge of the Lake* (NGA, 1867) — a fair mood for the book; Inness, *Spring Blossoms* second. To be
looked at by an art reviewer (templates/briefs/art.md) before use.

## Gates

- 2026-09-25 15:17 · **plan** · pass · Test book: plan filled by hand in book.yaml; Epictetus, 1909 Collier setting verified in pipeline 1; subjects set; blurb 96 words (short, acceptable for a test) · overseer
- 2026-09-25 15:17 · **text** · pass · Test book: suspicious list read; ts/Tf/Xxviti and four lost note calls are source defects recorded in NOTES.md; sequence 1..80 clean; passing to exercise the pipeline · overseer
- 2026-09-25 15:17 · **art** · pass · Test book only: stand-in photographs, not paintings; real art gate must be decided on a fetched painting from a machine with network · overseer
- 2026-09-25 15:17 · **typeset** · pass · Test book: pages looked at (docs/samples sheets); runts on 15/18/19/22 tolerable in a 60-page test; no widows or orphans · overseer
- 2026-09-25 15:17 · **epub** · pass · Test book: structure and text equivalence pass; ten plates present; not opened in a reader here · overseer
- 2026-09-25 15:17 · **cover** · pass · Test book: layouts and contrast measured; stand-in photographs; real decision deferred to a fetched painting · overseer
