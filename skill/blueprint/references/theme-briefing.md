# Theme: briefing

Use the only supported briefing skin: neutral full-screen slides, subtle grid, explicit page labels, small radii, light borders, and restrained shadows. Let the compiler own its CSS, responsive behavior, and runtime.

## Visual language

- Inter and Noto Sans SC for body text
- JetBrains Mono for labels, dates, codes, and page numbers
- optional Noto Serif SC through `.serif` for cover or divider headings
- no dark full-page skin, oversized rounded cards, heavy shadows, or emoji icons

## Semantic colors

| Token | Meaning |
|---|---|
| `--accent` / `--accent-soft` | emphasis, ownership, active |
| `--amber` / `--amber-soft` | gap, risk, pending |
| `--teal` / `--teal-soft` | covered, healthy, complete |
| `--coral` / `--coral-soft` | blocked, missing, incorrect |
| `--highlight` | one short phrase per slide |

## Slide contract

Every slide contains `.slide-tag`, `.slide-num`, and `.slide-inner`; `data-rail-title` supplies its navigation label. Use `.cover`, `.section-divider`, and `.alt` only for their semantic roles.

Reuse these components before inventing new ones:

- `.meta-row` with `.k` and `.v`
- `.card-grid`, `.cols-2`, `.cols-3`, and `.card`
- `.soft-accent`, `.soft-amber`, `.soft-teal`, and `.soft-coral`
- `.matrix` with `.own`, `.part`, and `.none`
- `.stage-row` with `.stage`, `.active`, `.gap`, and `.ok`
- `.checklist`, `.callout`, `.warn`, and `.risk`
- `.mono`, `.serif`, `.lead`, and `.highlight`

`src/style.css` is only for topic-specific layout. Do not recreate desktop snapping, mobile flow, table overflow, keyboard navigation, fullscreen, autoplay, progress, reduced-motion handling, or the deck rail.
