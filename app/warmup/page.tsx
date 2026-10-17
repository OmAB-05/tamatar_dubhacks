"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import InkCanvas, { type LoopBox } from "@/components/InkCanvas";
import OverlayLayer from "@/components/OverlayLayer";
import Toolbar from "@/components/Toolbar";
import Tomato from "@/components/Tomato";
import type { Tool } from "@/components/InkCanvas";
import { useStore } from "@/lib/store";
import { useInk } from "@/lib/useInk";
import type { CheckResponse } from "@/lib/types";
import { delay } from "@/lib/motion";
import { bboxOf } from "@/lib/ink";

const EXAMPLE = ["m = 4 kg,  F = 12 N", "F = ma", "a = F / m = 12 / 4", "a = 3 m/s²"];

/** The worked example writes itself in, line by line, then the answer gets circled. */
function Example() {
  const [run, setRun] = useState(0);
  const per = 700;
  return (
    <div className="hand wa relative flex flex-col bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[1rem] text-muted">here’s how it looks</span>
        <button type="button" className="link text-[0.8rem] text-muted" onClick={() => setRun((r) => r + 1)}>
          replay
        </button>
      </div>
      <div key={run} className="grid-paper relative flex aspect-[1000/640] flex-col justify-center gap-1 rounded-xl pl-[12%] text-[1.5rem]">
        {EXAMPLE.map((l, i) => (
          <div
            key={i}
            className="write-in relative w-fit"
            style={{ ["--delay" as string]: `${300 + i * per}ms`, ["--dur" as string]: `${per - 100}ms`, ["--steps" as string]: l.length }}
          >
            {l}
            {i === EXAMPLE.length - 1 && (
              <svg className="absolute -inset-x-5 -inset-y-3 h-[calc(100%+24px)] w-[calc(100%+40px)] overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path
                  d="M60 3 C95 2 101 30 70 37 C40 42 2 38 2 20 C3 5 40 1 72 6"
                  pathLength={1}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  className="draw"
                  style={{ ["--delay" as string]: `${300 + EXAMPLE.length * per}ms`, ["--dur" as string]: "600ms" }}
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-center text-[0.95rem] text-tomato" style={{ rotate: "-2deg" }}>
        circle your answer to say you’re done
      </div>
    </div>
  );
}

/** Warm-up: one practice problem, then you're in (§4.3). */
export default function Warmup() {
  const router = useRouter();
  const store = useStore();
  const ink = useInk();
  const [tool, setTool] = useState<Tool>("pen");
  const [loop, setLoop] = useState<LoopBox | null>(null);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [key, setKey] = useState(0);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!loop || result?.correct) return;
    const t = setTimeout(() => setLoop(null), 4000);
    return () => clearTimeout(t);
  }, [loop, result]);

  const check = async (circled: boolean) => {
    setThinking(true);
    setStale(false);
    store.react("lean");
    await delay(1800);
    const bbox = bboxOf(ink.strokes.slice(-1));
    const res: CheckResponse = circled
      ? { correct: true, errorStep: null, bbox, mark: null, hint: null, explanation: null, fullSolution: null, errorKey: null }
      : {
          correct: false,
          errorStep: "No circled answer",
          bbox,
          mark: "circle your answer",
          hint: "draw a loop around your final answer",
          explanation: "A circle tells tamatar you are finished. Circle the line with a = …, and it will offer to check it.",
          fullSolution: "a = F / m = 10 / 2 = 5 m/s²",
          errorKey: "no_circle",
        };
    setThinking(false);
    setResult(res);
    setKey((k) => k + 1);
    store.applyCheck(res);
    setLoop(null);
  };

  return (
    <main className="grid-paper min-h-screen px-10 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Tomato size={64} />
        <h1 className="text-[1.75rem]">one practice problem, then you’re in</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Example />
        <div className="hand wb relative flex flex-col bg-white p-5">
          <div className="mb-2 text-[1rem] text-muted">your turn: a 2 kg cart is pushed with 10 N. find a.</div>
          <InkCanvas
            ink={ink}
            tool={tool}
            className="overflow-visible rounded-xl"
            placeholder="your turn. write it out here, then circle your answer"
            onStroke={() => result && setStale(true)}
            onCircle={(b) => setLoop(b)}
          >
            <OverlayLayer
              result={result}
              resultKey={key}
              level={store.helpLevel}
              thinking={thinking}
              stale={stale}
              dimmed={false}
              successText={`nice, ${store.name || "friend"}!`}
              onMarkTap={() => store.setHelpLevel(1)}
              onCheckAgain={() => check(false)}
            />
            {loop && !result?.correct && (
              <button
                type="button"
                className="bubble btn btn-red absolute z-10 !text-[0.9rem]"
                style={{ left: `${((loop.x + loop.w) / 1000) * 100}%`, top: `${(loop.y / 640) * 100}%`, translate: "6px -60%" }}
                onClick={() => check(true)}
              >
                Check this?
              </button>
            )}
            <div className="absolute bottom-3 left-3 z-10">
              <Toolbar ink={ink} tool={tool} setTool={setTool} />
            </div>
          </InkCanvas>
          <div className="mt-4 flex justify-end">
            {result?.correct ? (
              <Button variant="red" className="wa !px-7 !text-[1.3rem] bubble" onClick={() => router.push("/home")}>
                take me to my homework
              </Button>
            ) : (
              <Button variant="red" className="wa" disabledReason={thinking ? "the red pen is still reading" : ink.strokes.length ? null : "write your answer first"} onClick={() => check(false)}>
                Check
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
