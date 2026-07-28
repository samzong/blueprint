# Theme: briefing

The briefing theme is the only supported briefing skin. It combines a restrained slide frame, subtle grid, explicit page labels, neutral white surfaces, and semantic status colors.

The blueprint compiler owns exact tokens, fonts, component CSS, responsive behavior, and deck runtime. Do not copy CSS into generated source files.

## Visual language

- White or subtle neutral slide backgrounds.
- Inter and Noto Sans SC for body text.
- JetBrains Mono for labels, dates, versions, codes, and page numbers.
- Optional Noto Serif SC through `.serif` for cover or section-divider display headings.
- Small radii, light borders, restrained shadows.
- No full-page dark navy skin, oversized rounded cards, heavy shadows, or emoji iconography.

## Semantic colors

Use the compiler variables by meaning:

| Token | Use |
|---|---|
| `--accent` / `--accent-soft` | Primary emphasis, ownership, active stages |
| `--amber` / `--amber-soft` | Gaps, risk, pending decisions |
| `--teal` / `--teal-soft` | Covered, healthy, complete states |
| `--coral` / `--coral-soft` | Blocks, vacuums, incorrect states |
| `--highlight` | One short highlighted phrase per slide |

## Slide chrome

Every slide uses `.slide` and contains:

- `.slide-tag` for a short category label.
- `.slide-num` for `NN / TOTAL`.
- `.slide-inner` for the bounded content area.
- optional `data-rail-title` for the navigation label.

Use `.cover`, `.section-divider`, or `.alt` only when their semantic role fits.

## Components

- `.meta-row` with `.k` and `.v` for cover metadata.
- `.card-grid.cols-2` or `.card-grid.cols-3` with `.card`.
- `.soft-accent`, `.soft-amber`, `.soft-teal`, `.soft-coral` for semantic card surfaces.
- `.matrix` with `.own`, `.part`, and `.none` cells for responsibility or comparison tables.
- `.stage-row` with `.stage`, `.active`, `.gap`, and `.ok` for processes.
- `.checklist` for standards or acceptance criteria.
- `.callout`, `.warn`, and `.risk` for bounded explanatory notes.
- `.mono`, `.serif`, `.lead`, and `.highlight` for typography.

Add topic-specific layout to `src/style.css`; reuse this vocabulary before inventing new component classes.

## Responsive and exhibit behavior

The compiler provides:

- desktop scroll snapping;
- mobile flow layout and bottom navigation;
- horizontally scrollable wide tables;
- keyboard navigation;
- fullscreen;
- autoplay and progress;
- reduced-motion handling;
- the shared deck rail.

Do not recreate or override these mechanics in `src/style.css`.
