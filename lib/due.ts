import type { Homework } from "@/data/problems";

// Uploaded worksheets carry a structured Homework.dueDate (YYYY-MM-DD, synced to the
// worksheets.due_date column the reminder bot uses). Without one we fall back to the
// display text in Homework.due: an ISO date, or a weekday name ("due Friday") meaning
// the next one coming up.

const ISO = /(\d{4})-(\d{2})-(\d{2})/;
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Local-midnight Date for a homework's due date, or null if it has none. */
export function dueDate(hw: Pick<Homework, "due" | "dueDate">, today = new Date()): Date | null {
  const m = hw.dueDate?.match(ISO) ?? hw.due?.match(ISO);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  if (!hw.due) return null;
  const day = DAYS.findIndex((d) => hw.due!.toLowerCase().includes(d));
  if (day < 0) return null;
  const d = startOfDay(today);
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
  return d;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Days from today (0 = today, negative = overdue). */
export function daysUntil(d: Date, today = new Date()) {
  return Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / 86_400_000);
}

export function relative(d: Date, today = new Date()) {
  const n = daysUntil(d, today);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n < 0 ? `${-n} days late` : `in ${n} days`;
}

/** What a homework card shows: "due Fri, Oct 24 · tomorrow", or the raw text if there's no date. */
export function dueLabel(hw: Pick<Homework, "due" | "dueDate">, today = new Date()): string | null {
  const d = dueDate(hw, today);
  if (!d) return hw.due;
  const nice = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `due ${nice} · ${relative(d, today)}`;
}
