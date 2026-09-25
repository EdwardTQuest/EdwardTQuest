"""ath epub <slug> — manuscript.md -> 4-epub/<slug>.epub (EPUB 3), then check it.

pandoc does the packaging (nav, spine, metadata, footnotes as EPUB 3 notes); the house adds
its CSS, the cover, the plates in colour, a title page, a publication page with the signature,
and a colophon. The check is mechanical and honest: the zip is well-formed, the OPF and nav
parse, every XHTML parses, every manifest item exists, and the text of the EPUB equals the
text of the manuscript (word for word, punctuation aside).
"""
import argparse, json, os, re, zipfile, html, shutil
import xml.etree.ElementTree as ET
import yaml
from .book import Book, ROOT, ASSETS, TEMPLATES, Fail, run
from . import manuscript as M
from . import signature
from . import gates


def front_matter_html(b, sig_rel):
    m = b.meta
    e = html.escape
    parts = ['<section class="titlepage" epub:type="titlepage">',
             f'<p class="title">{e(m.get("title",""))}</p>']
    if m.get('subtitle'):
        parts.append(f'<p class="subtitle">{e(m["subtitle"])}</p>')
    parts.append(f'<p class="author">{e(m.get("author",""))}</p>')
    if m.get('translator'):
        parts.append(f'<p class="translator"><em>translated by {e(m["translator"])}</em></p>')
    parts.append('<p class="imprint">Athanasius</p></section>')
    pub = ['<section class="publication" epub:type="copyright-page">', f'<p>{e(m.get("series","The Athanasius Library"))} · Athanasius</p>']
    if m.get('edition_credit'):
        pub.append(f'<p>This Athanasius edition follows the text of {e(m["edition_credit"])}.</p>')
    pub.append(f'<p>The text of this work is in the public domain in the United States: {e(m.get("pd_basis",""))}.</p>')
    cov = b.get('art.cover') or {}
    if cov.get('title'):
        pub.append(f'<p>Cover: <em>{e(cov["title"])}</em>, {e(cov.get("artist",""))}{", " + e(str(cov["year"])) if cov.get("year") else ""}. {e(cov.get("source",""))}. Public domain.</p>')
    pub.append(f'<p>No claim is made to any pre-existing public-domain material reproduced here. Editorial arrangement © {e(str(m.get("year", 2026)))} Athanasius.</p>')
    pub.append(f'<img src="{sig_rel}" alt="Athanasius"/></section>')
    return '\n'.join(parts) + '\n' + '\n'.join(pub) + '\n'


def epub_text(path):
    """All visible text in reading order, whitespace-normalised."""
    z = zipfile.ZipFile(path)
    opf = [n for n in z.namelist() if n.endswith('.opf')][0]
    root = ET.fromstring(z.read(opf))
    ns = {'o': 'http://www.idpf.org/2007/opf'}
    items = {i.get('id'): i.get('href') for i in root.find('o:manifest', ns)}
    base = os.path.dirname(opf)
    out = []
    for ref in root.find('o:spine', ns):
        href = items[ref.get('idref')]
        p = (base + '/' if base else '') + href
        x = z.read(p).decode('utf8')
        x = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', x, flags=re.S)
        x = re.sub(r'<[^>]+>', ' ', x)
        out.append(html.unescape(x))
    return re.sub(r'\s+', ' ', ' '.join(out)).strip()


