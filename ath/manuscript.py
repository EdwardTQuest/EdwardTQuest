"""The canonical manuscript: 2-text/manuscript.md, a strict pandoc-Markdown dialect.

One file feeds every edition and the EPUB. The dialect, in full:

    ---  YAML front matter (title, author, ... copied from book.yaml by `ath edit`)  ---
    # Part One                    a part (optional; only if the book has parts)
    ## Chapter I. The Title       a chapter. "Label. Title" or "Label: Title" or just "Title"
    ### A Section                 a section within a chapter
    Plain paragraphs, blank-line separated. *italic*, **bold**, [small caps]{.smallcaps}.
    * * *                         a section break (ornament)
    > quoted paragraph            a block quotation
    | verse line                  a verse line (line block); leading spaces are kept
    |     indented verse line
    [^12]                         a note call; the note body is a `[^12]: text` paragraph anywhere
    ::: {.front}  ...  :::        a front-matter division (Introductory Note, Preface): not a chapter
    ::: {.back}   ...  :::        a back-matter division (Appendix, Glossary)
    ::: {.epigraph} ... :::       an epigraph (at the head of the book or of a chapter)
    ![Caption](../1-plan/plates/print/03.jpg){.plate}   a plate placed by typeset.py, not by hand

Anything else is refused by validate(). Keep it small; every renderer must handle all of it.
"""
import os, re, collections

HEAD = re.compile(r'^(#{1,3})\s+(.+?)\s*$')
NOTE_DEF = re.compile(r'^\[\^([^\]]+)\]:\s')
NOTE_REF = re.compile(r'\[\^([^\]]+)\](?!:)')
BREAK = re.compile(r'^\s*(\*\s*\*\s*\*|\* \* \*|\*\*\*|---|—\s*—\s*—)\s*$')
PG_START = re.compile(r'\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*', re.I | re.S)
PG_END = re.compile(r'\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG', re.I)
CHAPTER_LINE = re.compile(
    r'^\s*((CHAPTER|BOOK|PART|CANTO|LETTER|ESSAY|SECTION|ACT|SCENE|VOLUME)\s+([IVXLC]+|[0-9]+|[A-Z][A-Z-]+)\b\.?\s*(.*)|[IVXLC]{1,7}\.?\s*$|[0-9]{1,3}\.\s*$)',
    re.I)
ROMAN = {'CHAPTER', 'BOOK', 'PART', 'CANTO', 'LETTER', 'ESSAY', 'SECTION', 'ACT', 'SCENE', 'VOLUME'}


def split_front_matter(md):
    if md.startswith('---\n'):
        end = md.find('\n---\n', 4)
        if end > 0:
            return md[4:end], md[end + 5:]
    return '', md


def strip_pg(text):
    m = PG_START.search(text)
    if m:
        text = text[m.end():]
    m = PG_END.search(text)
    if m:
        text = text[:m.start()]
    text = re.sub(r'^.{0,400}?Produced by[^\n]*\n', '', text, flags=re.S)
    text = re.sub(r'\[Illustration[^\]]*\]', '', text)
    return text.replace('\r\n', '\n').strip()


