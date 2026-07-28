# Preset: dossier

**Use for**: technical diligence, competitor teardown, research reports, white papers, and maintained multi-section web documents.

blueprint owns the Vite, React, TypeScript strict, Tailwind CSS 4, and pnpm scaffold. The Skill owns research, evidence, types, content structure, and topic-specific rendering.

## Create

```bash
blueprint create dossier <output>
```

The scaffold contains:

```text
<output>/
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  index.html
  .gitignore
  src/
    main.tsx
    App.tsx
    index.css
    types.ts
    data/
      content.ts
```

Do not add Redux, Zustand, Jotai, shadcn/ui, Material UI, Ant Design, CSS-in-JS, ESLint, Prettier, or Husky unless the user explicitly requests them.

## Fill

1. Put verified topic data and prose in `src/data/content.ts`.
2. Define only stable domain shapes in `src/types.ts`.
3. Keep `src/App.tsx` focused on presentation and real interaction.
4. Add topic-specific classes to `src/index.css`; preserve the shared Tailwind theme.
5. Use at least three substantive sections with two useful paragraphs or equivalent evidence per section.
6. Separate fact, inference, and recommendation.
7. For multi-party comparisons, use the vendor slots from `shared/design-system.md`.
8. Add `react-router-dom` only when the output has real multiple pages.
9. Add `lucide-react` or `framer-motion` only when the resulting interface actually uses icons or orchestrated motion.

## Verify

```bash
cd <output>
pnpm install
pnpm build
pnpm dev
```
