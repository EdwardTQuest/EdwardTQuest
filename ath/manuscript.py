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
    r'^\s*((CHAPTER|BOOK|PART|CANTO|LETTER|ESSAY|SECTION|ACT|SCENE|VOLUME|LECTURES?|DIALOGUE|PROP\.?|PROPOSITION|MEDITATION|TREATISE|DISCOURSE|APPENDIX|§)\s*([IVXLC]+|[0-9]+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|LAST)\b\.?\s*(.*)|[IVXLC]{1,7}\.?\s*$|[0-9]{1,3}\.?\s*$)',
    re.I)
ROMAN = {'CHAPTER', 'BOOK', 'PART', 'CANTO', 'LETTER', 'ESSAY', 'SECTION', 'ACT', 'SCENE', 'VOLUME', 'LECTURE', 'LECTURES', 'DIALOGUE', 'PROP', 'PROP.', 'PROPOSITION', 'MEDITATION', 'TREATISE', 'DISCOURSE', 'APPENDIX', '§'}
PART_WORDS = {'BOOK', 'PART', 'VOLUME'}
SECTION_WORDS = {'§', 'PROP', 'PROP.', 'PROPOSITION', 'SECTION'}
DIVISION_WORDS = re.compile(r"^(preface|introduction|introductory|dedication|conclusion|postscript|epilogue|prologue|author'?s preface|translators?'?s?'? (note|preface|introduction)|author'?s advertisement|editor'?s (note|preface|introduction)|analytical table of contents|advertisement|prefatory note|note|appendix|contents|table of contents|the (first|second|third|fourth|fifth) (dialogue|part|book|meditation)|epistle dedicatory|to the reader)\.?$", re.I)


def split_front_matter(md):
    if md.startswith('---\n'):
        end = md.find('\n---\n', 4)
        if end > 0:
            return md[4:end], md[end + 5:]
    return '', md


PG_OLD_START = re.compile(r'\*END\*?\s*THE SMALL PRINT[^\n]*\n', re.I)
PG_OLD_END = re.compile(r'\n\s*(\*\*\*\s*)?End of (the )?Project Gutenberg', re.I)


def strip_pg(text):
    m = PG_START.search(text)
    if m:
        text = text[m.end():]
    else:
        ms = list(PG_OLD_START.finditer(text))
        if ms:
            text = text[ms[-1].end():]
    m = PG_END.search(text) or PG_OLD_END.search(text)
    if m:
        text = text[:m.start()]
    text = re.sub(r'^.{0,400}?Produced by[^\n]*\n', '', text, flags=re.S)
    text = re.sub(r'\[Illustration[^\]]*\]', '', text)
    return text.replace('\r\n', '\n').strip()


PG_NOTE = re.compile(r'(?:\A|(?<=\n\n))[ \t]*\[?\s*(Transcriber\'?s?\s+notes?|Illustration|Editor\'?s?\s+notes?|Produced by|This e-?text|Information About This E-?Text)[^\n]*(?:\n(?!\n)[^\n]*)*', re.I)


def _heading_like(line):
    l = line.strip()
    if not l or len(l) > 100:
        return False
    if CHAPTER_LINE.match(l) or DIVISION_WORDS.match(re.sub(r'\s+', ' ', l).replace('\u2019', "'")):
        return True
    if l == l.upper() and re.search(r'[A-Z]{3}', l) and not l.endswith((',', ';', ':')) and len(l.split()) <= 16:
        return True
    return False


# ---- block predicates for Gutenberg texts --------------------------------------------------------------------
CONTENTS = re.compile(r'^(contents|contents page|table of contents|list of contents|analytical table of contents|synopsis|analytical contents|page|index)\.?$', re.I)
PAGENUM = re.compile(r'\S\s{2,}\d{1,4}\s*$|\S\s{3,}[ivxlc]{1,7}\s*$')
DOTLEAD = re.compile(r'(\s\.){4,}\s*(\d{1,4}|[ivxlc]{1,7})?\s*$|\.{4,}\s*\d{1,4}\s*$')
PUBLISHER = re.compile(r'(this series|series of|reprints?\b|uniformly|bound in|copyright|all rights reserved|printed in|published by|manufactured|electrotyped|\bprice\b|\b(8|12|16)mo\b|\d+ vols?\.)', re.I)
FURNITURE = re.compile(r"(\be-?texts?\b|project gutenberg|\bproofread|\bscann(ed|er)\b|this electronic|\btranscriber|\bOCR\b|produced by [^\n]{0,80}(volunteers|team|distributed|proofread)|denoted by (underscores|equals|_|=)|\bunderscores\b|html version|pgdp\.net|\be-?books?\b)", re.I)
LABEL_LINE = re.compile(r'^\s*(§|[IVXLC]+[.)]|[0-9]+[.)]|(Chapter|Book|Part|Section|Lecture|Essay|Letter|Dialogue)\b)', re.I)
ATTRIB = re.compile(r'^[\u2014\-\u2013]?\s*_?([A-Z][A-Z\.\'\u2019 ]{2,60})_?:?\s*(_?[^_\n]{0,80}_?)?\.?$')
def attribution_line(x):
    """'TENNYSON: _Locksley Hall_.', 'ST. AMBROSE.', '-- Marcus Aurelius': a short name line"""
    ls = lines_of(x or '')
    if len(ls) != 1:
        return None
    l = ls[0].strip()
    if len(l.split()) > 8 or re.search(r'\d{3}', l) or CONTENTS.match(l) or DIVISION_WORDS.match(norm(l)) or CHAPTER_LINE.match(l):
        return None
    m = ATTRIB.match(l)
    return re.sub(r'\s+', ' ', l.strip(' .\u2014-\u2013_')) if m else None
def lines_of(b):
    return [l for l in b.split('\n') if l.strip()]
def para_words(b):
    return len(b.split())
def norm(s):
    return re.sub(r"[’']", "'", re.sub(r'\s+', ' ', s)).strip()
def page_numbered(b):
    """a contents entry with its page number: a short block whose last line ends in a number
    after a gap, or a line of dot leaders; no line of it ends a sentence"""
    ls = lines_of(b)
    if not ls or len(ls) > 8 or para_words(b) > 60:
        return False
    if any(re.search(r'[.!?;,][\u201d"\u2019\')]*$', l.rstrip()) for l in ls[:-1]):
        return False
    return bool(PAGENUM.search(ls[-1]) or any(DOTLEAD.search(l) for l in ls))
