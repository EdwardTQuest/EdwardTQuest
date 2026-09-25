"""ath new <slug> --title T --author A [--subtitle S] [--gutenberg N] [--archive ID ...] [--scan F] [--text F]"""
import argparse, os, shutil
from .book import new_book, slugify, Fail


def main(argv):
    ap = argparse.ArgumentParser(prog='ath new')
    ap.add_argument('slug')
    ap.add_argument('--title', required=True)
    ap.add_argument('--author', required=True)
    ap.add_argument('--subtitle', default='')
    ap.add_argument('--translator', default='')
    ap.add_argument('--gutenberg', type=int)
    ap.add_argument('--archive', action='append', default=[], help='archive.org identifier (repeatable)')
    ap.add_argument('--scan', help='a scanned PDF to OCR')
    ap.add_argument('--text', help='an already-edited plain text or markdown file')
    ap.add_argument('--edition-credit', default='')
    a = ap.parse_args(argv)
    slug = slugify(a.slug)
    kind = 'gutenberg' if a.gutenberg else 'archive' if a.archive else 'scan' if a.scan else 'text'
    files = []
    b = new_book(slug, a.title, a.author, subtitle=a.subtitle, translator=a.translator, kind=kind,
                 gutenberg=a.gutenberg, archive=a.archive, edition_credit=a.edition_credit)
    for src in (a.scan, a.text):
        if src:
            if not os.path.exists(src):
                raise Fail(f'source file not found: {src}')
            dst = b.path('0-source', os.path.basename(src))
            shutil.copy2(src, dst)
            files.append(os.path.relpath(dst, b.dir))
            b.log('new', f'copied source {src} -> {os.path.relpath(dst, b.dir)}')
    b.meta['source']['files'] = files
    b.save()
    print(f'\ncreated books/{slug}/ — next: `ath plan {slug}`')
    return 0
