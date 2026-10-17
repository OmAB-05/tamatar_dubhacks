# tamatar.si — AI models and API plan

Status: proposal, October 17, 2026. Related: [project context](../product/context.md), [backend setup](../backend/backend_planning.md), [handwriting datasets](handwriting-datasets.md).

## Recommendation

Start the demo with a Claude Sonnet vision adapter, consistent with the current context. Test **Claude Sonnet 5.5**, **GPT-6.1 Sol**, and **Gemini 3.8 Flash** on the same real iPad examples before committing to a final model. Sonnet is the initial integration choice, not a demonstrated winner on our task.

In parallel with that product direction, plan a separate custom handwriting experiment: HASY for individual symbols or MathWriting for expressions. Recognition can become self-hosted; checking whether physics is correct remains a distinct task. Do not require the custom model experiment to succeed before the ramp demo works.

Account access, credits, rate limits, actual latency, and task accuracy have not been tested. Model IDs and capabilities below were checked against official documentation; recommendations are engineering judgments.

## What we need models to do

1. **FBD checking:** identify force arrows and labels, interpret directions relative to the ramp, and locate the first mistake.
2. **Equation checking:** read handwritten math, preserve subscripts/units/signs, and identify the first invalid reasoning step.
3. **PDF import:** extract problem statements into our supported ramp schema and flag unsupported problems.
4. **Localization:** return a region that maps to the original ink; correct prose with an incorrect red circle still fails the demo.

The primary comparison must test these together. Generic reasoning benchmarks or OCR character accuracy do not measure this complete product behavior.

## API candidates

### Claude Sonnet 5.5 — initial demo candidate

Use `claude-sonnet-5-5` through the Anthropic Messages API adapter. Official documentation lists image input and positions Sonnet as a speed/intelligence balance. Base listed token rates are $2 input and $10 output per million tokens; full request cost depends on image processing, reasoning, caching, and other billing conditions.

**Why try it:** it matches the planned Claude integration and can attempt diagram interpretation and feedback in a single request. **What to test:** faint pencil, crossed-out work, arrowheads, Greek letters, and bbox quality. No source establishes that it is best at our ramp task. Keep all help fields in one response and validate them on the server.

