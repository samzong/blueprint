# Preset: dossier

Use this contract for technical diligence, competitor teardown, research reports, white papers, and maintained multi-section documents.

```bash
blueprint create dossier <output>
```

The scaffold owns Vite, React, strict TypeScript, Tailwind CSS 4, and pnpm. Fill:

- `src/data/content.ts` with verified data and prose
- `src/types.ts` with stable domain shapes
- `src/App.tsx` with presentation and real interaction
- `src/index.css` with topic-specific styles

## Content rules

- Include at least three substantive sections.
- Separate fact, inference, and recommendation.
- Reuse vendor slots from `design-system.md` for multi-party comparisons.
- Add routing only for real multiple pages.
- Add icon or motion dependencies only when the interface uses them.
- Do not add state libraries, UI frameworks, CSS-in-JS, ESLint, Prettier, or Husky unless requested.

## Research library pattern

Use this only when the dossier includes a maintained paper, source, or evidence corpus:

- Give every externally shared record one canonical public source URL. Prefer an abstract or publisher landing page over a PDF; never expose machine-local files or invent a link.
- Use native search and select controls for the filters the corpus actually needs. Category, evidence status, and sort order are enough for most collections.
- Keep deep-read evidence separate from metadata-only records. Evidence cards should state the finding, limitation, and decision implication.
- Add a reading route only when it explains how the evidence supports a decision or operating loop.
- On narrow screens, stack controls and cards; keep all controls keyboard reachable with visible focus.
