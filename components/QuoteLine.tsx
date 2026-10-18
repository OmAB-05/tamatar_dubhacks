"use client";

import { useEffect, useState } from "react";
import { randomQuote } from "@/lib/tomato";

/** One tamatar quote at a time, written in by hand, swapping every few seconds. Tap for another. */
export default function QuoteLine({ className = "", every = 4500 }: { className?: string; every?: number }) {
  const [q, setQ] = useState<{ text: string; n: number } | null>(null);

  useEffect(() => {
    setQ({ text: randomQuote(), n: 0 }); // after mount, so server and client render the same
    const t = setInterval(() => setQ((p) => ({ text: randomQuote(p?.text), n: (p?.n ?? 0) + 1 })), every);
    return () => clearInterval(t);
  }, [every]);

  if (!q) return <p className={className}>&nbsp;</p>;
  return (
    <button
      type="button"
      key={q.n}
      onClick={() => setQ((p) => ({ text: randomQuote(p?.text), n: (p?.n ?? 0) + 1 }))}
      className={`write-in block text-left text-tomato ${className}`}
      style={{ rotate: "-1.5deg", ["--dur" as string]: `${q.text.length * 28}ms`, ["--steps" as string]: q.text.length }}
      title="another one"
    >
      &lsquo;{q.text}&rsquo;
    </button>
  );
}
