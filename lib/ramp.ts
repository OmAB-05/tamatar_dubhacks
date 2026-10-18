import { BOARD_H, BOARD_W } from "./ink";

// The ramp + block drawn on the diagram board, so the student only adds force arrows.
// One SVG string in board units, used both on screen and in the PNG sent to /api/check.

export function rampGeometry(angleDeg: number) {
  const a = (Math.max(10, Math.min(50, angleDeg)) * Math.PI) / 180;
  const base = 640;
  const x0 = 180;
  const y0 = BOARD_H - 90;
  const rise = Math.min(Math.tan(a) * base, BOARD_H - 200);
  const run = rise / Math.tan(a);
  const left = x0 + base - run; // high end of the slope
  const t = 0.5; // block sits halfway down
  const bx = left + run * t;
  const by = y0 - rise * (1 - t);
  return { a, x0, y0, base, rise, left, bx, by, deg: (a * 180) / Math.PI };
}

export function rampSvg(angleDeg: number, ink = "#4a4340"): string {
  const g = rampGeometry(angleDeg);
  const right = g.x0 + g.base;
  const r = 70;
  const arc = `M${right - r} ${g.y0} A${r} ${r} 0 0 1 ${right - Math.cos(g.a) * r} ${g.y0 - Math.sin(g.a) * r}`;
  return [
    `<path d="M${g.left} ${g.y0 - g.rise} L${right} ${g.y0} L${g.left} ${g.y0} Z" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`,
    `<path d="M${g.x0 - 60} ${g.y0 + 2} L${right + 60} ${g.y0 + 2}" stroke="${ink}" stroke-width="2" stroke-dasharray="10 10" opacity=".5"/>`,
    `<g transform="translate(${g.bx} ${g.by}) rotate(${g.deg})"><rect x="-70" y="-96" width="140" height="94" rx="6" fill="#fdecea" stroke="${ink}" stroke-width="4"/></g>`,
    `<path d="${arc}" fill="none" stroke="${ink}" stroke-width="3"/>`,
    `<text x="${right - r - 46}" y="${g.y0 - 14}" font-size="34" fill="${ink}" font-family="Myfont, var(--font-my)">θ</text>`,
  ].join("");
}

export const RAMP_W = BOARD_W;

/** Points along the drawn ramp, block and angle label, so red-pen notes can stay off them. */
export function rampPoints(angleDeg: number): [number, number][] {
  const g = rampGeometry(angleDeg);
  const right = g.x0 + g.base;
  const out: [number, number][] = [];
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 12));
    for (let i = 0; i <= n; i++) out.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  };
  seg(g.left, g.y0 - g.rise, right, g.y0);
  seg(g.left, g.y0, right, g.y0);
  seg(g.left, g.y0 - g.rise, g.left, g.y0);
  // the block (filled, so sample its inside too)
  const c = Math.cos(g.a), s = Math.sin(g.a);
  for (let u = -70; u <= 70; u += 14)
    for (let v = -96; v <= -2; v += 14) out.push([g.bx + u * c - v * s, g.by + u * s + v * c]);
  // θ label and arc
  for (let u = 0; u <= 120; u += 12) for (let v = 0; v <= 60; v += 12) out.push([right - 130 + u, g.y0 - 60 + v]);
  return out;
}
