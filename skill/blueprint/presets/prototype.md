# Preset: prototype

**Use for**: clickable product concepts, interaction models, mode switching, and short-lived demonstrations.

Choose one level:

- `prototype-lite`: one page, at most three meaningful interaction states, expected lifetime under two weeks.
- `prototype-full`: multiple views, sustained iteration, or a structure likely to grow.

blueprint owns the deterministic scaffold. The Skill owns the topic-specific modes, realistic prompts, states, and results.

## prototype-lite

Create the scaffold:

```bash
blueprint create prototype-lite <output>
```

Then edit `<output>/index.html`. The scaffold already provides:

- React 18 and Babel through CDN;
- Tailwind CDN and the blueprint palette;
- accessible mode tabs;
- prompt input and example prompt buttons;
- a result region with stateful rendering.

Keep `useState`; do not add Redux, Zustand, a build chain, or another UI library.

### Content rules

1. Create 2–4 modes. Each mode represents a different interaction or result model, not site navigation.
2. Give every mode a label, headline, explanation, input placeholder, four realistic prompts, and a distinct result.
3. Both prompt buttons and form submission must update the result.
4. Use cards, tool-like output, or chat layouts based on the mode. Do not render every mode identically.
5. Keep touch controls at least 44px tall and verify narrow-screen wrapping.
6. Upgrade to `prototype-full` when the file exceeds roughly 600 lines or needs routing.

Verify:

```bash
blueprint check <output>/index.html
blueprint preview <output>/index.html
```

## prototype-full

Create the maintained React scaffold:

```bash
blueprint create prototype-full <output>
```

Then edit:

- `src/data/content.ts` for topic data;
- `src/types.ts` for stable domain types;
- `src/App.tsx` for the real interaction;
- `src/index.css` only for additional topic-specific styling.

The scaffold uses Vite, React, TypeScript strict, Tailwind CSS 4, and pnpm. Keep state local until the product proves it needs another boundary. Add routing only for real multiple pages.

Verify:

```bash
cd <output>
pnpm install
pnpm build
pnpm dev
```
