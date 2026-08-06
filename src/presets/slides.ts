import { createRequire } from "node:module";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse, parseFragment, serialize } from "parse5";

import {
  assertPortableCss,
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
  validatePresentationCapacity,
} from "./shared.ts";

const nodeRequire = createRequire(import.meta.url);
const externalBase = "https://blueprint.invalid/";
const revealUrlAttributes = new Set(["data-background-image", "data-background-video", "data-background-iframe"]);
const unsupportedRevealAttributes = new Set(["data-src", "data-preview-image", "data-preview-video", "data-preview-link", "data-notes"]);
const themes = {
  "dify-x": new URL("./slides-dify-x.css", import.meta.url),
} as const;
const slidesCapacityProfile = {
  budget: 240,
  consequence: "be clipped",
  ignoredClasses: new Set(["notes"]),
  repeatedClasses: new Set([
    "architecture-node",
    "card",
    "evidence-verdict",
    "flow-step",
    "panel",
    "timeline-item",
  ]),
  repeatedClassWeights: new Map([["metric", 16]]),
  unit: "slide",
} as const;

type SlidesTheme = keyof typeof themes;
type SlidesBrand = {
  label?: string;
  logos: Array<{ alt: string; src: string }>;
};
type SlidesLocale = {
  label: string;
  lang: string;
  source: string;
  title: string;
};
type SlidesConfig = {
  brand?: SlidesBrand;
  lang: string;
  locales: SlidesLocale[];
  theme: SlidesTheme;
  title: string;
};

function descendants(element: Element): Element[] {
  const result: Element[] = [];
  const pending: Node[] = [...element.childNodes];
  for (const node of pending) {
    if (!isElement(node)) continue;
    result.push(node);
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
  }
  return result;
}

function validateSectionChildren(nodes: Node[], filename: string): Element[] {
  const sections: Element[] = [];
  for (const node of nodes) {
    if (isWhitespace(node) || (!isElement(node) && !("value" in node))) continue;
    if (!isElement(node) || node.tagName !== "section") {
      throw new Error(`${filename}: slides must contain only top-level <section> elements`);
    }
    sections.push(node);
  }
  if (sections.length === 0) throw new Error(`${filename}: expected at least one <section>`);

  for (const section of sections) {
    const directSections = section.childNodes.filter(
      (child): child is Element => isElement(child) && child.tagName === "section",
    );
    const nestedSections = descendants(section).filter((child) => child.tagName === "section");
    if (nestedSections.length === 0) continue;
    if (directSections.length !== nestedSections.length) {
      throw new Error(`${filename}: nested slides must be direct children of a top-level <section>`);
    }
    for (const child of section.childNodes) {
      if (isWhitespace(child) || (!isElement(child) && !("value" in child))) continue;
      if (!isElement(child) || child.tagName !== "section") {
        throw new Error(`${filename}: a vertical slide stack cannot contain content beside nested <section> elements`);
      }
    }
  }
  return sections;
}

function nonEmptyString(value: unknown, field: string, filename: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filename}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function canonicalLanguage(value: unknown, field: string, filename: string): string {
  const tag = nonEmptyString(value, field, filename);
  try {
    return Intl.getCanonicalLocales(tag)[0]!;
  } catch {
    throw new Error(`${filename}: ${field} must be a valid language tag`);
  }
}

function parseBrand(value: unknown, filename: string): SlidesBrand | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filename}: brand must be an object`);
  }
  const brand = value as Record<string, unknown>;
  const label = brand.label === undefined ? undefined : nonEmptyString(brand.label, "brand.label", filename);
  const rawLogos = brand.logos ?? [];
  if (!Array.isArray(rawLogos)) throw new Error(`${filename}: brand.logos must be an array`);
  const logos = rawLogos.map((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${filename}: brand.logos[${index}] must be an object`);
    }
    const logo = value as Record<string, unknown>;
    return {
      alt: nonEmptyString(logo.alt, `brand.logos[${index}].alt`, filename),
      src: nonEmptyString(logo.src, `brand.logos[${index}].src`, filename),
    };
  });
  if (!label && logos.length === 0) {
    throw new Error(`${filename}: brand requires label or logos`);
  }
  return { label, logos };
}

