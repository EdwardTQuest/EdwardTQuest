#!/usr/bin/env python3
"""Turn a research run (the publisher-catalogue workflow's result JSON) into data/<site>.json.

    python3 tools/import_research.py scepter-uk data/research/scepter-uk.json [--shelves 'Escrivá,Prayer,...']

Applies the skeptic's fix/drop/merge flags, keeps every entry's verdict, reason and sources,
and never invents a field: what the research did not find stays empty. Hand corrections go in
data/<site>.edits.json ({"<id>": {field: value}, "_add": [books], "_drop": [ids]}), which this
script applies last, so a re-import never loses them."""
import json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return re.sub(r'^(the|a|an)-', '', s)[:60].strip('-')


def main(site, path, shelf_order=None):
    r = json.load(open(path))
    books = [b for b in r['books'] if b.get('verdict') != 'reject']
    by_title = {b['title']: b for b in books}
    for fl in (r.get('skeptic') or {}).get('flags', []):
        b = by_title.get(fl['title'])
        if not b:
            continue
        if fl['action'] == 'drop':
            b['_dropped'] = fl['issue']
        elif fl['action'] == 'merge' and fl.get('merge_into') in by_title:
            keep = by_title[fl['merge_into']]
            keep['sources'] = list(dict.fromkeys(keep.get('sources', []) + b.get('sources', [])))
            b['_dropped'] = 'merged into ' + fl['merge_into']
        elif fl['action'] == 'fix' and fl.get('fix'):
            for k, v in fl['fix'].items():
                if v is not None:
                    b[k] = v
            b.setdefault('_fixes', []).append(fl['issue'])
    cats = shelf_order or r['categories']
    used = set()
    out = []
    for b in books:
        if b.get('_dropped'):
            continue
        base = slug(b['title']) or 'book'
        i, bid = 2, base
        while bid in used:
            bid = f'{base}-{i}'; i += 1
        used.add(bid)
        prices = b.get('prices') or []
        out.append({
            'id': bid,
            'title': b['title'].strip(),
            'subtitle': (b.get('subtitle') or '').strip(),
            'author': (b.get('author') or '').strip(),
            'shelf': slug(b['category']) if b['category'] in cats else slug(cats[0]),
            'kind': b.get('kind') or 'book',
            'description': (b.get('description') or '').strip(),
            'isbn': (b.get('isbn') or '').strip(),
            'pages': b.get('pages') or 0,
            'featured': bool(b.get('featured')),
            'status': b['verdict'],
            'evidence': b.get('verdict_reason', ''),
            'sources': b.get('sources', []),
            'prices_seen': prices,
        })
    dropped = [{'title': b['title'], 'why': b['_dropped']} for b in books if b.get('_dropped')]
    dropped += [{'title': d['title'], 'why': d['reason']} for d in r.get('dropped', [])]
    data = {
        'site': site,
        'compiled': '2026-09-25',
        'method': 'Web search only (page fetches blocked in the build container); every entry carries its verdict, reason and sources. See sites/RESEARCH.md.',
        'shelves': [{'slug': slug(c), 'name': c} for c in cats],
        'books': out,
        'dropped': dropped,
    }
    edits_path = os.path.join(HERE, 'data', f'{site}.edits.json')
    if os.path.exists(edits_path):
        apply_edits(data, json.load(open(edits_path)))
    dst = os.path.join(HERE, 'data', f'{site}.json')
    with open(dst, 'w') as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write('\n')
    from collections import Counter
    print(site, len(data['books']), 'books', dict(Counter(b['status'] for b in data['books'])), 'dropped', len(dropped))


def apply_edits(data, edits):
    ids = {b['id']: b for b in data['books']}
    for bid, fields in edits.items():
        if bid.startswith('_'):
            continue
        if bid in ids:
            ids[bid].update(fields)
    drop = set(edits.get('_drop', []))
    data['books'] = [b for b in data['books'] if b['id'] not in drop] + edits.get('_add', [])
    if '_shelves' in edits:
        data['shelves'] = edits['_shelves']


if __name__ == '__main__':
    args = sys.argv[1:]
    order = None
    if '--shelves' in args:
        i = args.index('--shelves'); order = args[i + 1].split(','); del args[i:i + 2]
    main(args[0], args[1], order)
