import { readFile } from "node:fs/promises";

import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    for (const attribute of node.attrs) {
      if (attribute.name.startsWith("on")) {
        throw new Error(`${filename}: unsafe event handler attribute ${attribute.name}`);
      }
      if (attribute.name === "srcdoc") {
        throw new Error(`${filename}: unsafe srcdoc attribute`);
      }
      if (!["href", "src", "xlink:href", "action", "formaction"].includes(attribute.name)) continue;

      if (!URL.canParse(attribute.value, "https://blueprint.invalid")) {
        throw new Error(`${filename}: unsafe URL in ${attribute.name}`);
      }
      const protocol = new URL(attribute.value, "https://blueprint.invalid").protocol;
      // parse5 reports SVG `xlink:href` as name "href" with prefix "xlink".
      const imageSource =
        (attribute.name === "src" && (node.tagName === "img" || node.tagName === "source")) ||
        (attribute.name === "href" && node.tagName === "image");
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