function parseLocales(value: unknown, lang: string, title: string, filename: string): SlidesLocale[] {
  if (value === undefined) {
    return [{ label: lang, lang, source: "slides.html", title }];
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${filename}: locales must be a non-empty array`);
  }
  const locales = value.map((value, index): SlidesLocale => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${filename}: locales[${index}] must be an object`);
    }
    const locale = value as Record<string, unknown>;
    return {
      label: nonEmptyString(locale.label, `locales[${index}].label`, filename),
      lang: canonicalLanguage(locale.lang, `locales[${index}].lang`, filename),
      source: nonEmptyString(locale.source, `locales[${index}].source`, filename),
      title: locale.title === undefined ? title : nonEmptyString(locale.title, `locales[${index}].title`, filename),
    };
  });
  if (new Set(locales.map((locale) => locale.lang)).size !== locales.length) {
    throw new Error(`${filename}: locales must use unique language tags`);
  }
  if (!locales.some((locale) => locale.lang === lang)) {
    throw new Error(`${filename}: locales must include the default lang ${JSON.stringify(lang)}`);
  }
  return locales;
}

function parseConfig(raw: string, filename: string): SlidesConfig {
  const config = parseObject(raw, filename);
  const theme = requiredString(config, "theme", filename);
  if (!Object.hasOwn(themes, theme)) {
    throw new Error(`${filename}: unknown theme ${JSON.stringify(theme)}; available themes: ${Object.keys(themes).join(", ")}`);
  }
  const lang = Intl.getCanonicalLocales(language(config, filename))[0]!;
  const title = requiredString(config, "title", filename);
  return {
    brand: parseBrand(config.brand, filename),
    lang,
    locales: parseLocales(config.locales, lang, title, filename),
    theme: theme as SlidesTheme,
    title,
  };
}

function assertRevealUrl(value: string, attribute: string, filename: string): void {
  if (!URL.canParse(value, externalBase)) {
    throw new Error(`${filename}: unsafe URL in ${attribute}`);
  }
  const protocol = new URL(value, externalBase).protocol;
  const dataImage =
    attribute === "data-background-image" &&
    protocol === "data:" &&
    /^data:image\/(?:avif|gif|jpeg|png|svg\+xml|webp);base64,[a-z0-9+/]*={0,2}$/i.test(value.trim());
  if ((attribute === "data-background-image" || attribute === "data-background-video") && value.includes(",") && !dataImage) {
    throw new Error(`${filename}: ${attribute} must contain one URL`);
  }
  if (!["http:", "https:"].includes(protocol) && !dataImage) {
    throw new Error(`${filename}: unsafe URL in ${attribute}`);
  }
  if (attribute === "data-background-image" && !dataImage) {
    try { decodeURI(value); } catch { throw new Error(`${filename}: unsafe URL in ${attribute}`); }
  }
}

function imageAttribute(element: Element, name: string): boolean {
  return (
    name === "data-background-image" ||
    (name === "src" && element.tagName === "img") ||
    (name === "poster" && element.tagName === "video") ||
    (name === "href" && element.tagName === "image")
  );
}

