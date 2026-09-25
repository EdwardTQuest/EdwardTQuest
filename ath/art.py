"""ath art <slug> — choose the cover painting and the plates; download them; keep the ledger.

Two sources, one ledger:
  art/index.csv   3,435 open-access paintings (NGA, Met, Cleveland) filtered for the house: colour,
                  1780–1926, no religious sections, no nudes by title, romantic → impressionist → landscape
  Wikimedia Commons (live)   structured search for paintings (P31=Q3305213) by the plan's subjects,
                  public-domain licence, created before 1927, nudity and religious subjects screened out
  art/used.csv    every painting ever put on an Athanasius jacket (seeded from pipeline 1: 1,479 rows).
                  A painting is never used twice; a painter carries at most MAX_PER_PAINTER covers.

House rules for 2.0 (from Tom, Sept 2026):
  * the whole picture, not a zoomed detail — the cover stage crops at most a sliver, or shows the
    painting entire as a plate on the house green
  * no nudity: partial, or a putto, is the limit; anything titled nude/bather/Venus/... never enters
  * no religious art; prefer romantic, impressionist and landscape painting
  * the ledger, not a column in a big sheet, is what stops repeats
"""
import argparse, csv, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from .book import Book, ART, UA, Fail
from . import tracker

MAX_PER_PAINTER = 6          # across the whole library
MAX_PER_PAINTER_IN_BOOK = 2  # among a book's plates
PD_YEAR = 1926               # created on or before: safe in the United States

NUDE = re.compile(r'\b(nude|nudes|naked|bather|bathers|bathing|venus|susanna|bathsheba|odalisque|leda|dana[eë]|nymph|nymphs|satyr|toilet|after the bath|the bath\b|reclining (woman|figure|nude)|adam and eve|\beve\b|salome|three graces|galatea|andromeda|lucretia|cleopatra|judith|magdalen|pygmalion|bacchante|bacchanal|maenad|siren|sirens|mermaid|academic study|study of a (man|woman|figure)|model\b|harem|slave market|torso)\b', re.I)
RELIG = re.compile(r'\b(madonna|virgin|christ|jesus|crucifix|crucifixion|saint|st\.|annunciation|nativity|adoration|magi|apostle|angel|archangel|holy family|piet[aà]|resurrection|ascension|baptism|last supper|martyr|prophet|moses|abraham|noah|bishop|cardinal|monk|nun|friar|altar|altarpiece|god the father|trinity|lamentation|deposition|entombment|ecce homo|sacred|devotion|mass\b|chapel|cathedral interior|church interior|calvary|golgotha|pilgrim)\b', re.I)
LESSER = re.compile(r'\b(study for|sketch for|copy after|after [A-Z]|fragment|verso|recto|design for|cartoon for|reproduction|replica|attributed to|follower of|workshop of|school of|circle of|imitator of)\b', re.I)

MOVEMENT_WORDS = {
    'landscape': ['landscape', 'river', 'valley', 'meadow', 'forest', 'wood', 'hills', 'mountain', 'lake', 'coast', 'shore', 'field', 'sunset', 'dawn', 'evening', 'moonlight', 'garden', 'path', 'road', 'village', 'harbor', 'harbour'],
    'romantic': ['ruins', 'storm', 'moonlight', 'cliff', 'castle', 'abbey', 'mountain', 'wanderer', 'sea', 'twilight', 'cathedral', 'forest', 'mist', 'fog', 'gorge', 'torrent'],
    'impressionist': ['garden', 'river', 'boulevard', 'bridge', 'regatta', 'haystack', 'poplar', 'water', 'seine', 'beach', 'snow', 'morning', 'afternoon', 'terrace', 'boat', 'boating'],
    'marine': ['sea', 'ship', 'boat', 'harbor', 'harbour', 'coast', 'shore', 'wave', 'storm', 'fishing', 'sail', 'sailing', 'schooner', 'bay', 'beach'],
    'genre': ['reading', 'letter', 'window', 'interior', 'kitchen', 'table', 'lamp', 'girl', 'boy', 'family', 'market', 'street', 'cafe', 'café', 'shop'],
}
ERA_BONUS = {'Romantic (1780-1860)': 10, 'Impressionist era (1860-1912)': 12, 'Rococo / 18th c.': 3, 'Modern (1912-1950)': 4}
SECTION_BONUS = {'Landscape & Nature': 14, 'Seascape & Marine': 10, 'Winter & Season': 8, 'Architecture & Cityscape': 6,
                 'Animals & Natural History': 4, 'Genre & Domestic Life': 3, 'Still Life & Floral': 2, 'Portraits & Figures': -4,
                 'Classical Antiquity & Myth': -6, 'Unclassified & Other': -2, 'Prints, Drawings & Ephemera': -8}
