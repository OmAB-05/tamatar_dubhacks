"use client";

import type { Homework } from "@/data/problems";
import { hasDiagram, isDone, type PartProgress } from "@/lib/progress";
import FontSizer from "./FontSizer";

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
  hw, index, progress, open, setOpen, onSelect, fontScale = 1, setFontScale,
}: {
  hw: Homework;
  index: number;
  progress: Record<string, PartProgress>;
  open: boolean;
  setOpen: (o: boolean) => void;
  onSelect: (i: number) => void;
  /** Text size of the problem list (1 = default). */
  fontScale?: number;
  setFontScale?: (v: number) => void;
}) {
  return (
    <aside
      className="problem-panel relative h-full shrink-0 overflow-hidden border-r-[1.5px] border-dashed border-rule bg-panel transition-[width] duration-300"
      style={{ width: open ? "14.6rem" : "2.7rem", transitionTimingFunction: "var(--pop)" }}
    >
      {open ? (
        <>
          <button type="button" aria-label="Close homework" className="problem-panel-backdrop" onClick={() => setOpen(false)} />
          <div className="problem-panel-content flex h-full w-[14.6rem] flex-col gap-3 p-4">
            <div className="hand wa flex-1 overflow-auto bg-white p-3 shadow-[3px_4px_0_#f6d9d5]">
              <div className="mb-2 flex items-baseline justify-between text-[0.7rem] text-muted">
                <span>{hw.title}</span>
                <span>page one of one</span>
              </div>
              <ol className="flex flex-col gap-2" style={{ fontSize: `${0.72 * fontScale}rem` }}>
                {hw.problems.map((p, i) => {
                  const pr = progress[p.id];
                  const done = isDone(p, pr);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(i);
                          if (window.matchMedia("(max-width: 1366px)").matches) setOpen(false);
                        }}
                        className={`w-full rounded-lg p-2 text-left leading-snug text-ink-2 transition-colors ${
                          i === index ? "bg-blush outline-dotted outline-2 outline-tomato" : "hover:bg-panel"
                        }`}
                      >
                        <span className="mb-0.5 flex items-center justify-between text-[1.12em] text-ink">
                          <span>problem {i + 1}</span>
                          {done && <span className="text-good">✓</span>}
                          {!done && hasDiagram(p) && pr?.fbd && <span className="text-[0.9em] text-muted">diagram ✓</span>}
                        </span>
                        {p.topic && <span className="mb-0.5 block text-[0.85em] text-muted">{p.topic}{p.figures?.length ? " · has a figure" : ""}</span>}
                        {p.text}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="link text-[0.85rem] text-muted" onClick={() => setOpen(false)}>
                ← Hide homework
              </button>
              {setFontScale && <FontSizer value={fontScale} onChange={setFontScale} label="problem list text" />}
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-full w-[2.7rem] items-center justify-center text-[0.85rem] text-muted"
          aria-label="Show homework"
        >
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Show homework →</span>
        </button>
      )}
    </aside>
  );
}
