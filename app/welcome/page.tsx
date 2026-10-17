"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Tomato from "@/components/Tomato";
import { useStore } from "@/lib/store";

/** Welcome: name input with popping letters, tomato watches you type (§4.1). */
export default function Welcome() {
  const { name: saved, setName } = useStore();
  const router = useRouter();
  const [name, setLocal] = useState("");
  const [focus, setFocus] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saved) setLocal(saved);
  }, [saved]);
  useEffect(() => input.current?.focus(), []);

  const go = () => {
    setName(name.trim());
    setLeaving(true);
    setTimeout(() => router.push("/tour"), 380);
  };

  return (
    <main className="flex min-h-screen flex-col bg-white px-[8vw] pt-[16vh]">
      <div style={leaving ? { animation: "fly-up 380ms ease-in forwards" } : undefined}>
        <div className="flex items-center gap-6">
          <h1 className="leading-[1.05]" style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>
            Hi, welcome to tamatar,
            <br />
            <span className="text-faint">what’s your name?</span>
          </h1>
          <Tomato size={120} className="hidden md:inline-block" />
        </div>

        <label className="relative mt-12 block max-w-[640px]">
          <span className="sr-only">your name</span>
          {/* typed letters pop in; the real input sits on top, transparent, so Scribble still works */}
          <div aria-hidden className="pointer-events-none flex h-[72px] items-end pb-2 text-[56px] leading-none">
            {name.split("").map((c, i) => (
              <span key={i + c} className="inline-block whitespace-pre" style={{ animation: "pop-in 220ms var(--pop) both" }}>
                {c}
              </span>
            ))}
            {focus && <span className="ml-0.5 inline-block h-[44px] w-[2.5px] bg-tomato" style={{ animation: "blink 1s steps(1) infinite" }} />}
          </div>
          <input
            ref={input}
            value={name}
            maxLength={24}
            onChange={(e) => setLocal(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && go()}
            className="absolute inset-0 bg-transparent text-[56px] text-transparent caret-transparent !outline-none"
            autoComplete="given-name"
            spellCheck={false}
          />
          <svg className="absolute bottom-0 left-0 w-full" height="8" viewBox="0 0 640 8" preserveAspectRatio="none" aria-hidden>
            <path d="M2 5 C160 2 320 7 638 3" stroke="var(--ink)" strokeWidth="2.5" fill="none" pathLength={1} className={focus ? "draw" : ""} style={{ strokeDasharray: 1, strokeDashoffset: focus ? undefined : 0, ["--dur" as string]: "400ms" }} />
          </svg>
        </label>
      </div>

      <div className="mt-auto flex justify-end pb-10">
        <Button variant="pink" className="!px-8 !text-[1.3rem]" disabledReason={name.trim() ? null : "tell me your name first"} onClick={go}>
          Next
        </Button>
      </div>
    </main>
  );
}
