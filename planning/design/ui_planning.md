# tamatar.si — UI Planning

[Planning index](../README.md) · [Project context](../product/context.md) · [Team split](../team/split.md) · [Delight spec](delight.md)

> Companion to [project context](../product/context.md) (what we build) and [team split](../team/split.md) (who builds it). This file is the UI owner's plan: every screen, every interaction, and the one typography rule.
>
> Source: the shared prototype artifact (claude.ai/artifact/4L5SfncPFiqSxGkxJaC7oX), a compiled Next.js build of the full flow on mock data. Everything below keeps its screens and copy, and adds the interaction layer so the app feels alive under the Pencil.

---

## 0. Design north star

**It should feel like a notebook that grades you back.** Nothing looks like a web form. Every surface is paper, every border is hand-drawn, every response is a red pen mark that *draws itself in*. Every tap, stroke, and check gets an immediate, physical reaction: wobble, ink, squish, rot.

Three rules:

1. **One font. Everywhere.** (See §1. This is non-negotiable.)
2. **Nothing is static.** Every element on screen either reacts to touch, animates in, or responds to state. If it doesn't move, ask why.
3. **Never block the pen.** Animations never steal input from the canvas. Feedback appears *around* the ink, never on top of where the student is writing.

---

## 1. Typography: Myfont only

### 1.1 The rule

The only font family in the app is **Myfont** (`public/fonts/Myfont.ttf`, our Calligraphr font plus math glyphs, §1.2). It replaces **all** of these from the prototype and `context.md`:

| Was | Used for | Now |
| :-- | :-- | :-- |
| `__hand` (local TTF) | UI body | **Myfont** |
| Caveat | red-pen notes | **Myfont** |
| Crimson Pro | problem text, PDF page | **Myfont** |
| Inter | UI (per context.md) | **Myfont** |
| system-ui | Next.js 404 page | **Myfont** |

No Google Fonts. No `<link>` to fonts.googleapis.com. Delete `Caveat`, `Crimson Pro`, and `Inter` from `layout.tsx`, `tailwind.config`, and the CSS. (`context.md` §4.1 now states this rule.)

Hierarchy comes from **size, color, rotation, and weight-faking** (see 1.4), not from a second typeface.

### 1.2 Math glyphs: done, use `Myfont.ttf`

The original Calligraphr export had only 89 glyphs: letters and basic punctuation, with **no digits or math symbols**. Physics needs `m = 5 kg`, `θ = 30°`, `a = 4.9 m/s²`, `μk = 0.2`, so we extended the font **in the same pen style** (monoline, ~48-unit stroke, same baseline and heights, slight hand wobble):

- **File:** `public/fonts/Myfont.ttf`, built from the Calligraphr source `fonts/Myfont-Regular.ttf`. It's still family "Myfont", so this is the one font, not a second one.
- **Added (77):**
  - digits `0–9`
  - operators `+ − - = × ÷ · / ^ % ° < > ≤ ≥ ≈ ± ≠ √ ∞ ∝`
  - brackets `( ) [ ] { }`
  - geometry `⊥ ⟂ ∥ ∠`
  - arrows `→ ← ↑ ↓`
  - Greek `θ μ Δ α β π Σ ω φ λ τ ρ Ω`
  - superscripts `² ³ ¹ ⁰ ⁴ ⁻`
  - `… * # | ~ _ – —`
- **Fixed:** `. , : ; ? !` sat far below the letters (Calligraphr placement). They now sit on the baseline, so `9.8` and `3.14` read correctly.
- **Still missing:** `& @ $` and most accented capitals. Avoid them in copy. Add them to the script if needed.
- **Source of truth:** `fonts/tools/add_math_glyphs.py`. Each glyph is a few lines of pen-stroke skeleton, so tweaking a shape or adding a symbol is easy. Re-run it after any Calligraphr re-export.
- **Preview:** `fonts/specimen.html` (serve `fonts/` over http, e.g. `python3 -m http.server`).
- **Subscripts** (`μ_k`, `F_N`): `<sub>` at 0.65em in Myfont. **Superscripts** for units use the real `²` glyph.
- **Fallback guard:** `fallback: []`. In dev, add a zero-glyph fallback (Adobe Blank as a data URI) so a missing character shows as a gap instead of quietly rendering in Arial. The dev check in §1.5 logs it.

