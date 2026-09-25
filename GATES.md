# GATES — this is good enough, this is not

A stage makes output. A gate is a decision about it, written down against these criteria, with a reason and a name. 
The next stage refuses to run until the gate before it is passed. Passing a gate with a criterion unmet is allowed only when the note says which one and why — that is a decision too, and it is on the record.

| gate | when | required by |
|---|---|---|
| plan | after `ath plan --sync` | art, final |
| art | after `ath art --pick --fetch` (look at the pictures, not the list) | cover, final |
| text | after `ath edit` (read edit-report.md in full; open the manuscript only where it points) | typeset, epub, final |
| typeset | after `ath typeset` (look at 3-typeset/pages/ for every edition; read typeset-report.md) | final |
| epub | after `ath epub` (open it in a reader when you can; read epub-check.md) | final |
| cover | after `ath cover` (look at cover-contact.jpg and the spreads; read cover-report.md) | final |
| final | after `ath proof` (PROOF.md, the reviewers' reports, CHANGES.md, NOTES.md) | — |

## plan
*after `ath plan --sync`*

1. The five sentences say what the book is and why Athanasius publishes it; a reader of the blurb would know whether to buy it.
2. The canon setting is named and was verified by printed folio (not the title page); the public-domain basis is stated for the work AND the edition.
3. Structure decided: parts/chapters/points, front divisions kept, back matter, notes; the external sequence proof number is in book.yaml `checks.expected_sections` when one exists.
4. Art brief is specific (a place, a light, a season, a mood), names what to avoid, and follows the house preference: landscape, romantic, impressionist.
5. Blurb 110–150 words, plain, confident, no adjectives about the edition, no spoilers, last sentence says why now.
6. Go / no-go answered: source quality good enough to edit (not a different setting, not a reset printing); the title is worth the shelf.

## art
*after `ath art --pick --fetch` (look at the pictures, not the list)*

1. The cover painting is the whole picture and reads at thumbnail size: one subject, a quiet zone for type, not a busy crowd scene.
2. It is a painting (not a print, drawing, sculpture, photograph, textile), created 1926 or earlier, on an open-access or Commons public-domain page you opened.
3. No nudity beyond the partial or a putto; no religious subject; no study/copy/fragment/"after"/"imitator of".
4. It suits the book: period, place, and mood match the plan's brief; it would not embarrass the author.
5. Not in art/used.csv under another book; painter under the caps (6 in the library, 2 in this book's plates).
6. Ten plates chosen the same way, varied in subject and painter, each with a caption naming painting, painter, year, source.
7. Resolution: the cover source is at least 1800 px on its short side; plates at least 1200 px.

## text
*after `ath edit` (read edit-report.md in full; open the manuscript only where it points)*

1. Witnesses: for a scanned source, at least two independent voting witnesses of the same setting, each ≥ 95% agreement with the base; anything lower excluded and named in NOTES.md. A single-witness text is allowed only with a reading lens done by a reviewer.
2. Every rule in edits.csv fired a plausible number of times for this text; no rule was forced past its cap.
3. The dictionary list has been read to the end: every entry is archaic / a name / another language / a real error now fixed in the source. The "suspicious first" block is empty of unfixed errors.
4. Sequence proof: numbered headings run 1..n without gap or repeat, and match the external count when there is one.
5. Structure battery: every finding decided (fixed in the source, or recorded as deliberate in changes.csv / NOTES.md).
6. No stray marks (*, _, ^, [, ]) survive in the body; every note call has a note; no paragraph begins lowercase.
7. Front matter is structured (front divisions wrapped), furniture is gone, headings are in Title Case, verse keeps its lines.
8. Nothing was invented; every lost passage is marked […] and has a changes.csv row.

## typeset
*after `ath typeset` (look at 3-typeset/pages/ for every edition; read typeset-report.md)*

1. Every sampled page looks like a book from a good press: even colour, no rivers, no loose lines, no hyphen stacks, no widows or orphans on the pages you looked at; the report's counts are low and each remaining one is tolerable where it is.
2. Openers: label, title, fleuron, small-caps opening; recto in Deluxe and Scholar; no chapter ends with fewer than four lines on its last page.
3. Running heads and folios: verso title, recto chapter, roman in front matter, arabic from the first chapter; none on openers; contents folios match.
4. Verse and quotations keep their shape; section breaks show the ornament; notes sit at the foot with the rule.
5. Plates are whole, captioned, placed before an opener or section, and read well in grayscale.
6. Publication page: edition credit, public-domain basis, cover credit, the signature block framed by the right edition word, the edition line.
7. Page counts within the printer's range; inside margin at or above the house minimum for the count; page size equals the trim.

## epub
*after `ath epub` (open it in a reader when you can; read epub-check.md)*

1. Cover shows on the shelf and as the first page; title page, publication page with the signature, contents.
2. Navigation lists every chapter and opens it; labels and titles as in print.
3. Text equivalence with the manuscript: zero words lost; footnotes open and return; verse keeps its lines; ornaments at section breaks.
4. Plates whole, in colour, with captions; fonts embedded; no stray characters; file size sensible for the book.

## cover
*after `ath cover` (look at cover-contact.jpg and the spreads; read cover-report.md)*

1. Whole painting on every front (full bleed only where the crop is under 12%; otherwise the plate layout); no zoomed detail.
2. Type legible over the picture at thumbnail size: the report's contrast measure passes, or the plate layout was chosen.
3. Title and author sized and placed as the house does; the hawk clear of the type; series line present.
4. Back cover: the blurb fits at the house size without shrinking below the floor; credit line correct; edition word right; the barcode zone clear.
5. Spine: text only when the spine is wide enough; spread dimensions from the final page count; the hardcover spine taken from the printer's template.
6. The three fronts read as one family at a glance (same painting, same type, same hawk) and as three editions on close look.

## final
*after `ath proof` (PROOF.md, the reviewers' reports, CHANGES.md, NOTES.md)*

1. Mechanical lenses at zero findings, or every remaining finding recorded in changes.csv with a decision.
2. At least one reading lens by a reviewer who did not build the book; its report in 5-proof/reports/ with a count.
3. CHANGES.md rendered; category P/Q rows (source errors, open questions) each have a decision or an owner.
4. NOTES.md complete: edition, witnesses, decisions, open flags; dated and signed by the overseer.
5. Deliverables present: three PDFs, three spreads, the EPUB, site cover and thumb; each looked at once more after the last rebuild.

## How to decide

- Look first, then read the numbers. The reports tell you where to look; they do not replace looking.
- Compare against a good press, not against pipeline 1. Would Word on Fire, Everyman, or Loeb print this page? If not, it is not good enough.
- A fail is cheap. Every stage re-runs in seconds; a fix goes into the source, a rule, book.yaml, or the template.
- Write the reason. `ath gate <slug> <gate> pass --note "…"` refuses an empty or trivial note. The note is what the next person reads.
- Forcing past a gate (`--force`) is logged in run-log.md and NOTES.md and shows in `ath status`. It is for a demo, never for a shipped book.
