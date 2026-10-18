"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { TomatoState } from "@/lib/types";

const SCREENS = [
  ["/welcome", "welcome"],
  ["/tour", "quick tour"],
  ["/warmup", "warm-up"],
  ["/", "landing"],
  ["/home", "home"],
  ["/solve/hw4", "solve"],
  ["/board/monday", "whiteboard"],
  ["/team", "meet team"],
  ["/calendar", "calendar"],
] as const;

/** Dev-only screen switcher for reviewing the UI. Not rendered in production builds. */
export default function DevNav() {
  const { tomato, setTomatoState, resetAll, react } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed left-1/2 top-[3.6rem] z-[90] flex -translate-x-1/2 flex-col-reverse items-center text-[0.7rem]">
      {open && (
        <div className="hand wa mt-2 flex w-52 flex-col gap-1 bg-white p-3 shadow-[3px_4px_0_#f6d9d5]" style={{ animation: "pop-in 200ms var(--pop) both", transformOrigin: "top center" }}>
          {SCREENS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded px-2 py-1 hover:bg-blush" onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <div className="mt-1 border-t border-dashed border-rule pt-2 text-muted">tomato</div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((s) => (
              <button key={s} type="button" onClick={() => setTomatoState(s as TomatoState)} className={`h-8 flex-1 rounded border border-rule ${tomato.state === s ? "bg-blush" : ""}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["jump", "flinch", "squish"] as const).map((k) => (
              <button key={k} type="button" onClick={() => react(k)} className="h-8 flex-1 rounded border border-rule">
                {k}
              </button>
            ))}
          </div>
          <button type="button" className="mt-1 rounded px-2 py-1 text-left text-tomato hover:bg-blush" onClick={() => { resetAll(); setOpen(false); }}>
            reset everything
          </button>
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full border-[1.5px] border-dashed border-faint bg-white/90 px-3 py-1.5 text-muted">
        {open ? "close" : "screens"}
      </button>
    </div>
  );
}
