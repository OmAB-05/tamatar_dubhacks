"use client";

import type { Homework } from "@/data/problems";
import type { PartProgress } from "@/lib/store";

export function Dots({ total, done, current }: { total: number; done: number; current?: number }) {
  return (
    <span className="inline-flex gap-1.5" aria-label={`${done} of ${total} done`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16">
          {i < done ? (
            <circle cx="8" cy="8" r="6" fill="var(--tomato)" stroke="var(--ink)" strokeWidth="1.8" style={{ animation: "pop-in 300ms var(--pop) both" }} />
          ) : (
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke={i === current ? "var(--tomato)" : "var(--ink)"}
              strokeWidth="1.8"
              pathLength={1}
              className={i === current ? "draw" : ""}
              style={i === current ? { ["--dur" as string]: "900ms" } : undefined}
            />
          )}
        </svg>
      ))}
    </span>
  );
}

/** Fake PDF page with the problem list; collapses to a 52px rail (§4.6). */
export default function ProblemPanel({
  hw, index, progress, open, setOpen, onSelect,
}: {
  hw: Homework;
  index: number;
  progress: Record<string, PartProgress>;
  open: boolean;
  setOpen: (o: boolean) => void;
  onSelect: (i: number) => void;
}) {
  return (
    <aside
      className="relative h-full shrink-0 overflow-hidden border-r-[1.5px] border-dashed border-rule bg-panel transition-[width] duration-300"
      style={{ width: open ? 280 : 52, transitionTimingFunction: "var(--pop)" }}
    >
      {open ? (
        <div className="flex h-full w-[280px] flex-col gap-3 p-4">
          <div className="hand wa flex-1 overflow-auto bg-white p-3 shadow-[3px_4px_0_#f6d9d5]">
            <div className="mb-2 flex items-baseline justify-between text-[0.7rem] text-muted">
              <span>{hw.title}</span>
              <span>page one of one</span>
            </div>
            <ol className="flex flex-col gap-2">
              {hw.problems.map((p, i) => {
                const pr = progress[p.id];
                const done = pr?.fbd && pr?.equations;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      className={`w-full rounded-lg p-2 text-left text-[0.72rem] leading-snug text-ink-2 transition-colors ${
                        i === index ? "bg-blush outline-dotted outline-2 outline-tomato" : "hover:bg-panel"
                      }`}
                    >
                      <span className="mb-0.5 flex items-center justify-between text-[0.8rem] text-ink">
                        <span>problem {i + 1}</span>
                        {done && <span className="text-good">✓</span>}
                        {!done && pr?.fbd && <span className="text-[0.65rem] text-muted">diagram ✓</span>}
                      </span>
                      {p.text}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <button type="button" className="link self-start text-[0.85rem] text-muted" onClick={() => setOpen(false)}>
            ← Hide homework
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-full w-[52px] items-center justify-center text-[0.85rem] text-muted"
          aria-label="Show homework"
        >
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Show homework →</span>
        </button>
      )}
    </aside>
  );
}
