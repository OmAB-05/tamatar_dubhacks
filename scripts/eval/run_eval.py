"""Method 1 runner: post each synthetic case to a running /api/check and score it.

Start the server with the Claude model under test, e.g.

    EVAL_DEBUG=1 AI_CHECK_MODEL=sonnet npm run dev      # paid
    EVAL_DEBUG=1 AI_CHECK_MODEL=haiku  npm run dev      # paid
    EVAL_DEBUG=1 EVAL_MOCK_CHECKER=1   npm run dev      # free, fake answers

then

    python3 -I scripts/eval/run_eval.py --model sonnet --limit 5 --yes-spend
    python3 -I scripts/eval/run_eval.py --model haiku --start 21 --limit 20 --delay 2 --yes-spend

The server picks the model; --model only labels the CSV and is checked against
the server's x-debug-model header (needs EVAL_DEBUG=1). Runs against sonnet or
haiku need --yes-spend so a paid run is never an accident.

CSV columns: classification correct, false accusation, missed error, errorKey
match, bbox IoU (line box and tighter token box), latency and x-request-id.
"""

from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
# --model label → the id the server reports in x-debug-model (see lib/ai/checker.ts MODELS).
MODEL_IDS = {"sonnet": "claude-sonnet-5-5", "haiku": "claude-haiku-5-5", "mock": "mock"}
PAID = {"sonnet", "haiku"}


def check_server_model(label: str, hdrs: dict) -> str | None:
    """Stop if the server is running a different model than the run is labeled with."""
    served = hdrs.get("x-debug-model")
    if served and label in MODEL_IDS and served != MODEL_IDS[label]:
        raise SystemExit(f"server is running {served!r}, not {label} ({MODEL_IDS[label]}); stopping")
    return served

FIELDS = [
    "caseId", "problemId", "mutation", "model", "serverModel", "promptVersion",
    "httpStatus", "errorCode", "truthCorrect", "predCorrect", "classificationCorrect",
    "falseAccusation", "missedError", "truthErrorKey", "predErrorKey", "errorKeyMatch",
    "bboxIoU", "tokenBboxIoU", "predBbox", "trueBbox", "latencyMs", "requestId", "mark", "observed",
]


def iou(a: dict | None, b: dict | None) -> float | None:
    if not a or not b:
        return None
    ax1, ay1 = a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1 = b["x"] + b["w"], b["y"] + b["h"]
    iw = max(0.0, min(ax1, bx1) - max(a["x"], b["x"]))
    ih = max(0.0, min(ay1, by1) - max(a["y"], b["y"]))
    inter = iw * ih
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def post(url: str, payload: dict, timeout: float, debug: bool) -> tuple[int, dict, dict, float]:
    data = json.dumps(payload).encode()
    headers = {"content-type": "application/json"}
    if debug:
        headers["x-eval-debug"] = "1"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status, body, hdrs = resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        status, body, hdrs = e.code, e.read(), dict(e.headers)
    latency = (time.perf_counter() - started) * 1000
    try:
        parsed = json.loads(body or b"{}")
    except json.JSONDecodeError:
        parsed = {"error": {"code": "non_json_response", "message": body[:200].decode(errors="replace")}}
    return status, parsed, {k.lower(): v for k, v in hdrs.items()}, latency


def box_str(b: dict | None) -> str | None:
    return None if not b else " ".join(f"{b[k]:.4f}" for k in ("x", "y", "w", "h"))


def fmt(v) -> str:
    if v is None:
        return ""
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, float):
        return f"{v:.4f}"
    return str(v)


