"""ath typeset <slug> [--edition deluxe|everyman|scholar|all] — manuscript.md -> print PDFs.

    pandoc (markdown -> typst body, via templates/typst/filter.lua)
    + templates/typst/house.typ (one template, three editions)
    -> 3-typeset/<edition>.pdf, sized to KDP (inside margin raised by page count),
       3-typeset/pages/<edition>-NNN.png samples to look at (six runs out of six, looking caught
       what nothing programmatic did), page count and spine width into book.yaml.
"""
import argparse, json, os, re, shutil, math
import yaml
from .book import Book, ROOT, ASSETS, TEMPLATES, EDITIONS, Fail, run, pdf_pages
from . import manuscript as M
from . import signature

# KDP minimum inside (gutter) margin by page count, inches
KDP_INSIDE = [(150, 0.375), (300, 0.5), (500, 0.625), (700, 0.75), (828, 0.875)]
KDP_MAX_PAGES = 828
# paper thickness for spine width: KDP cream 0.0025 in/page, white 0.002252
PAPER = {'cream': 0.0025, 'white': 0.002252}


def kdp_inside(pages):
    for lim, m in KDP_INSIDE:
        if pages <= lim:
            return m
    return None


def plates_for(b, md, has_parts):
    """Spread the chosen plates over the chapters; when a book has fewer chapters than plates,
    over chapters and sections together (a plate leaf before a section is fine). Returns
    (plates, on_sections)."""
    plates = [p for p in b.get('art.plates', []) if p.get('print')]
    chapters, sections = M.plate_anchors(md, has_parts)
    if not plates or not (chapters or sections):
        return [], False
    on_sections = len(chapters) < len(plates) and bool(sections)
    n = len(chapters) + (len(sections) if on_sections else 0)
    m = len(plates)
    out, used = [], set()
    for k, p in enumerate(plates, 1):
        a = max(1, min(n, round(k * n / (m + 1)) if m < n else k))
        while a in used and a < n:
            a += 1
        if a in used:
            break
        used.add(a)
        cap = f'{p.get("title","")}' + (f' — {p.get("artist")}' if p.get('artist') else '') + (f', {p.get("year")}' if p.get('year') else '')
        out.append({'before_anchor': a, 'path': '/' + os.path.relpath(b.path(p['print']), ROOT), 'caption': cap.replace('[', '\\[').replace(']', '\\]')})
    return out, on_sections


def publication_lines(b, edition):
    m = b.meta
    L = [f'#smallcaps(all: true)[athanasius]',
         f'{m.get("series", "The Athanasius Library")}',
         '']
    if m.get('edition_credit'):
        L.append(f'This Athanasius edition follows the text of {m["edition_credit"]}.')
    L.append(f'The text of this work is in the public domain in the United States: {m.get("pd_basis", "published before 1 January 1931")}.')
    cov = b.get('art.cover') or {}
    if cov.get('title'):
        L.append(f'Cover: #emph[{cov["title"]}], {cov.get("artist", "")}{", " + str(cov["year"]) if cov.get("year") else ""}. {cov.get("source", "")}. Public domain.'.replace('. .', '.'))
    if b.get('art.plates'):
        L.append(f'The plates are public-domain paintings; each is credited beneath it.')
    L.append('Set in EB Garamond. Printed in the United States of America.')
    L.append(f'No claim is made to any pre-existing public-domain material reproduced here. Editorial arrangement © {m.get("year", 2026)} Athanasius.')
    esc = lambda s: s.replace('@', '\\@').replace('$', '\\$').replace('<', '\\<').replace('>', '\\>')
    return [esc(l) if not l.startswith('#') else l for l in L]


def build_body(b, has_parts, plates, opening_sc, on_sections=False):
    meta = {'has_parts': has_parts, 'opening_smallcaps': opening_sc, 'plates': plates, 'plates_on_sections': on_sections}
    mf = b.path('3-typeset', 'meta.json')
    json.dump(meta, open(mf, 'w'))
    out = b.path('3-typeset', 'body.typ')
    run(['pandoc', b.manuscript, '-f', 'markdown+smart', '-t', 'typst', '--wrap=none',
         '--lua-filter', os.path.join(TEMPLATES, 'typst', 'filter.lua'), '--metadata-file', mf, '-o', out], quiet=True)
    # an #include'd file has its own scope: it must import the house names (chlabel, verse, plate, ...)
    body = open(out, encoding='utf8').read()
    open(out, 'w', encoding='utf8').write('#import "/templates/typst/house.typ": *\n' + body)
    return out


def typ_str(s):
    return '"' + str(s).replace('\\', '\\\\').replace('"', '\\"') + '"'


