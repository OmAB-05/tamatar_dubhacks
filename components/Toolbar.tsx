"use client";

import { useEffect, useRef, useState } from "react";
import { wiggle } from "@/lib/motion";
import type { Ink } from "@/lib/useInk";
import type { Tool } from "./InkCanvas";

const ICON: Record<string, React.ReactNode> = {
  pen: <path d="M5 19 L7 13 L16 4 L20 8 L11 17 Z M7 13 L11 17 M14 6 L18 10" />,
  eraser: <path d="M4 16 L12 8 L18 14 L12 20 L7 20 Z M8 12 L14 18 M12 20 L20 20" />,
  undo: <path d="M8 6 L4 10 L8 14 M4 10 C10 9 16 9 18 13 C19 16 17 19 13 19" />,
  redo: <path d="M16 6 L20 10 L16 14 M20 10 C14 9 8 9 6 13 C5 16 7 19 11 19" />,
  clear: <path d="M5 7 L19 7 M9 7 L9 4 L15 4 L15 7 M7 7 L8 20 L16 20 L17 7 M10.5 10 L10.5 17 M13.5 10 L13.5 17" />,
};

function Tb({ name, label, active, onClick, disabled, danger }: { name: string; label: string; active?: boolean; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={() => {
        onClick();
        wiggle(ref.current?.firstElementChild ?? null);
      }}
      className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 transition-colors disabled:opacity-30 ${
        active ? "bg-blush" : ""
      } ${danger ? "bg-tomato px-3 text-white" : ""}`}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {ICON[name]}
      </svg>
      {danger && <span className="text-[0.8rem]">clear all?</span>}
    </button>
  );
}

/** Pencil-case toolbar: pen / eraser / undo / redo / two-step clear (§4.6). */
export default function Toolbar({ ink, tool, setTool }: { ink: Ink; tool: Tool; setTool: (t: Tool) => void }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);

  return (
    <div className="flex items-center gap-0.5 rounded-full border-[2.5px] border-ink bg-white/95 px-1.5 py-0.5 shadow-[3px_4px_0_#f6d9d5]" onPointerDown={(e) => e.stopPropagation()}>
      <Tb name="pen" label="pen (P)" active={tool === "pen"} onClick={() => setTool("pen")} />
      <Tb name="eraser" label="eraser (E)" active={tool === "eraser"} onClick={() => setTool("eraser")} />
      <span className="mx-1 h-6 w-px bg-rule" />
      <Tb name="undo" label="undo (⌘Z)" onClick={ink.undo} disabled={!ink.canUndo} />
      <Tb name="redo" label="redo (⇧⌘Z)" onClick={ink.redo} disabled={!ink.canRedo} />
      <Tb
        name="clear"
        label={arm ? "tap again to clear" : "clear"}
        danger={arm}
        disabled={!ink.strokes.length && !arm}
        onClick={() => {
          if (arm) {
            ink.clear();
            setArm(false);
          } else setArm(true);
        }}
      />
    </div>
  );
}
