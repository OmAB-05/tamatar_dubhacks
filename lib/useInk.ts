"use client";

import { useCallback, useReducer } from "react";
import type { Stroke } from "./types";

// Stroke list with undo/redo history. Every change is a snapshot, so erase, clear and
// undo all compose without special cases.

type State = { past: Stroke[][]; present: Stroke[]; future: Stroke[][] };
type Action =
  | { type: "commit"; strokes: Stroke[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; strokes: Stroke[] };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "commit":
      return { past: [...s.past, s.present].slice(-100), present: a.strokes, future: [] };
    case "undo":
      if (!s.past.length) return s;
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
    case "redo":
      if (!s.future.length) return s;
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    case "reset":
      return { past: [], present: a.strokes, future: [] };
  }
}

export function useInk(initial: Stroke[] = []) {
  const [s, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] });
  return {
    strokes: s.present,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
    commit: useCallback((strokes: Stroke[]) => dispatch({ type: "commit", strokes }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    clear: useCallback(() => dispatch({ type: "commit", strokes: [] }), []),
    reset: useCallback((strokes: Stroke[]) => dispatch({ type: "reset", strokes }), []),
  };
}

export type Ink = ReturnType<typeof useInk>;
