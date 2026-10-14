# Chart authoring and numeric palette screening

Use this reference whenever a Blueprint Artifact contains charts. It supplies an authoring method and copyable defaults, not a Preset, Theme, component library, or injected stylesheet. Within Blueprint Artifacts, follow this method even when the host agent has another chart skill. For dossier charts, entity series must retain the dossier's teal/orange/blue/purple slots from [design system](design-system.md), not this reference's categorical palette. Repeat a second identity encoding on every series and its label. Run the palette check against the actual surface and save its FAIL JSON; these slots do not pass the pair-separation policy. Keep the failed result visible in acceptance evidence and verify the non-color compensation in preview; do not change dossier slot colors or claim palette PASS.

## Choose the form before the colors

Start with the reader's question, units, denominator, comparison scope, and source. Use bars or dots for category comparisons, lines for ordered time, scatterplots for relationships, and a table for exact lookup. Show uncertainty and missing values explicitly. Start magnitude bars at zero; disclose a restricted line/scatter domain. Avoid 3D, dual axes that imply a false relationship, decorative gradients, and area encodings for precise comparison. Limit series to what the reader can trace; small multiples are often simpler than a crowded plot.

For quantity comparisons, use bars/dots on a shared numeric scale, or absolute stacked bars with comparable total lengths. For share comparisons, use 100% stacked bars on a shared 0–100% scale and label each denominator/total; equal-width bars cannot compare totals.

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

## Run the numeric check

```sh
blueprint palette check '#255387,#bf8832,#248164,#9572b1,#682122' --mode light --surface '#ffffff'
blueprint palette check '#7cabe6,#eabb79,#9cf4ce,#9975b3,#cf7f79' --mode dark --surface '#111827' --json
blueprint palette check '#7692b0,#597491,#3d5873,#233c56,#0a233b' --mode light --surface '#ffffff' --kind sequential
blueprint palette check '#062d59,#2e5483,#8c8c8c,#926331,#583305' --mode light --surface '#ffffff' --kind diverging
blueprint palette check '#202020' --mode light --surface '#ffffff' --kind text
```

Always pass `--surface '#hex'` using the actual opaque background immediately behind the mark/text: this may be a card, plot, or bar track, not the page background. Resolve transparent ancestors and composited colors from the rendered view; check every distinct adjacent surface. Never assume white from light mode. `--mode` supplies a default only when `--surface` is omitted; it does not transform colors or discover the rendered surface. Check each mode actually supported. Categorical (default) and status check **every pair**, so arbitrary filtering cannot expose an unchecked combination. Sequential checks adjacent stops and monotonic lightness; diverging checks every pair and monotonic arms away from the center in the same lightness direction. All mark roles check at least 3:1 against the declared surface; `mark` checks 3:1 and no pair separation; `text` checks 4.5:1 and no pair separation. Check grid tokens with `--kind mark`; check any text use separately with `--kind text`. Do not call a text result a mark-separation result.

Policy v1 uses Euclidean OKLab distance ≥ 0.08 for pair separation, and absolute lightness steps ≥ 0.04 for ordered arms. These are deterministic heuristic project screening thresholds, **not WCAG requirements, a clinical cutoff, or experimentally established distinguishability guarantees**. OKLCH L and C are reported for inspection, not substituted for relative luminance in contrast calculations. The CVD screening applies the published Machado–Oliveira–Fernandes (2009) severity-1.0 matrices to linear sRGB, clips each simulated channel to [0,1], then computes OKLab distance. It checks one severe condition per deficiency, not every severity, device, observer, or visual context. The tritan branch approximates tritanomaly; it does not establish distinguishability for tritanopia. The model and policy appear in JSON output.

Any failed check or required compensation produces FAIL and exit 1; there is no override that turns a compensated failure into PASS. Change the palette/surface and rerun, or record the failed result and verify the specific boundary/non-color compensation in the Artifact. PASS means only that the requested numeric checks passed. `blueprint check` remains a document/Preset structural check and does not inspect charts or establish WCAG conformance.

## Author and verify the complete view

- Derive chart marks, labels, summaries, and the data/text alternative from the same transformed data and formatter. Include units, missing values, filters, uncertainty, and source/date. A static table showing unfiltered numbers is not equivalent to a filtered chart. Use semantic table headers/caption or a meaningful textual summary according to the reader's task; preserve exact lookup when needed.
- Use native keyboard-operable controls with accessible labels and visible focus. Keep controls mounted while filtering/redrawing and update their state in place. If replacement is unavoidable, restore focus to the same logical control before the next input; never let it fall to BODY. Pointer and keyboard must change the same state. State each global control's scope next to it; label any unaffected view locally (for example, "Annual totals; period selector does not apply"). Keep critical values and series identity visible without hover. If tooltips add useful detail, expose that detail on focus and in the alternative too; do not make every static mark a redundant tab stop.
- Keep chart ticks, legends, and data labels at least 14 actual CSS px after SVG/viewBox and CSS scaling; a declared 14px inside a shrinking SVG is insufficient. Reserve name-column width for the longest rendered label, with a gap before the plot and space for values. If it does not fit, put the name on its own line above the bar. Sparse date axes must retain both the first and last dates; remove interior ticks first. At 375px, preserve readable labels and reflow the page/controls. Use stacking or small multiples, not simply scaling desktop text down. A genuinely two-dimensional data table may scroll in a labeled, keyboard-reachable container; the page must not require horizontal scrolling.
- Reconcile same-entity totals across views before rendering: compare units, period, population, and filters, then sum each source. Do not invent agreement or silently normalize inconsistent input. If totals differ, label the affected views "Totals across these views are not comparable" and show their distinct scopes/totals. Resolve unexplained differences from the source before claiming the same scope.
- Run `blueprint check`, then `blueprint preview` and inspect the actual entrypoint. Verify light/dark only if the Artifact supports them; never claim a mode was checked when absent. Check contrast against computed surfaces, keyboard focus/order and controls, pointer behavior, all-hidden state, narrow screen, and CVD emulation. Filter out intermediate series and compare each surviving key's color and second identity encoding. Compare plotted/labelled values with the alternative. Inspect screenshots; numerical or structural success alone does not establish readability.

