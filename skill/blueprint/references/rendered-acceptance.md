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
It returns page width, controls that need name or label inspection, and text color pairs with ready-to-run contrast commands.
This DOM screening does not replace the host tool's inspection of accessible names, including controls inside frames or shadow roots.

```js
(() => {
  const geometry = new WeakMap();
  const box = element => {
    if (!geometry.has(element)) geometry.set(element, {
      rects: Array.from(element.getClientRects()), bounds: element.getBoundingClientRect(),
    });
    return geometry.get(element);
  };
  const styles = new WeakMap();
  const styleOf = element => {
    if (!styles.has(element)) styles.set(element, getComputedStyle(element));
    return styles.get(element);
  };
  const visible = element => box(element).rects.length > 0 && styleOf(element).visibility !== "hidden";
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
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
  const hex = () => "#" + Array.from(context.getImageData(0, 0, 1, 1).data)
    .slice(0, 3).map(channel => channel.toString(16).padStart(2, "0")).join("");
  const paint = color => {
    if (!CSS.supports("color", color)) throw new Error("Unsupported color: " + color);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
  };
  const alphas = new Map();
  const alpha = color => {
    if (!context) return 1;
    if (!alphas.has(color)) {
      context.clearRect(0, 0, 1, 1);
      paint(color);
      alphas.set(color, context.getImageData(0, 0, 1, 1).data[3]);
    }
    return alphas.get(color);
  };
  const selector = element => {
    if (element.id) return "#" + CSS.escape(element.id);
    const parts = [];
    for (let current = element; current && current !== document.documentElement; current = current.parentElement) {
      parts.unshift(current.localName + ":nth-child(" +
        (Array.from(current.parentElement.children).indexOf(current) + 1) + ")");
    }
    return "html > " + parts.join(" > ");
  };
  const elements = Array.from(document.querySelectorAll("body *")).filter(visible);
  const layouts = elements.map(element => ({ element, rects: box(element).rects }));
  const pairs = new Map();
  const unresolved = new Map();
  const recordUnresolved = (element, sample, reasons) => {
    const key = selector(element) + "|" + reasons.join("|");
    const item = unresolved.get(key);
    if (item) item.count++;
    else unresolved.set(key, { selector: selector(element), sample, reasons, count: 1 });
  };
  const measure = (element, sample, rects, color) => {
    let stopClipping = false;
    for (let current = element; current; current = current.parentElement) {
      const style = styleOf(current);
      if (stopClipping) break;
      stopClipping = style.position === "absolute" || style.position === "fixed";
      if (style.display === "inline" || style.display === "contents" ||
          ((style.overflowX === "clip" || style.overflowY === "clip") &&
           (style.overflowClipMargin || "0px").split(" ").some(value => parseFloat(value) > 0))) continue;
      const bounds = box(current).bounds;
      const left = bounds.left + current.clientLeft, top = bounds.top + current.clientTop;
      rects = rects.map(rect => ({
        left: style.overflowX === "visible" ? rect.left : Math.max(rect.left, left),
        right: style.overflowX === "visible" ? rect.right : Math.min(rect.right, left + current.clientWidth),
        top: style.overflowY === "visible" ? rect.top : Math.max(rect.top, top),
        bottom: style.overflowY === "visible" ? rect.bottom : Math.min(rect.bottom, top + current.clientHeight),
      })).filter(rect => rect.right > rect.left && rect.bottom > rect.top);
    }
    if (!rects.length) return;
    const chain = [];
    const reasons = new Set();
    for (let current = element; current; current = current.parentElement) {
      const style = styleOf(current);
      chain.push(style);
      if (style.visibility !== "visible") reasons.add("non-visible ancestor");
      const canvasBackground = current === document.documentElement ||
        (current === document.body && alpha(styleOf(document.documentElement).backgroundColor) === 0);
      if (!canvasBackground && alpha(style.backgroundColor) > 0) {
        if (sample === "::marker" && styleOf(element).listStylePosition === "outside") reasons.add("marker background or image");
        const bounds = box(current).bounds;
        if (style.display === "contents" || rects.some(rect =>
          rect.left < bounds.left - 1 || rect.right > bounds.right + 1 ||
          rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) {
          reasons.add("background box does not cover text");
        }
      }
      if (style.backgroundImage !== "none") reasons.add("background-image");
      if (Number(style.opacity) < 1) reasons.add("opacity");
      if (style.filter !== "none" || (style.backdropFilter && style.backdropFilter !== "none")) reasons.add("filter");
      if (style.mixBlendMode !== "normal") reasons.add("mix-blend-mode");
      if (style.backgroundClip === "text" || (style.webkitTextFillColor && style.webkitTextFillColor !== style.color)) reasons.add("text fill");
      if (style.maskImage && style.maskImage !== "none") reasons.add("mask");
      if (style.clipPath !== "none") reasons.add("clip-path");
      for (const pseudo of ["::first-line", "::first-letter"]) {
        const pseudoStyle = getComputedStyle(current, pseudo);
        if (pseudoStyle.color !== style.color) reasons.add("pseudo-element text color");
        if (alpha(pseudoStyle.backgroundColor) > 0 || pseudoStyle.backgroundImage !== "none") reasons.add("pseudo-element background");
      }
      for (const pseudo of ["::before", "::after"]) {
        const content = getComputedStyle(current, pseudo).content;
        if (content && content !== "none" && content !== "normal") reasons.add("pseudo-element");
      }
    }
    const overlaps = layouts.some(({ element: other, rects: boxes }) => other !== element &&
      boxes.some(box => rects.some(rect => box.width > 0 && box.height > 0 &&
        box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top)) &&
      !other.contains(element));
    if (overlaps) reasons.add("overlapping element");
    if (!context) reasons.add("sRGB canvas unavailable");
    if (reasons.size) {
      recordUnresolved(element, sample, Array.from(reasons));
      return;
    }
    try {
      context.clearRect(0, 0, 1, 1);
      const backgrounds = chain.reverse();
      for (const style of backgrounds) paint(style.backgroundColor);
      if (context.getImageData(0, 0, 1, 1).data[3] < 255 &&
          (styleOf(document.documentElement).colorScheme.includes("dark") ||
           /\bdark\b/i.test(document.querySelector('meta[name="color-scheme" i]')?.content || ""))) {
        recordUnresolved(element, sample, ["browser canvas color"]);
        return;
      }
      context.clearRect(0, 0, 1, 1);
      paint("#ffffff");
      for (const style of backgrounds) paint(style.backgroundColor);
      const background = hex();
      paint(color);
      const foreground = hex();
      const key = foreground + "|" + background;
      const item = pairs.get(key);
      if (item) item.count++;
      else pairs.set(key, {
        foreground, background, count: 1,
        sample: { selector: selector(element), text: sample, color },
        command: `blueprint palette check '${foreground}' --mode light --kind text --surface '${background}' --json`,
      });
    } catch (error) {
      recordUnresolved(element, sample, [String(error)]);
    }
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    const sample = node.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!sample || !visible(element) || element.closest("script, style, noscript, template, svg, canvas, iframe, input, textarea, select")) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
    if (rects.length) measure(element, sample, rects, styleOf(element).color);
  }
  for (const element of elements) {
    const style = styleOf(element);
    if (style.display === "list-item") {
      const marker = getComputedStyle(element, "::marker");
      if (marker.content !== "none" && marker.content !== '""' && marker.content !== "''" &&
          (style.listStyleType !== "none" || style.listStyleImage !== "none" || marker.content !== "normal")) {
        if (style.listStyleImage !== "none" || marker.backgroundImage !== "none" ||
            alpha(marker.backgroundColor) > 0) {
          recordUnresolved(element, "::marker", ["marker background or image"]);
        } else if (marker.color !== style.color) {
          measure(element, "::marker", box(element).rects, marker.color);
        }
      }
    }
    for (const pseudo of ["::before", "::after"]) {
      const content = getComputedStyle(element, pseudo).content;
      if (content && content !== "none" && content !== "normal") {
        recordUnresolved(element, content.slice(0, 80), ["generated pseudo-element text"]);
      }
    }
    if (element.matches("input, textarea, select, svg, canvas, iframe") || element.shadowRoot) {
      recordUnresolved(element, text(element).slice(0, 80) || element.getAttribute("placeholder") || element.value || "", ["inspect native, SVG, canvas, frame or open shadow text"]);
    }
  }
  return {
    viewport: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    overflows: document.documentElement.scrollWidth > innerWidth,
    unnamedControls,
    unlabeledInputs,
    textContrast: { pairs: Array.from(pairs.values()), unresolved: Array.from(unresolved.values()) },
  };
})()
```

