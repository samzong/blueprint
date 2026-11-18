# Chart authoring and numeric palette screening

Use this reference whenever a Blueprint Artifact contains charts. It supplies an authoring method and copyable defaults, not a Preset, Theme, component library, or injected stylesheet. Within Blueprint Artifacts, follow this method even when the host agent has another chart skill. For dossier charts, entity series must retain the dossier's teal/orange/blue/purple slots from [design system](design-system.md), not this reference's categorical palette. Repeat a second identity encoding on every series and its label. Run the palette check against the actual surface and save its FAIL JSON; these slots do not pass the pair-separation policy. Keep the failed result visible in acceptance evidence and verify the non-color compensation in preview; do not change dossier slot colors or claim palette PASS.

## Choose the form before the colors

Start with the reader's question, units, denominator, comparison scope, and source. Use bars or dots for category comparisons, lines for ordered time, scatterplots for relationships, and a table for exact lookup. Show uncertainty and missing values explicitly. Start magnitude bars at zero; disclose a restricted line/scatter domain. Avoid 3D, dual axes that imply a false relationship, decorative gradients, and area encodings for precise comparison. Limit series to what the reader can trace; small multiples are often simpler than a crowded plot.

For quantity comparisons, use bars/dots on a shared numeric scale, or absolute stacked bars with comparable total lengths. For share comparisons, use 100% stacked bars on a shared 0–100% scale and label each denominator/total; equal-width bars cannot compare totals.

| Reader task | Default form | Keep visible |
|---|---|---|
| Quantity changing over time | Line, or small-multiple lines with a shared y-domain; not one horizontal bar per date | Numeric ticks and first/last dates |
| Compare entity quantities | Bars/dots with a shared zero and domain | Direct names and counts |
| Compare status composition | Stacked bars with segment counts; use 100% only for a share question | Status words, segment counts, and totals/denominators |
| Compare ranked bands | Bars with sequential color stops in rank order | Rank labels and exact values |
| Compare deviation from a meaningful target | Zero-centered diverging bars | Signed values and target |
| Summarize one number | A value card next to a distribution or comparison chart | Scope and comparison context; a number alone cannot show distribution |

Small multiples of the same metric must share the y-domain and tick values, with visible numeric ticks. Compute the domain once for the comparison scope, not once per panel. Independent scales are allowed only when each panel visibly states its domain and the view warns that heights are not comparable.

Choose the encoding task independently of the form:

| Task | Color behavior | Required companion |
|---|---|---|
| Identity | Categorical, stable per data key in the comparison scope | Direct name plus repeated marker shape, line dash, pattern, or another persistent identity code |
| Ordered/value | Sequential lightness with a stated direction and domain | Numeric ticks, units, and exact values in the alternative |
| Diverging | Two arms around a meaningful, labeled center | Signed values and a labeled neutral; do not invent a midpoint for unsigned data |
| Status | Explicit semantic mapping, independent of series identity | Status word or icon with an accessible name |

Priority, severity, and ordered bands are ordered categories, not identities: use sequential lightness, never categorical slots. For P1 (highest) through P4 (lowest), map P4 → P3 → P2 → P1 to sequential-1 → sequential-2 → sequential-3 → sequential-4, state the increasing-emphasis direction, and retain visible P labels. Keep that mapping fixed after filtering.

Create the identity map from stable keys before filtering or sorting. Never assign `colors[visibleIndex]`. Removing any intermediate series must leave surviving keys' colors and companion encodings unchanged. Do not recycle a slot within the comparison scope. End-point labels rendered in series color still need a second identity encoding, repeated on the line and label; colored text alone is not enough. Put labels in the high-contrast text color when series colors fail text contrast.

## Copyable baseline

These original opaque sRGB tokens are screened only against `#ffffff` (light) and `#111827` (dark) chart surfaces, not arbitrary card or track backgrounds. Keep the actual plot/track surface at the stated color, or rescreen and adjust the palette for its actual surface. For example, on `#f8f8f5`, light warning `#bd8c3a` falls to 2.829:1 and categorical amber `#bf8832` to 2.910:1; both FAIL the 3:1 mark policy. The light sequential pale stop `#7692b0` also requires rescreening on another surface. Copy only the needed declarations into author-owned CSS. The supplied categorical identity set has **N = 5** slots in each mode; all 10 pairs pass the numeric policy below in normal vision and all three simulated conditions. This is a screening result, not a universal perceptual safety guarantee or a maximum achievable palette size. Always use non-color identity encoding. Above five simultaneous identities, require direct labels plus a repeated second encoding, or use small multiples; cycling these five colors must not be the only way to identify a series.

