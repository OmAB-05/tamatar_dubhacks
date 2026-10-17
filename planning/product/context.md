# tamatar.si — Project Context

[Planning index](../README.md) · [Team split](../team/split.md) · [Backend plan](../backend/backend_planning.md) · [AI/API plan](../ai/api_planning.md)

> **A red pen tutor for physics diagrams.** Built at DubHacks 2026 (University of Washington, Oct 17–18, 2026). Team of 3\.

Everyone on the team (and every Claude session we use for coding) should read this file first. It is the single source of truth for what we're building, how it fits together, and the shared contracts that let us work in parallel without breaking each other.

---

## 1\. The product in one paragraph

You solve a physics problem by hand on an iPad with an Apple Pencil. When you press **Check**, tamatar finds the **first step where you went wrong** and circles it in red on your own handwriting, the way a TA's red pen would. A help-level bar lets you choose how much help you get: just the mark, a hint, an explanation, or the full answer. A tomato mascot rots a little more each time you repeat a mistake and recovers when you get things right.

**Name:** tamatar \= "tomato" in Hindi; tamatar.si \= "tomato.superintelligence". **Tagline:** "A red pen tutor for physics diagrams." (We are *not* using "Grammarly for physics"; Chiron is too close to that framing.)

### Why it matters (pitch angle)

- Answer-checkers only tell you whether the final answer is right. Real learning happens at the step where you went wrong.  
- Physics is diagram-first. A wrong free-body diagram means every equation after it is wrong, and no app checks the diagram itself.  
- The work stays handwritten. You don't type equations into a form; you write the way you would on an exam.

---

## 2\. Demo scope (be ruthless)

**One problem type: the inclined plane (ramp).** It covers both a free-body diagram and equations, so it shows the full two-part flow.

Each problem has two parts:

