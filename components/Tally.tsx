/** "hints used: N" with tally marks that draw themselves (§3.6). */
export default function Tally({ n }: { n: number }) {
  const marks = Array.from({ length: n }, (_, i) => {
    const group = Math.floor(i / 5);
    const k = i % 5;
    const gx = group * 38;
    const d = k < 4 ? `M${gx + 4 + k * 7} 4 L${gx + 3 + k * 7} 24` : `M${gx} 20 L${gx + 30} 7`;
    return <path key={i} d={d} pathLength={1} stroke="var(--tomato)" strokeWidth="2.4" strokeLinecap="round" className="draw" style={{ ["--dur" as string]: "220ms" }} />;
  });
  return (
    <div>
      <div className="text-[0.75rem] text-muted">hints used: {n}</div>
      <svg width={Math.max(40, Math.ceil(Math.max(n, 1) / 5) * 38)} height="28" aria-hidden>
        {marks}
      </svg>
    </div>
  );
}
