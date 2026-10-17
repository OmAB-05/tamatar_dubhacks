# tamatar.si — Backend and hosting plan

Status: proposal, October 17, 2026. Read [project context](../product/context.md), [team ownership](../team/split.md), and [AI/API planning](../ai/api_planning.md). This document proposes setup; it does not provision services or change the agreed request/response types.

## Recommended setup

Use the existing Next.js App Router architecture for the frontend and backend, deployed as one Vercel project. Implement the three agreed API routes as Node.js Route Handlers. Keep the five ramp problems and reference solutions in version-controlled TypeScript, and student progress in localStorage for the demo.

This keeps the synchronous check pipeline together. A database, accounts, durable jobs, and a separate application server are unnecessary for P0. Train handwriting models separately; add an inference service only after a useful checkpoint exists.

```text
iPad canvas → POST /api/check → input validation → reference lookup
                                             → model adapter
                                             → output validation
                                             → CheckResponse → overlay

PDF upload → POST /api/extract → extraction adapter → validated problems
GET /api/health → basic process health
```

Vercel's Git integration supports production and preview deployments. Its Functions documentation lists a 4.5 MB request/response payload limit; plan upload handling around this limit. [Git deployments](https://vercel.com/docs/git), [Function limits](https://vercel.com/docs/functions/limitations).

## Backend responsibilities and boundaries

- Look up the problem and reference solution by server-controlled `problemId`; do not accept a client-supplied reference answer.
- Validate image encoding, decoded size, image dimensions, `part`, and `isFinal` before calling a provider.
- Build separate FBD and equation prompts. Ask for the first incorrect step and all help-level fields in one call.
- Validate provider output before it reaches the UI. Structured JSON is not proof of correct physics.
- Keep the browser independent of the chosen provider. It sends the agreed `CheckRequest` and receives the agreed `CheckResponse`.
- Keep keys, provider URLs, and model selection server-side. The UI controls which already-generated help fields are displayed.

The backend teammate owns prompts, validation, problem data, and physics correctness. DevOps owns environments, hosting, domain setup, and integration. Coordinate any `lib/types.ts` change with all three teammates, as required by the context.

## API routes

### POST /api/check — P0

Accept the existing JSON `CheckRequest`. Decode the PNG safely, resolve the problem, call the configured checker, and return a validated `CheckResponse` with normalized coordinates.

Validation should reject non-finite coordinates, non-positive box dimensions, and boxes outside the image. Verify `x + w ≤ 1` and `y + h ≤ 1`. Check the consistency of `correct`, `errorStep`, `bbox`, and help fields. Normalize output strings for Myfont after validating their meaning and shape.

Use a server deadline with cancellation and at most one retry within the total deadline. Retry malformed model output or a transient provider error; do not retry an invalid user request. Avoid multiplying SDK retries and application retries. A timed-out or unreadable response must not become `correct: true` or a fabricated mistake.

Proposed failure handling: non-2xx HTTP with a small `{ error: { code, message }, requestId }` body; the UI preserves ink and offers retry. This is a proposed error envelope to agree with the team, not a replacement for the successful response contract. Distinguish invalid input, payload too large, throttling, provider failure, invalid model response, and timeout.

### POST /api/extract — P1

Accept the agreed multipart PDF upload and return validated `problems` and `unsupported`. Begin with a conservative demo upload limit, such as 3 MB, leaving room below the hosting limit for multipart overhead. Enforce a page limit as well. Ask the user to select an extracted problem before solving; do not imply imported statements or references are guaranteed correct.

If large PDFs become necessary, propose a direct-to-object-storage upload and a short-lived object reference. That changes the current upload flow and requires a coordinated contract update. Do not route arbitrary client-supplied remote URLs through the backend.

### GET /api/health — P0

Return `{ ok: true }` when the route is running. Do not call a paid model on every health check or expose keys/configuration. Test provider readiness separately with a controlled smoke test before the demo.

## Proposed code organization

Retain the files agreed in context, including `lib/anthropic.ts`, `lib/prompts.ts`, and `lib/parse.ts`. Add an internal checker interface when implementing the first adapter so an experiment can switch providers without editing UI code.

```text
app/api/check/route.ts       # HTTP boundary and orchestration
app/api/extract/route.ts     # PDF boundary and extraction
app/api/health/route.ts      # basic health
lib/types.ts                # existing shared contracts
lib/anthropic.ts            # first provider client/model configuration
lib/prompts.ts              # task-specific prompts
lib/parse.ts                # schemas and output validation
lib/ai/checker.ts            # proposed provider-independent checker interface
data/problems.ts            # five reviewed ramp problems
```

