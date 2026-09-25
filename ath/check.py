"""ath check <slug> — the cheap checks again, on whatever exists, without rebuilding anything.

For the second look before a gate, and for a new session picking a book up: validates the
manuscript, re-runs the layout lens on the PDFs, the EPUB check, and prints the gate table.
"""
import os
from .book import Book, EDITIONS
from . import manuscript as M
from . import gates


def main(argv):
    if not argv:
        print('usage: ath check <slug>'); return 1
    b = Book(argv[0])
    if os.path.exists(b.manuscript):
        errs, warns, stats = M.validate(open(b.manuscript, encoding='utf8').read())
        print(f'manuscript: {stats.get("words", 0):,} words, {stats.get("chapters")} chapters, {stats.get("notes", 0)} notes; {len(errs)} errors, {len(warns)} warnings')
        for e in errs[:10]:
            print('  ERROR', e)
    else:
        print('manuscript: none yet')
    from . import layout_check
    for e in b.get('editions', EDITIONS):
        p = b.path('3-typeset', f'{e}.pdf')
        if os.path.exists(p):
            f, s = layout_check.analyze(p)
            print(f'{e}.pdf: {s.get("pages")} pages; layout ' + (', '.join(f'{k} {v}' for k, v in s.items() if k not in ('pages', 'measure_in', 'line_height_pt')) or 'clean'))
    ep = b.path('4-epub', f'{b.slug}.epub')
    if os.path.exists(ep):
        from . import epub as EP
        pr, nt = EP.check(b, ep)
        print(f'epub: {"; ".join(nt)}' + (f'; PROBLEMS {pr}' if pr else ''))
    print()
    gates.show(b)
    return 0
