"""Add digits + physics/math symbols to Myfont, drawn as monoline pen strokes
that match the Calligraphr hand (stroke ~48 units, baseline ~140, digit top ~610).

Usage (needs fonttools + skia-pathops):
    python fonts/tools/add_math_glyphs.py Myfont-Regular.otf fonts/Myfont-Extended.otf

Each glyph is a list of strokes; each stroke is a skeleton path in a normalized
box: u in [0,1] across the glyph's ink width, v=0 baseline, v=1 digit top.
Strokes are offset to round-capped outlines, given a little seeded wobble, and
unioned with skia-pathops.
"""
import math
import random
import sys

import pathops
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

BASE = 140        # where Myfont's letters sit
TOP = 610         # digit / cap-ish height
SPAN = TOP - BASE
LSB = 50          # Myfont glyphs use ~50 left/right bearing
STROKE = 47
AXIS = 0.40       # math axis (centre of + = − ×), in v units
XH = 0.68         # x-height in v units


# ---------- skeleton helpers (return lists of (u, v)) ----------

def line(a, b, n=None):
    n = n or max(2, int(math.dist(a, b) * 24))
    return [(a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n) for t in range(n + 1)]


def bez(p0, p1, p2, p3, n=28):
    out = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        out.append(tuple(mt**3 * p0[k] + 3 * mt * mt * t * p1[k] + 3 * mt * t * t * p2[k] + t**3 * p3[k] for k in (0, 1)))
    return out


def arc(cx, cy, rx, ry, a0, a1, n=48):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def chain(*parts):
    out = []
    for p in parts:
        out += p if not out else p[1:]
    return out


def mirror(strokes):
    return [[(1 - u, v) for u, v in s] for s in strokes]


def dot(u, v, r=0.012):
    return arc(u, v, r, r, 0, 360, 12)


# ---------- glyph designs: char -> (ink width in units, strokes, stroke width) ----------

G = {}


def glyph(chars, width, strokes, sw=STROKE):
    for c in chars:
        G[c] = (width, strokes, sw)


A = AXIS
glyph("0", 250, [arc(.5, .5, .5, .52, 95, 470)])
glyph("1", 170, [line((.05, .78), (.62, 1.0)), line((.62, 1.0), (.58, 0))])
glyph("2", 260, [chain(bez((.04, .76), (.08, 1.08), (.98, 1.1), (.9, .7)),
                       bez((.9, .7), (.82, .42), (.3, .22), (0, 0))),
                 line((0, 0), (1, .02))])
glyph("3", 250, [chain(bez((.04, .9), (.4, 1.1), (1.02, 1.02), (.9, .74)),
                       bez((.9, .74), (.82, .56), (.52, .53), (.36, .53))),
                 chain(bez((.36, .53), (.78, .53), (1.06, .36), (.96, .14)),
                       bez((.96, .14), (.86, -.06), (.28, -.06), (0, .12)))])
glyph("4", 270, [line((.68, 1.0), (0, .34)), line((0, .34), (1, .34)), line((.72, .72), (.7, 0))])
glyph("5", 250, [line((.96, 1.0), (.14, .99)), line((.14, .99), (.07, .55)),
                 chain(bez((.07, .55), (.5, .76), (1.06, .62), (.96, .3)),
                       bez((.96, .3), (.88, -.06), (.3, -.08), (0, .12)))])
glyph("6", 250, [chain(bez((.86, .98), (.4, 1.02), (0, .62), (.04, .3)),
                       arc(.5, .3, .46, .3, 180, 525))])
glyph("7", 250, [line((0, 1.0), (1, 1.0)), line((1, 1.0), (.32, 0))])
glyph("8", 250, [arc(.5, .76, .38, .24, 270, 630), arc(.5, .27, .48, .28, 90, 450)])
glyph("9", 250, [arc(.5, .72, .46, .28, 0, 365), bez((.96, .72), (.98, .4), (.9, .16), (.78, 0))])

glyph("(", 100, [bez((.9, 1.12), (0, .86), (0, .04), (.9, -.26))])
glyph(")", 100, mirror([bez((.9, 1.12), (0, .86), (0, .04), (.9, -.26))]))
glyph("[", 100, [line((1, 1.12), (.1, 1.12)), line((.1, 1.12), (.1, -.26)), line((.1, -.26), (1, -.26))])
glyph("]", 100, mirror([line((1, 1.12), (.1, 1.12)), line((.1, 1.12), (.1, -.26)), line((.1, -.26), (1, -.26))]))
glyph("{", 120, [chain(bez((.95, 1.12), (.3, 1.1), (.55, .5), (0, .43)), bez((0, .43), (.55, .36), (.3, -.24), (.95, -.26)))])
glyph("}", 120, mirror([chain(bez((.95, 1.12), (.3, 1.1), (.55, .5), (0, .43)), bez((0, .43), (.55, .36), (.3, -.24), (.95, -.26)))]))

