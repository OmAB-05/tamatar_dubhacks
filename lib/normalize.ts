// Map model output onto the glyphs Myfont.ttf actually has (ui_planning.md §1.5).

const MAP: Record<string, string> = {
  "≅": "≈",
  "⋯": "…",
  "⋅": "·",
  "∗": "*",
  "‘": "'",
  "“": '"',
  "”": '"',
  "&": "and",
  "@": "at",
  "$": "",
  "⟂": "⊥",
};

export function normalizeForFont(s: string): string {
  return s
    .replace(/\$+/g, "") // inline LaTeX delimiters
    .replace(/\\(theta|mu|Delta|alpha|beta|pi|omega|phi|lambda|tau|rho)/g, (_, g: string) => GREEK[g] ?? g)
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/./gu, (c) => MAP[c] ?? c);
}

const GREEK: Record<string, string> = {
  theta: "θ",
  mu: "μ",
  Delta: "Δ",
  alpha: "α",
  beta: "β",
  pi: "π",
  omega: "ω",
  phi: "φ",
  lambda: "λ",
  tau: "τ",
  rho: "ρ",
};
