import type { Homework } from "@/data/problems";

// Every worksheet should carry a structured Homework.dueDate (YYYY-MM-DD; for uploads it's
// synced to the worksheets.due_date column the reminder bot uses). Without one we fall back
// to reading the display text in Homework.due: an ISO date, a month and day ("Oct 24",
// "24 October 2026"), or a weekday ("due Fri", "due next Wednesday").

type DueFields = Pick<Homework, "due" | "dueDate">;

const ISO = /(\d{4})-(\d{2})-(\d{2})/;
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_DAY = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, "i");
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\.?(?:,?\\s+(\\d{4}))?\\b`, "i");
const WEEKDAY = /\b(next\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Month index (0-11), day and optional year → a date; a missing year picks the one nearest today. */
function monthDay(month: string, day: string, year: string | undefined, today: Date): Date | null {
  const m = MONTH_KEYS.indexOf(month.slice(0, 3).toLowerCase());
  const d = +day;
  if (m < 0 || d < 1 || d > 31) return null;
  if (year) return new Date(+year, m, d);
  const t = startOfDay(today).getTime();
  return [-1, 0, 1]
    .map((k) => new Date(today.getFullYear() + k, m, d))
    .reduce((best, c) => (Math.abs(c.getTime() - t) < Math.abs(best.getTime() - t) ? c : best));
}

/** Local-midnight Date for a homework's due date, or null if it has none. */
export function dueDate(hw: DueFields, today = new Date()): Date | null {
  const iso = hw.dueDate?.match(ISO) ?? hw.due?.match(ISO);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const text = hw.due;
  if (!text) return null;
  const md = text.match(MONTH_DAY);
  if (md) return monthDay(md[1], md[2], md[3], today);
  const dm = text.match(DAY_MONTH);
  if (dm) return monthDay(dm[2], dm[1], dm[3], today);
  const wd = text.match(WEEKDAY);
  if (!wd) return null;
  // "Friday" = the next one coming up (today counts); "next Friday" = the one a week after that.
  const day = WEEKDAYS.indexOf(wd[2].slice(0, 3).toLowerCase());
  const d = startOfDay(today);
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7) + (wd[1] ? 7 : 0));
  return d;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-10-24" → "due Sat, Oct 24": the stored display label (parsed as a local day, not UTC midnight). */
export function dueText(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `due ${new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
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
export function dueLabel(hw: DueFields, today = new Date()): string | null {
  const d = dueDate(hw, today);
  if (!d) return hw.due;
  const nice = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `due ${nice} · ${relative(d, today)}`;
}
