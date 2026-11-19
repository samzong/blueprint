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
    if (element.matches("input, textarea, select, canvas, iframe") || element.shadowRoot) {
      recordUnresolved(element, text(element).slice(0, 80) || element.getAttribute("placeholder") || element.value || "", ["inspect native, canvas, frame or open shadow text"]);
    }
  }
  const seenIds = new Set();
  const duplicateIdSet = new Set();
  const idWalker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
  while (idWalker.nextNode()) {
    const el = idWalker.currentNode;
    if (el.closest("template")) continue;
    const id = el.getAttribute("id")?.trim();
    if (id) {
      if (seenIds.has(id)) duplicateIdSet.add(id);
      seenIds.add(id);
    }
  }
  const hasDirectText = node => Array.from(node.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  const rawFontSizes = [];
  for (const element of elements) {
    if (element.closest("script, style, noscript, template, svg, code, pre, kbd, samp, .key-badge")) continue;
    if (hasDirectText(element)) rawFontSizes.push(parseFloat(styleOf(element).fontSize));
  }
  for (const t of document.querySelectorAll("svg text, svg tspan")) {
    if (t.closest("defs, clipPath, mask, pattern, symbol") || !hasDirectText(t) || !visible(t)) continue;
    if (styleOf(t).fontFamily.includes("monospace")) continue;
    const ctm = t.getScreenCTM();
    const scale = ctm ? Math.min(Math.hypot(ctm.a, ctm.b), Math.hypot(ctm.c, ctm.d)) : 1;
    rawFontSizes.push(parseFloat(styleOf(t).fontSize) * scale);
  }
  const fontClusters = [];
  for (const size of rawFontSizes.filter(Number.isFinite).sort((a, b) => a - b)) {
    if (!fontClusters.length || size - fontClusters[fontClusters.length - 1] > 1) fontClusters.push(size);
  }
  const h1 = document.querySelector("h1");
  const h2 = document.querySelector("h2");
  const workbench = {
    bodyFontSize: parseFloat(styleOf(document.body).fontSize),
    h1FontSize: h1 ? parseFloat(styleOf(h1).fontSize) : null,
    h2FontSize: h2 ? parseFloat(styleOf(h2).fontSize) : null,
    distinctFontSizeCount: fontClusters.length,
    hasStageWindow: Boolean(document.querySelector(".stage-window")),
    hasWindowChrome: Boolean(document.querySelector(".window-chrome")),
    tabCount: document.querySelectorAll(".vtab").length,
    themeButtonCount: document.querySelectorAll("[data-theme-mode]").length,
    hasLayoutToggle: Boolean(document.querySelector("#layout-toggle")),
    hasQuotaStrip: Boolean(document.querySelector(".quota-strip")),
    masterDetailCount: document.querySelectorAll(".master-detail").length,
    hasFootnote: Boolean(document.querySelector(".footnote")),
  };
  return {
    viewport: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    overflows: document.documentElement.scrollWidth > innerWidth,
    duplicateIds: Array.from(duplicateIdSet),
    unnamedControls,
    unlabeledInputs,
    workbench,
    textContrast: { pairs: Array.from(pairs.values()), unresolved: Array.from(unresolved.values()) },
  };
})()