Create additional OpenAI/Gemini adapters only for a concrete comparison or selected fallback. Keep provider-specific payloads and reasoning settings inside adapters.

## Hosting, domain, and environments

1. Create the Git repository and lockfile, scaffold the app, and establish a clean local build. The inspected workspace currently has no Git repository or application scaffold.
2. Connect the repo to the team's Vercel project. Set the correct project root and production branch. Use branch previews for integration.
3. Configure development, preview, and production secrets independently. Record which environment is being tested.
4. Add `tamatar.si` to the Vercel project, then apply the exact DNS records Vercel presents at the registrar. The context says the domain is owned; ownership and DNS have not been independently checked. Verify HTTPS and loading on the iPad. [Domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
5. Set function duration deliberately, within the actual account plan's limits, and keep the provider deadline shorter. Choose the function region after considering provider latency; benchmark rather than assuming the nearest region wins.
6. Keep a known-good production deployment for rollback and re-test one complete FBD/equation flow after a release.

Suggested server configuration names:

```text
ANTHROPIC_API_KEY
AI_PROVIDER=anthropic
AI_CHECK_MODEL=claude-sonnet-5-5
AI_EXTRACT_MODEL=claude-sonnet-5-5
AI_TIMEOUT_MS=20000
NEXT_PUBLIC_MOCK=1             # local/demo fallback builds only
```

These are proposed names and starting values, not settings already applied. `OPENAI_API_KEY` or `GEMINI_API_KEY` is needed only when testing that provider. Commit a placeholder `.env.example`; exclude `.env.local` and all actual secrets. Provider keys never use `NEXT_PUBLIC_`. Verify model access with the actual account before relying on it.

## Upload size, reliability, and cost controls

The current PNG-to-base64 flow increases payload size by roughly one third. Downscaling to 1568 px alone does not guarantee a small request: measure encoded bytes and apply an application limit below Vercel's cap. Reject oversize requests before a paid call.

Allow one active check per client, cancel obsolete requests, and ensure late responses cannot overwrite newer work. For a public deployment, add a server-side request budget/rate limit; a per-instance memory counter is not a durable limit across function instances. Choose a shared store only when enabling that public endpoint, or restrict demo access initially.

Log request ID, provider/model, prompt version, part, elapsed time, token usage, retry count, and validation status. Do not log raw handwriting, PDFs, keys, or full provider payloads by default. Keep application errors visible in deployment logs and set provider spend limits where available.

Cache only identical problem/part/image requests, with prompt and model versions in the key, and scope student content appropriately. Defer persistent caching until repeated calls justify it. Moving the help slider must not trigger another paid check.

## Storage and optional services

For P0, keep static problem data in the repo and progress locally. Retain replayable demo strokes as fixtures. Do not persist ordinary student submissions on the server by default.

For opt-in handwriting collection later, use private object storage for images/strokes and a metadata store for labels, writer/session IDs, split membership, and source terms. Define consent, retention, and deletion before collection. Never place private submissions in `public/` or commit training archives.

Friend mode remains P2 and needs a separate realtime/auth/storage decision. Audio polish should begin with pre-generated files as described in [delight.md](../design/delight.md); live TTS is a separate optional backend route, not part of the check critical path.

## Path to self-hosted recognition

Training runs outside the web deployment on a machine appropriate to the model. Store datasets and checkpoints separately from application source. A small symbol model may be exportable to browser inference after accuracy, memory, and iPad latency testing. A larger equation model can run behind an authenticated inference service on suitable compute.

In that later design, Next.js remains the public API and calls the inference service using server credentials. Apply deadlines and prevent direct unauthenticated inference access. Read [dataset research](../ai/handwriting-datasets.md) before choosing training data. Keep recognition and physics grading separate; replacing handwriting OCR alone does not eliminate the tutor's reasoning requirement.

## Implementation order and acceptance

1. Agree types, five reference solutions, prompts, and mock responses.
2. Implement `/api/health` and one real `/api/check` provider adapter.
3. Validate normal-force direction and sin/cos mistakes on real iPad input; inspect red boxes visually.
4. Verify malformed input, oversized upload, invalid model JSON, timeout, throttling, and retry behavior without losing strokes.
5. Deploy a preview, check secrets and HTTPS, then complete a full two-part problem on iPad Safari.
6. Test slider changes without network calls, eraser/answer-circle effects, and stale-response handling.
7. Add PDF import after P0 passes. Run model comparisons before changing the selected provider.

Proposed demo targets: median check under 5 seconds, p95 under 10 seconds, and no malformed successful responses in the fixed evaluation set. These are acceptance targets to measure, not achieved performance or provider guarantees. Keep mock mode clearly identified as simulated feedback.
