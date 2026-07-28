import { readFile } from "node:fs/promises";

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
  if (/<\/?(?:script|style)\b/i.test(content)) {
    throw new Error(`${filename}: unsafe <script> or <style> element`);
  }
  if (/<\/?(?:html|head|body)\b/i.test(content)) {
    throw new Error(`${filename}: expected fragment markup, not a complete document`);
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
