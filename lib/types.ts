// Shared contracts (planning/product/context.md §6). DO NOT change without telling the team.

// ---------- Ink ----------
export type Point = [x: number, y: number, pressure: number];
export type Stroke = { id: string; points: Point[]; tool: "pen" | "eraser" };

// ---------- Problems ----------
export type ProblemPart = "fbd" | "equations";

export type Problem = {
  id: string;
  title: string; // "Block on a frictionless ramp"
  text: string; // full problem statement
  givenValues: Record<string, string>; // { m: "5 kg", θ: "30°" }
  checkToken?: string; // Server-signed reference for imported homework.
  diagramSvg?: string; // optional inline SVG of the setup
  type: "inclined_plane";
  reference: {
    fbd: string; // expected forces + directions, plain text
    equations: string; // expected step-by-step solution
    finalAnswer: string; // "a = 4.9 m/s² down the ramp"
  };
};

// ---------- Check ----------
export type HelpLevel = 0 | 1 | 2 | 3; // Mark | Hint | Explain | Answer

export type CheckRequest = {
  imageBase64: string; // PNG, no data: prefix
  problemId: string;
  part: ProblemPart;
  problemToken?: string;
  isFinal?: boolean; // true when triggered by circle-to-finish
};

export type BBox = { x: number; y: number; w: number; h: number }; // fractions 0–1 of the image

export type CheckResponse = {
  correct: boolean;
  errorStep: string | null; // "Normal force drawn vertical"
  bbox: BBox | null; // where to draw the red circle
  mark: string | null; // ≤ 6 words, shown in red
  hint: string | null; // level 1
  explanation: string | null; // level 2
  fullSolution: string | null; // level 3
  errorKey: string | null; // stable id for the mistake, used by the tomato
};

// ---------- Extract ----------
export type ExtractResponse = { problems: Problem[]; unsupported: string[] };

// ---------- Tomato ----------
export type TomatoState = 0 | 1 | 2 | 3; // fresh | bruised | wilting | rotten
