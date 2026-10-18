"use client";

import { useEffect, useState } from "react";
import Tomato from "@/components/Tomato";
import { useStore } from "@/lib/store";

import { QUOTES } from "@/lib/tomato";

// greetings first, then tamatar's quotes mixed in
const HELLOS = ["hi, i'm tamatar!", "welcome to tamatar.si", ...QUOTES.slice(0, 4), "poke me, i don't bite", ...QUOTES.slice(4), "scroll down, i'll wait"];

const DOODLES = [
  { x: "8%", y: "22%", d: "M0 10 L6 16 L18 2", c: "var(--good)", t: 7 },
  { x: "88%", y: "18%", d: "M2 2 Q10 18 18 2", c: "var(--tomato)", t: 9 },
  { x: "14%", y: "74%", d: "M10 0 C18 6 18 14 10 20 C2 14 2 6 10 0 Z", c: "#e8c96a", t: 8 },
  { x: "82%", y: "70%", d: "M0 10 L20 10 M10 0 L10 20", c: "var(--tomato)", t: 10 },
  { x: "26%", y: "12%", d: "M0 0 Q10 20 20 0", c: "var(--faint)", t: 11 },
  { x: "70%", y: "86%", d: "M0 10 L6 16 L18 2", c: "var(--good)", t: 9.5 },
];

/** Meet Tamatar: the whole first screen is the tamatar. Tap it, it talks back. */
export default function MeetTamatar() {
  const { react } = useStore();
  const [i, setI] = useState(0);
  const [said, setSaid] = useState<{ line: string; n: number } | null>(null);

  useEffect(() => {
    const hop = setTimeout(() => react("jump"), 1000);
    const t = setInterval(() => {
      setSaid(null);
      setI((n) => (n + 1) % HELLOS.length);
    }, 3600);
    return () => {
      clearTimeout(hop);
      clearInterval(t);
    };
  }, [react]);

  return (
    <section id="meet" className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-[3.4rem]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {DOODLES.map((b, n) => (
          <svg
            key={n}
            width="28"
            height="28"
            viewBox="-4 -4 28 28"
            className="absolute"
            style={{ left: b.x, top: b.y, animation: `float ${b.t}s ease-in-out ${n * -1.3}s infinite` }}
          >
            <path d={b.d} fill="none" stroke={b.c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
      {/* the heading is the tamatar's voice: tap it and it answers here */}
      <h1
        key={said ? `s${said.n}` : i}
        className={`write-in mb-2 text-center ${said ? "text-tomato" : "text-ink"}`}
        style={{ fontSize: "clamp(2rem, 5.5vw, 3.6rem)", ["--dur" as string]: "600ms", ["--steps" as string]: (said?.line ?? HELLOS[i]).length }}
      >
        {said?.line ?? HELLOS[i]}
      </h1>
      <div style={{ animation: "hero-drop 900ms var(--pop) both" }}>
        <Tomato cssSize="min(56dvh, 80vw)" onSay={(line) => setSaid((p) => ({ line, n: (p?.n ?? 0) + 1 }))} />
      </div>
      <a href="#about" className="mt-2 flex flex-col items-center text-[1rem] text-muted" style={{ animation: "nudge 1.8s ease-in-out infinite" }}>
        tap the tamatar · then scroll
        <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden>
          <path d="M3 5 L13 15 L23 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
