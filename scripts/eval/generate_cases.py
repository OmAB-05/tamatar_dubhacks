"""Method 1: synthetic Part B ramp solutions with known first errors and true boxes.

    python3 -I scripts/eval/fetch_datasets.py          # once
    python3 -I scripts/eval/generate_cases.py --count 50

Writes, per case:
    datasets/eval/synthetic-v1/<id>.png      white 1568 px canvas (gitignored)
    scripts/eval/labels/<id>.json            label (committed)

Cases alternate correct / one-mutated-line across the five problems, so any
--count prefix is balanced (50 → 25 correct, 25 mutated, 10 per problem).
The same --seed reproduces the same PNGs from the same datasets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import sys
from pathlib import Path

# -I drops the script directory from sys.path; add back only our own directory.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from glyphs import GlyphBank, load_hasy, load_mathwriting  # noqa: E402
from render import Writer, all_labels, draw, finish, ink_box, layout_line, new_canvas  # noqa: E402
from solutions import SOLUTIONS, mutated_lines  # noqa: E402

REPO = HERE.parent.parent
GENERATOR_VERSION = "synthetic-v1"
WIDTH, HEIGHT = 1568, 1176  # iPad landscape canvas, downscaled to 1568 px on the long edge


def check_problem_ids() -> None:
    src = (REPO / "data" / "problems.ts").read_text(encoding="utf-8")
    ids = set(re.findall(r'^\s*id:\s*"([^"]+)"', src, re.M))
    missing = [s.problem_id for s in SOLUTIONS if s.problem_id not in ids]
    if missing:
        raise SystemExit(f"problem ids not in data/problems.ts: {missing}")
    keys_src = (REPO / "lib" / "parse.ts").read_text(encoding="utf-8")
    block = keys_src.split("export const ERROR_KEYS", 1)[1].split("] as const", 1)[0]
    keys = set(re.findall(r'"([a-z_]+)"', block))
    for s in SOLUTIONS:
        for m in s.mutations:
            for k in (m.error_key, *m.also_accept):
                if k not in keys:
                    raise SystemExit(f"{s.problem_id}/{m.key}: {k!r} is not in ERROR_KEYS")


def frac_box(box: tuple[float, float, float, float]) -> dict[str, float]:
    x0, y0, x1, y1 = box
    x0, y0 = max(0.0, x0), max(0.0, y0)
    x1, y1 = min(WIDTH, x1), min(HEIGHT, y1)
    r = lambda v: round(v, 4)  # noqa: E731
    return {"x": r(x0 / WIDTH), "y": r(y0 / HEIGHT), "w": r((x1 - x0) / WIDTH), "h": r((y1 - y0) / HEIGHT)}


def plan(count: int) -> list[tuple[int, bool, int | None]]:
    """(solution index, correct, mutation index) for each case."""
    used = [0] * len(SOLUTIONS)
    out = []
    for i in range(count):
        p = i % len(SOLUTIONS)
        if i % 2 == 0:
            out.append((p, True, None))
        else:
            out.append((p, False, used[p] % len(SOLUTIONS[p].mutations)))
            used[p] += 1
    return out


def render_case(lines: list[str], bank: GlyphBank, rng: random.Random):
    writer = Writer(bank, rng)
    for _ in range(6):  # shrink until the longest line fits
        em = rng.uniform(54, 66)
        left = rng.uniform(60, 130)
        top = rng.uniform(80, 130)
        pitch = em * rng.uniform(1.55, 1.8)
        laid = []
        ok = True
        for k, line in enumerate(lines):
            baseline = top + em * 0.8 + k * pitch
            placed, _ = layout_line(line, writer, left + rng.uniform(-12, 12), baseline, em)
            box = ink_box(placed, writer.pen)
            if box is None or box[2] > WIDTH - 40 or box[3] > HEIGHT - 40:
                ok = False
                break
            laid.append((line, placed, box))
        if ok:
            break
    else:
        raise RuntimeError("could not fit the solution on the canvas")
    img = new_canvas(WIDTH, HEIGHT)
    for _, placed, _ in laid:
        draw(placed, img, writer.pen)
    return finish(img), laid, writer


def token_box(line: str, placed, token: str | None, pen: float):
    if not token or token not in line:
        return None
    start = line.index(token)
    span = range(start, start + len(token))
    return ink_box([p for p in placed if p.src in span], pen)


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate synthetic Part B eval cases.")
    ap.add_argument("--count", type=int, default=50)
    ap.add_argument("--seed", type=int, default=20261017)
    ap.add_argument("--datasets", type=Path, default=REPO / "datasets")
    ap.add_argument("--images", type=Path, default=None, help="default: <datasets>/eval/synthetic-v1")
    ap.add_argument("--labels", type=Path, default=HERE / "labels")
    args = ap.parse_args()

    check_problem_ids()
    images = args.images or args.datasets / "eval" / GENERATOR_VERSION
    images.mkdir(parents=True, exist_ok=True)
    args.labels.mkdir(parents=True, exist_ok=True)

    mw_root = args.datasets / "mathwriting-excerpt" / "mathwriting-2024-excerpt"
    hasy_root = args.datasets / "hasy"
    if not mw_root.exists() or not hasy_root.exists():
        raise SystemExit("datasets missing: run `python3 -I scripts/eval/fetch_datasets.py` first")
    chars = "".join(line for s in SOLUTIONS for line in s.lines + tuple(r for m in s.mutations for r in m.replacement))
    bank = GlyphBank()
    n_mw = load_mathwriting(mw_root, bank)
    n_hasy = load_hasy(hasy_root, bank, all_labels(chars))
    print(f"glyphs: {n_mw} MathWriting, {n_hasy} HASYv2")

    for i, (p, correct, mi) in enumerate(plan(args.count)):
        sol = SOLUTIONS[p]
        mut = None if correct else sol.mutations[mi]
        lines = list(sol.lines) if mut is None else mutated_lines(sol, mut)
        case_id = f"case-{i + 1:03d}-{sol.problem_id}-{'correct' if mut is None else mut.key}"
        rng = random.Random(f"{args.seed}:{i}")
        img, laid, writer = render_case(lines, bank, rng)

        png = images / f"{case_id}.png"
        img.save(png, optimize=True)
        sources: dict[str, int] = {}
        for ch, g in writer.choice.items():
            src = g if isinstance(g, str) else g.source
            sources[src] = sources.get(src, 0) + 1

        first = None if mut is None else mut.first_error
        tb = None if mut is None else token_box(laid[first - 1][0], laid[first - 1][1], mut.token, writer.pen)
        label = {
            "id": case_id,
            "generator": GENERATOR_VERSION,
            "seed": f"{args.seed}:{i}",
            "image": png.name,
            "imageSha256": hashlib.sha256(png.read_bytes()).hexdigest(),
            "width": WIDTH,
            "height": HEIGHT,
            "problemId": sol.problem_id,
            "part": "equations",
            "isFinal": True,
            "correct": mut is None,
            "mutation": None if mut is None else mut.key,
            "errorKey": None if mut is None else mut.error_key,
            "acceptErrorKeys": [] if mut is None else [mut.error_key, *mut.also_accept],
            "firstErrorLine": first,
            # True box: ink of the whole first-error line, as fractions of the image.
            "bbox": None if mut is None else frac_box(laid[first - 1][2]),
            # Tighter box around just the wrong term, for a stricter secondary IoU.
            "tokenBbox": None if tb is None else frac_box(tb),
            "lines": [{"text": text, "bbox": frac_box(box)} for text, _, box in laid],
            "glyphSources": sources,
        }
        (args.labels / f"{case_id}.json").write_text(json.dumps(label, indent=2, ensure_ascii=False) + "\n")
        print(f"{case_id}  correct={label['correct']}  line={first}")


if __name__ == "__main__":
    main()
