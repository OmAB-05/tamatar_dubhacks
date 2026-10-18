"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { exportHomeworkPdf } from "@/lib/pdf";
import { rampSvg } from "@/lib/ramp";
import { useStore } from "@/lib/store";
import type { HelpLevel, ProblemPart } from "@/lib/types";
import { useInk } from "@/lib/useInk";

const EMPTY_PROGRESS = { fbd: false, equations: false };

const PLACEHOLDER: Record<ProblemPart, string> = {
  fbd: "",
  equations: "write your equations here",
};

export default function Solve({ params }: { params: { hw: string } }) {
  const router = useRouter();
  const store = useStore();
  const hw = store.homework.find((h) => h.id === params.hw && h.due) ?? store.homework[0];
  const [index, setIndex] = useState(0);
  const problem = hw.problems[index];
  const [part, setPart] = useState<ProblemPart>("fbd");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#1f1a17");
  const [size, setSize] = useState(7);
  const [panelOpen, setPanelOpen] = useState(true);
  const [turning, setTurning] = useState(0);
  const [peek, setPeek] = useState(false);
  const [loop, setLoop] = useState<LoopBox | null>(null);
  const [exporting, setExporting] = useState(false);

  const angle = parseInt(problem.givenValues["θ"] ?? "30") || 30;
  const ramp = useMemo(() => rampSvg(angle), [angle]);

  const level = store.helpLevel;
  const fbdInk = useInk();
  const eqInk = useInk();
  const ink = part === "fbd" ? fbdInk : eqInk;
  const fbdCheck = useChecker({ problem, part: "fbd", level, underlay: ramp });
  const eqCheck = useChecker({ problem, part: "equations", level });
  const chk = part === "fbd" ? fbdCheck : eqCheck;

  const prog = store.progress[problem.id] ?? EMPTY_PROGRESS;
  const doneCount = hw.problems.filter((p) => store.progress[p.id]?.fbd && store.progress[p.id]?.equations).length;
  const allDone = doneCount === hw.problems.length;

  // Open on the first unfinished problem with its saved ink, once saved data has loaded.
  const opened = useRef(false);
  useEffect(() => {
    if (!store.ready || opened.current) return;
    opened.current = true;
    const first = Math.max(0, hw.problems.findIndex((p) => !(store.progress[p.id]?.fbd && store.progress[p.id]?.equations)));
    const p = hw.problems[first];
    const a = store.answers[p.id];
    fbdInk.reset(a?.fbd ?? []);
    eqInk.reset(a?.equations ?? []);
    setPart(store.progress[p.id]?.fbd ? "equations" : "fbd");
    setIndex(first);
  }, [store.ready, store.progress, store.answers, hw.problems, fbdInk, eqInk]);

  // Autosave the current problem's ink so a break (or a reload) never loses work.
  const { saveAnswer } = store;
  useEffect(() => {
    if (!opened.current) return;
    const t = setTimeout(() => saveAnswer(problem.id, { fbd: fbdInk.strokes, equations: eqInk.strokes }), 500);
    return () => clearTimeout(t);
  }, [fbdInk.strokes, eqInk.strokes, problem.id, saveAnswer]);

  const saveNow = () => {
    saveAnswer(problem.id, { fbd: fbdInk.strokes, equations: eqInk.strokes });
    store.toast(`saved. ${doneCount} of ${hw.problems.length} done, take a break`);
  };

  const selectProblem = useCallback(
    (i: number) => {
      if (i === index) return;
      saveAnswer(problem.id, { fbd: fbdInk.strokes, equations: eqInk.strokes });
      const next = hw.problems[i];
      const a = store.answers[next.id];
      fbdInk.reset(a?.fbd ?? []);
      eqInk.reset(a?.equations ?? []);
      fbdCheck.reset();
      eqCheck.reset();
      setLoop(null);
      setPart(store.progress[next.id]?.fbd ? "equations" : "fbd");
      setIndex(i);
    },
    [index, problem.id, fbdInk, eqInk, hw.problems, fbdCheck, eqCheck, store.progress, store.answers, saveAnswer],
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
        const finished = doneCount + 1 >= hw.problems.length;
        setTimeout(() => store.toast(finished ? "homework done! export it as a PDF" : "your tomato perked right up"), 1400);
      }
    },
    [chk, ink.strokes, part, store, problem.id, prog, doneCount, hw.problems.length],
  );

  const next = useCallback(() => {
    if (index >= hw.problems.length - 1) return router.push("/home");
    setTurning((t) => t + 1);
    setTimeout(() => selectProblem(index + 1), 250);
  }, [index, hw.problems.length, router, selectProblem]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const answers = { ...store.answers, [problem.id]: { fbd: fbdInk.strokes, equations: eqInk.strokes } };
      await exportHomeworkPdf(hw, answers, store.name);
      store.toast("PDF saved. upload it to Canvas");
    } catch {
      store.toast("could not make the PDF. try again?");
    } finally {
      setExporting(false);
    }
  };

  const setLevel = (l: HelpLevel) => {
    store.setHelpLevel(l);
    chk.countReveal(l, !!chk.result && !chk.result.correct);
  };

  const checkReason = chk.thinking ? "the red pen is still reading" : !ink.strokes.length ? (part === "fbd" ? "draw the forces first" : "write your answer first") : null;
  const nextReason = prog.equations ? null : !prog.fbd ? "get the diagram right first" : "finish the equations first";

  // Drawing shortcuts live in Toolbar. Keep page actions away from calculator inputs.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as Element).closest("input,textarea,select,button,[contenteditable=true],[role=dialog]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        return saveNow();
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Enter" && !checkReason) runCheck();
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
    // fixed to the viewport: the page never scrolls or bounces under the Pencil
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      <Topbar>
        <div className="hidden items-center gap-3 text-[0.9rem] text-muted xl:flex">
          <span className="whitespace-nowrap">{hw.title}</span>
          <Dots total={hw.problems.length} done={doneCount} current={index} />
        </div>
      </Topbar>

      <div className="flex min-h-0 flex-1">
        <ProblemPanel hw={hw} index={index} progress={store.progress} open={panelOpen} setOpen={setPanelOpen} onSelect={selectProblem} />

        <section key={turning} className={`flex min-w-0 flex-1 flex-col gap-3 px-6 pb-4 pt-4 ${turning ? "page-turn" : ""}`}>
          {/* problem: just the label, the question and the setup */}
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <div className="text-[1.15rem] text-tomato">Problem {index + 1}</div>
              <p className="mt-1 text-[1rem] leading-snug text-ink-2">{problem.text}</p>
            </div>
            <button type="button" aria-label="show the ramp on the diagram board" onClick={() => setPart("fbd")} className="shrink-0 rounded-xl p-1 transition-colors hover:bg-blush">
              <RampDiagram angle={angle} width={120} />
            </button>
          </div>

          <PartTabs part={part} locked={!prog.fbd} onChange={(p) => { setPart(p); setLoop(null); }} />

          <FitBoard>
            <div key={part} className="board-enter relative">
              <InkCanvas
                ink={ink}
                tool={tool}
                color={color}
                size={size}
                placeholder={PLACEHOLDER[part]}
                className="hand wb overflow-visible"
                background={part === "fbd" ? <g dangerouslySetInnerHTML={{ __html: ramp }} /> : undefined}
                onStroke={() => chk.markStale()}
                onCircle={(b) => setLoop(b)}
                onEraseAt={(x, y) => {
                  if (!ringBox) return;
                  const inside = x > ringBox.x * BOARD_W - 30 && x < (ringBox.x + ringBox.w) * BOARD_W + 30 && y > ringBox.y * BOARD_H - 30 && y < (ringBox.y + ringBox.h) * BOARD_H + 30;
                  if (inside) chk.dim();
                }}
              >
                {part === "fbd" && !fbdInk.strokes.length && (
                  <div className="pointer-events-none absolute right-6 top-5 text-[1rem] text-faint">draw the forces on the block as arrows</div>
                )}
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
                {part === "equations" && (
                  <button
                    type="button"
                    aria-label="peek at your diagram"
                    onClick={() => setPeek(true)}
                    className="hand wa absolute right-3 top-3 z-10 h-[4rem] w-[6.25rem] overflow-hidden bg-white shadow-[3px_4px_0_#f6d9d5]"
                    style={{ animation: "board-in 400ms var(--pop) both" }}
                  >
                    <StrokeThumb strokes={fbdInk.strokes} underlay={ramp} className="h-full w-full" />
                  </button>
                )}
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
          <Toolbar ink={ink} tool={tool} setTool={setTool} color={color} setColor={setColor} size={size} setSize={setSize} />
        </section>

        {/* rail */}
        <aside className="flex w-[12.5rem] shrink-0 flex-col gap-5 border-l-[1.5px] border-dashed border-rule bg-white px-5 py-5">
          <Button variant="red" className="wa w-full !min-h-[3.4rem] !text-[1.5rem]" disabledReason={checkReason} onClick={() => runCheck()}>
            Check
          </Button>
          {chk.error && <p role="alert" className="text-[0.85rem] text-tomato">{chk.error}</p>}
          <HelpLevelBar level={level} onChange={setLevel} />
          <Tally n={fbdCheck.hints + eqCheck.hints} />
          <div className="flex-1" />
          {MOCK && <div className="text-[0.7rem] leading-snug text-faint">demo mode: feedback is simulated</div>}
          <Button className="wb w-full !text-[0.95rem]" onClick={saveNow}>
            Save progress
          </Button>
          <Button
            variant={allDone ? "red" : "plain"}
            className="wa w-full !text-[0.95rem]"
            disabledReason={exporting ? "making your PDF…" : allDone ? null : `finish all ${hw.problems.length} problems to export (${doneCount} done)`}
            onClick={exportPdf}
          >
            Export PDF
          </Button>
          <Button variant={prog.equations ? "red" : "plain"} className="wc w-full !text-[0.95rem]" disabledReason={nextReason} onClick={next}>
            {index < hw.problems.length - 1 ? "Next question →" : "Finish →"}
          </Button>
        </aside>
      </div>

      {peek && (
        <Modal onClose={() => setPeek(false)} className="!max-w-[46rem]">
          <div className="mb-2 text-[1.2rem]">your diagram</div>
          <div className="hand wb bg-white">
            <StrokeThumb strokes={fbdInk.strokes} underlay={ramp} className="h-auto w-full" />
          </div>
        </Modal>
      )}
    </div>
  );
}