glyph("+", 250, [line((.5, A - .3), (.5, A + .3)), line((0, A), (1, A + .01))])
glyph("-", 170, [line((0, A), (1, A + .01))])
glyph("−", 250, [line((0, A), (1, A + .01))])                      # minus
glyph("–", 260, [line((0, A - .03), (1, A - .02))])                # en dash
glyph("—", 480, [line((0, A - .03), (1, A - .02))])                # em dash
glyph("=", 250, [line((0, A + .12), (1, A + .13)), line((0, A - .12), (1, A - .11))])
glyph("×", 210, [line((0, A + .26), (1, A - .26)), line((0, A - .26), (1, A + .26))])
glyph("÷", 250, [line((0, A), (1, A + .01)), dot(.5, A + .24), dot(.5, A - .24)])
glyph("·⋅", 50, [dot(.5, A)])                               # middle dot, dot operator
glyph("/", 220, [line((0, -.12), (1, 1.1))])
glyph("\\", 220, [line((0, 1.1), (1, -.12))])
glyph("|", 40, [line((.5, 1.12), (.5, -.26))])
glyph("^", 200, [line((0, .74), (.5, 1.04)), line((.5, 1.04), (1, .74))])
glyph("_", 300, [line((0, -.14), (1, -.13))])
glyph("%", 310, [arc(.18, .82, .17, .18, 0, 370), line((.05, 0), (.95, 1.0)), arc(.82, .18, .17, .18, 0, 370)])
glyph("°", 110, [arc(.5, .9, .5, .13, 0, 370)], sw=40)            # degree
glyph("<", 230, [line((1, A + .32), (0, A)), line((0, A), (1, A - .32))])
glyph(">", 230, mirror([line((1, A + .32), (0, A)), line((0, A), (1, A - .32))]))
glyph("≤", 230, [line((1, A + .44), (0, A + .16)), line((0, A + .16), (1, A - .12)), line((0, A - .34), (1, A - .33))])
glyph("≥", 230, mirror([line((1, A + .44), (0, A + .16)), line((0, A + .16), (1, A - .12)), line((0, A - .34), (1, A - .33))]))
wave = lambda y: bez((0, y), (.3, y + .14), (.62, y - .14), (1, y + .02))
glyph("~", 250, [wave(A)])
glyph("≈", 250, [wave(A + .12), wave(A - .12)])                    # approx
glyph("±", 250, [line((.5, A - .12), (.5, A + .44)), line((0, A + .16), (1, A + .17)), line((0, A - .3), (1, A - .29))])
glyph("≠", 250, [line((0, A + .12), (1, A + .13)), line((0, A - .12), (1, A - .11)), line((.3, A - .36), (.7, A + .38))])
glyph("√", 290, [line((0, .42), (.14, .5)), line((.14, .5), (.36, 0)), line((.36, 0), (.7, 1.1)), line((.7, 1.1), (1, 1.1))])
glyph("∞", 380, [chain(bez((.5, A), (.7, A + .36), (1.02, A + .3), (1, A)),
                            bez((1, A), (.98, A - .3), (.7, A - .36), (.5, A)),
                            bez((.5, A), (.3, A + .36), (-.02, A + .3), (0, A)),
                            bez((0, A), (.02, A - .3), (.3, A - .36), (.5, A)))])
arrow_r = [line((0, A), (1, A + .01)), line((.7, A + .2), (1, A + .01)), line((1, A + .01), (.7, A - .19))]
glyph("→", 360, arrow_r)
glyph("←", 360, mirror(arrow_r))
glyph("↑", 200, [line((.5, -.05), (.5, 1.05)), line((.05, .74), (.5, 1.05)), line((.5, 1.05), (.95, .74))])
glyph("↓", 200, [line((.5, 1.05), (.5, -.05)), line((.05, .26), (.5, -.05)), line((.5, -.05), (.95, .26))])
glyph("…", 300, [dot(.1, .02, .02), dot(.5, .02, .02), dot(.9, .02, .02)])
glyph("*", 200, [line((.5, .58), (.5, 1.0)), line((.1, .9), (.9, .68)), line((.1, .68), (.9, .9))])
glyph("#", 290, [line((.35, 1.0), (.25, 0)), line((.75, 1.0), (.65, 0)), line((0, .68), (1, .69)), line((0, .32), (1, .33))])
glyph("'", 40, [line((.5, 1.05), (.45, .78))])
glyph("⊥⟂", 250, [line((.5, .9), (.5, 0)), line((0, 0), (1, .01))])            # ⊥ ⟂ perpendicular
glyph("∥", 120, [line((.1, 1.05), (.1, -.1)), line((.9, 1.05), (.9, -.1))])           # ∥ parallel
glyph("∠", 260, [line((.9, .85), (0, 0)), line((0, 0), (1, .01))])                    # ∠ angle
glyph("∝", 300, [chain(bez((1, A + .26), (.4, A + .3), (.4, A - .3), (0.04, A - .26)),
                            bez((.04, A - .26), (-.08, A - .1), (-.08, A + .1), (.04, A + .26)),
                            bez((.04, A + .26), (.4, A + .3), (.4, A - .3), (1, A - .26)))])  # ∝

