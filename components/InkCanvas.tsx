"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { closedLoop, isCurvingBack } from "@/lib/circle";
import { BOARD_H, BOARD_W, distToStroke, newId, strokePath } from "@/lib/ink";
import type { Ink } from "@/lib/useInk";
import type { Point, Stroke } from "@/lib/types";

export type Tool = "pen" | "eraser";
export type LoopBox = { x: number; y: number; w: number; h: number }; // board units

type Props = {
  ink: Ink;
  tool?: Tool;
  w?: number;
  h?: number;
  placeholder?: string;
  className?: string;
  grid?: boolean;
  /** Closed loop drawn: "circle your answer to finish". */
  onCircle?: (box: LoopBox) => void;
  /** Any new pen stroke (used to mark a check result stale). */
  onStroke?: (s: Stroke) => void;
  /** Eraser touched the board at this point (board units). */
  onEraseAt?: (x: number, y: number) => void;
  children?: React.ReactNode;
};

const ERASE_RADIUS = 16;

/**
 * The writing surface (ui_planning.md §3.3). Strokes render as SVG paths from
 * perfect-freehand, in logical board units, so the board scales without redrawing.
 * Pencil draws; mouse draws (dev); a finger draws only until a Pencil is seen.
 * Two-finger tap = undo, three-finger tap = redo.
 */
export default function InkCanvas({
  ink, tool = "pen", w = BOARD_W, h = BOARD_H, placeholder, className = "", grid = true,
  onCircle, onStroke, onEraseAt, children,
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const live = useRef<SVGPathElement>(null);
  const pts = useRef<Point[] | null>(null);
  const activeId = useRef<number | null>(null);
  const penSeen = useRef(false);
  const penQuietUntil = useRef(0);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ max: number; t0: number; moved: boolean } | null>(null);
  const strokesRef = useRef(ink.strokes);
  strokesRef.current = ink.strokes;

  const [drawing, setDrawing] = useState(false);
  const [curving, setCurving] = useState<{ x: number; y: number } | null>(null);
  const [erasing, setErasing] = useState<Set<string>>(new Set());
  const [ghosts, setGhosts] = useState<{ s: Stroke; key: string }[]>([]);
  const prev = useRef<Stroke[]>(ink.strokes);
  const erasedIds = useRef(new Set<string>());

  // Strokes that disappear by undo/clear "lift off" instead of vanishing.
  useLayoutEffect(() => {
    const now = new Set(ink.strokes.map((s) => s.id));
    const gone = prev.current.filter((s) => !now.has(s.id) && !erasedIds.current.has(s.id));
    prev.current = ink.strokes;
    erasedIds.current.clear();
    if (gone.length) {
      const batch = gone.map((s) => ({ s, key: s.id + Math.random() }));
      setGhosts((g) => [...g, ...batch]);
      setTimeout(() => setGhosts((g) => g.filter((x) => !batch.includes(x))), 260);
    }
  }, [ink.strokes]);

  const toBoard = (e: { clientX: number; clientY: number }, pressure: number): Point => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * h, pressure];
  };

  const eraseAt = (p: Point) => {
    onEraseAt?.(p[0], p[1]);
    const hit = strokesRef.current.filter((s) => !erasing.has(s.id) && distToStroke(s, p[0], p[1]) < ERASE_RADIUS);
    if (hit.length) setErasing((set) => new Set([...set, ...hit.map((s) => s.id)]));
  };

  const cancelStroke = () => {
    pts.current = null;
    activeId.current = null;
    live.current?.setAttribute("d", "");
    setDrawing(false);
    setCurving(null);
  };

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const n = touches.current.size;
      if (n === 1) gesture.current = { max: 1, t0: performance.now(), moved: false };
      else if (gesture.current) gesture.current.max = Math.max(gesture.current.max, n);
      if (n > 1) return cancelStroke(); // multi-finger = gesture, never ink
      // Palm rejection: ignore touches while / just after the Pencil is down.
      if (performance.now() < penQuietUntil.current || penSeen.current) return;
    }
    if (e.pointerType === "pen") {
      penSeen.current = true;
      penQuietUntil.current = Infinity;
    }
    if (activeId.current != null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activeId.current = e.pointerId;
    const p = toBoard(e, e.pointerType === "pen" ? e.pressure : 0.5);
    if (tool === "eraser") {
      erasedIds.current.clear();
      eraseAt(p);
      return;
    }
    pts.current = [p];
    setDrawing(true);
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      const t = touches.current.get(e.pointerId)!;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12 && gesture.current) gesture.current.moved = true;
    }
    if (activeId.current !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    if (tool === "eraser") {
      events.forEach((ev) => eraseAt(toBoard(ev, 0.5)));
      return;
    }
    if (!pts.current) return;
    for (const ev of events) pts.current.push(toBoard(ev, e.pointerType === "pen" ? ev.pressure : 0.5));
    live.current?.setAttribute("d", strokePath(pts.current, e.pointerType !== "pen"));
    const last = pts.current[pts.current.length - 1];
    const c = isCurvingBack(pts.current);
    setCurving(c ? { x: last[0], y: last[1] } : null);
  };

  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      touches.current.delete(e.pointerId);
      const g = gesture.current;
      if (touches.current.size === 0 && g) {
        if (!g.moved && performance.now() - g.t0 < 350) {
          if (g.max === 2) ink.undo();
          if (g.max === 3) ink.redo();
        }
        gesture.current = null;
      }
    }
    if (e.pointerType === "pen") penQuietUntil.current = performance.now() + 300;
    if (activeId.current !== e.pointerId) return;
    activeId.current = null;

    if (tool === "eraser") {
      if (erasing.size) {
        erasing.forEach((id) => erasedIds.current.add(id));
        ink.commit(strokesRef.current.filter((s) => !erasing.has(s.id)));
        setErasing(new Set());
      }
      return;
    }
    const points = pts.current;
    cancelStroke();
    if (!points || points.length < 2) {
      if (points?.length === 1) points.push([points[0][0] + 0.5, points[0][1] + 0.5, points[0][2]]); // a dot
      else return;
    }
    const stroke: Stroke = { id: newId(), points, tool: "pen" };
    ink.commit([...strokesRef.current, stroke]);
    onStroke?.(stroke);
    const loop = closedLoop(points);
    if (loop) onCircle?.(loop);
  };

  const empty = ink.strokes.length === 0 && !drawing;

  return (
    <div className={`relative select-none ${grid ? "grid-paper" : "bg-white"} ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <svg
        ref={svg}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
        aria-label="Canvas. Write with Apple Pencil, a mouse or a finger."
        role="img"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {ink.strokes.map((s) => (
          <path key={s.id} d={strokePath(s.points)} fill="var(--ink)" className={erasing.has(s.id) ? "ink-fade" : ""} />
        ))}
        {ghosts.map(({ s, key }) => (
          <path key={key} d={strokePath(s.points)} fill="var(--ink)" className="ink-lift" />
        ))}
        <path ref={live} fill={curving ? "var(--tomato-2)" : "var(--ink)"} style={{ transition: "fill 150ms" }} />
      </svg>
      {placeholder && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-faint transition-opacity duration-300"
          style={{ opacity: empty ? 1 : 0, fontSize: "1.05rem" }}
        >
          {placeholder}
        </div>
      )}
      {curving && (
        <div
          className="pointer-events-none absolute whitespace-nowrap text-[0.75rem] text-tomato-2 bubble"
          style={{ left: `${(curving.x / w) * 100}%`, top: `${(curving.y / h) * 100}%`, translate: "14px -34px" }}
        >
          check this?
        </div>
      )}
      {children}
    </div>
  );
}
