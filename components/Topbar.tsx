"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    <Link href="/" className="flex items-baseline text-[1.5rem] leading-none">
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

const NAV = [
  { href: "/", label: "Home" },
  { href: "/home", label: "My homework" },
  { href: "/tour", label: "Tutorial" },
  { href: "/#meet", label: "Meet Tamatar" },
  { href: "/team", label: "Meet Team" },
];

/** Wordmark · nav · streak · Challenge · New + menu (§4.4). `floating` = transparent, for the landing hero. */
export default function Topbar({ children, floating = false }: { children?: React.ReactNode; floating?: boolean }) {
  const { streak, saveBoard } = useStore();
  const router = useRouter();
  const path = usePathname();
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
    <header
      className={`z-30 flex h-[3.4rem] shrink-0 items-center gap-5 px-5 ${
        floating ? "fixed inset-x-0 top-0 bg-white/80 backdrop-blur-sm" : "divider relative bg-white"
      }`}
    >
      <Wordmark />
      <nav className="flex items-center gap-1 text-[0.95rem]" aria-label="main">
        {NAV.map((n) => {
          const on = n.href === path || (n.href === "/home" && path.startsWith("/solve"));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-3 py-1 transition-colors hover:bg-blush ${on ? "text-tomato" : "text-ink-2"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="hidden items-center gap-1 text-[0.9rem] text-ink-2 lg:flex" title={`${streak} day streak`}>
        <Tomato size={34} track={false} />
        {streak}
      </div>
      {floating ? (
        <Link href="/home" className="btn btn-red wc !text-[1rem]">
          start writing
        </Link>
      ) : (
      <>
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
      </>
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {race && <RaceSheet onClose={() => setRace(false)} />}
    </header>
  );
}
