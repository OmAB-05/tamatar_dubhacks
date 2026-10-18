/** Hand-drawn progress bar: a wobbly ink outline filled in tomato as parts get done. */
export default function ProgressBar({ fraction, label, className = "" }: { fraction: number; label?: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label ?? "worksheet progress"}
        className="hand wa relative h-[0.85rem] min-w-0 flex-1 overflow-hidden !border-2 bg-white"
      >
        <div
          className="h-full bg-tomato transition-[width] duration-700"
          style={{ width: `${pct}%`, transitionTimingFunction: "var(--pop)", backgroundImage: "repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,.18) 6px 12px)" }}
        />
      </div>
      <span className="w-[2.6rem] shrink-0 text-right text-[0.8rem] tabular-nums text-ink-2">{pct}%</span>
    </div>
  );
}