1. **Part A — Draw the free-body diagram.** Checked for the right forces (gravity, normal, friction if relevant, applied force if relevant), their directions, and any missing or extra forces.  
2. **Part B — Solve.** Checked step by step (component decomposition, Newton's 2nd law, algebra, final answer).

The student **circles the final answer** to finish, then presses Next Question.

---

## 3\. Features (priority order)

### P0 — Must-have (the demo breaks without these)

| \# | Feature | Notes |
| :---- | :---- | :---- |
| 1 | Pencil canvas | Pressure-sensitive, palm rejection, eraser, undo/redo, no scroll or zoom while drawing |
| 2 | Check pipeline | Canvas → PNG → `/api/check` → Claude vision → structured JSON |
| 3 | Red-pen overlay | Wobbly hand-drawn ellipse around the wrong region, plus a short red note in Myfont (our font) |
| 4 | Help-level bar | 0 Mark · 1 Hint · 2 Explain · 3 Answer |
| 5 | Two-part flow | Part A FBD → Part B equations, with a progress indicator |
| 6 | Circle-to-finish | A closed-loop stroke auto-triggers the final check |
| 7 | Problem set | 5 hardcoded ramp problems with reference solutions |

### P1 — Should-have

| \# | Feature | Notes |
| :---- | :---- | :---- |
| 8 | Tomato | 4 states (fresh → bruised → wilting → rotten), recovers on correct answers, streak badge |
| 9 | PDF import | Upload homework PDF → Claude extracts problems → pick one |

### P2 — Stretch (only if we're ahead at 3am)

| \# | Feature | Notes |
| :---- | :---- | :---- |
| 10 | Student's own handwriting font | Student writes a–z / 0–9; hints render in *their* hand (the app itself always uses Myfont, see §4.1) |
| 11 | Friend mode | Room code, same problem set, live scoreboard (Supabase realtime) |
| 12 | Works inside other apps | **Pitch-only vision.** Mention it in the demo; do not build it |

---

## 4\. Tech stack

| Layer | Choice | Why |
| :---- | :---- | :---- |
| Framework | **Next.js 14, App Router, TypeScript** | One repo for UI \+ API routes; fast to deploy |
| Styling | **Tailwind CSS** | Speed |
| Ink | **perfect-freehand** \+ HTML canvas \+ Pointer Events | Good pressure-sensitive strokes with Apple Pencil in Safari |
| Font | **Myfont only** (`public/fonts/Myfont.ttf`), our own handwriting font, used for everything: UI, problem text, red-pen notes, numbers, math | Self-hosted with `next/font/local`. No Google Fonts. See §4.1 |
| AI | **Anthropic Messages API — Claude Sonnet (vision)** | Reads handwriting and diagrams, returns JSON |
| PDF | Send the PDF directly to Claude as a document block | No parsing library needed |
| Hosting | **Vercel** | Push to deploy |
| Domain | **tamatar.si** → Vercel | Already owned |
| State | React state \+ `localStorage` (wrapped in try/catch) | No DB needed for P0/P1 |
| Realtime (P2 only) | Supabase | Only for friend mode |

**Target device:** iPad Safari, landscape. Use desktop Chrome with a mouse for development; test on the real iPad at least every 2–3 hours.

### 4.1 Font rule: Myfont everywhere

- **One font family in the whole app: Myfont.** No Caveat, no Inter, no Crimson Pro, no system fonts (not even on the 404 page). Hierarchy comes from size, color (`--tomato` red), rotation, and highlighter/sticky backgrounds. Never use `font-weight` bold (Myfont has one weight; Safari would fake-bold it). Set `font-synthesis: none`.
- **Use `public/fonts/Myfont.ttf`, not the Calligraphr source `fonts/Myfont-Regular.ttf`.** The Calligraphr original has letters and basic punctuation only. The extended file adds, in the same pen style, everything a physics page needs:
  - digits `0–9`
  - operators `+ − = × ÷ · / ^ % ° < > ≤ ≥ ≈ ± ≠ √ ∞ ∝`
  - brackets `( ) [ ] { }`
  - geometry `⊥ ⟂ ∥ ∠`
  - arrows `→ ← ↑ ↓`
  - Greek `θ μ Δ α β π Σ ω φ λ τ ρ Ω`
  - superscripts `² ³ ¹`
  - `… * # | ~ _ – —`

  It also lifts `. , : ; ? !` onto the letters' baseline, so `9.8` no longer reads as `9 . 8`.
- **Regenerate** with `python fonts/tools/add_math_glyphs.py fonts/Myfont-Regular.ttf public/fonts/Myfont.ttf` (needs `fonttools` + `skia-pathops`). If you re-export Myfont from Calligraphr, re-run this script. `fonts/specimen.html` shows every glyph; serve the folder over http to view it.
- **Subscripts** (`μₖ`, `F_N`): use `<sub>` at ~0.65em. Only `² ³ ¹` have their own glyphs.
- **No fallback font.** Load with `fallback: []` and `display: "block"`. A character Myfont lacks should look obviously broken in dev, not quietly render in Arial.
- **Model output:** Claude's strings go straight onto the page, so they must stick to the characters above. The check/extract prompts say so (§8), and the UI runs every string through `normalizeForFont()` to strip emoji and map the rest (`≅` → `≈`, `⋅` → `·`, LaTeX → plain text).

```ts
// app/fonts.ts
import localFont from "next/font/local";
export const myfont = localFont({
  src: "../public/fonts/Myfont.ttf",
  variable: "--font-my", display: "block", preload: true, fallback: [],
});
// layout.tsx: <html className={myfont.variable}>  ·  tailwind: fontFamily.sans = ["var(--font-my)"]
```

---

## 5\. Architecture

┌──────────────────────── iPad Safari ────────────────────────┐

│  ProblemPanel │            InkCanvas (strokes)              │

│  (text,       │  ┌─────────────────────────────────────┐    │

│   diagram,    │  │  OverlayLayer (red ellipse \+ note)  │    │

│   feedback)   │  └─────────────────────────────────────┘    │

│               │  Toolbar: Pen Eraser Undo Clear \[CHECK\]     │

│  Tomato  HelpLevelBar  PartProgress                         │

└───────────────┬─────────────────────────────────────────────┘

                │ exportCanvasPNG() → base64

                ▼

      POST /api/check  ──────────►  Anthropic API (vision)

      POST /api/extract ─────────►  Anthropic API (PDF)

                │

                ▼

        CheckResponse JSON → overlay \+ feedback card \+ tomato state

### Request flow for Check

1. The user presses **Check**, or draws a circle around their answer.  
2. The UI calls `exportCanvasPNG()`, which returns a white-background PNG as base64 (downscale to max 1568px on the long edge).  
3. The UI sends a `CheckRequest` to `/api/check`.  
4. The backend builds the prompt (problem, reference solution, part) and calls Claude with the image.  
5. The backend validates the JSON, retries once if parsing fails, and returns a `CheckResponse`.  
6. The UI draws a red ellipse at `bbox`, shows feedback fields up to the chosen `helpLevel`, and updates the tomato.

**Important:** always request *all* fields from the model and filter by `helpLevel` **in the UI**. Moving the slider then reveals more help instantly, with no extra API call.

---

## 6\. Shared contracts (DO NOT change without telling the team)

Put all of these in `lib/types.ts`. All three people code against these types.

// \---------- Ink \----------

export type Point \= \[x: number, y: number, pressure: number\];

export type Stroke \= { id: string; points: Point\[\]; tool: "pen" | "eraser" };

// \---------- Problems \----------

export type ProblemPart \= "fbd" | "equations";

export type Problem \= {

  id: string;

  title: string;                 // "Block on a frictionless ramp"

  text: string;                  // full problem statement

  givenValues: Record\<string, string\>; // { m: "5 kg", θ: "30°" }

  diagramSvg?: string;           // optional inline SVG of the setup

  type: "inclined\_plane";

  reference: {

    fbd: string;                 // expected forces \+ directions, plain text

    equations: string;           // expected step-by-step solution

    finalAnswer: string;         // "a \= 4.9 m/s² down the ramp"

  };

};

// \---------- Check \----------

export type HelpLevel \= 0 | 1 | 2 | 3; // Mark | Hint | Explain | Answer

export type CheckRequest \= {

  imageBase64: string;           // PNG, no data: prefix

  problemId: string;

  part: ProblemPart;

  isFinal?: boolean;             // true when triggered by circle-to-finish

};

export type BBox \= { x: number; y: number; w: number; h: number }; // fractions 0–1 of the image

export type CheckResponse \= {

  correct: boolean;

  errorStep: string | null;      // "Normal force drawn vertical"

  bbox: BBox | null;             // where to draw the red circle

  mark: string | null;           // ≤ 6 words, shown in red

  hint: string | null;           // level 1

  explanation: string | null;    // level 2

  fullSolution: string | null;   // level 3

  errorKey: string | null;       // stable id for the mistake, e.g. "normal\_force\_direction" (used by tomato)

};

// \---------- Extract \----------

export type ExtractResponse \= { problems: Problem\[\]; unsupported: string\[\] };

// \---------- Tomato \----------

export type TomatoState \= 0 | 1 | 2 | 3; // fresh | bruised | wilting | rotten

### API endpoints

| Method | Route | Body | Returns |
| :---- | :---- | :---- | :---- |
| POST | `/api/check` | `CheckRequest` | `CheckResponse` |
| POST | `/api/extract` | `multipart/form-data` with `file` (PDF) | `ExtractResponse` |
| GET | `/api/health` | — | `{ ok: true }` |

**Mock mode:** if `NEXT_PUBLIC_MOCK=1`, the UI uses `lib/mock.ts` instead of calling the API. That way UI work never waits on the backend, and we have a fallback if the API or Wi-Fi dies during judging.

---

## 7\. File structure

tamatar/

├── app/

│   ├── layout.tsx

│   ├── fonts.ts                 \# Myfont via next/font/local (the only font)

│   ├── page.tsx                 \# main solve screen

│   ├── import/page.tsx          \# PDF import (P1)

│   └── api/

│       ├── check/route.ts

│       ├── extract/route.ts

│       └── health/route.ts

├── components/

│   ├── InkCanvas.tsx            \# strokes, pencil, export

│   ├── OverlayLayer.tsx         \# red ellipse \+ note

│   ├── Toolbar.tsx

│   ├── ProblemPanel.tsx

│   ├── FeedbackCard.tsx

│   ├── HelpLevelBar.tsx

│   ├── PartProgress.tsx

│   └── Tomato.tsx

├── lib/

│   ├── types.ts                 \# shared contracts (above)

│   ├── anthropic.ts             \# client \+ model constant

│   ├── prompts.ts               \# system prompts for check / extract

│   ├── parse.ts                 \# JSON validation (zod) \+ retry

│   ├── circle.ts                \# closed-loop stroke detection

│   ├── tomato.ts                \# state machine

│   ├── storage.ts               \# safe localStorage wrapper

│   └── mock.ts                  \# mock CheckResponses

├── data/

│   └── problems.ts              \# 5 ramp problems

├── public/

│   ├── fonts/Myfont.ttf \# our font + math glyphs (built from fonts/)

│   └── tomato/                  \# 4 SVG states

├── fonts/                       \# font source: Myfont-Regular.ttf, specimen.html, tools/add_math_glyphs.py

├── .env.local                   \# ANTHROPIC\_API\_KEY (never commit)

└── planning/                    # product/context.md, team/split.md, design/, backend/, ai/

---

## 8\. The check prompt (starting point — iterate on it)

You are a strict but kind physics TA grading a student's handwritten work on an

inclined-plane problem. You will receive an image of their work.

PROBLEM: {problem.text}

GIVEN: {givenValues}

PART BEING CHECKED: {part}   // "fbd" or "equations"

REFERENCE: {reference\[part\]}

FINAL ANSWER: {reference.finalAnswer}

Find the FIRST incorrect step only. Do not list multiple errors.

\- For "fbd": check that each required force is present, points in the correct

  direction, and that there are no extra forces (e.g. a "force of motion").

\- For "equations": check component decomposition (sin vs cos), signs, Newton's

  2nd law setup, algebra, units, and the final answer.

Return ONLY valid JSON, no prose, matching:

{ "correct": bool, "errorStep": string|null, "bbox": {"x","y","w","h"}|null,

  "mark": string|null (≤6 words), "hint": string|null, "explanation": string|null,

  "fullSolution": string|null, "errorKey": string|null }

bbox \= the region of the image containing the error, as fractions 0–1 of

image width/height. Make it tight around the mistake.

If the work is correct, set correct=true and everything else to null.

Write every text field in plain words, numbers and these symbols only:
+ − = × ÷ · / ^ ( ) [ ] ° < > ≤ ≥ ≈ ± √ → ⊥ ∥ ∠ θ μ Δ α π Σ ω φ λ τ ρ ² ³
No LaTeX, no markdown, no emoji. Write subscripts as plain letters (mu_k → "μk").

Known risks with the prompt:

- **bbox accuracy** is the biggest demo risk. If circles land in the wrong place, add a 10% padding and test on 10+ real handwriting samples. As a fallback, ask the model which *line number* the error is on and circle that whole line.  
- **Latency:** keep `max_tokens` around 600 and downscale images. Show a "red pen thinking…" animation during the wait.

---

## 9\. Demo problems (data/problems.ts)

1. Block sliding down a frictionless ramp; find acceleration.  
2. Block on a ramp with friction (μk given); find acceleration.  
3. Block at rest on a ramp; find the minimum μs.  
4. Block pushed up a ramp by a horizontal force; find acceleration.  
5. Find the normal force on a block on a ramp with angle θ.

Use clean numbers (m \= 5 kg, θ \= 30°, g \= 9.8 m/s²). Have the backend person write the reference FBD \+ solution for each, and double-check the physics.

---

## 10\. Timeline (Sat Oct 17 → Sun Oct 18\)

> Assumes hacking closes \~10:00am Sunday. **Check the official DubHacks schedule and shift the blocks if needed.**

| Time | Block | Done when |
| :---- | :---- | :---- |
| 12–1pm | Setup: repo, Next.js scaffold, Vercel, tamatar.si DNS, API key, `types.ts` agreed | Blank page live on tamatar.si on the iPad |
| 1–4pm | Canvas \+ Check pipeline (UI on mock data, backend on the real API) | Write on the iPad → Check → JSON back |
| 4–7pm | Red-pen overlay \+ help bar \+ Hint/Next | Wrong step gets circled on your own ink |
| 7–8pm | Dinner \+ **integration on the real iPad** | Pencil feels good, real API wired in |
| 8pm–12am | Two-part flow, circle-to-finish, 5 problems | A full ramp problem works end to end |
| 12–3am | Tomato \+ PDF import | Tomato reacts; a PDF becomes problems |
| 3–7am | Polish, bug fixes, stretch | Looks like a product |
| 7–8:30am | **FEATURE FREEZE.** Backup demo video, Devpost | Video saved, Devpost drafted |
| 8:30–10am | Submit, rehearse demo ×2 | Submitted with time to spare |

**Rules:** merge to `main` at least every 2 hours. Nobody pushes a broken `main` after 7am.

---

## 11\. Master checklist

**Setup**

- [ ] Repo created, all 3 pushing  
- [ ] Vercel project \+ tamatar.si DNS  
- [ ] `ANTHROPIC_API_KEY` in Vercel env \+ `.env.local` (never committed)  
- [ ] `lib/types.ts` agreed and committed
- [ ] `Myfont.ttf` in `public/fonts/`, loaded in `app/fonts.ts`; no other font anywhere (§4.1)

**P0**

- [ ] Canvas works with the Pencil on iPad Safari (palm rejection, no scroll)  
- [ ] `exportCanvasPNG()`  
- [ ] `/api/check` returns a valid `CheckResponse`  
- [ ] Red ellipse lands on the right spot  
- [ ] Help bar works at all 4 levels  
- [ ] FBD → equations flow  
- [ ] Circle-to-finish  
- [ ] 5 problems with checked reference solutions  
- [ ] Mock mode works

**P1**

- [ ] Tomato states \+ streak  
- [ ] PDF import

**Ship**

- [ ] Pre-written "wrong" demo work saved as strokes (replayable, so the demo doesn't depend on live handwriting luck)  
- [ ] Backup demo video (screen recording of the iPad)  
- [ ] Devpost: name, tagline, inspiration, what it does, how we built it, challenges, what's next, screenshots, video, team  
- [ ] Demo script rehearsed twice  
- [ ] iPad charged; hotspot ready in case venue Wi-Fi is slow

---

## 12\. Demo script (\~2 minutes)

1. **Hook (15s):** "Every physics student has gotten a problem wrong and had no idea *where*. Answer keys tell you the answer, not your mistake."  
2. **Show (60s):** Open a ramp problem. Draw an FBD with the normal force pointing straight up. Press Check: the red pen circles it with "Normal ⟂ to ramp." Slide the help bar from Hint to Explain. Fix it, then move on to equations. Use sin instead of cos and get circled. Fix it, circle the answer, tomato recovers.  
3. **Tomato (10s):** Show it rotting on repeated mistakes. It gets a laugh and makes the point about consistency.  
4. **Import (15s):** Drop in a homework PDF and show the problems getting extracted.  
5. **Vision (20s):** "Today it's ramps. Next it's every mechanics problem, then a red pen that lives inside whatever app you already take notes in."

---

## 13\. DubHacks notes

- Submission is through **Devpost**. Submit early, then edit; don't wait until the last minute.  
- Judges see many projects. A tight, working demo of one problem type beats a broken demo of ten.  
- Check the sponsor prize tracks on the DubHacks site or Devpost page. If there's an education, AI, or "best use of \[API\]" track, tag it.  
- Get sleep in shifts. At least one person should be fresh for the 8:30am demo rehearsal.

---

## 14\. Using Claude to code

- Paste this whole file as context at the start of every new Claude session.  
- Say which person/role you are and which component you're building.  
- Never let Claude change `lib/types.ts` without the team agreeing.  
- When something breaks, send the screenshot \+ the error \+ the file to Claude.

