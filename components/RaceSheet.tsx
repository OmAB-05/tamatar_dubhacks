"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Dots } from "./ProblemPanel";
import Tomato from "./Tomato";

/** Race a friend sheet with a live (simulated) leaderboard that reorders (§4.7). */
export default function RaceSheet({ onClose }: { onClose: () => void }) {
  const { name, toast } = useStore();
  const [rows, setRows] = useState([
    { who: name || "you", done: 1, errors: 1, rot: 0 as const },
    { who: "sai", done: 0, errors: 0, rot: 1 as const },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setRows((r) => r.map((x) => (x.who === "sai" && x.done < 4 ? { ...x, done: x.done + 1, errors: x.errors + (Math.random() < 0.4 ? 1 : 0) } : x)));
    }, 3500);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", k);
    };
  }, [onClose]);

  const order = [...rows].sort((a, b) => b.done - a.done || a.errors - b.errors).map((r) => r.who);
  const link = "tamatar.si/race/x7k2";

  return (
    <div className="fixed inset-0 z-50" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="hand wa absolute bottom-3 right-3 top-3 flex w-[min(440px,92vw)] flex-col gap-4 bg-white p-6 shadow-[-6px_8px_0_#f6d9d5]" style={{ animation: "board-in 320ms var(--pop) both" }}>
        <div className="flex items-start justify-between">
          <h2 className="text-[1.6rem]">Race a friend</h2>
          <button type="button" aria-label="close" onClick={onClose} className="h-11 w-11 text-[1.2rem] text-muted">
            ×
          </button>
        </div>
        <p className="text-[0.9rem] text-ink-2">Send this homework to a friend. You both get the same page. Finish first with the fewest errors to win.</p>
        <button
          type="button"
          className="sticky select-all text-left text-[1rem]"
          onClick={() => {
            navigator.clipboard?.writeText("https://" + link).catch(() => {});
            toast("copied!");
          }}
        >
          {link}
        </button>
        <p className="text-[0.75rem] text-muted">The race starts when your friend opens the link.</p>
        <div className="relative" style={{ height: rows.length * 64 }}>
          {rows.map((r) => (
            <div
              key={r.who}
              className="absolute inset-x-0 flex h-14 items-center gap-3 rounded-xl border-[1.5px] border-dashed border-rule px-3"
              style={{ transform: `translateY(${order.indexOf(r.who) * 64}px)`, transition: "transform 400ms var(--pop)" }}
            >
              <span className="w-5 text-tomato">{order.indexOf(r.who) + 1}</span>
              <Tomato size={36} state={r.rot} interactive={false} listen={false} track={false} />
              <span className="flex-1 text-[1rem]">{r.who}</span>
              <Dots total={4} done={r.done} />
              <span className="w-16 text-right text-[0.75rem] text-muted">{r.errors} slips</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
