"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Button from "@/components/Button";
import InkCanvas, { type LoopBox } from "@/components/InkCanvas";
import Tomato from "@/components/Tomato";
import { useStore } from "@/lib/store";
import { STATUS_LINES } from "@/lib/tomato";
import type { TomatoState } from "@/lib/types";
import { useInk } from "@/lib/useInk";

const W = 1000;
const H = 440;

const CARDS = [
  { title: "Write your work on the canvas", body: "Use your Pencil like it is paper. No typing, no special syntax." },
  { title: "Draw forces as arrows", body: "Start every arrow on the object. tamatar checks which way each one points." },
  { title: "Circle your answer when you are done", body: "A circle means finished. Then tamatar offers to check it." },
  { title: "Meet your tomato", body: "Right answers keep it fresh. A run of misses makes it rot." },
];

function WriteArt() {
  const ink = useInk();
  return (
    <InkCanvas ink={ink} w={W} h={H} className="wc overflow-hidden border-[1.5px] border-rule">
      <div className="pointer-events-none absolute inset-0 flex flex-col items-start justify-center pl-[25%] text-[1.6rem] leading-[1.35]" style={{ opacity: ink.strokes.length ? 0.25 : 1, transition: "opacity 300ms" }}>
        <div>N = mg cos θ</div>
        <div>f = μN</div>
        <div>ma = mg sin θ − f</div>
      </div>
    </InkCanvas>
  );
}

const BLOCK = { x: 430, y: 150, w: 140, h: 110 };

