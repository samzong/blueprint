import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "parse5";

import { deckLabels } from "../shared/i18n/deck.ts";
import {
  escapeHtml as html,
  type HtmlElement,
  type HtmlNode,
  isElement,
  language,
  optionalFile,
  parseObject,
  requiredString,
  validateFragment,
  validatePresentationCapacity,
} from "./shared.ts";

type PitchConfig = {
  brand: string;
  brandLogo?: string;
  brandTagline?: string;
  brandUrl?: string;
  date: string;
  footer: string;
  lang: string;
  title: string;
};

export const pitchRequiredSections = ["hero", "solution", "cta"] as const;
const repeatedPitchClasses = new Set([
  "hero-fact",
  "loop-step",
  "metric",
  "principle",
  "problem-row",
  "stack-card",
  "starter-card",
  "vision-line",
]);
const sectionLabelClasses = new Set(["eyebrow", "hero-kicker", "meta-tag"]);
const pitchCapacityProfile = {
  budget: 160,
  consequence: "scroll",
  labelClasses: sectionLabelClasses,
  repeatedClasses: repeatedPitchClasses,
  unit: "section",
} as const;

function optionalString(config: Record<string, unknown>, field: string, filename: string): string | undefined {
  const value = config[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filename}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalHttpUrl(config: Record<string, unknown>, field: string, filename: string): string | undefined {
  const value = config[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filename}: ${field} must be a non-empty HTTP URL`);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`${filename}: ${field} must be a non-empty HTTP URL`);
  }
  return value;
}

async function inlineBrandLogo(sourceDirectory: string, filename: string): Promise<string> {
  const mime = new Map([
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
    [".webp", "image/webp"],
  ]).get(path.extname(filename).toLowerCase());
  if (!mime) throw new Error(`${filename}: brandLogo must be a JPEG, PNG, SVG, or WebP image`);

  const [sourceRoot, logoFile] = await Promise.all([
    realpath(sourceDirectory),
    realpath(path.resolve(sourceDirectory, filename)),
  ]);
  const relative = path.relative(sourceRoot, logoFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${filename}: brandLogo must stay inside the project src directory`);
  }
  const data = await readFile(logoFile);
  return `<img class="brand-logo" src="data:${mime};base64,${data.toString("base64")}" alt="">`;
}

function parseConfig(raw: string, filename: string): PitchConfig {
  const config = parseObject(raw, filename);
  return {
    title: requiredString(config, "title", filename),
    brand: requiredString(config, "brand", filename),
    brandLogo: optionalString(config, "brandLogo", filename),
    brandTagline: optionalString(config, "brandTagline", filename),
    brandUrl: optionalHttpUrl(config, "brandUrl", filename),
    date: requiredString(config, "date", filename),
    footer: requiredString(config, "footer", filename),
    lang: language(config, filename),
  };
}

export function validatePitchSections(content: string, filename: string): void {
  for (const id of pitchRequiredSections) {
    const section = new RegExp(`<section\\b[^>]*\\bid=(["'])${id}\\1`, "i");
    if (!section.test(content)) throw new Error(`${filename}: missing required section #${id}`);
  }
}

function validatePitchSectionCapacity(html: string, filename: string): void {
  const document = parse(html);
  const pending: HtmlNode[] = [...document.childNodes];
  const sections: HtmlElement[] = [];
  for (const node of pending) {
    if (!isElement(node)) continue;
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
    if (node.tagName === "section") sections.push(node);
  }
  validatePresentationCapacity(sections, filename, pitchCapacityProfile);
}

export function checkPitchOutput(html: string, filename: string): void {
  validatePitchSections(html, filename);
  if (!/\bdata-deck-selector=(["'])section\1/i.test(html)) {
    throw new Error(`${filename}: missing data-deck-selector="section"`);
  }
  validatePitchSectionCapacity(html, filename);
}

function validateContent(content: string, filename: string): void {
  validateFragment(content, filename);
  validatePitchSections(content, filename);
}

export async function createPitch(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceDirectory = path.join(projectDirectory, "src");
  const configFile = path.join(sourceDirectory, "pitch.json");
  const sectionsFile = path.join(sourceDirectory, "sections.html");
  const customCssFile = path.join(sourceDirectory, "style.css");
  const [configRaw, sections, customCss, tokens, deckCss, pitchCss, deckRuntime] = await Promise.all([
    readFile(configFile, "utf8"),
    readFile(sectionsFile, "utf8"),
    optionalFile(customCssFile),
    readFile(new URL("../shared/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.css", import.meta.url), "utf8"),
    readFile(new URL("./pitch.css", import.meta.url), "utf8"),
    readFile(new URL("../shared/deck.js", import.meta.url), "utf8"),
  ]);

  const config = parseConfig(configRaw, configFile);
  validateContent(sections, sectionsFile);
  if (/<\/style/i.test(customCss)) throw new Error(`${customCssFile}: contains </style`);
  const logo = config.brandLogo ? await inlineBrandLogo(sourceDirectory, config.brandLogo) : "";
  const brandContent =
    logo || config.brandTagline
      ? `${logo}<span class="brand-name">${html(config.brand)}</span>${
          config.brandTagline ? `<span class="brand-tagline">${html(config.brandTagline)}</span>` : ""
        }`
      : html(config.brand);
  const brand = config.brandUrl
    ? `<a class="logo" href="${html(config.brandUrl)}">${brandContent}</a>`
    : `<div class="logo">${brandContent}</div>`;
  const labels = deckLabels(config.lang, "section");

  const document = `<!DOCTYPE html>
<html lang="${html(config.lang)}" data-deck-selector="section" data-deck-offset="nav.top" data-deck-progress-host="nav.top" data-deck-labels="${html(JSON.stringify(labels))}" data-deck-next-label="${html(labels.next)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${html(config.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;family=Noto+Sans+SC:wght@400;500;700;900&amp;display=swap" rel="stylesheet">
<style>
${tokens.trim()}
${deckCss.trim()}
${pitchCss.trim()}
${customCss.trim()}
</style>
</head>
<body>
<nav class="top">
  <div class="inner">
    ${brand}
    <div class="meta-tag">${html(config.date)}</div>
  </div>
</nav>
${sections.trim()}
<footer>
  <span class="mono">${html(config.footer)}</span>
</footer>
<script>
${deckRuntime.trim()}
</script>
</body>
</html>
`;

  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, document);
  return outputFile;
}
