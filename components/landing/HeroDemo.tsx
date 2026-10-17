"use client";

import { useEffect, useState } from "react";
import Tomato from "@/components/Tomato";
import { useStore } from "@/lib/store";
import { arrow, penLoop, useStage } from "./useStage";

// A scripted replay of the hero moment (ui_planning.md §3.4–3.5): a student draws a
// free-body diagram with the normal force pointing straight up, taps Check, the red pen
// circles it, they fix it, and the tomato cheers. Loops forever.

const W = 560;
const H = 470;
const SIN = 0.5, COS = Math.sqrt(3) / 2; // θ = 30°

// Ramp: right angle at bottom-left, sloping down to the right.
const R0 = { x: 70, y: 420 - 380 * Math.tan(Math.PI / 6) };
const R1 = { x: 450, y: 420 };
const T = 0.42;
const S = { x: R0.x + (R1.x - R0.x) * T, y: R0.y + (R1.y - R0.y) * T }; // block's contact point
const P = { x: S.x + SIN * 17, y: S.y - COS * 17 }; // block centre (17 out along the normal)

const MG = arrow(P.x, P.y, P.x, P.y + 108);
const F = arrow(P.x, P.y, P.x - COS * 98, P.y - SIN * 98, -2);
const N_BAD = arrow(P.x, P.y, P.x - 2, P.y - 112);
const N_GOOD = arrow(P.x, P.y, P.x + SIN * 112, P.y - COS * 112);
const RING = penLoop(P.x - 1, P.y - 66, 30, 64, 2);
const TICK = `M${P.x + 112} ${P.y + 8} l14 16 l30 -42`;

const STEPS = [
  { at: 0, id: "ramp" },
  { at: 500, id: "mg" },
  { at: 1300, id: "f" },
  { at: 2100, id: "n" },
  { at: 3100, id: "check" },
  { at: 5300, id: "ring" },
  { at: 8200, id: "erase" },
  { at: 8900, id: "fix" },
  { at: 9900, id: "good" },
  { at: 13200, id: "end" },
] as const;
type Step = (typeof STEPS)[number]["id"];
const order = (s: Step) => STEPS.findIndex((x) => x.id === s);

const THINKING = ["reading your handwriting…", "checking your arrows…", "looking for the first slip…"];

function Pencil({ path, dur }: { path: string; dur: number }) {
  return (
    <div className="lp-pencil" style={{ offsetPath: `path("${path}")`, animationDuration: `${dur}ms` }} aria-hidden>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <g transform="rotate(38 27 27)">
          <path d="M20 4 h14 v34 l-7 12 l-7 -12 Z" fill="#ffd166" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M20 38 h14" stroke="var(--ink)" strokeWidth="2" />
          <path d="M24.5 45.5 l2.5 4.5 l2.5 -4.5 Z" fill="var(--ink)" />
          <rect x="20" y="0" width="14" height="7" rx="2" fill="#f4a3b0" stroke="var(--ink)" strokeWidth="2.2" />
        </g>
      </svg>
    </div>
  );
}

