"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { shake } from "@/lib/motion";
import { useStore } from "@/lib/store";
import type { ProblemPart } from "@/lib/types";

function Padlock({ falling }: { falling?: boolean }) {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      aria-hidden
      style={falling ? { animation: "lock-pop 700ms ease-in forwards" } : undefined}
      className="lock"
    >
      <path d={falling ? "M6 10 V6 C6 1 14 1 14 6 V5" : "M6 10 V6 C6 1 14 1 14 6 V10"} stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="3" y="10" width="14" height="10" rx="2" fill="var(--sticky)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="10" cy="15" r="1.6" fill="var(--ink)" />
    </svg>
  );
}

/** diagram / equations tabs with a sliding red underline and a padlock (§3.7). */
export default function PartTabs({ part, locked, onChange }: { part: ProblemPart; locked: boolean; onChange: (p: ProblemPart) => void }) {
  const { toast } = useStore();
  const refs = { fbd: useRef<HTMLButtonElement>(null), equations: useRef<HTMLButtonElement>(null) };
  const [bar, setBar] = useState({ x: 0, w: 0 });
  const [unlocking, setUnlocking] = useState(false);
  const wasLocked = useRef(locked);

  useLayoutEffect(() => {
    const el = refs[part].current;
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, locked]);

  useEffect(() => {
    if (wasLocked.current && !locked) {
      setUnlocking(true);
      const t = setTimeout(() => setUnlocking(false), 900);
      return () => clearTimeout(t);
    }
    wasLocked.current = locked;
  }, [locked]);

  const tab = (p: ProblemPart, label: string) => (
    <button
      ref={refs[p]}
      type="button"
      role="tab"
      aria-selected={part === p}
      onClick={(e) => {
        if (p === "equations" && locked) {
          shake(e.currentTarget.querySelector(".lock"));
          toast("get the diagram right first");
          return;
        }
        onChange(p);
      }}
      className={`flex items-center gap-2 px-2 pb-1 text-[1.05rem] transition-colors ${part === p ? "text-ink" : "text-muted"}`}
      style={p === "equations" && unlocking ? { animation: "pop-in 400ms var(--pop)" } : undefined}
    >
      {label}
      {p === "equations" && (locked || unlocking) && <Padlock falling={unlocking} />}
    </button>
  );

  return (
    <div role="tablist" className="relative flex gap-6 border-b-[1.5px] border-dashed border-rule">
      {tab("fbd", "diagram")}
      {tab("equations", "equations")}
      <span className="tab-underline" style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} />
    </div>
  );
}
