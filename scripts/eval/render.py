"""Lay out and render handwritten lines onto a white canvas, tracking ink boxes.

Strokes are drawn with constant width and round caps/joins (perfect-freehand
with constant pressure looks like this), 2x supersampled for anti-aliasing.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw

from glyphs import BitmapGlyph, GlyphBank, StrokeGlyph

try:
    from skimage.morphology import skeletonize
except ImportError:  # pragma: no cover - thresholded bitmaps still work, just thicker
    skeletonize = None

SS = 2  # supersampling factor
INK = 22  # near-black, like the canvas pen

# ---------- Character table ----------

# Per character: candidate glyph labels, and how to size it.
#   ("h", top, bottom)       fit the glyph's height between two lines (em, baseline = 0, up is +)
#   ("box", w, h, cy)        fit inside a w×h em box centered cy em above the baseline
LOWER_X = "acemnorsuvwxz"
ASC = "bdhklt"
DESC = "gpqy"


def char_spec(ch: str) -> tuple[list[str], tuple]:
    if ch.isdigit() or ch.isupper():
        return [ch], ("h", 0.72, 0.0)
    if ch in LOWER_X:
        return [ch], ("h", 0.48, 0.0)
    if ch in ASC:
        return [ch], ("h", 0.74 if ch != "t" else 0.62, 0.0)
    if ch in DESC:
        return [ch], ("h", 0.48, -0.26)
    if ch == "f":
        return ["f"], ("h", 0.76, -0.12)
    if ch == "i":
        return ["i"], ("h", 0.66, 0.0)
    if ch == "j":
        return ["j"], ("h", 0.66, -0.26)
    table = {
        "θ": (["\\theta"], ("h", 0.74, 0.0)),
        "μ": (["\\mu"], ("h", 0.48, -0.26)),
        "=": (["="], ("box", 0.42, 0.26, 0.28)),
        "+": (["+"], ("box", 0.42, 0.42, 0.28)),
        "−": (["-"], ("box", 0.40, 0.12, 0.28)),
        "×": (["\\times"], ("box", 0.4, 0.4, 0.28)),
        "≈": (["\\approx"], ("box", 0.46, 0.28, 0.28)),
        "/": (["/"], ("h", 0.80, -0.12)),
        "(": (["("], ("h", 0.82, -0.2)),
        ")": ([")"], ("h", 0.82, -0.2)),
        ".": ([], ("box", 0.07, 0.07, 0.04)),  # procedural: MathWriting dots render as commas
        "°": (["\\degree"], ("box", 0.2, 0.2, 0.66)),
    }
    if ch in table:
        return table[ch]
    raise KeyError(f"no glyph spec for {ch!r}")


def all_labels(chars: str) -> set[str]:
    out = {"-"}  # "=" falls back to two minus glyphs
    for ch in set(chars) - {" ", "_", "^"}:
        out.update(char_spec(ch)[0])
    return out


# ---------- Tokenizing line markup ----------


@dataclass
class Tok:
    ch: str
    src: int  # index into the markup string
    script: str  # "", "sub", "sup"


def tokenize(line: str) -> list[Tok]:
    toks, i = [], 0
    while i < len(line):
        c = line[i]
        if c in "_^" and i + 1 < len(line):
            toks.append(Tok(line[i + 1], i + 1, "sub" if c == "_" else "sup"))
            i += 2
        else:
            toks.append(Tok(c, i, ""))
            i += 1
    return toks


# ---------- Glyph choice ----------


class Writer:
    """Picks one glyph instance per character for a whole case, so repeated
    letters look alike (closer to one student's hand than a fresh pick each time)."""

    def __init__(self, bank: GlyphBank, rng: random.Random, p_mathwriting: float = 0.6):
        self.bank, self.rng, self.p_mw = bank, rng, p_mathwriting
        self.choice: dict[str, StrokeGlyph | BitmapGlyph | str] = {}
        self.pen = rng.uniform(2.8, 3.8)  # px at output resolution
        self.slant = rng.uniform(-0.12, 0.05)  # shear, negative = right-leaning

    def glyph(self, ch: str) -> StrokeGlyph | BitmapGlyph | str:
        if ch not in self.choice:
            labels, _ = char_spec(ch)
            pool = [g for lab in labels for g in self.bank.get(lab)]
            mw = [g for g in pool if g.source == "mathwriting"]
            hasy = [g for g in pool if g.source == "hasy"]
            if mw and (not hasy or self.rng.random() < self.p_mw):
                self.choice[ch] = self.rng.choice(mw)
            elif hasy:
                self.choice[ch] = self.rng.choice(hasy)
            else:
                self.choice[ch] = "procedural"  # ".", "=", "(", ")", "°" with no data glyph
        return self.choice[ch]


# ---------- Geometry helpers ----------


def bitmap_strokes(mask: np.ndarray) -> list[np.ndarray]:
    """Turn a thick HASY bitmap into thin polylines (skeleton pixel pairs) so it
    can be drawn with the same pen as stroke glyphs."""
    if skeletonize is None:
        ys, xs = np.nonzero(mask)
        return [np.array([[x, y]], dtype=float) for x, y in zip(xs, ys)]
    sk = skeletonize(np.pad(mask, 1))
    ys, xs = np.nonzero(sk)
    on = set(zip(xs.tolist(), ys.tolist()))
    segs = []
    for x, y in on:
        for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
            if (x + dx, y + dy) in on:
                segs.append(np.array([[x, y], [x + dx, y + dy]], dtype=float))
    if not segs:
        segs = [np.array([[x, y]], dtype=float) for x, y in on]
    return segs


def procedural_strokes(ch: str, rng: random.Random) -> list[np.ndarray]:
    t = np.linspace(0, 1, 24)
    j = lambda: rng.uniform(-0.04, 0.04)  # noqa: E731
    if ch == ".":
        a = np.linspace(0, 2 * math.pi, 10)
        return [np.stack([np.cos(a), np.sin(a)], 1) * 0.5]
    if ch == "°":
        a = np.linspace(0, 2 * math.pi, 20)
        return [np.stack([np.cos(a) * (1 + j()), np.sin(a)], 1)]
    if ch in "()":
        a = np.linspace(-1.1, 1.1, 24)
        x = -np.cos(a) * 0.35 if ch == "(" else np.cos(a) * 0.35
        return [np.stack([x + j(), np.sin(a)], 1)]
    if ch == "=":
        return [np.stack([t, 0 * t + j()], 1), np.stack([t + j(), 0 * t + 0.6], 1)]
    if ch == "−":
        return [np.stack([t, 0 * t], 1)]
    raise KeyError(ch)


def glyph_strokes(g: StrokeGlyph | BitmapGlyph | str, ch: str, rng: random.Random, bank: GlyphBank) -> list[np.ndarray]:
    if isinstance(g, StrokeGlyph):
        return [s.copy() for s in g.strokes]
    if isinstance(g, BitmapGlyph):
        return bitmap_strokes(g.mask)
    if ch == "=":
        # Two HASY minus signs stacked, if we have them.
        minus = [m for m in bank.get("-") if isinstance(m, BitmapGlyph)]
        if len(minus) >= 1:
            a, b = (bitmap_strokes(rng.choice(minus).mask) for _ in range(2))
            ha = max(np.concatenate(a)[:, 0].max(), 1.0)
            out = [s / ha for s in a]
            hb = max(np.concatenate(b)[:, 0].max(), 1.0)
            out += [s / hb + np.array([rng.uniform(-0.05, 0.05), 0.6]) for s in b]
            return out
    return procedural_strokes(ch, rng)


def fit(strokes: list[np.ndarray], spec: tuple, em: float, rng: random.Random) -> tuple[list[np.ndarray], float]:
    """Scale/translate strokes into em-space box. Returns strokes with x starting at 0,
    y in page orientation relative to the baseline (down is +), and the glyph width."""
    pts = np.concatenate(strokes)
    x0, y0 = pts.min(0)
    x1, y1 = pts.max(0)
    gw, gh = max(x1 - x0, 1e-6), max(y1 - y0, 1e-6)
    jitter = rng.uniform(0.92, 1.08)
    if spec[0] == "h":
        _, top, bottom = spec
        box_h = (top - bottom) * em * jitter
        s = box_h / gh
        if gw * s > 1.1 * em:
            s = 1.1 * em / gw
        oy = -top * em * jitter  # top of box, y down
        oy += (box_h - gh * s) / 2
    else:
        _, bw, bh, cy = spec
        s = min(bw * em * jitter / gw, bh * em * jitter / gh) if gh > 1e-3 else bw * em * jitter / gw
        oy = -cy * em - gh * s / 2
    out = [np.column_stack([(st[:, 0] - x0) * s, (st[:, 1] - y0) * s + oy]) for st in strokes]
    return out, gw * s


@dataclass
class Placed:
    src: int
    strokes: list[np.ndarray]  # page px


def layout_line(line: str, writer: Writer, x: float, baseline: float, em: float) -> tuple[list[Placed], float]:
    rng = writer.rng
    placed: list[Placed] = []
    cursor = x
    drift = rng.uniform(-0.02, 0.02)  # baseline slope, px per px
    for tok in tokenize(line):
        if tok.ch == " ":
            cursor += em * rng.uniform(0.30, 0.42)
            continue
        size = em * (0.6 if tok.script else 1.0)
        shift = {"": 0.0, "sub": 0.16 * em, "sup": -0.42 * em}[tok.script]
        _, spec = char_spec(tok.ch)
        g = writer.glyph(tok.ch)
        strokes, w = fit(glyph_strokes(g, tok.ch, rng, writer.bank), spec, size, rng)
        rot = math.radians(rng.uniform(-3, 3))
        c, s_ = math.cos(rot), math.sin(rot)
        by = baseline + shift + (cursor - x) * drift + rng.uniform(-0.03, 0.03) * em
        page = []
        for st in strokes:
            px = st[:, 0] - w / 2
            py = st[:, 1]
            rx = px * c - py * s_ + writer.slant * py
            ry = px * s_ + py * c
            page.append(np.column_stack([rx + cursor + w / 2, ry + by]))
        placed.append(Placed(tok.src, page))
        cursor += w + em * rng.uniform(0.06, 0.12)
    return placed, cursor - x


def ink_box(placed: list[Placed], pen: float) -> tuple[float, float, float, float] | None:
    if not placed:
        return None
    pts = np.concatenate([st for p in placed for st in p.strokes])
    r = pen / 2
    return float(pts[:, 0].min() - r), float(pts[:, 1].min() - r), float(pts[:, 0].max() + r), float(pts[:, 1].max() + r)


def draw(placed: list[Placed], img: Image.Image, pen: float) -> None:
    d = ImageDraw.Draw(img)
    w = max(1, round(pen * SS))
    r = pen * SS / 2
    for p in placed:
        for st in p.strokes:
            pts = [(float(a) * SS, float(b) * SS) for a, b in st]
            if len(pts) > 1:
                d.line(pts, fill=INK, width=w, joint="curve")
            for a, b in (pts[0], pts[-1]) if len(pts) > 1 else pts:
                d.ellipse([a - r, b - r, a + r, b + r], fill=INK)


def new_canvas(width: int, height: int) -> Image.Image:
    return Image.new("L", (width * SS, height * SS), 255)


def finish(img: Image.Image) -> Image.Image:
    w, h = img.size
    return img.resize((w // SS, h // SS), Image.LANCZOS).convert("RGB")
