"use client";

import { useEffect, useRef, useState } from "react";

/** Scale a fixed-size stage (w px wide) to fit its container, so SVG and HTML share one coordinate space. */
export function useStage(w: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(e.contentRect.width / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return { ref, k };
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return { ref, seen };
}

/** Shaft + arrowhead for a hand-drawn force arrow. The shaft bows a little, like a real pen line. */
export function arrow(x1: number, y1: number, x2: number, y2: number, bow = 2.5) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const mx = (x1 + x2) / 2 - Math.sin(a) * bow;
  const my = (y1 + y2) / 2 + Math.cos(a) * bow;
  const h = 13;
  const p = (t: number) => `${(x2 + Math.cos(a + t) * h).toFixed(1)} ${(y2 + Math.sin(a + t) * h).toFixed(1)}`;
  return {
    shaft: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    head: `M${p(2.62)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${p(-2.55)}`,
  };
}

/** A wobbly pen loop that overshoots its start, like a real red-pen circle (§3.5). */
export function penLoop(cx: number, cy: number, rx: number, ry: number, seed = 1) {
  const pts: string[] = [];
  const start = -1.9;
  const end = start + Math.PI * 2 + 0.45;
  for (let i = 0; i <= 40; i++) {
    const t = start + ((end - start) * i) / 40;
    const n = 1 + Math.sin(t * 3 + seed) * 0.04 + (i / 40) * 0.07;
    pts.push(`${(cx + Math.cos(t) * rx * n).toFixed(1)} ${(cy + Math.sin(t) * ry * n).toFixed(1)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(" L")}`;
}
