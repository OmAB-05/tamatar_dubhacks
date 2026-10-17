import type { Point } from "./types";

// Closed-loop detection for "circle your answer to finish" (ui_planning.md §3.3).

function measure(points: Point[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, length = 0;
  points.forEach(([x, y], i) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    if (i) length += Math.hypot(x - points[i - 1][0], y - points[i - 1][1]);
  });
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  return { x0, y0, x1, y1, length, diag, gap: Math.hypot(ex - sx, ey - sy), w: x1 - x0, h: y1 - y0 };
}

/** While drawing: is the stroke curving back toward where it started? */
export function isCurvingBack(points: Point[]): boolean {
  if (points.length < 12) return false;
  const m = measure(points);
  return m.diag > 50 && m.length > m.diag * 1.4 && m.gap < m.diag * 0.5 && Math.min(m.w, m.h) > m.diag * 0.25;
}

/** On pen-up: is it a closed loop? Returns its box in board units, or null. */
export function closedLoop(points: Point[]) {
  if (points.length < 12) return null;
  const m = measure(points);
  const round = Math.min(m.w, m.h) > m.diag * 0.25;
  if (m.diag > 50 && round && m.length > m.diag * 1.7 && m.gap < m.diag * 0.3)
    return { x: m.x0, y: m.y0, w: m.w, h: m.h };
  return null;
}
