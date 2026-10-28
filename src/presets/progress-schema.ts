import { parseFragment } from "parse5";

import type { ProgressConfig, ProgressDecision, ProgressItem, ProgressLink } from "./progress-types.ts";
import { assertSafeUrl, isElement, language, parseObject, requiredString } from "./shared.ts";

const linkElement = parseFragment("<a></a>").childNodes.find(isElement)!;
const itemStatuses = ["done", "active", "next", "blocked", "dropped"] as const;
const statuses = ["on_track", "at_risk", "blocked", "done"] as const;

function object(value: unknown, filename: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filename}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function text(config: Record<string, unknown>, field: string, limit: number, filename: string): string {
  const value = requiredString(config, field, filename);
  if (Array.from(value).length > limit) {
    throw new Error(`${filename}: ${field} exceeds ${limit} characters`);
  }
  return value;
}

function array(value: unknown, limit: number, filename: string): unknown[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error(`${filename}: expected an array with at most ${limit} entries`);
  }
  return value;
}

function enumeration<const T extends readonly string[]>(
  config: Record<string, unknown>, field: string, values: T, filename: string,
): T[number] {
  const value = requiredString(config, field, filename);
  if (!values.includes(value)) throw new Error(`${filename}: invalid ${field}`);
  return value;
}

function url(config: Record<string, unknown>, field: string, limit: number, filename: string): string {
  const value = text(config, field, limit, filename);
  assertSafeUrl(linkElement, { name: "href", value }, filename);
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value) || !/^(?:https?|lody):\/\//i.test(value)) {
    throw new Error(`${filename}: ${field} must be an absolute HTTP, HTTPS, or Lody URL`);
  }
  const parsed = new URL(value);
  if (!["http:", "https:", "lody:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error(`${filename}: ${field} must have a host and no credentials`);
  }
  return value;
}

function links(value: unknown, filename: string): ProgressLink[] {
  return array(value === undefined ? [] : value, 8, filename).map((entry, index) => {
    const location = `${filename}.links[${index}]`;
    const config = object(entry, location);
    return { label: text(config, "label", 80, location), url: url(config, "url", 2048, location) };
  });
}

function timestamp(config: Record<string, unknown>, filename: string): string {
  const value = text(config, "updated_at", 64, filename);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match || match[0] !== value) throw new Error(`${filename}: updated_at must be an ISO 8601 timestamp with a timezone`);
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 ||
    Number(match[8] ?? 0) > 23 || Number(match[9] ?? 0) > 59 || !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${filename}: updated_at must be a valid calendar date and time`);
  }
  return value;
}

export function parseProgress(raw: string, filename: string): ProgressConfig {
  const config = parseObject(raw, filename);
  if (config.lang !== undefined) text(config, "lang", 80, filename);
  const ids = new Set<string>();
  const id = (entry: Record<string, unknown>, location: string): string => {
    const value = text(entry, "id", 64, location);
    if (value !== value.trim() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value) || ids.has(value)) {
      throw new Error(`${location}: id must be a unique slug across all phases and items`);
    }
    ids.add(value);
    return value;
  };
  let itemCount = 0;
  const phases = array(config.phases, 20, `${filename}.phases`).map((entry, phaseIndex) => {
    const location = `${filename}.phases[${phaseIndex}]`;
    const phase = object(entry, location);
    const phaseId = id(phase, location);
    const items = array(phase.items, 200, `${location}.items`);
    itemCount += items.length;
    if (itemCount > 200) throw new Error(`${filename}: at most 200 items are allowed in total`);
    return {
      id: phaseId,
      title: text(phase, "title", 120, location),
      items: items.map((entry, itemIndex): ProgressItem => {
        const itemLocation = `${location}.items[${itemIndex}]`;
        const item = object(entry, itemLocation);
        return {
          id: id(item, itemLocation),
          title: text(item, "title", 120, itemLocation),
          status: enumeration(item, "status", itemStatuses, itemLocation),
          result: text(item, "result", 240, itemLocation),
          links: links(item.links, itemLocation),
          ...(item.session === undefined ? {} : { session: url(item, "session", 240, itemLocation) }),
          ...(item.operation === undefined ? {} : { operation: text(item, "operation", 240, itemLocation) }),
          ...(item.owner === undefined ? {} : { owner: text(item, "owner", 240, itemLocation) }),
        };
      }),
    };
  });
  if (phases.length === 0) throw new Error(`${filename}: at least one phase is required`);
  const decisions = array(config.decisions === undefined ? [] : config.decisions, 10, `${filename}.decisions`)
    .map((entry, index): ProgressDecision => {
      const location = `${filename}.decisions[${index}]`;
      const decision = object(entry, location);
      return {
        question: text(decision, "question", 160, location),
        context: text(decision, "context", 480, location),
        recommendation: text(decision, "recommendation", 240, location),
        links: links(decision.links, location),
      };
    });
  return {
    title: text(config, "title", 120, filename),
    lang: language(config, filename),
    goal: text(config, "goal", 240, filename),
    updated_at: timestamp(config, filename),
    status: enumeration(config, "status", statuses, filename),
    decisions,
    phases,
  };
}
