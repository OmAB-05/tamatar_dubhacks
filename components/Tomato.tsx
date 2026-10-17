"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { STATUS_LINES, TAP_LINES, type TomatoReactionKind } from "@/lib/tomato";
import type { TomatoState } from "@/lib/types";

const BODY = ["#e2463a", "#d4574a", "#b8664a", "#8f7d46"];
const MOUTH = [
  "M40 66 Q50 76 60 66",
  "M42 68.5 Q50 70 58 68.5",
  "M41 71 Q50 64 59 71",
  "M39 70 Q44.5 65 50 70 T61 70",
];

type Props = {
  /** Defaults to the shared tomato state from the store. */
  state?: TomatoState;
  size?: number;
  /** Tap to squish + speech bubble. */
  interactive?: boolean;
  /** React to check results broadcast through the store. */
  listen?: boolean;
  /** Eyes follow the pointer / pen. */
  track?: boolean;
  className?: string;
  onTap?: () => void;
};

/** The tomato character (ui_planning.md §3.8, delight.md §3). */
export default function Tomato({ state, size = 96, interactive = true, listen = true, track = true, className = "", onTap }: Props) {
  const store = useStore();
  const s = (state ?? store.tomato.state) as TomatoState;
  const uid = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const [anim, setAnim] = useState<{ kind: TomatoReactionKind; n: number } | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  // Random blink rhythm, picked after mount so server and client markup match.
  const [blink, setBlink] = useState("5s");
  useEffect(() => setBlink(`${(4 + Math.random() * 3).toFixed(2)}s`), []);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>();

  // Global reactions (check results).
  useEffect(() => {
    if (listen && store.reaction) setAnim(store.reaction);
  }, [listen, store.reaction]);

  // Eyes follow the pointer.
  useEffect(() => {
    if (!track) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = wrap.current?.getBoundingClientRect();
        if (!r || !eyes.current) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.55);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 300) * 2.6;
        eyes.current.setAttribute("transform", `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k).toFixed(2)})`);
      });
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [track]);

  const say = (line: string) => {
    clearTimeout(bubbleTimer.current);
    setBubble(line);
    bubbleTimer.current = setTimeout(() => setBubble(null), 2200);
  };

  const tap = () => {
    if (!interactive) return;
    setAnim((a) => ({ kind: "squish", n: (a?.n ?? 0) + 1 }));
    say(Math.random() < 0.4 ? STATUS_LINES[s] : s === 3 ? "ugh… tap me after a right answer" : TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)]);
    onTap?.();
  };

  const animClass = anim ? `r-${anim.kind}` : "";

  return (
    <div ref={wrap} className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      {bubble && (
        <div
          className="bubble sticky absolute z-20 whitespace-nowrap text-[0.75rem]"
          style={{ bottom: "100%", left: "50%", translate: "-50% -6px", transformOrigin: "bottom center" }}
        >
          {bubble}
        </div>
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="tomato"
        role={interactive ? "button" : "img"}
        aria-label={`your tomato: ${STATUS_LINES[s]}`}
        onPointerDown={tap}
        style={{ cursor: interactive ? "pointer" : "default", ["--blink" as string]: blink }}
      >
        <defs>
          <filter id={`boil-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="1">
              <animate attributeName="seed" values="1;2;3" dur="0.5s" calcMode="discrete" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="1.6" />
          </filter>
        </defs>
        <g key={anim?.n ?? 0} className={animClass} style={{ transformOrigin: "50% 90%" }} onAnimationEnd={(e) => e.stopPropagation()}>
          <g className="breathe">
            <g filter={`url(#boil-${uid})`}>
              {/* body */}
              <path
                d="M50 24 C70 20 89 34 89 56 C89 78 72 92 50 92 C28 92 11 79 11 57 C11 35 30 21 50 24 Z"
                fill={BODY[s]}
                stroke="var(--ink)"
                strokeWidth="2.8"
                strokeLinejoin="round"
                style={{ transition: "fill 600ms ease" }}
              />
              {s <= 1 && <ellipse cx="30" cy="40" rx="4" ry="7.5" fill="#fff" opacity=".85" transform="rotate(30 30 40)" />}
              {/* rot spots + wrinkles */}
              {s >= 1 && <ellipse cx="68" cy="73" rx="6" ry="4.5" fill="#7a4a2a" opacity=".55" />}
              {s >= 2 && <ellipse cx="27" cy="70" rx="5" ry="4" fill="#6b4a26" opacity=".55" />}
              {s >= 2 && <path d="M70 46 q4 3 0 6 M74 52 q3 2 0 5" stroke="var(--ink)" strokeWidth="1.4" fill="none" opacity=".6" />}
              {s >= 3 && <ellipse cx="58" cy="34" rx="5" ry="3.5" fill="#55602a" opacity=".6" />}
              {/* stem */}
              <g style={{ transformOrigin: "50px 24px", transform: s >= 2 ? `rotate(${s === 3 ? 38 : 22}deg)` : "none", transition: "transform 600ms var(--pop)" }}>
                <path
                  d="M50 26 L37 19 L46 20 L42 9 L50 18 L58 9 L54 20 L63 19 Z"
                  fill={s === 3 ? "#7d8a3a" : "#3f8f3a"}
                  stroke="var(--ink)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path d="M50 18 L51 7" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            </g>
            {/* face */}
            {s === 0 && (
              <>
                <ellipse cx="33" cy="63" rx="4.5" ry="2.6" fill="#ff9b8f" opacity=".7" />
                <ellipse cx="67" cy="63" rx="4.5" ry="2.6" fill="#ff9b8f" opacity=".7" />
              </>
            )}
            <g className="eyes">
              <g ref={eyes} style={{ transition: "transform 120ms" }}>
                {s === 3 ? (
                  <path d="M34 51 l6 6 M40 51 l-6 6 M60 51 l6 6 M66 51 l-6 6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
                ) : (
                  <>
                    <circle cx="38" cy="54" r="3.4" fill="var(--ink)" />
                    <circle cx="62" cy="54" r="3.4" fill="var(--ink)" />
                  </>
                )}
              </g>
            </g>
            <path d={MOUTH[s]} stroke="var(--ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
          {anim?.kind === "flinch" || anim?.kind === "rot" ? (
            <path className="sweat" d="M80 34 q4 6 0 9 q-4 -3 0 -9 Z" fill="#8fd0ff" stroke="var(--ink)" strokeWidth="1.2" />
          ) : null}
          {anim?.kind === "jump" && (
            <g stroke="var(--tomato)" strokeWidth="2.4" strokeLinecap="round" className="bubble">
              <path d="M10 22 l-6 -5 M90 22 l6 -5 M50 2 l0 -6" />
            </g>
          )}
        </g>
        {s === 3 && (
          <g className="fly">
            <ellipse cx="50" cy="50" rx="2.6" ry="2" fill="var(--ink)" />
            <ellipse cx="48.5" cy="47.6" rx="2" ry="1.3" fill="#fff" stroke="var(--ink)" strokeWidth=".8" />
            <ellipse cx="51.5" cy="47.6" rx="2" ry="1.3" fill="#fff" stroke="var(--ink)" strokeWidth=".8" />
          </g>
        )}
      </svg>
    </div>
  );
}
