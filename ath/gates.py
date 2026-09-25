"""Gates: the recorded decision "this is good enough" / "this is not", between stages.

A stage produces output; a gate is a judgement about it, written down with a reason, by a
named hand, against fixed criteria. The next stage refuses to run until the gate before it is
passed (or is forced, which is logged). `ath gate <slug>` shows the table; `ath gate <slug>
<gate> pass|fail --note "…"` records the verdict; `ath gate --doc` prints GATES.md.
"""
import argparse, datetime, os
from .book import Book, Fail, EDITIONS

GATES = ['plan', 'art', 'text', 'typeset', 'epub', 'cover', 'final']
REQUIRES = {'art': ['plan'], 'typeset': ['text'], 'epub': ['text'], 'cover': ['art'], 'final': GATES[:-1]}

CRITERIA = {
 'plan': ('after `ath plan --sync`', [
   'The five sentences say what the book is and why Athanasius publishes it; a reader of the blurb would know whether to buy it.',
   'The canon setting is named and was verified by printed folio (not the title page); the public-domain basis is stated for the work AND the edition.',
   'Structure decided: parts/chapters/points, front divisions kept, back matter, notes; the external sequence proof number is in book.yaml `checks.expected_sections` when one exists.',
   'Art brief is specific (a place, a light, a season, a mood), names what to avoid, and follows the house preference: landscape, romantic, impressionist.',
   'Blurb 110–150 words, plain, confident, no adjectives about the edition, no spoilers, last sentence says why now.',
   'Go / no-go answered: source quality good enough to edit (not a different setting, not a reset printing); the title is worth the shelf.',
 ]),
 'art': ('after `ath art --pick --fetch` (look at the pictures, not the list)', [
   'The cover painting is the whole picture and reads at thumbnail size: one subject, a quiet zone for type, not a busy crowd scene.',
   'It is a painting (not a print, drawing, sculpture, photograph, textile), created 1926 or earlier, on an open-access or Commons public-domain page you opened.',
   'No nudity beyond the partial or a putto; no religious subject; no study/copy/fragment/"after"/"imitator of".',
   'It suits the book: period, place, and mood match the plan\'s brief; it would not embarrass the author.',
   'Not in art/used.csv under another book; painter under the caps (6 in the library, 2 in this book\'s plates).',
   'Ten plates chosen the same way, varied in subject and painter, each with a caption naming painting, painter, year, source.',
   'Resolution: the cover source is at least 1800 px on its short side; plates at least 1200 px.',
 ]),
 'text': ('after `ath edit` (read edit-report.md in full; open the manuscript only where it points)', [
   'Witnesses: for a scanned source, at least two independent voting witnesses of the same setting, each ≥ 95% agreement with the base; anything lower excluded and named in NOTES.md. A single-witness text is allowed only with a reading lens done by a reviewer.',
   'Every rule in edits.csv fired a plausible number of times for this text; no rule was forced past its cap.',
   'The dictionary list has been read to the end: every entry is archaic / a name / another language / a real error now fixed in the source. The "suspicious first" block is empty of unfixed errors.',
   'Sequence proof: numbered headings run 1..n without gap or repeat, and match the external count when there is one.',
   'Structure battery: every finding decided (fixed in the source, or recorded as deliberate in changes.csv / NOTES.md).',
   'No stray marks (*, _, ^, [, ]) survive in the body; every note call has a note; no paragraph begins lowercase.',
   'Front matter is structured (front divisions wrapped), furniture is gone, headings are in Title Case, verse keeps its lines.',
   'Nothing was invented; every lost passage is marked […] and has a changes.csv row.',
 ]),
 'typeset': ('after `ath typeset` (look at 3-typeset/pages/ for every edition; read typeset-report.md)', [
   'Every sampled page looks like a book from a good press: even colour, no rivers, no loose lines, no hyphen stacks, no widows or orphans on the pages you looked at; the report\'s counts are low and each remaining one is tolerable where it is.',
   'Openers: label, title, fleuron, small-caps opening; recto in Deluxe and Scholar; no chapter ends with fewer than four lines on its last page.',
   'Running heads and folios: verso title, recto chapter, roman in front matter, arabic from the first chapter; none on openers; contents folios match.',
   'Verse and quotations keep their shape; section breaks show the ornament; notes sit at the foot with the rule.',
   'Plates are whole, captioned, placed before an opener or section, and read well in grayscale.',
   'Publication page: edition credit, public-domain basis, cover credit, the signature block framed by the right edition word, the edition line.',
   'Page counts within the printer\'s range; inside margin at or above the house minimum for the count; page size equals the trim.',
 ]),
 'epub': ('after `ath epub` (open it in a reader when you can; read epub-check.md)', [
   'Cover shows on the shelf and as the first page; title page, publication page with the signature, contents.',
   'Navigation lists every chapter and opens it; labels and titles as in print.',
   'Text equivalence with the manuscript: zero words lost; footnotes open and return; verse keeps its lines; ornaments at section breaks.',
   'Plates whole, in colour, with captions; fonts embedded; no stray characters; file size sensible for the book.',
 ]),
 'cover': ('after `ath cover` (look at cover-contact.jpg and the spreads; read cover-report.md)', [
   'Whole painting on every front (full bleed only where the crop is under 12%; otherwise the plate layout); no zoomed detail.',
   'Type legible over the picture at thumbnail size: the report\'s contrast measure passes, or the plate layout was chosen.',
   'Title and author sized and placed as the house does; the hawk clear of the type; series line present.',
   'Back cover: the blurb fits at the house size without shrinking below the floor; credit line correct; edition word right; the barcode zone clear.',
   'Spine: text only when the spine is wide enough; spread dimensions from the final page count; the hardcover spine taken from the printer\'s template.',
   'The three fronts read as one family at a glance (same painting, same type, same hawk) and as three editions on close look.',
 ]),
 'final': ('after `ath proof` (PROOF.md, the reviewers\' reports, CHANGES.md, NOTES.md)', [
   'Mechanical lenses at zero findings, or every remaining finding recorded in changes.csv with a decision.',
   'At least one reading lens by a reviewer who did not build the book; its report in 5-proof/reports/ with a count.',
   'CHANGES.md rendered; category P/Q rows (source errors, open questions) each have a decision or an owner.',
   'NOTES.md complete: edition, witnesses, decisions, open flags; dated and signed by the overseer.',
   'Deliverables present: three PDFs, three spreads, the EPUB, site cover and thumb; each looked at once more after the last rebuild.',
 ]),
}


