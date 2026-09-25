# Brief — Typeset reviewer

**Scope:** the page images of every edition (`3-typeset/pages/<edition>-N.png`, and
`5-proof/pages-<edition>.jpg`), plus any page you render yourself from the PDF with
`pdftoppm -r 72 -f N -l N`. Report: `5-proof/reports/typeset.md`.

Look for, page by page in the samples and at every chapter opener:
- openers: label, title, fleuron, first-line small caps; recto in Deluxe/Scholar;
- running heads: verso = book title, recto = chapter, folio outside; none on openers; roman in
  front matter, arabic from the first chapter;
- verse: lines kept, indents kept, no line justified; quotations indented; section breaks show
  the ornament;
- notes at the foot, separator rule, numbering;
- plates: whole picture, caption beneath, placed on the page before a chapter opener;
- widows and orphans, a stranded heading at a page foot, rivers, over-tight or over-loose lines,
  a word broken badly at a line end, a hyphen at a page turn;
- the publication page: the signature block framed by the edition word, credits, the edition line;
- the contents: leaders and folios align; every chapter present.

One row per defect with edition and page. Where a fix belongs in the template rather than the
manuscript, say so.
