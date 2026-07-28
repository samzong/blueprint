import { readFile } from "node:fs/promises";

import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

// Attributes that carry a URL, and so must be protocol-checked wherever markup is validated.
export const urlAttributes = ["href", "src", "xlink:href", "action", "formaction", "poster", "data", "cite"];

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

  const nodes: DefaultTreeAdapterMap["node"][] = [...parseFragment(content).childNodes];
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

      if (!URL.canParse(attribute.value, "https://blueprint.invalid")) {
        throw new Error(`${filename}: unsafe URL in ${attribute.name}`);
      }
      const protocol = new URL(attribute.value, "https://blueprint.invalid").protocol;
      // parse5 reports SVG `xlink:href` as name "href" with prefix "xlink".
      const imageSource =
        (attribute.name === "src" && (node.tagName === "img" || node.tagName === "source")) ||
        (attribute.name === "href" && node.tagName === "image") ||
        (attribute.name === "poster" && node.tagName === "video");
      const dataImage = protocol === "data:" && imageSource && /^data:image\//i.test(attribute.value.trim());
      if (["javascript:", "vbscript:", "file:", "data:"].includes(protocol) && !dataImage) {
        throw new Error(`${filename}: unsafe URL in ${attribute.name}`);
      }
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
