import type { BBox, CheckResponse, Problem, ProblemPart } from "./types";

// Mock CheckResponses (NEXT_PUBLIC_MOCK=1). The first check of each part finds the
// classic mistake; the next one passes, so the full demo flow can be walked on mock data.

const CORRECT: CheckResponse = {
  correct: true,
  errorStep: null,
  bbox: null,
  mark: null,
  hint: null,
  explanation: null,
  fullSolution: null,
  errorKey: null,
};

export function mockCheck(opts: {
  problem: Problem | null;
  part: ProblemPart | "board";
  attempt: number;
  bbox: BBox | null;
}): CheckResponse {
  const { problem, part, attempt, bbox } = opts;
  if (attempt > 0 || !bbox) return { ...CORRECT, bbox };

  if (part === "fbd")
    return {
      correct: false,
      errorStep: "Normal force drawn vertical",
      bbox,
      mark: "normal force goes out of the ramp",
      hint: "which way does the ramp push on the block?",
      explanation:
        "A surface always pushes straight out of itself. The ramp is tilted by θ, so the normal force is tilted by θ from vertical too, pointing away from the ramp, not straight up.",
      fullSolution: problem?.reference.fbd ?? null,
      errorKey: "normal_force_direction",
    };

  if (part === "equations")
    return {
      correct: false,
      errorStep: "Used cos θ for the component along the ramp",
      bbox,
      mark: "sin θ along the ramp, not cos",
      hint: "which part of gravity points along the ramp?",
      explanation:
        "Along the ramp, gravity pulls with mg sin θ, not mg cos θ. The cos θ part pushes into the ramp and is balanced by the normal force.",
      fullSolution: problem ? `${problem.reference.equations}\n→ ${problem.reference.finalAnswer}` : null,
      errorKey: "sin_cos_swap",
    };

  return {
    correct: false,
    errorStep: "First slip on the page",
    bbox,
    mark: "rewrite that line",
    hint: "check the units on this line",
    explanation: "This line changes units halfway through. Carry the units with every number and the slip shows up on its own.",
    fullSolution: null,
    errorKey: "units",
  };
}

export const THINKING_COPY = ["reading your handwriting…", "checking your arrows…", "looking for the first slip…"];
