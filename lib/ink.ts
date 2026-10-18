import { getStroke } from "perfect-freehand";
import type { BBox, Point, Stroke } from "./types";

/** Logical board size. Strokes are stored in these units so they scale with the board. */
export const BOARD_W = 1000;
export const BOARD_H = 640;

export const PEN_OPTIONS = {
  size: 7,
  thinning: 0.55,
  smoothing: 0.5,
  streamline: 0.4,
  last: true,
};

export const newId = () => Math.random().toString(36).slice(2, 10);

const avg = (a: number, b: number) => (a + b) / 2;

/** perfect-freehand outline → SVG path (from the library's README). */
export function outlineToPath(points: number[][]): string {
  const len = points.length;
  if (len < 4) return "";
  let a = points[0];
  let b = points[1];
  const c = points[2];
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0]).toFixed(2)},${avg(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    d += `${avg(a[0], b[0]).toFixed(2)},${avg(a[1], b[1]).toFixed(2)} `;
  }
  return d + "Z";
}

export function strokePath(points: Point[], simulatePressure = false): string {
  return outlineToPath(getStroke(points, { ...PEN_OPTIONS, simulatePressure }));
}

export function bboxOf(strokes: Stroke[]): BBox | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes)
    for (const [x, y] of s.points) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  if (!isFinite(x0)) return null;
  return { x: x0 / BOARD_W, y: y0 / BOARD_H, w: (x1 - x0) / BOARD_W, h: (y1 - y0) / BOARD_H };
}

export function distToStroke(s: Stroke, x: number, y: number) {
  let best = Infinity;
  for (const [px, py] of s.points) best = Math.min(best, Math.hypot(px - x, py - y));
  return best;
}

/**
 * Rasterise strokes to a white PNG for /api/check. Returns base64 without the data: prefix.
 * `underlay` is extra SVG markup in board units drawn under the ink (e.g. the ramp).
 * `mime` "image/jpeg" gives a much smaller file (used for the PDF export).
 */
export async function exportPng(strokes: Stroke[], scale = 1.2, underlay = "", mime: "image/png" | "image/jpeg" = "image/png"): Promise<string> {
  const w = Math.round(BOARD_W * scale);
  const h = Math.round(BOARD_H * scale);
  const paths = strokes.map((s) => `<path d="${strokePath(s.points)}" fill="#1f1a17"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${BOARD_W} ${BOARD_H}"><rect width="100%" height="100%" fill="#fff"/>${underlay}${paths}</svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return canvas.toDataURL(mime, 0.82).split(",")[1];
}
