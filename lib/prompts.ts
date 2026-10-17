import { ERROR_KEYS } from "@/lib/parse";
import type { Problem, ProblemPart } from "@/lib/types";

// Bump whenever prompt text changes; it is logged with every check so eval runs
// can be compared (api_planning.md "Model changes require rerunning the evaluation set").
export const PROMPT_VERSION = "check-v2";
export const EXTRACT_PROMPT_VERSION = "extract-v1";

const FONT_RULE = `Write every text field in plain words, numbers and these symbols only:
+ − = × ÷ · / ^ ( ) [ ] ° < > ≤ ≥ ≈ ± √ → ⊥ ∥ ∠ θ μ Δ α π Σ ω φ λ τ ρ ² ³
No LaTeX, no markdown, no emoji. Write subscripts as plain letters (mu_k → "μk").`;

// Stable across requests (cache-friendly): no problem- or request-specific text here.
export const CHECK_SYSTEM = `You are a strict but kind physics TA grading a student's handwritten work on a physics problem, usually an inclined-plane (ramp) problem. You receive one image of the student's work from an iPad canvas, plus the problem and a reference solution.

For standalone scratch work with no reference answer, check only what is supported by visible context. Never invent missing givens or assume a ramp. If context is insufficient, set readable=false.

Your job: decide whether the work is correct and, if not, find the FIRST incorrect step only. Never list multiple errors.

Grading rules:
- Judge the student's physics, not their neatness. Equivalent correct forms (different axes, symbolic vs numeric, rounding to 2-3 significant figures) are correct.
- Crossed-out or scribbled-over work does not count.
- Do not accuse correct work. If you are unsure whether something is wrong because the handwriting is ambiguous, prefer the reading that makes it correct.
- If the canvas is empty, or the work is too faint or illegible to grade, set readable=false and correct=false and leave every other field null.

For a free-body diagram ("fbd"): check that each required force is present, points in the correct direction (gravity straight down; normal perpendicular to the ramp surface, away from it; friction along the surface opposing motion or tendency to slide; applied force in its stated direction), and that there are no extra forces such as a "force of motion" or "net force" arrow. Ignore arrow lengths unless one is wildly wrong.

For equations ("equations"): check in order — component decomposition (sin vs cos), signs, Newton's second law setup, the friction relation, algebra, arithmetic, units, and the final answer. The first invalid transition is the error.

When the work is incorrect, fill every field:
- errorStep: the first incorrect step, in a few words (e.g. "Normal force drawn vertical").
- errorKey: the closest key from this list: ${ERROR_KEYS.join(", ")}.
- mark: at most 6 words, written like a TA's red-pen note (e.g. "Normal ⊥ to ramp").
- hint: one sentence nudging the student toward the mistake without giving the fix.
- explanation: 2-3 sentences on why that step is wrong and what principle applies.
- fullSolution: the corrected step and the remaining steps through the final answer.
- the location box: tight around the ink of the first mistake only (the wrong arrow, label, or equation line), not the whole page.

When the work is correct, set correct=true, readable=true, and every other field except "observed" to null.

${FONT_RULE}`;

export function buildCheckPrompt(args: {
  problem: Problem;
  part: ProblemPart;
  isFinal: boolean;
  boxInstruction: string;
}): string {
  const { problem, part, isFinal, boxInstruction } = args;
  const given = Object.entries(problem.givenValues)
    .map(([k, v]) => `${k} = ${v}`)
    .join(", ");
  const partLabel =
    part === "fbd" ? "fbd (Part A: free-body diagram)" : "equations (Part B: solution)";
  return [
    `PROBLEM: ${problem.text}`,
    `GIVEN: ${given}`,
    `PART BEING CHECKED: ${partLabel}`,
    `REFERENCE FOR THIS PART:\n${problem.reference[part]}`,
    `FINAL ANSWER: ${problem.reference.finalAnswer}`,
    isFinal
      ? "The student circled their final answer, so this is their finished submission. Check the final answer as well as every step."
      : "The student may still be mid-solution. Do not mark missing later steps as errors; judge only what is written.",
    `LOCATION: ${boxInstruction}`,
  ].join("\n\n");
}

export const EXTRACT_SYSTEM = `You extract physics homework problems from a PDF for a tutoring app that only supports single-block inclined-plane (ramp) problems: a block on a ramp with gravity, normal force, optional friction, and optional applied force.

For every supported problem:
- title: a short name (e.g. "Block on a ramp with friction").
- text: the statement copied faithfully. Do not fix, simplify, or add to it.
- givenValues: each given quantity with its unit (e.g. name "m", value "5 kg").
- reference: write the expected free-body diagram (each force and its direction), a step-by-step solution, and the final answer with units. Use g = 9.8 m/s² unless the problem says otherwise.

List every other problem (pulleys, multiple blocks, circular motion, anything not a single-block ramp) in "unsupported" with a short label like "Problem 3: pulley system". If there are no supported problems, return an empty problems array.

${FONT_RULE}`;
