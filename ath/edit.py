"""ath edit <slug> — from the best text we have to 2-text/manuscript.md, by rule, with counts.

    source            2-text/consensus.txt (from `ath ocr`)  >  0-source/*.txt|*.md
    structure pass    title block dropped; numbered points demoted to sections; front/back divisions
    house style       every rule fires with a count; a rule that fires past its cap stops the run
    checks            dictionary sweep, sequence proof, structure battery -> 2-text/checks/
    records           2-text/edits.csv (rule, count, examples), edit-report.md, changes.csv rows

Typography is normalised; wording and spelling never are. The setting's spelling stands
("parmanent" stands). Anything the rules are unsure of is flagged, never guessed.
"""
import argparse, collections, csv, os, re, glob
import yaml
from .book import Book, ASSETS, Fail
from . import manuscript as M
from . import tracker

# ---------------------------------------------------------------- dictionary
_WORDS = None


def dictionary():
    global _WORDS
    if _WORDS is None:
        w = set()
        for p in ['/usr/share/dict/american-english', '/usr/share/dict/british-english',
                  os.path.join(ASSETS, 'words', 'english.txt'), os.path.join(ASSETS, 'words', 'house-extra.txt')]:
            if os.path.exists(p):
                for line in open(p, encoding='utf8', errors='ignore'):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        w.add(line.lower())
        _WORDS = w
    return _WORDS


