# Rendered acceptance

Apply this procedure before delivering `html`, `prototype-lite`, or `prototype-full`, including a rebuild or upgrade.
`blueprint check` proves structure. It does not execute scripts or prove visual quality.
This procedure does not select a Theme or change the `html` scaffold.

## Prepare the browser

1. Run `blueprint check <output>` after authoring the final content.
2. For `prototype-full`, install missing dependencies with `pnpm install --ignore-workspace`, then run `pnpm build` in the Artifact.
3. Run `blueprint preview <output>` and use the exact entry URL that it prints.
4. Follow the host environment's browser instructions and use the browser automation that it provides.
5. Keep the browser session available for screenshot inspection, corrections, and reruns.

Creation authorizes the local preview needed for acceptance. Stop only the preview process that you started after acceptance.
Do not install or upgrade browser tools without separate authorization.
If the preview, image viewer, or a required browser capability is unavailable, report the exact failure and unverified scope.
Return the Artifact path for recovery, but do not call delivery or visual acceptance complete.

The host browser automation must provide these capabilities:

- Set the viewport to wide 1280×900 and narrow 375×812 CSS pixels. Use desktop emulation, not mobile emulation, with device scale factor 1.
- Capture console messages, uncaught exceptions, and failed resources from page load and after interactions.
- Capture full-page screenshots and expose rendered control names and labels through a snapshot or accessibility inspection.
- Run JavaScript in the page and operate controls with pointer and keyboard input.

Create an evidence directory outside the published content.
Enable console capture before navigating to the exact preview URL, or enable capture and reload before collecting startup evidence.
Save startup messages before any operation that clears the event buffer.
Inspect errors, exceptions, warnings, and failed resources. Explain unrelated warnings with evidence instead of hiding them.
Wait for the Artifact's actual content before capturing asynchronous views. A load event alone does not prove that React mounted.

## Run the DOM and SVG probes

At each viewport size, read [rendered-acceptance-probe.js](../scripts/rendered-acceptance-probe.js) from this Skill directory and evaluate it in the page.
If the page contains `<svg>` elements, also read and evaluate [svg-acceptance-probe.js](../scripts/svg-acceptance-probe.js).
If the host tool evaluates only functions, wrap each script expression as `() => (<script>)`.
The DOM probe returns page width, duplicate `id` values, unnamed controls, workbench metrics, and HTML text contrast commands.
The SVG probe returns CTM scale bounds, label overflows, label overlaps, and SVG text and stroke contrast commands.
This DOM screening does not replace the host tool's inspection of accessible names, including controls inside frames or shadow roots.

Save the returned measurements and a full-page screenshot at each size.
Require `duplicateIds.length === 0`.
For every entry in `svgChecks`, require `svgOverflows.length === 0` and `textOverlaps.length === 0`.
If `minScale` is present on a static SVG, require `minScale >= 0.9` and `maxScale <= 1.15`.
For an `html` Artifact on the default [HTML workbench](html-workbench.md) baseline, require `workbench.themeButtonCount === 3` and `workbench.distinctFontSizeCount <= 5`.
Also require `workbench.h1FontSize <= 18` and `workbench.h2FontSize <= 16`.
If the Artifact uses `.view-tabs`, require `workbench.tabCount >= 2 && workbench.tabCount <= 5` and `workbench.hasLayoutToggle === true`.
Do not require `.stage-window`, `.quota-strip`, or `.master-detail` when the chosen layout omits them.

Run every `textContrast.pairs[].command` and every `svgChecks[].commands[]` entry before you continue.
Save each command, exit status, and JSON result, including FAIL results.
For a supported dark appearance, change only `--mode light` to `--mode dark` in each command.
Do not replace `--surface` with a default surface or skip repeated colors on different backgrounds.
Treat every FAIL as a defect, fix that defect, and rerun the measurement and commands.
For each `textContrast.unresolved` and SVG `unresolved` item, inspect the element and resolve its foreground and background before running `palette check`.
Otherwise, record its selector, sample, reason, and state as an exact unverified item.
Do not claim complete contrast acceptance while any FAIL or unresolved item remains.
Repeat the measurements, commands, and screenshots after interaction state changes.

Both probes composite ancestor backgrounds over white in a one-pixel sRGB canvas, then composite foreground alpha to produce opaque hex values.
Uncovered background boxes, images, gradients, SVG paint servers, filters, blending, opacity, masks, pseudo-elements, overlaps, native controls, canvas, frames, and shadow roots become unresolved.
Inspect screenshots for closed shadow roots, spotlight shadows, pseudo-element overlays, slotted text, clipped backgrounds, negative `z-index` layers, clipping, hidden text, text effects, and canvas defaults.

## Inspect and exercise

At both viewport sizes, perform these checks on the rendered page:

1. Open the screenshots with an image viewer. Inspect the full page and each changed interaction state.
2. Inspect hierarchy, text readability, contrast, clipping, overlap, wrapping, and spacing around related content.
3. Inspect the snapshot for named buttons and labeled inputs. Fix empty names or missing labels in the rendered controls.
4. Operate every visible control and link in its intended scope. For external actions, inspect the destination without executing an unauthorized action.
5. Use Tab, Shift+Tab, Enter, and Space where applicable. Make sure that focus stays visible and follows the task order.
6. For prototypes, execute the selected flow's failure and recovery using the [prototype contract](preset-prototype.md).
7. Collect console events after the flow. Fix Artifact errors and broken states before rerunning the affected checks.

Measure page overflow at both widths and after state changes (`pageWidth <= viewport`).
Do not mask overflow with page-level `overflow-x: hidden`. Reflow the offending content instead.
A necessary two-dimensional table can scroll inside a labeled, keyboard-reachable container while the page fits the viewport.

Run the measured color commands for all returned text in each supported appearance mode (`4.5:1` minimum).
Do not calculate contrast in page JavaScript or add an appearance mode for this procedure.

## Finish with evidence

Fix clipping, overlap, unreadable text, broken controls or states, and page-level horizontal overflow before delivery.
Rerun the affected checks and open each saved screenshot.

Keep the acceptance evidence outside published content and record in the handoff:

- Artifact entry URL and the exact version or files tested.
- Viewport sizes, screenshot paths, and what you observed when opening each image.
- Controls and keyboard paths exercised, including the prototype failure and recovery result.
- Page-width measurements, color pairs, palette results, unresolved elements, console findings, corrections, and anything still unverified.

Close the browser session and stop your preview process after acceptance, keeping a result page only when the user needs it to continue.