### 1.3 Loading it

```ts
// app/fonts.ts
import localFont from "next/font/local";

export const myfont = localFont({
  src: "../public/fonts/Myfont.ttf",  // built by fonts/tools/add_math_glyphs.py
  variable: "--font-my",
  display: "block",          // never flash a fallback font
  preload: true,
  fallback: [],              // no system fallback
});
```

```tsx
// app/layout.tsx
<html lang="en" className={myfont.variable}>
```

```css
/* globals.css */
:root { --font: var(--font-my); }
html, body, button, input, textarea, select, svg text, canvas {
  font-family: var(--font) !important;
}
```

```js
// tailwind.config.ts
theme: { fontFamily: { sans: ["var(--font-my)"], serif: ["var(--font-my)"], mono: ["var(--font-my)"] } }
```

- **Canvas text:** any text drawn with `ctx.fillText` (e.g., a replayed demo note) must wait for `document.fonts.load('24px Myfont')` before drawing. Canvas does not re-render when fonts arrive.
- **SVG text** in the tomato, ramp diagrams, and arrows: set `font-family="var(--font-my)"` or inherit. Better yet, use HTML labels absolutely positioned over the SVG.
- **Next.js 404 / error pages:** override `app/not-found.tsx` and `app/global-error.tsx`. The default 404 uses `system-ui`.
- **PWA manifest / OG image:** if we generate an OG image with `next/og`, load the same OTF buffer into it.

### 1.4 Type scale (one family, many voices)

Base 24px on iPad. All sizes are `rem` with `html { font-size: 24px }` on iPad and 20px under 900px width.

| Token | Size | Color | Extra | Used for |
| :-- | :-- | :-- | :-- | :-- |
| `display` | clamp(40px, 6vw, 68px) | `--ink` | — | Welcome title |
| `title` | 42px | `--ink` | — | Modal titles |
| `h2` | 32px | `--ink` | — | Section heads, wordmark |
| `body` | 24px | `--ink` | — | Buttons, UI copy |
| `print` | 19px | `--ink-2` | `letter-spacing: .01em`, no rotation | Problem statements (was Crimson Pro) |
| `small` | 17px | `--muted` | — | PDF headers, meta |
| `red-note` | 26–30px | `--tomato` | `rotate(-3deg…-6deg)`, wobble-in | Red-pen marks |
| `sticky` | 24px | `--ink` | yellow sticky bg | Hints |

**Faking emphasis with one weight:** Myfont has only Regular. For "bold":
- prefer **color** (`--tomato`) or a **highlighter swipe** behind the word (`--high`, see §3.6);
- if a heavier stroke is truly needed, use `-webkit-text-stroke: 0.6px currentColor` (crisp in Safari);
- never use `font-weight: 600` (Safari will synthesize an ugly faux-bold). Set `font-synthesis: none` globally.

### 1.5 Font guardrails (DevOps owns)

- **Dev overlay:** in dev, a script walks every text node, checks each character against a glyph list exported from the OTF, and shows a red toast: `missing glyph: "θ" in ProblemPanel`.
- **Lint:** fail CI if `font-family` appears in any file with a value other than `var(--font-my)` / `inherit`, or if `fonts.googleapis.com` appears anywhere.
- **Claude output:** AI responses may contain `θ`, `μ`, `→`, `≈`, emoji. The check prompt should ask for plain ASCII + the glyph set we support, and the UI should run every model string through `normalizeForFont()` (map anything outside the glyph list in §1.2 to its nearest supported character, e.g. `≅ → ≈`, `⋯ → …`; strip emoji and LaTeX).

---

## 2. Visual system (from the prototype)

Keep the prototype's tokens; they're good.

```css
--paper:#fff; --ink:#1f1a17; --ink-2:#4a4340; --muted:#6b6461; --faint:#9a918d;
--tomato:#c2392d; --tomato-2:#d9473a; --blush:#fdecea; --rule:#ebcfcb;
--grid:#f3e6e3; --sticky:#fff3a8; --high:#ffe58a; --good:#2e7d32; --panel:#faf6f5;
/* wobbly hand-drawn border radii */
--wa:255px 15px 225px 15px/15px 225px 15px 255px;
--wb:15px 255px 15px 225px/225px 15px 255px 15px;
--wc:225px 25px 205px 20px/20px 205px 25px 225px;
```

