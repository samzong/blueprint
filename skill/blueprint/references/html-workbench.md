# HTML workbench baseline

Use this baseline as the default visual direction for `html` Artifacts. Follow this guide when the user gives no other style, brand system, or layout reference. If the user asks for another visual look or brand palette, follow the user request instead.

The CLI injects no CSS, chrome, or JavaScript framework for `html`. You author the complete HTML, CSS, and optional JavaScript inside the Artifact directory.

## Choose the shell size

Match the chrome density to the scope of the Artifact.

- Multi-tab workbench: Use `.top-note`, `.stage-window`, `.window-chrome`, `.view-tabs`, `.quota-strip`, and optional `.master-detail` split views for dashboards, analytics tools, and reference consoles with several views.
- Single-panel window: Omit `.view-tabs` and `.master-detail` when one focused view answers the prompt. Keep `.page-shell`, `.top-note`, `.stage-window`, and `.pane-head`.
- Full-scroll toggle: Add `#layout-toggle` in `.preview-tools` only when the user benefits from viewing all tab panels at once (`body[data-layout="full"] .view-panel[hidden] { display: block !important; }`).

## Light and dark palette tokens

Keep surfaces neutral so data marks and interactive selection carry focus. The five text tokens (`--fg`, `--text-soft`, `--muted`, `--attention`, `--live`) pass text contrast against every workbench surface token in both modes.

Set `--chart-surface` to `#ffffff` in light mode and `#161719` in dark mode. Chart marks from [chart method](chart-method.md) then keep screened contrast inside `.bar-well` tracks and `.plot-card` panels.

```css
:root, [data-theme="light"] {
  color-scheme: light;
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

If you combine [chart method](chart-method.md) tokens with a manual theme toggle, place the light `--chart-*` values inside `:root, [data-theme="light"]`. Place the dark `--chart-*` series, sequential, diverging, and status values inside `[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. Keep `--chart-surface` at `#161719` in dark mode. Delete any standalone `:root` or `@media (prefers-color-scheme: dark) { :root }` chart blocks so OS dark rules cannot override Light mode. Keep manual theme toggling in sync with OS changes.

## Workbench layout and typography

Keep body copy compact at `13.5px` (`line-height: 1.55`) with system sans fonts and `font-variant-numeric: tabular-nums` on numbers, ranks, and counts. Add these base styles and component classes after the tokens above.

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; background-color: var(--page); }
body {
  margin: 0;
  background-color: var(--page);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
  font-size: 13.5px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--attention); outline-offset: 2px; }
