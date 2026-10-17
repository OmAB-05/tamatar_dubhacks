"use client";

import { useEffect } from "react";

/** Wobbly modal: backdrop fades, card drops in rotated 1° then straightens. Esc closes. */
export default function Modal({ onClose, children, className = "" }: { onClose: () => void; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,26,23,.25)] p-4"
      style={{ animation: "fade-in 200ms both" }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal
        className={`hand wb relative w-full max-w-[640px] bg-white p-6 shadow-[6px_8px_0_#f6d9d5] ${className}`}
        style={{ animation: "modal-in 360ms var(--pop) both" }}
      >
        <button type="button" aria-label="close" onClick={onClose} className="absolute right-3 top-2 h-11 w-11 text-[1.2rem] text-muted">
          ×
        </button>
        {children}
      </div>
      <style>{`@keyframes modal-in { from { opacity: 0; transform: translateY(-30px) rotate(1deg); } 60% { transform: rotate(1deg); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