```css
:root {
  --chart-surface: #ffffff;
  --chart-text: #202020;
  --chart-grid: #707070;
  --chart-category-1: #255387;
  --chart-category-2: #bf8832;
  --chart-category-3: #248164;
  --chart-category-4: #9572b1;
  --chart-category-5: #682122;
  --chart-sequential-1: #7692b0;
  --chart-sequential-2: #597491;
  --chart-sequential-3: #3d5873;
  --chart-sequential-4: #233c56;
  --chart-sequential-5: #0a233b;
  --chart-diverging-low: #062d59;
  --chart-diverging-low-mid: #2e5483;
  --chart-diverging-neutral: #8c8c8c;
  --chart-diverging-high-mid: #926331;
  --chart-diverging-high: #583305;
  --chart-status-info: #234f84;
  --chart-status-warning: #bd8c3a;
  --chart-status-danger: #681f1f;
  --chart-status-success: #407c51;
  --chart-line-width: 3px;
  --chart-marker-size: 8px;
  --chart-label-size: 14px;
  --chart-grid-width: 1px;
  --chart-focus-width: 3px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --chart-surface: #111827;
    --chart-text: #e0e0e0;
    --chart-grid: #707070;
    --chart-category-1: #7cabe6;
    --chart-category-2: #eabb79;
    --chart-category-3: #9cf4ce;
    --chart-category-4: #9975b3;
    --chart-category-5: #cf7f79;
    --chart-sequential-1: #5f7a97;
    --chart-sequential-2: #7995b3;
    --chart-sequential-3: #94b1d0;
    --chart-sequential-4: #b0ceee;
    --chart-sequential-5: #d7eaff;
    --chart-diverging-low: #d8e8fe;
    --chart-diverging-low-mid: #9cc4fb;
    --chart-diverging-neutral: #797979;
    --chart-diverging-high-mid: #ca9462;
    --chart-diverging-high: #fed1a5;
    --chart-status-info: #74a2df;
    --chart-status-warning: #fec15e;
    --chart-status-danger: #b86760;
    --chart-status-success: #a9dcb7;
  }
}
```

Identity slots retain their blue, amber, teal, purple, and brick-red hue families across modes; only lightness/chroma change. Their moderate chroma is coordinated rather than maximized. Keep the same data-key-to-slot map when switching modes. Status uses conventional blue information, amber warning, red danger, and green success, always accompanied by visible status words. **Do not mix these status and identity palettes in the same plot**: a color must not simultaneously identify an entity and a state. Use a separate status panel or text/icon column instead. Sequential tokens run low to high in the stated order; light mode becomes darker, dark mode becomes lighter. The five sequential stops use one blue hue family. The five diverging stops run low → low-mid → neutral → high-mid → high, with blue and amber arms and an achromatic midpoint; they are independent of categorical slots. Label that direction. Use these stops as discrete bins; interpolated gradients need rendered verification and additional samples. A palette that passes at these stops does not certify every interpolation, opacity, overlap, or adjacent fill.

Use at least 3 CSS px lines, 8 CSS px markers, 14 CSS px labels, a visible focus ring, and comfortable native control targets. These are defaults, not mathematical guarantees: inspect actual stroke weight, labels, spacing, density, crossings, and focus against the rendered surface. Arrange related views side by side around the reader's comparison task on desktop, aligning entity labels and comparable scales; stack them in that same comparison order on narrow screens. Grid lines are subordinate; remove them when ticks/direct values already communicate the scale. Do not use translucent marks without checking the final composited colors. Outline touching fills when their mutual contrast is insufficient; checking each fill against the chart surface does not check fill-to-fill boundaries.

## Copyable dashboard layout

If the Artifact already uses a host surface system such as [HTML workbench](html-workbench.md), keep the outer shell, filter chrome, and card borders from that host system (`--bg`, `--surface-subtle`, `--line`). Keep `background: var(--chart-surface)` on each `.bar-track`, `.bar-well`, and plot canvas so marks keep their screened contrast, and use `var(--chart-grid)` only for plot gridlines and axis ticks.

If no host surface system applies, copy the standalone fallback shell below after the baseline tokens. Replace the example questions and data, and keep each related pair in comparison order in the DOM (`2` columns on desktop, stacked on `375px`). Keep native controls mounted and wire them to one data transformation. Each card contains a title, a reader question, a plot, direct labels or a legend, and a data-alternative entry. It is layout CSS, not a new Preset or reusable chart component.

