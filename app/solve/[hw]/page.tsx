"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import FitBoard from "@/components/Board";
import Button from "@/components/Button";
import HelpLevelBar from "@/components/HelpLevelBar";
import InkCanvas, { type LoopBox, type Tool } from "@/components/InkCanvas";
import Modal from "@/components/Modal";
import OverlayLayer from "@/components/OverlayLayer";
import PartTabs from "@/components/PartTabs";
import ProblemPanel, { Dots } from "@/components/ProblemPanel";
import RampDiagram from "@/components/RampDiagram";
import StrokeThumb from "@/components/StrokeThumb";
import Tally from "@/components/Tally";
import Tomato from "@/components/Tomato";
import Toolbar from "@/components/Toolbar";
import Topbar from "@/components/Topbar";
import { useChecker } from "@/components/useChecker";
import { MOCK } from "@/lib/api";
import { BOARD_H, BOARD_W } from "@/lib/ink";
import { useStore } from "@/lib/store";
import type { HelpLevel, ProblemPart, Stroke } from "@/lib/types";
import { useInk } from "@/lib/useInk";

const EMPTY_PROGRESS = { fbd: false, equations: false };

const PLACEHOLDER: Record<ProblemPart, string> = {
  fbd: "draw the forces on the block as arrows",
  equations: "write your equations here",
};

/** Given values as tappable chips: tap → a tiny sticky with the value to copy. */
function Chip({ k, v }: { k: string; v: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 2200);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <button type="button" onClick={() => setOpen(true)} className="relative rounded-full border-[1.5px] border-dashed border-tomato bg-white px-2.5 py-0.5 text-[0.8rem]">
      {k} = {v}
      {open && (
        <span className="sticky bubble absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[1.1rem]">
          {k} = {v}
        </span>
      )}
    </button>
  );
}

