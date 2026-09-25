"""The publication-page signature: 'Athanasius' in green pen, framed by the edition word.

No ISBN block. In its place a box whose border is the edition word repeated
(deluxedeluxedeluxe…) and whose field carries a handwritten 'Athanasius' in green ink, after
the manner of St. Josemaría's hand: a fluid, right-slanted Spanish school cursive of the early
twentieth century, tall narrow loops on the ascenders, a fountain pen's weight that swells on the
downstrokes, and the long underline paraph that runs from under the first letter past the last
and turns back in a small loop. Rendered by Pillow at 600 dpi. Font in book.yaml
(typeset.signature_font); `ath signature --samples` renders every candidate for comparison
against the autographs on theologicalforum.org and escriva.org.
"""
import argparse, math, os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from .book import ASSETS, EDITIONS

FONTS = {
    'La Belle Aurore': 'LaBelleAurore.ttf',
    'Mr De Haviland': 'MrDeHaviland-Regular.ttf',
    'Herr Von Muellerhoff': 'HerrVonMuellerhoff-Regular.ttf',
    'Dawning of a New Day': 'DawningofaNewDay.ttf',
    'Nothing You Could Do': 'NothingYouCouldDo.ttf',
    'Cedarville Cursive': 'Cedarville-Cursive.ttf',
    'Zeyada': 'Zeyada.ttf',
}
# per-font tuning: extra slant (shear), weight passes, size factor — chosen by eye against his hand
TUNE = {
    'La Belle Aurore': dict(shear=0.14, weight=4, size=0.40),
    'Mr De Haviland': dict(shear=0.06, weight=3, size=0.44),
    'Herr Von Muellerhoff': dict(shear=0.04, weight=3, size=0.46),
    'Dawning of a New Day': dict(shear=0.12, weight=3, size=0.40),
    'Nothing You Could Do': dict(shear=0.16, weight=3, size=0.36),
    'Cedarville Cursive': dict(shear=0.14, weight=3, size=0.36),
    'Zeyada': dict(shear=0.12, weight=3, size=0.40),
}
INK = (22, 104, 58)          # a real green fountain-pen ink
FRAME_INK = (128, 116, 88)   # sand-grey, recedes behind the signature
CLEAR = (0, 0, 0, 0)


def _bezier(p0, p1, p2, p3, n=120):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
        y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def _stroke(draw, pts, width_fn, fill):
    for j in range(len(pts) - 1):
        w = max(1, int(width_fn(j / max(1, len(pts) - 1))))
        draw.line([pts[j], pts[j + 1]], fill=fill, width=w)
        draw.ellipse([pts[j][0] - w / 2, pts[j][1] - w / 2, pts[j][0] + w / 2, pts[j][1] + w / 2], fill=fill)