[hidden] { display: none !important; }
details:not([open]) > *:not(summary) { display: none; }
code, pre, kbd, .code-token { font-family: Menlo, Consolas, "Courier New", Courier, monospace; font-size: 0.88em; }
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
.note-sub, .view-lead { margin: 0; font-size: 12px; line-height: 1.45; color: var(--muted); }
.preview-tools, .view-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
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
.stage-window {
  background-color: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--window-shadow);
  overflow: hidden;
  min-width: 0;
}
.window-chrome, .pane-head, .workbench-controls {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
}
.workbench-controls { flex-direction: column; align-items: stretch; gap: 10px; }
.vtab {
  appearance: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background-color: var(--surface-subtle);
  border: 1px solid transparent;
  border-radius: 17px;
  height: 34px;
  padding: 0 10px 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.vtab:hover { color: var(--fg); background-color: var(--surface-selected); }
.vtab[aria-selected="true"] {
  background-color: var(--surface-elevated);
  color: var(--fg);
  border-color: var(--line-strong);
  box-shadow: var(--tab-shadow);
  font-weight: 600;
}
.key-badge {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background-color: var(--surface-selected);
  color: var(--muted);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.vtab[aria-selected="true"] .key-badge { background-color: var(--surface-subtle); color: var(--fg); }
.quota-strip {
  min-height: 28px;
  border-radius: 14px;
  padding: 4px 12px;
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.quota-item b { color: var(--fg); font-weight: 600; }
.master-detail {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(24rem, 1fr);
  align-items: stretch;
}
.master-detail > * { min-width: 0; }
.list-pane { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.readout-pane {
  border-left: 1px solid var(--line);
  padding: 16px 18px;
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cap-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.cap-cell {
  padding: 8px 11px;
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  border-radius: 10px;
  min-width: 0;
}
.cap-cell.is-highlighted { background-color: var(--surface-elevated); border-color: var(--attention); box-shadow: var(--tab-shadow); }
.token-box { padding: 8px 12px; background-color: var(--surface-subtle); border-left: 2px solid var(--attention); }
.card-btn {
  width: 100%;
  appearance: none;
  font-family: inherit;
  text-align: left;
  background-color: var(--surface-subtle);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-btn:hover { border-color: var(--line-strong); background-color: var(--surface-selected); }
.card-btn[aria-pressed="true"] { background-color: var(--surface-elevated); border-color: var(--attention); box-shadow: var(--tab-shadow); }
.card-btn.is-pinned { box-shadow: inset 3px 0 0 var(--attention); }
.card-btn.is-pinned[aria-pressed="true"] { box-shadow: inset 3px 0 0 var(--attention), var(--tab-shadow); }
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
@media (max-width: 64rem) {
  .master-detail { grid-template-columns: minmax(0, 1fr); }
  .readout-pane { border-left: none; border-top: 1px solid var(--line); position: static; }
  .cap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 48rem) {
  .page-shell { padding: 12px 12px 28px; }
  .stage-window { border-radius: 14px; }
  .cap-grid { grid-template-columns: minmax(0, 1fr); }
}
```

Structure each workbench page with `.page-shell`, `.top-note`, `.stage-window`, and `.footnote`:

```html
<div class="page-shell">
  <header class="top-note">
    <div class="note-brand">
      <h1>Page title</h1>
      <p class="note-sub">Short scope summary</p>
    </div>
    <div class="preview-tools">
      <div class="pill-track" role="group" aria-label="Theme mode">
        <button type="button" class="pill-seg" data-theme-mode="system" aria-pressed="true">System</button>
        <button type="button" class="pill-seg" data-theme-mode="light" aria-pressed="false">Light</button>
        <button type="button" class="pill-seg" data-theme-mode="dark" aria-pressed="false">Dark</button>
      </div>
    </div>
  </header>
  <div class="stage-window">
    <div class="window-chrome">
      <div class="view-tabs" role="tablist" aria-label="Workspace views">
        <button type="button" class="vtab" role="tab" aria-selected="true"><span>Overview</span><span class="key-badge" aria-hidden="true">1</span></button>
      </div>
      <div class="quota-strip" role="region" aria-label="Key figures">
        <span class="quota-item">Items <b>24</b></span>
      </div>
    </div>
    <main>
      <section class="view-panel" role="tabpanel">
        <div class="pane-head">
          <h2>Overview</h2>
          <p class="view-lead">Primary metric comparison and detail readout.</p>
        </div>
        <div class="master-detail">
          <div class="list-pane"></div>
          <aside class="readout-pane" aria-live="polite"></aside>
        </div>
      </section>
    </main>
  </div>
  <footer class="footnote">
    <span>Data scope note</span>
    <span>Switch tabs with <kbd>1</kbd> <kbd>2</kbd></span>
  </footer>
</div>
```

When the user selects `"light"` or `"dark"`, set `document.documentElement.dataset.theme` to that mode. When the user selects `"system"`, delete `dataset.theme` so `@media (prefers-color-scheme: dark)` applies.

## Guardrails for charts and rendered acceptance

Apply these rules whenever the workbench hosts charts or interactive lists so rendered acceptance passes on the first run.

1. Keep outer shells, filter strips, and cards styled with `--bg`, `--surface-subtle`, and `1px solid var(--line)`. Never outline outer cards with `1px solid var(--chart-grid)`.
2. Keep `background: var(--chart-surface)` on `.bar-well`, `.bar-track`, and `.plot-card`. Reserve `var(--chart-grid)` for plot gridlines and axis ticks.
3. Do not use `border-left: 3px solid ...` on a pinned card that contains bars. An asymmetric border changes inner track widths across rows. Use `box-shadow: inset 3px 0 0 var(--attention)` instead.
4. Set `display: inline-block` on inline badges and `code`. Add `details:not([open]) > *:not(summary) { display: none; }` so closed Chromium disclosure elements report zero layout rectangles during [rendered acceptance](rendered-acceptance.md).
5. Add `<link rel="icon" href="data:,">` in `<head>` when no local icon asset exists so local previews produce zero 404 requests.