Save the returned measurements and a full-page screenshot at each size.
Run every `textContrast.pairs[].command` before continuing. Save each command, exit status, and JSON result, including FAIL results.
For a supported dark appearance, change only `--mode light` to `--mode dark` in each command.
Do not replace `--surface` with a default surface or skip repeated colors on different backgrounds.
Treat every FAIL as a defect. Correct it and rerun the measurement and commands.
For every `textContrast.unresolved` item, inspect the named element and resolve the actual foreground and background before using `palette check`.
If you cannot resolve an item, record its selector, sample, reason, and state as an exact unverified item.
Do not claim complete contrast acceptance while any FAIL or unresolved item remains.
Repeat the measurements, commands, and screenshots after interaction state changes.

The expression uses a one-pixel sRGB canvas to convert CSS colors and composite ancestor backgrounds over white.
It composites foreground alpha over the resulting background before producing opaque hex values for the CLI.
Pairs are deduplicated by foreground and background, with a sample count and one text example.
It marks uncovered background boxes, images, gradients, filters, blending, opacity, masks, pseudo-element text, and overlapping boxes as unresolved.
Native controls, SVG, canvas, frames, and open shadow roots need separate inspection and appear as unresolved items.
Page JavaScript cannot measure text inside closed shadow roots, so inspect that text in screenshots.
Inspect screenshots for box-shadow or outline spotlights and absolute pseudo-element overlays from sibling elements.
Inspect slotted light-DOM text for backgrounds painted inside shadow roots.
Inspect screenshots for `background-clip` padding-box/content-box, negative `z-index` text behind overlays, and overlays outside `<body>`.
This is DOM screening, not a pixel audit. Inspect screenshots for clipping, hidden text, text effects, and non-white browser canvas defaults.
Dark browser canvas defaults declared by CSS or metadata appear as unresolved items when no opaque background covers the text. Resolve any other non-white canvas default before acceptance.

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

Use the measured color pairs and commands above for all returned text, not only text that looks suspect.
Keep contrast math in `blueprint palette check`. Do not calculate contrast in page JavaScript.
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
- Page-width measurements, color pairs, palette results, unresolved elements, console findings, corrections, and anything still unverified.

Keep the browser session available while inspecting screenshots and rerunning corrections.
After those steps pass, close the browser session according to the host environment's browser instructions.
Keep a result page only when the user needs it to continue. Stop your preview process after the browser work ends.
