import type { Metadata } from "next";
import Link from "next/link";
import HelpLadder from "@/components/landing/HelpLadder";
import HeroDemo from "@/components/landing/HeroDemo";
import Reveal from "@/components/landing/Reveal";
import TomatoPlayground from "@/components/landing/TomatoPlayground";
import TomatoRain from "@/components/landing/TomatoRain";
import TryCircle from "@/components/landing/TryCircle";

export const metadata: Metadata = {
  title: "tamatar.si: a notebook that grades you back",
  description: "Write your physics homework by hand. tamatar's red pen circles the first slip and helps just enough for you to fix it yourself.",
};

const STEPS = [
  {
    n: "1",
    title: "write it like paper",
    body: "Pencil on the canvas. No typing, no equation editor, no special syntax.",
    doodle: "M8 44 Q30 10 52 30 T96 22",
  },
  {
    n: "2",
    title: "draw forces as arrows",
    body: "Start every arrow on the object. tamatar checks which way each one points.",
    doodle: "M14 46 L86 14 M86 14 L70 14 M86 14 L80 29",
  },
  {
    n: "3",
    title: "circle your answer",
    body: "A circle means done. The red pen reads the whole page and finds the first slip.",
    doodle: "M50 8 C80 6 96 22 92 36 C88 52 60 56 36 52 C14 48 4 34 12 22 C20 10 40 6 58 10",
  },
];

