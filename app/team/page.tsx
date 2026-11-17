"use client";

import Topbar from "@/components/Topbar";
import { TEAM } from "@/data/team";

/** Meet Team: everyone's name and role. */
export default function Team() {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="mx-auto max-w-[64rem] px-8 pb-24 pt-10">
        <h1 className="text-center" style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)" }}>
          meet the team
        </h1>
        <p className="text-center text-[1.1rem] text-ink-2">the people who taught a tamatar physics</p>
        <p className="mb-8 mt-1 text-center text-[0.95rem] text-tomato" style={{ rotate: "-1.5deg" }}>
          made in one night at DubHacks
        </p>

        <div className="mx-auto mt-4 grid w-full max-w-[32rem] grid-cols-2 gap-8 text-center">
          {TEAM.map((m, i) => (
            <div key={m.name} style={{ animation: `pop-in 400ms var(--pop) ${300 + i * 120}ms both` }}>
              <div className="text-[1.2rem] leading-tight">{m.name}</div>
              <div className="text-[0.95rem] text-tomato">{m.role}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
