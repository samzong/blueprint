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

At each viewport size, run this expression through the host tool's page JavaScript capability.
If the host tool evaluates only functions, wrap the expression as `() => (...)`.
It returns the page-width measurement and visible controls that need name or label inspection.
This DOM screening does not replace the host tool's inspection of accessible names, including controls inside frames or shadow roots.

```js
(() => {
  const visible = element => element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden";
  const text = element => element.textContent?.trim() || "";
  const name = element => {
    const labelledBy = (element.getAttribute("aria-labelledby") || "")
      .split(/\s+/).filter(Boolean)
      .map(id => text(document.getElementById(id) || document.createElement("span"))).join(" ").trim();
    return labelledBy || element.getAttribute("aria-label")?.trim() ||
      Array.from(element.labels || []).map(text).join(" ").trim() ||
      (element.matches("input") ? element.value?.trim() : text(element)) ||
      Array.from(element.querySelectorAll("img[alt]")).map(image => image.alt).join(" ").trim() ||
      element.getAttribute("alt")?.trim() || element.getAttribute("title")?.trim() ||
      (element.matches('input[type="submit"]') ? "Submit" : "") ||
      (element.matches('input[type="reset"]') ? "Reset" : "");
  };
  const describe = element => ({
    tag: element.tagName.toLowerCase(),
    id: element.id,
    role: element.getAttribute("role"),
    type: element.getAttribute("type"),
    text: text(element).slice(0, 120),
  });
  const unnamedControls = Array.from(document.querySelectorAll(
    'button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"]'
  )).filter(visible).filter(element => !name(element)).map(describe);
  const unlabeledInputs = Array.from(document.querySelectorAll(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea'
  )).filter(visible).filter(element => {
    const labelledBy = (element.getAttribute("aria-labelledby") || "").split(/\s+/)
      .some(id => text(document.getElementById(id) || document.createElement("span")));
    return !labelledBy && !element.getAttribute("aria-label")?.trim() &&
      !Array.from(element.labels || []).some(label => text(label)) && !element.getAttribute("title")?.trim();
  }).map(describe);
  return {
    viewport: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    overflows: document.documentElement.scrollWidth > innerWidth,
    unnamedControls,
    unlabeledInputs,
  };
})()
```

Save the returned measurements and a full-page screenshot at each size.
Repeat the measurements and screenshots after interaction state changes.

## Inspect and exercise

At both viewport sizes, perform these checks on the rendered page:

1. Open the screenshots with an image viewer. Inspect the full page and each changed interaction state.
2. Inspect hierarchy, text readability, contrast, clipping, overlap, wrapping, and spacing around related content.
3. Inspect the snapshot for named buttons and labeled inputs. Fix empty names or missing labels in the rendered controls.
4. Operate every visible control and link in its intended scope. For external actions, inspect the destination without executing an unauthorized action.
5. Use Tab, Shift+Tab, Enter, and Space where applicable. Make sure that focus stays visible and follows the task order.
6. For prototypes, execute the selected flow's failure and recovery using the [prototype contract](preset-prototype.md).
7. Collect console events after the flow. Fix Artifact errors and broken states before rerunning the affected checks.

Measure page overflow at both widths and after state changes. Require `pageWidth <= viewport`.
Do not mask overflow with page-level `overflow-x: hidden`. Reflow the offending content.
A necessary two-dimensional table can scroll inside a labeled, keyboard-reachable container. The page must still fit the viewport.

For suspect or critical text, record the computed foreground and the actual opaque background behind it.
Resolve transparent ancestors or composited surfaces before measuring contrast.
Pass their hex values to the existing numeric check:

```bash
blueprint palette check '#FOREGROUND' --mode light --kind text --surface '#BACKGROUND' --json
```

Use `--mode dark` for a supported dark appearance. Keep `--surface` bound to the actual background.
This screening requires 4.5:1 for text. A numeric PASS does not prove readability, hierarchy, or full accessibility.
Inspect screenshots as well. If the Artifact supports multiple appearance modes, repeat for each supported mode.
Do not add an appearance mode for this procedure.

## Finish with evidence

Fix clipping, overlap, unreadable text, broken controls or states, and page-level horizontal overflow before delivery.
Rerun the affected interactions, measurements, and screenshots after each correction.
A saved screenshot without opening it does not establish visual acceptance.

Keep the acceptance evidence outside published content. Record these details in the handoff:

- Artifact entry URL and the exact version or files tested.
- Viewport sizes, screenshot paths, and what you observed when opening each image.
- Controls and keyboard paths exercised, including the prototype failure and recovery result.
- Page-width measurements, console findings, corrections, and anything still unverified.

Keep the browser session available while inspecting screenshots and rerunning corrections.
After those steps pass, close the browser session according to the host environment's browser instructions.
Keep a result page only when the user needs it to continue. Stop your preview process after the browser work ends.
