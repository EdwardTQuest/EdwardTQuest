"""Page-layout analysis of a finished PDF: widows, orphans, runts, hyphen stacks, loose lines,
stranded headings, thin chapter-end pages. Reads the line geometry poppler reports
(`pdftotext -bbox-layout`), so it sees what the reader sees, not what the source intended.

A finding is a place to look, with a page number; the typeset gate decides whether it is
tolerable where it is. Counts go into book.yaml status.typeset.<edition>.layout.
"""
import collections, re, statistics, subprocess
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/1999/xhtml}'


def _pages(pdf):
    xml = subprocess.run(['pdftotext', '-bbox-layout', pdf, '-'], capture_output=True, text=True).stdout
    xml = re.sub(r'<!DOCTYPE[^>]*>', '', xml)
    root = ET.fromstring(xml)
    pages = []
    for pg in root.iter(NS + 'page'):
        W, H = float(pg.get('width')), float(pg.get('height'))
        lines = []
        for ln in pg.iter(NS + 'line'):
            words = [(float(w.get('xMin')), float(w.get('xMax')), (w.text or '')) for w in ln.iter(NS + 'word')]
            if not words:
                continue
            lines.append({'x0': float(ln.get('xMin')), 'x1': float(ln.get('xMax')), 'y0': float(ln.get('yMin')), 'y1': float(ln.get('yMax')),
                          'text': ' '.join(t for _, _, t in words), 'words': words})
        lines.sort(key=lambda l: (round(l['y0']), l['x0']))
        pages.append({'w': W, 'h': H, 'lines': lines})
    return pages


def analyze(pdf):
    pages = _pages(pdf)
    if not pages:
        return [], {}
    heights = [l['y1'] - l['y0'] for p in pages for l in p['lines']]
    h = statistics.median(heights)
    em = h * 0.72                     # a rough em from the line box
    findings = []
    stats = collections.Counter()
    body_by_page = []
    # the measure is per page: recto and verso blocks sit at different x (inside/outside margins)
    for pi, p in enumerate(pages, 1):
        longs = [l for l in p['lines'] if len(l['text']) > 40 and abs((l['y1'] - l['y0']) - h) < 0.25 * h]
        if len(longs) >= 3:
            L = collections.Counter(round(l['x0']) for l in longs).most_common(1)[0][0]
            R = collections.Counter(round(l['x1']) for l in longs).most_common(1)[0][0]
        else:
            L = R = None
        p['L'], p['R'] = L, R
        body = []
        for l in p['lines']:
            width = l['x1'] - l['x0']
            small = (l['y1'] - l['y0']) < 0.82 * h
            top = l['y0'] < 0.09 * p['h']; bottom = l['y1'] > 0.93 * p['h']
            if (top or bottom) and (small or re.fullmatch(r'[\divxlc]+', l['text'].strip().lower())):
                l['kind'] = 'furniture'; continue
            if L is None:
                l['kind'] = 'display'; body.append(l); continue
            measure = R - L
            centred = abs((l['x0'] + l['x1']) / 2 - (L + measure / 2)) < 0.02 * p['w'] and width < 0.75 * measure
            if re.fullmatch(r'[\divxlc]+', l['text'].strip().lower()) and centred:
                l['kind'] = 'section-number'
            elif centred and len(l['text']) < 70 and not l['text'].rstrip().endswith(('.', ',', ';', ':', '”', '’')) and not small:
                l['kind'] = 'heading'
            elif small:
                l['kind'] = 'note'
            else:
                l['kind'] = 'body'
                l['starts'] = L + 0.55 * em < l['x0'] < L + 3 * em
                l['short'] = l['x1'] < R - 1.2 * em
                l['justified'] = not l['short']
            body.append(l)
        body_by_page.append(body)
    for pi, body in enumerate(body_by_page, 1):
        p = pages[pi - 1]
        bl = [l for l in body if l['kind'] == 'body']
        if p['L'] is None or not bl:
            continue                       # title pages, plates, contents: not this lens's business
        measure = p['R'] - p['L']
        last = bl[-1]
        if last.get('starts') and not last.get('short') and pi < len(body_by_page):
            nxt = [l for l in body_by_page[pi] if l['kind'] == 'body']
            if nxt and not nxt[0].get('starts'):
                findings.append((pi, 'orphan', last['text'][:60])); stats['orphan'] += 1
        first = bl[0]
        if first.get('short') and not first.get('starts') and pi > 1:
            prev = [l for l in body_by_page[pi - 2] if l['kind'] == 'body']
            if prev and not prev[-1].get('short'):
                findings.append((pi, 'widow', first['text'][:60])); stats['widow'] += 1
        stack = 0
        for i, l in enumerate(bl):
            if l.get('short') and len(l['words']) == 1 and (l['x1'] - l['x0']) < 0.18 * measure and i > 0 and not bl[i - 1].get('short'):
                findings.append((pi, 'runt', l['text'])); stats['runt'] += 1
            if l['text'].rstrip().endswith('-') and not l['text'].rstrip().endswith('—'):
                stack += 1
                if stack == 3:
                    findings.append((pi, 'hyphen stack', l['text'][-40:])); stats['hyphen stack'] += 1
            else:
                stack = 0
            if l.get('justified') and len(l['words']) > 3:
                gaps = [l['words'][k + 1][0] - l['words'][k][1] for k in range(len(l['words']) - 1)]
                g = statistics.mean(gaps)
                if g > 0.55 * em:
                    findings.append((pi, 'loose line', f'mean gap {g / em:.2f} em: ' + l['text'][:50])); stats['loose line'] += 1
        tail = body[-1]
        if tail['kind'] in ('heading', 'section-number') and len(bl) >= 3:
            findings.append((pi, 'heading at page foot', tail['text'][:60])); stats['heading at foot'] += 1
        if pi < len(body_by_page):
            nxt = body_by_page[pi]
            nb = [l for l in nxt if l['kind'] == 'body']
            if nxt and nb and nxt[0]['y0'] > 0.28 * pages[pi]['h'] and len(bl) < 4:
                findings.append((pi, 'thin chapter end', f'{len(bl)} lines before an opener')); stats['thin chapter end'] += 1
    stats['pages'] = len(pages)
    ms = [p['R'] - p['L'] for p in pages if p['L'] is not None]
    stats['measure_in'] = round(statistics.median(ms) / 72, 2) if ms else None
    stats['line_height_pt'] = round(h, 1)
    return findings, dict(stats)


def report(b, edition, pdf):
    findings, stats = analyze(pdf)
    lines = [f'## {edition} — {stats.get("pages")} pages, measure {stats.get("measure_in")} in, line box {stats.get("line_height_pt")} pt', '',
             'counts: ' + ', '.join(f'{k} {v}' for k, v in stats.items() if k not in ('pages', 'measure_in', 'line_height_pt')) or 'counts: none', '']
    for pg, kind, text in findings[:80]:
        lines.append(f'- p.{pg} {kind}: {text}')
    if len(findings) > 80:
        lines.append(f'- … {len(findings) - 80} more')
    if not findings:
        lines.append('- nothing found by this lens (scope: widows, orphans, runts, hyphen stacks, loose lines, stranded headings, thin chapter ends)')
    return findings, stats, '\n'.join(lines) + '\n'