```html
<main class="chart-dashboard">
  <fieldset class="chart-filters" aria-describedby="filter-scope">
    <legend>Regions</legend>
    <p id="filter-scope">Applies to both charts, the summary, and their data tables.</p>
    <div class="filter-options">
      <label><input type="checkbox" value="east" checked> East</label>
      <label><input type="checkbox" value="west" checked> West</label>
    </div>
  </fieldset>
  <div class="chart-summary" role="status">2 regions · 150 orders · current period</div>
  <div class="chart-grid">
    <section class="chart-card" aria-labelledby="quantity-title">
      <h2 id="quantity-title">Orders by region</h2>
      <p>Which region has more orders?</p>
      <div class="bar-list" role="list" aria-label="Orders; common domain 0 to 100">
        <div class="bar-row" role="listitem">
          <span class="bar-name">East</span>
          <div class="bar-track"><div class="quantity-fill" style="width:100%"></div></div>
          <strong>100</strong>
        </div>
        <div class="bar-row" role="listitem">
          <span class="bar-name">West</span>
          <div class="bar-track"><div class="quantity-fill" style="width:50%"></div></div>
          <strong>50</strong>
        </div>
      </div>
      <p>Common scale: 0–100 orders. Names and counts are direct labels.</p>
      <details><summary>Exact order data</summary>
        <table><caption>Current period · orders</caption><thead><tr><th scope="col">Region</th><th scope="col">Orders</th></tr></thead><tbody><tr><th scope="row">East</th><td>100</td></tr><tr><th scope="row">West</th><td>50</td></tr></tbody></table>
      </details>
    </section>
    <section class="chart-card" aria-labelledby="status-title">
      <h2 id="status-title">Order status</h2>
      <p>How are these 150 orders split by status?</p>
      <div class="status-stack" role="img" aria-label="Complete 90; at risk 60; total 150 orders">
        <span class="status-complete" style="width:60%"></span>
        <span class="status-risk" style="width:40%"></span>
      </div>
      <p>Complete: 90 · At risk: 60 · Total: 150 orders (left to right).</p>
      <details><summary>Exact status data</summary>
        <table><caption>Same regions and period · orders</caption><thead><tr><th scope="col">Status</th><th scope="col">Orders</th></tr></thead><tbody><tr><th scope="row">Complete</th><td>90</td></tr><tr><th scope="row">At risk</th><td>60</td></tr></tbody></table>
      </details>
    </section>
  </div>
</main>
```

```css
.chart-dashboard { max-width: 76rem; margin: auto; padding: 1rem; color: var(--chart-text); background: var(--chart-surface); }
.chart-dashboard, .chart-dashboard * { box-sizing: border-box; }
.chart-filters { min-width: 0; margin: 0; border: 1px solid var(--chart-grid); }
.filter-options, .chart-summary { display: flex; flex-wrap: wrap; gap: .75rem; }
.filter-options > *, .chart-summary > * { min-width: 0; max-width: 100%; }
.chart-filters label { display: inline-flex; align-items: center; gap: .5rem; min-height: 44px; overflow-wrap: anywhere; }
.chart-filters select { min-width: 0; max-width: 100%; font: inherit; }
.chart-summary { margin-block: 1rem; }
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
.chart-grid > *, .chart-card > * { min-width: 0; }
.chart-card { padding: 1rem; border: 1px solid var(--chart-grid); overflow-wrap: anywhere; }
.chart-card h2 { margin: 0; }
.chart-card svg { display: block; width: 100%; }
.bar-list { display: grid; grid-template-columns: max-content minmax(0, 1fr) auto; gap: .75rem; align-items: center; }
.bar-row { display: contents; }
.bar-name { overflow-wrap: anywhere; }
.bar-track, .status-stack { height: 24px; background: var(--chart-surface); }
.quantity-fill { height: 100%; background: var(--chart-sequential-3); }
.status-stack { display: flex; }
.status-stack > * { border: 1px solid var(--chart-text); }
.status-complete { background: var(--chart-status-success); }
.status-risk { background: var(--chart-status-warning); }
.chart-card details { margin-top: 1rem; }
.chart-dashboard :focus-visible { outline: 3px solid var(--chart-text); outline-offset: 3px; }
@media (max-width: 48rem) {
  .chart-grid { grid-template-columns: minmax(0, 1fr); }
  .bar-list { display: grid; grid-template-columns: minmax(0, 1fr); }
  .bar-row { display: grid; grid-template-columns: minmax(0, 1fr) var(--chart-value-width, 6ch); gap: .5rem; align-items: center; }
  .bar-name { grid-column: 1 / -1; }
}
```

The shared desktop `bar-list` columns reserve the longest name once; every track has the same width. At narrow widths the name moves above its track, never into it. If measured names leave too little plotting room even on desktop, apply that stacked row layout sooner. Keep exact values in a consistent-width column; increase `--chart-value-width` for the widest formatted value, using the same width for every row. Wide alternatives belong in their own labeled scroll container, not in a wider page.

## Bind colors, not resolved hex values

All chart colors must use `var(--chart-*)` in CSS or SVG fill/stroke, or `currentColor` inherited from such a binding. JS may assign stable slot classes or variable names and numeric geometry; it must not resolve a token to a hex and write an inline color. Mode changes must work without redrawing marks.

```css
.series-1 { color: var(--chart-category-1); }
.series-2 { color: var(--chart-category-2); }
.series-3 { color: var(--chart-category-3); }
.series-4 { color: var(--chart-category-4); }
.series-5 { color: var(--chart-category-5); }
.priority-1 { fill: var(--chart-sequential-4); }
.priority-2 { fill: var(--chart-sequential-3); }
.priority-3 { fill: var(--chart-sequential-2); }
.priority-4 { fill: var(--chart-sequential-1); }
```

For example, `<g class="series-1"><path stroke="currentColor" fill="none" d="..."/><text fill="var(--chart-text)">A · Name</text></g>` preserves slot 1 across modes. Pair the class with the existing non-color identity encoding. For an explicit theme toggle, override the same tokens under a root theme selector; do not keep a second JS palette.

Run palette screening and complete the chart acceptance steps in [chart verification](chart-verification.md) before delivery.
