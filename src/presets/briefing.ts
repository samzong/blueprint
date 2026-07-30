import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse, parseFragment, serialize } from "parse5";

import { deckLabels } from "../shared/i18n/deck.ts";
import {
  assertPortableCss,
  assertSafeUrl,
  escapeHtml,
  hasClass,
  type HtmlElement as Element,
  type HtmlNode as Node,
  inlineImage,
  isElement,
  isWhitespace,
  language,
  localReference,
  optionalFile,
  parseObject,
  requiredString,
  urlAttributes,
  validateFragment,
} from "./shared.ts";

type BriefingConfig = {
  lang: string;
  title: string;
};

function parseConfig(raw: string, filename: string): BriefingConfig {
  const config = parseObject(raw, filename);
  return {
    title: requiredString(config, "title", filename),
    lang: language(config, filename),
  };
}

function childrenWithClass(element: Element, className: string): Element[] {
  return element.childNodes.filter((node): node is Element => isElement(node) && hasClass(node, className));
}

function sourceSlides(nodes: Node[], filename: string): Element[] {
  const slides: Element[] = [];
  for (const node of nodes) {
    if (isWhitespace(node) || (!isElement(node) && !("value" in node))) continue;
    if (!isElement(node) || node.tagName !== "section" || !hasClass(node, "slide")) {
      throw new Error(`${filename}: expected only top-level <section class="slide"> elements`);
    }
    slides.push(node);
  }
  return slides;
}

function validateSlides(
  slides: Element[],
  filename: string,
  requireNumbers: boolean,
  requireIds = false,
): void {
  if (slides.length < 4) throw new Error(`${filename}: expected a cover and at least three content slides`);
  const covers = slides.filter((slide) => hasClass(slide, "cover"));
  if (covers.length !== 1) throw new Error(`${filename}: expected exactly one cover slide`);
  const ids = new Set<string>();

  for (const [index, slide] of slides.entries()) {
    if (childrenWithClass(slide, "slide-tag").length !== 1) {
      throw new Error(`${filename}: slide ${index + 1} is missing .slide-tag`);
    }
    if (childrenWithClass(slide, "slide-inner").length !== 1) {
      throw new Error(`${filename}: slide ${index + 1} is missing .slide-inner`);
    }
    if (requireNumbers && childrenWithClass(slide, "slide-num").length !== 1) {
      throw new Error(`${filename}: slide ${index + 1} is missing .slide-num`);
    }
    if (requireIds) {
      const id = slide.attrs.find((attribute) => attribute.name === "id")?.value.trim();
      if (!id) throw new Error(`${filename}: slide ${index + 1} is missing an id`);
      if (ids.has(id)) throw new Error(`${filename}: duplicate slide id ${JSON.stringify(id)}`);
      ids.add(id);
    }
  }
}

function addSlideChrome(slides: Element[]): void {
  const total = String(slides.length).padStart(2, "0");
  for (const [index, slide] of slides.entries()) {
    const current = String(index + 1).padStart(2, "0");
    const id = slide.attrs.find((attribute) => attribute.name === "id");
    if (id) id.value ||= `slide-${current}`;
    else slide.attrs.push({ name: "id", value: `slide-${current}` });

    const number = parseFragment(`<div class="slide-num mono">${current} / ${total}</div>`).childNodes[0];
    if (!number || !isElement(number)) throw new Error("briefing: failed to render page number");
    number.parentNode = slide;
    const existing = slide.childNodes.findIndex((node) => isElement(node) && hasClass(node, "slide-num"));
    if (existing >= 0) {
      slide.childNodes[existing] = number;
      continue;
    }
    const inner = slide.childNodes.findIndex((node) => isElement(node) && hasClass(node, "slide-inner"));
    slide.childNodes.splice(inner, 0, number);
  }
}

async function compileSlides(content: string, sourceDirectory: string, filename: string): Promise<string> {
  validateFragment(content, filename);
  const fragment = parseFragment(content);
  const slides = sourceSlides(fragment.childNodes, filename);
  validateSlides(slides, filename, false);
  const sourceRoot = await realpath(sourceDirectory);
  const pending: Node[] = [...fragment.childNodes];
  const replacements: Promise<void>[] = [];

  for (const node of pending) {
    if (!isElement(node)) continue;
    if (node.tagName === "iframe") throw new Error(`${filename}: iframes are not supported in portable briefings`);
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
    for (const attribute of node.attrs) {
      if (attribute.name === "srcset") {
        throw new Error(`${filename}: srcset is not supported in portable briefings`);
      }
      if (attribute.name === "style") assertPortableCss(attribute.value, filename);
      if (!urlAttributes.includes(attribute.name) || !localReference(attribute.value)) continue;
      const image =
        (attribute.name === "src" && node.tagName === "img") ||
        (attribute.name === "poster" && node.tagName === "video") ||
        (attribute.name === "href" && node.tagName === "image");
      if (!image) {
        throw new Error(`${filename}: local URL in ${attribute.name} is not portable`);
      }
      replacements.push(
        inlineImage(sourceRoot, attribute.value, filename).then((value) => {
          attribute.value = value;
        }),
      );
    }
  }

  await Promise.all(replacements);
  addSlideChrome(slides);
  return serialize(fragment);
}

