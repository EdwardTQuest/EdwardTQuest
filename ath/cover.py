"""ath cover <slug> — jackets from the chosen painting, in the house manner, for every edition.

    1-plan/cover-front-<edition>.jpg     trim + bleed at 300 dpi
    1-plan/cover-back-<edition>.jpg      blurb on the house green; KDP barcode zone left clear
    1-plan/cover-spread-<edition>.pdf    back + spine + front, sized from the page count (paperback wrap)
    1-plan/cover-epub.jpg                1600 × 2560, no bleed
    1-plan/cover-site.jpg (+thumb)       900 px and 320 px for athanasius.online
    1-plan/plates/print/NN.jpg           grayscale, for the interiors;  plates/epub/NN.jpg  colour
    1-plan/cover-contact.jpg             every front cover side by side, to look at

The whole painting, not a detail. If the painting fits the trim within a small crop it runs full
bleed; otherwise it is shown entire as a plate on the house green. No zoom, no "hidden detail".
"""
import argparse, os, math, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageStat, ImageOps
from .book import Book, ASSETS, EDITIONS, Fail
from . import print_spec as P
from . import gates

DPI = P.DPI
BLEED = P.BLEED
TRIMS = P.TRIMS
FINISH = P.FINISH
MAX_CROP = 0.12              # fraction of the painting that may be lost to a full-bleed crop
MIN_CONTRAST = 3.0           # WCAG-style contrast of the type against the picture under it; below this, plate layout
MIN_SHORT_SIDE = 1800        # px; a cover source below this prints soft at 300 dpi
BLURB_FLOOR = 0.80           # the blurb may shrink to this fraction of the house size before it is a finding
GREEN = (10, 36, 22)         # --green-panel
GREEN_DEEP = (5, 19, 12)
SAND = (201, 174, 124)
SAND_LT = (232, 211, 160)
PAPER = (237, 227, 206)
CREAM = (244, 241, 237)

F = lambda name: os.path.join(ASSETS, 'fonts', name)
CINZEL, CINZEL_SB, CORM_IT, GARA, GARA_IT = 'Cinzel-Regular.ttf', 'Cinzel-SemiBold.ttf', 'CormorantGaramond-Italic.ttf', 'EBGaramond-Regular.ttf', 'EBGaramond-Italic.ttf'


def font(name, px):
    return ImageFont.truetype(F(name), max(8, int(px)))


def tracked(d, text, fnt, x_center, y, fill, tracking):
    widths = [d.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = x_center - total / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=fnt, fill=fill)
        x += w + tracking
    return total


def fit_size(d, text, name, max_w, start, tracking_em=0.0, min_px=20):
    px = int(start)
    while px > min_px:
        fnt = font(name, px)
        w = sum(d.textlength(ch, font=fnt) for ch in text) + px * tracking_em * (len(text) - 1)
        if w <= max_w:
            return fnt, px
        px -= 2
    return font(name, min_px), min_px


