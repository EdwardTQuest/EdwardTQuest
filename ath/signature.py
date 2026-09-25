"""The publication-page signature: 'Athanasius' in green pen, framed by the edition word.

No ISBN block. In its place, a box whose border is the edition word repeated
(deluxedeluxedeluxe…) and whose field carries a handwritten 'Athanasius' in
green ink, after the manner of St. Josemaría's hand. Rendered by Pillow at
600 dpi so it prints crisply at 2.2 in wide. Font chosen in book.yaml
(typeset.signature_font); `ath signature --samples` renders every candidate.
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
INK = (24, 112, 60)          # a real green ballpoint, not a printer's green
FRAME_INK = (128, 116, 88)   # sand-grey, recedes behind the signature
PAPER = (0, 0, 0, 0)         # transparent: the page shows through


def render(word='deluxe', font_name='La Belle Aurore', out='signature-deluxe.png',
           width_in=2.2, height_in=1.05, dpi=600, seed=7):
    W, H = int(width_in * dpi), int(height_in * dpi)
    im = Image.new('RGBA', (W, H), PAPER)
    d = ImageDraw.Draw(im)
    fpath = os.path.join(ASSETS, 'fonts', FONTS[font_name])
    frame_font = ImageFont.truetype(os.path.join(ASSETS, 'fonts', 'EBGaramond-Regular.ttf'), int(dpi * 0.052))
    band = int(dpi * 0.075)

    def strip(length):
        s = word * 200
        while d.textlength(s, font=frame_font) > length:
            s = s[:-1]
        return s

    # frame: the word runs clockwise around the box, one band wide, corners overlapping neatly
    inner_w, inner_h = W - 2 * band, H - 2 * band
    d.text((band, 2), strip(inner_w), font=frame_font, fill=FRAME_INK)
    d.text((band, H - band + 2), strip(inner_w), font=frame_font, fill=FRAME_INK)
    side = Image.new('RGBA', (inner_h, band), PAPER)
    sd = ImageDraw.Draw(side)
    sd.text((0, 2), strip(inner_h), font=frame_font, fill=FRAME_INK)
    im.paste(side.rotate(90, expand=True), (2, band), side.rotate(90, expand=True))
    im.paste(side.rotate(-90, expand=True), (W - band + 2, band), side.rotate(-90, expand=True))
    # a hairline inside the word frame
    d.rectangle([band - 4, band - 4, W - band + 4, H - band + 4], outline=FRAME_INK + (110,), width=2)

    # the signature: ink laid down in three slightly offset passes, then softened,
    # so the stroke has weight and a hint of a pen's wet edge
    rnd = random.Random(seed)
    size = int(dpi * 0.42)
    f = ImageFont.truetype(fpath, size)
    layer = Image.new('RGBA', (W, H), PAPER)
    ld = ImageDraw.Draw(layer)
    tw = ld.textlength('Athanasius', font=f)
    while tw > inner_w * 0.86:
        size = int(size * 0.94); f = ImageFont.truetype(fpath, size); tw = ld.textlength('Athanasius', font=f)
    x = (W - tw) / 2
    bbox = f.getbbox('Athanasius')
    y = (H - (bbox[3] - bbox[1])) / 2 - bbox[1] - dpi * 0.03
    for dx, dy in [(0, 0), (dpi * 0.0025, dpi * 0.001), (-dpi * 0.0015, dpi * 0.002)]:
        ld.text((x + dx, y + dy), 'Athanasius', font=f, fill=INK + (225,))
    # the underline: one pen stroke below the descenders, rising slightly, thinning at the tail
    base = y + bbox[3] + dpi * 0.035
    pts = []
    n = int(tw * 0.78)
    for i in range(0, n, 3):
        t = i / n
        pts.append((x + tw * 0.14 + i, base - t * dpi * 0.02 + math.sin(t * math.pi * 1.6) * dpi * 0.012 + rnd.uniform(-0.6, 0.6)))
    for j in range(len(pts) - 1):
        w = max(2, int(dpi * 0.006 * (1.15 - 0.9 * (j / len(pts)))))
        ld.line([pts[j], pts[j + 1]], fill=INK + (210,), width=w)
    layer = layer.filter(ImageFilter.GaussianBlur(dpi * 0.0012))
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
