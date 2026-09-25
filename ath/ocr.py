"""ath ocr <slug> — witnesses, consensus, the known error families, a report. Never invent.

Witnesses gathered into 2-text/witnesses/ (each a plain text, pages separated by form feeds
where the source has pages):
    ia-<id>.txt       archive.org's own OCR (…_djvu.txt) for every id in book.yaml source.archive
    pg-<n>.txt        the Project Gutenberg transcription, if source.gutenberg is set
    layer.txt         the scan PDF's embedded text layer (pdftotext), if it has one
    tess-psm3.txt     tesseract on the page images, automatic layout
    tess-psm4.txt     tesseract on the page images, single-column assumption
    text-<name>.txt   any .txt already in 0-source (an earlier edited text)

Then, on the base witness (the best one we have), every other witness votes:
    substitution   needs a majority AND a dictionary word AND the base token is NOT a real word
    insertion      needs a majority AND is refused if it would split a real base word
    deletion       needs unanimity AND is refused if the base token is a real word
    where the base and the witnesses both read real words, the base stands; the variant is recorded
Furniture (folios, running heads, signature marks) is removed per page before voting; line-end
hyphens are rejoined by dictionary. The families the guide names (small-caps damage, lost drop
capitals, page-turn splits) are restored by name, each exactly once, from book.yaml `ocr.restore`.

Output: 2-text/consensus.txt (for `ath edit`), 2-text/ocr-report.md, 2-text/flags.csv.
"""
import argparse, collections, csv, difflib, glob, os, re, shutil, subprocess, urllib.request
from .book import Book, UA, Fail, run
from . import edit as E
from . import tracker

FF = '\f'


