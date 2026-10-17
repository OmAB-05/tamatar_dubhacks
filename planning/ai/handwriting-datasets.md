# Handwriting datasets for tamatar.si

[Planning index](../README.md) · [Project context](../product/context.md) · [AI/API plan](api_planning.md)

Research date: October 17, 2026. Based on `context.md`: iPad Pencil input, inclined-plane free-body diagrams, handwritten equations, and red-pen feedback on the first incorrect step.

## Recommendation

Start with **MathWriting for equation transcription**, **HASYv2 for a small isolated-symbol baseline**, and **CROHME for symbol grouping and mathematical layout**. Add a text dataset only if reading written explanations becomes necessary. Collect your own ramp examples for free-body diagrams and grading.

Training a recognizer can replace the handwriting-reading part of the API pipeline. It does not, by itself, learn which force is missing or why a student's algebra is wrong. A fully self-hosted version needs recognition, diagram interpretation, and a physics checker. For your five fixed ramp problems, the checker could initially be explicit rules plus symbolic algebra.

The recommendations and implementation plan below are engineering judgments, not measured results. Dataset sizes and terms come from the linked sources. Source pages were checked; full archives were not downloaded or inspected, and no model was trained.

## Highest-priority datasets

### 1. MathWriting — strongest match for handwritten equations

