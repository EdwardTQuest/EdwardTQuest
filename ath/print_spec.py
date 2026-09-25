"""One place for what the print house needs. IngramSpark (Lightning Source) by default; KDP is
not assumed anywhere. Change a number here, not in a stage.

Sources (checked 2026-09-25): IngramSpark file requirements — paperback bleed 0.125 in; case
laminate wrap 0.625 in, hinge 0.5 in each side of the spine, board width = trim − 0.185, board
height = trim + 0.25, file height = board height + 1.25; paper 0.002602 in/page cream,
0.002366 white; text at least 0.25 in from the trim. The hardcover spine comes from their own
stepped table: the value here is an estimate, and `ath cover --spine X` takes the template's.
"""
TRIMS = {'deluxe': (5.0, 7.0), 'everyman': (4.25, 6.375), 'scholar': (5.0, 7.0)}
BINDING = {'deluxe': 'hardcover', 'everyman': 'paperback', 'scholar': 'paperback'}
FINISH = {'deluxe': 'case laminate, matte', 'everyman': 'perfect bound, matte', 'scholar': 'perfect bound, gloss'}
PAPER = {'cream': 0.002602, 'white': 0.002366}
BLEED = 0.125
CASE = {'wrap': 0.625, 'hinge': 0.5, 'board_dw': -0.185, 'board_dh': 0.25, 'file_dh': 1.25, 'spine_extra': 0.16}
SAFE = 0.25                     # type no closer than this to the trim, front and back
SPINE_TEXT_MIN = 0.25           # no spine text on a thinner spine
# house inside margins by page count: stricter than the printer's minimum, for the hand's comfort
INSIDE_BY_PAGES = [(150, 0.60), (300, 0.70), (500, 0.80), (700, 0.90), (10 ** 9, 1.00)]
MAX_PAGES = 800                 # flag beyond this; split the volume
DPI = 300


def spine_in(pages, paper='cream', binding='paperback'):
    s = pages * PAPER[paper]
    if binding == 'hardcover':
        s += CASE['spine_extra']
        s = (int(s * 16) + 1) / 16.0       # their table is in sixteenths; round up
    return round(s, 4)


def inside_min(pages):
    for lim, m in INSIDE_BY_PAGES:
        if pages <= lim:
            return m
    return INSIDE_BY_PAGES[-1][1]


def spread(edition, pages, paper='cream', spine_override=None):
    """Full-wrap cover geometry in inches: dict with file w/h, spine, and the x of each panel."""
    tw, th = TRIMS[edition]
    binding = BINDING[edition]
    sp = spine_override if spine_override else spine_in(pages, paper, binding)
    if binding == 'paperback':
        w = 2 * tw + sp + 2 * BLEED
        h = th + 2 * BLEED
        return {'binding': binding, 'w': w, 'h': h, 'spine': sp, 'bleed': BLEED,
                'back': (0, BLEED + tw), 'spine_x': (BLEED + tw, BLEED + tw + sp), 'front': (BLEED + tw + sp, w),
                'panel_w': tw + BLEED, 'panel_h': h, 'trim_top': BLEED}
    bw, bh = tw + CASE['board_dw'], th + CASE['board_dh']
    w = CASE['wrap'] + bw + CASE['hinge'] + sp + CASE['hinge'] + bw + CASE['wrap']
    h = bh + CASE['file_dh']
    x_spine = CASE['wrap'] + bw + CASE['hinge']
    return {'binding': binding, 'w': w, 'h': h, 'spine': sp, 'bleed': CASE['wrap'],
            'back': (0, CASE['wrap'] + bw), 'spine_x': (x_spine, x_spine + sp), 'front': (x_spine + sp + CASE['hinge'], w),
            'hinges': ((x_spine - CASE['hinge'], x_spine), (x_spine + sp, x_spine + sp + CASE['hinge'])),
            'panel_w': bw + CASE['wrap'], 'panel_h': h, 'trim_top': CASE['file_dh'] / 2,
            'note': 'hardcover spine estimated; read the exact spine from the IngramSpark cover template and pass --spine'}