def fetch_text(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if len(data) < 2000:
        raise Fail(f'download too small: {url}')
    open(dest, 'wb').write(data)
    return dest


def gather(b, dpi, psms):
    wd = b.stage('2-text/witnesses')
    got = []
    for ident in b.get('source.archive', []) or []:
        dest = os.path.join(wd, f'ia-{ident}.txt')
        if not os.path.exists(dest):
            try:
                fetch_text(f'https://archive.org/download/{ident}/{ident}_djvu.txt', dest)
                b.log('ocr', f'fetched archive.org text for {ident}')
            except Exception as e:
                b.log('ocr', f'archive.org {ident}: {e} (network blocked here? download {ident}_djvu.txt by hand into 2-text/witnesses/)')
                continue
        got.append(dest)
    pg = b.get('source.gutenberg')
    if pg:
        dest = os.path.join(wd, f'pg-{pg}.txt')
        if not os.path.exists(dest):
            for u in (f'https://www.gutenberg.org/cache/epub/{pg}/pg{pg}.txt', f'https://www.gutenberg.org/files/{pg}/{pg}-0.txt'):
                try:
                    fetch_text(u, dest); b.log('ocr', f'fetched Project Gutenberg #{pg}'); break
                except Exception as e:
                    err = e
            else:
                b.log('ocr', f'Project Gutenberg #{pg}: {err} (download by hand into 2-text/witnesses/pg-{pg}.txt)')
        if os.path.exists(dest):
            got.append(dest)
    for f in sorted(glob.glob(b.path('0-source', '*.txt'))):
        dest = os.path.join(wd, 'text-' + os.path.basename(f))
        shutil.copy2(f, dest); got.append(dest)
    pdfs = sorted(glob.glob(b.path('0-source', '*.pdf')))
    pages_dir = b.path('0-source', 'pages')
    pngs = sorted(glob.glob(os.path.join(pages_dir, '*.png'))) + sorted(glob.glob(b.path('0-source', 'pages', '*.jpg')))
    for pdf in pdfs:
        code, out, _ = run(['pdftotext', '-layout', pdf, '-'], check=False, quiet=True)
        if code == 0 and len(out.split()) > 200:
            open(os.path.join(wd, 'layer.txt'), 'w', encoding='utf8').write(out); got.append(os.path.join(wd, 'layer.txt'))
        if not pngs:
            os.makedirs(pages_dir, exist_ok=True)
            run(['pdftoppm', '-r', str(dpi), '-gray', '-png', pdf, os.path.join(pages_dir, 'p')], quiet=True)
            pngs = sorted(glob.glob(os.path.join(pages_dir, '*.png')))
            b.log('ocr', f'rendered {len(pngs)} pages at {dpi} dpi from {os.path.basename(pdf)}')
    if pngs:
        for psm in psms:
            dest = os.path.join(wd, f'tess-psm{psm}.txt')
            if os.path.exists(dest):
                got.append(dest); continue
            texts = []
            for i, png in enumerate(pngs, 1):
                code, out, err = run(['tesseract', png, '-', '--psm', str(psm), '-l', 'eng'], check=False, quiet=True)
                texts.append(out if code == 0 else '')
            open(dest, 'w', encoding='utf8').write(FF.join(texts))
            got.append(dest)
            b.log('ocr', f'tesseract psm {psm}: {len(pngs)} pages, {sum(len(t.split()) for t in texts):,} words')
    return got


# ---------------------------------------------------------------- cleaning
def strip_furniture(text, title_words=()):
    """Per page: drop folios, running heads (lines repeated at page tops/bottoms), signature marks."""
    pages = text.split(FF) if FF in text else [text]
    tops, bottoms = collections.Counter(), collections.Counter()
    def norm(l):
        return re.sub(r'[\d\s\W]+', ' ', l).strip().lower()
    for pg in pages:
        ls = [l for l in pg.split('\n') if l.strip()]
        if ls:
            tops[norm(ls[0])] += 1
            bottoms[norm(ls[-1])] += 1
    repeated = {k for k, c in (tops + bottoms).items() if c >= 3 and k}
    removed = collections.Counter()
    out = []
    for pg in pages:
        ls = pg.split('\n')
        keep = []
        for j, l in enumerate(ls):
            s = l.strip()
            if not s:
                keep.append(l); continue
            edge = (j < 2) or (j > len(ls) - 3)
            if re.fullmatch(r'[\divxlc]{1,4}', s.lower()) and edge:
                removed['folio'] += 1; continue
            if edge and norm(s) in repeated and len(s) < 70:
                removed['running head'] += 1; continue
            if edge and re.fullmatch(r'[A-Z]{1,3}\s*[IVXLC]{0,5}\s*\d{0,3}', s) and len(s) < 12:
                removed['signature mark'] += 1; continue
            keep.append(l)
        out.append('\n'.join(keep))
    return '\n\n'.join(out), removed


def dehyphenate(text):
    n = 0
    def rep(m):
        nonlocal n
        a, b_ = m.group(1), m.group(2)
        if E.known(a + b_):
            n += 1; return a + b_ + '\n'
        if E.known(a + '-' + b_) or (E.known(a) and E.known(b_)):
            n += 1; return a + '-' + b_ + '\n'
        return m.group(0)
    text = re.sub(r'(\w+)-\n(\w+)[ \t]*', rep, text)
    return text, n


def paragraphs(text):
    """Line-wrapped OCR -> paragraphs: a blank line or an indented line starts one."""
    text = re.sub(r'\r', '', text)
    blocks = re.split(r'\n\s*\n+', text)
    paras = []
    for blk in blocks:
        cur = []
        for l in blk.split('\n'):
            if re.match(r'^\s{3,}\S', l) and cur:
                paras.append(' '.join(cur)); cur = []
            cur.append(l.strip())
        if cur:
            paras.append(' '.join(cur))
    return [re.sub(r'\s+', ' ', p).strip() for p in paras if p.strip()]


# ---------------------------------------------------------------- consensus
def tokens(paras):
    return re.findall(r'\S+', ' '.join(paras))


def consensus(base_tokens, witnesses, min_votes):
    """Vote on the base token stream. Returns (tokens, decisions, variants)."""
    votes = collections.defaultdict(list)          # position -> [replacement or None(delete)]
    inserts = collections.defaultdict(list)        # position -> [inserted text]
    for name, wt in witnesses:
        sm = difflib.SequenceMatcher(None, base_tokens, wt, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                continue
            if tag == 'replace' and (i2 - i1) == (j2 - j1):
                for k in range(i2 - i1):
                    votes[i1 + k].append((name, wt[j1 + k]))
            elif tag == 'delete':
                for k in range(i1, i2):
                    votes[k].append((name, None))
            elif tag == 'insert' and (j2 - j1) <= 12:
                inserts[i1].append((name, ' '.join(wt[j1:j2])))
    out, decisions, variants = [], collections.Counter(), []
    n_w = len(witnesses)
    for i, tok in enumerate(base_tokens):
        core = re.sub(r'^\W+|\W+$', '', tok)
        base_real = bool(core) and E.known(core)
        ins = inserts.get(i, [])
        if ins:
            c = collections.Counter(t for _, t in ins).most_common(1)[0]
            if c[1] >= min_votes and c[1] == n_w and not base_real or (c[1] >= min_votes and all(E.known(re.sub(r'^\W+|\W+$', '', w)) for w in c[0].split())):
                out.extend(c[0].split()); decisions['insert'] += 1
                variants.append((i, 'insert', '', c[0], c[1]))
            else:
                variants.append((i, 'insert-refused', '', c[0], c[1]))
        vs = votes.get(i, [])
        if not vs:
            out.append(tok); continue
        c = collections.Counter(t for _, t in vs).most_common(1)[0]
        cand, n = c
        if cand is None:
            if n == n_w and not base_real:
                decisions['delete'] += 1; variants.append((i, 'delete', tok, '', n)); continue
            variants.append((i, 'delete-refused', tok, '', n)); out.append(tok); continue
        ccore = re.sub(r'^\W+|\W+$', '', cand)
        if n >= min_votes and ccore and E.known(ccore) and not base_real and ' ' not in cand:
            out.append(cand); decisions['substitute'] += 1; variants.append((i, 'substitute', tok, cand, n))
        elif n >= min_votes and base_real and ccore and E.known(ccore):
            out.append(tok); variants.append((i, 'both-real-base-stands', tok, cand, n))
        else:
            out.append(tok); variants.append((i, 'refused', tok, cand, n))
    return out, decisions, variants


def restore_by_name(text, pairs):
    """Small-caps damage and lost initials, each applied exactly once; refused if it matches elsewhere."""
    log = []
    for wrong, right in (pairs or {}).items():
        n = len(re.findall(re.escape(wrong), text))
        if n == 1:
            text = text.replace(wrong, right); log.append((wrong, right, 'applied'))
        else:
            log.append((wrong, right, f'refused: {n} matches'))
    return text, log


def join_page_turn_splits(paras):
    out, n = [], 0
    for p in paras:
        if out and re.match(r'^[a-z]', p) and not re.match(r'^(and|but|or)\b', p):
            out[-1] = out[-1] + ' ' + p; n += 1
        else:
            out.append(p)
    return out, n


def agreement(a, b_):
    sm = difflib.SequenceMatcher(None, a, b_, autojunk=False)
    return sm.ratio()


def main(argv):
    ap = argparse.ArgumentParser(prog='ath ocr')
    ap.add_argument('slug')
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--psm', default='3,4', help='tesseract page segmentation modes to run, comma-separated')
    ap.add_argument('--base', help='witness file name to use as the base (default: best available)')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    files = gather(b, a.dpi, [int(x) for x in a.psm.split(',') if x])
    if not files:
        raise Fail('no witnesses: put a scan PDF or page images in 0-source/, or set source.archive / source.gutenberg')
    # rank witnesses: an edited text > PG > archive.org > tesseract > layer
    def rank(f):
        n = os.path.basename(f)
        return (0 if n.startswith('text-') else 1 if n.startswith('pg-') else 2 if n.startswith('ia-') else 3 if 'psm3' in n else 4 if 'psm' in n else 5)
    files.sort(key=rank)
    cleaned = {}
    furn = {}
    for f in files:
        t = open(f, encoding='utf8', errors='replace').read()
        if os.path.basename(f).startswith('pg-'):
            from . import manuscript as M
            t = M.strip_pg(t)
        t, removed = strip_furniture(t)
        t, nh = dehyphenate(t)
        cleaned[f] = paragraphs(t)
        furn[f] = (dict(removed), nh)
    base = b.path('2-text', 'witnesses', a.base) if a.base else files[0]
    base_paras = cleaned[base]
    base_paras, n_joins = join_page_turn_splits(base_paras)
    base_tok = tokens(base_paras)
    others = [(os.path.basename(f), tokens(cleaned[f])) for f in files if f != base]
    n_w = len(others)
    min_votes = max(1, (n_w // 2) + 1) if n_w < 5 else 4
    if others:
        new_tok, decisions, variants = consensus(base_tok, others, min_votes)
    else:
        new_tok, decisions, variants = base_tok, collections.Counter(), []
    # rebuild paragraphs from the token stream by paragraph lengths
    text_out, k = [], 0
    for p in base_paras:
        n = len(p.split())
        # token counts may drift with insertions/deletions; rebuild proportionally
        text_out.append(' '.join(new_tok[k:k + n])); k += n
    if k < len(new_tok):
        text_out[-1] += ' ' + ' '.join(new_tok[k:])
    text = '\n\n'.join(text_out)
    text, restore_log = restore_by_name(text, b.get('ocr.restore', {}))
    b.write('2-text/consensus.txt', text + '\n')
    # report
    rep = [f'# OCR report — {b.meta.get("title")}', '',
           f'Base witness: `{os.path.basename(base)}` ({len(base_tok):,} tokens). Page-turn joins: {n_joins}. Voting witnesses: {n_w}; a substitution needs {min_votes} votes.', '',
           '| witness | words | furniture removed | hyphens rejoined | agreement with base |', '|---|---|---|---|---|']
    for f in files:
        toks = tokens(cleaned[f])
        ag = agreement(base_tok[:20000], toks[:20000]) if f != base else 1.0
        rep.append(f'| {os.path.basename(f)} | {len(toks):,} | {furn[f][0]} | {furn[f][1]} | {ag:.3f} |')
    rep += ['', f'## Decisions: {dict(decisions)}', '',
            f'Refused (recorded, not applied): {sum(1 for v in variants if "refused" in v[1] or "stands" in v[1])}. See flags.csv. 97–99% agreement is OCR noise; below ~95% the witness is probably a different setting — check it by printed folio before trusting it.', '',
            '## Restorations by name', ''] + [f'- {w!r} → {r!r}: {s}' for w, r, s in restore_log] + ['', '## Next', '', '`ath edit <slug>` reads 2-text/consensus.txt. Fix any real OCR error in the witnesses or add a `ocr.restore` pair in book.yaml, then re-run — never hand-patch consensus.txt.']
    b.write('2-text/ocr-report.md', '\n'.join(rep) + '\n')
    with open(b.path('2-text', 'flags.csv'), 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f); w.writerow(['position', 'kind', 'base', 'variant', 'votes'])
        for v in variants:
            w.writerow(v)
    tracker.replace_stage(b, 'ocr', 'ath ocr')
    for kind, n in decisions.items():
        tracker.add(b, 'ocr', 'O', 'consensus', kind, f'{n} tokens', f'{n_w} witnesses, majority {min_votes}', 'applied', 'ath ocr')
    b.set_status('ocr', 'done', witnesses=len(files), base=os.path.basename(base), decisions=dict(decisions), flags=len(variants))
    b.log('ocr', f'{len(files)} witnesses, base {os.path.basename(base)}, decisions {dict(decisions)}, {len(variants)} variants recorded; consensus.txt written')
    print('ok — read 2-text/ocr-report.md, then `ath edit`')
    return 0
