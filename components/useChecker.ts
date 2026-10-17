"use client";

import { useCallback, useRef, useState } from "react";
import { checkWork, MOCK } from "@/lib/api";
import { bboxOf, distToStroke, exportPng } from "@/lib/ink";
import { useStore } from "@/lib/store";
import type { CheckResponse, HelpLevel, Problem, ProblemPart, Stroke } from "@/lib/types";

export type CheckState = {
  result: CheckResponse | null;
  key: number;
  stale: boolean;
  dimmed: boolean;
  attempts: number;
};

/** The last stroke plus any stroke touching it (an arrow's shaft and head, a whole word). */
function lastGroup(strokes: Stroke[]): Stroke[] {
  const last = strokes[strokes.length - 1];
  if (!last) return [];
  return strokes.filter((s) => s === last || s.points.some(([x, y]) => distToStroke(last, x, y) < 28));
}

const EMPTY: CheckState = { result: null, key: 0, stale: false, dimmed: false, attempts: 0 };

/**
 * Check → thinking → red pen, for one board (§3.4–3.6). Also counts help reveals for the
 * tally: going up the ladder adds tallies, going down hides content but keeps them.
 */
export function useChecker(opts: { problem: Problem | null; part: ProblemPart | "board"; level: HelpLevel }) {
  const store = useStore();
  const [st, setSt] = useState<CheckState>(EMPTY);
  const [thinking, setThinking] = useState(false);
  const [hints, setHints] = useState(0);
  const revealed = useRef(0);
  const run = useRef(0);

  const countReveal = useCallback((level: HelpLevel, hasMistake: boolean) => {
    if (!hasMistake) return;
    if (level > revealed.current) {
      setHints((h) => h + level - revealed.current);
      revealed.current = level;
    }
  }, []);

  const check = useCallback(
    async (strokes: Stroke[], isFinal = false) => {
      if (!strokes.length || thinking) return null;
      const id = ++run.current;
      setThinking(true);
      setSt((s) => ({ ...s, stale: false, dimmed: false }));
      store.react("lean");
      // Mock mode: circle the most recent mark, like a TA would circle the newest line.
      const bbox = bboxOf(lastGroup(strokes));
      const imageBase64 = MOCK ? "" : await exportPng(strokes);
      const res = await checkWork(
        { imageBase64, problemId: opts.problem?.id ?? "board", part: opts.part === "board" ? "equations" : opts.part, isFinal },
        { problem: opts.problem, part: opts.part, attempt: st.attempts, bbox },
      );
      if (id !== run.current) return null; // superseded
      setThinking(false);
      revealed.current = 0;
      countReveal(opts.level, !res.correct);
      setSt((s) => ({ result: res, key: s.key + 1, stale: false, dimmed: false, attempts: s.attempts + 1 }));
      store.applyCheck(res);
      return res;
    },
    [thinking, store, opts.problem, opts.part, opts.level, st.attempts, countReveal],
  );

  const reset = useCallback((next?: CheckState) => {
    run.current++;
    setThinking(false);
    revealed.current = 0;
    setSt(next ?? EMPTY);
  }, []);

  return {
    ...st,
    state: st,
    thinking,
    hints,
    check,
    reset,
    countReveal,
    markStale: () => setSt((s) => (s.result && !s.stale ? { ...s, stale: true } : s)),
    dim: () => setSt((s) => (s.result && !s.dimmed ? { ...s, dimmed: true } : s)),
  };
}