function Ink({ d, delay = 0, dur = 600, color = "var(--ink)", width = 3.2, className = "" }: { d: string; delay?: number; dur?: number; color?: string; width?: number; className?: string }) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`draw ${className}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ["--dur" as string]: `${dur}ms`, ["--delay" as string]: `${delay}ms` }}
    />
  );
}

function Force({ a, label, lx, ly, dur = 650 }: { a: { shaft: string; head: string }; label: string; lx: number; ly: number; dur?: number }) {
  return (
    <g>
      <Ink d={a.shaft} dur={dur} />
      <Ink d={a.head} delay={dur} dur={160} />
      <text x={lx} y={ly} fontSize="26" fill="var(--ink)" className="lp-fade" style={{ animationDelay: `${dur + 100}ms` }}>
        {label}
      </text>
    </g>
  );
}

export default function HeroDemo() {
  const { react } = useStore();
  const { ref, k } = useStage(W);
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState<Step>("ramp");
  const [think, setThink] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((s) =>
      setTimeout(() => {
        if (s.id === "end") return setCycle((c) => c + 1);
        setStep(s.id);
        if (s.id === "ring") react("flinch");
        if (s.id === "good") react("jump");
      }, s.at),
    );
    return () => timers.forEach(clearTimeout);
  }, [cycle, react]);

  useEffect(() => {
    if (step !== "check") return setThink(0);
    const t = setInterval(() => setThink((n) => (n + 1) % THINKING.length), 700);
    return () => clearInterval(t);
  }, [step]);

  const past = (s: Step) => order(step) >= order(s);
  const at = (s: Step) => step === s;
  const wrong = past("ring") && !past("good");

  return (
    <div className="relative">
      <div ref={ref} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <div key={cycle} className="lp-stage hand wa grid-paper absolute left-0 top-0 overflow-hidden" style={{ width: W, height: H, transform: `scale(${k})` }}>
          {/* problem header */}
          <div className="absolute left-7 top-5 w-[360px]">
            <div className="text-[20px] text-tomato">problem 2</div>
            <p className="mt-1 text-[23px] leading-[1.2] text-ink-2">A 5 kg block slides down a 30° ramp. Draw every force on the block.</p>
          </div>

          {/* the stamp */}
          <div className="absolute right-6 top-6" aria-hidden>
            <div className={`btn btn-red wc !min-h-[54px] !px-6 !text-[26px] ${at("check") ? "lp-stamp" : ""}`}>Check</div>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 overflow-visible">
            {/* ramp, in the same hand as the student */}
            <path
              d={`M${R0.x} ${R1.y} L${R1.x} ${R1.y + 1} M${R0.x} ${R0.y} L${R1.x} ${R1.y} M${R0.x} ${R0.y} L${R0.x - 1} ${R1.y}`}
              fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round"
            />
            <path d={`M${R1.x - 46} ${R1.y} A46 46 0 0 1 ${R1.x - COS * 46} ${R1.y - SIN * 46}`} fill="none" stroke="var(--ink)" strokeWidth="2" />
            <text x={R1.x - 78} y={R1.y - 8} fontSize="20" fill="var(--ink)">30°</text>
            <g transform={`translate(${P.x} ${P.y}) rotate(30)`}>
              <rect x="-24" y="-17" width="48" height="34" rx="3" fill="var(--blush)" stroke="var(--ink)" strokeWidth="2.6" />
              <text x="-13" y="7" fontSize="18" fill="var(--ink-2)">5 kg</text>
            </g>

            {past("mg") && <Force a={MG} label="mg" lx={P.x + 10} ly={P.y + 112} />}
            {past("f") && <Force a={F} label="f" lx={P.x - COS * 98 - 22} ly={P.y - SIN * 98 + 6} />}
            {past("n") && !past("fix") && (
              <g className={past("erase") ? "ink-lift" : ""} style={past("erase") ? { animationDuration: "420ms" } : undefined}>
                <Force a={N_BAD} label="N" lx={P.x - 30} ly={P.y - 100} />
              </g>
            )}
            {past("fix") && <Force a={N_GOOD} label="N" lx={P.x + SIN * 112 + 10} ly={P.y - COS * 112 + 8} dur={700} />}

            {/* red pen thinking: the border circles the board */}
            {at("check") && (
              <rect x="6" y="6" width={W - 12} height={H - 12} rx="18" fill="none" stroke="var(--tomato)" strokeWidth="3" className="thinking-border" />
            )}

            {/* the red pen */}
            {past("ring") && !past("fix") && (
              <g className={past("erase") ? "lp-dim" : ""}>
                <Ink d={RING} dur={560} color="var(--tomato)" width={3.6} />
                <Ink d={`M${P.x + 62} ${P.y - 84} Q${P.x + 50} ${P.y - 66} ${P.x + 34} ${P.y - 62}`} delay={1500} dur={220} color="var(--tomato)" width={2.8} />
                <Ink d={`M${P.x + 42} ${P.y - 71} L${P.x + 34} ${P.y - 62} L${P.x + 45} ${P.y - 57}`} delay={1720} dur={120} color="var(--tomato)" width={2.8} />
              </g>
            )}

            {past("good") && (
              <g>
                <Ink d={TICK} dur={420} color="var(--good)" width={5} />
              </g>
            )}
          </svg>

          {/* red note, written in */}
          {past("ring") && !past("fix") && (
            <div
              className={`absolute whitespace-nowrap text-[31px] leading-[1.05] text-tomato ${past("erase") ? "lp-dim" : ""}`}
              style={{ left: P.x + 44, top: P.y - 160, rotate: "-4deg" }}
            >
              <div className="write-in" style={{ ["--delay" as string]: "700ms", ["--dur" as string]: "560ms", ["--steps" as string]: 18 }}>the ramp pushes out,</div>
              <div className="write-in" style={{ ["--delay" as string]: "1150ms", ["--dur" as string]: "420ms", ["--steps" as string]: 14 }}>not straight up</div>
            </div>
          )}

          {past("good") && (
            <>
              <div className="write-in absolute text-[30px] text-good" style={{ left: P.x + 100, top: P.y + 34, rotate: "-5deg", ["--delay" as string]: "380ms", ["--dur" as string]: "420ms", ["--steps" as string]: 13 }}>
                nice diagram!
              </div>
              <div className="absolute" style={{ left: P.x + 140, top: P.y - 6 }} aria-hidden>
                {SEEDS.map((s, i) => (
                  <span key={i} className="lp-seed" style={{ background: s.c, ["--dx" as string]: `${s.dx}px`, ["--dy" as string]: `${s.dy}px`, ["--rot" as string]: `${s.r}deg`, animationDelay: `${300 + i * 20}ms` }} />
                ))}
              </div>
            </>
          )}

          {/* thinking sticky */}
          {at("check") && (
            <div className="absolute right-6 top-[96px]">
              <div key={think} className="sticky-note sticky-drop text-[22px]">
                {THINKING[think]}
              </div>
            </div>
          )}

          {/* the pencil doing the drawing */}
          {at("mg") && <Pencil path={MG.shaft} dur={650} />}
          {at("f") && <Pencil path={F.shaft} dur={650} />}
          {at("n") && <Pencil path={N_BAD.shaft} dur={650} />}
          {at("fix") && <Pencil path={N_GOOD.shaft} dur={700} />}
        </div>
      </div>

      {/* the tomato peeks over the corner of the page */}
      <div className="absolute -bottom-9 -right-4 sm:-right-9">
        <Tomato size={104} state={wrong ? 1 : 0} />
      </div>
      <p className="sr-only" aria-live="polite">
        {wrong ? "red pen: the ramp pushes out, not straight up" : past("good") ? "nice diagram!" : ""}
      </p>
    </div>
  );
}

const SEEDS = [
  { dx: -70, dy: -60, r: 120, c: "var(--tomato)" },
  { dx: 60, dy: -80, r: -90, c: "#3f8f3a" },
  { dx: 90, dy: -10, r: 200, c: "#f5d58a" },
  { dx: -40, dy: -100, r: 60, c: "var(--tomato-2)" },
  { dx: 20, dy: -110, r: -160, c: "#f5d58a" },
  { dx: -90, dy: -20, r: 80, c: "#3f8f3a" },
  { dx: 110, dy: -60, r: -40, c: "var(--tomato)" },
  { dx: 40, dy: 40, r: 140, c: "#3f8f3a" },
];
