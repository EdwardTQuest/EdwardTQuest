"""The change tracker: changes.csv (append-only, one row per change) -> CHANGES.md (rendered).

Modelled on the Centennial master tracker: a summary by category with counts, then one table per
category (location | as it stood | now reads | evidence). OCR repairs (returning the text to
what the page says) are recorded under category O and listed separately, as agreed there.

Categories: A spelling · B archaic form retained · C capitalization · D accents · E citations ·
F names/abbreviations · G/H note apparatus · I punctuation/quotes/ellipses/dashes · J readings in
the source corrected (with evidence) · K structure/front matter · L index · M notes restored ·
N typographic uniformity · O OCR repair · P print error left standing (flagged) · Q open question
"""
import csv, datetime, os, collections
from .book import Book

FIELDS = ['id', 'date', 'stage', 'category', 'location', 'as_was', 'now_reads', 'evidence', 'status', 'by']
NAMES = {'A': 'Spelling', 'B': 'Archaic forms retained', 'C': 'Capitalization', 'D': 'Accents and diacritics',
         'E': 'Citations', 'F': 'Names and abbreviations', 'G': 'Note apparatus', 'H': 'Cross-references',
         'I': 'Punctuation, quotation marks, ellipses, dashes', 'J': 'Readings in the source corrected',
         'K': 'Structure and front matter', 'L': 'Index', 'M': 'Notes restored', 'N': 'Typographic uniformity',
         'O': 'OCR repairs (the text returned to what the page says)', 'P': 'Errors in the source, left standing and flagged',
         'Q': 'Open questions'}


def add(b, stage, category, location, as_was, now_reads, evidence='', status='applied', by=''):
    p = b.path('changes.csv')
    new = not os.path.exists(p)
    n = 0
    if not new:
        with open(p, encoding='utf8') as f:
            n = sum(1 for _ in f) - 1
    with open(p, 'a', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            w.writeheader()
        w.writerow({'id': n + 1, 'date': datetime.date.today().isoformat(), 'stage': stage, 'category': category,
                    'location': location, 'as_was': as_was, 'now_reads': now_reads, 'evidence': evidence, 'status': status, 'by': by})
    return n + 1


def replace_stage(b, stage, by):
    """Drop the rows a generator wrote last time (stage + by), so a re-run regenerates them.
    Hand-written rows (by 'overseer' or a reviewer) are never touched."""
    p = b.path('changes.csv')
    if not os.path.exists(p):
        return 0
    with open(p, encoding='utf8') as f:
        rs = list(csv.DictReader(f))
    keep = [r for r in rs if not (r['stage'] == stage and r['by'] == by)]
    if len(keep) == len(rs):
        return 0
    with open(p, 'w', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader()
        for i, r in enumerate(keep, 1):
            r['id'] = i; w.writerow(r)
    return len(rs) - len(keep)


def rows(b):
    p = b.path('changes.csv')
    if not os.path.exists(p):
        return []
    with open(p, encoding='utf8') as f:
        return list(csv.DictReader(f))


def render(b):
    rs = rows(b)
    by = collections.defaultdict(list)
    for r in rs:
        by[r['category']].append(r)
    m = b.meta
    out = [f'# Change tracker — {m.get("title")}', '',
           f'**Author:** {m.get("author")}. **Source setting:** {m.get("edition_credit") or "(see NOTES.md)"}. **Imprint:** Athanasius.',
           f'**Status:** every row marked *applied* is in the delivered manuscript; *open* rows are decisions still to take. Rendered {datetime.date.today().isoformat()} from `changes.csv` ({len(rs)} rows).', '',
           'What this document does not list: OCR repairs are in category O and are counted, not itemised, unless a reading needed a decision.', '',
           '## Summary', '', '| | Category | Rows | Applied | Open |', '|---|---|---|---|---|']
    for c in sorted(by):
        rr = by[c]
        out.append(f'| {c} | {NAMES.get(c, c)} | {len(rr)} | {sum(1 for r in rr if r["status"]=="applied")} | {sum(1 for r in rr if r["status"]=="open")} |')
    for c in sorted(by):
        out += ['', f'## {c} · {NAMES.get(c, c)}', '', '| # | stage | location | as it stood | now reads | evidence | status |', '|---|---|---|---|---|---|---|']
        for r in by[c]:
            esc = lambda s: (s or '').replace('|', '\\|').replace('\n', ' ')[:160]
            out.append(f'| {r["id"]} | {r["stage"]} | {esc(r["location"])} | {esc(r["as_was"])} | {esc(r["now_reads"])} | {esc(r["evidence"])} | {r["status"]} |')
    text = '\n'.join(out) + '\n'
    b.write('CHANGES.md', text)
    return text


def main(argv):
    if not argv:
        print('usage: ath tracker <slug> [--add CAT "location" "as was" "now reads" "evidence" [status]]'); return 1
    b = Book(argv[0])
    if len(argv) > 1 and argv[1] == '--add':
        args = argv[2:]
        if len(args) < 5:
            print('need: CAT location as_was now_reads evidence [status]'); return 1
        i = add(b, 'manual', args[0], args[1], args[2], args[3], args[4], args[5] if len(args) > 5 else 'applied', 'overseer')
        print(f'row {i} added')
    render(b)
    print(f'CHANGES.md rendered ({len(rows(b))} rows)')
    return 0