async function compileSlidesFragment(
  content: string,
  sourceDirectory: string,
  filename: string,
): Promise<{ html: string; topology: number[] }> {
  validateFragment(content, filename);
  const fragment = parseFragment(content);
  const sections = validateSectionChildren(fragment.childNodes, filename);
  const sourceRoot = await realpath(sourceDirectory);
  const pending: Node[] = [...fragment.childNodes];
  const replacements: Promise<void>[] = [];

  for (const node of pending) {
    if (!isElement(node)) continue;
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
    for (const attribute of node.attrs) {
      if (unsupportedRevealAttributes.has(attribute.name)) throw new Error(`${filename}: ${attribute.name} is not supported`);
      if (attribute.name === "srcset") {
        throw new Error(`${filename}: srcset is not supported in portable slides`);
      }
      if (attribute.name === "style" || attribute.name === "data-background-gradient") {
        assertPortableCss(attribute.value, filename);
      }
      if (attribute.name === "data-background") {
        throw new Error(`${filename}: data-background is not supported; use an explicit background attribute`);
      }
      if (revealUrlAttributes.has(attribute.name)) assertRevealUrl(attribute.value, attribute.name, filename);
      if (!urlAttributes.includes(attribute.name) && !revealUrlAttributes.has(attribute.name)) continue;
      if (!localReference(attribute.value)) continue;
      if (!imageAttribute(node, attribute.name)) {
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
  return { html: serialize(fragment), topology: sectionTopology(sections) };
}

function validatePortableOutput(root: Node, filename: string): void {
  const pending: Node[] = [root];
  for (const node of pending) {
    if (!isElement(node)) {
      if ("childNodes" in node) pending.push(...node.childNodes);
      continue;
    }
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
    if (node.tagName === "style") assertPortableCss(node.childNodes.map((child) => ("value" in child ? child.value : "")).join(""), filename);
    for (const attribute of node.attrs) {
      if (unsupportedRevealAttributes.has(attribute.name)) throw new Error(`${filename}: ${attribute.name} is not supported`);
      if (revealUrlAttributes.has(attribute.name)) assertRevealUrl(attribute.value, attribute.name, filename);
      if (attribute.name === "style" || attribute.name === "data-background-gradient") {
        assertPortableCss(attribute.value, filename);
      }
      if (attribute.name === "data-background") {
        throw new Error(`${filename}: data-background is not supported; use an explicit background attribute`);
      }
      if ((!urlAttributes.includes(attribute.name) && !revealUrlAttributes.has(attribute.name)) || !localReference(attribute.value)) {
        continue;
      }
      throw new Error(`${filename}: generated slides contain a local URL in ${attribute.name}`);
    }
  }
}

export function checkSlidesOutput(html: string, filename: string): void {
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
  if (!root?.attrs.some((attribute) => attribute.name === "data-blueprint-preset" && attribute.value === "slides")) {
    throw new Error(`${filename}: missing data-blueprint-preset="slides"`);
  }
  if (!root.attrs.some((attribute) => attribute.name === "data-blueprint-theme" && Object.hasOwn(themes, attribute.value))) {
    throw new Error(`${filename}: missing a supported data-blueprint-theme`);
  }
  const reveal = elements.find((element) => hasClass(element, "reveal"));
  const slides = reveal?.childNodes.find((node): node is Element => isElement(node) && hasClass(node, "slides"));
  if (!slides) throw new Error(`${filename}: missing .reveal > .slides`);
  const primarySections = validateSectionChildren(slides.childNodes, filename);
  validatePresentationCapacity(leafSlides(primarySections), filename, slidesCapacityProfile);
  const topology = JSON.stringify(sectionTopology(primarySections));
  for (const template of elements.filter(
    (element) => element.tagName === "template" && element.attrs.some((attribute) => attribute.name === "data-slides-lang"),
  )) {
    const lang = template.attrs.find((attribute) => attribute.name === "data-slides-lang")?.value;
    const content = "content" in template ? template.content : undefined;
    if (
      !lang ||
      typeof content !== "object" ||
      content === null ||
      !("childNodes" in content) ||
      !Array.isArray(content.childNodes)
    ) {
      throw new Error(`${filename}: invalid locale template`);
    }
    const localeFilename = `${filename}: locale ${lang}`;
    const localeSections = validateSectionChildren(content.childNodes as Node[], localeFilename);
    validatePresentationCapacity(leafSlides(localeSections), localeFilename, slidesCapacityProfile);
    const localeTopology = JSON.stringify(sectionTopology(localeSections));
    if (localeTopology !== topology) {
      throw new Error(`${filename}: locale ${JSON.stringify(lang)} must match the default slide topology`);
    }
  }
  if (!/\bReveal\.initialize\s*\(/.test(html) || !/\bRevealNotes\b/.test(html)) {
    throw new Error(`${filename}: missing Reveal.js runtime`);
  }
  validatePortableOutput(document, filename);
}

function sectionTopology(sections: Element[]): number[] {
  return sections.map(
    (section) => section.childNodes.filter((node) => isElement(node) && node.tagName === "section").length,
  );
}

function leafSlides(sections: Element[]): Element[] {
  return sections.flatMap((section) => {
    const nested = section.childNodes.filter(
      (node): node is Element => isElement(node) && node.tagName === "section",
    );
    return nested.length > 0 ? nested : [section];
  });
}



async function resolveLocaleSource(sourceRoot: string, source: string, filename: string): Promise<string> {
  if (path.isAbsolute(source) || !localReference(source)) {
    throw new Error(`${filename}: locale source must be a relative HTML file inside src`);
  }
  const url = new URL(source, externalBase);
  if (url.search || url.hash || path.extname(url.pathname).toLowerCase() !== ".html") {
    throw new Error(`${filename}: locale source must be a relative HTML file inside src`);
  }
  const sourceFile = await realpath(path.resolve(sourceRoot, decodeURIComponent(url.pathname).replace(/^\/+/, "")));
  const relative = path.relative(sourceRoot, sourceFile);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${filename}: locale source must stay inside the project src directory`);
  }
  return sourceFile;
}

function assertMatchingTopologies(locales: Array<SlidesLocale & { topology: number[] }>, filename: string): void {
  const expected = JSON.stringify(locales[0]!.topology);
  for (const locale of locales.slice(1)) {
    if (JSON.stringify(locale.topology) !== expected) {
      throw new Error(`${filename}: locale ${JSON.stringify(locale.lang)} must match the default slide topology`);
    }
  }
}

async function inlineBrand(
  brand: SlidesBrand | undefined,
  sourceDirectory: string,
  filename: string,
): Promise<SlidesBrand | undefined> {
  if (!brand) return undefined;
  return {
    label: brand.label,
    logos: await Promise.all(
      brand.logos.map(async (logo) => {
        if (!localReference(logo.src)) {
          throw new Error(`${filename}: brand logo must be a local image inside src`);
        }
        return { alt: logo.alt, src: await inlineImage(sourceDirectory, logo.src, filename) };
      }),
    ),
  };
}

function renderSlidesChrome(brand: SlidesBrand | undefined, locales: SlidesLocale[], defaultLang: string): string {
  const brandMarkup = brand
    ? `<div class="deck-brand" aria-label="${escapeHtml(
        [...brand.logos.map((logo) => logo.alt), brand.label].filter(Boolean).join(", "),
      )}">
      ${
        brand.logos.length > 0
          ? `<div class="deck-brand-logos">${brand.logos
              .map((logo) => `<img src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt)}">`)
              .join("")}</div>`
          : ""
      }
      ${brand.label ? `<span class="deck-brand-label">${escapeHtml(brand.label)}</span>` : ""}
    </div>`
    : "";
  const localeMarkup =
    locales.length > 1
      ? `<nav class="slides-locales" aria-label="Presentation language">${locales
          .map(
            (locale) =>
              `<button type="button" lang="${escapeHtml(locale.lang)}" data-slides-lang-link="${escapeHtml(locale.lang)}"${
                locale.lang === defaultLang ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"'
              }>${escapeHtml(locale.label)}</button>`,
          )
          .join('<span aria-hidden="true">/</span>')}</nav>`
      : "";
  if (!brandMarkup && !localeMarkup) return "";
  return `<header class="slides-chrome">${brandMarkup}${localeMarkup}</header>`;
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export async function createSlides(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceDirectory = path.join(projectDirectory, "src");
  const configFile = path.join(sourceDirectory, "slides.json");
  const customCssFile = path.join(sourceDirectory, "style.css");
  const [configRaw, customCss, resetCss, revealCss, revealRuntime, notesRuntime] = await Promise.all([
    readFile(configFile, "utf8"),
    optionalFile(customCssFile),
    readFile(nodeRequire.resolve("reveal.js/reset.css"), "utf8"),
    readFile(nodeRequire.resolve("reveal.js/reveal.css"), "utf8"),
    readFile(nodeRequire.resolve("reveal.js"), "utf8"),
    readFile(nodeRequire.resolve("reveal.js/plugin/notes"), "utf8"),
  ]);
  const config = parseConfig(configRaw, configFile);
  const sourceRoot = await realpath(sourceDirectory);
  const [locales, themeCss, brand] = await Promise.all([
    Promise.all(
      config.locales.map(async (locale) => {
        const sourceFile = await resolveLocaleSource(sourceRoot, locale.source, configFile);
        const source = await readFile(sourceFile, "utf8");
        return {
          ...locale,
          ...(await compileSlidesFragment(source, sourceDirectory, sourceFile)),
        };
      }),
    ),
    readFile(themes[config.theme], "utf8"),
    inlineBrand(config.brand, sourceRoot, configFile),
  ]);
  assertMatchingTopologies(locales, configFile);
  assertPortableCss(customCss, customCssFile);

  const primary = locales.find((locale) => locale.lang === config.lang)!;
  const localeTemplates = locales
    .filter((locale) => locale.lang !== config.lang)
    .map(
      (locale) =>
        `<template data-slides-lang="${escapeHtml(locale.lang)}">\n${locale.html.trim()}\n</template>`,
    )
    .join("\n");
  const chrome = renderSlidesChrome(brand, config.locales, config.lang);
  const localeMetadata = locales.map(({ lang, title }) => ({ lang, title }));
  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));

  const document = `<!DOCTYPE html>
<html lang="${escapeHtml(config.lang)}" data-blueprint-preset="slides" data-blueprint-theme="${escapeHtml(config.theme)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(primary.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;family=Noto+Sans+SC:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<style>
${resetCss.trim()}
${revealCss.trim()}
${themeCss.trim()}
${customCss.trim()}
</style>
</head>
<body>
${chrome}
<div class="reveal">
  <div class="slides">
${primary.html.trim()}
  </div>
  <div class="slides-shortcuts" aria-label="Keyboard shortcuts">
    <span><kbd>F</kbd> Fullscreen</span>
    <span><kbd>S</kbd> Notes</span>
    <span><kbd>?</kbd> Help</span>
  </div>
</div>
${localeTemplates}
<script>
${revealRuntime.trim()}
${notesRuntime.trim()}
const blueprintSlideLocales = ${scriptJson(localeMetadata)};
const blueprintRequestedLanguage = new URL(window.location.href).searchParams.get("lang");
const blueprintActiveLocale =
  blueprintSlideLocales.find((locale) => locale.lang === blueprintRequestedLanguage) ||
  blueprintSlideLocales.find((locale) => locale.lang === ${scriptJson(config.lang)});
if (blueprintActiveLocale.lang !== ${scriptJson(config.lang)}) {
  const template = [...document.querySelectorAll("template[data-slides-lang]")].find(
    (candidate) => candidate.dataset.slidesLang === blueprintActiveLocale.lang,
  );
  if (template) document.querySelector(".reveal .slides").replaceChildren(template.content.cloneNode(true));
}
document.documentElement.lang = blueprintActiveLocale.lang;
document.title = blueprintActiveLocale.title;
document.body.dataset.slidesLang = blueprintActiveLocale.lang;
for (const link of document.querySelectorAll("[data-slides-lang-link]")) {
  const active = link.dataset.slidesLangLink === blueprintActiveLocale.lang;
  link.classList.toggle("active", active);
  link.setAttribute("aria-pressed", String(active));
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("lang", link.dataset.slidesLangLink);
    window.location.assign(url);
  });
}
function toggleFullscreen() {
  const activeElement =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.webkitCurrentFullScreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement;
  const owner = activeElement ? document : document.documentElement;
  const method = activeElement
    ? document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.webkitCancelFullScreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen
    : document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.webkitRequestFullScreen ||
      document.documentElement.mozRequestFullScreen ||
      document.documentElement.msRequestFullscreen;
  if (method) Promise.resolve(method.call(owner)).catch(() => {});
}

Reveal.initialize({
  width: 1920,
  height: 1080,
  margin: 0.015,
  minScale: 0.2,
  maxScale: 2,
  controls: true,
  controlsTutorial: false,
  progress: true,
  slideNumber: "c/t",
  hash: true,
  history: true,
  keyboard: {
    70: toggleFullscreen
  },
  overview: true,
  center: false,
  touch: true,
  transition: "fade",
  backgroundTransition: "fade",
  navigationMode: "default",
  plugins: [RevealNotes]
}).then(() => {
  Reveal.registerKeyboardShortcut("F", "Enter / exit fullscreen");
});
</script>
</body>
</html>
`;

  checkSlidesOutput(document, outputFile);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, document);
  return outputFile;
}
