"use client";

import { useState } from "react";

/** Hand-drawn ramp with a block. Tap θ to highlight the angle (§4.6). */
export default function RampDiagram({ angle = 30, width = 170 }: { angle?: number; width?: number }) {
  const [hot, setHot] = useState(false);
  const rad = (angle * Math.PI) / 180;
  const base = 150;
  const hgt = Math.tan(rad) * base;
  const x0 = 12, y0 = 100;
  const top = [x0, y0 - hgt] as const;
  // block sits 55% up the slope
  const t = 0.42;
  const bx = x0 + base * t;
  const by = y0 - hgt * (1 - t);

  return (
    <svg viewBox="0 0 175 110" width={width} className="shrink-0 overflow-visible" aria-label={`ramp at ${angle} degrees`}>
      <path d={`M${x0} ${y0} L${x0 + base} ${y0 + 1} M${top[0]} ${top[1]} L${x0 + base} ${y0} M${top[0]} ${top[1]} L${x0 - 1} ${y0}`} stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={`M${x0 + base - 2} ${y0 + 4} l-170 0`} stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="4 4" />
      <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
        <rect x="-14" y="-23" width="28" height="22" rx="2" fill="var(--blush)" stroke="var(--ink)" strokeWidth="2.2" />
      </g>
      <g onClick={() => setHot((h) => !h)} className="cursor-pointer">
        <path
          d={`M${x0 + base - 34} ${y0} A34 34 0 0 1 ${x0 + base - Math.cos(rad) * 34} ${y0 - Math.sin(rad) * 34}`}
          stroke={hot ? "var(--tomato)" : "var(--ink)"}
          strokeWidth={hot ? 3 : 1.8}
          fill="none"
          style={{ transition: "stroke 200ms" }}
        />
        <text x={x0 + base - 54} y={y0 - 6} fontSize="15" fill={hot ? "var(--tomato)" : "var(--ink)"}>
          θ
        </text>
        <rect x={x0 + base - 60} y={y0 - 26} width="40" height="28" fill="transparent" />
      </g>
    </svg>
  );
}
