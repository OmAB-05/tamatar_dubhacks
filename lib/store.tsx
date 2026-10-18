"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HOMEWORK, MONDAY_SCRATCH, type Homework } from "@/data/problems";
import * as cloud from "./cloud";
import type { Account } from "./cloud";
import type { PartProgress } from "./progress";
import { clearAll, load, save } from "./storage";
import { onRight, onWrong, type TomatoMemory, type TomatoReactionKind } from "./tomato";
import type { CheckResponse, HelpLevel, Stroke } from "./types";

export type Board = { id: string; title: string; strokes: Stroke[] };
export type { PartProgress } from "./progress";
/** The student's ink for one problem, saved so a break never loses work. */
export type Answer = { fbd: Stroke[]; equations: Stroke[] };

type Store = {
  ready: boolean;
  /** Signed-in account (null when signed out, or when Supabase isn't configured). */
  account: Account | null;
  /** false until we know whether someone is signed in. */
  authReady: boolean;
  /** true when the app needs an account (Supabase is configured). */
  needsAccount: boolean;
  signOut: () => Promise<void>;
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
  /** Saves an uploaded worksheet (to the account when signed in) and returns it as stored. */
  addHomework: (hw: Homework) => Promise<Homework>;
  boards: Board[];
  saveBoard: (b: Board) => void;
  toast: (msg: string) => void;
  resetAll: () => void;
};

const Ctx = createContext<Store | null>(null);

const DEFAULT_BOARDS: Board[] = [{ id: "monday", title: "Monday scratch", strokes: MONDAY_SCRATCH }];
const EMPTY_PROGRESS: PartProgress = { fbd: false, equations: false };
const SYNC_DELAY_MS = 1200;

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
  const [account, setAccount] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(!cloud.supabaseConfigured);

  // Latest values for the debounced cloud sync, which runs outside React renders.
  const accountRef = useRef<Account | null>(null);
  const progressRef = useRef(progress);
  const answersRef = useRef(answers);
  progressRef.current = progress;
  answersRef.current = answers;
  const pending = useRef(new Set<string>());
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();

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

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg((t) => ({ msg, n: (t?.n ?? 0) + 1 }));
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(syncTimer.current);
    const ids = Array.from(pending.current);
    pending.current.clear();
    if (!accountRef.current || !ids.length) return;
    try {
      await cloud.saveWork(ids.map((id) => ({ problemId: id, progress: progressRef.current[id] ?? EMPTY_PROGRESS, answer: answersRef.current[id] ?? null })));
    } catch {
      ids.forEach((id) => pending.current.add(id)); // retried with the next change or when the tab hides
    }
  }, []);

  const queueSync = useCallback((id: string) => {
    if (!accountRef.current) return;
    pending.current.add(id);
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(flush, SYNC_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  // Follow the Supabase session. On sign-in, the account's worksheets and work replace the
  // local copy (work saved in this browser before accounts existed is uploaded once).
  useEffect(() => {
    if (!ready || !cloud.supabaseConfigured) return;
    let live = true;
    const unsubscribe = cloud.onAuthChange(async (next) => {
      const prev = accountRef.current;
      if (next?.id === prev?.id) {
        if (live) setAuthReady(true);
        return;
      }
      await flush();
      accountRef.current = next;
      if (!live) return;
      setAccount(next);
      if (!next) {
        if (prev || load<string | null>("owner", null)) {
          // signed out: don't leave one person's homework in the browser for the next
          save("owner", null);
          setNameRaw(""); save("name", "");
          setProgressRaw({}); save("progress", {});
          setAnswers({}); save("answers", {});
          setImportedHomework([]); save("homework", []);
        }
        setAuthReady(true);
        return;
      }
      if (next.name) { setNameRaw(next.name); save("name", next.name); }
      try {
        const [worksheets, work] = await Promise.all([cloud.loadWorksheets(), cloud.loadWork()]);
        const owner = load<string | null>("owner", null);
        const localProgress = load<Record<string, PartProgress>>("progress", {});
        const localAnswers = load<Record<string, Answer>>("answers", {});
        if (!owner && !Object.keys(work.progress).length && Object.keys(localProgress).length) {
          // first sign-in on a browser with pre-account work: keep it
          const ids = Array.from(new Set([...Object.keys(localProgress), ...Object.keys(localAnswers)]));
          await cloud.saveWork(ids.map((id) => ({ problemId: id, progress: localProgress[id] ?? EMPTY_PROGRESS, answer: localAnswers[id] ?? null })));
          Object.assign(work.progress, localProgress);
          Object.assign(work.answers, localAnswers);
        }
        if (!live) return;
        save("owner", next.id);
        setProgressRaw(work.progress); save("progress", work.progress);
        setAnswers(work.answers); save("answers", work.answers);
        setImportedHomework(worksheets); save("homework", worksheets);
      } catch (err) {
        toast(err instanceof Error ? err.message : "could not load your saved work");
      } finally {
        if (live) setAuthReady(true);
      }
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [ready, flush, toast]);

  const signOut = useCallback(async () => {
    await flush();
    await cloud.signOut();
  }, [flush]);

  const setName = useCallback((n: string) => {
    setNameRaw(n);
    save("name", n);
    if (accountRef.current) cloud.updateName(n).catch(() => {});
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
      progressRef.current = next;
      return next;
    });
    queueSync(id);
  }, [queueSync]);

  const saveAnswer = useCallback((id: string, a: Answer) => {
    setAnswers((all) => {
      if (all[id] === a) return all;
      const next = { ...all, [id]: a };
      save("answers", next);
      answersRef.current = next;
      return next;
    });
    queueSync(id);
  }, [queueSync]);

  const addHomework = useCallback(async (hw: Homework) => {
    const user = accountRef.current;
    const stored = user ? await cloud.saveWorksheet(user.id, { ...hw, createdAt: new Date().toISOString() }) : hw;
    setImportedHomework((all) => {
      const next = [stored, ...all];
      save("homework", next);
      return next;
    });
    return stored;
  }, []);

  const saveBoard = useCallback((b: Board) => {
    setBoards((all) => {
      const next = all.some((x) => x.id === b.id) ? all.map((x) => (x.id === b.id ? b : x)) : [...all, b];
      save("boards", next);
      return next;
    });
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
      ready, account, authReady, needsAccount: cloud.supabaseConfigured, signOut, name, setName, tomato, setTomatoState, reaction, react, applyCheck, streak,
      helpLevel, setHelpLevel, progress, setProgress, answers, saveAnswer, homework: [...importedHomework, ...HOMEWORK], addHomework, boards, saveBoard, toast, resetAll,
    }),
    [ready, account, authReady, signOut, name, setName, tomato, setTomatoState, reaction, react, applyCheck, streak, helpLevel, setHelpLevel, progress, setProgress, answers, saveAnswer, importedHomework, addHomework, boards, saveBoard, toast, resetAll],
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
