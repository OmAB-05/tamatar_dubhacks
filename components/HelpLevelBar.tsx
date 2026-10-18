"use client";

import { useRef } from "react";
import type { HelpLevel } from "@/lib/types";

const LABELS = ["mark", "hint", "explain", "answer"] as const;

/** Hand-drawn 4-notch pencil slider with a red pen nib thumb (§3.6). Also 4 tappable labels. */
export default function HelpLevelBar({ level, onChange, compact = false }: { level: HelpLevel; onChange: (l: HelpLevel) => void; compact?: boolean }) {
  // compact: the slim rail when the right panel is hidden (initials instead of words)
  const STEP = compact ? 40 : 60;
  const track = useRef<HTMLDivElement>(null);

  const pick = (clientY: number) => {
    const r = track.current!.getBoundingClientRect();
    const i = Math.round((clientY - r.top - 12) / STEP);
    const l = Math.max(0, Math.min(3, i)) as HelpLevel;
    if (l !== level) onChange(l);
  };

  return (
    <div className="flex flex-col items-start">
      <div className={`mb-2 text-muted ${compact ? "text-[0.75rem]" : "text-[0.95rem]"}`}>help</div>
      <div
        ref={track}
        className="relative cursor-pointer select-none"
        style={{ height: STEP * 3 + 24, width: "100%", touchAction: "none" }}
        role="slider"
        aria-label="help level"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={LABELS[level]}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") onChange(Math.min(3, level + 1) as HelpLevel);
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") onChange(Math.max(0, level - 1) as HelpLevel);
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons) pick(e.clientY);
        }}
      >
        {/* pencil line with tick marks */}
        <svg className="absolute left-0 top-0" width="30" height={STEP * 3 + 24} aria-hidden>
          <path
            d={`M15 10 C13 ${STEP} 17 ${STEP * 2} 15 ${STEP * 3 + 14}`}
            stroke="var(--ink)"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M8 ${12 + i * STEP} L22 ${12 + i * STEP + (i % 2 ? 1 : -1)}`} stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>
        {/* red pen nib thumb */}
        <svg
          className="pointer-events-none absolute left-[3px]"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          style={{ top: 12 + level * STEP - 13, transition: "top 260ms var(--pop)" }}
          aria-hidden
        >
          <path d="M13 24 L5 12 L5 3 L21 3 L21 12 Z" fill="var(--tomato)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13 24 L13 13" stroke="#fff" strokeWidth="1.6" />
          <circle cx="13" cy="12" r="1.8" fill="#fff" />
        </svg>
        {LABELS.map((l, i) => (
          <button
            key={l}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(i as HelpLevel)}
            title={l}
            className={`absolute left-10 whitespace-nowrap leading-none ${compact ? "text-[0.95rem]" : "text-[1.2rem]"} transition-colors ${i === level ? "text-tomato" : i < level ? "text-ink" : "text-muted"}`}
            style={{ top: 12 + i * STEP - 11 }}
          >
            {compact ? l[0] : l}
          </button>
        ))}
      </div>
    </div>
  );
}
