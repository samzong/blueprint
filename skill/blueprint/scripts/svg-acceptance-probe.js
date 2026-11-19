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
  const selector = element => {
    if (element.id) return "#" + CSS.escape(element.id);
    const parts = [];
    for (let current = element; current && current !== document.documentElement; current = current.parentElement) {
      parts.unshift(current.localName + ":nth-child(" +
        (Array.from(current.parentElement.children).indexOf(current) + 1) + ")");
    }
    return "html > " + parts.join(" > ");
  };
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
  const alpha = color => {
    if (!context) return 255;
    context.clearRect(0, 0, 1, 1);
    paint(color);
    return context.getImageData(0, 0, 1, 1).data[3];
  };
  const compositeHex = (color, baseHex) => {
    if (!context || !color || color === "none" || color === "transparent" || !CSS.supports("color", color)) return null;
    if (alpha(color) === 0) return null;
    context.clearRect(0, 0, 1, 1);
    paint(baseHex);
    paint(color);
    return hex();
  };
  const unresolved = new Map();
  const recordUnresolved = (element, sample, reasons) => {
    const key = selector(element) + "|" + reasons.join("|");
    const item = unresolved.get(key);
    if (item) item.count++;
    else unresolved.set(key, { selector: selector(element), sample, reasons, count: 1 });
  };
  const svgEffectReasons = (node, rootSvg) => {
    const found = new Set();
    for (let cur = node; cur && cur !== rootSvg; cur = cur.parentElement) {
      const st = styleOf(cur);
      if (Number(st.opacity) < 1) found.add("SVG opacity");
      if (st.filter && st.filter !== "none") found.add("SVG filter");
      if (st.mixBlendMode && st.mixBlendMode !== "normal") found.add("SVG mix-blend-mode");
    }
    return found;
  };
  const inDefs = node => Boolean(node.closest("defs, clipPath, mask, pattern, symbol"));
  const covers = (outer, inner) => inner.left >= outer.left - 1.5 && inner.right <= outer.right + 1.5 &&
    inner.top >= outer.top - 1.5 && inner.bottom <= outer.bottom + 1.5;
  const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const svgChecks = Array.from(document.querySelectorAll("svg")).filter(visible).map(svg => {
    const svgBounds = box(svg).bounds;
    const ancestorStyles = [];
    const svgReasons = new Set();
    if (!context) svgReasons.add("sRGB canvas unavailable");
    for (let current = svg; current; current = current.parentElement) {
      const style = styleOf(current);
      ancestorStyles.push(style);
      if (style.backgroundImage !== "none") svgReasons.add("background-image");
      if (Number(style.opacity) < 1) svgReasons.add("opacity");
      if (style.filter !== "none" || (style.backdropFilter && style.backdropFilter !== "none")) svgReasons.add("filter");
      if (style.mixBlendMode !== "normal") svgReasons.add("mix-blend-mode");
    }
    let svgSurface = null;
    if (!svgReasons.size && context) {
      context.clearRect(0, 0, 1, 1);
      const rev = ancestorStyles.slice().reverse();
      for (const s of rev) paint(s.backgroundColor);
      if (context.getImageData(0, 0, 1, 1).data[3] < 255 &&
          (styleOf(document.documentElement).colorScheme.includes("dark") ||
           /\bdark\b/i.test(document.querySelector('meta[name="color-scheme" i]')?.content || ""))) {
        svgReasons.add("browser canvas color");
      } else {
        context.clearRect(0, 0, 1, 1);
        paint("#ffffff");
        for (const s of rev) paint(s.backgroundColor);
        svgSurface = hex();
      }
    }
    if (svgReasons.size) recordUnresolved(svg, text(svg).slice(0, 80), Array.from(svgReasons));
    const hasDirectText = node => Array.from(node.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const texts = Array.from(svg.querySelectorAll("text")).filter(t => !inDefs(t) && visible(t));
    const textLeaves = Array.from(svg.querySelectorAll("text, tspan"))
      .filter(n => !inDefs(n) && hasDirectText(n) && visible(n));
    const paintedShapes = Array.from(svg.querySelectorAll("rect, path, circle, ellipse, polygon"))
      .filter(s => !inDefs(s) && visible(s));
    const commands = new Set();
    const textBoxes = [];
    const svgOverflows = [];
    let minScale = null;
    let maxScale = null;
    let minTextPx = null;
    for (const t of texts) {
      const b = box(t).bounds;
      const label = text(t).slice(0, 80);
      if (b.left < svgBounds.left - 2 || b.right > svgBounds.right + 2 ||
          b.top < svgBounds.top - 2 || b.bottom > svgBounds.bottom + 2) {
        svgOverflows.push(label);
      }
      textBoxes.push({ label, bounds: b });
    }
    for (const leaf of textLeaves) {
      const ctm = leaf.getScreenCTM();
      const scale = ctm ? Math.min(Math.hypot(ctm.a, ctm.b), Math.hypot(ctm.c, ctm.d)) : 1;
      const actualPx = parseFloat(styleOf(leaf).fontSize) * scale;
      minScale = minScale === null ? scale : Math.min(minScale, scale);
      maxScale = maxScale === null ? scale : Math.max(maxScale, scale);
      minTextPx = minTextPx === null ? actualPx : Math.min(minTextPx, actualPx);
      const b = box(leaf).bounds;
      const label = text(leaf).slice(0, 80);
      if (svgSurface) {
        const localReasons = svgEffectReasons(leaf, svg);
        for (let cur = leaf; cur && cur.localName !== "svg"; cur = cur.parentElement) {
          if (Number(styleOf(cur).fillOpacity || 1) < 1) localReasons.add("SVG fill-opacity");
        }
        let localSurface = svgSurface;
        let surfaceUncertain = false;
        for (const s of paintedShapes) {
          const st = styleOf(s);
          if (!st.fill || st.fill === "none" || st.fill === "transparent") continue;
          const sb = box(s).bounds;
          if (!intersects(sb, b)) continue;
          const pos = s.compareDocumentPosition(leaf);
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
            localReasons.add("SVG shape over text");
            continue;
          }
          if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
          if (s.localName === "rect" && covers(sb, b) && !/^url\(/i.test(st.fill) &&
              Number(st.fillOpacity || 1) === 1 && svgEffectReasons(s, svg).size === 0) {
            const rf = compositeHex(st.fill, localSurface);
            if (rf) {
              localSurface = rf;
              if (alpha(st.fill) === 255) surfaceUncertain = false;
            }
          } else {
            surfaceUncertain = true;
          }
        }
        if (surfaceUncertain) localReasons.add("SVG uncertain surface");
        if (localReasons.size) {
          recordUnresolved(svg, label, Array.from(localReasons));
        } else if (/^url\(/i.test(styleOf(leaf).fill)) {
          recordUnresolved(svg, label, ["SVG paint server fill"]);
        } else {
          const tf = compositeHex(styleOf(leaf).fill, localSurface);
          if (tf) commands.add(`blueprint palette check '${tf}' --mode light --kind text --surface '${localSurface}' --json`);
        }
      }
    }
    const textOverlaps = [];
    for (let i = 0; i < textBoxes.length; i++) {
      for (let j = i + 1; j < textBoxes.length; j++) {
        const a = textBoxes[i].bounds, b = textBoxes[j].bounds;
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) {
          textOverlaps.push([textBoxes[i].label, textBoxes[j].label]);
        }
      }
    }
    if (svgSurface) {
      for (const shape of svg.querySelectorAll("path, line, circle, ellipse, rect, polyline, polygon")) {
        if (inDefs(shape) || !visible(shape)) continue;
        const st = styleOf(shape);
        if (parseFloat(st.strokeWidth) >= 1.2 && st.stroke && st.stroke !== "none") {
          const shapeReasons = svgEffectReasons(shape, svg);
          if (Number(st.strokeOpacity || 1) < 1) shapeReasons.add("SVG stroke-opacity");
          const shapeBounds = box(shape).bounds;
          let shapeSurface = svgSurface;
          for (const s of paintedShapes) {
            if (s === shape || s.localName !== "rect") continue;
            if (!(s.compareDocumentPosition(shape) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
            const rst = styleOf(s);
            if (!rst.fill || rst.fill === "none" || rst.fill === "transparent" || /^url\(/i.test(rst.fill)) continue;
            if (covers(box(s).bounds, shapeBounds) && Number(rst.fillOpacity || 1) === 1 && svgEffectReasons(s, svg).size === 0) {
              const rf = compositeHex(rst.fill, shapeSurface);
              if (rf) shapeSurface = rf;
            }
          }
          if (shapeReasons.size) {
            recordUnresolved(svg, selector(shape), Array.from(shapeReasons));
          } else if (/^url\(/i.test(st.stroke)) {
            recordUnresolved(svg, selector(shape), ["SVG paint server stroke"]);
          } else {
            const sf = compositeHex(st.stroke, shapeSurface);
            if (sf) commands.add(`blueprint palette check '${sf}' --mode light --kind mark --surface '${shapeSurface}' --json`);
          }
        }
      }
    }
    return {
      selector: selector(svg),
      minScale: minScale === null ? null : Number(minScale.toFixed(3)),
      maxScale: maxScale === null ? null : Number(maxScale.toFixed(3)),
      minTextPx: minTextPx === null ? null : Number(minTextPx.toFixed(2)),
      svgOverflows,
      textOverlaps,
      commands: Array.from(commands),
    };
  });
  return { svgChecks, unresolved: Array.from(unresolved.values()) };
})()
