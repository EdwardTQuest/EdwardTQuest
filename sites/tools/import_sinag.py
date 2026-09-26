#!/usr/bin/env python3
"""Rebuild data/research/sinag-tala-site.json from Sinag-Tala's own catalogue pages.

    python3 tools/import_sinag.py            # fetch both WordPress sites through the public API
    python3 tools/import_sinag.py DIR        # or read <site>-pages.json files already saved in DIR

Each book on those pages is a block: cover image, TITLE, optional subtitle, "by Author", a blurb,
"ISBN ...", "Paperbound, N pages", "Php N". The newer site (sinagtalapublishersph, 2022) wins over
the older one when both list a title. Output: one entry per book with its source page URL."""
import html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = ['sinagtalapublishersph.wordpress.com', 'sinagtalapublishers.wordpress.com']  # newest first
SHELF = {  # page slug -> shelf
    'by-saint-josemaria-escriva': 'escriva', 'about-saint-josemaria-escriva-and-opus-dei': 'escriva',
    'spirituality': 'spirituality', 'bibles-and-catechisms': 'bibles-catechism', 'guidebooks-and-booklets': 'guidebooks',
    'leaflets': 'guidebooks', 'lives-of-saints': 'lives', 'childrens-books': 'children', '39-2': 'children',
    'philosophy-ethics': 'philosophy', 'marriage-family-life': 'family', 'new-releases': None,
}


def fetch(site):
    url = f'https://public-api.wordpress.com/rest/v1.1/sites/{site}/posts/?type=page&number=100&fields=ID,title,URL,content'
    return json.loads(subprocess.run(['curl', '-sS', '--max-time', '60', url], check=True, capture_output=True).stdout)


def text(c):
    c = re.sub(r'<img[^>]*>', '\n@@BOOK@@\n', c)
    c = re.sub(r'<(br|/p|/h\d|/li|/figcaption|/div)[^>]*>', '\n', c)
    c = html.unescape(re.sub(r'<[^>]+>', '', c)).replace('\xa0', ' ')
    return [l.strip() for l in c.split('\n')]


def smart_title(s):
    small = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'is'}
    words = s.lower().split()
    out = []
    for i, w in enumerate(words):
        core = w.strip('“”"\'(),:;!?')
        if i and core in small and not out[-1].endswith(':'):
            out.append(w)
        else:
            out.append(re.sub(r"[a-zà-ÿ]", lambda m: m.group(0).upper(), w, count=1))
    t = ' '.join(out)
    t = re.sub(r'(\d)(St|Nd|Rd|Th)\b', lambda m: m.group(1) + m.group(2).lower(), t)
    return t.replace("'S ", "'s ").replace('’S ', '’s ')


def parse(page):
    slug = page['URL'].rstrip('/').rsplit('/', 1)[-1]
    lines = text(page['content'])
    blocks, cur = [], []
    for l in lines:
        if l == '@@BOOK@@':
            if cur:
                blocks.append(cur)
            cur = []
        elif l:
            cur.append(l)
    if cur:
        blocks.append(cur)
    books = []
    for b in blocks:
        isbn = ''
        for l in b:
            m = re.search(r'ISBN[:\s]*((?:97[89][\s-]?)?(?:\d[\s-]?){9}[\dXx])', l, re.I)
            if m:
                isbn = re.sub(r'[^0-9Xx]', '', m.group(1)).upper()
                break
        price = next((float(m.group(1).replace(',', '')) for l in b for m in [re.match(r'(?:Php|PHP|P|₱)\s*([\d,]+(?:\.\d+)?)', l)] if m), None)
        pages = next((int(m.group(1)) for l in b for m in [re.search(r'(\d+)\s+pages', l)] if m), 0)
        if not (isbn or price):
            continue
        edition = r'(ISBN|Php|PHP|₱|\$|©|Paperbound|Hardbound|Paperback|Hardcover|Vinyl|Bible ?paper|Book ?paper|Pocket|\d+ pages|\d{4} Pricelist|\(From \d)'
        head = [l for l in b if not re.match(edition, l, re.I)]
        if not head or not head[0].isupper():
            continue
        title = smart_title(head[0])
        rest = head[1:]
        author, subtitle, desc = '', '', []
        for l in rest:
            m = re.match(r'(?:by|edited by|compiled by)\s+(.+)', l, re.I)
            if m and not author:
                author = m.group(1).strip()
            elif not author and not subtitle and len(l) < 90 and not l.endswith('.'):
                subtitle = l
            else:
                desc.append(l)
        binding = next((l.split(',')[0] for l in b if re.match(r'(Paperbound|Hardbound|Paperback|Hardcover|Vinyl)', l, re.I)), '')
        books.append({'title': title, 'subtitle': smart_title(subtitle) if subtitle.isupper() else subtitle, 'author': author,
                      'blurb': ' '.join(desc), 'isbn': isbn, 'pages': pages, 'price_php': price, 'binding': binding,
                      'shelf': SHELF.get(slug), 'source': page['URL']})
    return books


def main(src=None):
    seen, out = {}, []
    for site in SITES:
        data = json.load(open(os.path.join(src, f'{site}-pages.json'))) if src else fetch(site)
        for page in data['posts']:
            for b in parse(page):
                key = re.sub(r'[^a-z0-9]', '', b['title'].lower())
                if key in seen:
                    e = seen[key]
                    if not e['shelf'] and b['shelf']:
                        e['shelf'] = b['shelf']
                    continue
                seen[key] = b
                out.append(b)
    dst = os.path.join(HERE, 'data', 'research', 'sinag-tala-site.json')
    with open(dst, 'w') as f:
        json.dump({'fetched': '2026-09-26', 'sites': SITES, 'books': out}, f, indent=1, ensure_ascii=False)
    print(len(out), 'books;', sum(1 for b in out if b['price_php']), 'priced;', sum(1 for b in out if not b['shelf']), 'without a shelf')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
