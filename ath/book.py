"""Book folder conventions, metadata (book.yaml), status and the run log.

    books/<slug>/
      book.yaml        metadata and decisions (the only file a human edits by hand)
      0-source/        scans, page images, PG/archive.org downloads, witnesses
      1-plan/          plan.md, art shortlist, cover, plates, blurb.md
      2-text/          witnesses -> consensus -> manuscript.md, edits.csv, checks/
      3-typeset/       deluxe.pdf, everyman.pdf, scholar.pdf, main-*.typ, pages/
      4-epub/          <slug>.epub, epub-check.md
      5-proof/         PROOF.md, lens reports, reviewer reports, pages/
      NOTES.md         the record: edition, witnesses, decisions, open flags
      changes.csv      append-only change tracker (see tracker.py)
      CHANGES.md       rendered from changes.csv
      run-log.md       one dated entry per command run
"""
import datetime, json, os, re, subprocess, sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BOOKS = os.path.join(ROOT, 'books')
ASSETS = os.path.join(ROOT, 'assets')
TEMPLATES = os.path.join(ROOT, 'templates')
ART = os.path.join(ROOT, 'art')
STAGES = ['0-source', '1-plan', '2-text', '3-typeset', '4-epub', '5-proof']
EDITIONS = ['deluxe', 'everyman', 'scholar']
UA = 'Athanasius2/2.0 (etjokeefe@gmail.com) public-domain edition build'


class Fail(SystemExit):
    """A stage refuses to continue. Message first, exit code 2."""
    def __init__(self, msg):
        super().__init__(f'FAIL: {msg}')


def slugify(s, n=60):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:n].strip('-')


def now():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M')


class Book:
    def __init__(self, slug):
        self.slug = slug
        self.dir = os.path.join(BOOKS, slug)
        self.yaml_path = os.path.join(self.dir, 'book.yaml')
        if not os.path.exists(self.yaml_path):
            raise Fail(f'no such book: {slug} (expected {self.yaml_path}); run `ath new`')
        with open(self.yaml_path, encoding='utf8') as f:
            self.meta = yaml.safe_load(f) or {}

    # -- paths --------------------------------------------------------------
    def path(self, *parts):
        return os.path.join(self.dir, *parts)

    def stage(self, name):
        p = self.path(name)
        os.makedirs(p, exist_ok=True)
        return p

    @property
    def manuscript(self):
        return self.path('2-text', 'manuscript.md')

    # -- metadata -------------------------------------------------------------
    def save(self):
        with open(self.yaml_path, 'w', encoding='utf8') as f:
            yaml.safe_dump(self.meta, f, sort_keys=False, allow_unicode=True, width=88)

    def set_status(self, stage, value, **extra):
        st = self.meta.setdefault('status', {})
        st[stage] = {'state': value, 'when': now(), **extra}
        self.save()

    def get(self, key, default=None):
        cur = self.meta
        for k in key.split('.'):
            if not isinstance(cur, dict) or k not in cur:
                return default
            cur = cur[k]
        return cur

    # -- records ----------------------------------------------------------------
    def log(self, stage, message):
        """Append one line to run-log.md. The log, not the session, is the memory."""
        line = f'- {now()} · **{stage}** · {message}\n'
        p = self.path('run-log.md')
        new = not os.path.exists(p)
        with open(p, 'a', encoding='utf8') as f:
            if new:
                f.write(f'# Run log — {self.meta.get("title", self.slug)}\n\nRead first, write last.\n\n')
            f.write(line)
        print(line.rstrip())

    def write(self, rel, text):
        p = self.path(rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf8') as f:
            f.write(text)
        return p

    def read(self, rel, default=None):
        p = self.path(rel)
        if not os.path.exists(p):
            return default
        with open(p, encoding='utf8') as f:
            return f.read()


def new_book(slug, title, author, **kw):
    """Create books/<slug>/ with book.yaml and the six stage folders."""
    d = os.path.join(BOOKS, slug)
    if os.path.exists(os.path.join(d, 'book.yaml')):
        raise Fail(f'{slug} already exists')
    for s in STAGES:
        os.makedirs(os.path.join(d, s), exist_ok=True)
    meta = {
        'slug': slug,
        'title': title,
        'subtitle': kw.get('subtitle', ''),
        'author': author,
        'author_sort': kw.get('author_sort', author),
        'translator': kw.get('translator', ''),
        'language': 'en',
        'series': kw.get('series', 'The Athanasius Library'),
        'year_first': kw.get('year_first', ''),
        'edition_credit': kw.get('edition_credit', ''),
        'pd_basis': kw.get('pd_basis', 'published before 1 January 1931; public domain in the United States'),
        'source': {
            'kind': kw.get('kind', 'text'),           # text | gutenberg | archive | scan
            'gutenberg': kw.get('gutenberg'),
            'archive': kw.get('archive') or [],
            'files': kw.get('files') or [],
            'note': '',
        },
        'plan': {'summary': '', 'audience': '', 'structure': '', 'art_subjects': [], 'movement': 'landscape'},
        'art': {'cover': None, 'plates': [], 'plates_wanted': 10, 'plate_mode': 'grayscale'},
        'blurb': '',
        'editions': list(EDITIONS),
        'typeset': {'chapters_open_recto': True, 'opening_smallcaps': True, 'signature_font': 'La Belle Aurore'},
        'status': {},
    }
    with open(os.path.join(d, 'book.yaml'), 'w', encoding='utf8') as f:
        yaml.safe_dump(meta, f, sort_keys=False, allow_unicode=True, width=88)
    b = Book(slug)
    b.write('NOTES.md', f'# {title} — {author}\n\n**Imprint:** Athanasius. **Created:** {now()}.\n\n'
            '## Edition used\n\n(fill: the canon setting, with URL; how it was verified by printed folio)\n\n'
            '## Public-domain basis\n\n(fill)\n\n## Editorial decisions\n\n- \n\n## Witnesses\n\n- \n\n'
            '## Open flags\n\n- \n')
    b.log('new', f'created {slug}: {title} — {author}')
    return b


def run(cmd, cwd=None, check=True, quiet=False):
    """Run a command, print it once, return (code, stdout, stderr)."""
    if not quiet:
        print('$', ' '.join(str(c) for c in cmd))
    p = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True)
    if check and p.returncode != 0:
        sys.stderr.write(p.stdout[-2000:] + p.stderr[-4000:])
        raise Fail(f'command failed ({p.returncode}): {cmd[0]}')
    return p.returncode, p.stdout, p.stderr


def pdf_pages(path):
    """Page count without a PDF library: qpdf if present, else count /Type /Page objects."""
    try:
        code, out, _ = run(['qpdf', '--show-npages', path], check=False, quiet=True)
        if code == 0:
            return int(out.strip())
    except FileNotFoundError:
        pass
    data = open(path, 'rb').read()
    return len(re.findall(rb'/Type\s*/Page[^s]', data))