SHORT_OK = {'a', 'i', 'o', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we', 'am', 'ah', 'oh', 'lo', 'ye', 'ox', 'ad', 'id', 'ex', 're', 'st', 'mr', 'dr', 'ms', 'ii', 'iv', 'vi', 'ix', 'xi', 'xx', 'xl', 'lx', 'cc', 'ab', 'ye', 'em', 'en'}


def known(word):
    d = dictionary()
    w = word.lower().strip("’'")
    if len(w) <= 2:
        return w in SHORT_OK                 # the wordlists accept "ts", "tf", "ba": OCR's favourite errors
    if w in d:
        return True
    for suf in ('s', 'es', 'ed', 'd', 'ing', 'ly', "'s", '’s'):
        if w.endswith(suf) and w[:-len(suf)] in d:
            return True
    if w.endswith('ies') and w[:-3] + 'y' in d:
        return True
    return False


# ---------------------------------------------------------------- the rules
NBSP = '\u00a0'


def curly_quotes(text):
    n = 0
    def dq(m):
        nonlocal n; n += 1
        before = m.string[m.start() - 1] if m.start() else ' '
        return '“' if before in ' \n(\u00a0[“‘—-' else '”'
    text = re.sub(r'"', dq, text)
    def sq(m):
        nonlocal n; n += 1
        before = m.string[m.start() - 1] if m.start() else ' '
        after = m.string[m.end()] if m.end() < len(m.string) else ' '
        if before in ' \n(\u00a0[“—-' and after.isalnum():
            return '‘'
        return '’'
    text = re.sub(r"'", sq, text)
    return text, n


def ellipses(text, style='chicago'):
    n = 0
    def rep(m):
        nonlocal n; n += 1
        dots = m.group(0).count('.')
        core = NBSP.join('.' * 3) if style == 'chicago' else '…'
        if dots >= 4:
            return '.' + NBSP + core if style == 'chicago' else '.…'
        return core
    text = re.sub(r'(?:\.[ \u00a0]?){3,}(?=\s|$|[”’)])|…', rep, text)
    return text, n


def dashes(text):
    n = 0
    def rep(m):
        nonlocal n; n += 1
        return '—'
    text = re.sub(r'[ \t]*(?:--+|—)[ \t]*', rep, text)   # never across a line break: a paragraph may open with a dash
    # a spaced hyphen used as a dash: "word - word" (never inside numbers or compounds)
    def rep2(m):
        nonlocal n; n += 1
        return m.group(1) + '—' + m.group(2)
    text = re.sub(r'(\w[.,;:!?”’]?) - ([\w“‘])', rep2, text)
    return text, n


def hyphen_joins(text):
    """'Dis- — courses' and 'im- portant' (line-end hyphenation that survived) -> joined, if the
    dictionary knows the joined word; a real compound keeps its hyphen; else flagged."""
    n = 0
    flags = []
    def rep(m):
        nonlocal n
        a, b_ = m.group(1), m.group(2)
        joined, hyph = a + b_, a + '-' + b_
        if known(joined):
            n += 1; return joined
        if known(hyph) or known(a) and known(b_):
            n += 1; return hyph
        flags.append(m.group(0))
        return m.group(0)
    text = re.sub(r'\b([A-Za-z]{2,})-(?:\s*[—–-]\s*|\s+)([a-z]{2,})\b', rep, text)
    return text, n, flags


def caps_openings(text):
    """A run of ALL-CAPS words at the start of a paragraph is the printer's small caps, not the
    author's shouting. Lower it to sentence case; the template sets the opening in small caps.
    A word that appears Capitalised elsewhere in the text keeps its capital (a name)."""
    n = 0
    out = []
    for para in text.split('\n\n'):
        if para.startswith(('#', '|', '>', ':::', '![', '* * *', '[^')) or not para.strip():
            out.append(para); continue
        m = re.match(r'^([A-Z][A-Z’\'-]+(?:[.,;:!?]?\s+[A-Z][A-Z’\'-]+)*)(?=[\s.,;:!?—]|$)', para)
        if not m:
            out.append(para); continue
        run = m.group(1)
        words = run.split()
        if any(re.fullmatch(r'[IVXLC]+', w.rstrip('.,;:!?')) for w in words):
            out.append(para); continue
        fixed = []
        for i, w in enumerate(words):
            core, tail = re.match(r'^([A-Z’\'-]+)(.*)$', w).groups()
            cap = core.capitalize()
            if i == 0 or re.search(r'(?<![.!?] )(?<!\n)\b' + re.escape(cap) + r'\b', text):
                fixed.append(cap + tail)
            else:
                fixed.append(core.lower() + tail)
        out.append(' '.join(fixed) + para[len(run):])
        n += 1
    return '\n\n'.join(out), n


def spacing(text):
    n = 0
    for pat, rep in [(r'[ \t]{2,}', ' '), (r' +([,.;:!?])', r'\1'), (r'([“‘]) +', r'\1'), (r' +([”’])', r'\1'),
                     (r'\(\s+', '('), (r'\s+\)', ')'), (r'ﬁ', 'fi'), (r'ﬂ', 'fl'), (r'ﬀ', 'ff'), (r'ﬃ', 'ffi'), (r'ﬄ', 'ffl')]:
        text, k = re.subn(pat, rep, text, flags=re.M)
        n += k
    text = re.sub(r'[ \t]+$', '', text, flags=re.M)
    return text, n


RULES = [
    # name, function, cap as fraction of words (a runaway rule stops the run), tracker category.
    # Order matters: hyphen joins see "Dis- — courses" before the dash rule turns it into "Dis-—courses".
    ('hyphen joins', hyphen_joins, 0.01, 'O'),
    ('curly quotes', curly_quotes, 0.20, 'I'),
    ('ellipses', ellipses, 0.02, 'I'),
    ('dashes', dashes, 0.05, 'I'),
    ('caps openings', caps_openings, 0.01, 'C'),
    ('spacing and ligatures', spacing, 0.05, 'N'),
]


# ---------------------------------------------------------------- structure
def demote_numbered_points(body):
    """Eighty-two '## I', '## II' … are numbered sayings, not chapters. If bare-numeral headings
    dominate and the stretches between them are short, demote them to ### under the chapter that
    precedes them. Returns (body, n_demoted)."""
    lines = body.split('\n')
    idx = [i for i, l in enumerate(lines) if re.fullmatch(r'##\s+([IVXLC]{1,7}|[0-9]{1,3})\.?', l.strip())]
    if len(idx) < 12:
        return body, 0
    words_between = []
    for a, b_ in zip(idx, idx[1:] + [len(lines)]):
        words_between.append(sum(len(l.split()) for l in lines[a + 1:b_]))
    mean = sum(words_between) / max(1, len(words_between))
    if mean > 900:
        return body, 0
    for i in idx:
        lines[i] = '#' + lines[i]
    return '\n'.join(lines), len(idx)


FRONT_WORDS = re.compile(r'^(introductory note|introduction|preface|prefatory note|foreword|note on the text|translator.s (note|preface)|dedication|to the reader|editor.s note|chief events in .+)$', re.I)
BACK_WORDS = re.compile(r'^(appendix|appendices|glossary|index|notes|endnotes|bibliography|afterword|epilogue|postscript)( .*)?$', re.I)


def divisions(body):
    """Wrap Introductory Note / Preface as ::: front and Appendix / Glossary as ::: back."""
    lines = body.split('\n')
    heads = [(i, l) for i, l in enumerate(lines) if M.HEAD.match(l)]
    if not heads:
        return body, 0
    n = 0
    out = []
    i = 0
    spans = []
    for k, (pos, l) in enumerate(heads):
        m = M.HEAD.match(l)
        if len(m.group(1)) != 2:
            continue
        t = m.group(2).strip()
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        # only leading/trailing divisions, and a front division must come before the first real chapter
        if FRONT_WORDS.match(t) and all(len(M.HEAD.match(h[1]).group(1)) != 2 or FRONT_WORDS.match(M.HEAD.match(h[1]).group(2)) for h in heads[:k]):
            spans.append((pos, end, 'front'))
        elif BACK_WORDS.match(t) and all(BACK_WORDS.match(M.HEAD.match(h[1]).group(2)) for h in heads[k + 1:]):
            spans.append((pos, end, 'back'))
    cur = 0
    for s, e, cls in spans:
        out.extend(lines[cur:s])
        out.append(f'::: {{.{cls}}}')
        out.extend(lines[s:e])
        out.append(':::')
        cur = e
        n += 1
    out.extend(lines[cur:])
    return '\n'.join(out), n


def drop_title_block(body, title, author):
    """The first paragraph, if it is the title (and byline) the source printed."""
    paras = body.split('\n\n', 2)
    if len(paras) < 2:
        return body, 0
    first = re.sub(r'\W+', ' ', paras[0]).strip().lower()
    t = re.sub(r'\W+', ' ', title).strip().lower()
    if t and first.startswith(t) and len(first) < len(t) + 90 and not paras[0].startswith('#'):
        return '\n\n'.join(paras[1:]), 1
    return body, 0


# ---------------------------------------------------------------- checks
def dictionary_sweep(md):
    fm, body = M.split_front_matter(md)
    body = re.sub(r'^#.*$', '', body, flags=re.M)
    tokens = re.findall(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ’'-]*[A-Za-zÀ-ÿ]|[A-Za-zÀ-ÿ]", body)
    counts = collections.Counter(tokens)
    unknown, names = {}, {}
    for w, c in counts.items():
        if known(w):
            continue
        # a capitalised word that also appears capitalised mid-sentence is a name
        if w[0].isupper() and re.search(r'(?<=[a-z,;] )' + re.escape(w) + r'\b', body):
            names[w] = c
        else:
            unknown[w] = c
    def ctx(w):
        m = re.search(r'.{0,40}\b' + re.escape(w) + r'\b.{0,40}', body)
        return m.group(0).replace('\n', ' ') if m else ''
    total = sum(counts.values())
    return unknown, names, total, ctx


ARCHAIC = re.compile(r"^(?:[a-z]+(?:est|eth|st|dst|'st)|thou|thee|thy|thine|ye|hath|doth|wilt|shalt|art|wert|wast|ere|oft|whence|whither|thither|hither|nay|yea|betwixt|amongst|whilst|unto|saith|spake|hast|dost|didst|canst|wouldst|shouldst|couldst|mayst|wherewith|wherein|whereof|thereof|therein|hereof|forsooth|methinks|to-day|to-morrow|to-night)$", re.I)


def suspicion(word, count):
    """How likely an unknown token is an OCR/transcription error rather than a legitimate rarity.
    High: digits inside letters, mixed case inside a word, 1–2 letter tokens, impossible clusters,
    a real word with one letter swapped (ts/is, Tf/If, rn/m). Low: archaic inflections, hyphenated
    compounds of real words, capitalised names, Latin-looking endings."""
    w = word.strip("’'")
    sc = 0
    if re.search(r'\d', w):
        sc += 5
    if re.search(r'[a-z][A-Z]', w):
        sc += 5                                        # Xxviti
    if len(w) <= 2:
        sc += 4                                        # ts, Tf
    if re.search(r'[^aeiouyAEIOUY]{5,}', w):
        sc += 4                                        # impossible consonant run
    if len(w) >= 3 and sum(1 for ch in w.lower() if ch in 'ivxlc') >= 0.7 * len(w):
        sc += 5                                        # a roman numeral misread: Xxviti, LXXl
    if re.search(r'(rn|vv|ii|ll1|1l|0o|o0)', w) and any(known(w.replace(a, b_)) for a, b_ in (('rn', 'm'), ('vv', 'w'), ('ii', 'll'), ('1', 'l'), ('0', 'o'))):
        sc += 4
    for i in range(len(w)):
        for c in 'abcdefghijklmnopqrstuvwxyz':
            cand = w[:i] + c + w[i + 1:]
            if cand != w and known(cand) and len(w) >= 3:
                sc += 2; break
        else:
            continue
        break
    if ARCHAIC.match(w):
        sc -= 4
    if '-' in w and all(known(part) for part in w.split('-') if part):
        sc -= 4
    if w[:1].isupper() and len(w) > 3:
        sc -= 2
    if re.search(r'(us|um|is|ae|orum|ibus|ensis)$', w) and w[:1].isupper():
        sc -= 2
    if count >= 3:
        sc -= 1
    return sc


def sequence_proof(md, expected=None):
    """Numbered headings must run 1..n without gap or repeat. External count if given."""
    def val(s):
        s = s.upper()
        if re.fullmatch(r'[IVXLC]+', s):
            r = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}; t = 0
            for i, ch in enumerate(s):
                v = r[ch]
                t += -v if i + 1 < len(s) and r[s[i + 1]] > v else v
            return t
        return int(s) if s.isdigit() else None
    seqs = collections.defaultdict(list)
    for lvl, lab, ttl, ln in M.chapter_titles(md):
        m = re.match(r'^(?:(\w+)\s+)?([IVXLC]+|[0-9]+)$', lab)
        if m:
            v = val(m.group(2))
            if v is not None:
                seqs[(lvl, (m.group(1) or '#').lower())].append((v, ln))
    report = []
    for key, items in seqs.items():
        nums = [v for v, _ in items]
        gaps = [nums[i - 1] + 1 for i in range(1, len(nums)) if nums[i] != nums[i - 1] + 1]
        dups = [v for v, c in collections.Counter(nums).items() if c > 1]
        line = f'level {key[0]} "{key[1]}": {len(nums)} numbered, first {nums[0]}, last {nums[-1]}'
        if gaps: line += f'; GAPS after {gaps[:10]}'
        if dups: line += f'; REPEATS {dups[:10]}'
        if expected and key[0] == 3 or (expected and len(seqs) == 1):
            line += f'; expected {expected}: ' + ('OK' if nums[-1] == expected and len(nums) == expected else 'MISMATCH')
        report.append(line)
    return report


def structure_battery(md):
    fm, body = M.split_front_matter(md)
    findings = []
    paras = [p for p in body.split('\n\n') if p.strip()]
    for i, p in enumerate(paras):
        if p.startswith(('#', '|', '>', ':::', '![', '* * *', '[^')):
            continue
        if re.match(r'^[a-z]', p):
            findings.append(('lowercase paragraph start', p[:70]))
        if re.search(r'\b(\w+) \1\b', p, re.I) and not re.search(r'\b(that that|had had|very very)\b', p, re.I):
            m = re.search(r'\b(\w+) \1\b', p, re.I)
            findings.append(('doubled word', m.group(0) + ' … ' + p[max(0, m.start() - 30):m.end() + 30]))
        if p.count('“') != p.count('”'):
            findings.append(('unbalanced double quotes', p[:70]))
        if re.search(r'[a-z],[A-Za-z]', p):
            findings.append(('missing space after comma', re.search(r'.{0,25}[a-z],[A-Za-z].{0,25}', p).group(0)))
        if re.search(r'\b(the|a|an|of|to|and|in|is|was)\s*$', p) and i + 1 < len(paras) and not paras[i + 1].startswith('#'):
            findings.append(('paragraph ends mid-phrase (page-turn split?)', p[-60:]))
        if re.search(r'\d{1,3}$', p) and not p.endswith(('.', '”', '!', '?')):
            findings.append(('trailing number (a folio read as text?)', p[-40:]))
    return findings


# ---------------------------------------------------------------- main
def main(argv):
    ap = argparse.ArgumentParser(prog='ath edit')
    ap.add_argument('slug')
    ap.add_argument('--dry', action='store_true', help='count, report, write nothing')
    ap.add_argument('--ellipsis', choices=['chicago', 'character'], default=None)
    a = ap.parse_args(argv)
    b = Book(a.slug)
    b.stage('2-text'); os.makedirs(b.path('2-text', 'checks'), exist_ok=True)

    # 1. source
    src, kind = None, 'text'
    cons = b.read('2-text/consensus.txt')
    if cons:
        src, srcname = cons, '2-text/consensus.txt'
    else:
        files = [b.path(f) for f in b.get('source.files', [])] or sorted(glob.glob(b.path('0-source', '*.txt')) + glob.glob(b.path('0-source', '*.md')))
        files = [f for f in files if f.lower().endswith(('.txt', '.md'))]
        if not files:
            raise Fail('no text to edit: run `ath ocr` (scan/archive) or put a .txt/.md in 0-source/')
        src = open(files[0], encoding='utf8', errors='replace').read(); srcname = os.path.relpath(files[0], b.dir)
        kind = b.get('source.kind', 'text')
    words0 = len(src.split())

    # 2. import + structure
    if srcname.endswith('.md') and M.split_front_matter(src)[0]:
        body = M.split_front_matter(src)[1]; imp = {'note': 'already a manuscript'}
    elif srcname.endswith('.md'):
        body, imp = src, {'note': 'markdown body'}
    else:
        body, imp = M.import_text(src, kind=('gutenberg' if kind == 'gutenberg' else 'text'))
    body, n_title = drop_title_block(body, b.meta.get('title', ''), b.meta.get('author', ''))
    body, n_demote = demote_numbered_points(body)
    body, n_div = divisions(body)

    # 3. house style, with counts and caps
    rows = []
    flags = []
    style = a.ellipsis or b.get('typeset.ellipsis', 'chicago')
    for name, fn, cap, cat in RULES:
        before = body
        if fn is ellipses:
            body, n = fn(body, style)
        elif fn is hyphen_joins:
            body, n, fl = fn(body); flags += [('hyphen unresolved', f) for f in fl]
        else:
            body, n = fn(body)
        limit = max(20, int(cap * words0))
        ex = ''
        if n and before != body:
            # one example: the first differing 60-char window
            i = next((i for i, (x, y) in enumerate(zip(before, body)) if x != y), 0)
            ex = before[max(0, i - 25):i + 35].replace('\n', ' ') + '  →  ' + body[max(0, i - 25):i + 35].replace('\n', ' ')
        rows.append({'rule': name, 'count': n, 'cap': limit, 'category': cat, 'example': ex})
        if n > limit:
            raise Fail(f'rule "{name}" fired {n} times, cap {limit}: a rule that fires 4,000 times when you expected 40 is a bug. Nothing written.')

    # 4. assemble with front matter from book.yaml
    fm = {k: b.meta.get(k, '') for k in ('title', 'subtitle', 'author', 'translator', 'series', 'language')}
    fm['date'] = str(b.meta.get('year_first', ''))
    md = '---\n' + yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).strip() + '\n---\n\n' + body.strip() + '\n'
    errs, warns, stats = M.validate(md)

    # 5. checks
    unknown, names, total, ctx = dictionary_sweep(md)
    seq = sequence_proof(md, b.get('checks.expected_sections'))
    battery = structure_battery(md)

    # 6. write
    report = [f'# Edit report — {b.meta.get("title")}', '',
              f'Source: `{srcname}` ({words0:,} words). Import: {imp}. Title block dropped: {n_title}. '
              f'Numbered points demoted to sections: {n_demote}. Front/back divisions wrapped: {n_div}.', '',
              '## House-style rules (count / cap)', '', '| rule | count | cap | example |', '|---|---|---|---|']
    report += [f'| {r["rule"]} | {r["count"]} | {r["cap"]} | {r["example"][:110]} |' for r in rows]
    report += ['', f'## Validation: {len(errs)} errors, {len(warns)} warnings', ''] + [f'- ERROR {e}' for e in errs] + [f'- warn {w}' for w in warns[:60]]
    report += ['', f'## Stats: {stats}', '', '## Sequence proof', ''] + [f'- {s}' for s in (seq or ['no numbered headings'])]
    unk_sorted = sorted(unknown.items(), key=lambda kv: -kv[1])
    scored = sorted(((suspicion(w, c), w, c) for w, c in unknown.items()), key=lambda t: (-t[0], -t[2]))
    suspicious = [(w, c, sc) for sc, w, c in scored if sc >= 3]
    report += ['', f'## Dictionary sweep: {sum(unknown.values())} unknown tokens of {total:,} ({100*sum(unknown.values())/max(1,total):.2f}%), {len(unknown)} distinct; {len(names)} names accepted', '',
               f'### Suspicious first — {len(suspicious)} likely errors (fix in the source, re-run)', '']
    report += [f'- **{w}** ×{c} (score {sc}) — {ctx(w)}' for w, c, sc in suspicious[:60]] or ['- none']
    report += ['', '### The rest — archaic forms, names, other languages (read to the end; every entry must be one of those)', '']
    report += [f'- {w} ×{c} — {ctx(w)}' for sc, w, c in scored if sc < 3][:160]
    report += ['', f'## Structure battery: {len(battery)} findings', ''] + [f'- {k}: {v}' for k, v in battery[:80]]
    report += ['', f'## Flags: {len(flags)}', ''] + [f'- {k}: {v}' for k, v in flags[:80]]
    wit = (b.get('status.ocr') or {}).get('witnesses')
    report += ['', '## Witnesses', '',
               (f'- {wit} witnesses voted (see 2-text/ocr-report.md).' if wit else '- single-witness text (an edited text or a transcription): consensus was not possible. The text gate requires a reading lens by a reviewer against the page images before it passes.')]
    report += ['', '## Questions for the text gate (GATES.md)', '',
               f'1. Suspicious list: {len(suspicious)} entries — each fixed in the source or explained?',
               f'2. The rest of the dictionary list ({len(unknown) - len(suspicious)} entries): read to the end?',
               f'3. Sequence proof: {"; ".join(seq) if seq else "no numbered headings"} — does it match what the source prints?',
               f'4. Structure battery: {len(battery)} findings — each decided?',
               '5. Rules: ' + ', '.join(f"{r['rule']} {r['count']}" for r in rows) + f' — plausible for {words0:,} words?',
               '6. Would a reader who knows this book notice anything wrong in the first chapter you open at random?']
    report_md = '\n'.join(report) + '\n'
    if a.dry:
        print(report_md); return 0
    b.write('2-text/manuscript.md', md)
    b.write('2-text/edit-report.md', report_md)
    with open(b.path('2-text', 'edits.csv'), 'w', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=['rule', 'count', 'cap', 'category', 'example']); w.writeheader(); w.writerows(rows)
    with open(b.path('2-text', 'checks', 'unknown-words.txt'), 'w', encoding='utf8') as f:
        f.write('\n'.join(f'{w}\t{c}\t{ctx(w)}' for w, c in unk_sorted) + '\n')
    with open(b.path('2-text', 'checks', 'names.txt'), 'w', encoding='utf8') as f:
        f.write('\n'.join(f'{w}\t{c}' for w, c in sorted(names.items(), key=lambda kv: -kv[1])) + '\n')
    tracker.replace_stage(b, 'edit', 'ath edit')
    for r in rows:
        if r['count']:
            tracker.add(b, stage='edit', category=r['category'], location='throughout', as_was=r['rule'], now_reads=f'{r["count"]} instances', evidence='house style (STYLE.md)', status='applied', by='ath edit')
    if n_demote:
        tracker.add(b, 'edit', 'K', 'headings', f'{n_demote} bare-numeral headings', 'sections (###) under one chapter', 'numbered points, not chapters', 'applied', 'ath edit')
    b.set_status('edit', 'done' if not errs else 'errors', words=stats.get('words'), chapters=stats.get('chapters'), unknown=len(unknown), suspicious=len(suspicious), errors=len(errs), battery=len(battery))
    b.log('edit', f'manuscript.md written: {stats.get("words"):,} words, {stats.get("chapters")} chapters, {stats.get("notes",0)} notes; {len(errs)} errors, {len(warns)} warnings; unknown words {len(unknown)}; see 2-text/edit-report.md')
    if errs:
        print('\n'.join('ERROR ' + e for e in errs)); return 2
    print(f'ok — {stats.get("words"):,} words, {stats.get("chapters")} chapters; {len(suspicious)} suspicious tokens, {len(battery)} structure findings. Read 2-text/edit-report.md, then `ath gate {b.slug} text pass|fail --note "…"`')
    return 0
