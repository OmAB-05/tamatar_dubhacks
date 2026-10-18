"use client";

/** Small A− / A+ pill for growing or shrinking a block of text. `value` is a scale (1 = default). */
export default function FontSizer({
  value, onChange, min = 0.8, max = 1.8, step = 0.1, label = "text size",
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 10) / 10);
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-rule bg-white text-ink-2" role="group" aria-label={label}>
      <button type="button" aria-label={`smaller ${label}`} disabled={value <= min} onClick={() => set(value - step)} className="h-8 rounded-l-full px-2.5 text-[0.75rem] hover:bg-blush disabled:opacity-30">
        A−
      </button>
      <span className="h-4 w-px bg-rule" />
      <button type="button" aria-label={`bigger ${label}`} disabled={value >= max} onClick={() => set(value + step)} className="h-8 rounded-r-full px-2.5 text-[1rem] hover:bg-blush disabled:opacity-30">
        A+
      </button>
    </div>
  );
}