def main() -> None:
    ap = argparse.ArgumentParser(description="Score /api/check on the synthetic eval set.")
    ap.add_argument("--model", required=True, choices=["sonnet", "haiku", "mock", "none"],
                    help="label for this run; must match the server's AI_CHECK_MODEL")
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--labels", type=Path, default=HERE / "labels")
    ap.add_argument("--images", type=Path, default=REPO / "datasets" / "eval" / "synthetic-v1")
    ap.add_argument("--start", type=int, default=1, help="1-based case number to start from (resume another day)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--delay", type=float, default=0.0,
                    help="seconds between requests, e.g. 13 to stay under a 5-per-minute free-tier limit")
    ap.add_argument("--out", type=Path, default=None, help="default: datasets/eval/results/<model>-<time>.csv")
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--no-debug", action="store_true", help="don't request the x-debug-* headers")
    ap.add_argument("--yes-spend", action="store_true", help="required for sonnet/haiku (paid calls)")
    args = ap.parse_args()

    labels = sorted(args.labels.glob("case-*.json"))[max(0, args.start - 1) :][: args.limit]
    if not labels:
        raise SystemExit(f"no labels in {args.labels}; run generate_cases.py first")
    if args.model in PAID and not args.yes_spend:
        raise SystemExit(
            f"{len(labels)} paid {args.model} calls (each may retry once). Re-run with --yes-spend to confirm."
        )

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = args.out or REPO / "datasets" / "eval" / "results" / f"{args.model}-{stamp}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    url = args.base_url.rstrip("/") + "/api/check"

    rows = []
    with open(out, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        for n, path in enumerate(labels):
            if n and args.delay > 0:
                time.sleep(args.delay)
            label = json.loads(path.read_text(encoding="utf-8"))
            png = (args.images / label["image"]).read_bytes()
            if hashlib.sha256(png).hexdigest() != label["imageSha256"]:
                raise SystemExit(f"{label['image']} does not match its label; regenerate with the same seed/datasets")
            payload = {
                "imageBase64": base64.b64encode(png).decode(),
                "problemId": label["problemId"],
                "part": label["part"],
                "isFinal": label["isFinal"],
            }
            status, body, hdrs, latency = post(url, payload, args.timeout, not args.no_debug)
            served = check_server_model(args.model, hdrs)

            ok = status == 200
            truth = label["correct"]
            pred = body.get("correct") if ok else None
            pred_key = body.get("errorKey") if ok else None
            row = {
                "caseId": label["id"],
                "problemId": label["problemId"],
                "mutation": label["mutation"],
                "model": args.model,
                "serverModel": served,
                "promptVersion": hdrs.get("x-debug-prompt-version"),
                "httpStatus": status,
                "errorCode": None if ok else (body.get("error") or {}).get("code"),
                "truthCorrect": truth,
                "predCorrect": pred,
                "classificationCorrect": None if pred is None else pred == truth,
                "falseAccusation": None if pred is None or not truth else pred is False,
                "missedError": None if pred is None or truth else pred is True,
                "truthErrorKey": label["errorKey"],
                "predErrorKey": pred_key,
                "errorKeyMatch": None if truth or pred is None else pred_key in label["acceptErrorKeys"],
                "bboxIoU": None if truth or pred is not False else iou(body.get("bbox"), label["bbox"]) or 0.0,
                "tokenBboxIoU": None if truth or pred is not False or not label["tokenBbox"]
                else iou(body.get("bbox"), label["tokenBbox"]) or 0.0,
                # Boxes as x,y,w,h fractions, for per-model calibration (dataset_strategy.md method 4).
                "predBbox": box_str(body.get("bbox") if ok else None),
                "trueBbox": box_str(label["bbox"]),
                "latencyMs": round(latency),
                "requestId": hdrs.get("x-request-id"),
                "mark": body.get("mark") if ok else None,
                "observed": urllib.parse.unquote(hdrs["x-debug-observed"]) if "x-debug-observed" in hdrs else None,
            }
            writer.writerow({k: fmt(v) for k, v in row.items()})
            fh.flush()
            rows.append(row)
            print(
                f"{label['id']:<55} {status}  truth={'ok ' if truth else 'err'} "
                f"pred={fmt(pred) or '-':<2} key={pred_key or '-'}  iou={fmt(row['bboxIoU']) or '-'}  {row['latencyMs']}ms"
            )

    summarize(rows, out)


def rate(rows: list[dict], field: str) -> str:
    vals = [r[field] for r in rows if r[field] is not None]
    return f"{sum(vals)}/{len(vals)}" if vals else "n/a"


def summarize(rows: list[dict], out: Path) -> None:
    answered = [r for r in rows if r["predCorrect"] is not None]
    ious = [r["bboxIoU"] for r in rows if r["bboxIoU"] is not None]
    lat = sorted(r["latencyMs"] for r in answered) or [0]
    errors: dict[str, int] = {}
    for r in rows:
        if r["errorCode"]:
            errors[r["errorCode"]] = errors.get(r["errorCode"], 0) + 1
    print()
    print(f"answered          {len(answered)}/{len(rows)}  errors={errors or 'none'}")
    print(f"classification    {rate(rows, 'classificationCorrect')}")
    print(f"false accusations {rate(rows, 'falseAccusation')}  (correct work marked wrong)")
    print(f"missed errors     {rate(rows, 'missedError')}")
    print(f"errorKey match    {rate(rows, 'errorKeyMatch')}")
    if ious:
        print(f"bbox IoU          mean {statistics.mean(ious):.3f}  median {statistics.median(ious):.3f}  "
              f"≥0.5: {sum(i >= 0.5 for i in ious)}/{len(ious)}")
    print(f"latency ms        p50 {lat[len(lat) // 2]}  max {lat[-1]}")
    print(f"csv               {out}")


if __name__ == "__main__":
    sys.exit(main())
