import { z } from "zod";
import { AppError } from "@/lib/errors";
import { normalizeForFont } from "@/lib/font";
import type { BBox, CheckResponse, ExtractResponse, FigureBox, Problem } from "@/lib/types";

// ---------- Requests ----------

export const CheckRequestSchema = z.object({
  imageBase64: z.string().min(1),
  problemId: z.string().min(1).max(100),
  part: z.enum(["fbd", "equations"]),
  isFinal: z.boolean().optional(),
  problemToken: z.string().max(100_000).optional(),
});

// ---------- Error keys ----------

// Stable ids the tamatar state machine keys on. Add new ones here (and tell the UI)
// rather than letting the model invent free-form keys.
export const ERROR_KEYS = [
  // Part A — free-body diagram
  "missing_gravity",
  "gravity_direction",
  "missing_normal_force",
  "normal_force_direction",
  "missing_friction",
  "friction_direction",
  "extra_friction",
  "missing_applied_force",
  "applied_force_direction",
  "extra_force",
  "missing_tension",
  "tension_direction",
  "centrifugal_force",
  // Part B — equations
  "sin_cos_swap",
  "normal_force_equals_mg",
  "wrong_axes",
  "sign_error",
  "missing_force_in_sum",
  "newton_second_law_setup",
  "friction_formula",
  "algebra_error",
  "arithmetic_error",
  "unit_error",
  "final_answer_wrong",
  "wrong_formula",
  "vector_component_error",
  "energy_conservation_misapplied",
  "momentum_conservation_misapplied",
  "torque_error",
  "kinematics_sign_or_axis",
  "other",
] as const;
export type ErrorKey = (typeof ERROR_KEYS)[number];

// ---------- Model output (shared core) ----------

// Fields every provider returns. Each adapter adds its own location field in the
// coordinate convention that model handles best, then converts to BBox.
export const checkCoreShape = {
  observed: z
    .string()
    .describe("Up to 60 words: what the student drew or wrote, in reading order, before judging it."),
  readable: z
    .boolean()
    .describe("false only if the work is too faint, empty, or illegible to grade."),
  correct: z.boolean(),
  errorStep: z.string().nullable().describe("The first incorrect step, in a few words."),
  errorKey: z.enum(ERROR_KEYS).nullable(),
  mark: z.string().nullable().describe("At most 6 words, shown in red next to the circle."),
  hint: z.string().nullable(),
  explanation: z.string().nullable(),
  fullSolution: z.string().nullable(),
};

export type ModelCheck = {
  // The model's transcription. Never part of CheckResponse; the route exposes it
  // only through the dev-only eval debug header (lib/ai/debug.ts).
  observed?: string;
  readable: boolean;
  correct: boolean;
  errorStep: string | null;
  errorKey: ErrorKey | null;
  bbox: BBox | null;
  mark: string | null;
  hint: string | null;
  explanation: string | null;
  fullSolution: string | null;
};

// ---------- Box conversions ----------

const EPS = 0.005;

function boxFromCorners(x0: number, y0: number, x1: number, y1: number): BBox | null {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const right = Math.max(x0, x1);
  const bottom = Math.max(y0, y1);
  if (left < -EPS || top < -EPS || right > 1 + EPS || bottom > 1 + EPS) return null;
  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const w = Math.min(1, right) - x;
  const h = Math.min(1, bottom) - y;
  if (w <= 0 || h <= 0) return null;
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return { x: r(x), y: r(y), w: r(w), h: r(h) };
}

/** Claude: pixel corners in the submitted image. */
export function bboxFromPixels(
  box: { x0: number; y0: number; x1: number; y1: number },
  width: number,
  height: number,
): BBox | null {
  return boxFromCorners(box.x0 / width, box.y0 / height, box.x1 / width, box.y1 / height);
}

// ---------- Semantic validation ----------

const invalid = (msg: string) => new AppError("invalid_model_response", msg, true);

export const MAX_MARK_WORDS = 6;

// A token counts as a word if it has a letter or digit, so standalone operators don't:
// "10 × 9.8 × 0.866 = 84.9" is four words.
const isWord = (token: string) => /[\p{L}\p{N}]/u.test(token);

/**
 * Keep the red-pen mark within MAX_MARK_WORDS by cutting it, instead of failing the
 * whole check: the synthetic eval lost 6 of 25 Sonnet answers on wrong work to an
 * over-long mark, and the retry rarely fixed it.
 */
export function shortenMark(mark: string): string {
  const tokens = mark.trim().split(/\s+/).filter(Boolean);
  let words = 0;
  let end = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (isWord(tokens[i]) && ++words > MAX_MARK_WORDS) {
      end = i;
      break;
    }
  }
  if (end === tokens.length) return tokens.join(" ");
  let kept = tokens.slice(0, end);
  // Prefer ending at the last clause break ("Use N, not mg, …" → "Use N"), as long
  // as at least two words remain, over stopping mid-phrase.
  for (let i = kept.length - 2; i >= 1; i--) {
    if (/[,;:]$/.test(kept[i]) || /^[—–]$/.test(kept[i + 1])) {
      kept = kept.slice(0, i + 1);
      break;
    }
  }
  // Don't leave a dangling operator or connective punctuation at the cut.
  while (kept.length > 1 && !isWord(kept[kept.length - 1])) kept.pop();
  return kept.join(" ").replace(/[,;:]+$/, "");
}

