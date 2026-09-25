"""ath proof <slug> — the lens battery. A pass is only clean for what it looked at.

Each lens states its scope and its finding count; "clean" is never written without both.
The mechanical lenses run here; the reading lenses (specialist reviewers, AGENTS.md) write
their reports into 5-proof/reports/ and the overseer folds them into PROOF.md.

    3  structure and sequence     numbered headings 1..n; paragraph splits; doubled words; quotes
    5  dictionary                 every token not in the wordlist, with context
    7  apparatus                  contents vs headings (EPUB nav); note calls vs notes; front/back matter present
    8  cross-edition consistency  the three PDFs and the EPUB carry the same words as the manuscript
    9  mechanical                 page size = trim, fonts embedded, page count within KDP, EPUB structure
   10  render and look            contact sheets of sampled pages per edition, for the overseer's eyes
"""
import argparse, os, re, zipfile, html, collections
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
from .book import Book, EDITIONS, Fail, run, pdf_pages
from . import manuscript as M
from . import edit as E
from . import epub as EP
from . import tracker

TRIMS = {'deluxe': (5.0, 7.0), 'everyman': (4.25, 6.375), 'scholar': (5.0, 7.0)}


def pdf_text(path):
    code, out, _ = run(['pdftotext', '-layout', path, '-'], check=False, quiet=True)
    return out if code == 0 else ''


def pdf_info(path):
    code, out, _ = run(['pdfinfo', path], check=False, quiet=True)
    info = dict(re.findall(r'^([^:]+):\s+(.*)$', out, re.M)) if code == 0 else {}
    code, fonts, _ = run(['pdffonts', path], check=False, quiet=True)
    lines = [l for l in fonts.split('\n')[2:] if l.strip()]
    unembedded = [l.split()[0] for l in lines if re.search(r'\s(no)\s+(yes|no)\s', l)]
    return info, len(lines), unembedded


def words(s):
    s = re.sub(r'-\n\s*', '', s)                     # hyphenated line ends in PDF text
    return re.findall(r'[a-zà-ÿ0-9]+', s.lower())


