import type { Homework } from "@/data/problems";
import type { Problem, ProblemPart } from "./types";

// Which parts a problem asks for, and how far along a student is. One place so the
// home cards, the solve page, the problem list and the PDF export always agree.

export type PartProgress = { fbd: boolean; equations: boolean };

export const partsOf = (p: Problem): ProblemPart[] => (p.parts?.length ? p.parts : ["fbd", "equations"]);
export const hasDiagram = (p: Problem) => partsOf(p).includes("fbd");

export function isDone(p: Problem, pr: PartProgress | undefined): boolean {
  return !!pr && partsOf(p).every((part) => pr[part]);
}

/** Done problems, plus finished parts as a fraction, for the progress bar. */
export function worksheetProgress(hw: Homework, progress: Record<string, PartProgress>) {
  let parts = 0;
  let partsDone = 0;
  let done = 0;
  for (const p of hw.problems) {
    const pr = progress[p.id];
    for (const part of partsOf(p)) {
      parts++;
      if (pr?.[part]) partsDone++;
    }
    if (isDone(p, pr)) done++;
  }
  return { done, total: hw.problems.length, fraction: parts ? partsDone / parts : 0, started: partsDone > 0 };
}
