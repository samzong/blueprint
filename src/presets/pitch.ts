import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { escapeHtml as html, language, optionalFile, parseObject, requiredString, validateFragment } from "./shared.ts";

type PitchConfig = {
  brand: string;
  brandUrl?: string;
  date: string;
  footer: string;
  lang: string;
  title: string;
};

export const pitchRequiredSections = ["hero", "solution", "cta"] as const;

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

function parseConfig(raw: string, filename: string): PitchConfig {
  const config = parseObject(raw, filename);
  return {
    title: requiredString(config, "title", filename),
    brand: requiredString(config, "brand", filename),
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

export function checkPitchOutput(html: string, filename: string): void {
  validatePitchSections(html, filename);
  if (!/\bdata-deck-selector=(["'])section\1/i.test(html)) {
    throw new Error(`${filename}: missing data-deck-selector="section"`);
  }
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
  const brand = config.brandUrl
    ? `<a class="logo" href="${html(config.brandUrl)}">${html(config.brand)}</a>`
    : `<div class="logo">${html(config.brand)}</div>`;

  const document = `<!DOCTYPE html>
<html lang="${html(config.lang)}" data-deck-selector="section" data-deck-offset="nav.top" data-deck-progress-host="nav.top" data-deck-next-label="下一节">
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
