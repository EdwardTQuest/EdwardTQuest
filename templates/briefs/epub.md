# Brief — EPUB reviewer

**Scope:** `4-epub/<slug>.epub` opened in a reader (Apple Books, Calibre, Thorium) or, failing
that, unzipped and read as XHTML; plus `4-epub/epub-check.md`. Report: `5-proof/reports/epub.md`.

Check: the cover shows on the shelf and as the first page; the title page and publication page;
navigation lists every chapter and opens it; chapter labels and titles; small-caps openings render;
verse keeps its lines; section-break ornaments; footnotes open as pop-ups or at the end and return;
plates show whole with captions; no stray characters; fonts embedded (or falling back cleanly);
`epubcheck` output if you have it. One row per defect with the chapter and the reader used.