def heading_text(b):
    """the text of a heading block: one heading-like line, or a wrapped two-line title"""
    ls = lines_of(b)
    if not ls or len(ls) > 2 or page_numbered(b):
        return None
    j = re.sub(r'\s+', ' ', ' '.join(l.strip() for l in ls))
    if len(ls) == 1:
        return j if _heading_like(j) else None
    if len(j) <= 110 and ((j == j.upper() and re.search(r'[A-Z]{3}', j)) or (_heading_like(ls[0]) and _heading_like(ls[1]))):
        return j
    return None
def is_heading_block(b):
    return heading_text(b) is not None
def recognised(b):
    t = heading_text(b)
    if not t or CONTENTS.match(t):
        return False
    t = norm(t)
    return bool(CHAPTER_LINE.match(t) or DIVISION_WORDS.match(t))
def labelled(b):
    t = heading_text(b)
    return bool(t) and bool(CHAPTER_LINE.match(norm(t))) and not re.fullmatch(r'[IVXLC0-9]+\.?', t.strip())
def part_labelled(b):
    t = heading_text(b)
    m = t and CHAPTER_LINE.match(norm(t))
    return bool(m) and bool(m.group(2)) and m.group(2).upper() in PART_WORDS
def is_toc(b):
    """a contents entry: a page-numbered line, dot leaders, or a list of label lines"""
    if page_numbered(b):
        return True
    ls = lines_of(b)
    if len(ls) >= 3:
        return sum(1 for x in ls if LABEL_LINE.match(x) or _heading_like(x)) >= 0.7 * len(ls) and para_words(b) < 400
    return False
def is_synopsis(b):
    """an analytical contents entry: clauses strung with dashes and no sentences, or clauses
    each ending in a page reference ("Pascal's wager, 5. Clifford's veto, 8.")"""
    dashes = b.count('--') + b.count('\u2014')
    sentences = len(re.findall(r'[.!?][\u201d"\u2019\')]*\s+[A-Z\u201c"]', b))
    words = para_words(b)
    if b.count(',--') >= 2 or len(re.findall(r'[,;]\s*\d{1,3}\.', b)) >= 3:
        return True
    return (dashes >= 4 and sentences <= 2) or (dashes >= 2 and sentences <= 1 and words <= 60)
def is_box(b):
    ls = lines_of(b)
    return bool(ls) and sum(1 for l in ls if re.match(r'\s*[|+]', l)) >= 0.5 * len(ls)
def is_prose(b):
    ls = lines_of(b)
    if not ls or is_heading_block(b) or is_toc(b) or is_synopsis(b) or is_box(b):
        return False
    w = para_words(b)
    if len(ls) == 1:
        return w >= 20
    avg = sum(len(l.strip()) for l in ls) / len(ls)
    return w >= 25 and avg >= 40
def is_epigraph(b, nxt, prev=None):
    """a quotation with an attribution: a sentence or two ending in a dash and a name in capitals
    (True), or followed by a short line that is a name ('next'). Not a dateline, not furniture."""
    s = b.strip()
    ls = lines_of(b)
    versey = len(ls) >= 2 and sum(1 for l in ls if l.startswith(' ') or len(l.strip()) < 60) >= 0.6 * len(ls)
    if is_heading_block(b) or is_toc(b) or is_synopsis(b) or is_box(b) or not 8 <= para_words(b) <= (160 if versey else 90):
        return False
    if s == s.upper() or FURNITURE.search(s) or PUBLISHER.search(s) or re.search(r'(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)', s) or not re.search(r'[a-z]{3}', s):
        return False
    if re.match(r'^\s*(\(?[IVXLC0-9]+[.)]|§)\s', s):
        return False            # a numbered item (an axiom, a rule), not a quotation
    if prev is not None and is_prose(prev):
        return False            # the last paragraph of a preface and its signature line, not a quotation
    if epigraph_split(s)[1]:
        return True
    att = attribution_line(nxt) if nxt else None
    if att and not recognised(nxt) and re.search(r'[.!?\u201d"\u2019_)]$', s):
        return 'next'
    return False
def epigraph_split(s):
    """'… diversity.--WILHELM VON HUMBOLDT: _Sphere and Duties of Government_.' -> (text, attribution)"""
    m = re.search(r'(--|\u2014|\u2013)\s*(_?[A-Z][A-Z\.\'\u2019 ]{3,}(?::\s*_?[^_]{0,80}_?)?\.?)\s*$', s)
    if not m:
        return s, ''
    att = re.sub(r'\s+', ' ', m.group(2).replace('_', '')).strip(' .')
    return s[:m.start()].rstrip(), att


def is_break(x):
    x = x.strip()
    return bool(BREAK.match(x) or re.fullmatch(r'[\*\s\u00b7\u2022\u2014-]{3,}', x))
def starts_text(seq, j):
    """seq[j] begins text: ≥30 words of prose over it and the blocks after it, with at most two
    headings (a chapter label, a title, a section numeral) in between"""
    words, heads = 0, 0
    for x in seq[j:j + 6]:
        if is_heading_block(x) or is_break(x) or (para_words(x) <= 3 and not re.search(r'[.!?]', x)):
            heads += 1
            if heads > 2:
                return False
            continue
        if is_toc(x) or is_synopsis(x) or (FURNITURE.search(x) and para_words(x) < 120):
            return False
        words += para_words(x)
        if words >= 30:
            return True
    return False