- **Contains:** 229,864 human training expressions, 15,674 validation expressions, 7,644 test expressions; another 396,014 synthetic training expressions and 6,423 extracted glyphs.
- **Format:** InkML pen strokes with x/y/time and LaTeX labels. Use `normalizedLabel` for expressions and `label` for the isolated `symbols/` samples. Rasterize strokes if training an image model.
- **Access:** [Google's repository](https://github.com/google-research/google-research/tree/master/mathwriting) links a 2.9 GB archive, a 1.5 MB excerpt, and a Colab example.
- **Terms:** Data CC BY-NC-SA 4.0; repository code Apache 2.0. The archive separately describes Wikipedia-derived expression labels under CC BY-SA 4.0.
- **Fit:** Equation transcription with fractions, superscripts, subscripts, variables, and mathematical structure. Good match to digital Pencil input.
- **Limits:** Human expression inks do not include full symbol segmentation. Synthetic layout boxes are not annotations of human expression inks. Writer IDs are not released; keep supplied splits, which are not completely writer-disjoint.

Sources: [technical description](https://github.com/google-research/google-research/blob/master/mathwriting/archive_readme.md), [access and licensing](https://github.com/google-research/google-research/blob/master/mathwriting/README.md).

### 2. CROHME 2023 — mathematical layout and symbol-to-stroke annotations

- **Contains:** Earlier CROHME collections, new 2023 samples, artificial training ink, and OffHME image data. Counts depend on modality and subset; this is not one homogeneous image corpus.
- **Format:** Online InkML with traces, MathML and LaTeX; offline PNG; symbol-level label graphs (SymLG). The bimodal task combines ink and images where available.
- **Access:** [Official Zenodo record](https://zenodo.org/records/8428035), `CROHME23.zip`, listed as 1.8 GB.
- **Terms:** The retrieved page had a License heading but did not expose a readable license value. Check archive terms before incorporating into training; do not assume unrestricted use.
- **Fit:** Learn symbol grouping and spatial relationships such as superscript, subscript, and fraction structure. Especially relevant to retaining geometry for red-pen overlays.
- **Limits:** Releases overlap. Do not pool all years and randomly re-split, which can leak benchmark examples. An expression recognizer still needs page/line segmentation.

Sources: [2023 release](https://zenodo.org/records/8428035), [organizers' data/tools overview](https://cs.rit.edu/~dprl/software.html).

### 3. HASYv2 — broad isolated mathematical symbols

- **Contains:** About 168k samples across 369 classes, including letters, digits, mathematical symbols, brackets, and arrows.
- **Format:** 32×32 black-and-white PNG crops; CSV labels and predefined evaluation folds.
- **Access:** [Author's Zenodo archive](https://zenodo.org/records/259444), 34.6 MB; [loader and dataset instructions](https://github.com/MartinThoma/HASY).
- **Terms:** The author's paper states **ODbL**. Do not confuse the paper's own CC BY license with the dataset license.
- **Fit:** Small CNN baseline for individually cropped symbols; useful for ramp vocabulary and confusing pairs.
- **Limits:** No equation structure. Reliable writer-independent splitting is difficult because user IDs do not consistently identify writers. Most source samples came from Detexify, so these are not independent corpora.
- **Count discrepancy:** Paper reports 168,233 instances; current repository README lists 168,236 PNGs. Count the downloaded release before recording an exact training size.

Sources: [author's paper, including license and class list](https://arxiv.org/html/1701.08380), [repository](https://github.com/MartinThoma/HASY).

### 4. EMNIST — letters and digits

- **Contains:** ByClass has 814,255 samples and 62 classes. Balanced has 131,600 samples and 47 classes. Letters has 145,600 samples and 26 classes.
- **Format:** 28×28 images; MNIST-style binary and MATLAB formats.
- **Access:** [NIST's official dataset page](https://www.nist.gov/itl/products-and-services/emnist-dataset) links downloads.
- **Terms:** The reviewed landing page does not state a specific dataset license; verify the distribution README. Its README link could not be decoded by the browsing tool.
- **Fit:** Easy alphanumeric classifier baseline. Choose **ByClass** if distinguishing uppercase and lowercase matters for physics variables.
- **Limits:** No Greek, math operators, words, or layout. Letters merges case; Balanced merges some classes. Verify orientation and class mappings using rendered samples before training.

Source: [NIST](https://www.nist.gov/itl/products-and-services/emnist-dataset).

### 5. HME100K — real handwritten equation images

- **Contains:** 99,109 equation images, with 74,502 training and 24,607 test images; 245 symbol classes.
- **Format:** JPG images and TXT expression annotations.
- **Access:** [TAL's official page](https://ai.100tal.com/dataset), which lists a 728.8 MB download. The authors' [SAN repository](https://github.com/tal-tech/SAN) points to that page.
- **Terms:** No explicit dataset reuse license was visible on the retrieved landing page. Treat licensing as unresolved rather than adopting a mirror's license label.
- **Fit:** Image-based equation recognition and robustness to real handwriting.
- **Limits:** No original stroke stream. Download-button behavior and archive contents were not verified. Create validation data from training only; keep the provided test set untouched.

Source: [official dataset specification](https://ai.100tal.com/dataset).

## Words, lines, and written explanations

### 6. BRUSH — stylus-written text with point-level character labels

- **Contains:** 27,649 online handwriting samples from 170 writers in the refined release.
- **Format:** Target text, x/y/end-of-stroke sequences, and per-point character assignments. Writer-specific folders; compressed Python pickle files.
- **Access:** [Brown's repository](https://github.com/brownvc/decoupled-style-descriptors#brush-dataset) links the refined archive, listed as 566.6 MB.
- **Terms:** Noncommercial research only; other uses require contacting the authors.
- **Fit:** Particularly useful for training a stroke-based text recognizer and recovering the ink associated with a character.
- **Limits:** Text rather than mathematical layout. Keep all resamplings of the same drawing in one split. The repository separately marks its pretrained generation model unavailable; this does not establish that the data archive is unavailable.

Source: [dataset specification and terms](https://github.com/brownvc/decoupled-style-descriptors#brush-dataset).

### 7. GNHK — English handwriting in real photographs

- **Contains:** Unconstrained camera-captured English handwriting for text localization and recognition.
- **Format:** Document images and text-localization annotations; consult release documentation for the exact annotation schema.
- **Access:** [Official Goodnotes repository](https://github.com/GoodNotes/GNHK-dataset).
- **Terms:** CC BY 4.0 according to the official repository.
- **Fit:** Useful if homework photography becomes an input, particularly for detecting text regions before recognition.
- **Limits:** Less representative of your clean digital canvas. The repository's `goodnotes.com/gnhk/` dataset page redirected to the Goodnotes homepage during this research, so the current official archive route remains unresolved.

Source: [official repository and terms](https://github.com/GoodNotes/GNHK-dataset).

### 8. CVL — cursive English/German text and word boxes

- **Contains:** 310 writers copying a small set of texts: six English and one German.
- **Format:** 300 dpi RGB page images, cropped handwritten pages, word bounding boxes in XML, and writer IDs.
- **Access:** [TU Wien's official page](https://cvl.tuwien.ac.at/research/cvl-databases/an-off-line-database-for-writer-retrieval-writer-identification-and-word-spotting/) includes download resources.
- **Terms:** CC BY-NC 3.0; page specifies noncommercial research only.
- **Fit:** Word recognition and testing generalization to held-out writers.
- **Limits:** Repeated passages give limited language diversity; punctuation is excluded from word boxes. Not a mathematics dataset.

Source: [official CVL description and terms](https://cvl.tuwien.ac.at/research/cvl-databases/an-off-line-database-for-writer-retrieval-writer-identification-and-word-spotting/).

### 9. IAM — established English handwriting candidate, currently access-blocked

- **Purpose:** Word and line recognition; worth revisiting for handwritten explanations.
- **Access:** [Official IAM landing page](https://fki.tic.heia-fr.ch/databases/iam-handwriting-database) and [download page](https://fki.tic.heia-fr.ch/databases/download-the-iam-handwriting-database). Repeated official-page requests failed during this research.
- **Verification status:** Current download requirements and terms could not be confirmed directly. Do not treat third-party copies as a substitute for verifying the original terms.
- **Related candidate:** [IAM-OnDB](https://fki.tic.heia-fr.ch/databases/iam-on-line-handwriting-database) provides the online handwriting counterpart; its official page also failed to load.
- **Fit:** General English transcription, not a standalone solution to equations or FBDs.

## Additional sources worth keeping

### 10. Detexify — raw strokes for LaTeX symbols

The [maintainer's data repository](https://github.com/kirel/detexify-data) links a Google Drive collection and states ODbL terms. It contains instructions rather than the data itself. [The maintainer explains](https://gist.github.com/kirel/149896) the stroke representation as sequences of x/y/timestamp points. Useful for a stroke-based isolated-symbol model. It substantially overlaps HASY's source material; deduplicate before combining or evaluating. Current archive size and class coverage were not verified.

### 11. DIDI — digital-ink diagrams

[Google's official release](https://github.com/google-research/google-research/tree/master/didi_dataset) provides digital diagram strokes in NDJSON and prompts in PNG/DOT/XDOT, with a visualization/conversion notebook. Data CC BY 4.0; code Apache 2.0. Useful as auxiliary material for diagram recognition experiments. **It is not a labeled free-body-diagram grading corpus**, so it does not directly teach correct normal/friction directions or missing-force errors.

### 12. IIIT-HWS — synthetic handwritten words

The [authors' HWNet page](https://cvit.iiit.ac.in/research/projects/cvit-projects/hwnet) describes nine million synthetic handwritten word images and links code and data. Potential text pretraining supplement, not nine million real human examples. Licensing and the linked archive's current accessibility were not verified. Lower priority than equation data for this project.

## A practical path to your own model

### Smallest useful training experiment

1. **Choose the input unit first.** An isolated-symbol classifier needs symbol crops or grouped strokes. It cannot consume a whole solution page and directly return the transcription. An equation model needs one expression per sample.
2. **Start narrow:** train a small CNN on a HASY subset covering your ramp symbols, or fine-tune an equation recognizer using rendered MathWriting expressions. Avoid promising that full-page math OCR trained from scratch will be reliable within the hackathon.
3. **Collect local evaluation data before optimizing:** proposed starting target is 100–200 equation crops and 50–100 FBDs from multiple people on the actual iPad. These are pilot targets, not a claim of sufficient training data. Hold out entire writers and sessions where possible.
4. **Measure the product task:** exact equation transcription, symbol confusion, latency on target hardware, and correct error location. For text, report character/word error rate; for FBDs, report force detection and direction error separately.
5. **Only then expand** to more public data, augmentation, and larger models. A high isolated-symbol accuracy does not establish good equation or page recognition.

For general text, Microsoft's [TrOCR handwritten checkpoint](https://huggingface.co/microsoft/trocr-base-handwritten) is a starting point for self-hosted inference/fine-tuning. Its model card targets single text-line images and describes IAM fine-tuning. It is not a math-layout or diagram recognizer. Review checkpoint terms separately from dataset terms.

### Architecture for a constrained API-free ramp checker

`ink → region/line grouping → symbol or expression recognition → structured equations / force geometry → ramp rules + algebra → CheckResponse`

- Preserve original stroke IDs and bounding boxes through grouping; map recognized regions back to the canvas for red marks.
- For Part A, detect the block/ramp, arrow tails and heads, force labels, and directions. Compare gravity with vertical, normal with the ramp perpendicular, and friction with the relevant motion tendency. Handwriting recognition only supplies the labels.
- For Part B, parse equations into an expression tree and compare steps with the reference solution while tracking units, signs, domains, and assumptions. Equivalent expressions need normalization. The earliest invalid transition is the grading target.
- Have an uncertainty path: ask for a clearer symbol or transcription correction instead of marking correct physics wrong because OCR misread it.
- A lightweight model may run in-browser after export and target-device testing; larger equation models may need a self-hosted inference service. Hosting your own recognizer removes reliance on a third-party OCR API even if inference runs on a server.
- Keep the existing shared `CheckRequest` / `CheckResponse` contracts while experimenting. Stroke-based inference would need an agreed internal adapter or a team-approved request extension; `context.md` explicitly reserves shared-contract changes for coordination.

### What to collect yourselves

Prioritize `F`, `N`, `m`, `g`, `a`, `θ`, `μ`, digits, `+ − =`, parentheses, `sin`, `cos`, subscripts, units, and vector arrows. Add `Σ`, `Δ`, `√`, `≤ ≥`, and further Greek symbols as scope expands. Check each public dataset's label inventory rather than assuming every requested glyph is represented.

For FBDs, label correct diagrams and common errors: vertical normal, wrong friction direction, missing gravity, extra force of motion, and incorrect components. Store force class, associated stroke IDs, arrow endpoints, label transcription, region box, and correctness rationale.

Keep raw pen strokes plus a rendered image. Existing `Point` is `[x, y, pressure]`; MathWriting's third coordinate is time, **not pressure**. Never reinterpret one as the other. Normalize coordinates while retaining the transform back to canvas space; capture time separately if later needed.

### Data preparation details that matter

- Keep provenance, original labels, normalized labels, source release, and source terms with each sample. Separate incompatible label inventories rather than blindly merging class IDs.
- Retain original splits. Keep synthetic descendants and augmented versions of a sample in the training partition only. MathWriting symbols come from its training partition; HASY and Detexify share source data.
- Normalize LaTeX internally, then convert to the UI's supported Myfont symbols. Training labels need not be restricted to the presentation font's vocabulary.
- Use modest thickness, translation, scale, and slant augmentation. Avoid rotations or flips that change symbol meaning or force direction. Keep aspect ratio and enough resolution to preserve subscripts.
- Do not train only on images rendered with Myfont: one font cannot represent real writer variation. Use it only as a supplementary synthetic source if appropriate.
- Retain untouched real iPad evaluation samples. Public benchmark performance alone will not establish that the model handles your drawing tools, erasures, answer circles, or mixed diagrams/equations.

## First acquisition order

1. MathWriting's small excerpt to inspect the format and label vocabulary.
2. HASYv2 for an isolated-symbol prototype, after reviewing ODbL terms.
3. Full MathWriting for expression training, within its stated data terms.
4. CROHME after confirming the archive's reuse terms, especially if symbol layout supervision is needed.
5. BRUSH for digital text, or GNHK/CVL for image-based text, only if that scope is needed.

No archive downloads, app changes, or training jobs were started as part of this research.
