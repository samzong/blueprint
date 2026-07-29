# Preset: dossier

Use this contract for technical diligence, competitor teardown, research reports, white papers, and maintained multi-section evidence dashboards.

```bash
blueprint create dossier <output>
```

The scaffold owns Vite, React, strict TypeScript, Tailwind CSS 4, pnpm, responsive report navigation, comparison surfaces, evidence cards, a native evidence dialog, and source filters. Fill:

- `src/data/content.ts` with verified data and prose
- `src/types.ts` with stable domain shapes
- `src/App.tsx` with presentation and real interaction
- `src/index.css` with topic-specific styles

Keep the generated output semantic and maintainable. Production bundles, copied minified application code, and iframe wrappers may be preserved as local reference evidence, but they are not an acceptable dossier implementation.

## Content rules

- Include at least three substantive sections.
- Separate fact, inference, and recommendation.
- Reuse vendor slots from `design-system.md` for multi-party comparisons.
- Lead with the decision, evidence date, audience, and current confidence.
- Give comparable subjects the same fields. Do not hide uneven evidence behind different card structures.
- Keep every strong claim adjacent to its evidence level, limitation, decision implication, and source references.
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

## Existing page rebuild

When rebuilding from a live URL, screenshot, recovered artifact, or legacy output:

1. Use `browser-cdp` to capture desktop and mobile structure plus every meaningful interaction state.
2. Inventory the content hierarchy, comparison axes, evidence records, source links, and visual assets.
3. Treat recovered HTML, CSS, bundles, and screenshots as reference inputs only.
4. Rebuild the report from typed semantic data and maintainable React components.
5. Put required media under `public/` with stable local paths. Keep canonical public URLs on source records.
6. Preserve the original artifact separately unless the user explicitly requests replacement.

## Acceptance

Before a requested preview, visual review, or deployment handoff:

1. Run `blueprint check <project>`.
2. Run `pnpm build`.
3. Preview through Blueprint or the project Vite server.
4. Use `browser-cdp` at desktop and mobile widths to verify the full content surface, navigation, filters, dialogs, local assets, and console state.
5. Confirm there are no unresolved starter records, broken images, unexpected remote runtime assets, or missing source links.
6. For a visual rebuild, compare matching viewport and interaction-state screenshots. `blueprint check` alone does not prove fidelity.
