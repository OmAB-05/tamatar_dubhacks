import { getStroke } from "perfect-freehand";
import type { BBox, Point, Stroke } from "./types";

/** Logical board size. Strokes are stored in these units so they scale with the board. */
export const BOARD_W = 1000;
export const BOARD_H = 640;
export const INK_COLORS = [
  { name: "Black", value: "#1f1a17" },
  { name: "Blue", value: "#2456a6" },
  { name: "Red", value: "#c2392d" },
  { name: "Green", value: "#287447" },
  { name: "Purple", value: "#7645a0" },
] as const;

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

export function strokePath(points: Point[], simulatePressure = false, style?: Pick<Stroke, "tool" | "size">): string {
  const pencil = style?.tool === "pencil";
  return outlineToPath(getStroke(points, {
    ...PEN_OPTIONS,
    size: (style?.size ?? PEN_OPTIONS.size) * (pencil ? 0.6 : 1),
    thinning: style?.tool === "ruler" ? 0 : PEN_OPTIONS.thinning,
    simulatePressure: style?.tool === "ruler" ? false : simulatePressure,
  }));
}

export const savedStrokePath = (s: Stroke) => strokePath(s.points, s.simulatePressure ?? false, s);
export const strokeColor = (s: Pick<Stroke, "color">) => /^#[0-9a-f]{6}$/i.test(s.color ?? "") ? s.color! : INK_COLORS[0].value;
export const strokeOpacity = (s: Pick<Stroke, "tool">) => s.tool === "pencil" ? 0.72 : 1;

/** Shift constrains a ruler line to 15° increments, measured in board space. */
export function rulerEnd(start: Point, end: Point, snap: boolean): Point {
  if (!snap) return [end[0], end[1], 0.5];
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
  const length = Math.hypot(dx, dy);
  return [start[0] + Math.cos(angle) * length, start[1] + Math.sin(angle) * length, 0.5];
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
  for (let i = 0; i < s.points.length; i++) {
    const [ax, ay] = s.points[i];
    const [bx, by] = s.points[i + 1] ?? s.points[i];
    const dx = bx - ax, dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
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
  const paths = strokes.map((s) => `<path d="${savedStrokePath(s)}" fill="${strokeColor(s)}" opacity="${strokeOpacity(s)}"/>`).join("");
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
