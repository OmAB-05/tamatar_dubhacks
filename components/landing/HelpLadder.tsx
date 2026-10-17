"use client";

import { useState } from "react";
import { penLoop } from "./useStage";

// Interactive copy of the help ladder (ui_planning.md §3.6): Mark → Hint → Explain → Answer.
// Going back down hides the help but keeps the tally, same as the real app.

const LEVELS = ["mark", "hint", "explain", "answer"] as const;
const RING = penLoop(190, 30, 196, 30, 4);

export default function HelpLadder() {
  const [level, setLevel] = useState(0);
  const [used, setUsed] = useState(0);

  const pick = (i: number) => {
    setLevel(i);
    setUsed((u) => Math.max(u, i));
  };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
      {/* the student's page */}
      <div className="hand wb grid-paper relative px-6 pb-8 pt-5 sm:px-8">
        <div className="text-[0.75rem] text-tomato">problem 2, part B</div>
        <p className="mb-4 text-[0.8rem] text-ink-2">μk = 0.2. Find the block&rsquo;s acceleration.</p>
        <div className="space-y-1 pl-2 text-[1.35rem] leading-[1.6] sm:pl-6">
          <div>ΣF = ma</div>
          <div className="relative w-max">
            ma = mg cos θ − f
            <svg className="pointer-events-none absolute -inset-x-5 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+40px)] overflow-visible" viewBox="0 0 380 60" preserveAspectRatio="none" aria-hidden>
              <path d={RING} pathLength={1} className="draw" fill="none" stroke="var(--tomato)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ ["--dur" as string]: "600ms" }} />
            </svg>
          </div>
          <div className="red-note -mt-1 pl-16 text-[1.05rem] leading-none" style={{ rotate: "-3deg" }}>
            <span className="write-in inline-block" style={{ ["--delay" as string]: "500ms", ["--steps" as string]: 18 }}>
              ↑ check the gravity part
            </span>
          </div>
          <div className="text-ink-2">a = 9.8 · 0.866 − 1.7</div>
          <div className="text-ink-2">a ≈ 6.8 m/s²</div>
        </div>
      </div>

      {/* the ladder */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[1rem] text-ink-2">how much help?</span>
          <span className="flex items-center gap-2 text-[0.8rem] text-muted">
            hints used
            <Tally n={used} />
          </span>
        </div>

        <div className="relative mb-2 h-[48px]" role="radiogroup" aria-label="help level">
          <svg className="absolute inset-x-0 top-[18px] w-full overflow-visible" height="14" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden>
            <path d="M6 7 Q80 4 150 8 T294 6" stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {LEVELS.map((l, i) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === i}
              aria-label={l}
              onClick={() => pick(i)}
              className="absolute top-[6px] h-[38px] w-[38px] -translate-x-1/2"
              style={{ left: `${4 + i * 30.7}%` }}
            >
              <span className="mx-auto block h-[18px] w-[2.5px] rounded bg-ink" />
            </button>
          ))}
          <span className="lp-nib pointer-events-none absolute top-0" style={{ left: `${4 + level * 30.7}%` }} aria-hidden>
            <svg width="30" height="40" viewBox="0 0 30 40">
              <path d="M15 38 L5 16 Q15 2 25 16 Z" fill="var(--tomato)" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M15 38 L15 22" stroke="#fff" strokeWidth="1.6" />
              <circle cx="15" cy="19" r="2.4" fill="#fff" />
            </svg>
          </span>
        </div>
        <div className="mb-6 grid grid-cols-4 text-center text-[0.95rem]">
          {LEVELS.map((l, i) => (
            <button key={l} type="button" onClick={() => pick(i)} className={`py-1 ${level === i ? "text-tomato" : "text-ink-2"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="min-h-[260px] space-y-4">
          {level === 0 && (
            <p className="lp-fade text-[1rem] text-ink-2">
              The red pen starts with one mark and a few words. Most of the time that&rsquo;s enough. Want more? Slide the nib.
            </p>
          )}
          {level >= 1 && (
            <div key="hint" className="sticky sticky-drop wa max-w-[420px] text-[1.05rem]" style={{ transform: "rotate(2deg)" }}>
              which part of gravity points along the ramp?
            </div>
          )}
          {level >= 2 && (
            <div key="explain" className="sticky sticky-drop wb max-w-[460px] text-[1rem] leading-snug" style={{ animationDelay: "60ms", transform: "rotate(-1.5deg)" }}>
              Split gravity in two. The part along the ramp is <span className="hl">mg sin θ</span>. The part into the ramp, mg cos θ, is the one the normal force cancels.
            </div>
          )}
          {level >= 3 && (
            <div key="answer" className="solution slide-in hand wc max-w-[480px] text-[1rem]">
              <div className="text-[0.75rem] text-tomato">full solution</div>
              <div>ma = mg sin θ − μk mg cos θ</div>
              <div>a = g (sin θ − μk cos θ)</div>
              <div>a = 9.8 (0.5 − 0.2 · 0.866)</div>
              <div>
                a ≈ <span className="text-tomato">3.2 m/s²</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tally({ n }: { n: number }) {
  return (
    <svg width="44" height="22" viewBox="0 0 44 22" aria-label={`${n}`}>
      {Array.from({ length: n }).map((_, i) => (
        <path
          key={i}
          d={`M${6 + i * 10} 3 L${4 + i * 10} 19`}
          pathLength={1}
          className="draw"
          stroke="var(--tomato)"
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ ["--dur" as string]: "220ms" }}
        />
      ))}
    </svg>
  );
}