export default function Landing() {
  return (
    <div className="lp">
      <div className="lp-margin" aria-hidden />

      {/* nav */}
      <header className="relative z-30 mx-auto flex max-w-[1180px] items-center gap-3 px-4 pt-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-[1.5rem] leading-none" aria-label="tamatar.si home">
          <img src="/logo.png" alt="" width={42} height={46} className="lp-logo" />
          <span>
            tamatar<span className="inline-block text-tomato" style={{ rotate: "-6deg" }}>.si</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-[0.95rem] md:flex">
          <a href="#how" className="lp-navlink">how it works</a>
          <a href="#red-pen" className="lp-navlink">the red pen</a>
          <a href="#tomato" className="lp-navlink">the tomato</a>
        </nav>
        <Link href="/home" className="btn btn-red wc ml-auto !text-[1rem] md:ml-4">
          start writing
        </Link>
      </header>

      {/* hero */}
      <section className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-4 pb-24 pt-12 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div>
          <div className="sticky inline-block text-[0.85rem]" style={{ rotate: "-2deg" }}>
            for handwritten physics homework
          </div>
          <h1 className="mt-5 leading-[0.95]" style={{ fontSize: "clamp(48px, 7vw, 92px)" }}>
            a notebook
            <br />
            that <span className="lp-scribble">grades</span> you
            <br />
            <span className="text-tomato">back.</span>
          </h1>
          <p className="mt-6 max-w-[500px] text-[1.1rem] leading-snug text-ink-2">
            Write your work with a Pencil, like it&rsquo;s paper. Circle your answer. tamatar&rsquo;s red pen finds the <span className="hl">first slip</span> and helps just enough for you to fix it yourself.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/home" className="btn btn-red wa lp-cta !min-h-[60px] !px-8 !text-[1.35rem]">
              start writing →
            </Link>
            <a href="#how" className="link text-[1rem] text-ink-2">
              or see how it works
            </a>
          </div>
          <div className="mt-10 flex items-center gap-3 text-[0.8rem] text-muted">
            <svg width="56" height="22" viewBox="0 0 56 22" aria-hidden>
              <path d="M3 12 Q14 2 26 12 T52 10" fill="none" stroke="var(--tomato)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            that page is a replay of the real red pen. it loops.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[600px] lg:mr-0" style={{ rotate: "1.2deg" }}>
          <div className="lp-tape" style={{ left: "12%", rotate: "-8deg" }} aria-hidden />
          <div className="lp-tape" style={{ right: "14%", rotate: "6deg" }} aria-hidden />
          <HeroDemo />
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="lp-band relative scroll-mt-6 py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-10">
          <Reveal>
            <SectionHead kicker="how it works" title="three moves. no typing." />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className={`card ${["wa", "wb", "wc"][i]} cut h-full !p-6`} style={{ rotate: `${[-1, 0.8, -0.5][i]}deg` }}>
                  <div className="flex items-start justify-between">
                    <span className="lp-num">{s.n}</span>
                    <svg width="100" height="60" viewBox="0 0 100 60" aria-hidden>
                      <path d={s.doodle} fill="none" stroke={i === 2 ? "var(--tomato)" : "var(--ink)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-[1.4rem] leading-tight">{s.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-snug text-ink-2">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <TryCircle />
          </Reveal>
        </div>
      </section>

      {/* the red pen */}
      <section id="red-pen" className="relative scroll-mt-6 py-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-10">
          <Reveal>
            <SectionHead kicker="the red pen" title="help you can ration." />
            <p className="mt-4 max-w-[640px] text-[1.05rem] leading-snug text-ink-2">
              Answer keys teach you to copy. tamatar starts with a single red mark and lets you decide how much more you need. Every step up the ladder gets a tally, so you always know how much was you.
            </p>
          </Reveal>
          <Reveal className="mt-12">
            <HelpLadder />
          </Reveal>
        </div>
      </section>

      {/* the tomato */}
      <section id="tomato" className="lp-band relative scroll-mt-6 py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <SectionHead kicker="the tomato" title="meet your tomato." />
            <p className="mt-4 max-w-[480px] text-[1.05rem] leading-snug text-ink-2">
              It lives in the corner of every page and watches you write. Right answers keep it fresh. Make the same mistake twice and it starts to rot. One right answer and it perks back up.
            </p>
            <p className="mt-4 max-w-[480px] text-[1.05rem] leading-snug text-ink-2">
              Go ahead, poke it. It doesn&rsquo;t mind. Much.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <TomatoPlayground />
          </Reveal>
        </div>
      </section>

      {/* not an answer machine */}
      <section className="relative py-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-10">
          <Reveal>
            <SectionHead kicker="the rules" title="what tamatar won't do." />
          </Reveal>
          <div className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {[
              ["hand you the answer first", "The full solution is the last rung, and it costs a tally."],
              ["mark your whole page red", "It finds the first slip. Fix that one, then check again."],
              ["make you type equations", "If you can write it on paper, you can write it here."],
              ["cover up your work", "Feedback goes around your ink, never on top of it."],
            ].map(([t, b], i) => (
              <Reveal key={t} delay={i * 70}>
                <div className="flex gap-4">
                  <svg className="mt-1 shrink-0" width="34" height="34" viewBox="0 0 34 34" aria-hidden>
                    <path d="M7 7 L27 27 M27 7 L7 27" stroke="var(--tomato)" strokeWidth="3.4" strokeLinecap="round" />
                  </svg>
                  <div>
                    <div className="text-[1.25rem] leading-tight">
                      <span className="lp-strike">{t}</span>
                    </div>
                    <p className="mt-1 text-[0.95rem] text-ink-2">{b}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* closing */}
      <section className="lp-band relative py-24">
        <div className="px-4 sm:px-10">
          <TomatoRain />
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-10 text-[0.8rem] text-muted sm:px-10">
        <img src="/logo.png" alt="" width={28} height={30} />
        <span>tamatar.si, made in one night at DubHacks</span>
        <span className="sm:ml-auto">no tomatoes were harmed. some were bruised.</span>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="text-[0.9rem] text-tomato" style={{ rotate: "-2deg", display: "inline-block" }}>
        {kicker}
      </div>
      <h2 className="mt-1 leading-none" style={{ fontSize: "clamp(36px, 5vw, 60px)" }}>
        {title}
      </h2>
    </div>
  );
}
