# HTML workbench baseline

Use this baseline as the default visual direction for `html` Artifacts. Follow this guide when the user gives no other style, brand system, or layout reference. If the user asks for another visual look or brand palette, follow the user request instead.

Combe and Spale set the visual craft for this baseline. Use quiet light and dark neutral gray surfaces, subtle elevation steps, and `1px` borders. Limit accent color to one or two semantic roles for focus, selection, or live state. The CLI injects no CSS, chrome, or JavaScript framework for `html`. Author the complete HTML, CSS, and optional JavaScript inside the Artifact directory.

## Let layout follow content

Keep the neutral surface tokens, font discipline, and three-mode `[data-theme-mode]` switch across default `html` Artifacts. Design the spatial layout around the subject instead of forcing every topic into one template. Match page chrome to the complexity of the content:

- Choose a form that fits the task, such as a reader, canvas, simulator, calculator, matrix, or workbench.
- Omit `.view-tabs`, `.quota-strip`, and `.master-detail` when a direct layout communicates the content with less chrome.
- Make every visible text element carry data, state, units, or a conclusion.
- Express hierarchy, grouping, and operation through spacing, alignment, and control state.
- If a section needs helper copy to explain page controls, redesign the layout instead.
- If a topic spans 3 to 5 distinct views, load [HTML workbench multi-tab shell](html-workbench-tabs.md).

## Light and dark palette tokens

Keep surfaces neutral so data marks and interactive selection carry focus. The five text tokens (`--fg`, `--text-soft`, `--muted`, `--attention`, `--live`) pass text contrast against every workbench surface token in both modes.

Set `--chart-surface` to `#ffffff` in light mode and `#161719` in dark mode. Chart marks from [chart method](chart-method.md) then keep screened contrast inside `.bar-well` tracks and `.plot-card` panels.

```css
:root, [data-theme="light"] {
  color-scheme: light;
  --font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Helvetica Neue", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --page: #e7e8eb;
  --bg: #f5f5f7;
  --surface-subtle: #eceef1;
  --surface-selected: #e8eaee;
  --surface-elevated: #ffffff;
  --fg: #24292f;
  --text-soft: #4e535a;
  --muted: #5c6068;
  --attention: #0558b8;
  --live: #186833;
  --line: #dfe2e6;
  --line-strong: #c4c9d0;
  --window-shadow: 0 16px 40px rgb(16 18 22 / 0.08), 0 2px 8px rgb(16 18 22 / 0.04);
  --tab-shadow: 0 1px 3px rgb(16 18 22 / 0.08);
  --chart-surface: #ffffff;
  --chart-text: #202020;
  --chart-grid: #707070;
}

[data-theme="dark"] {
  color-scheme: dark;
  --page: #242527;
  --bg: #161719;
  --surface-subtle: #1d1f23;
  --surface-selected: #23252a;
  --surface-elevated: #282a30;
  --fg: #f1f1f2;
  --text-soft: #c3c4c7;
  --muted: #9c9ea3;
  --attention: #58a6ff;
  --live: #65c888;
  --line: #2a2c31;
  --line-strong: #3c3f46;
  --window-shadow: 0 20px 44px rgb(0 0 0 / 0.36), 0 4px 12px rgb(0 0 0 / 0.2);
  --tab-shadow: 0 1px 3px rgb(0 0 0 / 0.28);
  --chart-surface: #161719;
  --chart-text: #e0e0e0;
  --chart-grid: #707070;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --page: #242527;
    --bg: #161719;
    --surface-subtle: #1d1f23;
    --surface-selected: #23252a;
    --surface-elevated: #282a30;
    --fg: #f1f1f2;
    --text-soft: #c3c4c7;
    --muted: #9c9ea3;
    --attention: #58a6ff;
    --live: #65c888;
    --line: #2a2c31;
    --line-strong: #3c3f46;
    --window-shadow: 0 20px 44px rgb(0 0 0 / 0.36), 0 4px 12px rgb(0 0 0 / 0.2);
    --tab-shadow: 0 1px 3px rgb(0 0 0 / 0.28);
    --chart-surface: #161719;
    --chart-text: #e0e0e0;
    --chart-grid: #707070;
  }
}
```

