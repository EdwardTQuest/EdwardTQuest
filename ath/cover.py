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
import argparse, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageStat, ImageOps
from .book import Book, ASSETS, EDITIONS, Fail

DPI = 300
BLEED = 0.125
TRIMS = {'deluxe': (5.0, 7.0), 'everyman': (4.25, 6.375), 'scholar': (5.0, 7.0)}
FINISH = {'deluxe': 'hardcover (case laminate)', 'everyman': 'paperback, matte', 'scholar': 'paperback, glossy'}
PAPER_IN = 0.0025            # cream paper, per page (KDP)
MAX_CROP = 0.12              # fraction of the painting that may be lost to a full-bleed crop
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
        mean, std = zone_luminance(im, top=(y_rule / H) - 0.06)
        if mean > 120 or std > 70:
            scrim = Image.new('L', (W, H), 0)
            sp = scrim.load()
            top = int(y_rule - H * 0.10); max_a = 160 if mean > 170 else 120
            for y in range(top, H):
                a = int(max_a * ((y - top) / (H - top)) ** 1.4)
                for x in range(W):
                    sp[x, y] = a
            im = Image.composite(Image.new('RGB', (W, H), GREEN_DEEP), im, scrim)
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
    d = ImageDraw.Draw(im)
    d.line([(W * 0.18, y_rule), (W * 0.82, y_rule)], fill=SAND, width=max(2, W // 700))
    tracked(d, series, sf, W / 2, y_series, SAND, W * 0.021 * 0.28)
    y = y_title_top
    for ln in lines:
        tracked(d, ln, tf, W / 2, y, colour, tpx * 0.04)
        y += int(tpx * 1.28)
    tracked(d, author.upper(), af, W / 2, y_author, colour, apx * 0.18)
    im.paste(hk, ((W - hk.width) // 2, y_hawk), hk)
    im.save(out, quality=92, dpi=(DPI, DPI))
    return mode


def back(b, edition, out):
    tw, th = TRIMS[edition]
    W, H = int((tw + 2 * BLEED) * DPI), int((th + 2 * BLEED) * DPI)
    bleed = int(BLEED * DPI)
    im = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(im)
    s = W / (5.25 * DPI)
    safe = bleed + int(0.3 * DPI * s)
    max_w = W - 2 * safe
    y = safe + int(0.25 * DPI * s)
    ef = font(CINZEL, W * 0.02)
    tracked(d, f'{edition.upper()} EDITION', ef, W / 2, y, SAND, W * 0.02 * 0.3)
    y += int(W * 0.075)
    blurb = (b.meta.get('blurb') or '').strip() or 'Back-cover text to come: write the blurb in 1-plan/plan.md and run `ath plan --sync`.'
    bf = font(GARA, W * 0.036)
    lh = int(W * 0.036 * 1.42)
    for para in blurb.split('\n\n'):
        for ln in wrap(d, para.strip(), bf, max_w):
            d.text((safe, y), ln, font=bf, fill=CREAM); y += lh
        y += lh // 2
    # credit line and the mark
    cov = b.get('art.cover') or {}
    cf = font(GARA_IT, W * 0.024)
    credit = f'Cover: {cov.get("title", "")}, {cov.get("artist", "")}{", " + str(cov["year"]) if cov.get("year") else ""}. {cov.get("source", "")}.' if cov.get('title') else ''
    barcode_w, barcode_h = int(2.0 * DPI), int(1.2 * DPI)     # KDP places its barcode here; keep it clear
    by = H - bleed - int(0.25 * DPI) - barcode_h
    for i, ln in enumerate(wrap(d, credit, cf, max_w - barcode_w - int(0.2 * DPI))):
        d.text((safe, by + i * int(W * 0.024 * 1.3)), ln, font=cf, fill=SAND)
    hk = hawk(int(W * 0.06))
    im.paste(hk, (safe, by - hk.height - int(W * 0.03)), hk)
    wf = font(CINZEL, W * 0.02)
    d.text((safe + hk.width + int(W * 0.02), by - hk.height // 2 - int(W * 0.03) - int(W * 0.012)), 'ATHANASIUS', font=wf, fill=SAND)
    im.save(out, quality=92, dpi=(DPI, DPI))
    return out


def spread(b, edition, front_jpg, back_jpg, pages, out, wrap_in=BLEED, paper=PAPER_IN):
    tw, th = TRIMS[edition]
    spine_in = round(pages * paper, 3)
    W = int((2 * tw + spine_in + 2 * wrap_in) * DPI)
    H = int((th + 2 * wrap_in) * DPI)
    im = Image.new('RGB', (W, H), GREEN)
    fr = Image.open(front_jpg).convert('RGB'); bk = Image.open(back_jpg).convert('RGB')
    # front/back were made with BLEED; re-fit to this wrap
    fw, fh = int((tw + 2 * wrap_in) * DPI), H
    fr = fr.resize((fw, fh), Image.LANCZOS); bk = bk.resize((fw, fh), Image.LANCZOS)
    im.paste(bk, (0, 0))
    im.paste(fr, (W - fw, 0))
    sx = int((wrap_in + tw) * DPI)
    sw = int(spine_in * DPI)
    d = ImageDraw.Draw(im)
    d.rectangle([sx, 0, sx + sw, H], fill=GREEN_DEEP)
    if spine_in >= 0.25:   # KDP: spine text needs ≥ 79 pages
        title = (b.meta.get('cover_title') or b.meta.get('title', '')).upper()
        author = b.meta.get('author', '').upper()
        band = Image.new('RGBA', (H - int(1.2 * DPI), sw), (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        tf = font(CINZEL_SB, min(sw * 0.5, band.width * 0.02))
        while bd.textlength(title + '      ' + author, font=tf) > band.width * 0.86 and tf.size > 12:
            tf = font(CINZEL_SB, tf.size - 2)
        tx = (band.width - bd.textlength(title + '      ' + author, font=tf)) / 2
        bd.text((tx, (sw - tf.size) / 2), title + '      ' + author, font=tf, fill=SAND)
        rot = band.rotate(-90, expand=True)
        im.paste(rot, (sx, int(0.6 * DPI)), rot)
        hk = hawk(int(sw * 0.55))
        im.paste(hk, (sx + (sw - hk.width) // 2, H - int(wrap_in * DPI) - int(0.35 * DPI) - hk.height), hk)
    im.save(out, 'PDF', resolution=DPI)
    return spine_in, W / DPI, H / DPI


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


def main(argv):
    ap = argparse.ArgumentParser(prog='ath cover')
    ap.add_argument('slug')
    ap.add_argument('--painting', help='use this image file instead of art.cover.file')
    ap.add_argument('--wrap', type=float, default=None, help='wrap allowance in inches for spreads (0.125 paperback bleed; 0.591 for a case-laminate template)')
    a = ap.parse_args(argv)
    b = Book(a.slug)
    src = a.painting or (b.get('art.cover.file') and b.path(b.get('art.cover.file')))
    if not src or not os.path.exists(src):
        raise Fail('no cover painting: run `ath art <slug> --pick --fetch`, or pass --painting FILE')
    painting = ImageOps.exif_transpose(Image.open(src).convert('RGB'))
    b.stage('1-plan')
    modes = {}
    fronts = []
    for e in b.get('editions', EDITIONS):
        f = b.path('1-plan', f'cover-front-{e}.jpg')
        modes[e] = front(b, painting, e, f)
        back(b, e, b.path('1-plan', f'cover-back-{e}.jpg'))
        fronts.append(f)
        pages = b.get(f'status.typeset.{e}.pages')
        if pages:
            wrap_in = a.wrap if a.wrap is not None else (0.591 if e == 'deluxe' else BLEED)
            sp, w_in, h_in = spread(b, e, f, b.path('1-plan', f'cover-back-{e}.jpg'), pages, b.path('1-plan', f'cover-spread-{e}.pdf'), wrap_in=wrap_in)
            b.log('cover', f'{e}: spread {w_in:.3f} × {h_in:.3f} in, spine {sp} in for {pages} pages, wrap {wrap_in} in ({FINISH[e]})')
        else:
            b.log('cover', f'{e}: front and back only (no page count yet — typeset first, then run `ath cover` again for the spread)')
    front(b, painting, 'deluxe', b.path('1-plan', 'cover-epub.jpg'), epub=True)
    site = Image.open(b.path('1-plan', 'cover-front-deluxe.jpg'))
    bl = int(BLEED * DPI)
    site = site.crop((bl, bl, site.width - bl, site.height - bl))
    site.resize((900, int(900 * site.height / site.width)), Image.LANCZOS).save(b.path('1-plan', 'cover-site.jpg'), quality=82)
    site.resize((320, int(320 * site.height / site.width)), Image.LANCZOS).save(b.path('1-plan', 'cover-thumb.jpg'), quality=80)
    # contact sheet
    ims = [Image.open(f).convert('RGB') for f in fronts]
    h = 900
    tiles = [im.resize((int(h * im.width / im.height), h), Image.LANCZOS) for im in ims]
    sheet = Image.new('RGB', (sum(t.width for t in tiles) + 20 * (len(tiles) + 1), h + 40), (60, 60, 60))
    x = 20
    for t in tiles:
        sheet.paste(t, (x, 20)); x += t.width + 20
    sheet.save(b.path('1-plan', 'cover-contact.jpg'), quality=85)
    done = plates(b)
    b.set_status('cover', 'done', layout=modes, plates=len(done))
    b.log('cover', f'fronts {modes}; epub + site covers; {len(done)} plates prepared (print {b.get("art.plate_mode")}, epub colour). Look at 1-plan/cover-contact.jpg.')
    print('ok — look at 1-plan/cover-contact.jpg')
    return 0
