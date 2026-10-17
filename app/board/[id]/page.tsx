"use client";

import { useEffect, useRef, useState } from "react";
import FitBoard from "@/components/Board";
import Button from "@/components/Button";
import HelpLevelBar from "@/components/HelpLevelBar";
import InkCanvas, { type Tool } from "@/components/InkCanvas";
import OverlayLayer from "@/components/OverlayLayer";
import Toolbar from "@/components/Toolbar";
import Topbar from "@/components/Topbar";
import { useChecker } from "@/components/useChecker";
import { MOCK } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { HelpLevel } from "@/lib/types";
import { useInk } from "@/lib/useInk";

/** Blank whiteboard: full canvas, general "find the first slip" check (§4.8). */
export default function BoardPage({ params }: { params: { id: string } }) {
  const store = useStore();
  const board = store.boards.find((b) => b.id === params.id);
  const ink = useInk(board?.strokes ?? []);
  const [tool, setTool] = useState<Tool>("pen");
  const [title, setTitle] = useState(board?.title ?? "untitled board");
  const chk = useChecker({ problem: null, part: "board", level: store.helpLevel });
  const loaded = useRef(!!board);

  // The store hydrates from localStorage after mount; pick the board up once it arrives.
  useEffect(() => {
    if (!loaded.current && board) {
      loaded.current = true;
      ink.reset(board.strokes);
      setTitle(board.title);
    }
  }, [board, ink]);

  // Autosave strokes for the home thumbnail.
  useEffect(() => {
    if (!store.ready) return;
    const t = setTimeout(() => store.saveBoard({ id: params.id, title, strokes: ink.strokes }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink.strokes, title, store.ready]);

  const setLevel = (l: HelpLevel) => {
    store.setHelpLevel(l);
    chk.countReveal(l, !!chk.result && !chk.result.correct);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-[min(320px,40vw)] border-b-[1.5px] border-dashed border-transparent bg-transparent text-[1.05rem] text-ink-2 outline-none focus:border-rule"
          aria-label="board name"
        />
      </Topbar>
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col px-6 py-5">
          <FitBoard>
            <InkCanvas ink={ink} tool={tool} className="hand wb" placeholder="a blank page. write anything, then tap Check" onStroke={() => chk.markStale()}>
              <OverlayLayer
                result={chk.result}
                resultKey={chk.key}
                level={store.helpLevel}
                thinking={chk.thinking}
                stale={chk.stale}
                dimmed={chk.dimmed}
                successText="looks right to me!"
                onMarkTap={() => store.helpLevel === 0 && setLevel(1)}
                onCheckAgain={() => chk.check(ink.strokes)}
              />
              <div className="absolute bottom-3 left-3 z-10">
                <Toolbar ink={ink} tool={tool} setTool={setTool} />
              </div>
            </InkCanvas>
          </FitBoard>
        </section>
        <aside className="flex w-[170px] shrink-0 flex-col gap-5 border-l-[1.5px] border-dashed border-rule px-4 py-5">
          <Button variant="red" className="wa w-full !min-h-[64px] !text-[1.5rem]" disabledReason={chk.thinking ? "the red pen is still reading" : ink.strokes.length ? null : "write something first"} onClick={() => chk.check(ink.strokes)}>
            Check
          </Button>
          {chk.error && <p role="alert" className="text-[0.85rem] text-tomato">{chk.error}</p>}
          {MOCK && <p className="text-[0.7rem] text-muted">Demo mode: feedback is simulated</p>}
          <HelpLevelBar level={store.helpLevel} onChange={setLevel} />
        </aside>
      </div>
    </div>
  );
}
