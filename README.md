# tamatar.si

A red pen tutor for handwritten physics diagrams and equations.

Start with [project context](planning/product/context.md), then use the [planning index](planning/README.md) to find the team, design, backend, and AI plans.

This folder currently contains planning documents and font assets. Backend and hosting documents are proposals; they do not indicate that services have been provisioned.

## Run the app

Next.js 14 + Tailwind + perfect-freehand. Needs Node 18+.

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_MOCK=1 uses lib/mock.ts instead of /api/check
npm run dev                  # http://localhost:3000
```

Screens: `/welcome`, `/tour`, `/warmup`, `/` (home), `/solve/hw4`, `/board/[id]`. In dev, a **screens** pill at the bottom of the page jumps between them, sets the tomato's rot state, and resets saved data.
