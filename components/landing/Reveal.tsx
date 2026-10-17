"use client";

import { useInView } from "./useStage";

/** Deals a section in like a sheet of paper when it scrolls into view. */
export default function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>(0.15);
  return (
    <div ref={ref} className={`lp-reveal ${seen ? "in" : ""} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