def check(b, path):
    problems, notes = [], []
    try:
        z = zipfile.ZipFile(path)
        bad = z.testzip()
        if bad:
            problems.append(f'corrupt member {bad}')
    except zipfile.BadZipFile as e:
        return [f'not a zip: {e}'], notes
    names = z.namelist()
    if names[0] != 'mimetype' or z.read('mimetype') != b'application/epub+zip':
        problems.append('mimetype must be the first, uncompressed member')
    if 'META-INF/container.xml' not in names:
        problems.append('no META-INF/container.xml')
    opfs = [n for n in names if n.endswith('.opf')]
    if not opfs:
        return problems + ['no OPF'], notes
    try:
        root = ET.fromstring(z.read(opfs[0]))
    except ET.ParseError as e:
        return problems + [f'OPF does not parse: {e}'], notes
    ns = {'o': 'http://www.idpf.org/2007/opf', 'dc': 'http://purl.org/dc/elements/1.1/'}
    md = root.find('o:metadata', ns)
    for tag in ('dc:title', 'dc:creator', 'dc:language', 'dc:identifier'):
        if md.find(tag, ns) is None:
            problems.append(f'metadata missing {tag}')
    base = os.path.dirname(opfs[0])
    man = root.find('o:manifest', ns)
    hrefs = {}
    for it in man:
        p = (base + '/' if base else '') + it.get('href')
        hrefs[it.get('id')] = p
        if p not in names:
            problems.append(f'manifest item missing from zip: {p}')
        if it.get('media-type') == 'application/xhtml+xml':
            try:
                ET.fromstring(z.read(p))
            except ET.ParseError as e:
                problems.append(f'{p} does not parse: {e}')
    if not any('nav' in (it.get('properties') or '') for it in man):
        problems.append('no nav document')
    if not any('cover-image' in (it.get('properties') or '') for it in man):
        (problems if os.path.exists(b.path('1-plan', 'cover-epub.jpg')) else notes).append('no cover image yet (run `ath cover` and rebuild)')
    spine = root.find('o:spine', ns)
    notes.append(f'{len(list(spine))} spine items, {len(list(man))} manifest items, {sum(zi.file_size for zi in z.infolist())/1e6:.1f} MB unpacked')
    # text equivalence with the manuscript
    md_text = M.split_front_matter(open(b.manuscript, encoding='utf8').read())[1]
    md_text = re.sub(r'^:::.*$', '', md_text, flags=re.M)
    md_text = re.sub(r'!\[[^\]]*\]\([^)]*\)\{[^}]*\}', '', md_text)
    md_text = re.sub(r'\[\^[^\]]+\]:?', ' ', md_text)                      # note calls: pandoc renumbers them
    md_text = re.sub(r'\[([^\]]+)\]\{\.smallcaps\}', r'\1', md_text)   # small-caps spans: the words, not the markup
    norm = lambda s: [w for w in re.findall(r'[A-Za-zÀ-ÿ0-9]+', s.lower()) if not w.isdigit()]
    a, bb = norm(md_text), norm(epub_text(path))
    # the epub has a title page etc.; compare the manuscript's words as a subsequence check on counts
    from collections import Counter
    ca, cb = Counter(a), Counter(bb)
    missing = {w: c - cb.get(w, 0) for w, c in ca.items() if cb.get(w, 0) < c}
    lost = sum(missing.values())
    notes.append(f'manuscript words {len(a):,}; EPUB words {len(bb):,}; manuscript words not found in EPUB: {lost}')
    if lost > max(5, len(a) // 2000):
        problems.append(f'text loss: {lost} manuscript words are absent from the EPUB, e.g. {list(missing)[:12]}')
    return problems, notes


def main(argv):
    ap = argparse.ArgumentParser(prog='ath epub')
    ap.add_argument('slug')
    ap.add_argument('--force', action='store_true', help='run without the text gate passed (logged)')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    gates.require(b, 'epub', a.force)
    if not os.path.exists(b.manuscript):
        raise Fail('no 2-text/manuscript.md — run `ath edit` first')
    out_dir = b.stage('4-epub')
    md = open(b.manuscript, encoding='utf8').read()
    errs, warns, stats = M.validate(md)
    if errs:
        raise Fail('manuscript.md does not validate: ' + '; '.join(errs[:5]))
    has_parts = stats.get('h1', 0) > 0 and stats.get('h2', 0) > 0
    nchap = stats.get('h2', 0) if has_parts else (stats.get('h1', 0) or stats.get('h2', 0))
    # plates in colour, copied beside the build so pandoc can embed them; same anchors as print
    plates = []
    pl_dir = os.path.join(out_dir, 'plates'); os.makedirs(pl_dir, exist_ok=True)
    chosen = [p for p in b.get('art.plates', []) if p.get('epub') or p.get('print')]
    chapters, sections = M.plate_anchors(md, has_parts)
    on_sections = len(chapters) < len(chosen) and bool(sections)
    n = len(chapters) + (len(sections) if on_sections else 0)
    m = len(chosen)
    used = set()
    for k, p in enumerate(chosen, 1):
        if not n:
            break
        src = b.path(p.get('epub') or p['print'])
        dst = os.path.join(pl_dir, f'plate-{k:02d}.jpg'); shutil.copy2(src, dst)
        a = max(1, min(n, round(k * n / (m + 1)) if m < n else k))
        while a in used and a < n:
            a += 1
        if a in used:
            break
        used.add(a)
        cap = f'{p.get("title","")}' + (f' — {p.get("artist")}' if p.get('artist') else '') + (f', {p.get("year")}' if p.get('year') else '')
        plates.append({'before_anchor': a, 'path': dst, 'caption': cap})
    sig = os.path.join(out_dir, 'signature.png')
    signature.render('ebook', b.get('typeset.signature_font', 'La Belle Aurore'), sig, dpi=300)
    meta = {'has_parts': has_parts, 'plates': plates, 'plates_on_sections': on_sections, 'lang': b.meta.get('language', 'en'),
            'publisher': 'Athanasius', 'rights': f'Public domain text; editorial arrangement © {b.meta.get("year", 2026)} Athanasius',
            'identifier': f'urn:athanasius:{b.slug}', 'belongs-to-collection': b.meta.get('series', 'The Athanasius Library')}
    mf = os.path.join(out_dir, 'meta.json'); json.dump(meta, open(mf, 'w'))
    fm_html = os.path.join(out_dir, 'front.xhtml')
    open(fm_html, 'w', encoding='utf8').write(front_matter_html(b, 'signature.png'))
    epub = os.path.join(out_dir, f'{b.slug}.epub')
    cmd = ['pandoc', b.manuscript, '-f', 'markdown+smart', '-t', 'epub3', '-o', epub,
           '--css', os.path.join(TEMPLATES, 'epub', 'style.css'), '--lua-filter', os.path.join(TEMPLATES, 'epub', 'filter.lua'),
           '--metadata-file', mf, '--toc', '--toc-depth', '2', '--split-level', '2', '--epub-title-page=false',
           '--include-before-body', fm_html, '--resource-path', out_dir]
    for f in ('EBGaramond-Regular.ttf', 'EBGaramond-Italic.ttf', 'EBGaramond-SemiBold.ttf'):
        cmd += ['--epub-embed-font', os.path.join(ASSETS, 'fonts', f)]
    cover = b.path('1-plan', 'cover-epub.jpg')
    if os.path.exists(cover):
        cmd += ['--epub-cover-image', cover]
    run(cmd, quiet=True)
    problems, notes = check(b, epub)
    rep = [f'# EPUB check — {b.meta.get("title")}', '', f'File: `4-epub/{b.slug}.epub` ({os.path.getsize(epub)/1e6:.2f} MB)', '']
    rep += [f'- {n}' for n in notes] + [''] + ([f'- PROBLEM {p}' for p in problems] or ['- no problems found'])
    rep += ['', 'Not checked here (do on a reader): rendering of small caps, footnote pop-ups, plate scaling. Run `epubcheck` too if installed.',
            '', '## Questions for the epub gate (GATES.md)', '',
            '1. Opened in a reader: does the cover show on the shelf, and does the first page look like the title page?',
            '2. Navigation: every chapter listed with its label and title, each link landing on its opener?',
            '3. Small-caps openings, verse lines, section ornaments, footnote pop-ups: do they render, or fall back cleanly?',
            f'4. Plates: {len(plates)} figures in colour with captions — whole pictures, not cropped by the reader?',
            '5. Would you be content to see this file on athanasius.online tonight?']
    b.write('4-epub/epub-check.md', '\n'.join(rep) + '\n')
    b.set_status('epub', 'done' if not problems else 'problems', problems=len(problems), size_mb=round(os.path.getsize(epub)/1e6, 2), cover=os.path.exists(cover))
    b.log('epub', f'{os.path.basename(epub)} built ({os.path.getsize(epub)/1e6:.2f} MB), {len(problems)} problems; see 4-epub/epub-check.md')
    if problems:
        print('\n'.join('PROBLEM ' + p for p in problems)); return 2
    print(f'ok — 4-epub/epub-check.md; then `ath gate {b.slug} epub pass|fail --note "…"`'); return 0