def doc():
    out = ['# GATES — this is good enough, this is not', '',
           'A stage makes output. A gate is a decision about it, written down against these criteria, with a reason and a name. ',
           'The next stage refuses to run until the gate before it is passed. Passing a gate with a criterion unmet is allowed only when the note says which one and why — that is a decision too, and it is on the record.', '',
           '| gate | when | required by |', '|---|---|---|']
    req_by = {g: [k for k, v in REQUIRES.items() if g in v] for g in GATES}
    for g in GATES:
        out.append(f'| {g} | {CRITERIA[g][0]} | {", ".join(req_by[g]) or "—"} |')
    for g in GATES:
        out += ['', f'## {g}', f'*{CRITERIA[g][0]}*', '']
        out += [f'{i}. {c}' for i, c in enumerate(CRITERIA[g][1], 1)]
    out += ['', '## How to decide', '',
            '- Look first, then read the numbers. The reports tell you where to look; they do not replace looking.',
            '- Compare against a good press, not against pipeline 1. Would Word on Fire, Everyman, or Loeb print this page? If not, it is not good enough.',
            '- A fail is cheap. Every stage re-runs in seconds; a fix goes into the source, a rule, book.yaml, or the template.',
            '- Write the reason. `ath gate <slug> <gate> pass --note "…"` refuses an empty or trivial note. The note is what the next person reads.',
            '- Forcing past a gate (`--force`) is logged in run-log.md and NOTES.md and shows in `ath status`. It is for a demo, never for a shipped book.']
    return '\n'.join(out) + '\n'


def passed(b, gate):
    g = (b.meta.get('gates') or {}).get(gate) or {}
    return g.get('verdict') == 'pass'


