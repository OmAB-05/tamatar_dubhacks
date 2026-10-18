"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calculate, formatAnswer, type AngleMode } from "@/lib/calculator";

const KEYS = [
  ["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["(", "("], [")", ")"],
  ["asin", "asin("], ["acos", "acos("], ["atan", "atan("], ["π", "pi"], ["e", "e"],
  ["ln", "ln("], ["log", "log("], ["√", "sqrt("], ["x²", "^2"], ["xʸ", "^"],
  ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "/"], ["AC", "clear"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["×", "*"], ["←", "delete"],
  ["1", "1"], ["2", "2"], ["3", "3"], ["−", "-"], ["Ans", "Ans"],
  ["0", "0"], [".", "."], ["×10^", "*10^"], ["+", "+"], ["=", "equals"],
] as const;

export default function ScientificCalculator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expression, setExpression] = useState("");
  const [mode, setMode] = useState<AngleMode>("deg");
  const [answer, setAnswer] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    input.current?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const evaluate = () => {
    try {
      const value = calculate(expression, mode, answer);
      setAnswer(value);
      setResult(formatAnswer(value));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the expression and try again.");
      setResult(null);
    }
  };

  const press = (value: string) => {
    if (value === "equals") {
      evaluate();
      input.current?.focus({ preventScroll: true });
      return;
    }
    let start = input.current?.selectionStart ?? expression.length;
    const end = input.current?.selectionEnd ?? start;
    let next: string;
    if (value === "clear") {
      next = "";
      start = 0;
    } else if (value === "delete") {
      next = expression.slice(0, start === end ? Math.max(0, start - 1) : start) + expression.slice(end);
      start = start === end ? Math.max(0, start - 1) : start;
    } else if (result !== null) {
      next = (/^[+*/^\-]/.test(value) ? "Ans" : "") + value;
      start = next.length;
    } else {
      next = expression.slice(0, start) + value + expression.slice(end);
      start += value.length;
    }
    if (next.length > 250) return;
    setExpression(next);
    setError(null);
    setResult(null);
    requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true });
      input.current?.setSelectionRange(start, start);
    });
  };

  if (!open) return null;
  return createPortal(
    <section
      role="dialog"
      aria-label="Scientific calculator"
      className="hand wb fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto bg-white p-4 shadow-[5px_6px_0_#f6d9d5]"
      onKeyDown={(e) => {
        // Calculator keys must never trigger Check, help-level changes or canvas undo.
        if (e.key === "Escape") onClose();
        e.stopPropagation();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[1.1rem]">Scientific calculator</h2>
        <button type="button" onClick={onClose} aria-label="Close calculator" className="h-11 min-w-11 rounded-full hover:bg-blush">×</button>
      </div>
      <div className="mb-3 flex items-center gap-2 text-[0.8rem]" role="group" aria-label="Angle mode">
        {(["deg", "rad"] as const).map((unit) => (
          <button key={unit} type="button" aria-pressed={mode === unit} onClick={() => { setMode(unit); setResult(null); setError(null); }} className={`min-h-[36px] rounded-full border px-3 ${mode === unit ? "border-tomato bg-blush text-tomato" : "border-rule"}`}>
            {unit === "deg" ? "Degrees" : "Radians"}
          </button>
        ))}
      </div>
      <label htmlFor="calculator-expression" className="sr-only">Calculator expression</label>
      <input
        ref={input}
        id="calculator-expression"
        value={expression}
        maxLength={250}
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. 5 × 9.8 × cos(30)"
        className="w-full rounded-lg border border-rule bg-panel px-3 py-2 text-[1rem]"
        onChange={(e) => { setExpression(e.target.value); setError(null); setResult(null); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "=") { e.preventDefault(); evaluate(); } }}
      />
      <div className="flex min-h-[52px] items-center justify-end py-2 text-right" aria-live="polite" aria-atomic="true">
        {error ? <p role="alert" className="text-[0.8rem] text-tomato">{error}</p> : <output aria-label="Calculator result" className="break-all text-[1.5rem]">{result ?? "0"}</output>}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {KEYS.map(([label, value]) => (
          <button
            key={label}
            type="button"
            aria-label={value === "delete" ? "Delete last character" : value === "clear" ? "Clear calculator" : value === "equals" ? "Calculate" : label === "xʸ" ? "Power" : label === "x²" ? "Square" : label === "√" ? "Square root" : label}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => press(value)}
            className={`min-h-[44px] rounded-lg border text-[1rem] active:scale-95 ${value === "equals" ? "border-tomato bg-tomato text-white" : /^[0-9.]$/.test(value) ? "border-rule bg-white hover:bg-blush" : "border-rule bg-panel hover:bg-blush"}`}
          >
            {label === "xʸ" ? <>x<sup>y</sup></> : label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.7rem] text-muted">log = base 10 · ln = natural log · Ans = last result</p>
    </section>,
    document.body,
  );
}