export default function Solve({ params }: { params: { hw: string } }) {
  const router = useRouter();
  const store = useStore();
  const hw = store.homework.find((h) => h.id === params.hw && h.due) ?? store.homework[0];
  const [index, setIndex] = useState(0);
  const problem = hw.problems[index];
  const [part, setPart] = useState<ProblemPart>("fbd");
  const [tool, setTool] = useState<Tool>("pen");
  const [panelOpen, setPanelOpen] = useState(true);
  const [turning, setTurning] = useState(0);
  const [peek, setPeek] = useState(false);
  const [loop, setLoop] = useState<LoopBox | null>(null);

  const level = store.helpLevel;
  const fbdInk = useInk();
  const eqInk = useInk();
  const ink = part === "fbd" ? fbdInk : eqInk;
  const fbdCheck = useChecker({ problem, part: "fbd", level });
  const eqCheck = useChecker({ problem, part: "equations", level });
  const chk = part === "fbd" ? fbdCheck : eqCheck;
  const saved = useRef<Record<string, { fbd: Stroke[]; equations: Stroke[] }>>({});

  const prog = store.progress[problem.id] ?? EMPTY_PROGRESS;
  const doneCount = hw.problems.filter((p) => store.progress[p.id]?.fbd && store.progress[p.id]?.equations).length;

  // Remember ink per problem so tapping around the PDF never loses work.
  const selectProblem = useCallback(
    (i: number) => {
      if (i === index) return;
      saved.current[problem.id] = { fbd: fbdInk.strokes, equations: eqInk.strokes };
      const next = hw.problems[i];
      const s = saved.current[next.id];
      fbdInk.reset(s?.fbd ?? []);
      eqInk.reset(s?.equations ?? []);
      fbdCheck.reset();
      eqCheck.reset();
      setLoop(null);
      setPart(store.progress[next.id]?.fbd ? "equations" : "fbd");
      setIndex(i);
    },
    [index, problem.id, fbdInk, eqInk, hw.problems, fbdCheck, eqCheck, store.progress],
  );

  const runCheck = useCallback(
    async (isFinal = false) => {
      setLoop(null);
      const res = await chk.check(ink.strokes, isFinal);
      if (!res?.correct) return;
      if (part === "fbd") {
        store.setProgress(problem.id, { ...prog, fbd: true });
        setTimeout(() => store.toast("on to the equations →"), 1400);
      } else {
        store.setProgress(problem.id, { fbd: true, equations: true });
        setTimeout(() => store.toast(index < hw.problems.length - 1 ? "your tomato perked right up" : "homework done!"), 1400);
      }
    },
    [chk, ink.strokes, part, store, problem.id, prog, index, hw.problems.length],
  );

  const next = useCallback(() => {
    if (index >= hw.problems.length - 1) return router.push("/");
    setTurning((t) => t + 1);
    setTimeout(() => selectProblem(index + 1), 250);
  }, [index, hw.problems.length, router, selectProblem]);

  const setLevel = (l: HelpLevel) => {
    store.setHelpLevel(l);
    chk.countReveal(l, !!chk.result && !chk.result.correct);
  };

  const checkReason = chk.thinking ? "the red pen is still reading" : !ink.strokes.length ? "write your answer first" : null;
  const nextReason = prog.equations ? null : !prog.fbd ? "get the diagram right first" : "finish the equations first";

  // Keyboard: P pen · E eraser · ⌘Z / ⇧⌘Z · Enter check · 1–4 help · → next
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as Element).closest("input,textarea")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? ink.redo() : ink.undo();
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "p") setTool("pen");
      else if (e.key === "e") setTool("eraser");
      else if (e.key === "Enter" && !checkReason) runCheck();
      else if (["1", "2", "3", "4"].includes(e.key)) setLevel((Number(e.key) - 1) as HelpLevel);
      else if (e.key === "ArrowRight" && !nextReason) next();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // "Check this?" bubble fades if ignored.
  useEffect(() => {
    if (!loop) return;
    const t = setTimeout(() => setLoop(null), 4000);
    return () => clearTimeout(t);
  }, [loop]);

  const ringBox = chk.result?.bbox;
  const feedback = chk.thinking || !!chk.result;

  if (!store.ready) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar>
        <div className="hidden items-center gap-3 text-[0.9rem] text-muted lg:flex">
          <span>{hw.title}</span>
          <Dots total={hw.problems.length} done={doneCount} current={index} />
        </div>
      </Topbar>

      <div className="flex min-h-0 flex-1">
        <ProblemPanel hw={hw} index={index} progress={store.progress} open={panelOpen} setOpen={setPanelOpen} onSelect={selectProblem} />

        <section key={turning} className={`flex min-w-0 flex-1 flex-col gap-3 px-6 pb-4 pt-4 ${turning ? "page-turn" : ""}`}>
          {/* qbox */}
          <div className="flex items-center gap-4 rounded-2xl border-2 border-dotted border-tomato bg-white px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[0.85rem] text-tomato">problem {index + 1}</div>
              <p className="text-[19px] leading-snug tracking-[.01em] text-ink-2">{problem.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(problem.givenValues).map(([k, v]) => (
                  <Chip key={k} k={k} v={v} />
                ))}
              </div>
            </div>
            <RampDiagram angle={parseInt(problem.givenValues.θ ?? "30")} width={150} />
          </div>

          <PartTabs part={part} locked={!prog.fbd} onChange={(p) => { setPart(p); setLoop(null); }} />

          <FitBoard>
            <div key={part} className="board-enter relative">
              <InkCanvas
                ink={ink}
                tool={tool}
                placeholder={PLACEHOLDER[part]}
                className="hand wb overflow-visible"
                onStroke={() => chk.markStale()}
                onCircle={(b) => setLoop(b)}
                onEraseAt={(x, y) => {
                  if (!ringBox) return;
                  const inside = x > ringBox.x * BOARD_W - 30 && x < (ringBox.x + ringBox.w) * BOARD_W + 30 && y > ringBox.y * BOARD_H - 30 && y < (ringBox.y + ringBox.h) * BOARD_H + 30;
                  if (inside) chk.dim();
                }}
              >
                <OverlayLayer
                  result={chk.result}
                  resultKey={chk.key}
                  level={level}
                  thinking={chk.thinking}
                  stale={chk.stale}
                  dimmed={chk.dimmed}
                  successText={part === "fbd" ? `nice diagram, ${store.name || "friend"}!` : "you got it!"}
                  onMarkTap={() => level === 0 && setLevel(1)}
                  onCheckAgain={() => runCheck()}
                />
                {loop && (
                  <button
                    key={`${loop.x}-${loop.y}`}
                    type="button"
                    className="bubble btn btn-red absolute z-10 !text-[0.9rem]"
                    style={{ left: `${((loop.x + loop.w) / BOARD_W) * 100}%`, top: `${(loop.y / BOARD_H) * 100}%`, translate: "6px -60%" }}
                    onClick={() => runCheck(true)}
                  >
                    Check this?
                  </button>
                )}
                {/* FBD thumbnail pinned on the equations board */}
                {part === "equations" && fbdInk.strokes.length > 0 && (
                  <button
                    type="button"
                    aria-label="peek at your diagram"
                    onClick={() => setPeek(true)}
                    className="hand wa absolute right-3 top-3 z-10 h-[78px] w-[122px] overflow-hidden bg-white shadow-[3px_4px_0_#f6d9d5]"
                    style={{ animation: "board-in 400ms var(--pop) both" }}
                  >
                    <StrokeThumb strokes={fbdInk.strokes} className="h-full w-full" />
                  </button>
                )}
                <div className="absolute bottom-3 left-3 z-10">
                  <Toolbar ink={ink} tool={tool} setTool={setTool} />
                </div>
                {/* the tomato peeks in from the corner during feedback */}
                <div
                  className="absolute -bottom-5 -right-5 z-10 transition-transform duration-500"
                  style={{ transform: feedback ? "translate(0,0) rotate(-8deg)" : "translate(30px, 40px) rotate(10deg) scale(.6)", opacity: feedback ? 1 : 0, transitionTimingFunction: "var(--pop)" }}
                >
                  <Tomato size={70} track />
                </div>
              </InkCanvas>
            </div>
          </FitBoard>
        </section>

        {/* rail */}
        <aside className="flex w-[170px] shrink-0 flex-col gap-5 border-l-[1.5px] border-dashed border-rule bg-white px-4 py-5">
          <Button variant="red" className="wa w-full !min-h-[64px] !text-[1.5rem]" disabledReason={checkReason} onClick={() => runCheck()}>
            Check
          </Button>
          {chk.error && <p role="alert" className="text-[0.85rem] text-tomato">{chk.error}</p>}
          <HelpLevelBar level={level} onChange={setLevel} />
          <Tally n={fbdCheck.hints + eqCheck.hints} />
          <div className="flex-1" />
          {MOCK && <div className="sticky text-[0.6rem] leading-snug text-ink-2">Demo mode: feedback is simulated</div>}
          <Button variant={prog.equations ? "red" : "plain"} className="wc w-full !text-[1rem]" disabledReason={nextReason} onClick={next}>
            {index < hw.problems.length - 1 ? "Next question →" : "Finish →"}
          </Button>
        </aside>
      </div>

      {peek && (
        <Modal onClose={() => setPeek(false)} className="!max-w-[900px]">
          <div className="mb-2 text-[1.2rem]">your diagram</div>
          <div className="grid-paper hand wb">
            <StrokeThumb strokes={fbdInk.strokes} className="h-auto w-full" />
          </div>
        </Modal>
      )}
    </div>
  );
}
