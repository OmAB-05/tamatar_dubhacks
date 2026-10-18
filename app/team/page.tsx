"use client";

import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/Topbar";
import Tomato from "@/components/Tomato";
import { TEAM, type Member } from "@/data/team";

function Photo({ m, i }: { m: Member; i: number }) {
  const [missing, setMissing] = useState(!m.photo);
  const img = useRef<HTMLImageElement>(null);
  // The image can fail before React hydrates and attaches onError, so check once on mount too.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);
  return (
    <div className={`${["wa", "wb", "wc"][i % 3]} relative mx-auto aspect-square w-full overflow-hidden border-[2.5px] border-ink bg-blush`}>
      {!missing && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={m.photo} alt={m.name} className="h-full w-full object-cover" onError={() => setMissing(true)} />
      )}
      {missing && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[0.9rem] text-muted">
          <Tomato size={72} interactive={false} listen={false} />
          photo coming soon
        </div>
      )}
    </div>
  );
}

/** Meet Team: one card per person, photos from public/team/. */
export default function Team() {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[64rem] px-8 pb-24 pt-12">
        <h1 className="text-center" style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)" }}>
          meet the team
        </h1>
        <p className="mb-10 text-center text-[1.1rem] text-ink-2">the people who taught a tomato physics</p>
        <div className="mx-auto grid max-w-[52rem] grid-cols-1 gap-10 sm:grid-cols-3">
          {TEAM.map((m, i) => (
            <div key={i} className="text-center" style={{ animation: `deal-in 500ms var(--pop) ${i * 90}ms both`, rotate: `${[-1.5, 1, -0.5, 1.5][i % 4]}deg` }}>
              <Photo m={m} i={i} />
              <div className="mt-3 text-[1.3rem]">{m.name}</div>
              <div className="text-[0.95rem] text-tomato">{m.role}</div>
              {m.line && <p className="mt-1 text-[0.9rem] text-ink-2">{m.line}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
