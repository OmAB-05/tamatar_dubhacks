"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HOMEWORK } from "@/data/problems";
import { newId } from "@/lib/ink";
import { useStore } from "@/lib/store";
import { STATUS_LINES } from "@/lib/tomato";
import type { TomatoState } from "@/lib/types";
import { Dots } from "@/components/ProblemPanel";
import StrokeThumb from "@/components/StrokeThumb";
import Tomato from "@/components/Tomato";
import Topbar from "@/components/Topbar";

const SHAPES = ["wa", "wb", "wc"];
const CARD_TOMATO: Record<string, TomatoState> = { hw4: 0, hw3: 0, hw2: 1 };

export default function Home() {
  const { ready, name, tomato, progress, boards, saveBoard, toast } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !name) router.replace("/welcome");
  }, [ready, name, router]);

  if (!ready || !name) return null;

  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[1240px] px-12 pb-24 pt-10">
        <section className="mb-10 flex items-center gap-8">
          <Tomato size={112} />
          <div>
            <h1 className="leading-none" style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>
              Hi {name}
            </h1>
            <p className="mt-2 text-[1.25rem] text-ink-2" aria-live="polite">
              {STATUS_LINES[tomato.state]}
            </p>
          </div>
        </section>

        <h2 className="mb-4 text-[1.4rem]">Your homework</h2>
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {HOMEWORK.map((hw, i) => {
            const total = hw.problems.length;
            const done = hw.due ? hw.problems.filter((p) => progress[p.id]?.fbd && progress[p.id]?.equations).length : total;
            const started = hw.problems.some((p) => progress[p.id]?.fbd);
            const status = done === total ? "all done" : done > 0 ? `${done} of ${total} done` : started ? "in progress" : "not started";
            const active = hw.due && done < total;
            return (
              <Link
                key={hw.id}
                href={`/solve/${hw.id}`}
                className={`card block w-full ${SHAPES[i % 3]} ${active ? "cut" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={(e) => {
                  if (hw.due) return;
                  e.preventDefault();
                  toast(`${hw.title} is turned in. nice work`);
                }}
                onPointerDown={(e) => e.currentTarget.classList.add("pressed")}
                onPointerUp={(e) => e.currentTarget.classList.remove("pressed")}
                onPointerLeave={(e) => e.currentTarget.classList.remove("pressed")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[1.3rem] leading-tight">{hw.title}</div>
                    <div className="mt-1 text-[0.8rem] text-ink-2">
                      {hw.course} · {hw.due ?? "turned in"}
                    </div>
                    <div className="mt-2">
                      <Dots total={total} done={done} />
                    </div>
                    <div className="mt-1 text-[1rem]">{status}</div>
                  </div>
                  <Tomato size={64} state={CARD_TOMATO[hw.id]} interactive={false} listen={false} track={false} />
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-4 text-[1.4rem]">Whiteboards</h2>
        <div className="flex flex-wrap gap-6">
          {boards.map((b, i) => (
            <Link
              key={b.id}
              href={`/board/${b.id}`}
              className={`card grid-paper ${SHAPES[(i + 1) % 3]} flex h-[170px] w-[270px] flex-col justify-end !p-3`}
              style={{ animationDelay: `${(HOMEWORK.length + i) * 60}ms` }}
            >
              <StrokeThumb strokes={b.strokes} className="pointer-events-none absolute inset-2 h-[calc(100%-50px)] w-[calc(100%-16px)]" />
              <span className="relative text-[1rem]">{b.title}</span>
            </Link>
          ))}
          <button
            type="button"
            className="card flex h-[170px] w-[270px] items-center justify-center !border-dashed !border-faint text-[1.05rem] wc"
            style={{ animationDelay: `${(HOMEWORK.length + boards.length) * 60}ms` }}
            onClick={() => {
              const id = newId();
              saveBoard({ id, title: "untitled board", strokes: [] });
              router.push(`/board/${id}`);
            }}
          >
            + new whiteboard
          </button>
        </div>
      </main>
    </div>
  );
}
