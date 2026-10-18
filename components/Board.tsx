"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_H, BOARD_W } from "@/lib/ink";

/** Fits an aspect-locked board into whatever space is left, and re-fits smoothly on resize. */
export default function FitBoard({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(([e]) => {
      const { width: cw, height: ch } = e.contentRect;
      setWidth(Math.max(0, Math.min(cw, (ch * BOARD_W) / BOARD_H)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="flex min-h-0 flex-1 items-start justify-center">
      <div className="relative transition-[width] duration-300" style={{ width: width ?? "100%", transitionTimingFunction: "var(--pop)" }}>
        {children}
      </div>
    </div>
  );
}
