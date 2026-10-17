import localFont from "next/font/local";

// The only font in the app (ui_planning.md §1). Never add a second family.
export const myfont = localFont({
  src: "../public/fonts/Myfont.ttf",
  variable: "--font-my",
  display: "block", // never flash a fallback font
  preload: true,
  fallback: [], // no system fallback
  adjustFontFallback: false,
});