def prepare_gutenberg(text, title='', author=''):
    """What Project Gutenberg texts do that a printed book does not. Returns (text, counts).

    Footnotes come four ways and all become [^n] notes: [Footnote N: …] blocks, unnumbered
    [Footnote: …] at the citation point, "[N] text" paragraphs after the paragraph or under a
    FOOTNOTES heading (numbering restarting per chapter), bound to the nearest preceding call.
    Front furniture: the typed title page, a CONTENTS list (with page numbers, or with synopsis
    entries), the transcriber's notes, page markers like {12} — dropped and counted. Prose before
    the first division (a preface without a label) is kept as a front division under its own
    heading; a dedication and an epigraph are kept as their own divisions. The text proper starts
    at the first labelled division followed by text; when that lies thousands of words in (a
    letter or a first part without a label), at the first heading followed by text.
    """
    c = collections.Counter()
    text = text.replace('\r\n', '\n').replace('\t', '    ')
    text, n = PG_NOTE.subn('', text); c['transcriber notes removed'] = n
    text, n = re.subn(r'(?m)^[ \t]*\{[0-9ivxlc]{1,5}\}[ \t]*\n', '', text); c['page markers removed'] = n
    text, n = re.subn(r' ?\{[0-9ivxlc]{1,5}\} ?', ' ', text); c['page markers removed'] += n
    text, n = re.subn(r'[ \t]*\{[A-Za-z]+_\d+\|[A-Za-z]+_\d+[^}\n]*\}[ \t]*\n?', '', text); c['paragraph markers removed'] = n
    text, n = re.subn(r'(?<![#\w])#([^#\n]{1,80})#(?![#\w])', r'\1', text); c['emphasis markup removed'] = n
    text, n = re.subn(r'(?<![=\w])=([^=\n]{1,80})=(?![=\w])', r'\1', text); c['emphasis markup removed'] += n
    # ---- footnotes -------------------------------------------------------------------------
    defs = {}
    uid = 0
    # (a) inline blocks [Footnote N: …] / [Footnote: …]; nested brackets allowed one level
    def fn_inline(m):
        nonlocal uid
        num, body = m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip()
        uid += 1; defs[str(uid)] = body
        c['footnote blocks'] += 1
        return f'⁣FN{"" if not num else num}:{uid}⁣'
    text = re.sub(r'\[Footnote\s*([A-Za-z0-9]{0,4})\s*:\s*((?:[^\[\]]|\[[^\[\]]*\])*)\]', fn_inline, text, flags=re.S)
    # bind numbered placeholders to the nearest preceding [N] call; unnumbered become calls in place
    def bind_placeholders(t):
        out = []
        pos = 0
        for m in re.finditer(r'⁣FN([A-Za-z0-9]*):(\d+)⁣', t):
            num, u = m.group(1), m.group(2)
            seg = t[pos:m.start()]
            if num:
                k = seg.rfind(f'[{num}]')
                if k >= 0:
                    seg = seg[:k] + f'[^{u}]' + seg[k + len(num) + 2:]
                    out.append(seg); pos = m.end(); c['footnote calls'] += 1; continue
                # no call found: put the call where the note stood
            out.append(seg + f'[^{u}]'); pos = m.end(); c['footnote calls'] += 1
        out.append(t[pos:])
        return ''.join(out)
    text = bind_placeholders(text)
    # (b) definition paragraphs "[N] text" (after the paragraph, or under FOOTNOTES:), bound backwards
    blocks = re.split(r'\n[ \t]*\n+', text)
    kept = []
    for blk in blocks:
        if re.fullmatch(r'\s*(FOOT)?NOTES?:?\s*', blk, flags=re.I):
            c['footnotes headings dropped'] += 1; continue
        m = re.match(r'\s*\[([A-Za-z0-9]{1,4})\]\s*(.*)$', blk, flags=re.S)
        if m and m.group(2) and not re.match(r'\s*\[[A-Za-z0-9]{1,4}\]\s*\[', blk):
            num, body = m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip()
            # the nearest preceding unbound call [num], back to the previous heading (numbering
            # restarts per chapter, and an essay's note 1 may sit two hundred paragraphs after its call)
            for bi in range(len(kept) - 1, max(-1, len(kept) - 400), -1):
                k = kept[bi].rfind(f'[{num}]')
                if k >= 0:
                    uid += 1; defs[str(uid)] = body
                    kept[bi] = kept[bi][:k] + f'[^{uid}]' + kept[bi][k + len(num) + 2:]
                    c['footnote calls'] += 1
                    break
            else:
                kept.append(blk); c['orphan note paragraphs'] += 1
            continue
        kept.append(blk)
    blocks = [b for b in kept if b.strip() and not re.fullmatch(r'\s*[A-Za-z]+_\d+\|[A-Za-z]+_\d+\s*', b)]
    # (c) endnotes: "(12)" calls in the text, "12 text" paragraphs under a FOOTNOTES heading at the end
    calls = collections.Counter(re.findall(r'\((\d{1,3})\)', text))
    end_defs = [(i, m) for i, b in enumerate(blocks) for m in [re.match(r'\s{0,8}(\d{1,3})\s+([A-Z\u201c"_(\[].*)$', b, flags=re.S)] if m and i > len(blocks) // 2]
    if len(end_defs) >= 20 and sum(1 for i, m in end_defs if calls.get(m.group(1))) >= 0.8 * len(end_defs):
        bound_idx = set()
        for i, m in end_defs:
            num, body = m.group(1), re.sub(r'\s+', ' ', m.group(2)).strip()
            for bi in range(i - 1, -1, -1):
                k = blocks[bi].rfind(f'({num})')
                if k >= 0:
                    uid += 1; defs[str(uid)] = body
                    blocks[bi] = blocks[bi][:k] + f'[^{uid}]' + blocks[bi][k + len(num) + 2:]
                    bound_idx.add(i); c['endnotes bound'] += 1
                    break
        blocks = [b for i, b in enumerate(blocks) if i not in bound_idx]
    # ---- where the text starts ---------------------------------------------------------------
    def valid_start(i):
        return starts_text(blocks, i + 1)
    start_rec = start_any = None
    for i, b in enumerate(blocks):
        h = heading_text(b)
        if not h or CONTENTS.match(h):
            continue
        if not valid_start(i):
            continue
        if start_any is None:
            start_any = i
        if recognised(b):
            start_rec = i; break
    if start_rec is None:
        start = start_any if start_any is not None else 0
    elif start_any is None or start_any >= start_rec:
        start = start_rec
    else:
        between = sum(para_words(b) for b in blocks[start_any:start_rec] if is_prose(b))
        start = start_any if between > 2500 else start_rec
        if start == start_any:
            c['started at an unlabelled heading'] = 1
    ntitle = norm(re.sub(r'[^\w\s]', '', title or '')).lower()
    nauthor = norm(re.sub(r'[^\w\s]', '', author or '')).lower()
    TITLEPAGE = re.compile(r'\b(translated|edited|with an? (introduction|preface|notes?)|printed|published|press|edition|by the author|vol\.)\b', re.I)
    while start + 1 < len(blocks) and heading_text(blocks[start]) and not recognised(blocks[start]) and is_heading_block(blocks[start + 1]) and starts_text(blocks, start + 2) \
            and (TITLEPAGE.search(heading_text(blocks[start])) or norm(re.sub(r'[^\w\s]', '', heading_text(blocks[start]))).lower() in (ntitle, nauthor)):
        start += 1; c['title-page line skipped'] += 1
    front, body = blocks[:start], blocks[start:]
    # ---- the front: title page (dropped), dedication, epigraph, prose under its heading ---------
    dedication = [b for b in front if not is_toc(b) and not is_heading_block(b) and not is_box(b) and para_words(b) <= 250
                  and not PUBLISHER.search(b) and not re.search(r'(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)|\b(edition|impression|printing)\b', b, re.I) and (
                  (b.strip().startswith('_') and b.strip().endswith('_') and para_words(b) >= 8)
                  or (para_words(b) >= 12 and re.search(r'\b(I |is |are |was )dedicate', b))
                  or (re.match(r'^\s*(To|TO)\s+[A-Z]', b.strip()) and para_words(b) <= 40))]
    for k, b in enumerate(front):
        h = heading_text(b)
        if h and re.fullmatch(r'dedication\.?', h.strip(), re.I):
            ded, j = [], k + 1
            while j < len(front) and not is_heading_block(front[j]) and para_words(front[j]) <= 60 and not is_toc(front[j]):
                ded.append(front[j]); j += 1
            if ded:
                dedication = ded; c['dedication under its heading'] = 1
            break
    epigraph, epi_blocks = None, set()
    for k, b in enumerate(front):
        if b in dedication:
            continue
        e = is_epigraph(b, front[k + 1] if k + 1 < len(front) else None, front[k - 1] if k else None)
        if e == 'next':
            epigraph = (b.strip().strip('_'), attribution_line(front[k + 1])); epi_blocks = {k, k + 1}
        elif e:
            epigraph = epigraph_split(b.strip().strip('_')); epi_blocks = {k}
    kept_front, pending, skip_group = [], None, False
    for k, b in enumerate(front):
        if b in dedication or k in epi_blocks:
            continue
        if FURNITURE.search(b) and para_words(b) < 120:
            continue
        h = heading_text(b)
        if h:
            if not CONTENTS.match(h):
                pending = h; skip_group = False
            continue
        if is_toc(b) or is_synopsis(b):
            continue
        if PUBLISHER.search(b) and para_words(b) < 120 and not kept_front:
            skip_group = True
            continue
        if skip_group and not kept_front:
            continue
        if is_prose(b) or (kept_front and pending is None and para_words(b) >= 4):
            if pending and (norm(re.sub(r'[^\w\s]', '', pending)).lower() in (ntitle, nauthor) or re.search(r'\(\d{4}', pending)):
                pending = None
            if pending:
                kept_front.append('## ' + title_case(pending.rstrip('.'))); pending = None
            elif not kept_front:
                kept_front.append('## Prefatory Matter')
            kept_front.append(b)
    c['front blocks dropped'] = len(front) - len(dedication) - len(epi_blocks) - len([k for k in kept_front if not k.startswith('## ')])
    c['front prose kept'] = len([k for k in kept_front if not k.startswith('## ')])
    # ---- the body: contents runs, half-titles, furniture, an epigraph before the first chapter ---
    def fmt_epigraph(e):
        att = e[1]
        txt = e[0]
        if looks_verse(txt):
            txt = '\n'.join('| ' + l.strip() for l in txt.split('\n') if l.strip())
        return ['::: {.epigraph}', txt, ('\u2014 ' + (title_case(att) if att == att.upper() else att)) if att else None, ':::']
    cleaned, i, dropped = [], 0, 0
    limit = max(60, len(body) // 4)
    while i < len(body):
        b = body[i]
        h = heading_text(b)
        if i < limit and h and CONTENTS.match(h):
            # the run: entries until a block that starts text; the headings just before it are the text's
            j = i + 1
            while j < len(body) and j - i < 500 and not (not is_heading_block(body[j]) and not is_toc(body[j]) and not is_synopsis(body[j]) and not is_break(body[j]) and para_words(body[j]) >= 5 and starts_text(body, j)):
                j += 1
            if j - i >= 500:
                cleaned.append(b); i += 1; continue
            k = j
            nxt = body[j + 1] if j + 1 < len(body) else None
            if not (is_epigraph(body[j], nxt) and nxt is not None and is_heading_block(nxt)):
                # the headings just before the text: back to the last labelled one (and a part label
                # before it); with no label, the last heading, and the one before it only if it stands
                # alone (after a break, a page-numbered entry, the list) rather than in a title-page cluster
                win = []
                q = j - 1
                while q > i and len(win) < 6 and (is_heading_block(body[q]) or (para_words(body[q]) <= 3 and not is_toc(body[q])) or is_break(body[q])):
                    win.insert(0, q); q -= 1
                heads_in = [q for q in win if is_heading_block(body[q]) and not page_numbered(body[q])]
                lab = [q for q in heads_in if labelled(body[q])]
                if lab:
                    k = lab[-1]
                    if k - 1 > i and part_labelled(body[k - 1]) and not part_labelled(body[k]):
                        k -= 1
                elif heads_in:
                    k = heads_in[-1]
                    if len(heads_in) >= 2:
                        p = heads_in[-2]
                        before = body[p - 1] if p - 1 > i else None
                        isolated = before is None or is_toc(before) or is_synopsis(before) or is_break(before) or is_prose(before)
                        if isolated and all(is_break(body[r]) for r in range(p + 1, k)):
                            k = p
            dropped += k - i; i = k; c['contents runs removed'] += 1; continue
        if h and re.fullmatch(r'\[?(the end|finis|end of (the )?(book|volume|essay|text|dialogues?)[^\]]*)\]?\.?', h.strip(), re.I):
            dropped += 1; i += 1; c['the end dropped'] += 1; continue
        if h and i + 1 < len(body) and heading_text(body[i + 1]) and norm(heading_text(body[i + 1])).lower().rstrip('.') == norm(h).lower().rstrip('.'):
            dropped += 1; i += 1; c['repeated heading dropped'] += 1; continue
        if i < limit and h and ntitle and norm(re.sub(r'[^\w\s]', '', h)).lower() in (ntitle, ntitle.split(':')[0].strip(), ntitle.split(' or ')[0].strip()) and i + 1 < len(body) and is_heading_block(body[i + 1]) \
                and not re.fullmatch(r'[IVXLC0-9]+\.?', heading_text(body[i + 1]).strip()):
            dropped += 1; i += 1; c['half-title dropped'] += 1; continue
        if i < limit and h and not recognised(b) and i + 1 < len(body) and is_heading_block(body[i + 1]) and not recognised(body[i + 1]) and not is_prose(body[i + 1]) and not starts_text(body, i + 1):
            dropped += 1; i += 1; continue       # two unrecognised short lines in a row early on: title-page furniture
        if i < limit and not h and (is_toc(b) or is_box(b)) and para_words(b) < 400:
            dropped += 1; i += 1; continue
        if (i < 40 or i > len(body) - 40) and FURNITURE.search(b) and para_words(b) < 120 and not h:
            dropped += 1; i += 1; continue
        if i < limit and not h and i + 1 < len(body) and not epigraph:
            e = is_epigraph(b, body[i + 1], body[i - 1] if i else None)
            def division_after(x):
                hx = heading_text(x)
                return bool(hx) and (recognised(x) or (ntitle and norm(re.sub(r'[^\w\s]', '', hx)).lower() == ntitle))
            if e == 'next' and i + 2 < len(body) and division_after(body[i + 2]):
                epigraph = (b.strip().strip('_'), attribution_line(body[i + 1])); i += 2; continue
            if e is True and division_after(body[i + 1]):
                epigraph = epigraph_split(b.strip().strip('_')); i += 1; continue
        cleaned.append(b); i += 1
    c['contents and furniture dropped'] = dropped
    body = cleaned
    total_words = sum(para_words(x) for x in body)
    seen = 0
    for k, x in enumerate(body):
        seen += para_words(x)
        h = heading_text(x)
        if seen >= 0.5 * total_words and h and re.fullmatch(r'(general )?index\.?', h.strip(), re.I):
            j = k + 1
            # entries run until the first block of prose (endnotes may follow an index, as in James)
            while j < len(body) and (re.search(r'\d[.;,]?\s*$', body[j].strip()) or page_numbered(body[j]) or is_heading_block(body[j])
                                     or not is_prose(body[j])):
                j += 1
            if j - k >= 10:
                c['index dropped (words)'] = sum(para_words(x) for x in body[k:j])
                body = body[:k] + body[j:]
            break
    if kept_front:
        body = ['::: {.front}'] + kept_front + [':::'] + body
    if epigraph:
        body = [x for x in fmt_epigraph(epigraph) if x] + body
        c['epigraph kept'] = 1
    if dedication:
        if c.get('dedication under its heading'):
            ded_lines = ['| ' + re.sub(r'\s+', ' ', l.strip()).strip('_') for d in dedication for l in d.split('\n') if l.strip()]
            body = ['::: {.dedication}', '## Dedication', '\n'.join(ded_lines), ':::'] + body
        else:
            body = ['::: {.dedication}', '## Dedication'] + [d.strip().strip('_') for d in dedication] + [':::'] + body
        c['dedication kept'] = 1
    text = '\n\n'.join(body)
    # "CHAPTER I." then a separate ALL-CAPS or Title-Case title block -> one heading line
    def merge(m):
        c['chapter titles merged'] += 1
        return m.group(1).rstrip('. ') + '. ' + re.sub(r'\s+', ' ', m.group(2).strip()).rstrip('.') + '\n\n'
    text = re.sub(r'(?m)^((?:CHAPTER|BOOK|PART|SECTION|LECTURES?|ESSAY|LETTER|DIALOGUE|MEDITATION|DISCOURSE)\s+[IVXLC0-9]+(?:\s+(?:AND|and)\s+[IVXLC0-9]+)?\.?)[ \t]*\n[ \t]*\n+([A-Z][^\n]{3,90}(?:\n[A-Z][^\n]{1,90}){0,2})\n[ \t]*\n(?![ \t]*\n)',
                  lambda m: merge(m) if (m.group(2) == m.group(2).upper() or len(m.group(2).split()) <= 12) and not m.group(2).rstrip().endswith((',', ';')) else m.group(0), text)
    # note definitions at the end; a definition whose call was never found stays visible as back matter
    called = set(re.findall(r'\[\^(\d+)\](?!:)', text))
    bound = [k for k in defs if k in called]
    orphan = [k for k in defs if k not in called]
    if bound:
        text = text.rstrip() + '\n\n' + '\n\n'.join(f'[^{k}]: {defs[k]}' for k in bound) + '\n'
    if orphan:
        c['orphan notes kept as back matter'] = len(orphan)
        text = text.rstrip() + '\n\n::: {.back}\n\n## Notes Without a Call in the Source\n\n' + '\n\n'.join(f'**Note {k}.** {defs[k]}' for k in orphan) + '\n\n:::\n'
    return text, dict(c)


LIST_MARKER = re.compile(r'^(\(?(?:[IVXLC]+|[ivxlc]+|\d+|[A-Za-z])[.)])(\s)')


def escape_list_markers(para):
    """'II. Man thinks.' at the start of a paragraph is a numbered definition, not a list item;
    pandoc would make it an <ol> (and Typst an enum), and the numeral would leave the text.
    A backslash keeps it a paragraph in every renderer. Idempotent."""
    if para.startswith(('#', '|', '>', ':::', '![', '* * *', '[^', '\\')):
        return para, 0
    m = LIST_MARKER.match(para)
    if m and not para.startswith(m.group(1)[:-1] + '\\'):
        return m.group(1)[:-1] + '\\' + m.group(1)[-1] + para[len(m.group(1)):], 1
    if re.match(r'^[-+*]\s', para):
        return '\\' + para, 1
    return para, 0


def title_case(s):
    """ALL-CAPS heading -> Title Case, Chicago-ish (small words down, first/last up)."""
    small = {'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'if', 'per', 'via', 'vs', 'from', 'with', 'into', 'upon', 'over', 'than', 'that', 'this'}
    if s != s.upper() or not re.search(r'[A-Z]', s):
        return s
    words = s.lower().split()
    out = []
    first = 0
    while first < len(words) and re.fullmatch(r'([ivxlc]+|[0-9]+|§)[.:)]?', words[first]):
        first += 1
    for i, w in enumerate(words):
        core = re.sub(r'^[^a-z0-9]+|[^a-z0-9]+$', '', w)
        if re.fullmatch(r'[ivxlc]+', core):
            out.append(w.upper()); continue
        if i > first and i < len(words) - 1 and core in small:
            out.append(w); continue
        out.append(re.sub(r'[a-z]', lambda m: m.group(0).upper(), w, count=1))
    return ' '.join(out)


def looks_verse(block):
    """A blank-line block whose lines are short, unjustified and mostly capitalised at the start."""
    lines = [l for l in block.split('\n') if l.strip()]
    if len(lines) == 2:                     # a couplet: both lines indented, short, capitalised
        return all(re.match(r'\s{2,}[A-Z"\u201c\u2018\']', l) and len(l.strip()) < 62 for l in lines)
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
        text, pgc = prepare_gutenberg(text, title, author)
        rep.update({f'pg {k}': v for k, v in pgc.items()})
    text = text.replace('\r\n', '\n').replace('\t', '    ')
    blocks = re.split(r'\n[ \t]*\n+', text.strip())
    out = []
    seen_heading = False
    for bi, blk in enumerate(blocks):
        raw = blk.strip('\n')
        lines = [l.rstrip() for l in raw.split('\n')]
        one = ' '.join(l.strip() for l in lines)
        # section break (dropped when a heading follows: the heading is the break)
        if BREAK.match(one) or re.fullmatch(r'[\*\s\u00b7\u2022\u2014-]{3,}', one):
            nxt = blocks[bi + 1].strip() if bi + 1 < len(blocks) else ''
            if not nxt or heading_text(nxt):
                continue
            out.append('* * *'); rep['breaks'] += 1; continue
        # a speaker's short reply in capitals ("HYL.  NO.") is a paragraph, not a heading
        if re.match(r'^(?![IVXLC]+\.)[A-Z][A-Z]{1,14}\.\s+\S', one) and len(one.split()) <= 8 and one == one.upper() and out and not out[-1].startswith('#'):
            m_sp = re.match(r'^([A-Z][A-Z]{1,14})\.\s+', one)
            out.append(f'[{m_sp.group(1).capitalize()}.]{{.smallcaps}} ' + one[m_sp.end():].capitalize()); rep['speaker labels'] += 1; continue
        # chapter-ish heading: short, one or two lines, matches a label pattern or is ALL CAPS
        m_lab = CHAPTER_LINE.match(one)
        if len(lines) <= 2 and len(one) < 90 and not one.endswith(('.', ',', ';', ':')) or (len(lines) == 1 and m_lab and len(one) < 200) \
                or (len(lines) <= 3 and m_lab and m_lab.group(2) and len(one) < 200 and not one.endswith((':', ';', ','))) \
                or (len(lines) <= 3 and len(one) < 160 and one == one.upper() and re.search(r'[A-Z]{3}', one) and not one.endswith((',', ';', ':'))):
            m = CHAPTER_LINE.match(one)
            allcaps = one == one.upper() and re.search(r'[A-Z]{3,}', one) and len(one) > 3
            if m and m.group(2) and m.group(2).upper() in ROMAN:
                word = m.group(2).upper().rstrip('.')
                label_word = '§' if word == '§' else ('Prop.' if word in ('PROP', 'PROPOSITION') else m.group(2).capitalize())
                label = f'{label_word} {m.group(3).upper() if re.fullmatch(r"[ivxlc]+", m.group(3), re.I) else m.group(3)}'.replace('§ ', '§ ')
                rest = m.group(4) or ''
                mg = re.match(r'^((?:\s*,\s*(?:and\s+|AND\s+)?|\s*(?:and|AND)\s+)[IVXLC0-9]+\.?(?=[\s,]|$))+', rest)
                if mg:
                    glued = re.sub(r'\s*,\s*', ', ', re.sub(r'\s*(and|AND)\s+', ' and ', mg.group(0))).replace('  ', ' ').strip(' .')
                    label += glued if glued.startswith(',') else ' ' + glued
                    rest = rest[mg.end():]
                rest = title_case(rest.strip(' .:—-')) if rest else ''
                lvl = '#' if word in PART_WORDS else '###' if word in SECTION_WORDS else '##'
                out.append(f'{lvl} {label}{". " + rest if rest else ""}'); rep['chapters'] += 1; seen_heading = True; continue
            if m and not m.group(2):   # bare roman numeral, "12." or "12"
                out.append(f'## {one.strip(" .")}'); rep['chapters'] += 1; seen_heading = True; continue
            if allcaps:
                nxt = blocks[bi + 1].strip() if bi + 1 < len(blocks) else ''
                if len(one.split()) <= 5 and one.endswith('.') and out and not out[-1].startswith(('#', ':::')) and re.match(r'^[A-Z][A-Z .\'\u2019-]+\.$', one) \
                        and not DIVISION_WORDS.match(norm(one)) and not CHAPTER_LINE.match(one) \
                        and not re.match(r'^[IVXLC]+\.', one) \
                        and ((re.match(r'^[_(]?[A-Z][a-z]+[,.]? *(\d|[A-Z])', nxt) or (len(nxt.split()) <= 14 and re.search(r'(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)', nxt)))
                             or ((not nxt or heading_text(nxt)) and re.search(r'(?<![A-Z])[A-Z]\.\s', one))):
                    out.append(f'[{title_case(one)}]{{.smallcaps}}'); rep['signature lines'] += 1; continue   # H. L. MENCKEN.
                out.append(f'## {title_case(one.rstrip(". "))}'); rep['chapters'] += 1; seen_heading = True; continue
            if DIVISION_WORDS.match(re.sub(r'\s+', ' ', one).replace('\u2019', "'")) or (len(lines) == 1 and re.fullmatch(r'(The )?(First|Second|Third|Fourth|Fifth) (Dialogue|Part|Book|Meditation)\.?', one, re.I)):
                out.append(f'## {title_case(one.rstrip("."))}'); rep['chapters'] += 1; seen_heading = True; continue
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
        m_sp = re.match(r'^(?![IVXLC]+\.)([A-Z][A-Z]{2,14})\.\s+(?=[A-Z“"])', para)
        if m_sp and m_sp.group(1) not in ('CHAPTER', 'BOOK', 'PART', 'SECTION'):
            para = f'[{m_sp.group(1).capitalize()}.]{{.smallcaps}} ' + para[m_sp.end():]; rep['speaker labels'] += 1
        # PG _italic_ -> *italic*
        para = re.sub(r'(?<![\w])_([^_\n]{1,2000}?)_(?![\w])', r'*\1*', para)
        # a note definition paragraph stays a note definition
        if para.startswith('[^') and re.match(r'^\[\^[^\]]+\]: ', para):
            out.append(para); rep['notes'] += 1; continue
        para, n_esc = escape_list_markers(para)
        rep['list markers escaped'] += n_esc
        out.append(para); rep['paragraphs'] += 1
    out, n_merged, merged_at = merge_split_titles(out)
    rep['split titles merged'] = n_merged
    out, levels = infer_levels(out, merged_at)
    out, n_front = front_divisions(out)
    rep['front divisions'] = n_front
    rep['levels'] = levels
    body = '\n\n'.join(out) + '\n'
    return body, dict(rep)


FRONT_ALWAYS = re.compile(r"^(preface|author'?s preface|advertisement|author'?s advertisement|prefatory note|dedication|to the reader|epistle dedicatory|translators?'?s?'? (note|preface|introduction)|editor'?s (note|preface|introduction)|publisher'?s (note|preface)|note)\.?$", re.I)
FRONT_IF_SIGNED = re.compile(r"^(introduction|introductory|introductory (note|essay)|biographical (note|sketch)|memoir|life of [^.]+|prefatory (note|essay)|note)\.?$", re.I)


def front_divisions(blocks):
    """The prefaces, notes and signed introductions that stand before the first chapter are front
    matter (roman folios, no chapter number): wrap each in ::: {.front}. An unsigned Introduction
    is the author's first chapter and stays. Divisions already inside a ::: div are left alone."""
    heads = [(i, HEAD.match(b)) for i, b in enumerate(blocks) if '\n' not in b and HEAD.match(b)]
    depth = 0
    in_div = set()
    for i, b in enumerate(blocks):
        if b.startswith(':::'):
            depth += 1 if re.match(r':::\s*(\{|[a-z])', b) else -1
        elif depth > 0:
            in_div.add(i)
    first_chapter = None
    for i, m in heads:
        if i in in_div:
            continue
        t = m.group(2).strip()
        tn = re.sub(r'\s+', ' ', t).replace('\u2019', "'")
        if not (FRONT_ALWAYS.match(tn) or FRONT_IF_SIGNED.match(tn) or len(m.group(1)) > 2):
            first_chapter = i; break
    if first_chapter is None:
        return blocks, 0
    spans = []
    tops = [(i, m) for i, m in heads if i < first_chapter and i not in in_div and len(m.group(1)) <= 2]
    for n, (i, m) in enumerate(tops):
        end = tops[n + 1][0] if n + 1 < len(tops) else first_chapter
        tn = re.sub(r'\s+', ' ', m.group(2).strip()).replace('\u2019', "'")
        signed = any(re.match(r'^\[[^\]]{3,60}\]\{\.smallcaps\}$', blocks[k].strip()) for k in range(i + 1, end))
        if FRONT_ALWAYS.match(tn) or (FRONT_IF_SIGNED.match(tn) and signed):
            spans.append((i, end))
    if not spans:
        return blocks, 0
    out, k = [], 0
    for s, e in spans:
        out.extend(blocks[k:s])
        out.append('::: {.front}')
        out.append(re.sub(r'^#{1,3} ', '## ', blocks[s]))
        out.extend(re.sub(r'^# ', '## ', b) if HEAD.match(b) and '\n' not in b else b for b in blocks[s + 1:e])
        out.append(':::')
        k = e
    out.extend(blocks[k:])
    return out, len(spans)


def merge_split_titles(blocks):
    """'## Chapter III' immediately followed by a label-less heading is one heading."""
    out, n, i, merged = [], 0, 0, set()
    while i < len(blocks):
        b = blocks[i]
        b = re.sub(r'^(#{1,3}) _(.+)_$', r'\1 \2', b)
        m = re.match(r'^(#{1,3}) ((?:(?:Chapter|Book|Part|Lecture|Lectures|Section|Dialogue|Letter|Essay|Discourse|Meditation|Appendix|Supplement) )?[IVXLC0-9]+(?: and [IVXLC0-9]+)?'
                     r'|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth) (?:Section|Part|Book|Supplement|Chapter|Dialogue|Meditation|Essay|Letter|Article))$', b)
        if m and i + 1 < len(blocks):
            nxt = re.sub(r'^(#{1,3}) _(.+)_$', r'\1 \2', blocks[i + 1])
            m2 = re.match(r'^#{1,3} (?!(?:Chapter|Book|Part|Lecture|Lectures|Section|Dialogue|Letter|Essay|Discourse|Meditation|Appendix|Prop\.|§|First|Second|Third|Fourth|Fifth)\b)(?![IVXLC0-9]+$)(.+)$', nxt)
            if m2:
                merged.add(len(out)); out.append(f'{m.group(1)} {m.group(2)}. {m2.group(1)}'); n += 1; i += 2; continue
        out.append(b); i += 1
    return out, n, merged


def infer_levels(blocks, merged_at=frozenset()):
    """Decide which heading kinds are parts (#), chapters (##) and sections (###) from how their
    labels repeat: a kind whose labels are unique across the book is a chapter-level kind; a kind
    whose labels restart (Part I inside every Section) is a section kind; a part kind stays a
    part only if unique; bare numerals are chapters when they are most of the headings."""
    heads = []
    for i, b in enumerate(blocks):
        m = HEAD.match(b) if '\n' not in b else None
        if m:
            lab, ttl = split_label(m.group(2))
            if lab and re.fullmatch(r'[IVXLC]+|[0-9]+', lab.strip()):
                kind = ('#numtitle2' if i in merged_at else '#numtitle') if ttl else '#num'
            elif lab:
                kind = re.match(r'^(§|Prop\.|[A-Za-z]+)', lab).group(1)
            elif re.fullmatch(r'[IVXLC]+|[0-9]+', m.group(2).strip()):
                kind = '#num'
            else:
                kind = '#plain'
            heads.append((i, len(m.group(1)), kind, lab or m.group(2)))
    if not heads:
        return blocks, {}
    # labels restart inside a part (Book I, Chapter I … Book II, Chapter I): count uniqueness per segment
    part_kinds = {k for _, _, k, _ in heads if k.upper().rstrip('.') in PART_WORDS}
    part_labels = collections.Counter(lab for _, _, k, lab in heads if k in part_kinds)
    parts_unique = bool(part_kinds) and all(v == 1 for v in part_labels.values())
    plain_parts = False
    if not part_kinds:
        # "TALKS TO TEACHERS" then I. II. III. … "TALKS TO STUDENTS" then I. II.: the plain headings
        # are parts when numbered-and-titled chapters restart after at least two of them
        restarts, plains = 0, 0
        dividing = set()
        for n_, (i, lv, kind, lab) in enumerate(heads):
            if kind == '#plain' and not DIVISION_WORDS.match(norm(lab)):
                plains += 1
                nxt = heads[n_ + 1] if n_ + 1 < len(heads) else None
                if nxt and nxt[2] in ('#numtitle', '#numtitle2') and re.fullmatch(r'I|1', split_label(nxt[3])[0] or nxt[3]):
                    restarts += 1; dividing.add(i)
        numtitles = [h for h in heads if h[2] in ('#numtitle', '#numtitle2')]
        nt_labels = [split_label(h[3])[0] or h[3] for h in numtitles]
        if restarts >= 2 and restarts >= 0.6 * plains and len(numtitles) >= 4 and len(set(nt_labels)) < len(nt_labels):
            plain_parts = True
            part_kinds = {'#plain'}; parts_unique = True
    kinds = collections.defaultdict(list)
    seg = 0
    for i, lv, kind, lab in heads:
        if kind in part_kinds and parts_unique:
            seg += 1
        kinds[kind].append((seg, lab))
    n = len(heads)
    level = {}
    for kind, labs in kinds.items():
        unique = len(set(labs)) == len(labs)
        up = kind.upper().rstrip('.')
        if kind == '#plain':
            level[kind] = 2
        elif kind == '#numtitle2':
            level[kind] = 2          # a numeral with the title displayed on its own line: a chapter
        elif kind == '#numtitle':
            level[kind] = 2 if plain_parts else (3 if '#numtitle2' in kinds else (2 if unique else 3))
        elif kind == '#num':
            level[kind] = 2 if (unique and len(labs) >= 0.6 * n and len(labs) <= 30) else 3
        elif up in PART_WORDS:
            level[kind] = 1 if unique and len(labs) < 40 else 3
        elif up in ('§', 'PROP', 'PROPOSITION'):
            level[kind] = 3
        elif up == 'SECTION':
            other_chapters = any(k.upper() in ('CHAPTER', 'LECTURE', 'LECTURES', 'DIALOGUE', 'ESSAY', 'LETTER', 'DISCOURSE', 'MEDITATION') for k in kinds)
            level[kind] = 3 if (other_chapters or not unique) else 2
        else:
            level[kind] = 2 if unique or len(labs) <= 3 else 3
    if 2 not in level.values() and 1 in level.values():
        for k in level:
            level[k] = 2 if level[k] == 1 else level[k]
    out = list(blocks)
    numbered = any(k in ('#numtitle', '#numtitle2', '#num') or k.upper().rstrip('.') in ROMAN for k in kinds)
    STRUCT = re.compile(r'^(Remark|Corollary|Note|Scholium|Proof|Theorem|Problem|Definition|Axiom|Lemma|Postulate|Explanation|Observation|Example|Solution|Demonstration)( [IVXLC0-9]+)?\.?$', re.I)
    ORDINAL = re.compile(r'^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) ', re.I)
    for i, lv, kind, lab in heads:
        new = level.get(kind, lv)
        txt = HEAD.match(blocks[i]).group(2)
        if kind == '#plain' and new == 2 and (STRUCT.match(txt) or (numbered and ORDINAL.match(txt) and not re.match(r'^(First|Second|Third|Fourth|Fifth) (Part|Book|Dialogue|Section|Meditation|Supplement|Essay|Letter|Article)', txt, re.I))):
            new = 3
        if plain_parts and kind == '#plain':
            new = 1 if i in dividing else (2 if DIVISION_WORDS.match(norm(txt)) else 3)
        out[i] = '#' * new + ' ' + txt
    return out, {k: v for k, v in level.items()}


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
            if in_div > 0:
                stats[f'h{lv} in divisions'] += 1
            if len(m.group(2)) > 120:
                warns.append(f'line {i}: heading over 120 characters')
            for r in NOTE_REF.findall(l):
                refs[r] += 1
            continue
        if l.startswith('####'):
            errs.append(f'line {i}: heading deeper than ###')
        if NOTE_DEF.match(l):
            defs[NOTE_DEF.match(l).group(1)] += 1; stats['notes'] += 1
        for r in NOTE_REF.findall(l):
            refs[r] += 1
        if l.startswith('|'):
            stats['verse_lines'] += 1; stats['words'] += len(l[1:].split())
        elif l.startswith('>'):
            stats['quote_lines'] += 1; stats['words'] += len(l[1:].split())
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
        if not l.startswith(('|', '#', '>', ':::', '![', '[^')) and LIST_MARKER.match(l) and not re.match(r'^\(?(?:[IVXLC]+|[ivxlc]+|\d+|[A-Za-z])\\[.)]', l):
            warns.append(f'line {i}: paragraph begins with a list marker — pandoc will make it a list; escape the period (II\\.): {l[:40]}')
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
    stats['chapters'] = (stats.get('h2', 0) - stats.get('h2 in divisions', 0)) or (stats.get('h1', 0) - stats.get('h1 in divisions', 0))
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
    m = re.match(r'^((?:Chapter|Book|Part|Canto|Letter|Essay|Section|Act|Scene|Volume|Lecture|Lectures|Dialogue|Discourse|Meditation|Treatise|Appendix|Prop\.)\s+[IVXLC0-9A-Za-z-]+(?: and [IVXLC0-9]+)?|§\s*[0-9]+|[IVXLC]{1,7}|[0-9]{1,3})[.:]\s+(.+)$', t)
    if m:
        return m.group(1), m.group(2)
    if re.fullmatch(r'(Chapter|Book|Part|Canto|Letter|Essay|Section|Act|Scene|Volume|Lecture|Lectures|Dialogue|Discourse|Meditation|Treatise|Appendix|Prop\.)\s+[IVXLC0-9A-Za-z-]+(?: and [IVXLC0-9]+)?|§\s*[0-9]+|[IVXLC]{1,7}|[0-9]{1,3}', t):
        return t, ''
    return '', t


def plate_anchors(md, has_parts):
    """Where plates may go: chapter headings outside front/back divisions; if there are fewer
    chapters than a book wants plates, sections (###) join the list. Returns (anchors, on_sections)
    where anchors is a list of (kind, title) in document order."""
    chapters, sections = [], []
    depth = 0
    for l in split_front_matter(md)[1].split('\n'):
        if l.startswith(':::'):
            depth += 1 if re.match(r':::\s*(\{|[a-z])', l) else -1
            continue
        m = HEAD.match(l)
        if not m or depth > 0:
            continue
        lv = len(m.group(1))
        chap_lv = 2 if has_parts else (1, 2)
        if (lv == chap_lv) if isinstance(chap_lv, int) else (lv in chap_lv):
            chapters.append(('chapter', m.group(2)))
        elif lv == (3 if has_parts else 3):
            sections.append(('section', m.group(2)))
    return chapters, sections
