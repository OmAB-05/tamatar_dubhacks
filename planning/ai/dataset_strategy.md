# tamatar.si: using handwriting datasets with the API models

Status: proposal, October 17, 2026. Related: [AI/API plan](api_planning.md), [handwriting datasets](handwriting-datasets.md), [backend plan](../backend/backend_planning.md).

## Decision

**Use the public datasets to make Claude Sonnet 5.5 and Claude Haiku 5.5 better at our task, not to train our own model.** (Updated October 17, 2026: the team uses Claude only, so the comparison is Claude Sonnet 5.5 against Claude Haiku 5.5. Gemini is no longer in the app.) During the hackathon, the datasets do three jobs: build a labeled test set we could not collect by hand in time, find the specific symbols and mistakes each model gets wrong, and calibrate where each model draws its red box. Training is a fallback for one narrow, measured failure, and only after the demo works (see [When training is justified](#when-training-is-justified)).

Why this is the better option for us:

- The hard part of tamatar is *judgment*: finding the first wrong step, deciding that a vertical normal force is wrong. None of the datasets teach that. A trained recognizer would still hand its output to an LLM or to rules we write ourselves.
- The main demo risk is the **bbox**, followed by **false accusations on correct work**. Both can be measured and partly fixed with dataset-derived test cases, without training anything.
- Training something useful (an expression recognizer on MathWriting) takes days of preparation and GPU time. Each of the methods below takes 1 to 3 hours.

## How the datasets plug into the current backend

The scaffolded backend already has the right hooks:

| Hook | Where | What the dataset work feeds it |
| :---- | :---- | :---- |
| Model switch | `AI_CHECK_MODEL=sonnet\|haiku`, [lib/ai/checker.ts](../../lib/ai/checker.ts) | Run the same test set against Sonnet and Haiku |
| Prompt version | `PROMPT_VERSION` in [lib/prompts.ts](../../lib/prompts.ts) | Compare prompt changes on the same cases |
| `observed` transcription field | `checkCoreShape` in [lib/parse.ts](../../lib/parse.ts) | Score transcription separately from grading |
| Bbox conversion | `bboxFromPixels` in [lib/parse.ts](../../lib/parse.ts) | Apply a per-model calibration |
| Stable `errorKey` list | `ERROR_KEYS` in [lib/parse.ts](../../lib/parse.ts) | Label mutated test cases automatically |

Every method below only changes prompts, configuration, or post-processing. The shared `CheckRequest`/`CheckResponse` contract stays the same.

## Five ways to use the datasets (in priority order)

### 1. Synthetic ramp solutions with known errors and known boxes

**Highest value: this directly measures the #1 demo risk.**

Build ramp solutions out of real handwritten glyphs, so we know the exact pixel box of every symbol:

1. Take the five reference solutions in [data/problems.ts](../../data/problems.ts) as line-by-line LaTeX.
2. Write each line with handwritten glyphs: MathWriting's 6,423 extracted `symbols/` glyphs (InkML strokes), plus HASYv2 crops for anything missing. Render the strokes with perfect-freehand settings close to the canvas, on a white 1568 px page.
3. **Mutate** one line per case with a known mistake (`sin_cos_swap`, `sign_error`, `normal_force_equals_mg`, `arithmetic_error`, and so on). Because we placed every glyph ourselves, the first-error line and its **true bbox** come for free.
4. Keep an equal number of **unmutated** cases. These measure false accusations, which are the worst failure for a tutor.

Output: about 100 to 200 labeled PNGs, each with `correct`, `errorKey`, first-error line, and a true box. Hand-labeling that set would take a full day.

Limits: one stitched line mixes glyphs from many writers, so it looks less natural than one student's writing. Use this set for **localization and first-error accuracy**, not as proof that the models read real handwriting.

### 2. A transcription stress test from whole MathWriting expressions

Each MathWriting expression is written by **one person**, so whole expressions are more realistic than stitched glyphs:

1. Filter MathWriting labels (`normalizedLabel`) for ramp vocabulary: `\sin`, `\cos`, `\theta`, `\mu`, `mg`, `=`, fractions, and superscripts.
2. Render each match as an image, send it through the check prompt, and compare the model's `observed` field with the label.
3. Report the **confusion pairs** for each model: θ/0, μ/u, sin/sm, N/H, g/9, ν/v, a minus sign read as a fraction bar, and so on.

This is a cheap way to compare Sonnet and Haiku on reading alone, before spending our own iPad samples on the full comparison in [api_planning.md](api_planning.md).

### 3. Prompt fixes based on the confusion data

Use the results of method 2 to add short, specific rules to `CHECK_SYSTEM`, for example: *"After sin or cos, a round symbol is θ, not 0."* and *"In μk, the first symbol is μ even if it looks like u."* Bump `PROMPT_VERSION` and re-run methods 1 and 2. Keep a rule only if it raises accuracy **and** does not add false accusations.

Optional: a small **glyph legend** image (5 or 6 confusing pairs drawn by several writers, taken from HASY/MathWriting) placed before the student's image, with prompt caching so it costs almost nothing after the first call. Measure it: extra images can also distract the model.

### 4. Per-model bbox calibration

On the synthetic set from method 1, compare each model's box with the true box. Typical patterns to look for: boxes that are consistently too tight, shifted, or that cover the whole line instead of the wrong term. Fit a simple correction for each model (padding plus offset, with a few parameters) and apply it in `bboxFromPixels`. Report IoU before and after.

This replaces the guessed "add 10% padding" in [context.md §8](../product/context.md) with a measured number.

### 5. Transcribe first, then check the algebra in code (stretch)

For Part B, the model already returns `observed`. A later version could ask for one LaTeX line per step, and let code check each step instead of the model: parse it, substitute the givens, and compare with the reference using a small CAS such as mathjs. The model is then used only for reading and localizing, and deterministic code catches arithmetic mistakes. The datasets help here by defining the LaTeX normalization (MathWriting's `normalizedLabel` conventions) and the token vocabulary. This changes the internal flow, but not the shared contract.

## What to run today

| When | Owner | Task | Done when |
| :---- | :---- | :---- | :---- |
| After P0 `/api/check` works | Backend | Download the **MathWriting excerpt (1.5 MB)** and **HASYv2 (34.6 MB)** into `datasets/` (gitignored) and check the formats | A rendered glyph matches our canvas look |
| +1–2 h | Backend | Generator for method 1: 50 cases (25 correct, 25 mutated, across all 5 problems) | PNG + JSON label for each case |
| +1 h | Backend | Eval runner: posts each case to `/api/check` for each model and writes a CSV of correct/first-error/IoU/latency | One table comparing Sonnet and Haiku |
| Evening | Backend | Method 2 confusion test, then method 3 prompt rules, then method 4 calibration | Measurable accuracy or IoU improvement, no new false accusations |
| Before freeze | Everyone | Final check on **real iPad handwriting** (the 50-example set in api_planning.md) | Synthetic results confirmed on real ink |

Synthetic data finds problems quickly, but **only real iPad samples can approve a model or prompt for the demo.**

## When training is justified

Consider training only if all of these are true after methods 1 to 4:

1. A **specific recognition** failure persists. Examples: θ/0 or μ/u confusions above roughly 10% on real ink, even with prompt rules. A reasoning failure does not count.
2. The failure appears on **real iPad samples**, not only on synthetic ones.
3. A dataset covers it and its license fits: HASY (ODbL), or MathWriting (CC BY-NC-SA, non-commercial only).
4. P0 is done and there is time left.

If so, the smallest useful model is a **HASY CNN that breaks ties between a few confusable symbols**. It would run on crops the API already located, and its result would go back into the prompt as a hint. It does not replace the API. A full expression recognizer (MathWriting/CROHME) is a post-hackathon project.

A related option that needs **no training**: in the FBD, the arrows are strokes we already have on the client. Simple stroke geometry (angle of the arrow shaft, location of the arrowhead) could give each arrow's direction to the model as a fact. This needs a team-approved extension to `CheckRequest`, because only the PNG is sent today.

## Licensing and handling

- **MathWriting:** CC BY-NC-SA 4.0. Fine for internal evaluation. Do not publish derived images under a different license, and do not ship them in a commercial product.
- **HASYv2 / Detexify:** ODbL. Give attribution, and any derived *database* must stay ODbL. HASY and Detexify share source data, so remove duplicates before using both.
- **CROHME:** license not yet confirmed. Do not use it until someone reads the archive's terms.
- Keep raw archives and generated sets in `datasets/` (gitignored). Commit only the generator and runner scripts and the small label JSON files.
- MathWriting's third InkML value is **time, not pressure** (see [handwriting-datasets.md](handwriting-datasets.md)). Render with constant pressure.

No datasets were downloaded and no evaluations were run while writing this plan.
