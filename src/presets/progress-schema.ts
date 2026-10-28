import type { ProgressConfig, ProgressLink } from "./progress-types.ts";
import { language, parseObject, requiredString } from "./shared.ts";

function object(value: unknown, filename: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filename}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, filename: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${filename}: expected an array`);
  return value;
}

function enumeration<const T extends readonly string[]>(
  config: Record<string, unknown>, field: string, values: T, filename: string,
): T[number] {
  const value = requiredString(config, field, filename);
  if (!values.includes(value)) throw new Error(`${filename}: invalid ${field}`);
  return value;
}

function url(config: Record<string, unknown>, field: string, filename: string): string {
  const value = requiredString(config, field, filename);
  try {
    const parsed = new URL(value);
    if (!["http:", "https:", "lody:"].includes(parsed.protocol)) throw new Error();
    if (parsed.protocol === "lody:" && !/^lody:\/\//i.test(value)) throw new Error();
  } catch {
    throw new Error(`${filename}: ${field} must be an HTTP, HTTPS, or Lody URL`);
  }
  return value;
}

function links(value: unknown, filename: string): ProgressLink[] {
  return array(value === undefined ? [] : value, filename).map((entry) => {
    const link = object(entry, filename);
    return { label: requiredString(link, "label", filename), url: url(link, "url", filename) };
  });
}

export function parseProgress(raw: string, filename: string): ProgressConfig {
  const config = parseObject(raw, filename);
  const ids = new Set<string>();
  const id = (entry: Record<string, unknown>): string => {
    const value = requiredString(entry, "id", filename);
    if (value !== value.trim() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value) || ids.has(value)) {
      throw new Error(`${filename}: id must be a unique slug across phases and items`);
    }
    ids.add(value);
    return value;
  };
  const updated_at = requiredString(config, "updated_at", filename);
  if (updated_at !== updated_at.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(updated_at)) {
    throw new Error(`${filename}: updated_at must be an ISO timestamp with a timezone`);
  }
  return {
    title: requiredString(config, "title", filename),
    lang: language(config, filename),
    goal: requiredString(config, "goal", filename),
    updated_at,
    status: enumeration(config, "status", ["on_track", "at_risk", "blocked", "done"], filename),
    decisions: array(config.decisions === undefined ? [] : config.decisions, filename).map((entry) => {
      const decision = object(entry, filename);
      return {
        question: requiredString(decision, "question", filename),
        context: requiredString(decision, "context", filename),
        recommendation: requiredString(decision, "recommendation", filename),
        links: links(decision.links, filename),
      };
    }),
    phases: array(config.phases, filename).map((entry) => {
      const phase = object(entry, filename);
      return {
        id: id(phase),
        title: requiredString(phase, "title", filename),
        items: array(phase.items, filename).map((entry) => {
          const item = object(entry, filename);
          return {
            id: id(item),
            title: requiredString(item, "title", filename),
            status: enumeration(item, "status", ["done", "active", "next", "blocked", "dropped"], filename),
            result: requiredString(item, "result", filename),
            links: links(item.links, filename),
            ...(item.session === undefined ? {} : { session: url(item, "session", filename) }),
          };
        }),
      };
    }),
  };
}
