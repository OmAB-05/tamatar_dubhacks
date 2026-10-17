"""Method 2: transcription stress test on whole MathWriting expressions.

Each MathWriting expression is one writer's ink, so it is more realistic than the
stitched glyphs of method 1. This script:
  1. filters expressions whose normalizedLabel uses ramp vocabulary,
  2. renders each on a white 1568 px canvas,
  3. posts it through /api/check (debug mode) and reads the model's `observed`
     transcription from the x-debug-observed header,
  4. aligns `observed` with the label and reports confusion pairs (θ/0, μ/u, ...).

Server: EVAL_DEBUG=1 plus the model under test (see run_eval.py).

    python3 -I scripts/eval/transcribe.py --dry-run                 # list + render only
    python3 -I scripts/eval/transcribe.py --model mock --limit 5
    python3 -I scripts/eval/transcribe.py --model haiku --yes-spend
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # -I drops the script dir; add back only our own

from glyphs import parse_inkml  # noqa: E402
from render import Placed, draw, finish, new_canvas  # noqa: E402
from run_eval import PAID, check_server_model, post  # noqa: E402

import numpy as np  # noqa: E402

REPO = HERE.parent.parent
WIDTH, HEIGHT = 1568, 1176

# Ramp vocabulary (dataset_strategy.md method 2). An expression qualifies if it
# uses at least MIN_HITS of these.
VOCAB = {
    "trig": re.compile(r"\\(sin|cos|tan)\b"),
    "theta": re.compile(r"\\theta\b"),
    "mu": re.compile(r"\\mu\b"),
    "mg": re.compile(r"mg"),
    "equals": re.compile(r"="),
    "frac": re.compile(r"\\frac\b"),
    "superscript": re.compile(r"\^"),
}
STRONG = {"trig", "theta", "mu", "mg"}

COMMANDS = {
    "theta": "θ", "mu": "μ", "alpha": "α", "beta": "β", "pi": "π", "Delta": "Δ", "omega": "ω",
    "phi": "φ", "lambda": "λ", "tau": "τ", "rho": "ρ", "sigma": "σ", "nu": "ν", "gamma": "γ",
    "cdot": "·", "times": "×", "approx": "≈", "pm": "±", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥",
    "sqrt": "√", "infty": "∞", "prime": "'", "sin": "sin", "cos": "cos", "tan": "tan", "log": "log",
    "ln": "ln", "rightarrow": "→", "to": "→", "perp": "⊥", "circ": "°", "neq": "≠", "ne": "≠",
    "vartheta": "θ", "kappa": "κ", "xi": "ξ", "upsilon": "υ", "eta": "η", "epsilon": "ε", "zeta": "ζ",
    "int": "∫", "partial": "∂", "nabla": "∇", "sum": "Σ", "prod": "Π", "neg": "¬", "simeq": "≃",
    "ominus": "⊖", "infty": "∞", "Omega": "Ω", "Sigma": "Σ", "Theta": "Θ", "Phi": "Φ",
}
# Accents and fonts: keep the argument, drop the command.
DROP = {"left", "right", "mathrm", "operatorname", "text", "mathbf", "mathit", "mathcal", "hat", "vec",
        "bar", "overline", "tilde", "dot", "ddot", "widehat", ",", ";", "!", " "}


def read_group(s: str, i: int) -> tuple[str, int]:
    """Return the {...} group (or single char) starting at s[i], and the index after it."""
    if i < len(s) and s[i] == "{":
        depth = 0
        for j in range(i, len(s)):
            depth += {"{": 1, "}": -1}.get(s[j], 0)
            if depth == 0:
                return s[i + 1 : j], j + 1
        return s[i + 1 :], len(s)
    return (s[i], i + 1) if i < len(s) else ("", i)


def latex_to_plain(s: str) -> str:
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == "\\":
            m = re.match(r"\\([A-Za-z]+|.)", s[i:])
            name = m.group(1)
            i += len(m.group(0))
            if name == "frac":
                a, i = read_group(s, i)
                b, i = read_group(s, i)
                out.append(f"({latex_to_plain(a)})/({latex_to_plain(b)})")
            elif name in DROP:
                continue
            else:
                out.append(COMMANDS.get(name, name))
        elif c in "^_":
            g, i = read_group(s, i + 1)
            body = latex_to_plain(g)
            out.append(("^" + body) if c == "^" else body)
        elif c in "{}":
            i += 1
        else:
            out.append(c)
            i += 1
    return normalize("".join(out))


def normalize(s: str) -> str:
    s = s.replace("²", "^2").replace("³", "^3")
    s = re.sub(r"[−–—]", "-", s)
    s = s.replace("*", "×").replace("\\", "")
    s = re.sub(r"\(([^()]{1})\)", r"\1", s)  # (a)/(b) → a/b for single symbols
    return re.sub(r"\s+", "", s)


def confusions(expected: str, observed: str) -> tuple[list[tuple[str, str]], float]:
    """Character-level substitutions between label and transcription, ignoring long
    insertions (prose around the transcription)."""
    sm = SequenceMatcher(None, expected, observed, autojunk=False)
    pairs = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "replace" and a1 - a0 <= 3 and b1 - b0 <= 3:
            pairs.append((expected[a0:a1], observed[b0:b1]))
        elif op == "delete" and a1 - a0 <= 2:
            pairs.append((expected[a0:a1], "∅"))
    matched = sum(b.size for b in sm.get_matching_blocks())
    return pairs, matched / max(1, len(expected))


def render_expression(strokes: list[np.ndarray], pen: float = 3.2):
    pts = np.concatenate(strokes)
    x0, y0 = pts.min(0)
    x1, y1 = pts.max(0)
    s = min((WIDTH - 240) / max(x1 - x0, 1e-6), 380 / max(y1 - y0, 1e-6), 6.0)
    ox, oy = 120, 160
    placed = [Placed(0, [np.column_stack([(st[:, 0] - x0) * s + ox, (st[:, 1] - y0) * s + oy]) for st in strokes])]
    img = new_canvas(WIDTH, HEIGHT)
    draw(placed, img, pen)
    return finish(img)


def select(root: Path, min_hits: int) -> list[dict]:
    found = []
    for split in ("train", "valid", "test"):
        for f in sorted((root / split).glob("*.inkml")):
            ann, strokes = parse_inkml(f)
            label = ann.get("normalizedLabel") or ann.get("label") or ""
            hits = [k for k, rx in VOCAB.items() if rx.search(label)]
            if strokes and len(hits) >= min_hits and (STRONG & set(hits) or len(hits) > min_hits):
                found.append({"id": f.stem, "split": split, "label": label, "hits": hits, "strokes": strokes})
    found.sort(key=lambda e: (-len(set(e["hits"]) & STRONG), -len(e["hits"]), e["id"]))
    return found


def main() -> None:
    ap = argparse.ArgumentParser(description="MathWriting transcription confusion test.")
    ap.add_argument("--model", choices=["sonnet", "haiku", "mock", "none"], default="none",
                    help="label for this run; must match the server's AI_CHECK_MODEL")
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--datasets", type=Path, default=REPO / "datasets")
    ap.add_argument("--mathwriting", type=Path, default=None,
                    help="extracted MathWriting root (default: the excerpt); the full 2.9 GB set has far more matches")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--min-hits", type=int, default=2)
    ap.add_argument("--dry-run", action="store_true", help="filter and render only; no HTTP calls")
    ap.add_argument("--yes-spend", action="store_true")
    ap.add_argument("--timeout", type=float, default=60.0)
    args = ap.parse_args()

    root = args.mathwriting or args.datasets / "mathwriting-excerpt" / "mathwriting-2024-excerpt"
    if not root.exists():
        raise SystemExit("datasets missing: run `python3 -I scripts/eval/fetch_datasets.py` first")
    exprs = select(root, args.min_hits)[: args.limit]
    print(f"{len(exprs)} expressions match the ramp vocabulary")
    if not args.dry_run and args.model in PAID and not args.yes_spend:
        raise SystemExit(f"{len(exprs)} paid {args.model} calls. Re-run with --yes-spend to confirm.")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = args.datasets / "eval" / "transcribe"
    img_dir = out_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    url = args.base_url.rstrip("/") + "/api/check"

    pair_counts: Counter[tuple[str, str]] = Counter()
    results = []
    for e in exprs:
        img = render_expression(e["strokes"])
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        (img_dir / f"{e['id']}.png").write_bytes(buf.getvalue())
        expected = latex_to_plain(e["label"])
        rec = {"id": e["id"], "split": e["split"], "label": e["label"], "expected": expected, "hits": e["hits"]}
        if not args.dry_run:
            payload = {
                "imageBase64": base64.b64encode(buf.getvalue()).decode(),
                "problemId": "ramp-frictionless",
                "part": "equations",
                "isFinal": False,
            }
            status, body, hdrs, latency = post(url, payload, args.timeout, True)
            check_server_model(args.model, hdrs)
            raw = urllib.parse.unquote(hdrs["x-debug-observed"]) if "x-debug-observed" in hdrs else None
            if raw is None and status != 503:
                print("  no x-debug-observed header: start the server with EVAL_DEBUG=1", file=sys.stderr)
            observed = normalize(raw) if raw else ""
            pairs, coverage = confusions(expected, observed) if raw else ([], 0.0)
            pair_counts.update(pairs)
            rec.update(
                status=status, requestId=hdrs.get("x-request-id"), latencyMs=round(latency),
                observedRaw=raw, observed=observed, exact=observed == expected,
                coverage=round(coverage, 3), confusions=pairs,
            )
            print(f"{e['id']}  {status}  exact={rec['exact']!s:<5} expected={expected!r}  observed={observed!r}")
        else:
            print(f"{e['id']}  {e['split']:<5} {expected!r}")
        results.append(rec)

    if args.dry_run:
        print(f"rendered to {img_dir}")
        return
    report = out_dir / f"{args.model}-{stamp}.json"
    answered = [r for r in results if r.get("observedRaw")]
    summary = {
        "model": args.model,
        "expressions": len(results),
        "transcribed": len(answered),
        "exact": sum(r["exact"] for r in answered),
        "meanCoverage": round(sum(r["coverage"] for r in answered) / len(answered), 3) if answered else None,
        "confusionPairs": [{"expected": a, "observed": b, "count": n} for (a, b), n in pair_counts.most_common()],
    }
    report.write_text(json.dumps({"summary": summary, "results": results}, indent=2, ensure_ascii=False) + "\n")
    print()
    print(f"transcribed {summary['transcribed']}/{summary['expressions']}, exact {summary['exact']}, "
          f"mean coverage {summary['meanCoverage']}")
    print("top confusion pairs (expected → observed):")
    for (a, b), n in pair_counts.most_common(15):
        print(f"  {a!r:>8} → {b!r:<8} {n}")
    print(f"report: {report}")


if __name__ == "__main__":
    main()
