# Project planning

Read [product/context.md](product/context.md) first. It remains the source of truth for scope, shared contracts, and the demo. New backend and AI plans are proposals to implement and evaluate, not silent changes to those contracts.

```text
planning/
├── README.md
├── product/
│   └── context.md
├── team/
│   └── split.md
├── design/
│   ├── ui_planning.md
│   └── delight.md
├── backend/
│   └── backend_planning.md
└── ai/
    ├── api_planning.md
    └── handwriting-datasets.md
```

- [Project context](product/context.md): product, ramp scope, architecture, contracts, and demo checklist.
- [Team split](team/split.md): ownership and integration checkpoints.
- [UI planning](design/ui_planning.md): screens, Pencil interaction, feedback, and typography.
- [Delight spec](design/delight.md): tomato, motion, sound, and optional polish.
- [Backend planning](backend/backend_planning.md): routes, validation, hosting, environments, deployment, and a future model service.
- [AI/API planning](ai/api_planning.md): model comparison, selection experiment, costs, and a custom recognition path.
- [Handwriting datasets](ai/handwriting-datasets.md): dataset research, terms, access issues, and training advice.

Original planning filenames are preserved. App paths mentioned inside these documents (such as `lib/types.ts` and `public/fonts/`) are relative to the project root, not to the document's new folder.