### Rendered acceptance steps

1. For small multiples, record each panel's domain and numeric ticks; they must match unless explicitly labeled independent. Check that a larger value plots higher than a smaller value at corresponding positions. For quantity bars, measure filled lengths from their shared zero, excluding unused track: their ratio must equal the value ratio (for example, 100 versus 50 requires 2:1, allowing at most 1 CSS px of rounding error per length). For share tasks verify each row sums to 100% and displays its denominator. Check every title/subtitle statement against the actual geometric encoding; an "absolute counts" claim must not accompany normalized equal-length bars.
2. Inspect P1–P4 (or other ranked bands): their fixed rank-to-stop map must use sequential lightness in the stated direction. Run `palette check --kind sequential` on the chosen stops and actual surface, then verify the order and labels after filtering and in CVD emulation.
3. Tab to a filter and press Space to deselect it. Confirm `document.activeElement` is still that control and its focus ring is visible; the next Tab must reach the next filter. Repeat after reselecting, with pointer input, and through the empty state. Verify locally labeled control exceptions remain unchanged.
4. At desktop and 375px, measure every SVG tick/legend/data label after transforms. For a text node `t`, set `ctm = t.getScreenCTM()`: horizontal scale is `Math.hypot(ctm.a, ctm.b)` and vertical scale is `Math.hypot(ctm.c, ctm.d)`. Multiply `parseFloat(getComputedStyle(t).fontSize)` by the smaller of these two scales for nonuniform transforms. Require at least 14 CSS px and inspect for clipping/overlap. Increase the label size, reflow, or move labels outside the SVG; do not shrink them to fit. Check that the longest name's bounding box does not enter the bar/plot, and that both endpoint dates remain visible at 375px.
5. Record each computed opaque mark/text background per supported mode and pass that exact hex as `--surface`. Require 3:1 marks and 4.5:1 normal text; check adjacent fills/boundaries separately. A PASS on white is invalid evidence for an off-white card. Save the actual-surface JSON and every failed or compensated result.
6. Sum each entity's count views under the same scope and compare with displayed totals/tables. Resolve discrepancies from the source, or verify the explicit non-comparability notice appears on every affected view. Recheck after filters.
7. Inspect one desktop screenshot and one 375px screenshot. Check the scan distance between related views, label/scale alignment, and empty space that carries no information. Reposition views or reduce unused space when it impedes comparison; preserve readable spacing.

Reject rainbow scales for ordered quantities, index-based recoloring after filters, red/green-only status, legends requiring color-only matching, colored end labels without a second identity code, hover-only critical facts, truncated units, stale alternatives, tiny mobile labels, and declarations of universal colorblind safety or WCAG compliance based on a palette command.

## Public sources

- [WCAG 2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/): 1.4.1 Use of Color (do not rely on color alone); 1.4.3 Contrast (Minimum) (4.5:1 normal text, 3:1 large text); 1.4.11 Non-text Contrast (3:1 required graphical objects/UI against adjacent colors); 2.1.1 Keyboard; 1.3.1 Info and Relationships; 1.4.10 Reflow (including its two-dimensional-layout exceptions). A full conformance claim requires more than these criteria.
- [CSS Color 4, OKLab/OKLCH and conversions](https://www.w3.org/TR/2022/CR-css-color-4-20220705/#ok-lab) and [Ottosson's original OKLab definition](https://bottosson.github.io/posts/oklab/): color-space mathematics and Euclidean distances. The project's distance thresholds are independently chosen policy.
- [Machado, Oliveira & Fernandes, A Physiologically-based Model for Simulation of Color Vision Deficiency, IEEE TVCG 15(6), 2009, DOI 10.1109/TVCG.2009.113](https://doi.org/10.1109/TVCG.2009.113); [author-published matrices](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html). This implementation uses the three severity-1.0 numerical tables, not third-party chart guidance. [Machado's thesis (2010)](https://www.inf.ufrgs.br/~oliveira/students_dissertations/Masters/Gustavo_Machado_Masters_thesis_UFRGS_2010.pdf) describes the tritanomaly approximation and exclusion of tritanopia modeling.
