# Synthetic eval harness for `/api/check`

Methods 1 and 2 from [dataset_strategy.md](../../planning/ai/dataset_strategy.md). Python 3.12+ with Pillow, NumPy and scikit-image. Always run with `-I`: the scripts read untrusted downloaded data.

```bash
python3 -I scripts/eval/fetch_datasets.py              # MathWriting excerpt + HASYv2 → datasets/ (gitignored)
python3 -I scripts/eval/generate_cases.py --count 50   # PNGs → datasets/eval/synthetic-v1/, labels → scripts/eval/labels/
```

Start the server with the provider under test. `EVAL_DEBUG=1` makes the route return `x-debug-observed`, `x-debug-provider`, `x-debug-model` and `x-debug-prompt-version` headers when the request has `x-eval-debug: 1`. This works only outside production, and the `CheckResponse` body does not change.

```bash
EVAL_DEBUG=1 EVAL_MOCK_CHECKER=1 npm run dev       # free: fake answers, exercises the plumbing
EVAL_DEBUG=1 AI_CHECK_PROVIDER=anthropic npm run dev
EVAL_DEBUG=1 AI_CHECK_PROVIDER=gemini npm run dev
```

```bash
python3 -I scripts/eval/run_eval.py --provider mock --limit 5
python3 -I scripts/eval/run_eval.py --provider anthropic --yes-spend   # paid: 50 calls, each may retry once
python3 -I scripts/eval/transcribe.py --dry-run                        # method 2: list and render matches
python3 -I scripts/eval/transcribe.py --provider gemini --yes-spend
```

Results go to `datasets/eval/results/*.csv` and `datasets/eval/transcribe/*.json`.

## Files

| File | Role |
| :--- | :--- |
| `fetch_datasets.py` | Downloads the archives, checks their size and the HASY md5, and extracts each archive into its own directory with tarfile's `data` filter |
| `glyphs.py` | Parses MathWriting InkML glyphs (X/Y only, since the third channel is time) and HASYv2 crops |
| `solutions.py` | Line-by-line solutions for the five problems in `data/problems.ts`, plus mutations with an `errorKey`, a first-error line and the wrong token |
| `render.py` | Lays out glyphs (sub/superscripts, jitter, one glyph per character per case), draws constant-width strokes, and tracks ink boxes |
| `generate_cases.py` | Method 1: alternates correct and mutated cases across the problems, so any `--count` prefix stays balanced |
| `run_eval.py` | Posts the cases and writes a CSV with classification, false accusation, missed error, errorKey match, line and token bbox IoU, latency and `x-request-id` |
| `transcribe.py` | Method 2: filters MathWriting by ramp vocabulary, gets `observed` through the debug header, and reports confusion pairs |

## Label fields

`correct`, `errorKey` (plus `acceptErrorKeys` for mistakes that fit two keys), `firstErrorLine` (1-based), `bbox` (ink of the whole first-error line, 0–1 fractions), `tokenBbox` (just the wrong term), `lines[]` with per-line boxes, and `imageSha256` so the runner can detect a PNG that no longer matches its label.

## Caveats

- Each line mixes glyphs from many writers. The excerpt has only about 320 MathWriting glyphs, so HASYv2 fills the gaps after skeletonizing to the same pen width. Some HASY digits are hard to read, for example an 8 that looks like a b. Use this set for localization and first-error accuracy, not as evidence that a model reads real handwriting.
- The 1.5 MB excerpt yields only about 27 method-2 expressions, mostly not physics. For a meaningful confusion table, download the full 2.9 GB archive and pass `--mathwriting <root>`.
- `transcribe.py` aligns characters with difflib after a LaTeX-to-plain conversion. If the model wraps its transcription in prose, that adds noise, so read the `observedRaw` field in the report.
- Licensing: MathWriting is CC BY-NC-SA and HASYv2 is ODbL. Never commit or publish the rendered PNGs.