def nav_titles(epub_path):
    z = zipfile.ZipFile(epub_path)
    nav = [n for n in z.namelist() if n.endswith('nav.xhtml')]
    if not nav:
        return []
    x = z.read(nav[0]).decode('utf8')
    x = re.sub(r'<span class="label">(.*?)</span>', r'\1. ', x)
    return [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', t))).strip() for t in re.findall(r'<a [^>]*>(.*?)</a>', x, re.S)]


def contact_sheet(pages_dir, edition, out, cols=4):
    files = sorted([f for f in os.listdir(pages_dir) if f.startswith(edition + '-')], key=lambda f: int(f.split('-')[1].split('.')[0]))
    if not files:
        return None
    ims = [Image.open(os.path.join(pages_dir, f)).convert('RGB') for f in files]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + 8) + 8, rows * (h + 26) + 8), (80, 80, 80))
    d = ImageDraw.Draw(S)
    for i, (f, im) in enumerate(zip(files, ims)):
        x = 8 + (i % cols) * (w + 8); y = 8 + (i // cols) * (h + 26)
        S.paste(im, (x, y)); d.text((x + 3, y + h + 6), f.replace('.png', ''), fill=(255, 255, 255))
    S.save(out, quality=80)
    return len(files)


def main(argv):
    ap = argparse.ArgumentParser(prog='ath proof')
    ap.add_argument('slug')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    if not os.path.exists(b.manuscript):
        raise Fail('no manuscript.md')
    pd = b.stage('5-proof'); os.makedirs(os.path.join(pd, 'reports'), exist_ok=True)
    md = open(b.manuscript, encoding='utf8').read()
    errs, warns, stats = M.validate(md)
    lenses = []      # (number, name, scope, count, detail lines, status)

    # 3 structure and sequence
    seq = E.sequence_proof(md, b.get('checks.expected_sections'))
    bat = E.structure_battery(md)
    body = M.split_front_matter(md)[1]
    stray = [(m.start(), body[max(0, m.start() - 30):m.end() + 30].replace('\n', ' ')) for m in re.finditer(r'(?<!\*)\*(?!\s?\*)(?![^*\n]*\*)|(?<![\[\w])_(?![\w])|\^|(?<!\[)\^|\[(?!\^)', body)]
    n3 = len(bat) + len([s for s in seq if 'GAP' in s or 'REPEAT' in s or 'MISMATCH' in s]) + len(stray) + len(errs)
    lenses.append((3, 'structure and sequence', f'every heading and paragraph of manuscript.md ({stats.get("words",0):,} words, {stats.get("chapters")} chapters)', n3,
                   [f'- {s}' for s in seq] + [f'- {k}: {v}' for k, v in bat[:40]] + [f'- stray mark: …{c}…' for _, c in stray[:30]] + [f'- ERROR {e}' for e in errs], 'clean' if n3 == 0 else 'findings'))

    # 4 page layout (from typeset-report.md, re-run here on the current PDFs)
    from . import layout_check
    a4 = []
    n4 = 0
    for e in b.get('editions', EDITIONS):
        p = b.path('3-typeset', f'{e}.pdf')
        if not os.path.exists(p):
            continue
        fnd, lst = layout_check.analyze(p)
        counts = {k: v for k, v in lst.items() if k not in ('pages', 'measure_in', 'line_height_pt')}
        n4 += sum(counts.values())
        a4.append(f'- {e}: {counts or "nothing found"} — see 3-typeset/typeset-report.md for the pages')
    lenses.append((4, 'page layout', 'every page of every PDF: widows, orphans, runts, hyphen stacks, loose lines, stranded headings, thin chapter ends', n4, a4 or ['- no PDFs yet'], 'clean' if n4 == 0 else 'findings'))

    # 5 dictionary
    unknown, names, total, ctx, _italic = E.dictionary_sweep(md)
    n5 = sum(unknown.values())
    top = sorted(unknown.items(), key=lambda kv: -kv[1])
    lenses.append((5, 'dictionary sweep', f'every token of the body ({total:,}); wordlist + house list; names accepted when capitalised mid-sentence ({len(names)})', n5,
                   [f'- {w} ×{c} — {ctx(w)}' for w, c in top[:60]] + (['- …'] if len(top) > 60 else []), 'read the list' if n5 else 'clean'))

    # 7 apparatus
    heads = [(lv, lab, ttl) for lv, lab, ttl, ln in M.chapter_titles(md)]
    chap_titles = [(lab + '. ' + ttl if lab and ttl else lab or ttl) for lv, lab, ttl in heads if lv <= 2]
    epub_path = b.path('4-epub', f'{b.slug}.epub')
    a7 = []
    if os.path.exists(epub_path):
        nav = nav_titles(epub_path)
        missing = [t for t in chap_titles if not any(re.sub(r'\W', '', t).lower() == re.sub(r'\W', '', n).lower() for n in nav)]
        extra = [n for n in nav if not any(re.sub(r'\W', '', t).lower() == re.sub(r'\W', '', n).lower() for t in chap_titles)]
        a7 += [f'- EPUB nav: {len(nav)} entries vs {len(chap_titles)} chapter headings; missing from nav: {missing[:8] or "none"}; extra in nav: {extra[:8] or "none"}']
    else:
        a7.append('- no EPUB yet')
    notes_called = len(set(M.NOTE_REF.findall(body))); notes_defined = len(set(M.NOTE_DEF.findall(body)))
    a7.append(f'- notes: {notes_called} called, {notes_defined} defined' + ('' if notes_called == notes_defined else ' — MISMATCH'))
    for e in b.get('editions', EDITIONS):
        p = b.path('3-typeset', f'{e}.pdf')
        if os.path.exists(p):
            t = pdf_text(p)
            want = [b.meta.get('title', ''), b.meta.get('author', ''), 'ATHANASIUS', f'{e} edition', 'Contents', 'This edition of']
            miss = [w for w in want if w and w.lower() not in t.lower()]
            a7.append(f'- {e}.pdf front/back matter: title page, publication page, contents, colophon — missing: {miss or "none"}')
    n7 = sum(1 for l in a7 if 'MISMATCH' in l or 'missing from nav: [' in l or "missing: ['" in l)
    lenses.append((7, 'apparatus', 'contents vs headings, note calls vs notes, front and back matter present in every edition', n7, a7, 'clean' if n7 == 0 else 'findings'))

    # 8 cross-edition consistency
    a8 = []
    mw = collections.Counter(words(re.sub(r'^(#+ |\||>|:::).*$', '', body, flags=re.M)))
    for e in b.get('editions', EDITIONS):
        p = b.path('3-typeset', f'{e}.pdf')
        if not os.path.exists(p):
            a8.append(f'- {e}: no PDF'); continue
        pw = collections.Counter(words(pdf_text(p)))
        lost = {w: c - pw.get(w, 0) for w, c in mw.items() if pw.get(w, 0) < c}
        n = sum(lost.values())
        a8.append(f'- {e}: manuscript words absent from the PDF text: {n}' + (f' (e.g. {list(lost)[:10]})' if n else '') + ' — hyphenation and ligatures account for a handful; more than ~0.1% is a real loss')
    if os.path.exists(epub_path):
        pr, nt = EP.check(b, epub_path)
        a8 += [f'- epub: {n}' for n in nt] + [f'- epub PROBLEM {p}' for p in pr]
    n8 = sum(1 for l in a8 if 'PROBLEM' in l or 'no PDF' in l)
    lenses.append((8, 'cross-edition consistency', 'the words of manuscript.md against the text of each PDF and of the EPUB', n8, a8, 'clean' if n8 == 0 else 'findings'))

    # 9 mechanical
    a9 = []
    for e in b.get('editions', EDITIONS):
        p = b.path('3-typeset', f'{e}.pdf')
        if not os.path.exists(p):
            continue
        info, nfonts, unemb = pdf_info(p)
        size = info.get('Page size', '')
        m = re.search(r'([\d.]+) x ([\d.]+)', size)
        ok_size = False
        if m:
            w_in, h_in = float(m.group(1)) / 72, float(m.group(2)) / 72
            tw, th = TRIMS[e]
            ok_size = abs(w_in - tw) < 0.01 and abs(h_in - th) < 0.01
        pages = pdf_pages(p)
        a9.append(f'- {e}: {pages} pages ({"even" if pages % 2 == 0 else "odd — KDP adds a blank leaf"}), page size {size} {"= trim" if ok_size else "≠ TRIM " + str(TRIMS[e])}, fonts {nfonts}, unembedded {unemb or "none"}, {"within" if 24 <= pages <= 828 else "OUTSIDE"} KDP 24–828')
    n9 = sum(1 for l in a9 if '≠ TRIM' in l or 'OUTSIDE' in l or ('unembedded' in l and 'none' not in l))
    lenses.append((9, 'mechanical', 'PDF page size, page count, embedded fonts; EPUB structure (see lens 8)', n9, a9, 'clean' if n9 == 0 else 'findings'))

    # 10 render and look
    a10 = []
    pages_dir = b.path('3-typeset', 'pages')
    if os.path.isdir(pages_dir):
        for e in b.get('editions', EDITIONS):
            n = contact_sheet(pages_dir, e, os.path.join(pd, f'pages-{e}.jpg'))
            if n:
                a10.append(f'- 5-proof/pages-{e}.jpg — {n} sampled pages. LOOK AT IT: openers, running heads, verse, notes, the last page.')
    cc = b.path('1-plan', 'cover-contact.jpg')
    if os.path.exists(cc):
        a10.append('- 1-plan/cover-contact.jpg — the three fronts. LOOK AT IT: whole painting, no crop of the subject, legible type, nothing unsuitable.')
    lenses.append((10, 'render and look', 'sampled pages of every edition; the covers', len(a10), a10, 'needs eyes'))

    # the report
    out = [f'# PROOF — {b.meta.get("title")} — {b.meta.get("author")}', '',
           'A pass is only clean for what it looked at, through the lens it used. Every lens below states its scope and its count.', '',
           '| # | lens | scope | findings | status |', '|---|---|---|---|---|']
    for n, name, scope, cnt, det, st in lenses:
        out.append(f'| {n} | {name} | {scope} | {cnt} | {st} |')
    out += ['', '## Reading lenses (specialist reviewers, AGENTS.md) — reports in 5-proof/reports/', '',
            '| # | lens | report | findings |', '|---|---|---|---|']
    rdir = os.path.join(pd, 'reports')
    reps = sorted(os.listdir(rdir))
    for r in reps:
        txt = open(os.path.join(rdir, r), encoding='utf8', errors='replace').read()
        m = re.search(r'(?i)findings?:\s*(\d+)', txt)
        out.append(f'| — | {r} | 5-proof/reports/{r} | {m.group(1) if m else "?"} |')
    if not reps:
        out += ['| 1–2 | word-by-word against a witness | (not run) | — |', '| 6 | fresh specialist readers | (not run) | — |', '| 7r | apparatus read by a reviewer | (not run) | — |']
    for n, name, scope, cnt, det, st in lenses:
        out += ['', f'## Lens {n} · {name} — {cnt} ({st})', f'*Scope:* {scope}', ''] + (det or ['- nothing to report'])
    gs = b.meta.get('gates') or {}
    out += ['', '## Gates (GATES.md)', '', '| gate | verdict | when | by | note |', '|---|---|---|---|---|']
    from . import gates as G
    for g in G.GATES:
        v = gs.get(g) or {}
        out.append(f'| {g} | {v.get("verdict", "undecided")} | {v.get("when", "")} | {v.get("by", "")} | {(v.get("note") or "").replace("|", "/")[:120]} |')
    if b.meta.get('forced'):
        out.append(f'\nFORCED past gates: {b.meta["forced"]}')
    out += ['', '## Definition of done', '',
            '- [ ] lenses 3, 5, 7, 8, 9 at zero findings, or every remaining finding recorded in changes.csv with a decision',
            '- [ ] lens 10 looked at by the overseer (say so in NOTES.md, with the date)',
            '- [ ] at least one reading lens run by a reviewer who did not build the book (word-by-word against a witness, or apparatus)',
            '- [ ] NOTES.md complete: edition, witnesses, decisions, open flags; CHANGES.md rendered',
            '- [ ] cover: whole painting, no nudity, no religious subject, painting not in art/used.csv before this book',
            '- [ ] KDP: page count 24–828, PDF page size = trim, fonts embedded; cover spreads sized from the final page counts',
            '- [ ] run-log.md has today\'s entry',
            '- [ ] every gate passed with a written note; nothing forced']
    b.write('5-proof/PROOF.md', '\n'.join(out) + '\n')
    tracker.render(b)
    total = sum(c for _, _, _, c, _, st in lenses if st == 'findings')
    b.set_status('proof', 'done', findings=total)
    b.log('proof', f'PROOF.md written; findings: ' + ', '.join(f'{name} {cnt}' for _, name, _, cnt, _, _ in lenses))
    print(f'ok — 5-proof/PROOF.md ({total} findings across the mechanical lenses)')
    return 0