- **Paper:** 32px graph grid (`.grid`) on canvases and the tutorial; plain white elsewhere.
- **Borders:** 2.5–3px `--ink`, with one of `.wa / .wb / .wc` wobbly radii. Alternate them so no two neighbors share a shape.
- **Shadows:** flat offset only (`4px 5px 0 #f6d9d5`), like a paper cutout. No blur.
- **Dividers:** `1.5px dashed var(--rule)`.
- **Light only.** It's paper. Set `color-scheme: light`.

---

## 3. Interaction layer: making everything feel alive

This section turns the static prototype into the interactive version. Each item has a priority; P0 items ship with the core flow.

### 3.1 Motion principles

| Principle | Spec |
| :-- | :-- |
| Hand-drawn timing | Ease `cubic-bezier(.3,1.4,.5,1)` (slight overshoot) for things appearing; `ease-in` 120ms for leaving |
| Durations | Micro 120ms · UI 220ms · Red-pen draw 450–700ms · Tomato 600ms |
| Boiling line | Hand-drawn SVG outlines jitter between 3 path variants at 6fps (`steps()`), the "boiling ink" cartoon look. Use on the tomato, rings, and empty states. Off when idle >10s to save battery |
| Reduced motion | `prefers-reduced-motion`: keep fades, drop wobble/boil/bounce. Already in the prototype CSS |
| 60fps on iPad | Animate only `transform`, `opacity`, `stroke-dashoffset`. Never animate layout |

### 3.2 Buttons and tappables (P0)

- **Press:** `scale(.96) rotate(±.6deg)` on `pointerdown`, spring back on release. Random tilt direction per button so they feel hand-made.
- **Hover (desktop/mouse only, `@media (hover:hover)`):** border wobbles to the next radius variant (`wa → wb`) over 220ms.
- **Primary red button:** ink "fills" from left on press (a `::before` scaleX 0→1 at 180ms), then the action fires.
- **Disabled:** 45% opacity plus a faint pencil cross-hatch pattern, so it reads as "not yet" rather than "broken". Tapping a disabled button shakes it (±4px, 3×) and shows a sticky toast with *why*: `write your answer first`, `get the diagram right first`.
- **Hit targets:** ≥ 44×44pt everywhere (prototype already does this).
- **Haptics:** iPad Safari has no Vibration API. Don't rely on it; motion carries the feedback.

### 3.3 The canvas (P0, most important surface)