If you combine [chart method](chart-method.md) tokens with a manual theme toggle, place the light `--chart-*` values inside `:root, [data-theme="light"]`. Place the dark `--chart-*` series, sequential, diverging, and status values inside `[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. Keep `--chart-surface` at `#161719` in dark mode. Delete standalone `:root` chart blocks so OS dark rules do not override Light mode. Keep manual theme selection synchronized with OS color-scheme changes.

## Base typography and theme switch

Use `--font-sans` for natural-language prose and UI labels. Use `--font-mono` with `font-variant-numeric: tabular-nums` for code, paths, identifiers, and aligned counts across HTML and SVG. Keep each page within three or four font-size steps so visual hierarchy stays clear. For compact tools and workbenches, set `body` between `12px` and `13.5px` with `line-height` from `1.5` to `1.55`. Set `h1` and `h2` to `15px` or `16px` at `font-weight: 600`. Reading-focused pages can use a `14px` to `15px` body within four font-size steps.

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; background-color: var(--page); }
body {
  margin: 0;
  background-color: var(--page);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 13.5px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--attention); outline-offset: 2px; }
[hidden] { display: none !important; }
details:not([open]) > *:not(summary) { display: none; }
code, pre, kbd, .code-token { font-family: var(--font-mono); font-size: 0.88em; }
.num, td.num, th.num { font-variant-numeric: tabular-nums; }
code {
  display: inline-block;
  background-color: var(--surface-subtle);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 0.08em 0.38em;
  overflow-wrap: anywhere;
}
kbd {
  display: inline-block;
  color: var(--text-soft);
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 1.45;
}
.page-shell {
  max-width: 82rem;
  margin: 0 auto;
  padding: 20px 24px 36px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.top-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
  padding: 0 2px;
}
.note-brand { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; min-width: 0; }
h1 { margin: 0; font-size: 15px; line-height: 1.3; font-weight: 600; color: var(--fg); }
h2 { margin: 0 0 3px; font-size: 15px; line-height: 1.35; font-weight: 600; color: var(--fg); }
h3 { margin: 0 0 10px; font-size: 13px; line-height: 1.4; font-weight: 600; color: var(--fg); }
.note-sub { margin: 0; font-size: 12px; line-height: 1.45; color: var(--muted); }
.preview-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.pill-track {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  border-radius: 14px;
  max-width: 100%;
}
.pill-seg, .pill-btn {
  appearance: none;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 500;
  color: var(--muted);
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 4px 10px;
  min-height: 24px;
  cursor: pointer;
  white-space: nowrap;
}
.pill-btn { background-color: var(--bg); border-color: var(--line); border-radius: 14px; min-height: 28px; }
.pill-seg:hover, .pill-btn:hover { color: var(--fg); background-color: var(--surface-selected); border-color: var(--line-strong); }
.pill-seg[aria-pressed="true"],
.pill-seg[aria-selected="true"] {
  background-color: var(--surface-elevated);
  color: var(--fg);
  border-color: var(--line-strong);
  box-shadow: var(--tab-shadow);
  font-weight: 600;
}
.pill-btn[aria-pressed="true"] {
  background-color: var(--surface-elevated);
  color: var(--attention);
  border-color: var(--attention);
  font-weight: 600;
}
.bar-well {
  width: 100%;
  height: 9px;
  background-color: var(--chart-surface);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
}
.plot-card {
  background-color: var(--chart-surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.table-region { overflow-x: auto; max-width: 100%; border: 1px solid var(--line); border-radius: 10px; background-color: var(--bg); }
.table-region table { width: 100%; min-width: max-content; border-collapse: collapse; font-size: 12px; color: var(--fg); }
.table-region th, .table-region td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
.table-region thead th { background-color: var(--surface-subtle); font-weight: 600; border-bottom: 1px solid var(--line-strong); }
.footnote {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 16px;
  padding: 0 2px;
  font-size: 11.5px;
  color: var(--muted);
}
@media (max-width: 48rem) {
  .page-shell { padding: 12px 12px 28px; }
}
```

Wire the three-mode `[data-theme-mode]` switch on every default `html` Artifact. When the user selects `"light"` or `"dark"`, set `document.documentElement.dataset.theme` to that mode. When the user selects `"system"`, delete `dataset.theme` so `@media (prefers-color-scheme: dark)` applies:

```html
<div class="pill-track" role="group" aria-label="Theme mode">
  <button type="button" class="pill-seg" data-theme-mode="system" aria-pressed="true">System</button>
  <button type="button" class="pill-seg" data-theme-mode="light" aria-pressed="false">Light</button>
  <button type="button" class="pill-seg" data-theme-mode="dark" aria-pressed="false">Dark</button>
</div>
```

```js
document.querySelectorAll("[data-theme-mode]").forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.themeMode;
    document.querySelectorAll("[data-theme-mode]").forEach(item => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    if (mode === "light" || mode === "dark") {
      document.documentElement.dataset.theme = mode;
    } else {
      delete document.documentElement.dataset.theme;
    }
  });
});
```

## Inline SVG diagrams

Use inline `<svg>` for topology, hierarchy, and flow relationships instead of nested prose cards. Keep SVG text at the same rendered size and font family as surrounding HTML elements. Apply these base classes to align SVG containers, strokes, and labels across desktop and narrow viewports:

```css
.svg-wrap { width: 100%; overflow: hidden; }
.svg-wrap svg { display: block; width: 100%; height: auto; font-family: var(--font-sans); }
.svg-wrap svg text { font-family: var(--font-sans); }
.svg-mobile { display: none !important; max-width: 340px; margin: 0 auto; }
.svg-box { fill: var(--chart-surface); stroke: var(--chart-grid); stroke-width: 1.5px; }
.svg-title { fill: var(--chart-text); font-size: 13px; font-weight: 600; }
.svg-sub { fill: var(--muted); font-size: 12px; }
.svg-tag { fill: var(--attention); font-size: 11.5px; font-weight: 600; }
.svg-mono { font-family: var(--font-mono); font-size: 11.5px; }
@media (max-width: 52rem) {
  .svg-desktop { display: none !important; }
  .svg-mobile { display: block !important; }
}
```

1. Match each desktop `<svg>` `viewBox` width and `max-width` to its container width so `getScreenCTM()` scale stays near `1.0`.
2. If a horizontal diagram drops below `0.9` scale at `375px`, switch to a vertical `.svg-mobile` diagram.
3. Assign unique `id` values to `<defs>` markers and clip paths inside each `<svg>`.
4. Bind SVG fills and strokes to CSS custom properties. Use `var(--chart-grid)` instead of `var(--line-strong)` for structural strokes.
5. Route connectors orthogonally around nodes. Place `fill="var(--chart-surface)"` masks behind connector labels so lines do not cross text.

## Guardrails for charts and rendered acceptance

Apply these rules whenever the page hosts charts or interactive lists so rendered acceptance passes on the first run:

1. Style outer shells, filter strips, and cards with `--bg`, `--surface-subtle`, and `1px solid var(--line)`. Never outline outer cards with `1px solid var(--chart-grid)`.
2. Set `background: var(--chart-surface)` on `.bar-well`, `.bar-track`, and `.plot-card`. Reserve `var(--chart-grid)` for plot gridlines, axis ticks, and structural SVG borders.
3. Do not use `border-left: 3px solid ...` on a pinned card that contains bars. An asymmetric border changes inner track widths across rows. Use `box-shadow: inset 3px 0 0 var(--attention)` instead.
4. Set `display: inline-block` on inline badges and `code`. Keep `details:not([open]) > *:not(summary) { display: none; }` so closed Chromium disclosure elements report zero layout rectangles during [rendered acceptance](rendered-acceptance.md).
5. If no local icon asset exists, keep `<link rel="icon" href="data:,">` in `<head>` to prevent preview 404 requests.