PAINTERS = {  # a light thumb on the scale for the house's favourite hands
    'romantic': ['caspar david friedrich', 'j. m. w. turner', 'joseph mallord william turner', 'john constable', 'thomas cole', 'frederic edwin church', 'albert bierstadt', 'jean-baptiste-camille corot', 'john martin', 'samuel palmer', 'george inness', 'john frederick kensett', 'sanford robinson gifford', 'martin johnson heade', 'fitz henry lane', 'asher brown durand', 'jasper francis cropsey', 'théodore rousseau', 'charles-françois daubigny', 'washington allston', 'thomas doughty'],
    'impressionist': ['claude monet', 'camille pissarro', 'alfred sisley', 'berthe morisot', 'gustave caillebotte', 'eugène boudin', 'johan barthold jongkind', 'childe hassam', 'john singer sargent', 'joaquín sorolla', 'theodore robinson', 'john henry twachtman', 'willard leroy metcalf', 'william merritt chase', 'julian alden weir', 'mary cassatt', 'frederick carl frieseke', 'edward henry potthast', 'armand guillaumin', 'stanislas lépine'],
}


def akey(name):
    name = ''.join(c for c in unicodedata.normalize('NFKD', name or '') if not unicodedata.combining(c))
    name = re.split(r'\s*\(', name)[0]
    name = re.split(r'\s*,\s*(?=[A-Z])', name)[0]
    return re.sub(r'\s+', ' ', name).strip().lower()


def load_index():
    with open(os.path.join(ART, 'index.csv'), encoding='utf8') as f:
        return list(csv.DictReader(f))


def load_used():
    p = os.path.join(ART, 'used.csv')
    if not os.path.exists(p):
        return []
    with open(p, encoding='utf8') as f:
        return list(csv.DictReader(f))


def record_used(painting, artist, used_by, source):
    p = os.path.join(ART, 'used.csv')
    new = not os.path.exists(p)
    with open(p, 'a', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=['painting', 'artist', 'artist_key', 'used_by', 'source', 'when'])
        if new:
            w.writeheader()
        w.writerow({'painting': painting, 'artist': artist, 'artist_key': akey(artist), 'used_by': used_by, 'source': source, 'when': time.strftime('%Y-%m-%d')})


def phrase_score(phrase, text):
    p = phrase.lower().strip()
    if not p:
        return 0.0
    if re.search(r'(?<![\w-])' + re.escape(p) + r'(?![\w-])', text):
        return 2.0
    words = [w for w in p.split() if len(w) > 3]
    if words and all(re.search(r'(?<![\w-])' + re.escape(w), text) for w in words):
        return 1.0
    return 0.0


def score(row, subjects, movement, avoid, used_keys, painter_counts):
    title = (row.get('title') or '').lower()
    text = ' '.join([title, (row.get('keywords') or '').lower(), (row.get('description') or '').lower()])
    if NUDE.search(title) or NUDE.search(row.get('description') or ''):
        return None, 'nudity'
    if RELIG.search(title):
        return None, 'religious'
    if LESSER.search(row.get('title') or '') or LESSER.search(row.get('artist') or ''):
        return None, 'lesser version'
    for a in avoid or []:
        if a and a.lower() in text:
            return None, f'avoid {a!r}'
    if (title, akey(row.get('artist', ''))) in used_keys:
        return None, 'used before'
    if painter_counts.get(akey(row.get('artist', '')), 0) >= MAX_PER_PAINTER:
        return None, 'painter at cap'
    try:
        y = int(row.get('year') or 0)
    except ValueError:
        y = 0
    if y and y > PD_YEAR:
        return None, 'after 1926'
    s, why = 0.0, []
    n = len(subjects)
    best = 0.0
    for i, q in enumerate(subjects):
        ps = phrase_score(q, text)
        if ps:
            v = ps * (n - i) * 4
            if v > best:
                best, hit = v, q
    if best:
        s += best; why.append(f'matched {hit!r}')
    mv = MOVEMENT_WORDS.get(movement, MOVEMENT_WORDS['landscape'])
    mw = sum(1 for w in mv if re.search(r'\b' + re.escape(w) + r'\b', text))
    if mw:
        s += min(12, 4 * mw); why.append(f'{movement} words ×{mw}')
    s += ERA_BONUS.get(row.get('era', ''), 0)
    s += SECTION_BONUS.get(row.get('section', ''), 0)
    ak = akey(row.get('artist', ''))
    for mvmt, names in PAINTERS.items():
        if ak in names:
            s += 6 if mvmt == movement or movement == 'landscape' else 3; why.append(f'{mvmt} painter')
    try:
        s += min(20, float(row.get('score') or 0) / 8)   # pipeline-1 cover score: legibility, quiet area
    except ValueError:
        pass
    if row.get('orientation') == 'Portrait':
        s += 4; why.append('portrait format')
    try:
        if int(row.get('width') or 0) < 1800:
            s -= 15; why.append('low resolution')
    except ValueError:
        pass
    return s, '; '.join(why) or 'era and section only'


