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
        ('art',     b.path(b.get('art.cover.file') or '1-plan/art/cover-source.jpg')),
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
    from . import gates as G
    gs = b.meta.get('gates') or {}
    print('  gates: ' + '  '.join(f'{g}:{(gs.get(g) or {}).get("verdict", "·")}' for g in G.GATES) + ('  FORCED' if b.meta.get('forced') else ''))
    undecided = [g for g in G.GATES if not (gs.get(g) or {}).get('verdict')]
    print(f'\nnext: {nxt or "done — read 5-proof/PROOF.md and NOTES.md"}' + (f'; gates undecided: {undecided}' if undecided else ''))
    return 0