def render(word='deluxe', font_name='La Belle Aurore', out='signature-deluxe.png',
           width_in=2.2, height_in=1.05, dpi=600, seed=7):
    W, H = int(width_in * dpi), int(height_in * dpi)
    im = Image.new('RGBA', (W, H), CLEAR)
    d = ImageDraw.Draw(im)
    tune = TUNE.get(font_name, dict(shear=0.1, weight=3, size=0.4))
    frame_font = ImageFont.truetype(os.path.join(ASSETS, 'fonts', 'EBGaramond-Regular.ttf'), int(dpi * 0.052))
    band = int(dpi * 0.075)

    def strip(length):
        s = word * 200
        while d.textlength(s, font=frame_font) > length:
            s = s[:-1]
        return s

    inner_w, inner_h = W - 2 * band, H - 2 * band
    d.text((band, 2), strip(inner_w), font=frame_font, fill=FRAME_INK)
    d.text((band, H - band + 2), strip(inner_w), font=frame_font, fill=FRAME_INK)
    side = Image.new('RGBA', (inner_h, band), CLEAR)
    ImageDraw.Draw(side).text((0, 2), strip(inner_h), font=frame_font, fill=FRAME_INK)
    im.paste(side.rotate(90, expand=True), (2, band), side.rotate(90, expand=True))
    im.paste(side.rotate(-90, expand=True), (W - band + 2, band), side.rotate(-90, expand=True))
    d.rectangle([band - 4, band - 4, W - band + 4, H - band + 4], outline=FRAME_INK + (110,), width=2)

    # the name, on its own layer so it can be sheared to his slant
    rnd = random.Random(seed)
    size = int(dpi * tune['size'])
    f = ImageFont.truetype(os.path.join(ASSETS, 'fonts', FONTS[font_name]), size)
    layer = Image.new('RGBA', (W, H), CLEAR)
    ld = ImageDraw.Draw(layer)
    tw = ld.textlength('Athanasius', font=f)
    while tw > inner_w * 0.80:
        size = int(size * 0.94); f = ImageFont.truetype(os.path.join(ASSETS, 'fonts', FONTS[font_name]), size); tw = ld.textlength('Athanasius', font=f)
    bbox = f.getbbox('Athanasius')
    x = (W - tw) / 2 - dpi * 0.02
    y = (H - (bbox[3] - bbox[1])) / 2 - bbox[1] - dpi * 0.045
    # pen weight: several passes, the downstrokes heavier by offsetting vertically more than horizontally
    offs = [(0, 0)] + [(rnd.uniform(-1, 1) * dpi * 0.0012, rnd.uniform(0, 1) * dpi * 0.0028) for _ in range(tune['weight'])]
    for dx, dy in offs:
        ld.text((x + dx, y + dy), 'Athanasius', font=f, fill=INK + (215,))
    # the paraph: from under the A, dipping and rising past the s, then a small returning loop
    base = y + bbox[3] + dpi * 0.03
    x0, x1 = x + tw * 0.05, x + tw * 1.02
    pts = _bezier((x0, base - dpi * 0.01), (x0 + tw * 0.3, base + dpi * 0.045), (x1 - tw * 0.25, base - dpi * 0.03), (x1, base - dpi * 0.005))
    loop = _bezier((x1, base - dpi * 0.005), (x1 + dpi * 0.05, base - dpi * 0.045), (x1 - dpi * 0.03, base - dpi * 0.07), (x1 - dpi * 0.06, base - dpi * 0.035))
    _stroke(ld, pts, lambda t: dpi * 0.0075 * (0.7 + 0.6 * math.sin(t * math.pi)), INK + (215,))
    _stroke(ld, loop, lambda t: dpi * 0.0075 * (0.9 - 0.6 * t), INK + (200,))
    # shear for the slant, then a whisper of blur for the wet edge
    sh = tune['shear']
    layer = layer.transform(layer.size, Image.AFFINE, (1, sh, -sh * H / 2, 0, 1, 0), resample=Image.BICUBIC)
    layer = layer.filter(ImageFilter.GaussianBlur(dpi * 0.0011))
    im.alpha_composite(layer)
    im.save(out, dpi=(dpi, dpi))
    return out


def samples(out='signature-samples.png'):
    tiles = []
    for i, name in enumerate(FONTS):
        word = EDITIONS[i % 3]
        p = f'/tmp/_sig_{i}.png'
        render(word, name, p, dpi=300)
        t = Image.open(p).convert('RGBA')
        card = Image.new('RGB', (t.width + 40, t.height + 70), (250, 247, 240))
        card.paste(t, (20, 20), t)
        ImageDraw.Draw(card).text((card.width / 2, t.height + 40), f'{i + 1}. {name}  —  “{word}”',
                                  font=ImageFont.truetype(os.path.join(ASSETS, 'fonts', 'EBGaramond-Italic.ttf'), 22),
                                  fill=(80, 80, 80), anchor='mm')
        tiles.append(card)
    cols = 2
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new('RGB', (cols * tiles[0].width, rows * tiles[0].height), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * t.width, (i // cols) * t.height))
    sheet.save(out)
    return out


def main(argv):
    ap = argparse.ArgumentParser(prog='ath signature')
    ap.add_argument('--samples', action='store_true')
    ap.add_argument('--font', default='La Belle Aurore', choices=list(FONTS))
    ap.add_argument('--out', default='.')
    a = ap.parse_args(argv)
    if a.samples:
        print(samples(os.path.join(a.out, 'signature-samples.png'))); return 0
    for e in EDITIONS:
        print(render(e, a.font, os.path.join(a.out, f'signature-{e}.png')))
    return 0
