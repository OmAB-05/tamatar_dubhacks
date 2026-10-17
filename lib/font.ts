// Keep model text inside Myfont's glyph set (context.md §4.1). Runs after the
// meaning/shape of a response has been validated, never before.

const LATEX: [RegExp, string][] = [
  [/\\theta/g, "θ"],
  [/\\mu/g, "μ"],
  [/\\Delta/g, "Δ"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\pi/g, "π"],
  [/\\Sigma/g, "Σ"],
  [/\\omega/g, "ω"],
  [/\\phi/g, "φ"],
  [/\\lambda/g, "λ"],
  [/\\tau/g, "τ"],
  [/\\rho/g, "ρ"],
  [/\\Omega/g, "Ω"],
  [/\\cdot/g, "·"],
  [/\\times/g, "×"],
  [/\\div/g, "÷"],
  [/\\pm/g, "±"],
  [/\\approx/g, "≈"],
  [/\\neq/g, "≠"],
  [/\\leq?(?![a-z])/g, "≤"],
  [/\\geq?(?![a-z])/g, "≥"],
  [/\\perp/g, "⊥"],
  [/\\parallel/g, "∥"],
  [/\\angle/g, "∠"],
  [/\\to|\\rightarrow/g, "→"],
  [/\\circ/g, "°"],
  [/\\sqrt/g, "√"],
  [/\\(sin|cos|tan)/g, " $1 "],
  [/\\(?:text|mathrm)\{([^}]*)\}/g, "$1"],
  [/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)"],
];

const CHAR_MAP: Record<string, string> = {
  "≅": "≈",
  "⋅": "·",
  "∙": "·",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "⟂": "⊥",
  "⇒": "→",
  "⟶": "→",
};

const SUPERSCRIPT: Record<string, string> = { "2": "²", "3": "³", "1": "¹" };

export function normalizeForFont(input: string): string {
  let s = input;
  for (const [re, rep] of LATEX) s = s.replace(re, rep);
  s = s.replace(/\^\{?([123])\}?(?![0-9])/g, (_, d: string) => SUPERSCRIPT[d]);
  s = s.replace(/_\{([^}]*)\}/g, "$1").replace(/_([A-Za-z0-9])/g, "$1");
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");
  s = s.replace(/\*\*|__|`|\$/g, "");
  s = s.replace(/\\/g, "");
  s = Array.from(s, (c) => CHAR_MAP[c] ?? c).join("");
  return s.replace(/[ \t]+/g, " ").trim();
}
