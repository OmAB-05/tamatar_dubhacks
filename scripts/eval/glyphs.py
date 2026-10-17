"""Handwritten glyph sources for the synthetic eval set.

Two kinds of glyph:
- StrokeGlyph: InkML pen strokes from MathWriting (`symbols/` plus glyphs cut out
  of `train/` inks via `symbols.jsonl`). Only X and Y are used: the third InkML
  channel is time, not pressure, so strokes are rendered with constant width.
- BitmapGlyph: 32x32 HASYv2 crops, used for symbols MathWriting's excerpt lacks.

Everything here only parses data files (XML, CSV, JSON, PNG); nothing from the
archives is executed. Parsing uses xml.etree on files we size-check first.
"""

from __future__ import annotations

import csv
import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

INKML_NS = "{http://www.w3.org/2003/InkML}"
MAX_INKML_BYTES = 2_000_000


@dataclass
class StrokeGlyph:
    label: str
    strokes: list[np.ndarray]  # each (n, 2) float, y increasing downward
    source: str = "mathwriting"

    def bounds(self) -> tuple[float, float, float, float]:
        pts = np.concatenate(self.strokes)
        return float(pts[:, 0].min()), float(pts[:, 1].min()), float(pts[:, 0].max()), float(pts[:, 1].max())


@dataclass
class BitmapGlyph:
    label: str
    mask: np.ndarray  # (h, w) bool, True = ink, cropped to the ink
    source: str = "hasy"


@dataclass
class GlyphBank:
    by_label: dict[str, list[StrokeGlyph | BitmapGlyph]] = field(default_factory=dict)

    def add(self, g: StrokeGlyph | BitmapGlyph) -> None:
        self.by_label.setdefault(g.label, []).append(g)

    def get(self, label: str) -> list[StrokeGlyph | BitmapGlyph]:
        return self.by_label.get(label, [])


# ---------- InkML ----------


def parse_inkml(path: Path) -> tuple[dict[str, str], list[np.ndarray]]:
    if path.stat().st_size > MAX_INKML_BYTES:
        raise ValueError(f"{path} is unexpectedly large")
    root = ET.parse(path).getroot()
    annotations = {a.get("type", ""): (a.text or "") for a in root.iter(f"{INKML_NS}annotation")}
    strokes = []
    for trace in root.iter(f"{INKML_NS}trace"):
        pts = []
        for triple in (trace.text or "").split(","):
            parts = triple.split()
            if len(parts) >= 2:
                pts.append((float(parts[0]), float(parts[1])))  # parts[2] is time (ms), ignored
        if pts:
            strokes.append(np.asarray(pts, dtype=np.float64))
    return annotations, strokes


def load_mathwriting(root: Path, bank: GlyphBank) -> int:
    """root = datasets/mathwriting-excerpt/mathwriting-2024-excerpt"""
    n = 0
    for f in sorted((root / "symbols").glob("*.inkml")):
        ann, strokes = parse_inkml(f)
        if strokes and ann.get("label"):
            bank.add(StrokeGlyph(ann["label"], strokes))
            n += 1
    # Glyphs referenced by symbols.jsonl whose source ink ships in the excerpt's train/.
    train_dir = root / "train"
    cache: dict[str, list[np.ndarray]] = {}
    with open(root / "symbols.jsonl", encoding="utf-8") as fh:
        for line in fh:
            ref = json.loads(line)
            sid = str(ref.get("sourceSampleId", ""))
            path = train_dir / f"{sid}.inkml"
            if not sid.isalnum() or not path.exists():
                continue
            if sid not in cache:
                cache[sid] = parse_inkml(path)[1]
            strokes = cache[sid]
            idx = [i for i in ref.get("strokeIndices", []) if isinstance(i, int) and 0 <= i < len(strokes)]
            if idx and ref.get("label"):
                bank.add(StrokeGlyph(ref["label"], [strokes[i] for i in idx]))
                n += 1
    return n


# ---------- HASYv2 ----------


def load_hasy(root: Path, bank: GlyphBank, labels: set[str], per_label: int = 40) -> int:
    """root = datasets/hasy. Loads up to per_label crops for each wanted LaTeX label."""
    counts: dict[str, int] = {}
    n = 0
    with open(root / "hasy-data-labels.csv", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            label = row["latex"]
            if label not in labels or counts.get(label, 0) >= per_label:
                continue
            rel = Path(row["path"])
            if rel.is_absolute() or ".." in rel.parts:
                continue
            with Image.open(root / rel) as im:
                if im.size != (32, 32):
                    continue
                arr = np.asarray(im.convert("L"))
            mask = arr < 128  # HASY is black ink on white
            ys, xs = np.nonzero(mask)
            if len(xs) == 0:
                continue
            mask = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            bank.add(BitmapGlyph(label, mask))
            counts[label] = counts.get(label, 0) + 1
            n += 1
    return n
