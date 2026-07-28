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
