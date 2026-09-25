"""ath preflight — every asset the pipeline needs, checked before any run.

Pipeline 1 lost four builds in one night to assets that were not where the
code looked. Ten seconds here against sixteen minutes of a run that cannot
succeed. Fails loudly; prints the manifest; exits 0 only on PREFLIGHT OK.
"""
import os, shutil, subprocess, sys
from .book import ROOT, ASSETS, TEMPLATES, ART

BINARIES = {
    'pandoc':   'manuscript -> EPUB and -> Typst body  (brew install pandoc)',
    'typst':    'typesetting the three print editions (brew install typst)',
    'tesseract':'OCR witnesses                          (brew install tesseract)',
    'pdftoppm': 'scan PDF -> page images                (brew install poppler)',
    'qpdf':     'PDF page counts and checks             (brew install qpdf)',
}
OPTIONAL = {'pdftotext': 'text layer of a scanned PDF (poppler)', 'python3': ''}
FONTS = ['EBGaramond-Regular.ttf', 'EBGaramond-Italic.ttf', 'EBGaramond-SemiBold.ttf',
         'Cinzel-Regular.ttf', 'Cinzel-SemiBold.ttf', 'CormorantGaramond-Italic.ttf',
         'LaBelleAurore.ttf']
ORNAMENTS = ['orn_div2_diamond.png', 'orn_dec_fleur_center.png', 'orn_swirl_double_rule.png', 'orn_bot_leaf_rule.png']
HAWK = ['athanasius-hawk-mark-one-color.png']
TEMPLATE_FILES = ['typst/house.typ', 'typst/filter.lua', 'epub/style.css', 'epub/filter.lua', 'plan.md']
SAMPLE = """Produced by Anonymous Volunteers

SAMPLE BOOK

BY A. AUTHOR

CONTENTS

CHAPTER I.  The First                         1
CHAPTER II. The Second                        9

PREFACE.

This preface was written by the editor for the sample, and it runs to more than thirty words so
that the importer takes it for prose rather than a line of the title page, which is the point.

THE EDITOR.

CHAPTER I.

THE FIRST

"Quoted," he said, of the Dis-
courses and of all that is best in my writings--the friend of the Socratici _viri_ and of
Xxviti and of the year 1857. It fortifies my soul to know that the sample runs on, and on, and
on, with enough words in it to be a paragraph of text by any measure the importer applies.[1]

[1] A note on the sample, bound to its call.

CHAPTER II.

THE SECOND

A second chapter with a second paragraph long enough to count, and then some more words
to be safe about it, because thirty words is the threshold and this is the sample the
preflight runs before any book does. . . . And an ellipsis.

THE END.
"""
WORDLISTS = ['/usr/share/dict/american-english', '/usr/share/dict/british-english', '/usr/share/dict/words']


def main(argv):
    ok = True
    def check(cond, what, hint=''):
        nonlocal ok
        print(f'  {"ok " if cond else "MISSING"}  {what}{"   <- " + hint if (not cond and hint) else ""}')
        ok = ok and cond

    print('binaries')
    for b, hint in BINARIES.items():
        check(shutil.which(b) is not None, b, hint)
    for b, hint in OPTIONAL.items():
        print(f'  {"ok " if shutil.which(b) else "opt"}  {b} {"" if shutil.which(b) else "(optional: " + hint + ")"}')
    print('python')
    try:
        import PIL; check(True, f'Pillow {PIL.__version__}')
    except ImportError:
        check(False, 'Pillow', 'pip install pillow')
    try:
        import yaml; check(True, 'PyYAML')
    except ImportError:
        check(False, 'PyYAML', 'pip install pyyaml')
    print('assets')
    for f in FONTS:
        p = os.path.join(ASSETS, 'fonts', f); check(os.path.exists(p) and os.path.getsize(p) > 1000, f'fonts/{f}')
    for f in ORNAMENTS:
        p = os.path.join(ASSETS, 'ornaments', f); check(os.path.exists(p) and os.path.getsize(p) > 100, f'ornaments/{f}')
    for f in HAWK:
        p = os.path.join(ASSETS, 'hawk', f); check(os.path.exists(p) and os.path.getsize(p) > 100, f'hawk/{f}')
    print('templates')
    for f in TEMPLATE_FILES:
        p = os.path.join(TEMPLATES, f); check(os.path.exists(p) and os.path.getsize(p) > 10, f'templates/{f}')
    print('art')
    for f in ['index.csv', 'used.csv']:
        p = os.path.join(ART, f); check(os.path.exists(p) and os.path.getsize(p) > 100, f'art/{f}')
    print('wordlists (dictionary sweep is silent without one — pipeline 1 learned this the hard way)')
    have = [w for w in WORDLISTS if os.path.exists(w)]
    check(bool(have), ', '.join(have) or 'none', 'apt install wamerican wbritish  /  brew: use assets/words/ fallback')
    if not have:
        fb = os.path.join(ASSETS, 'words', 'english.txt')
        check(os.path.exists(fb), f'fallback {fb}')
    print('smoke test (every stage imports; the importer, every edit rule and every check run on a sample)')
    try:
        from . import manuscript as M, edit as E, plan, art, cover, ocr, typeset, epub, proof, batch, layout_check, print_spec, signature, gates, tracker
        md, rep = M.import_text(SAMPLE, title='Sample Book', author='A. Author', kind='gutenberg')
        errs, warns, stats = M.validate('---\ntitle: Sample Book\n---\n' + md)
        check(not errs and stats.get('chapters', 0) == 2 and stats.get('words', 0) > 150, f'importer: {stats.get("words", 0)} words, {stats.get("chapters", 0)} chapters, {len(errs)} errors, front {rep.get("front divisions")}')
        body = M.split_front_matter('---\ntitle: x\n---\n' + md)[1]
        for name, fn, cap, cat in E.RULES:
            res = fn(body); body = res[0]
            check(isinstance(res[1], int), f'rule {name}: {res[1]}')
        check('“Quoted,” he said' in body and 'Dis-\u2014courses' not in body and 'writings\u2014the' in body, 'rules: quotes curled, double-dash to em dash, hyphen joins left dashes alone')
        unknown, names, total, ctx, italic = E.dictionary_sweep('---\ntitle: x\n---\n' + body)
        sc = {w: E.suspicion(w, c, w in italic) for w, c in unknown.items()}
        check('Xxviti' in unknown and sc['Xxviti'] >= 3 and sc.get('viri', 9) < 3, f'dictionary sweep: {len(unknown)} unknown, suspicious first (Xxviti {sc.get("Xxviti")}, viri {sc.get("viri")})')
        seq = E.sequence_proof('---\ntitle: x\n---\n' + body, 2)
        check(any('expected 2: OK' in s for s in seq), f'sequence proof: {seq}')
        check(isinstance(E.structure_battery('---\ntitle: x\n---\n' + body), (list, dict)), 'structure battery runs')
    except Exception as e:
        check(False, f'smoke test raised {e.__class__.__name__}: {e}', 'fix the code before any run; a rule that cannot run on a sample cannot run on a book')
    print()
    if ok:
        print('PREFLIGHT OK'); return 0
    print('PREFLIGHT FAILED — fix the items marked MISSING; do not start a run "to see how far it gets".')
    return 2
