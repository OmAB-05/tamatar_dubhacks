# **tamatar.si — Team Split**

[Planning index](../README.md) · [Project context](../product/context.md)

Read [project context](../product/context.md) first. Everyone codes against `lib/types.ts`; changes to it need all three to agree.

| Role | Owns | Folders |
| ----- | ----- | ----- |
| **UI** | Everything the user sees and touches | `components/`, `app/page.tsx`, `app/import/page.tsx`, `public/tomato/` |
| **Backend** | AI logic, prompts, problem data, physics correctness | `app/api/`, `lib/prompts.ts`, `lib/parse.ts`, `lib/anthropic.ts`, `data/problems.ts` |
| **DevOps / APIs** | Repo, deploys, domain, keys, integration, testing on iPad, submission | Vercel, DNS, `.env`, `lib/mock.ts`, `lib/storage.ts`, Devpost |

---

## **UI**

**P0**

* \[ \] Layout: problem panel (30%) \+ canvas (70%) \+ toolbar, landscape iPad  
* \[ \] `InkCanvas`: perfect-freehand, pen-only drawing, eraser, undo/redo, `touch-action: none`  
* \[ \] `exportCanvasPNG()` (white background, downscaled)  
* \[ \] `OverlayLayer`: wobbly red ellipse at `bbox`, animated draw-in, red note in Myfont (only font, see context.md §4.1)  
* \[ \] `HelpLevelBar` (Mark / Hint / Explain / Answer) \+ `FeedbackCard`  
* \[ \] `PartProgress` (FBD → Equations), Next Question  
* \[ \] Circle-to-finish detection (`lib/circle.ts`)  
* \[ \] "Red pen thinking…" loading state

**P1:** `Tomato` (4 SVG states \+ bounce), import page UI **Start on:** mock data, so you never wait on the backend.

---

## **Backend**

**P0**

* \[ \] `/api/check`: build prompt → Claude vision → zod validation → retry once → `CheckResponse`  
* \[ \] Tune the check prompt on 10+ real handwriting samples; focus on **bbox accuracy**  
* \[ \] Write `data/problems.ts`: 5 ramp problems with reference FBD, solution, and final answer (double-check the physics)  
* \[ \] Return stable `errorKey`s (e.g. `normal_force_direction`, `sin_cos_swap`)

**P1:** `/api/extract` (PDF → `Problem[]`), `lib/tomato.ts` state machine **Start on:** the prompt and problem data, testing with photos of handwriting before the canvas exists.

---

## **DevOps / APIs**

**P0**

* \[ \] Create repo, Next.js \+ Tailwind scaffold, push `lib/types.ts` first (by 1pm)  
* \[ \] Vercel project, `ANTHROPIC_API_KEY` env var, tamatar.si DNS  
* \[ \] `/api/health`, `lib/mock.ts` \+ `NEXT_PUBLIC_MOCK` flag  
* \[ \] `lib/storage.ts` (safe localStorage)  
* \[ \] Own integration: merge branches every 2h, keep `main` deployable  
* \[ \] Test on the real iPad after every merge; report bugs with screenshots

**Ship (7am onward)**

* \[ \] Record the replayable "wrong" demo strokes \+ backup demo video  
* \[ \] Write and submit Devpost, tag prize tracks  
* \[ \] Charged iPad, hotspot backup

**P2:** Supabase friend mode, if there's time.

---

## **Sync points**

| Time | Sync |
| ----- | ----- |
| 1:00pm | `types.ts` locked, everyone running locally |
| 4:00pm | Real API wired into UI |
| 7:00pm | First full run on iPad |
| 12:00am | P0 complete check |
| 7:00am | **Feature freeze** |
| 8:30am | Demo rehearsal |

