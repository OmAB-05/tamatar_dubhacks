import { BOARD_H, BOARD_W, strokePath } from "@/lib/ink";
import type { Stroke } from "@/lib/types";

/** Static rendering of saved strokes (whiteboard thumbnails, the FBD peek). */
export default function StrokeThumb({ strokes, className = "" }: { strokes: Stroke[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {strokes.map((s) => (
        <path key={s.id} d={strokePath(s.points, true)} fill="var(--ink)" />
      ))}
    </svg>
  );
}