/**
 * Structured JSON is not proof of a usable answer. Enforce the contract's
 * consistency rules, then normalize strings for Myfont.
 */
export function validateCheck(m: ModelCheck): CheckResponse {
  if (!m.readable) {
    throw new AppError("unreadable_input", "The work could not be read clearly enough to check");
  }

  if (m.correct) {
    if (m.errorStep || m.bbox || m.errorKey || m.mark) {
      throw invalid("Marked correct but also reported an error");
    }
    return {
      correct: true,
      errorStep: null,
      bbox: null,
      mark: null,
      hint: null,
      explanation: null,
      fullSolution: null,
      errorKey: null,
    };
  }

  const { errorStep, bbox, mark, hint, explanation, fullSolution, errorKey } = m;
  if (!errorStep || !mark || !hint || !explanation || !fullSolution || !errorKey) {
    throw invalid("Incorrect work is missing one or more feedback fields");
  }
  if (!bbox) throw invalid("Incorrect work is missing a valid bbox");

  return {
    correct: false,
    errorStep: normalizeForFont(errorStep),
    bbox,
    mark: normalizeForFont(shortenMark(mark)),
    hint: normalizeForFont(hint),
    explanation: normalizeForFont(explanation),
    fullSolution: normalizeForFont(fullSolution),
    errorKey,
  };
}

// ---------- Extract ----------

// Provider-facing schema: arrays instead of records, since strict JSON schemas
// handle fixed keys better than open maps.
export const ExtractModelSchema = z.object({
  problems: z.array(
    z.object({
      title: z.string(),
      topic: z.string().describe("Short topic, e.g. 'Kinematics', 'Newton's laws', 'Energy'."),
      text: z.string().describe("The problem statement, copied faithfully."),
      kind: z.enum(["inclined_plane", "general"]).describe("inclined_plane only for a single block on a ramp."),
      needsFreeBodyDiagram: z
        .boolean()
        .describe("true when drawing a free-body diagram is a natural first step (forces on an object)."),
      givenValues: z.array(z.object({ name: z.string(), value: z.string() })),
      figures: z
        .array(
          z.object({
            page: z.number().describe("1-based page (or 1 for a single image) where the figure appears."),
            x0: z.number().describe("Left edge as a fraction 0-1 of the page width."),
            y0: z.number().describe("Top edge as a fraction 0-1 of the page height."),
            x1: z.number().describe("Right edge as a fraction 0-1 of the page width."),
            y1: z.number().describe("Bottom edge as a fraction 0-1 of the page height."),
            caption: z.string().describe("What the figure shows, in a few words."),
          }),
        )
        .describe("Every diagram, graph, table or picture that belongs to this problem. Empty if none."),
      reference: z.object({
        fbd: z.string(),
        equations: z.string(),
        finalAnswer: z.string(),
      }),
    }),
  ),
  unsupported: z
    .array(z.string())
    .describe("One short label per item in the upload that is not a gradable physics problem."),
});
export type ExtractModelOutput = z.infer<typeof ExtractModelSchema>;

export const MAX_EXTRACTED_PROBLEMS = 12;

const frac = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

export function toExtractResponse(raw: ExtractModelOutput): ExtractResponse {
  const kept = raw.problems.filter((p) => p.text.trim() && p.reference.finalAnswer.trim()).slice(0, MAX_EXTRACTED_PROBLEMS);
  const problems: Problem[] = kept.map((p) => ({
    id: `import-${crypto.randomUUID()}`,
    title: normalizeForFont(p.title),
    topic: normalizeForFont(p.topic),
    text: normalizeForFont(p.text),
    givenValues: Object.fromEntries(
      p.givenValues.map((g) => [normalizeForFont(g.name), normalizeForFont(g.value)]),
    ),
    type: p.kind,
    parts: p.kind === "inclined_plane" || p.needsFreeBodyDiagram ? ["fbd", "equations"] : ["equations"],
    reference: {
      fbd: normalizeForFont(p.reference.fbd),
      equations: normalizeForFont(p.reference.equations),
      finalAnswer: normalizeForFont(p.reference.finalAnswer),
    },
  }));
  const figures: FigureBox[] = kept.flatMap((p, problemIndex) =>
    p.figures
      .map((f) => ({
        problemIndex,
        page: Math.max(1, Math.round(f.page)),
        x0: frac(Math.min(f.x0, f.x1)),
        y0: frac(Math.min(f.y0, f.y1)),
        x1: frac(Math.max(f.x0, f.x1)),
        y1: frac(Math.max(f.y0, f.y1)),
        caption: normalizeForFont(f.caption),
      }))
      .filter((f) => f.x1 - f.x0 > 0.02 && f.y1 - f.y0 > 0.02)
      .slice(0, 4),
  );
  return { problems, unsupported: raw.unsupported.map(normalizeForFont), figures };
}
