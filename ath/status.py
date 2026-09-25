"""ath status <slug> — what exists, what is done, what is next."""
import os
from .book import Book, STAGES, EDITIONS


def main(argv):
    if not argv:
        print('usage: ath status <slug>'); return 1
    b = Book(argv[0])
    print(f'{b.meta.get("title")} — {b.meta.get("author")}  [{b.slug}]')
    checks = [
        ('plan',    b.path('1-plan', 'plan.md')),
        ('art',     b.path('1-plan', 'cover.jpg')),
        ('blurb',   b.path('1-plan', 'blurb.md')),
        ('text',    b.manuscript),
        ('edits',   b.path('2-text', 'edits.csv')),
    ] + [(f'typeset:{e}', b.path('3-typeset', f'{e}.pdf')) for e in EDITIONS] + [
        ('epub',    b.path('4-epub', f'{b.slug}.epub')),
        ('cover',   b.path('1-plan', 'cover-front-deluxe.jpg')),
        ('proof',   b.path('5-proof', 'PROOF.md')),
        ('tracker', b.path('CHANGES.md')),
    ]
    nxt = None
    for name, p in checks:
        ok = os.path.exists(p)
        print(f'  {"✓" if ok else "·"} {name:16s} {os.path.relpath(p, b.dir) if ok else ""}')
        if not ok and nxt is None:
            nxt = name
    st = b.meta.get('status', {})
    for k, v in st.items():
        print(f'  status.{k}: {v}')
    print(f'\nnext: {nxt or "done — read 5-proof/PROOF.md and NOTES.md"}')
    return 0
