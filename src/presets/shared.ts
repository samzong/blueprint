import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

export type HtmlNode = DefaultTreeAdapterMap["node"];
export type HtmlElement = DefaultTreeAdapterMap["element"];

// Attributes that carry a URL, and so must be protocol-checked wherever markup is validated.
export const urlAttributes = ["href", "src", "xlink:href", "action", "formaction", "poster", "data", "cite"];
const portableBase = "https://blueprint.invalid/";
const imageMimeTypes = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node;
}

export function isWhitespace(node: HtmlNode): boolean {
  return "value" in node && node.value.trim() === "";
}

export function hasClass(element: HtmlElement, name: string): boolean {
  return element.attrs.some(
    (attribute) => attribute.name === "class" && attribute.value.split(/\s+/).includes(name),
  );
}

type PresentationCapacityProfile = {
  budget: number;
  consequence: string;
  ignoredClasses?: ReadonlySet<string>;
  labelClasses?: ReadonlySet<string>;
  repeatedClasses?: ReadonlySet<string>;
  repeatedClassWeights?: ReadonlyMap<string, number>;
  unit: "section" | "slide";
};

function hasAnyClass(element: HtmlElement, names: ReadonlySet<string> | undefined): boolean {
  if (!names) return false;
  for (const name of names) {
    if (hasClass(element, name)) return true;
  }
  return false;
}

function capacityElements(element: HtmlElement, ignoredClasses: ReadonlySet<string> | undefined): HtmlElement[] {
  const elements: HtmlElement[] = [];
  const pending: HtmlNode[] = [...element.childNodes];
  for (const node of pending) {
    if (!isElement(node) || hasAnyClass(node, ignoredClasses)) continue;
    elements.push(node);
    pending.push(...node.childNodes);
    if ("content" in node) pending.push(...node.content.childNodes);
  }
  return elements;
}

function capacityText(node: HtmlNode, ignoredClasses: ReadonlySet<string> | undefined): string {
  if ("value" in node) return node.value;
  if (!("childNodes" in node) || (isElement(node) && hasAnyClass(node, ignoredClasses))) return "";
  return node.childNodes.map((child) => capacityText(child, ignoredClasses)).join(" ");
}

function contentTokens(value: string): number {
  const cjkRuns = value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu) ?? [];
  const otherTokens =
    value
      .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu, " ")
      .match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return otherTokens + cjkRuns.reduce((total, run) => total + Math.ceil(Array.from(run).length / 3), 0);
}

function presentationCapacityCost(section: HtmlElement, profile: PresentationCapacityProfile): number {
  const elements = capacityElements(section, profile.ignoredClasses);
  const heading = elements.find((element) => element.tagName === "h1" || element.tagName === "h2");
  const headingLength = heading
    ? Array.from(capacityText(heading, profile.ignoredClasses).replace(/\s+/gu, "")).length
    : 0;
  const directBlocks = section.childNodes.filter(
    (node) =>
      isElement(node) &&
      !hasAnyClass(node, profile.ignoredClasses) &&
      node.tagName !== "h1" &&
      node.tagName !== "h2" &&
      !hasAnyClass(node, profile.labelClasses),
  ).length;
  const repeatedItemCost = elements.reduce((total, element) => {
    for (const [name, cost] of profile.repeatedClassWeights ?? []) {
      if (hasClass(element, name)) return total + cost;
    }
    const repeated =
      element.tagName === "article" ||
      element.tagName === "li" ||
      element.tagName === "tr" ||
      hasAnyClass(element, profile.repeatedClasses);
    return total + (repeated ? 4 : 0);
  }, 0);
  const forcedBreaks = elements.filter((element) => element.tagName === "br").length;

  return (
    contentTokens(capacityText(section, profile.ignoredClasses)) +
    headingLength +
    directBlocks * 10 +
    repeatedItemCost +
    forcedBreaks * 8
  );
}

export function validatePresentationCapacity(
  sections: HtmlElement[],
  filename: string,
  profile: PresentationCapacityProfile,
): void {
  const oversized: string[] = [];
  for (const [index, section] of sections.entries()) {
    const cost = presentationCapacityCost(section, profile);
    if (cost <= profile.budget) continue;
    const id = section.attrs.find((attribute) => attribute.name === "id")?.value;
    const reference = id ? `#${id}` : String(index + 1);
    oversized.push(
      `${profile.unit} ${reference} exceeds the viewport content budget (${cost} > ${profile.budget}) and is likely to ${profile.consequence}; split it into another ${profile.unit}`,
    );
  }
  if (oversized.length > 0) throw new Error(`${filename}: ${oversized.join("; ")}`);
}