# Greek used in mechanics
glyph("θ", 230, [arc(.5, .52, .5, .55, 95, 470), line((.04, .52), (.96, .53))])          # θ
glyph("μµ", 240, [line((0, XH), (0, -.32)),                                       # μ / micro sign
                            bez((0, .2), (.05, -.06), (.75, -.06), (.86, .26)),
                            chain(line((.86, XH), (.86, .1)), line((.86, .1), (1, 0)))])
glyph("Δ∆", 300, [line((.5, 1), (0, 0)), line((0, 0), (1, 0)), line((1, 0), (.5, 1))])  # Δ
glyph("α", 260, [chain(arc(.38, .33, .38, .34, 25, 340), line((.68, .14), (1, -.02))),
                      line((.68, .14), (.92, XH))])                                          # α
glyph("β", 240, [chain(line((.05, -.32), (.05, .8)), bez((.05, .8), (.08, 1.08), (.85, 1.08), (.75, .78)),
                            bez((.75, .78), (.7, .6), (.45, .56), (.3, .56)),
                            bez((.3, .56), (.9, .56), (1.05, .3), (.9, .12)),
                            bez((.9, .12), (.7, -.08), (.2, -.04), (.05, .14)))])            # β
glyph("π", 280, [line((0, XH - .02), (1, XH + .01)), line((.28, XH), (.22, 0)),
                      bez((.72, XH), (.7, .3), (.72, 0), (.92, .02))])                       # π
glyph("Σ∑", 280, [line((1, 1), (0, 1)), line((0, 1), (.55, .5)), line((.55, .5), (0, 0)), line((0, 0), (1, 0))])
glyph("ω", 320, [chain(bez((.06, .6), (-.06, -.04), (.46, -.06), (.5, .34)),
                            bez((.5, .34), (.54, -.06), (1.06, -.04), (.94, .6)))])           # ω
glyph("φ", 260, [arc(.5, .34, .48, .34, 0, 365), line((.5, .9), (.5, -.32))])            # φ
glyph("λ", 240, [line((.02, 1.02), (.98, 0)), line((.5, .5), (0, 0))])                   # λ
glyph("τ", 240, [line((0, XH - .02), (1, XH + .01)), chain(line((.48, XH), (.44, .12)), bez((.44, .12), (.43, -.02), (.6, -.04), (.78, .04)))])
glyph("ρ", 240, [arc(.56, .33, .42, .34, 180, 545), line((.14, .33), (.14, -.32))])      # ρ
glyph("Ω", 300, [chain(line((0, 0), (.32, 0)), bez((.32, 0), (-.06, .3), (.02, 1.02), (.5, 1.02)),
                            bez((.5, 1.02), (.98, 1.02), (1.06, .3), (.68, 0)), line((.68, 0), (1, 0)))])  # Ω

# superscripts: small digits raised
SUP = {"²": "2", "³": "3", "¹": "1", "⁰": "0", "⁴": "4", "⁻": "-"}
for sup, base in SUP.items():
    w, strokes, _ = G[base]
    G[sup] = (w * .6, [[(u, .55 + v * .5) for u, v in s] for s in strokes], 36)


# ---------- strokes -> outlines ----------

def wobble(points, rng, amp=5.0):
    """Low-frequency perpendicular jitter so lines are not CAD-straight."""
    f1, f2 = rng.uniform(1.5, 3.0), rng.uniform(4.0, 7.0)
    p1, p2 = rng.uniform(0, 6.3), rng.uniform(0, 6.3)
    n = len(points)
    out = []
    for i, (x, y) in enumerate(points):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        t = i / max(n - 1, 1)
        d = amp * (0.7 * math.sin(f1 * t * 6.28 + p1) + 0.3 * math.sin(f2 * t * 6.28 + p2))
        out.append((x + nx * d, y + ny * d))
    return out