def shortlist(b, n=15, extra=None):
    plan = b.get('plan', {}) or {}
    subjects = plan.get('art_subjects') or []
    movement = plan.get('movement') or 'landscape'
    avoid = plan.get('art_avoid') or []
    used = load_used()
    used_keys = {((u['painting'] or '').lower(), u['artist_key']) for u in used}
    counts = {}
    for u in used:
        counts[u['artist_key']] = counts.get(u['artist_key'], 0) + 1
    rows = load_index() + (extra or [])
    scored = []
    reasons = {}
    for r in rows:
        s, why = score(r, subjects, movement, avoid, used_keys, counts)
        if s is None:
            reasons[why] = reasons.get(why, 0) + 1
            continue
        scored.append((s, why, r))
    scored.sort(key=lambda x: -x[0])
    return scored[:n * 3], reasons


def pick(b, scored, plates_wanted):
    """Cover = the best; plates = the next best with ≤2 per painter, spread over sections."""
    if not scored:
        raise Fail('no candidates: loosen the plan (fewer subjects, another movement) or run --commons')
    cover = scored[0]
    plates, per_painter, seen = [], {}, {cover[2]['title'].lower()}
    for s, why, r in scored[1:]:
        k = akey(r['artist'])
        if per_painter.get(k, 0) >= MAX_PER_PAINTER_IN_BOOK or r['title'].lower() in seen:
            continue
        plates.append((s, why, r)); per_painter[k] = per_painter.get(k, 0) + 1; seen.add(r['title'].lower())
        if len(plates) >= plates_wanted:
            break
    return cover, plates


def row_public(r):
    return {k: r.get(k, '') for k in ('id', 'title', 'artist', 'year', 'era', 'section', 'source', 'page_url', 'image_url', 'thumb_url', 'rights', 'width', 'height', 'orientation')}


# ---------------------------------------------------------------- Wikimedia Commons (live)
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'


def commons_search(subjects, movement, limit=60):
    """Structured search on Commons: paintings (P31=Q3305213), bitmap files, public domain, by
    subject words. Returns rows in the index's shape. Needs the network (blocked in some
    containers — run from Tom's machine). Uses Special:FilePath for downloads, never upload.wikimedia.org."""
    words = ' '.join(f'"{s}"' if ' ' in s else s for s in subjects[:3]) or movement
    q = f'haswbstatement:P31=Q3305213 filetype:bitmap {words} -incategory:"Nude paintings" -incategory:"Nude art"'
    params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': limit, 'gsrsearch': q,
              'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 400}
    url = COMMONS_API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    out = []
    for pg in (data.get('query', {}).get('pages', {}) or {}).values():
        ii = (pg.get('imageinfo') or [{}])[0]
        em = ii.get('extmetadata', {}) or {}
        get = lambda k: re.sub(r'<[^>]+>', '', (em.get(k, {}) or {}).get('value', '') or '').strip()
        lic = get('LicenseShortName').lower()
        if not ('public domain' in lic or lic in ('cc0', 'pd', 'pdm') or 'pd-' in lic):
            continue
        date = get('DateTimeOriginal')
        m = re.search(r'\b(1[5-9]\d\d)\b', date)
        year = int(m.group(1)) if m else ''
        if year and year > PD_YEAR:
            continue
        title = re.sub(r'^File:|\.(jpe?g|png|tiff?)$', '', pg.get('title', ''), flags=re.I)
        title = re.sub(r'\s*\((MET|NGA|CMA|Google Art Project|by [^)]+)\)\s*', ' ', title).strip(' -_')
        artist = get('Artist')
        w, h = ii.get('width', 0), ii.get('height', 0)
        out.append({'id': 'wc-' + re.sub(r'[^a-z0-9]+', '-', title.lower())[:50], 'title': title, 'artist': artist, 'artist_key': akey(artist),
                    'year': year, 'era': ('Romantic (1780-1860)' if year and year < 1860 else 'Impressionist era (1860-1912)' if year and year < 1912 else 'Modern (1912-1950)' if year else ''),
                    'section': 'Landscape & Nature' if re.search(r'landscape|river|coast|sea|mountain|valley', title, re.I) else 'Unclassified & Other',
                    'orientation': 'Portrait' if h > w else 'Landscape', 'quiet_area': '', 'width': w, 'height': h,
                    'keywords': get('Categories').lower(), 'description': get('ImageDescription')[:200],
                    'image_url': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(pg['title'].split(':', 1)[1]),
                    'thumb_url': ii.get('thumburl', ''), 'page_url': ii.get('descriptionurl', ''), 'source': 'Wikimedia Commons',
                    'rights': get('LicenseShortName'), 'score': 60})
    return out