def require(b, command, force=False):
    need = [g for g in REQUIRES.get(command, []) if not passed(b, g)]
    if not need:
        return
    if force:
        b.log(command, f'FORCED past unpassed gate(s) {need}')
        b.meta.setdefault('forced', []).append({'command': command, 'gates': need, 'when': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')})
        b.save()
        return
    raise Fail(f'{command} needs gate(s) {need} passed first. Look at the evidence, then `ath gate {b.slug} {need[0]} pass --note "why it is good enough"` (or fail it and fix). `--force` is logged.')


def evidence(b, gate):
    """Files and numbers the gate is decided on, as a short list."""
    st = b.meta.get('status') or {}
    ev = {
        'plan': [f'1-plan/plan.md', f'blurb words: {len((b.meta.get("blurb") or "").split())}', f'subjects: {b.get("plan.art_subjects")}'],
        'art': ['1-plan/art-shortlist.md', f'cover: {(b.get("art.cover") or {}).get("title")} — {(b.get("art.cover") or {}).get("artist")}', f'plates: {len(b.get("art.plates") or [])}'],
        'text': ['2-text/edit-report.md', f'unknown words: {(st.get("edit") or {}).get("unknown")}', f'suspicious: {(st.get("edit") or {}).get("suspicious")}', f'errors: {(st.get("edit") or {}).get("errors")}', f'witnesses: {(st.get("ocr") or {}).get("witnesses", "n/a (text source)")}'],
        'typeset': ['3-typeset/pages/, 3-typeset/typeset-report.md'] + [f'{e}: {(st.get("typeset") or {}).get(e, {}).get("pages")} pp, layout findings {(st.get("typeset") or {}).get(e, {}).get("layout")}' for e in EDITIONS if (st.get('typeset') or {}).get(e)],
        'epub': ['4-epub/epub-check.md', f'problems: {(st.get("epub") or {}).get("problems")}', f'size MB: {(st.get("epub") or {}).get("size_mb")}'],
        'cover': ['1-plan/cover-contact.jpg, 1-plan/cover-report.md', f'layout: {(st.get("cover") or {}).get("layout")}', f'legibility: {(st.get("cover") or {}).get("legibility")}', f'blurb fit: {(st.get("cover") or {}).get("blurb_fit")}'],
        'final': ['5-proof/PROOF.md, CHANGES.md, NOTES.md', f'proof findings: {(st.get("proof") or {}).get("findings")}', f'reviewer reports: {len(os.listdir(b.path("5-proof", "reports"))) if os.path.isdir(b.path("5-proof", "reports")) else 0}'],
    }
    return ev.get(gate, [])


def show(b):
    gs = b.meta.get('gates') or {}
    print(f'Gates — {b.meta.get("title")}  [{b.slug}]')
    for g in GATES:
        v = gs.get(g) or {}
        mark = '✓' if v.get('verdict') == 'pass' else '✗' if v.get('verdict') == 'fail' else '·'
        print(f'  {mark} {g:8s} {v.get("verdict", "undecided"):10s} {v.get("when", ""):17s} {v.get("by", "")}')
        if v.get('note'):
            print(f'             note: {v["note"]}')
        for e in evidence(b, g):
            print(f'             {e}')
    if b.meta.get('forced'):
        print(f'  FORCED: {b.meta["forced"]}')
    print(f'\ncriteria: GATES.md  ·  decide: ath gate {b.slug} <gate> pass|fail --note "…"')


def set_gate(b, gate, verdict, note, by):
    if gate not in GATES:
        raise Fail(f'unknown gate {gate}; gates are {GATES}')
    if verdict not in ('pass', 'fail'):
        raise Fail('verdict must be pass or fail')
    if len(note.strip()) < 20:
        raise Fail('write the reason (at least 20 characters): what you looked at and why it is, or is not, good enough')
    when = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    b.meta.setdefault('gates', {})[gate] = {'verdict': verdict, 'note': note.strip(), 'when': when, 'by': by}
    if verdict == 'fail':
        # a fail reopens everything after it
        for later in GATES[GATES.index(gate) + 1:]:
            b.meta['gates'].pop(later, None)
    b.save()
    b.log('gate', f'{gate}: {verdict.upper()} — {note.strip()} ({by})')
    notes = b.read('NOTES.md') or ''
    line = f'- {when} · **{gate}** · {verdict} · {note.strip()} · {by}\n'
    if '## Gates' in notes:
        notes = notes.rstrip('\n') + '\n' + line if notes.rstrip().endswith(('Gates', '\n')) or True else notes
        b.write('NOTES.md', notes if line in notes else notes.replace('## Gates\n', '## Gates\n' + line, 1))
    else:
        b.write('NOTES.md', notes.rstrip('\n') + '\n\n## Gates\n\n' + line)


def main(argv):
    ap = argparse.ArgumentParser(prog='ath gate')
    ap.add_argument('slug', nargs='?')
    ap.add_argument('gate', nargs='?')
    ap.add_argument('verdict', nargs='?', choices=['pass', 'fail'])
    ap.add_argument('--note', default='')
    ap.add_argument('--by', default=os.environ.get('ATH_BY', 'overseer'))
    ap.add_argument('--doc', action='store_true', help='print GATES.md')
    a = ap.parse_args(argv)
    if a.doc:
        print(doc()); return 0
    if not a.slug:
        ap.print_help(); return 1
    b = Book(a.slug)
    if a.gate and a.verdict:
        set_gate(b, a.gate, a.verdict, a.note, a.by)
    show(b)
    return 0
