"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HOMEWORK, MONDAY_SCRATCH, type Homework } from "@/data/problems";
import { clearAll, load, save } from "./storage";
import { onRight, onWrong, type TomatoMemory, type TomatoReactionKind } from "./tomato";
import type { CheckResponse, HelpLevel, Stroke } from "./types";

export type Board = { id: string; title: string; strokes: Stroke[] };
export type PartProgress = { fbd: boolean; equations: boolean };
/** The student's ink for one problem, saved so a break never loses work. */
export type Answer = { fbd: Stroke[]; equations: Stroke[] };

type Store = {
  ready: boolean;
  name: string;
  setName: (n: string) => void;
  tomato: TomatoMemory;
  setTomatoState: (s: TomatoMemory["state"]) => void;
  reaction: { kind: TomatoReactionKind; n: number } | null;
  react: (kind: TomatoReactionKind) => void;
  applyCheck: (res: CheckResponse) => void;
  streak: number;
  helpLevel: HelpLevel;
  setHelpLevel: (l: HelpLevel) => void;
  progress: Record<string, PartProgress>;
  setProgress: (problemId: string, p: PartProgress) => void;
  answers: Record<string, Answer>;
  saveAnswer: (problemId: string, a: Answer) => void;
  homework: Homework[];
  addHomework: (hw: Homework) => void;
  boards: Board[];
  saveBoard: (b: Board) => void;
  toast: (msg: string) => void;
  resetAll: () => void;
};

const Ctx = createContext<Store | null>(null);

const DEFAULT_BOARDS: Board[] = [{ id: "monday", title: "Monday scratch", strokes: MONDAY_SCRATCH }];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [name, setNameRaw] = useState("");
  const [tomato, setTomato] = useState<TomatoMemory>({ state: 0, lastErrorKey: null });
  const [reaction, setReaction] = useState<Store["reaction"]>(null);
  const [streak, setStreak] = useState(4);
  const [helpLevel, setHelpLevelRaw] = useState<HelpLevel>(0);
  const [progress, setProgressRaw] = useState<Record<string, PartProgress>>({});
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [importedHomework, setImportedHomework] = useState<Homework[]>([]);
  const [boards, setBoards] = useState<Board[]>(DEFAULT_BOARDS);
  const [toastMsg, setToastMsg] = useState<{ msg: string; n: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNameRaw(load("name", ""));
    setTomato(load("tomato", { state: 0, lastErrorKey: null }));
    setStreak(load("streak", 4));
    setHelpLevelRaw(load("helpLevel", 0));
    setProgressRaw(load("progress", {}));
    setAnswers(load("answers", {}));
    setBoards(load("boards", DEFAULT_BOARDS));
    setImportedHomework(load("homework", []));
    setReady(true);
  }, []);

  const setName = useCallback((n: string) => {
    setNameRaw(n);
    save("name", n);
  }, []);

  const react = useCallback((kind: TomatoReactionKind) => setReaction((r) => ({ kind, n: (r?.n ?? 0) + 1 })), []);

  const setTomatoState = useCallback((state: TomatoMemory["state"]) => {
    setTomato((t) => {
      const next = { ...t, state };
      save("tomato", next);
      return next;
    });
  }, []);

  const applyCheck = useCallback(
    (res: CheckResponse) => {
      setTomato((t) => {
        const { next, reaction } = res.correct ? onRight(t) : onWrong(t, res.errorKey);
        save("tomato", next);
        react(reaction);
        return next;
      });
    },
    [react],
  );

  const setHelpLevel = useCallback((l: HelpLevel) => {
    setHelpLevelRaw(l);
    save("helpLevel", l);
  }, []);

  const setProgress = useCallback((id: string, p: PartProgress) => {
    setProgressRaw((all) => {
      const next = { ...all, [id]: p };
      save("progress", next);
      return next;
    });
  }, []);

  const saveAnswer = useCallback((id: string, a: Answer) => {
    setAnswers((all) => {
      const next = { ...all, [id]: a };
      save("answers", next);
      return next;
    });
  }, []);

  const addHomework = useCallback((hw: Homework) => {
    setImportedHomework((all) => {
      const next = [...all, hw];
      save("homework", next);
      return next;
    });
  }, []);

  const saveBoard = useCallback((b: Board) => {
    setBoards((all) => {
      const next = all.some((x) => x.id === b.id) ? all.map((x) => (x.id === b.id ? b : x)) : [...all, b];
      save("boards", next);
      return next;
    });
  }, []);

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg((t) => ({ msg, n: (t?.n ?? 0) + 1 }));
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const resetAll = useCallback(() => {
    clearAll();
    setNameRaw("");
    setTomato({ state: 0, lastErrorKey: null });
    setStreak(4);
    setHelpLevelRaw(0);
    setProgressRaw({});
    setAnswers({});
    setBoards(DEFAULT_BOARDS);
    setImportedHomework([]);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready, name, setName, tomato, setTomatoState, reaction, react, applyCheck, streak,
      helpLevel, setHelpLevel, progress, setProgress, answers, saveAnswer, homework: [...importedHomework, ...HOMEWORK], addHomework, boards, saveBoard, toast, resetAll,
    }),
    [ready, name, setName, tomato, setTomatoState, reaction, react, applyCheck, streak, helpLevel, setHelpLevel, progress, setProgress, answers, saveAnswer, importedHomework, addHomework, boards, saveBoard, toast, resetAll],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="toast-host">
        {toastMsg && (
          <div
            key={toastMsg.n}
            className="toast sticky-note"
            onPointerDown={(e) => {
              const y0 = e.clientY;
              const el = e.currentTarget;
              const up = (ev: PointerEvent) => {
                if (ev.clientY - y0 > 20) setToastMsg(null);
                el.removeEventListener("pointerup", up);
              };
              el.addEventListener("pointerup", up);
            }}
          >
            {toastMsg.msg}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}
