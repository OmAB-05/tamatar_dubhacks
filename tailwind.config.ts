import type { Config } from "tailwindcss";

// Spacing in rem, sized so p-4 / h-11 match Tailwind's usual px at a 24px root. The root
// font size (globals.css) then scales type and spacing together.
const steps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
const spacing = Object.fromEntries([["px", "1px"], ...steps.map((n) => [String(n), `${+((n * 4) / 24).toFixed(4)}rem`])]);

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    spacing,
    fontFamily: { sans: ["var(--font-my)"], serif: ["var(--font-my)"], mono: ["var(--font-my)"] },
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        tomato: "var(--tomato)",
        "tomato-2": "var(--tomato-2)",
        blush: "var(--blush)",
        rule: "var(--rule)",
        sticky: "var(--sticky)",
        good: "var(--good)",
        panel: "var(--panel)",
      },
    },
  },
  plugins: [],
};

export default config;