def main_typ(b, edition, sig_png, inside_override=None, has_parts=False):
    m = b.meta
    pub = publication_lines(b, edition)
    meta = ', '.join([
        f'title: {typ_str(m.get("title",""))}', f'author: {typ_str(m.get("author",""))}', f'subtitle: {typ_str(m.get("subtitle",""))}',
        f'translator: {typ_str(m.get("translator",""))}', f'series: {typ_str(m.get("series","The Athanasius Library"))}',
        f'year: {typ_str(m.get("year", 2026))}', f'has_parts: {"true" if has_parts else "false"}',
        f'opening_smallcaps: {"true" if b.get("typeset.opening_smallcaps", True) else "false"}',
        'publication: (' + ', '.join('[' + p + ']' for p in pub) + ',)',
        f'signature: {typ_str("/" + os.path.relpath(sig_png, ROOT))}',
    ])
    override = ''
    if inside_override:
        override = f'#set page(margin: (inside: {inside_override}in))\n'
    return (f'#import "/templates/typst/house.typ": book\n'
            f'#show: book.with(({meta}), ed-name: "{edition}")\n{override}'
            f'#include "/books/{b.slug}/3-typeset/body.typ"\n')


def render_pages(b, edition, pdf, pages):
    """Page images to look at: front matter, the first chapter, a spread from the middle, the end."""
    out = b.path('3-typeset', 'pages'); os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.startswith(edition + '-'):
            os.remove(os.path.join(out, f))
    want = sorted(set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] + [pages // 3, pages // 3 + 1, pages // 2, pages // 2 + 1, pages - 1, pages]))
    want = [p for p in want if 1 <= p <= pages]
    spec = ','.join(str(p) for p in want)
    run(['typst', 'compile', '--root', ROOT, '--font-path', os.path.join(ASSETS, 'fonts'), '--format', 'png', '--ppi', '96',
         '--pages', spec, b.path('3-typeset', f'main-{edition}.typ'), os.path.join(out, f'{edition}-{{p}}.png')], quiet=True)
    return want


def typeset(b, edition):
    md = open(b.manuscript, encoding='utf8').read()
    errs, warns, stats = M.validate(md)
    if errs:
        raise Fail('manuscript.md does not validate: ' + '; '.join(errs[:5]))
    has_parts = stats.get('h1', 0) > 0 and stats.get('h2', 0) > 0
    plates, on_sections = plates_for(b, md, has_parts)
    b.stage('3-typeset')
    build_body(b, has_parts, plates, b.get('typeset.opening_smallcaps', True), on_sections)
    sig = b.path('3-typeset', f'signature-{edition}.png')
    signature.render(edition, b.get('typeset.signature_font', 'La Belle Aurore'), sig)
    main_path = b.path('3-typeset', f'main-{edition}.typ')
    pdf = b.path('3-typeset', f'{edition}.pdf')
    inside = None
    for attempt in range(2):
        open(main_path, 'w', encoding='utf8').write(main_typ(b, edition, sig, inside, has_parts))
        code, out, err = run(['typst', 'compile', '--root', ROOT, '--font-path', os.path.join(ASSETS, 'fonts'), main_path, pdf], check=False, quiet=True)
        if code != 0:
            raise Fail(f'typst failed for {edition}:\n{err[-3000:]}')
        pages = pdf_pages(pdf)
        need = kdp_inside(pages)
        tpl_inside = {'deluxe': 0.75, 'everyman': 0.60, 'scholar': 0.85}[edition]
        if need is None:
            b.log('typeset', f'{edition}: {pages} pages exceeds KDP maximum {KDP_MAX_PAGES}; split the volume (see PIPELINE.md)')
            break
        if need > (inside or tpl_inside) and attempt == 0:
            inside = need
            continue
        break
    spine = round(pages * PAPER['cream'], 3)
    sample = render_pages(b, edition, pdf, pages)
    st = b.meta.setdefault('status', {}).setdefault('typeset', {})
    st[edition] = {'pages': pages, 'spine_in': spine, 'inside_margin': inside or tpl_inside, 'plates': len(plates), 'plates_on_sections': on_sections, 'pdf': f'3-typeset/{edition}.pdf'}
    b.save()
    b.log('typeset', f'{edition}: {pages} pages, spine {spine} in (cream), inside margin {inside or tpl_inside} in, {len(plates)} plates; page samples {sample[:6]}… in 3-typeset/pages/')
    return pages


def main(argv):
    ap = argparse.ArgumentParser(prog='ath typeset')
    ap.add_argument('slug')
    ap.add_argument('--edition', default='all', choices=EDITIONS + ['all'])
    a = ap.parse_args(argv)
    b = Book(a.slug)
    if not os.path.exists(b.manuscript):
        raise Fail('no 2-text/manuscript.md — run `ath edit` first')
    eds = EDITIONS if a.edition == 'all' else [a.edition]
    eds = [e for e in eds if e in b.get('editions', EDITIONS)]
    for e in eds:
        typeset(b, e)
    print('ok — look at 3-typeset/pages/*.png before going on')
    return 0