def stroke_outline(points, width, rng):
    """Offset a polyline into a closed polygon with round caps."""
    pts = [points[0]]
    for p in points[1:]:
        if math.dist(p, pts[-1]) > 2:
            pts.append(p)
    if len(pts) < 2:
        cx, cy = pts[0]
        r = width / 2
        return [(cx + r * math.cos(a / 16 * 6.283), cy + r * math.sin(a / 16 * 6.283)) for a in range(16)]
    left, right = [], []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        hw = width / 2 * (1 + 0.05 * math.sin(i * 0.37))  # tiny pressure variation
        left.append((x + nx * hw, y + ny * hw))
        right.append((x - nx * hw, y - ny * hw))

    def cap(c, d):
        # semicircle around the outward direction d, from its left side to its right side
        ang = math.atan2(d[1], d[0])
        r = width / 2
        return [(c[0] + r * math.cos(ang + math.pi / 2 - math.pi * k / 8),
                 c[1] + r * math.sin(ang + math.pi / 2 - math.pi * k / 8)) for k in range(1, 8)]

    end_dir = (pts[-1][0] - pts[-2][0], pts[-1][1] - pts[-2][1])
    start_dir = (pts[0][0] - pts[1][0], pts[0][1] - pts[1][1])
    return left + cap(pts[-1], end_dir) + right[::-1] + cap(pts[0], start_dir)


def build(char, width, strokes, sw, seed):
    rng = random.Random(seed)
    tilt = math.radians(rng.uniform(-1.5, 1.5))
    path = pathops.Path()
    for s in strokes:
        pts = []
        for u, v in s:
            x, y = LSB + u * width, BASE + v * SPAN
            # tiny per-glyph rotation about the glyph centre
            cx, cy = LSB + width / 2, BASE + SPAN / 2
            x, y = cx + (x - cx) * math.cos(tilt) - (y - cy) * math.sin(tilt), cy + (x - cx) * math.sin(tilt) + (y - cy) * math.cos(tilt)
            pts.append((x, y))
        poly = stroke_outline(wobble(pts, rng, amp=min(5.0, width / 40)), sw, rng)
        sub = pathops.Path()
        pen = sub.getPen()
        pen.moveTo(poly[0])
        for p in poly[1:]:
            pen.lineTo(p)
        pen.closePath()
        sub.simplify(fix_winding=True)
        path = pathops.op(path, sub, pathops.PathOp.UNION)
    path.simplify(fix_winding=True, clockwise=True)
    tt = TTGlyphPen(None)
    path.draw(tt)
    return tt.glyph(), int(round(width + 2 * LSB))


PUNCT_SHIFT = {"period": 215, "comma": 130, "colon": 205, "semicolon": 150, "question": 200}


def main(src, dst):
    font = TTFont(src)
    order = list(font.getGlyphOrder())
    glyf, hmtx = font["glyf"], font["hmtx"]
    cmaps = [t for t in font["cmap"].tables if t.isUnicode()]
    have = font.getBestCmap()
    added = []
    for i, (chars, (width, strokes, sw)) in enumerate(sorted(G.items())):
        chars = [c for c in chars if ord(c) not in have]
        if not chars:
            continue
        name = "uni%04X" % ord(chars[0])
        g, adv = build(chars[0], width, strokes, sw, seed=ord(chars[0]))
        glyf[name] = g
        g.recalcBounds(glyf)
        hmtx[name] = (adv, g.xMin if hasattr(g, "xMin") else LSB)
        order.append(name)
        for c in chars:
            for t in cmaps:
                t.cmap[ord(c)] = name
        added.extend(chars)
    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    # Calligraphr dropped these well below the letters' baseline, so "9.8" read as "9 . 8".
    for gname, dy in PUNCT_SHIFT.items():
        g = glyf[gname]
        g.coordinates.translate((0, dy))
        g.recalcBounds(glyf)
    # "!" is too tall to just lift: sit its dot on the baseline and shrink it to cap-ish height
    g = glyf["exclam"]
    g.coordinates.translate((0, -g.yMin))
    g.coordinates.scale((1, 0.8))
    g.coordinates.translate((0, BASE - 5))
    g.recalcBounds(glyf)
    font["maxp"].numGlyphs = len(order)
    if "post" in font and font["post"].formatType == 2.0:
        font["post"].extraNames = []
    font["head"].fontRevision = 1.002
    for rec in font["name"].names:
        if rec.nameID == 5:
            rec.string = "Version 001.002 (math glyphs added)"
    font.save(dst)
    print(f"added {len(added)} chars: {''.join(added)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