| Interaction | Behavior |
| :-- | :-- |
| Pen down | Stroke starts instantly (perfect-freehand, pressure). No smoothing lag over 1 frame |
| Pencil vs finger | `pointerType === "pen"` draws. Finger: **two-finger tap = undo**, **three-finger tap = redo** (matches iPadOS). One-finger drag pans *only* when zoomed (we don't zoom in P0, so finger does nothing on canvas) |
| Mouse (dev) | Draws, so we can develop on desktop |
| Palm rejection | Ignore `touch` pointers while a `pen` pointer is active, and for 300ms after |
| Eraser | Tool button, or **Pencil double-tap** if available (it isn't exposed to Safari, so tool button + `E` key on desktop). Erased strokes fade out over 120ms instead of vanishing |
| Undo / redo | Buttons + gestures + `⌘Z / ⇧⌘Z`. Undone stroke "lifts off" (fades + 4px up) |
| Clear | Requires a 2-step confirm built into the button (tap → turns red "clear all?" for 3s → tap again). No `confirm()` dialogs |
| Placeholder | `draw the forces on the block as arrows` sits faint in the canvas, fades out on first stroke, returns if canvas is emptied |
| Arrow assist (P1) | When a stroke ends near the block and looks like a line, show a ghost arrowhead preview. Lift = accept. Helps judges with mouse/finger |
| Live circle preview (P0) | While drawing, if the stroke is curving back toward its start (`lib/circle.ts`), the stroke tints `--tomato-2` and a small "check this?" label pre-appears near the pen. Closing the loop pops the `Check this?` bubble with a bounce |
| Circle-to-finish | Closed loop → bubble `Check this?` springs out from the circle. Tap = check. Ignore/keep writing = bubble fades after 4s |

### 3.4 Check → "red pen thinking…" (P0)

Latency is 2–6s. Make the wait a performance, not a spinner.

1. Check button squishes, then the canvas border becomes a slowly **drawing dashed red line** circling the board (stroke-dashoffset loop).
2. A small red pen icon "scribbles" in the corner while a sticky note cycles copy every 1.2s: `reading your handwriting…` → `checking your arrows…` → `looking for the first slip…`.
3. The ink stays fully visible and **writable** (if the user keeps writing, we mark the result stale and offer `check again`).
4. Timeout at 15s → sticky: `the red pen is slow right now. try again?` with retry button. Mock mode fallback kicks in automatically if `/api/check` errors twice.

### 3.5 Red-pen feedback (P0, the hero moment)

The order matters; this is the demo.

1. **Ring draws itself** around `bbox` (with 10% padding): SVG path, three wobbly ellipse variants chosen at random, `stroke-dashoffset` from full to 0 over 550ms, ease-out, slight overshoot past the start point like a real pen loop.
2. **Ink bleed:** stroke starts at 2.5px and settles to 3px over 150ms.
3. **Note writes in** 150ms after the ring finishes: the `mark` text (≤6 words) appears letter-by-letter (clip-path wipe left→right, 25ms/char) in `--tomato`, rotated −4°. Placement: outside the ring on the side with the most empty space, never over ink.
4. **Arrow from note to ring** draws in (200ms).
5. **Tomato reacts** at the same moment (§3.8).
6. **Correct:** instead of a ring, a big green check draws itself next to the work (`nice diagram!` / `you got it!`), confetti of 6–8 tiny hand-drawn tomato seeds/ticks pops once.

Interacting with the mark:
- **Tap the ring or note** → opens the help ladder right there (inline popover anchored to the ring), not in a distant panel.
- **Start erasing inside the ring** → ring fades to 30% (the student is fixing it). After the fix, a small `check again` bubble appears.
- Example marks from the prototype: `the normal force pushes out of the ramp, not straight up`, `this arrow is not a real force on the block`, `along the ramp, gravity pulls with mg sin θ, not mg cos θ`, `rewrite that line`, `erase it and draw it again`.

### 3.6 Help-level ladder (P0)

Prototype levels: **Mark → Hint → Explain → Answer**. All fields come back in one response; revealing is instant.

- **Control:** a hand-drawn 4-notch slider (a pencil line with 4 tick marks). Drag the thumb (a small red pen nib) or tap a notch. Snaps with a little overshoot. Also works as 4 tappable labels for accessibility.
- **Reveal animations per level:**
  - **Hint** → a yellow **sticky note** slaps on next to the ring (drops from 20px above, rotates to 2°, tiny shadow settles). e.g. `which way does the ramp push on the block?`
  - **Explain** → the sticky unfolds into a longer note; key phrase gets a **highlighter swipe** (`--high` bar scales in left→right behind the words).
  - **Answer** → a lined-paper **solution card** (prototype `.solution`, blue ruled lines + red margin) slides in rotated 1°. Contains `full solution`.
- **Cost of help:** a counter `hints used: N` with tally marks (prototype `.tally`). Each level reveal adds a tally that draws itself. Going *down* the ladder hides content but keeps the tally (honest scoring).
- Default level persists in `localStorage`.

### 3.7 Two-part flow and progress (P0)

- **Tabs:** `diagram` / `equations` (prototype `.tabs`), red underline that **slides** between tabs (shared-element transition, 220ms).
- **Locked tab:** equations tab shows a padlock doodle and `locked until the diagram is right`. Tapping it shakes the lock. When Part A passes, the lock **pops open** (rotate + fall away), the tab pulses once, and a sticky says `on to the equations →`.
- **Transition:** the FBD board slides left and shrinks to a thumbnail pinned in the corner of the equations board (so students can glance back at their diagram). Tap the thumbnail to peek full size.
- **Problem dots:** `.dots` progress per homework. Current dot is drawn as a circle being drawn; completed dots fill tomato red with a little splat.
- **Next question:** after a correct circled answer, the page **turns** (CSS 3D page curl, 500ms) to the next problem.

### 3.8 The tomato (P1, but plan now — it's the personality)

States: fresh → bruised → wilting → rotten (`TomatoState 0–3`). Status copy from the prototype:

| State | Line |
| :-- | :-- |
| 0 | `your tomato is looking fresh today` |
| 0–1 | `your tomato is doing fine` |
| 1–2 | `your tomato is looking a little sad` |
| 2 | `your tomato needs some right answers` |
| 3 | `your tomato has seen better days` |

Interactions:
- **Idle:** gentle breathing (scale 1↔1.02, 3s) + boiling outline. Eyes blink every 4–7s (random).
- **Tap it:** squish (scaleY .85, scaleX 1.1, spring back), says one of its lines in a speech bubble.
- **Drag it (P2):** it wobbles like jelly and drops back into the badge.
- **Wrong answer:** flinches, a bruise spot fades in, a single sweat drop. Repeat of the same `errorKey` → steps down a state with a sad droop + a fly doodle orbits at state 3.
- **Right answer:** jumps (y −18px, squash on landing), sparkle ticks, leaf perks up; recovers one state. `your tomato perked right up`.
- **Streak badge:** small flame-shaped leaf with the count; increments with a flip-counter animation.
- **Where:** topbar badge (`your tomato, health N`), and it peeks in from the canvas corner during feedback so it's in frame for the demo.
- Accessible: `aria-live="polite"` announces the status line.

### 3.9 Toasts, stickies, and empty states (P0)

- **Toast** (prototype `.toast`): yellow sticky at bottom center, rotated −1°, drops in, auto-dismiss 2.5s, swipe down to dismiss. Never more than one; new ones replace old with a quick swap.
- **Empty states** always have a doodle + one line + one action. Blank whiteboard: `a blank page. write anything, then tap Check`.

### 3.10 Keyboard (desktop / iPad with keyboard)

`P` pen · `E` eraser · `⌘Z` undo · `⇧⌘Z` redo · `Enter` check · `1–4` help level · `→` next question · `Esc` close modal/sheet. Shown in a `?` cheat-sheet sticky.

---

## 4. Screens

Landscape iPad Safari is the target (1180×820 / 1366×1024). Must not break at 1024×768 or on desktop Chrome. Under 900px wide the prototype hides `.example` and the tomato label; keep that.

### 4.1 Welcome (`screen welcome`)

- Copy: `Hi, welcome to tamatar,` / `what’s your name?` (second line in `--faint`).
- **Name input:** big 48px underline input. Typing makes each letter **pop in** (scale .6→1). The underline draws itself on focus. The tomato sits beside the title and *watches the caret* (eyes follow).
- **Next** button (bottom right, `.next-btn`, pink): disabled and shakes until a name exists; on tap the welcome card flies up like a torn page.
- Name stored in `localStorage` and used everywhere: `nice diagram, Sai!`.
- **Scribble-to-type (P1):** a small "write it instead" link turns the input into a mini canvas; iPadOS Scribble already converts Pencil to text in inputs, so make sure the input supports it (don't block `pointer` events on inputs).

### 4.2 Quick tour (`screen grid centered`, 4 cards)

Cards from the prototype:
1. **Write your work on the canvas** — `Use your Pencil like it is paper. No typing, no special syntax.`
2. **Draw forces as arrows** — `Start every arrow on the object. tamatar checks which way each one points.`
3. **Circle your answer when you are done** — `A circle means finished. Then tamatar offers to check it.`
4. **Meet your tomato** — `Right answers keep it fresh. A run of misses makes it rot.`

Interactive version:
- Each card's art (`.tut-art`) is a **mini live canvas**, not an image. Card 1: try writing. Card 2: a ghost hand draws an arrow, then the user tries; a ring appears if they draw it the wrong way. Card 3: draw a circle → `Check this?` bubble pops for real. Card 4: tap the tomato to squish it; a slider lets you rot/heal it.
- **Swipe** left/right between cards (finger), dots below, plus `back` / `next` buttons.
- `skip` link top right (`.link.skip`). Copy: `quick tour, N of 4`.
- Last card CTA: **Try one problem**.

### 4.3 Warm-up (`one practice problem, then you’re in`)

- Left: **example card** (`here’s how it looks`) with a replayed stroke animation of a correct worked example, ending with a circle and `circle your answer to say you’re done`.
- Right: canvas `your turn. write it out here, then circle your answer`.
- Result card (`.result`) on success: `take me to my homework` (red, big). The demo uses this as the "aha" before real homework.
- The replay uses the same saved-stroke format as the demo backup (`Stroke[]` JSON), so it doubles as a test of stroke replay.

### 4.4 Home (`.home`)

- **Topbar:** wordmark `tamatar` + red `.si` (tap = wiggle + plays the tomato line), tomato badge, `New +` button.
- **`New +` menu** (`.menu`): `Import problems`, `Blank whiteboard`. Menu unfolds from the button (scaleY from top, items stagger 40ms).
- **Your homework** grid (`.hw-grid` of `.card`): each card shows title, problem dots, status (`not started`, `all done`). Cards tilt slightly on press and **lift** (shadow grows) on hover. Long-press (P1) → `Race a friend`, `rename`, `delete` (two-step).
- **Whiteboards** row (`.board-thumb`): live thumbnails of saved boards (e.g. `Monday scratch`) rendered from strokes; dashed `new` tile.
- Cards enter with a stagger (60ms each) like papers being dealt.

### 4.5 Import modal (P1)

- Modal with wobbly border; backdrop fades; modal drops in rotated 1° then straightens.
- **Drop zone** (`.drop`): `drop your homework PDF here` / `choose a file`. On drag-over: border goes red and starts "marching ants" dash animation; the tomato peeks over the edge. On drop: the PDF icon "folds" into the zone.
- **Extracting:** each found problem **types itself** into the list as it's parsed (stream if we can, otherwise stagger after response): `Found four problems`. Each `.found-row` has a checkbox drawn as a hand box with a hand tick.
- Unsupported problems shown greyed with a note.
- Actions: `choose another file`, **Create homework** (red).

### 4.6 Solve screen (`.solve`) — the main event

Layout from the prototype (landscape):

```
┌ topbar: tamatar.si · tomato badge · menu ────────────────────────────────┐
│ panel 280px     │ center                                     │ rail 150px│
│ (PDF page,      │  qbox: "problem 2" + statement             │  Check    │
│  problems list, │  tabs: diagram | equations 🔒               │  help     │
│  Hide homework) │  canvas (grid board, aspect-locked)         │  ladder   │
│                 │   tools ◱ pen eraser undo redo clear        │  hints    │
│                 │   overlay: ring · note · sticky · solution  │  used     │
│                 │                                             │  Next →   │
└─────────────────┴─────────────────────────────────────────────┴───────────┘
```

- **Left panel** (`.panel`): a fake PDF page (`.pdf-page`, `page one of one`) listing problems. Tapping a problem highlights it (`.problem.on`, blush + dotted red border) and the canvas cross-fades to that problem's board. `Hide homework` collapses the panel to a 52px rail with a slide; `Show homework` reopens. Collapsing gives the canvas more room; the board re-fits with a smooth resize (animate `--ratio` container, not the strokes).
- **qbox:** dotted red frame, `problem N` label + statement. Given values (`m = 5 kg`) are **tappable chips**: tap → a tiny sticky shows the value so students can copy it while writing.
- **Ramp diagram:** inline SVG in the qbox; the block can be dragged a little along the ramp (P2 delight) and the angle arc highlights when `θ` is tapped.
- **Tools** (`.tools`, bottom-left of canvas): pen / eraser / undo / redo / clear. Active tool has blush fill and its icon wiggles once when selected. Pen color fixed to ink (students don't need colors; red is reserved for tamatar).
- **Rail** (`.rail`, right): big **Check** (red), help ladder, tally, **Next question** (enabled after the final circled answer is correct).
- **Overlay layer:** all feedback lives here, positioned in `bbox` fractions, so it scales with the board.
- Canvas placeholder per part: `draw the forces on the block as arrows` / `write your equations here`.

### 4.7 Race a friend (P2, sheet)

- Right-side sheet (`.sheet`) slides in. Copy: `Send this homework to a friend. You both get the same page. Finish first with the fewest errors to win.`
- Link box (`.race-link`, selectable, tap = copy with a "copied!" sticky). Note: `The race starts when your friend opens the link.`
- **Live leaderboard** (`table.lb`): rows reorder with FLIP animation when scores change; a friend's progress dot fills in real time; their tomato is shown too. Supabase realtime.
- Countdown `3 · 2 · 1` drawn in red when both are in.

### 4.8 Blank whiteboard

Full canvas, no problem, `a blank page. write anything, then tap Check`. Check here runs a general "find the first slip" prompt (P1/backend).

---

## 5. Component checklist (maps to `split.md` UI tasks)

| Component | New interactions to build | Priority |
| :-- | :-- | :-- |
| `app/fonts.ts` + globals | Myfont only, zero fallback, dev glyph check | **P0 / hour 1** |
| `InkCanvas` | pressure, palm rejection, gestures, fade-erase, live circle tint | P0 |
| `OverlayLayer` | self-drawing ring, write-in note, tap-to-help, fade on erase | P0 |
| `Toolbar` | press wiggle, two-step clear | P0 |
| `ThinkingState` | circling dashed border, cycling sticky copy, timeout | P0 |
| `HelpLevelBar` | 4-notch pen slider, sticky/highlighter/solution reveals, tally | P0 |
| `PartProgress` | sliding tab underline, padlock pop, FBD thumbnail | P0 |
| `ProblemPanel` | collapse/expand, problem select cross-fade, value chips | P0 |
| `FeedbackCard` | merged into overlay popovers (keep component for layout) | P0 |
| `Toast` / `Sticky` | drop-in, swipe dismiss, single-instance | P0 |
| `Button` | press tilt, ink fill, disabled shake + reason | P0 |
| `Tomato` | 4 states, boil, blink, squish, jump, flinch, eye tracking | P1 |
| `Welcome` / `Tour` / `Warmup` | live mini-canvases, swipe, replay strokes | P1 |
| `Home` | dealt-card stagger, menu unfold, live thumbnails | P1 |
| `ImportModal` | drag-over ants, typed-in results | P1 |
| `RaceSheet` | FLIP leaderboard, countdown | P2 |

Shared animation utilities in `lib/motion.ts`: `drawIn(path, ms)`, `writeIn(el, msPerChar)`, `springPress(el)`, `shake(el)`, `boil(svg)`. CSS keyframes in one file. No animation library needed; if we want one, use Motion One (small) — but plain CSS + WAAPI is enough.

---

## 6. Accessibility (without killing the vibe)

- Every red-pen mark also goes to an `aria-live="polite"` region as text (`mark` + current help-level text).
- Canvas has `aria-label`: `Canvas. Write with Apple Pencil, a mouse or a finger.` (prototype copy).
- Contrast: `--tomato` (#c2392d) on white passes AA for text ≥ 24px; `--faint` is decorative only, never for required info.
- Focus ring: `3px solid var(--tomato-2)` with 2px offset (already in prototype).
- Reduced motion respected everywhere; the boiling line and page curl are the first to go.

---

## 7. Demo-specific polish

- **Replayable demo strokes:** a hidden `?demo=1` route preloads the "wrong FBD" strokes and replays them at real speed (the audience sees handwriting appear), then Check fires the mock response. Same for the sin/cos equations mistake.
- **Make the hero moment big:** during feedback, the canvas gently zooms (scale 1.04) toward the ring so it reads from the back of the room. Off outside demo mode.
- **Tomato in frame:** in demo mode the tomato sits on the canvas corner, so the rot/recover beat lands on camera.
- **Mock-mode banner:** tiny `in the real app, Claude reads your page here` sticky (prototype copy) only when `NEXT_PUBLIC_MOCK=1` and not in demo mode.

---

## 8. Order of work for the UI person

1. **Hour 1:** build `public/fonts/Myfont.ttf` from `fonts/Myfont-Regular.ttf`, set up `app/fonts.ts`, tokens + base CSS, dev glyph check (§1.5).
2. Canvas (pressure, palm rejection, undo/redo, export). Test on the iPad.
3. Check button + thinking state + overlay ring/note on mock data. **This is the demo; get it feeling great before anything else.**
4. Help ladder reveals + tally.
5. Two-part flow, padlock, circle-to-finish bubble.
6. Toasts, button micro-interactions, disabled reasons.
7. Tomato.
8. Welcome / tour / warm-up / home / import.
9. Race (only if ahead).

**Definition of done for "interactive":** put the iPad in someone's hands who has never seen it. Every tap they make gets a visible reaction within 100ms, and they never ask "did that do anything?"