def title_case(s):
    """ALL-CAPS heading -> Title Case, Chicago-ish (small words down, first/last up)."""
    small = {'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'if', 'per', 'via', 'vs', 'from', 'with', 'into', 'upon', 'over', 'than', 'that', 'this'}
    if s != s.upper() or not re.search(r'[A-Z]', s):
        return s
    words = s.lower().split()
    out = []
    for i, w in enumerate(words):
        core = re.sub(r'^[^a-z0-9]+|[^a-z0-9]+$', '', w)
        if re.fullmatch(r'[ivxlc]+', core):
            out.append(w.upper()); continue
        if i and i < len(words) - 1 and core in small:
            out.append(w); continue
        out.append(re.sub(r'[a-z]', lambda m: m.group(0).upper(), w, count=1))
    return ' '.join(out)


def looks_verse(block):
    """A blank-line block whose lines are short, unjustified and mostly capitalised at the start."""
    lines = [l for l in block.split('\n') if l.strip()]
    if len(lines) < 3:
        return False
    lens = [len(l.rstrip()) for l in lines]
    short = sum(1 for n in lens if n < 62) / len(lines)
    caps = sum(1 for l in lines if re.match(r'\s*[A-Z"“‘\']', l)) / len(lines)
    ragged = (max(lens) - min(lens)) > 12 or short > 0.9
    return short > 0.8 and caps > 0.7 and ragged and not any(l.rstrip().endswith('.') and len(l) > 70 for l in lines)


def import_text(text, title='', author='', kind='text'):
    """Plain text (PG or an edited text) -> manuscript body. Conservative: headings found by
    pattern, verse by shape, notes left as [n] markers for `ath edit` to resolve. Returns
    (markdown_body, report dict). Nothing is reworded."""
    rep = collections.Counter()
    if kind == 'gutenberg':
        text = strip_pg(text)
    text = text.replace('\r\n', '\n').replace('\t', '    ')
    blocks = re.split(r'\n[ \t]*\n+', text.strip())
    out = []
    seen_heading = False
    for blk in blocks:
        raw = blk.strip('\n')
        lines = [l.rstrip() for l in raw.split('\n')]
        one = ' '.join(l.strip() for l in lines)
        # section break
        if BREAK.match(one) or re.fullmatch(r'[\*\s·•—-]{3,}', one):
            out.append('* * *'); rep['breaks'] += 1; continue
        # chapter-ish heading: short, one or two lines, matches a label pattern or is ALL CAPS
        if len(lines) <= 2 and len(one) < 90 and not one.endswith(('.', ',', ';', ':')) or (len(lines) == 1 and CHAPTER_LINE.match(one) and len(one) < 90):
            m = CHAPTER_LINE.match(one)
            allcaps = one == one.upper() and re.search(r'[A-Z]{3,}', one) and len(one) > 3
            if m and m.group(2) and m.group(2).upper() in ROMAN:
                label = f'{m.group(2).capitalize()} {m.group(3).upper() if re.fullmatch(r"[ivxlc]+", m.group(3), re.I) else m.group(3)}'
                rest = title_case(m.group(4).strip(' .:—-')) if m.group(4) else ''
                lvl = '#' if m.group(2).upper() in ('BOOK', 'PART', 'VOLUME') else '##'
                out.append(f'{lvl} {label}{". " + rest if rest else ""}'); rep['chapters'] += 1; seen_heading = True; continue
            if m and not m.group(2):   # bare roman numeral or "12."
                out.append(f'## {one.strip(" .")}'); rep['chapters'] += 1; seen_heading = True; continue
            if allcaps:
                out.append(f'## {title_case(one)}'); rep['chapters'] += 1; seen_heading = True; continue
        if looks_verse(raw):
            vl = []
            for l in lines:
                ind = len(l) - len(l.lstrip(' '))
                vl.append('| ' + (' ' * ind) + l.strip())
            out.append('\n'.join(vl)); rep['verse_blocks'] += 1; continue
        # quotation: every line indented by 4+ spaces
        if all(l.startswith('    ') for l in lines if l.strip()) and len(lines) > 1 and not seen_heading is False:
            out.append('> ' + ' '.join(l.strip() for l in lines)); rep['quotes'] += 1; continue
        para = ' '.join(l.strip() for l in lines)
        para = re.sub(r'\s+', ' ', para)
        # PG _italic_ -> *italic*
        para = re.sub(r'(?<![\w])_([^_\n]{1,200}?)_(?![\w])', r'*\1*', para)
        out.append(para); rep['paragraphs'] += 1
    body = '\n\n'.join(out) + '\n'
    return body, dict(rep)


def validate(md):
    """Refuse anything outside the dialect. Returns (errors, warnings, stats)."""
    errs, warns = [], []
    fm, body = split_front_matter(md)
    if not fm:
        errs.append('no YAML front matter (--- title/author ---)')
    lines = body.split('\n')
    stats = collections.Counter()
    levels = []
    refs, defs = collections.Counter(), collections.Counter()
    in_div = 0
    for i, l in enumerate(lines, 1):
        if l.startswith(':::'):
            if re.match(r':::\s*\{', l) or re.match(r'::: *[a-z]', l):
                in_div += 1
                if not re.match(r':::\s*(\{\.(front|back|epigraph|verse|dedication)\}|(front|back|epigraph|dedication))\s*$', l):
                    errs.append(f'line {i}: unknown div class: {l.strip()}')
            else:
                in_div -= 1
            continue
        m = HEAD.match(l)
        if m:
            lv = len(m.group(1)); levels.append(lv); stats[f'h{lv}'] += 1
            if len(m.group(2)) > 120:
                warns.append(f'line {i}: heading over 120 characters')
            continue
        if l.startswith('####'):
            errs.append(f'line {i}: heading deeper than ###')
        if NOTE_DEF.match(l):
            defs[NOTE_DEF.match(l).group(1)] += 1; stats['notes'] += 1
        for r in NOTE_REF.findall(l):
            refs[r] += 1
        if l.startswith('|'):
            stats['verse_lines'] += 1
        elif l.startswith('>'):
            stats['quote_lines'] += 1
        elif BREAK.match(l):
            stats['breaks'] += 1
        elif l.strip():
            stats['words'] += len(l.split())
        if '<' in l and re.search(r'</?[a-z]+[ >]', l):
            errs.append(f'line {i}: raw HTML is not allowed: {l.strip()[:60]}')
        if '\t' in l:
            warns.append(f'line {i}: tab character')
        if re.search(r'[ ]{2,}', l) and not l.startswith('|'):
            warns.append(f'line {i}: doubled space')
        lc = re.sub(r'\[\^[^\]]+\]', '', l)
        if lc and not l.startswith(('|', '#', '>', ':::', '![')) and re.match(r'^[a-z]', lc):
            warns.append(f'line {i}: paragraph begins lowercase (page-turn split?): {l[:50]}')
    if in_div != 0:
        errs.append('unbalanced ::: fenced divs')
    for r in refs:
        if r not in defs:
            errs.append(f'note [^{r}] is called but never defined')
    for d in defs:
        if d not in refs:
            errs.append(f'note [^{d}] is defined but never called')
        if defs[d] > 1:
            errs.append(f'note [^{d}] defined {defs[d]} times')
    if levels and 1 in levels and 2 not in levels:
        warns.append('parts (#) with no chapters (##)')
    if not levels:
        errs.append('no headings at all — a book needs at least one ## chapter')
    stats['chapters'] = stats.get('h2', 0) or stats.get('h1', 0)
    return errs, warns, dict(stats)


def chapter_titles(md):
    """[(level, label, title, line_no)] for every heading, with 'Chapter I. Title' split."""
    out = []
    for i, l in enumerate(split_front_matter(md)[1].split('\n'), 1):
        m = HEAD.match(l)
        if not m:
            continue
        t = m.group(2)
        lab, ttl = split_label(t)
        out.append((len(m.group(1)), lab, ttl, i))
    return out


def split_label(t):
    m = re.match(r'^((?:Chapter|Book|Part|Canto|Letter|Essay|Section|Act|Scene|Volume)\s+[IVXLC0-9A-Za-z-]+|[IVXLC]{1,7}|[0-9]{1,3})[.:]\s+(.+)$', t)
    if m:
        return m.group(1), m.group(2)
    if re.fullmatch(r'(Chapter|Book|Part|Canto|Letter|Essay|Section|Act|Scene|Volume)\s+[IVXLC0-9A-Za-z-]+|[IVXLC]{1,7}|[0-9]{1,3}', t):
        return t, ''
    return '', t