def wrap(d, text, fnt, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def hawk(width, colour=SAND):
    im = Image.open(os.path.join(ASSETS, 'hawk', 'athanasius-hawk-mark-one-color.png')).convert('RGBA')
    alpha = im.split()[3]
    tint = Image.new('RGBA', im.size, colour + (255,))
    tint.putalpha(alpha)
    h = int(width * im.height / im.width)
    return tint.resize((width, h), Image.LANCZOS)


def _lum(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(fg, bg):
    """WCAG contrast ratio between a type colour and a background colour."""
    a, b = _lum(fg), _lum(bg)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


def zone_contrast(img, box, fg):
    """Contrast of `fg` type against the picture inside `box`: the worst of the mean and the
    brightest-quarter colour, so a bright patch behind a word counts."""
    z = img.crop(box).convert('RGB')
    small = z.resize((max(1, z.width // 8), max(1, z.height // 8)))
    px = list(small.getdata())
    mean = tuple(sum(c[i] for c in px) // len(px) for i in range(3))
    bright = sorted(px, key=lambda c: _lum(c))[-max(1, len(px) // 4):]
    bmean = tuple(sum(c[i] for c in bright) // len(bright) for i in range(3))
    return min(contrast(fg, mean), contrast(fg, bmean)), mean


def crop_loss(src, target_ar):
    ar = src.width / src.height
    return 1 - min(ar, target_ar) / max(ar, target_ar)


def zone_luminance(img, top=0.58):
    z = img.crop((0, int(img.height * top), img.width, img.height)).convert('L')
    st = ImageStat.Stat(z)
    return st.mean[0], st.stddev[0]


def full_bleed(src, W, H):
    """Crop at most MAX_CROP of the picture; centred, biased a little upward for tall pictures."""
    ar_t = W / H
    if src.width / src.height > ar_t:
        nw = int(src.height * ar_t); x = (src.width - nw) // 2
        box = (x, 0, x + nw, src.height)
    else:
        nh = int(src.width / ar_t); y = int((src.height - nh) * 0.42)
        box = (0, y, src.width, y + nh)
    return src.crop(box).resize((W, H), Image.LANCZOS)


def title_lines(title, max_chars=26):
    """Split a long title into two lines at the best break."""
    if len(title) <= max_chars:
        return [title]
    words = title.split()
    best, bi = None, None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        score = abs(len(a) - len(b))
        if best is None or score < best:
            best, bi = score, i
    return [' '.join(words[:bi]), ' '.join(words[bi:])]


def front(b, painting, edition, out, epub=False):
    """The text block is laid out from the foot upward (hawk, author, title, series, rule), so
    nothing can collide; the painting takes the rest: full bleed if the crop is small, else the
    whole picture on the house green above the text."""
    tw, th = TRIMS[edition]
    if epub:
        W, H = 1600, 2560
        bleed = 0
    else:
        W, H = int((tw + 2 * BLEED) * DPI), int((th + 2 * BLEED) * DPI)
        bleed = int(BLEED * DPI)
    s = W / (5.25 * DPI)
    title = b.meta.get('cover_title') or b.meta.get('title', '')
    author = b.meta.get('author', '')
    series = (b.meta.get('series') or 'The Athanasius Library').upper()
    loss = crop_loss(painting, tw / th)
    mode = 'full' if loss <= MAX_CROP else 'plate'
    why = f'crop {loss * 100:.0f}% ' + ('≤ 12%: full bleed' if mode == 'full' else '> 12%: plate on the green')
    meas = {'crop_loss': round(loss, 3), 'source_px': list(painting.size)}
    safe = bleed + int(0.28 * DPI * s)
    max_w = W - 2 * safe
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    # measure the text block
    lines = title_lines(title.upper())
    tf, tpx = fit_size(probe, max(lines, key=len), CINZEL_SB, max_w, W * 0.085, tracking_em=0.04)
    af, apx = fit_size(probe, author.upper(), CINZEL, max_w * 0.8, W * 0.032, tracking_em=0.18)
    sf = font(CINZEL, W * 0.021)
    hk = hawk(int(W * 0.075))
    gap = int(W * 0.022)
    y_hawk = int(H - safe - hk.height)
    y_author = int(y_hawk - int(W * 0.045) - apx)
    y_title_top = int(y_author - gap - int(tpx * 1.28) * len(lines) + int(tpx * 0.28))
    y_series = int(y_title_top - gap - int(W * 0.021))
    y_rule = int(y_series - int(W * 0.03))
    if mode == 'full':
        im = full_bleed(painting, W, H).convert('RGB')
        text_box = (safe, y_rule - int(H * 0.02), W - safe, y_hawk)
        c0, bg0 = zone_contrast(im, text_box, CREAM)
        meas['contrast_raw'] = round(c0, 2)
        if c0 < MIN_CONTRAST * 1.5:
            # a soft fade to the house green, only as strong as the picture needs
            scrim = Image.new('L', (W, H), 0)
            sp = scrim.load()
            top = int(y_rule - H * 0.12); max_a = 170 if c0 < MIN_CONTRAST else 120
            for y in range(top, H):
                a = int(max_a * ((y - top) / (H - top)) ** 1.4)
                for x in range(W):
                    sp[x, y] = a
            im = Image.composite(Image.new('RGB', (W, H), GREEN_DEEP), im, scrim)
            meas['scrim'] = max_a
        c1, bg1 = zone_contrast(im, text_box, CREAM)
        meas['contrast'] = round(c1, 2)
        if c1 < MIN_CONTRAST:
            # the picture will not carry type legibly even with the fade: show it whole instead
            mode = 'plate'; why += f'; contrast {c1:.1f} < {MIN_CONTRAST}: plate layout instead'
    if mode == 'full':
        colour = CREAM
    else:
        im = Image.new('RGB', (W, H), GREEN)
        margin = bleed + int(0.42 * DPI * s)
        top = bleed + int(0.5 * DPI * s)
        box_w, box_h = W - 2 * margin, y_rule - int(0.3 * DPI * s) - top
        scale = min(box_w / painting.width, box_h / painting.height)
        pw, ph = int(painting.width * scale), int(painting.height * scale)
        px, py = (W - pw) // 2, top + (box_h - ph) // 2
        d0 = ImageDraw.Draw(im)
        d0.rectangle([px - 6, py - 6, px + pw + 6, py + ph + 6], outline=SAND, width=3)
        im.paste(painting.resize((pw, ph), Image.LANCZOS), (px, py))
        colour = SAND_LT
        meas['contrast'] = round(contrast(SAND_LT, GREEN), 2)
    meas['mode'] = mode; meas['why'] = why
    d = ImageDraw.Draw(im)
    d.line([(W * 0.18, y_rule), (W * 0.82, y_rule)], fill=SAND, width=max(2, W // 700))
    tracked(d, series, sf, W / 2, y_series, SAND, W * 0.021 * 0.28)
    y = y_title_top
    for ln in lines:
        tracked(d, ln, tf, W / 2, y, colour, tpx * 0.04)
        y += int(tpx * 1.28)
    tracked(d, author.upper(), af, W / 2, y_author, colour, apx * 0.18)
    im.paste(hk, ((W - hk.width) // 2, y_hawk), hk)
    meas['title_px'] = tpx; meas['title_lines'] = len(lines)
    im.save(out, quality=92, dpi=(DPI, DPI))
    return meas


def back(b, edition, out):
    tw, th = TRIMS[edition]
    W, H = int((tw + 2 * BLEED) * DPI), int((th + 2 * BLEED) * DPI)
    bleed = int(BLEED * DPI)
    im = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(im)
    s = W / (5.25 * DPI)
    safe = bleed + int(0.3 * DPI * s)
    max_w = W - 2 * safe
    y0 = safe + int(0.25 * DPI * s)
    ef = font(CINZEL, W * 0.02)
    tracked(d, f'{edition.upper()} EDITION', ef, W / 2, y0, SAND, W * 0.02 * 0.3)
    y0 += int(W * 0.075)
    blurb = (b.meta.get('blurb') or '').strip() or 'Back-cover text to come: write the blurb in 1-plan/plan.md and run `ath plan --sync`.'
    barcode_w, barcode_h = int(2.0 * DPI), int(1.2 * DPI)     # the printer places its barcode here; keep it clear
    by = H - bleed - int(0.25 * DPI) - barcode_h
    credit_h = int(W * 0.024 * 1.3) * 2
    limit = by - int(W * 0.06) - credit_h - int(W * 0.06)
    # the blurb at the house size, shrinking only as far as the floor
    house_px = W * 0.036
    px = house_px
    while True:
        bf = font(GARA, px); lh = int(px * 1.42)
        y = y0; lines_all = []
        for para in blurb.split('\n\n'):
            ls = wrap(d, para.strip(), bf, max_w); lines_all.append(ls); y += lh * len(ls) + lh // 2
        if y <= limit or px <= house_px * BLURB_FLOOR:
            break
        px -= 1
    fit = round(px / house_px, 2)
    y = y0
    for ls in lines_all:
        for ln in ls:
            d.text((safe, y), ln, font=bf, fill=CREAM); y += lh
        y += lh // 2
    overflow = y > limit
    cov = b.get('art.cover') or {}
    cf = font(GARA_IT, W * 0.024)
    credit = f'Cover: {cov.get("title", "")}, {cov.get("artist", "")}{", " + str(cov["year"]) if cov.get("year") else ""}. {cov.get("source", "")}.' if cov.get('title') else ''
    for i, ln in enumerate(wrap(d, credit, cf, max_w - barcode_w - int(0.2 * DPI))):
        d.text((safe, by + i * int(W * 0.024 * 1.3)), ln, font=cf, fill=SAND)
    hk = hawk(int(W * 0.06))
    im.paste(hk, (safe, by - hk.height - int(W * 0.03)), hk)
    wf = font(CINZEL, W * 0.02)
    d.text((safe + hk.width + int(W * 0.02), by - hk.height // 2 - int(W * 0.03) - int(W * 0.012)), 'ATHANASIUS', font=wf, fill=SAND)
    im.save(out, quality=92, dpi=(DPI, DPI))
    return {'blurb_words': len(blurb.split()), 'blurb_fit': fit, 'blurb_overflow': overflow}


def spread(b, edition, front_jpg, back_jpg, pages, out, spine_override=None, paper='cream'):
    g = P.spread(edition, pages, paper, spine_override)
    W, H = int(g['w'] * DPI), int(g['h'] * DPI)
    im = Image.new('RGB', (W, H), GREEN)
    fr = Image.open(front_jpg).convert('RGB'); bk = Image.open(back_jpg).convert('RGB')
    # the panels were made with the paperback bleed; scale them to this binding's panel, keeping the trim area exact
    tw, th = TRIMS[edition]
    def panel(src, x_from, x_to):
        pw = int((x_to - x_from) * DPI)
        # scale so that the trim height maps onto the trim height: src has BLEED around the trim
        scale = (th + 2 * g['bleed']) / (th + 2 * BLEED)
        sw, sh = int(src.width * scale), int(src.height * scale)
        img = src.resize((sw, sh), Image.LANCZOS)
        # centre vertically on the file; horizontally align the trim edge to the spine side
        return img, pw
    fimg, fw = panel(fr, *g['front'])
    bimg, bw = panel(bk, *g['back'])
    yoff = (H - fimg.height) // 2
    # front: its left edge sits at the front panel's left (spine/hinge side); crop to panel width
    im.paste(fimg.crop((max(0, fimg.width - fw), 0, fimg.width, fimg.height)) if fimg.width > fw else fimg, (int(g['front'][0] * DPI), yoff))
    im.paste(bimg.crop((0, 0, min(bw, bimg.width), bimg.height)), (0, yoff))
    sx0, sx1 = int(g['spine_x'][0] * DPI), int(g['spine_x'][1] * DPI)
    d = ImageDraw.Draw(im)
    if 'hinges' in g:
        for hx0, hx1 in g['hinges']:
            d.rectangle([int(hx0 * DPI), 0, int(hx1 * DPI), H], fill=GREEN)
    d.rectangle([sx0, 0, sx1, H], fill=GREEN_DEEP)
    sw = sx1 - sx0
    if g['spine'] >= P.SPINE_TEXT_MIN:
        title = (b.meta.get('cover_title') or b.meta.get('title', '')).upper()
        author = b.meta.get('author', '').upper()
        band = Image.new('RGBA', (H - int(1.4 * DPI), sw), (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        tf = font(CINZEL_SB, min(sw * 0.5, band.width * 0.02))
        while bd.textlength(title + '      ' + author, font=tf) > band.width * 0.86 and tf.size > 12:
            tf = font(CINZEL_SB, tf.size - 2)
        tx = (band.width - bd.textlength(title + '      ' + author, font=tf)) / 2
        bd.text((tx, (sw - tf.size) / 2), title + '      ' + author, font=tf, fill=SAND)
        rot = band.rotate(-90, expand=True)
        im.paste(rot, (sx0, int(0.7 * DPI)), rot)
        hk = hawk(int(sw * 0.55))
        im.paste(hk, (sx0 + (sw - hk.width) // 2, H - int(g['trim_top'] * DPI) - int(0.35 * DPI) - hk.height), hk)
    im.save(out, 'PDF', resolution=DPI)
    g['spine_text'] = g['spine'] >= P.SPINE_TEXT_MIN
    return g


def plates(b):
    outp = b.stage('1-plan/plates/print'); oute = b.stage('1-plan/plates/epub')
    mode = b.get('art.plate_mode', 'grayscale')
    done = []
    for i, p in enumerate(b.get('art.plates', []), 1):
        if not p.get('file') or not os.path.exists(b.path(p['file'])):
            continue
        im = Image.open(b.path(p['file'])).convert('RGB')
        im = ImageOps.exif_transpose(im)
        pr = im.copy(); pr.thumbnail((1800, 1800), Image.LANCZOS)
        if mode == 'grayscale':
            pr = ImageOps.autocontrast(pr.convert('L'), cutoff=0.5)
        pr.save(os.path.join(outp, f'{i:02d}.jpg'), quality=90, dpi=(DPI, DPI))
        ep = im.copy(); ep.thumbnail((1600, 1600), Image.LANCZOS)
        ep.save(os.path.join(oute, f'{i:02d}.jpg'), quality=85)
        p['print'] = f'1-plan/plates/print/{i:02d}.jpg'; p['epub'] = f'1-plan/plates/epub/{i:02d}.jpg'
        done.append(i)
    b.save()
    return done


def cover_report(b, meas, backs, spreads, cands):
    cov = b.get('art.cover') or {}
    L = [f'# Cover report — {b.meta.get("title")}', '',
         f'Painting: **{cov.get("title","?")}** — {cov.get("artist","?")}{", " + str(cov["year"]) if cov.get("year") else ""} ({cov.get("source","")}). Source {meas.get("deluxe", {}).get("source_px")} px.', '',
         '## Measurements (what the decision rests on)', '', '| edition | layout | why | crop | contrast (type over picture) | scrim | title px / lines |', '|---|---|---|---|---|---|---|']
    for e, m in meas.items():
        L.append(f'| {e} | {m.get("mode")} | {m.get("why")} | {m.get("crop_loss", 0) * 100:.0f}% | {m.get("contrast")} (raw {m.get("contrast_raw", "—")}; floor {MIN_CONTRAST}) | {m.get("scrim", "none")} | {m.get("title_px")} / {m.get("title_lines")} |')
    L += ['', '| edition | blurb words | blurb size vs house | overflow |', '|---|---|---|---|']
    for e, bk in backs.items():
        L.append(f'| {e} | {bk["blurb_words"]} | {bk["blurb_fit"]} | {"YES — shorten the blurb" if bk["blurb_overflow"] else "no"} |')
    L += ['', '| edition | binding | file w × h (in) | spine (in) | spine text | note |', '|---|---|---|---|---|---|']
    for e, g in spreads.items():
        L.append(f'| {e} | {g["binding"]} | {g["w"]:.3f} × {g["h"]:.3f} | {g["spine"]} | {"yes" if g["spine_text"] else "no (too thin)"} | {g.get("note", "")} |')
    ss = min(cov.get('width') or 0, cov.get('height') or 0) if cov.get('width') else None
    L += ['', '## Automatic findings', '']
    f = []
    if meas.get('deluxe', {}).get('source_px') and min(meas['deluxe']['source_px']) < MIN_SHORT_SIDE:
        f.append(f'- source image short side {min(meas["deluxe"]["source_px"])} px < {MIN_SHORT_SIDE}: will print soft; fetch a larger file or choose another painting')
    for e, m in meas.items():
        if m.get('mode') == 'full' and m.get('contrast', 9) < MIN_CONTRAST * 1.2:
            f.append(f'- {e}: contrast {m.get("contrast")} is close to the floor; look at the title at thumbnail size')
    for e, bk in backs.items():
        if bk['blurb_overflow']:
            f.append(f'- {e}: the blurb does not fit even at {int(BLURB_FLOOR * 100)}% of the house size ({bk["blurb_words"]} words); cut it')
        elif bk['blurb_fit'] < 1:
            f.append(f'- {e}: blurb shrunk to {int(bk["blurb_fit"] * 100)}% to fit; {bk["blurb_words"]} words — consider cutting to 130')
    if not (b.meta.get('blurb') or '').strip():
        f.append('- no blurb yet (plan.md → ath plan --sync)')
    else:
        nw = len(b.meta['blurb'].split())
        if not 110 <= nw <= 150:
            f.append(f'- blurb is {nw} words; the house asks 110–150')
    L += f or ['- none']
    if cands:
        L += ['', '## Candidates rendered (1-plan/candidates/)', ''] + [f'- {c}' for c in cands]
    L += ['', '## Questions for the cover gate (GATES.md)', '',
          '1. Is the whole painting shown, and is the subject intact on every front?',
          '2. At thumbnail size (cover-thumb.jpg), can you read the title in under a second?',
          '3. Does the picture suit the book — period, place, mood — and would the author not be embarrassed by it?',
          '4. Does the back read well aloud, and is the credit line exactly what the museum page says?',
          '5. Do the three fronts read as one family, and the spine as this book on a shelf?']
    return '\n'.join(L) + '\n'


def main(argv):
    ap = argparse.ArgumentParser(prog='ath cover')
    ap.add_argument('slug')
    ap.add_argument('--painting', help='use this image file instead of art.cover.file')
    ap.add_argument('--spine', type=float, default=None, help='hardcover spine width from the printer\'s template, inches')
    ap.add_argument('--paper', default='cream', choices=['cream', 'white'])
    ap.add_argument('--candidates', type=int, default=0, help='also render Deluxe fronts for the first N fetched shortlist candidates (1-plan/art/candidate-*.jpg)')
    ap.add_argument('--force', action='store_true', help='run without the art gate passed (logged)')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    gates.require(b, 'cover', a.force)
    src = a.painting or (b.get('art.cover.file') and b.path(b.get('art.cover.file')))
    if not src or not os.path.exists(src):
        raise Fail('no cover painting: run `ath art <slug> --pick --fetch`, or pass --painting FILE')
    painting = ImageOps.exif_transpose(Image.open(src).convert('RGB'))
    b.stage('1-plan')
    meas, backs, spreads = {}, {}, {}
    fronts = []
    for e in b.get('editions', EDITIONS):
        f = b.path('1-plan', f'cover-front-{e}.jpg')
        meas[e] = front(b, painting, e, f)
        backs[e] = back(b, e, b.path('1-plan', f'cover-back-{e}.jpg'))
        fronts.append(f)
        pages = b.get(f'status.typeset.{e}.pages')
        if pages:
            g = spread(b, e, f, b.path('1-plan', f'cover-back-{e}.jpg'), pages, b.path('1-plan', f'cover-spread-{e}.pdf'), a.spine if e == 'deluxe' else None, a.paper)
            spreads[e] = g
            b.log('cover', f'{e}: {g["binding"]} spread {g["w"]:.3f} × {g["h"]:.3f} in, spine {g["spine"]} in for {pages} pages ({FINISH[e]}){"; " + g["note"] if g.get("note") else ""}')
        else:
            b.log('cover', f'{e}: front and back only (no page count yet — typeset first, then run `ath cover` again for the spread)')
    front(b, painting, 'deluxe', b.path('1-plan', 'cover-epub.jpg'), epub=True)
    site = Image.open(b.path('1-plan', 'cover-front-deluxe.jpg'))
    bl = int(BLEED * DPI)
    site = site.crop((bl, bl, site.width - bl, site.height - bl))
    site.resize((900, int(900 * site.height / site.width)), Image.LANCZOS).save(b.path('1-plan', 'cover-site.jpg'), quality=82)
    site.resize((320, int(320 * site.height / site.width)), Image.LANCZOS).save(b.path('1-plan', 'cover-thumb.jpg'), quality=80)
    # candidates: the same front, for the other fetched shortlist pictures, so the choice is seen not read
    cands = []
    if a.candidates:
        cd = b.stage('1-plan/candidates')
        for i in range(1, a.candidates + 1):
            cp = b.path('1-plan', 'art', f'candidate-{i:02d}.jpg')
            if os.path.exists(cp):
                m = front(b, ImageOps.exif_transpose(Image.open(cp).convert('RGB')), 'deluxe', os.path.join(cd, f'candidate-{i:02d}.jpg'))
                cands.append(f'candidate-{i:02d}.jpg — {m["mode"]}, contrast {m.get("contrast")}')
        fronts += [os.path.join(cd, f) for f in sorted(os.listdir(cd))]
    # contact sheet of every front (and candidates)
    ims = [Image.open(f).convert('RGB') for f in fronts]
    h = 900
    tiles = [im.resize((int(h * im.width / im.height), h), Image.LANCZOS) for im in ims]
    sheet = Image.new('RGB', (sum(t.width for t in tiles) + 20 * (len(tiles) + 1), h + 40), (60, 60, 60))
    x = 20
    for t in tiles:
        sheet.paste(t, (x, 20)); x += t.width + 20
    sheet.save(b.path('1-plan', 'cover-contact.jpg'), quality=85)
    done = plates(b)
    b.write('1-plan/cover-report.md', cover_report(b, meas, backs, spreads, cands))
    b.set_status('cover', 'done', layout={e: m['mode'] for e, m in meas.items()}, legibility={e: m.get('contrast') for e, m in meas.items()},
                 blurb_fit=min(bk['blurb_fit'] for bk in backs.values()), plates=len(done))
    lay = ', '.join(f"{e}: {m['mode']}" for e, m in meas.items())
    con = ', '.join(f"{e}: {m.get('contrast')}" for e, m in meas.items())
    b.log('cover', f'layouts {{ {lay} }}; contrast {{ {con} }}; {len(done)} plates. Read 1-plan/cover-report.md, look at cover-contact.jpg, then decide the cover gate.')
    print('ok — 1-plan/cover-report.md and cover-contact.jpg; then `ath gate <slug> cover pass|fail --note "…"`')
    return 0