function ArrowArt() {
  const ink = useInk();
  const [verdict, setVerdict] = useState<"ok" | "off" | null>(null);
  return (
    <InkCanvas
      ink={ink}
      w={W}
      h={H}
      className="wc overflow-hidden border-[1.5px] border-rule"
      onStroke={(s) => {
        const [x, y] = s.points[0];
        const on = x > BLOCK.x - 20 && x < BLOCK.x + BLOCK.w + 20 && y > BLOCK.y - 20 && y < BLOCK.y + BLOCK.h + 20;
        setVerdict(on ? "ok" : "off");
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full">
        <rect {...BLOCK} rx="6" fill="var(--blush)" stroke="var(--ink)" strokeWidth="4" />
        {!ink.strokes.length && (
          <path
            d={`M500 205 L500 400 M484 380 L500 402 L516 380`}
            pathLength={1}
            stroke="var(--faint)"
            strokeWidth="5"
            strokeDasharray="1"
            fill="none"
            strokeLinecap="round"
            style={{ animation: "ghost-arrow 2.2s ease-in-out infinite" }}
          />
        )}
        {verdict === "off" && ink.strokes.length > 0 && (
          <ellipse cx={ink.strokes[ink.strokes.length - 1].points[0][0]} cy={ink.strokes[ink.strokes.length - 1].points[0][1]} rx="44" ry="36" fill="none" stroke="var(--tomato)" strokeWidth="4" pathLength={1} className="draw" />
        )}
      </svg>
      {verdict && ink.strokes.length > 0 && (
        <div key={ink.strokes.length} className={`write-in pointer-events-none absolute right-6 top-4 text-[1.1rem] ${verdict === "ok" ? "text-good" : "text-tomato"}`} style={{ rotate: "-4deg", ["--dur" as string]: "500ms" }}>
          {verdict === "ok" ? "nice, that starts on the block" : "start the arrow on the block"}
        </div>
      )}
    </InkCanvas>
  );
}

function CircleArt() {
  const ink = useInk();
  const [loop, setLoop] = useState<LoopBox | null>(null);
  const [checked, setChecked] = useState(false);
  return (
    <InkCanvas
      ink={ink}
      w={W}
      h={H}
      className="wc overflow-hidden border-[1.5px] border-rule"
      placeholder="write a = 4.9 m/s², then circle it"
      onCircle={(b) => {
        setLoop(b);
        setChecked(false);
      }}
      onStroke={() => setChecked(false)}
    >
      {loop && (
        <button
          key={`${loop.x}-${loop.y}`}
          type="button"
          className={`bubble btn absolute !text-[0.9rem] ${checked ? "btn-plain text-good" : "btn-red"}`}
          style={{ left: `${((loop.x + loop.w) / W) * 100}%`, top: `${(loop.y / H) * 100}%`, translate: "8px -60%" }}
          onClick={() => setChecked(true)}
        >
          {checked ? "that is how you finish ✓" : "Check this?"}
        </button>
      )}
    </InkCanvas>
  );
}

function TomatoArt() {
  const [s, setS] = useState<TomatoState>(0);
  return (
    <div className="wc flex aspect-[1000/440] items-center justify-center gap-10 border-[1.5px] border-rule bg-white">
      <Tomato size={150} state={s} listen={false} />
      <div className="flex w-[40%] flex-col gap-3">
        <div className="text-[0.95rem] text-ink-2">{STATUS_LINES[s]}</div>
        <input type="range" min={0} max={3} step={1} value={s} onChange={(e) => setS(Number(e.target.value) as TomatoState)} className="accent-[var(--tomato)]" aria-label="rot or heal the tomato" />
        <div className="flex justify-between text-[0.7rem] text-muted">
          <span>fresh</span>
          <span>rotten</span>
        </div>
        <div className="text-[0.75rem] text-faint">tap it to give it a squish</div>
      </div>
    </div>
  );
}

const ARTS = [WriteArt, ArrowArt, CircleArt, TomatoArt];

/** Quick tour, 4 cards, each with a live mini canvas (§4.2). Swipe with a finger outside the art. */
export default function Tour() {
  const { name } = useStore();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const swipe = useRef<number | null>(null);
  const last = i === CARDS.length - 1;
  const go = (n: number) => {
    setDir(n > i ? 1 : -1);
    setI(Math.max(0, Math.min(CARDS.length - 1, n)));
  };
  const Art = ARTS[i];

  return (
    <main
      className="grid-paper relative flex min-h-screen flex-col items-center justify-center px-4 py-10"
      onPointerDown={(e) => {
        if (e.pointerType === "touch" && !(e.target as Element).closest("svg,input,button")) swipe.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (swipe.current == null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <Link href="/warmup" className="link absolute right-10 top-8 text-[1.05rem]">
        skip
      </Link>
      <div className="mb-6 text-[1.1rem] text-ink-2">
        quick tour{name ? `, ${name}` : ""} <span className="sr-only">{i + 1} of 4</span>
      </div>

      <div className="w-full max-w-[640px]">
        <div key={i} className="hand wa bg-white px-9 pb-5 pt-7" style={{ animation: `${dir > 0 ? "board-in" : "tour-back"} 360ms var(--pop) both` }}>
          <Art />
          <h1 className="mt-5 text-center text-[1.75rem] leading-tight">{CARDS[i].title}</h1>
          <p className="mx-auto mt-2 max-w-[520px] text-center text-[1.1rem] text-ink-2">{CARDS[i].body}</p>
          <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label={`quick tour, ${i + 1} of 4`}>
            {CARDS.map((_, n) => (
              <button key={n} type="button" aria-label={`card ${n + 1}`} onClick={() => go(n)} className="flex h-6 w-6 items-center justify-center">
                <span className={`block h-[15px] w-[15px] rounded-full border-2 border-ink transition-colors ${n === i ? "bg-tomato" : ""}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {i > 0 ? (
            <Button className="wb" onClick={() => go(i - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button variant="red" className="wa !px-7 !text-[1.3rem]" onClick={() => (last ? router.push("/warmup") : go(i + 1))}>
            {last ? "Try one problem" : "Next"}
          </Button>
        </div>
      </div>
      <style>{`@keyframes tour-back { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: none; } }`}</style>
    </main>
  );
}