export function validateSlideChrome(content: string, filename: string): void {
  validateFragment(content, filename);
  const fragment = parseFragment(content);
  validateSlides(sourceSlides(fragment.childNodes, filename), filename, false);
}

export function checkBriefingOutput(html: string, filename: string): void {
  const document = parse(html);
  const elements: Element[] = [];
  const pending: Node[] = [...document.childNodes];
  for (const node of pending) {
    if (!isElement(node)) continue;
    elements.push(node);
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
  }

  const root = elements.find((element) => element.tagName === "html");
  if (
    !root?.attrs.some(
      (attribute) => attribute.name === "data-deck-selector" && attribute.value === ".slide",
    )
  ) {
    throw new Error(`${filename}: missing data-deck-selector=".slide"`);
  }

  const hashEnabled = root?.attrs.some(
    (attribute) => attribute.name === "data-deck-hash" && attribute.value === "true",
  ) ?? false;
  const body = elements.find((element) => element.tagName === "body");
  const slides =
    body?.childNodes.filter(
      (node): node is Element => isElement(node) && node.tagName === "section" && hasClass(node, "slide"),
    ) ?? [];
  validateSlides(slides, filename, true, hashEnabled);

  for (const element of elements) {
    if (element.tagName === "iframe") {
      throw new Error(`${filename}: iframes are not supported in portable briefings`);
    }
    if (element.tagName === "style") {
      assertPortableCss(
        element.childNodes.map((child) => ("value" in child ? child.value : "")).join(""),
        filename,
      );
    }
    for (const attribute of element.attrs) {
      if (attribute.name === "srcset") {
        throw new Error(`${filename}: srcset is not supported in portable briefings`);
      }
      if (attribute.name === "style") assertPortableCss(attribute.value, filename);
      if (urlAttributes.includes(attribute.name)) {
        assertSafeUrl(element, attribute, filename);
        if (localReference(attribute.value)) {
          throw new Error(`${filename}: local URL in ${attribute.name} is not portable`);
        }
      }
    }
  }
}

export async function createBriefing(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceDirectory = path.join(projectDirectory, "src");
  const configFile = path.join(sourceDirectory, "briefing.json");
  const slidesFile = path.join(sourceDirectory, "slides.html");
  const customCssFile = path.join(sourceDirectory, "style.css");
  const [configRaw, slides, customCss, tokens, deckCss, briefingCss, deckRuntime] = await Promise.all([
    readFile(configFile, "utf8"),
    readFile(slidesFile, "utf8"),
    optionalFile(customCssFile),
    readFile(new URL("../shared/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.css", import.meta.url), "utf8"),
    readFile(new URL("./briefing.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.js", import.meta.url), "utf8"),
  ]);

  const config = parseConfig(configRaw, configFile);
  const compiledSlides = await compileSlides(slides, sourceDirectory, slidesFile);
  assertPortableCss(customCss, customCssFile);
  const labels = deckLabels(config.lang, "page");

  const document = `<!DOCTYPE html>
<html lang="${escapeHtml(config.lang)}" data-blueprint-preset="briefing" data-deck-selector=".slide" data-deck-progress-host="body" data-deck-hash="true" data-deck-labels="${escapeHtml(JSON.stringify(labels))}" data-deck-next-label="${escapeHtml(labels.next)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=Noto+Sans+SC:wght@300;400;500;600;700;900&amp;family=Noto+Serif+SC:wght@500;600;700&amp;display=swap" rel="stylesheet">
<style>
${tokens.trim()}
${deckCss.trim()}
${briefingCss.trim()}
${customCss.trim()}
</style>
</head>
<body>
${compiledSlides.trim()}
<script>
${deckRuntime.trim()}
</script>
</body>
</html>
`;

  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));
  checkBriefingOutput(document, outputFile);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, document);
  return outputFile;
}
