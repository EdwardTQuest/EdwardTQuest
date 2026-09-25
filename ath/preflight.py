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
    print()
    if ok:
        print('PREFLIGHT OK'); return 0
    print('PREFLIGHT FAILED — fix the items marked MISSING; do not start a run "to see how far it gets".')
    return 2
