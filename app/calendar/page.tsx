"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import DueDateEdit from "@/components/DueDateEdit";
import ImportModal from "@/components/ImportModal";
import Topbar from "@/components/Topbar";
import type { Homework } from "@/data/problems";
import { daysUntil, dueDate, isoOf, relative, sameDay, startOfDay } from "@/lib/due";
import { worksheetProgress } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { useAccountGate } from "@/lib/useAccountGate";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type Item = { hw: Homework; date: Date; done: boolean };

/** Calendar: every homework with a due date, on a hand-drawn month grid. */
export default function CalendarPage() {
  const { homework, progress } = useStore();
  const allowed = useAccountGate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [importOpen, setImportOpen] = useState(false);

  const items = useMemo<Item[]>(
    () =>
      homework
        .map((hw) => {
          const date = dueDate(hw, today);
          if (!date) return null;
          const { done, total } = worksheetProgress(hw, progress);
          return { hw, date, done: total > 0 && done === total };
        })
        .filter((x): x is Item => !!x)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [homework, progress, today],
  );

  if (!allowed) return null;

  // 6 weeks starting on the Sunday on/before the 1st
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const byDay = new Map<string, Item[]>();
  for (const it of items) byDay.set(isoOf(it.date), [...(byDay.get(isoOf(it.date)) ?? []), it]);

  const upcoming = items.filter((it) => !it.done && daysUntil(it.date, today) >= -7);
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Topbar />
      <main className="mx-auto grid w-full max-w-[72rem] flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_17rem]">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-[2.2rem] leading-none">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button className="wa !min-h-[2.2rem] !px-3 !text-[1rem]" aria-label="previous month" onClick={() => shift(-1)}>
                ←
              </Button>
              <Button className="wb !min-h-[2.2rem] !px-3 !text-[0.95rem]" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
                today
              </Button>
              <Button className="wc !min-h-[2.2rem] !px-3 !text-[1rem]" aria-label="next month" onClick={() => shift(1)}>
                →
              </Button>
            </div>
          </div>

          <div key={isoOf(month)} className="hand wb overflow-hidden bg-white" style={{ animation: "board-in 320ms var(--pop) both" }}>
            <div className="grid grid-cols-7 border-b-[1.5px] border-dashed border-rule">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[0.85rem] text-muted">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === month.getMonth();
                const isToday = sameDay(d, today);
                const due = byDay.get(isoOf(d)) ?? [];
                return (
                  <div
                    key={i}
                    className={`relative min-h-[5.6rem] border-b border-r border-[var(--grid)] p-1.5 ${i % 7 === 6 ? "border-r-0" : ""} ${inMonth ? "" : "bg-panel/60 text-faint"}`}
                  >
                    <div className="flex justify-end">
                      <span className={`relative flex h-7 w-7 items-center justify-center text-[0.9rem] ${isToday ? "text-tomato" : ""}`}>
                        {d.getDate()}
                        {isToday && (
                          <svg className="absolute inset-[-4px] overflow-visible" viewBox="0 0 36 36" aria-hidden>
                            <path d="M22 3 C34 5 36 26 20 33 C6 37 -1 22 4 12 C8 4 18 1 26 5" pathLength={1} fill="none" stroke="var(--tomato)" strokeWidth="2.2" strokeLinecap="round" className="draw" />
                          </svg>
                        )}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-col gap-1">
                      {due.map(({ hw, done }) => (
                        <Link
                          key={hw.id}
                          href={`/solve/${hw.id}`}
                          title={hw.title}
                          className={`truncate rounded-md px-1.5 py-0.5 text-[0.75rem] leading-tight transition-transform hover:-translate-y-0.5 ${
                            done ? "bg-[#e7f3e8] text-good line-through" : daysUntil(d, today) < 0 ? "bg-tomato text-white" : "bg-blush text-tomato"
                          }`}
                          style={{ animation: "pop-in 300ms var(--pop) both" }}
                        >
                          {done ? "✓ " : ""}
                          {hw.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <h2 className="text-[1.5rem]">coming up</h2>
          {upcoming.length === 0 ? (
            <p className="text-[0.95rem] text-ink-2">Nothing due. Upload a worksheet and add its due date, and it lands here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map(({ hw, date }, i) => {
                const late = daysUntil(date, today) < 0;
                const { fraction } = worksheetProgress(hw, progress);
                return (
                  <li key={hw.id} style={{ animation: `deal-in 400ms var(--pop) ${i * 60}ms both` }}>
                    <Link href={`/solve/${hw.id}`} className={`card ${["wa", "wb", "wc"][i % 3]} block !p-3`}>
                      <div className="truncate text-[1.05rem]">{hw.title}</div>
                      <div className={`text-[0.8rem] ${late ? "text-tomato" : "text-ink-2"}`}>
                        {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {relative(date, today)}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blush">
                        <div className="h-full rounded-full bg-tomato" style={{ width: `${Math.round(fraction * 100)}%` }} />
                      </div>
                    </Link>
                    {hw.id.startsWith("hw-") && <DueDateEdit hw={hw} className="mt-1 px-1" />}
                  </li>
                );
              })}
            </ul>
          )}
          <Button variant="red" className="wa mt-2 !text-[1rem]" onClick={() => setImportOpen(true)}>
            Upload a worksheet
          </Button>
        </aside>
      </main>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
