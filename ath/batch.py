"""ath batch <list.yaml> [--through edit|typeset|epub|proof] [--from STAGE] — many books, one table.

The list is a YAML sequence of {slug, title, author, gutenberg, url|file, translator?, year?}.
Each book runs new → plan → edit (→ typeset → epub → proof when its text gate is passed, or
--force). Writes books/_batch-report.md: one row per book with the numbers the gates need,
and the time each stage took. Judgement stays per book (`ath gate`); the batch only carries.
"""
import argparse, os, time, urllib.request, sys, io, contextlib
import yaml
from .book import Book, BOOKS, UA, Fail, new_book, slugify
from . import gates


def fetch(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if len(data) < 5000:
        raise Fail(f'too small: {url}')
    open(dest, 'wb').write(data)
    return dest


def run_stage(mod, argv):
    t = time.time()
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            rc = mod.main(argv)
    except Fail as e:
        rc = 2; buf.write(str(e.code) + '\n')
    except Exception as e:
        rc = 3; buf.write(f'{e.__class__.__name__}: {e}\n')
    return rc, time.time() - t, buf.getvalue()


def main(argv):
    ap = argparse.ArgumentParser(prog='ath batch')
    ap.add_argument('list')
    ap.add_argument('--through', default='edit', choices=['edit', 'typeset', 'epub', 'proof'])
    ap.add_argument('--from', dest='start', default='new', choices=['new', 'edit', 'typeset', 'epub', 'proof'])
    ap.add_argument('--force', action='store_true', help='run past unpassed gates (logged per book)')
    ap.add_argument('--only', help='comma-separated slugs')
    a = ap.parse_args(argv)
    items = yaml.safe_load(open(a.list, encoding='utf8'))
    only = set(a.only.split(',')) if a.only else None
    order = ['new', 'edit', 'typeset', 'epub', 'proof']
    rows = []
    from . import plan as P, edit as E, typeset as T, epub as EP, proof as PR
    for it in items:
        slug = slugify(it['slug'])
        if only and slug not in only:
            continue
        rec = {'slug': slug, 'title': it['title'], 'author': it['author'], 'words': '', 'chapters': '', 'suspicious': '', 'battery': '',
               'errors': '', 'pages': '', 'layout': '', 'epub': '', 'proof': '', 'time': {}, 'note': ''}
        try:
            if order.index(a.start) <= 0:
                if not os.path.exists(os.path.join(BOOKS, slug, 'book.yaml')):
                    t = time.time()
                    b = new_book(slug, it['title'], it['author'], translator=it.get('translator', ''), kind='gutenberg' if it.get('gutenberg') else 'text',
                                 gutenberg=it.get('gutenberg'), edition_credit=it.get('edition_credit', ''))
                    src = b.path('0-source', f'pg{it.get("gutenberg", "")}.txt' if it.get('gutenberg') else 'source.txt')
                    if it.get('url'):
                        fetch(it['url'], src)
                    elif it.get('file'):
                        import shutil; shutil.copy2(it['file'], src)
                    b.meta['source']['files'] = [os.path.relpath(src, b.dir)]
                    if it.get('year'):
                        b.meta['year_first'] = it['year']
                    if it.get('expected_sections'):
                        b.meta['checks'] = {'expected_sections': it['expected_sections']}
                    b.save()
                    rec['time']['new'] = round(time.time() - t, 1)
                    run_stage(P, [slug])
            b = Book(slug)
            if order.index(a.start) <= 1 and order.index(a.through) >= 1:
                rc, dt, out = run_stage(E, [slug]); rec['time']['edit'] = round(dt, 1)
                st = Book(slug).get('status.edit') or {}
                rec.update(words=st.get('words'), chapters=st.get('chapters'), suspicious=st.get('suspicious'), battery=st.get('battery'), errors=st.get('errors'))
                if rc:
                    rec['note'] += f'edit rc {rc}: {out.strip()[-160:]}; '
            if order.index(a.start) <= 2 and order.index(a.through) >= 2:
                rc, dt, out = run_stage(T, [slug] + (['--force'] if a.force else [])); rec['time']['typeset'] = round(dt, 1)
                st = Book(slug).get('status.typeset') or {}
                rec['pages'] = '/'.join(str(st.get(e, {}).get('pages', '')) for e in ('deluxe', 'everyman', 'scholar'))
                rec['layout'] = '; '.join(f'{e[0]}:{",".join(f"{k[:5]} {v}" for k, v in (st.get(e, {}).get("layout") or {}).items())}' for e in ('deluxe', 'everyman', 'scholar') if st.get(e))
                if rc:
                    rec['note'] += f'typeset rc {rc}: {out.strip()[-200:]}; '
            if order.index(a.start) <= 3 and order.index(a.through) >= 3:
                rc, dt, out = run_stage(EP, [slug] + (['--force'] if a.force else [])); rec['time']['epub'] = round(dt, 1)
                st = Book(slug).get('status.epub') or {}
                rec['epub'] = f'{st.get("size_mb")} MB, {st.get("problems")} problems'
                if rc:
                    rec['note'] += f'epub rc {rc}: {out.strip()[-160:]}; '
            if order.index(a.start) <= 4 and order.index(a.through) >= 4:
                rc, dt, out = run_stage(PR, [slug]); rec['time']['proof'] = round(dt, 1)
                rec['proof'] = (Book(slug).get('status.proof') or {}).get('findings')
                if rc:
                    rec['note'] += f'proof rc {rc}: {out.strip()[-160:]}; '
        except Exception as e:
            rec['note'] += f'{e.__class__.__name__}: {str(e)[:200]}'
        rows.append(rec)
        print(f'{slug:36s} words {rec["words"]!s:>7} ch {rec["chapters"]!s:>4} susp {rec["suspicious"]!s:>3} batt {rec["battery"]!s:>3} err {rec["errors"]!s:>2} pages {rec["pages"]:14s} {rec["note"][:90]}')
    lines = ['# Batch report', '', f'List: `{a.list}` · through `{a.through}` · {len(rows)} books', '',
             '| slug | words | chapters | suspicious | battery | errors | pages D/E/S | layout | epub | proof | seconds | note |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for r in rows:
        secs = ' '.join(f'{k} {v}' for k, v in r['time'].items())
        lines.append(f'| {r["slug"]} | {r["words"]} | {r["chapters"]} | {r["suspicious"]} | {r["battery"]} | {r["errors"]} | {r["pages"]} | {r["layout"]} | {r["epub"]} | {r["proof"]} | {secs} | {r["note"][:200].replace("|", "/")} |')
    os.makedirs(BOOKS, exist_ok=True)
    open(os.path.join(BOOKS, '_batch-report.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n')
    print('\nbooks/_batch-report.md written')
    return 0
