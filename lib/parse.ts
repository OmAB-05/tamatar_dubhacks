import { z } from "zod";
import { AppError } from "@/lib/errors";
import { normalizeForFont } from "@/lib/font";
import type { BBox, CheckResponse, ExtractResponse, Problem } from "@/lib/types";

// ---------- Requests ----------

export const CheckRequestSchema = z.object({
  imageBase64: z.string().min(1),
  problemId: z.string().min(1).max(100),
  part: z.enum(["fbd", "equations"]),
  isFinal: z.boolean().optional(),
  problemToken: z.string().max(100_000).optional(),
});

// ---------- Error keys ----------

// Stable ids the tomato state machine keys on. Add new ones here (and tell the UI)
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

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
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
  if (wordCount(mark) > 6) throw invalid("mark is longer than 6 words");

  return {
    correct: false,
    errorStep: normalizeForFont(errorStep),
    bbox,
    mark: normalizeForFont(mark),
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
      text: z.string().describe("The problem statement, copied faithfully."),
      givenValues: z.array(z.object({ name: z.string(), value: z.string() })),
      reference: z.object({
        fbd: z.string(),
        equations: z.string(),
        finalAnswer: z.string(),
      }),
    }),
  ),
  unsupported: z
    .array(z.string())
    .describe("One short label per problem in the PDF that is not a single-block inclined-plane problem."),
});
export type ExtractModelOutput = z.infer<typeof ExtractModelSchema>;

export const MAX_EXTRACTED_PROBLEMS = 10;

export function toExtractResponse(raw: ExtractModelOutput): ExtractResponse {
  const problems: Problem[] = raw.problems
    .filter((p) => p.text.trim() && p.reference.finalAnswer.trim())
    .slice(0, MAX_EXTRACTED_PROBLEMS)
    .map((p) => ({
      id: `import-${crypto.randomUUID()}`,
      title: normalizeForFont(p.title),
      text: normalizeForFont(p.text),
      givenValues: Object.fromEntries(
        p.givenValues.map((g) => [normalizeForFont(g.name), normalizeForFont(g.value)]),
      ),
      type: "inclined_plane",
      reference: {
        fbd: normalizeForFont(p.reference.fbd),
        equations: normalizeForFont(p.reference.equations),
        finalAnswer: normalizeForFont(p.reference.finalAnswer),
      },
    }));
  return { problems, unsupported: raw.unsupported.map(normalizeForFont) };
}
