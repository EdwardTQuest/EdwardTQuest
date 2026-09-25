"""ath plan <slug> [--sync] — skim the source and write 1-plan/plan.md for the overseer.

The skim is mechanical (word count, headings found, opening and closing passages). The
judgement — what the book is, what art suits it, the blurb — is the overseer's, written into
plan.md. `--sync` copies the `art` YAML block and the `blurb` block into book.yaml.
"""
import argparse, os, re, glob
import yaml
from .book import Book, TEMPLATES, Fail
from . import manuscript as M


def source_text(b):
    """The best text we have: consensus (after OCR) > manuscript > 0-source text."""
    for rel in ('2-text/consensus.txt', '2-text/manuscript.md'):
        t = b.read(rel)
        if t:
            return t, rel
    for f in b.get('source.files', []):
        p = b.path(f)
        if p.lower().endswith(('.txt', '.md')) and os.path.exists(p):
            return open(p, encoding='utf8', errors='replace').read(), f
    for p in sorted(glob.glob(b.path('0-source', '*.txt')) + glob.glob(b.path('0-source', '*.md'))):
        return open(p, encoding='utf8', errors='replace').read(), os.path.relpath(p, b.dir)
    return None, None


def skim(text):
    if text is None:
        return '(no text yet — run `ath ocr` first, or add a text to 0-source/)'
    words = text.split()
    heads = []
    for l in text.split('\n'):
        m = M.HEAD.match(l)
        if m:
            heads.append(m.group(2))
        elif M.CHAPTER_LINE.match(l) and len(l) < 80:
            heads.append(l.strip())
    parts = [f'**Words:** {len(words):,}. **Headings found:** {len(heads)}.\n']
    if heads:
        parts.append('Headings (first 40): ' + ' · '.join(h[:50] for h in heads[:40]) + ('…' if len(heads) > 40 else ''))
    parts.append('\n**Opening:**\n\n> ' + ' '.join(words[:350]).replace('\n', ' '))
    parts.append('\n**Closing:**\n\n> ' + ' '.join(words[-220:]).replace('\n', ' '))
    return '\n'.join(parts)


def sync(b):
    plan = b.read('1-plan/plan.md')
    if not plan:
        raise Fail('no 1-plan/plan.md to sync')
    m = re.search(r'```yaml\s*\n(.*?)```', plan, re.S)
    if m:
        data = yaml.safe_load(m.group(1)) or {}
        art = data.get('art', {})
        p = b.meta.setdefault('plan', {})
        p['movement'] = art.get('movement', p.get('movement', 'landscape'))
        p['art_subjects'] = [s for s in (art.get('subjects') or []) if s]
        p['art_avoid'] = [s for s in (art.get('avoid') or []) if s]
        p['cover_note'] = art.get('cover_note', '')
    m = re.search(r'```blurb\s*\n(.*?)```', plan, re.S)
    if m:
        blurb = m.group(1).strip()
        if blurb and not blurb.startswith('(the back-cover'):
            b.meta['blurb'] = blurb
            b.write('1-plan/blurb.md', blurb + '\n')
    for key in ('summary',):
        m = re.search(r'## The work in five sentences\s*\n+(.+?)\n\n## ', plan, re.S)
        if m and not m.group(1).startswith('(what it is'):
            b.meta['plan']['summary'] = m.group(1).strip()
    b.save()
    b.log('plan', f'synced plan.md -> book.yaml: subjects={b.meta["plan"].get("art_subjects")}, blurb={"yes" if b.meta.get("blurb") else "no"}')
    return 0


def main(argv):
    ap = argparse.ArgumentParser(prog='ath plan')
    ap.add_argument('slug')
    ap.add_argument('--sync', action='store_true', help='copy the art block and blurb from plan.md into book.yaml')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    if a.sync:
        return sync(b)
    if os.path.exists(b.path('1-plan', 'plan.md')) and not a.force:
        print('1-plan/plan.md exists (use --force to regenerate the skim; --sync to read it back)'); return 0
    text, src = source_text(b)
    tpl = open(os.path.join(TEMPLATES, 'plan.md'), encoding='utf8').read()
    out = tpl.format(title=b.meta.get('title', ''), slug=b.slug, year_first=b.meta.get('year_first', ''),
                     edition_credit=b.meta.get('edition_credit', ''), pd_basis=b.meta.get('pd_basis', ''), skim=skim(text))
    b.stage('1-plan')
    b.write('1-plan/plan.md', out)
    b.log('plan', f'wrote 1-plan/plan.md (skim of {src or "nothing"}); overseer fills it, then `ath plan {b.slug} --sync`')
    return 0