def fetch(url, dest, width=None):
    if 'Special:FilePath' in url and width:
        url += f'?width={width}'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)
    if os.path.getsize(dest) < 20000:
        raise Fail(f'download too small ({os.path.getsize(dest)} bytes): {url}')
    return dest


# ---------------------------------------------------------------- main
def main(argv):
    ap = argparse.ArgumentParser(prog='ath art')
    ap.add_argument('slug')
    ap.add_argument('--shortlist', type=int, default=15, help='candidates to write to 1-plan/art-shortlist.md')
    ap.add_argument('--commons', action='store_true', help='also search Wikimedia Commons live')
    ap.add_argument('--pick', action='store_true', help='choose cover + plates automatically into book.yaml')
    ap.add_argument('--cover', help='force this candidate id as the cover')
    ap.add_argument('--fetch', action='store_true', help='download the chosen images into 1-plan/art/')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    b.stage('1-plan')
    extra = []
    if a.commons:
        try:
            extra = commons_search(b.get('plan.art_subjects') or [], b.get('plan.movement') or 'landscape')
            b.log('art', f'Commons search returned {len(extra)} public-domain paintings')
        except Exception as e:
            b.log('art', f'Commons search failed ({e.__class__.__name__}: {e}); using the index only')
    scored, reasons = shortlist(b, a.shortlist, extra)
    if not scored:
        raise Fail(f'no candidates survive the rules ({reasons}); loosen the plan or add subjects')
    # the shortlist, for the overseer to read
    lines = [f'# Art shortlist — {b.meta.get("title")}', '',
             f'Subjects: {b.get("plan.art_subjects")}. Movement: {b.get("plan.movement")}. Avoid: {b.get("plan.art_avoid")}.',
             f'Rejected: {dict(sorted(reasons.items(), key=lambda kv: -kv[1]))}', '',
             '| # | score | painting | painter | year | section | source | why |', '|---|---|---|---|---|---|---|---|']
    for i, (s, why, r) in enumerate(scored[:a.shortlist], 1):
        lines.append(f'| {i} | {s:.0f} | [{r["title"]}]({r["page_url"]}) | {r["artist"]} | {r["year"]} | {r["section"]} | {r["source"]} | {why} |')
    lines += ['', 'To choose by hand: `ath art <slug> --pick --cover <id>` with the id from 1-plan/art-shortlist.json.']
    b.write('1-plan/art-shortlist.md', '\n'.join(lines) + '\n')
    b.write('1-plan/art-shortlist.json', json.dumps([dict(score=s, why=why, **row_public(r)) for s, why, r in scored[:a.shortlist * 2]], indent=1, ensure_ascii=False))
    b.log('art', f'shortlist of {min(a.shortlist, len(scored))} written; top: {scored[0][2]["title"]} — {scored[0][2]["artist"]}')
    if not (a.pick or a.cover):
        print('read 1-plan/art-shortlist.md; then `ath art <slug> --pick [--cover ID] --fetch`'); return 0
    if a.cover:
        idx = next((i for i, (_, _, r) in enumerate(scored) if r['id'] == a.cover), None)
        if idx is None:
            raise Fail(f'{a.cover} is not in the shortlist')
        scored.insert(0, scored.pop(idx))
    cover, plates = pick(b, scored, int(b.get('art.plates_wanted', 10)))
    b.meta['art']['cover'] = dict(row_public(cover[2]), why=cover[1])
    b.meta['art']['plates'] = [dict(row_public(r), why=why) for _, why, r in plates]
    b.save()
    b.log('art', f'cover: {cover[2]["title"]} — {cover[2]["artist"]} ({cover[1]}); {len(plates)} plates chosen')
    tracker.add(b, 'art', 'K', 'cover', '', f'{cover[2]["title"]} — {cover[2]["artist"]}', cover[1], 'applied', 'ath art')
    if a.fetch:
        d = b.stage('1-plan/art')
        cov = b.meta['art']['cover']
        cov['file'] = os.path.relpath(fetch(cov['image_url'], os.path.join(d, 'cover-source.jpg'), width=4000), b.dir)
        record_used(cov['title'], cov['artist'], b.slug, cov['source'])
        for i, p in enumerate(b.meta['art']['plates'], 1):
            try:
                p['file'] = os.path.relpath(fetch(p['image_url'], os.path.join(d, f'plate-{i:02d}-source.jpg'), width=2400), b.dir)
                record_used(p['title'], p['artist'], b.slug, p['source'])
            except Exception as e:
                p['error'] = str(e)
                b.log('art', f'plate {i} failed to download: {e}')
        b.save()
        b.log('art', 'images fetched and recorded in art/used.csv; next: `ath cover`')
    return 0