Sources: [model overview and rates](https://platform.claude.com/docs/en/models/overview), [vision guide](https://platform.claude.com/docs/en/build-with-claude/vision).

### GPT-6.1 Sol — main alternative checker

Use `gpt-6.1-sol` through a separate OpenAI Responses API adapter. The model page lists image input, text output, Structured Outputs, and base text rates of $2 input/$10 output per million tokens. Start with low reasoning effort for the latency experiment; this model does not support `none` or `minimal`. Fine-tuning is not supported according to the model page.

**Why try it:** an alternative implementation of the same visual checking task with schema-constrained output. **What to test:** first-error selection, equivalent algebra, diagram geometry, total latency including reasoning, and actual billed usage. Matching base token rates do not mean equal cost per image or per check.

Sources: [model specification](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [selection guidance](https://developers.openai.com/api/docs/guides/latest-model).

### Gemini 3.8 Flash — speed/cost experiment and PDF candidate

Use `gemini-3.8-flash` in a Google adapter. Its official page lists text/image/PDF input, text output, structured outputs, and low/medium/high thinking. `minimal` is not supported. Google lists it as stable.

**Why try it:** a candidate for interactive checks and document extraction where latency and price matter. **What to test:** the same physics/localization cases, plus PDF statement fidelity. Its marketing positioning does not establish cheaper cost or better latency on our workload; measure both. Confirm current rates on the pricing page before budgeting.

Sources: [model specification](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

### Higher-capacity or smaller models — only after the first comparison

Claude Opus 5.5 or GPT-6 Astra could be evaluated on difficult failures; a smaller model could be evaluated for cheap extraction or routing. They should not become extra calls on every check without measured benefit. Provider positioning is not a substitute for our own task results. [Claude lineup](https://platform.claude.com/docs/en/models/overview), [OpenAI selection guide](https://developers.openai.com/api/docs/guides/latest-model).

## Custom models versus general vision APIs

### Small symbol CNN

Train on a curated subset of HASY/EMNIST and real iPad symbol crops. This offers a manageable first training project and may support local inference. It predicts one symbol per crop/group; another component must segment ink and reconstruct mathematical layout. It cannot directly judge a whole FBD or explain an algebra error.

### Expression recognizer

Train or fine-tune an image-to-LaTeX encoder/decoder, or a stroke-based recognizer, using MathWriting and appropriately licensed CROHME data. This targets complete expressions, including two-dimensional structure. It needs substantially more preparation than digit classification, and must be tested on your actual canvas rendering. Preserve region/stroke mapping to support error localization.

### Text-line recognizer

[Microsoft TrOCR handwritten](https://huggingface.co/microsoft/trocr-base-handwritten) is a self-hostable starting point for ordinary handwritten text lines; its model card describes IAM fine-tuning and single-line use. It is not a drop-in reader for a mixed page of equations and diagrams. Review checkpoint and training-data terms separately.

### Fully self-hosted ramp tutor

Combine recognition with force geometry and explicit physics/algebra checks. For five fixed problems, carefully tested rules may cover common mistakes without a general language model. This needs labeled FBDs and step-level error cases collected for tamatar, not just letter datasets. See the [dataset report](handwriting-datasets.md) for gaps and a pilot collection plan.

Keep API-based, hybrid (custom OCR plus API reasoning), and fully self-hosted variants distinct in evaluation. Report which components actually run locally rather than calling the entire system a trained handwriting model.

## A small, decisive comparison

Create a fixed initial evaluation set of 50 examples across all five ramp problems: 20 FBDs and 30 equation solutions, balanced between correct work and common mistakes. Include normal drawn vertically, missing forces, reversed friction, sin/cos swaps, signs, units, multiple wrong steps, and crossed-out corrections. Use several writers. Keep a separate unreadable-input set, and a separate ten-PDF extraction set if P1 is attempted.

Annotate correctness, the first incorrect step, stable `errorKey`, and a human-drawn region box. Have another teammate review physics labels. Keep tuning examples separate from final evaluation. Use the same original PNGs and reference content for every candidate; adapt provider transport and schemas without giving one model extra hints.

Measure:

- Correct/incorrect classification, particularly **false accusations on correct work**.
- First-error and error-key accuracy.
- Bounding-box overlap and a visual judgment of whether the circle lands on the right ink.
- Hint quality at each help level, including accidental answer leakage.
- Schema-valid response rate, refusal/unreadable handling, and timeout rate.
- End-to-end median/p95 latency and actual billed cost per successful check, including retries.

Repeat at least the latency-sensitive cases to see variability; do not declare a winner from one fast response. Proposed pilot gate: at least 90% correctness/first-error accuracy, useful localization on at least 90% of incorrect cases, zero false accusations on the pilot's correct cases, and p95 below 10 seconds. These are provisional targets and a small pilot cannot establish production reliability. If none passes, narrow the supported input/problem scope before adding complexity.

## Cost comparison method

Record actual input/output usage and any separately reported reasoning/image/cache usage from each provider. Calculate each component using its applicable rate and avoid double-counting image tokens already included in input usage. Include every retry and failed billable attempt. Divide total spend by successful checks; also record failure rate so unreliable cheap calls do not look artificially attractive.

Illustration only: 2,000 billed input tokens plus 600 billed output tokens at $2/$10 per million cost $0.010. This excludes any additional billed usage and is not a forecast of our image requests. Hosting, storage, optional audio, and self-hosted compute are separate. A self-hosted model removes third-party inference charges, not infrastructure cost or maintenance.

Re-check provider pricing when implementing. Do not choose a free tier as the sole judging-time reliability plan or assume chat subscriptions supply API credits.

## Integration and fallback decisions

- Implement one adapter first, keeping the successful shared response unchanged. Select provider/model in server configuration; do not expose a provider picker to students.
- Use provider-supported structured output where available, plus our own schema and semantic validation. For other output modes, parse and retry within a bounded deadline.
- Use problem-specific reference solutions and stable error keys. Keep model output to the Myfont vocabulary at presentation time, without weakening internal math representation.
- Do not switch models merely because a result says the student's work is incorrect. A fallback addresses technical failure; contradictory physics judgments need investigation.
- Add a second production provider only after it passes the same evaluation and an explicit time/cost budget permits fallback. Otherwise preserve ink and show an honest retry state.
- Mock feedback remains a clearly labeled demo simulation. It is never a silent replacement for a failed live check.
- Model changes require rerunning the evaluation set and recording model ID, prompt version, reasoning settings, usage, and results.

## Proposed immediate decision

Integrate Sonnet first; benchmark GPT-6.1 Sol and Gemini 3.8 Flash before final selection. Choose the lowest measured cost/latency candidate that meets the physics and localization gates. Keep the custom symbol/expression model as a separately measured experiment, with a route to hybrid and eventually fully self-hosted grading.

No API calls, account configuration, benchmarks, training, or hosting changes have been performed by writing this plan.