export function assertSafeUrl(
  element: HtmlElement,
  attribute: { name: string; value: string },
  filename: string,
): void {
  if (!URL.canParse(attribute.value, portableBase)) {
    throw new Error(`${filename}: unsafe URL in ${attribute.name}`);
  }
  const protocol = new URL(attribute.value, portableBase).protocol;
  const imageSource =
    (attribute.name === "src" && (element.tagName === "img" || element.tagName === "source")) ||
    (attribute.name === "href" && element.tagName === "image") ||
    (attribute.name === "poster" && element.tagName === "video");
  const dataImage = protocol === "data:" && imageSource && /^data:image\//i.test(attribute.value.trim());
  if (["javascript:", "vbscript:", "file:", "blob:", "data:"].includes(protocol) && !dataImage) {
    throw new Error(`${filename}: unsafe URL in ${attribute.name}`);
  }
}

export function parseObject(raw: string, filename: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filename}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function requiredString(config: Record<string, unknown>, field: string, filename: string): string {
  const value = config[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filename}: ${field} must be a non-empty string`);
  }
  return value;
}

export function language(config: Record<string, unknown>, filename: string): string {
  const value = config.lang ?? "en";
  if (typeof value !== "string") {
    throw new Error(`${filename}: lang must be a valid language tag`);
  }
  try {
    Intl.getCanonicalLocales(value);
  } catch {
    throw new Error(`${filename}: lang must be a valid language tag`);
  }
  return value;
}

export function validateFragment(content: string, filename: string): void {
  if (/<\/?(?:html|head|body)\b/i.test(content)) {
    throw new Error(`${filename}: expected fragment markup, not a complete document`);
  }

  const nodes: HtmlNode[] = [...parseFragment(content).childNodes];
  for (const node of nodes) {
    if (!("tagName" in node)) continue;
    if (node.tagName === "script" || node.tagName === "style") {
      throw new Error(`${filename}: unsafe <script> or <style> element`);
    }
    if (
      node.tagName === "meta" &&
      node.attrs.some(
        (attribute) => attribute.name === "http-equiv" && attribute.value.trim().toLowerCase() === "refresh",
      )
    ) {
      throw new Error(`${filename}: unsafe <meta http-equiv="refresh"> element`);
    }
    for (const attribute of node.attrs) {
      if (attribute.name.startsWith("on")) {
        throw new Error(`${filename}: unsafe event handler attribute ${attribute.name}`);
      }
      if (attribute.name === "srcdoc") {
        throw new Error(`${filename}: unsafe srcdoc attribute`);
      }
      if (!urlAttributes.includes(attribute.name)) continue;
      assertSafeUrl(node, attribute, filename);
    }
    nodes.push(...node.childNodes);
    if ("content" in node) nodes.push(...node.content.childNodes);
  }
}

export async function optionalFile(filename: string): Promise<string> {
  try {
    return await readFile(filename, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export function localReference(value: string): boolean {
  if (value.trim().startsWith("#")) return false;
  try {
    return new URL(value, portableBase).origin === new URL(portableBase).origin;
  } catch {
    return false;
  }
}

export function assertPortableCss(css: string, filename: string): void {
  if (/<\/style/i.test(css)) throw new Error(`${filename}: contains </style`);
  if (/\\/.test(css)) throw new Error(`${filename}: CSS escape sequences are not supported`);
  if (/@import\b/i.test(css)) throw new Error(`${filename}: CSS imports are not supported`);
  if (/(?:-webkit-)?image-set\s*\(/i.test(css)) throw new Error(`${filename}: CSS image sets are not supported`);
  for (const match of css.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)"']+))\s*\)/gi)) {
    const value = (match[2] ?? match[3] ?? "").trim();
    if (
      value &&
      URL.canParse(value, portableBase) &&
      ["javascript:", "vbscript:", "file:", "blob:"].includes(new URL(value, portableBase).protocol)
    ) {
      throw new Error(`${filename}: unsafe URL in CSS`);
    }
    if (value && localReference(value)) {
      throw new Error(`${filename}: local CSS assets are not supported; use <img>`);
    }
  }
}

export async function inlineImage(sourceRoot: string, value: string, filename: string): Promise<string> {
  const url = new URL(value, portableBase);
  const relativeName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const assetFile = await realpath(path.resolve(sourceRoot, relativeName));
  const relative = path.relative(sourceRoot, assetFile);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${filename}: asset must stay inside the project src directory`);
  }
  const mime = imageMimeTypes.get(path.extname(assetFile).toLowerCase());
  if (!mime) throw new Error(`${filename}: unsupported image type ${path.extname(assetFile) || "(none)"}`);
  return `data:${mime};base64,${(await readFile(assetFile)).toString("base64")}`;
}
