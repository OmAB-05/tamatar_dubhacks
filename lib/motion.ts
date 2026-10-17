// Shared animation helpers (ui_planning.md §5). Plain WAAPI, no animation library.

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function shake(el: Element | null) {
  if (!el || reduced()) return;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 360, easing: "ease-in-out" },
  );
}

export function wiggle(el: Element | null) {
  if (!el || reduced()) return;
  el.animate(
    [{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(6deg)" }, { transform: "rotate(-3deg)" }, { transform: "rotate(0)" }],
    { duration: 420, easing: "ease-out" },
  );
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
