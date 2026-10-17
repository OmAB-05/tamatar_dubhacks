"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { newId } from "@/lib/ink";
import { wiggle } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { STATUS_LINES } from "@/lib/tomato";
import Button from "./Button";
import ImportModal from "./ImportModal";
import RaceSheet from "./RaceSheet";
import Tomato from "./Tomato";

export function Wordmark() {
  const { tomato, toast } = useStore();
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <Link href="/home" className="flex items-baseline text-[1.5rem] leading-none">
      tamatar
      <span
        ref={ref}
        className="inline-block text-tomato"
        style={{ rotate: "-6deg" }}
        onClick={(e) => {
          e.preventDefault();
          wiggle(ref.current);
          toast(STATUS_LINES[tomato.state]);
        }}
      >
        .si
      </span>
    </Link>
  );
}

/** Wordmark · streak badge · Challenge · New + menu (§4.4). */
export default function Topbar({ children }: { children?: React.ReactNode }) {
  const { streak, saveBoard } = useStore();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [race, setRace] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  return (
    <header className="divider relative z-30 flex h-[64px] shrink-0 items-center gap-4 bg-white px-5">
      <Wordmark />
      <div className="flex-1">{children}</div>
      <div className="flex items-center gap-2 text-[1rem]">
        <Tomato size={44} track={false} />
        <span className="hidden whitespace-nowrap sm:inline">{streak} day streak</span>
      </div>
      <Button className="wa" onClick={() => setRace(true)}>
        Challenge
      </Button>
      <div ref={menuRef} className="relative">
        <Button variant="red" className="wc" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          New +
        </Button>
        {menu && (
          <div className="menu hand wa absolute right-0 top-[calc(100%+8px)] flex w-60 flex-col bg-white p-2 shadow-[4px_5px_0_#f6d9d5]">
            {[
              { label: "Import problems", act: () => setImportOpen(true) },
              {
                label: "Blank whiteboard",
                act: () => {
                  const id = newId();
                  saveBoard({ id, title: "untitled board", strokes: [] });
                  router.push(`/board/${id}`);
                },
              },
            ].map((it, i) => (
              <button
                key={it.label}
                type="button"
                className="rounded-lg px-3 py-2 text-left text-[1rem] hover:bg-blush"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => {
                  setMenu(false);
                  it.act();
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {race && <RaceSheet onClose={() => setRace(false)} />}
    </header>
  );
}
