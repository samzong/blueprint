import assert from "node:assert/strict";
import test from "node:test";

import { parse } from "parse5";

import { renderProgress } from "../src/presets/progress-render.ts";
import type { ProgressConfig } from "../src/presets/progress-types.ts";
import { isElement, type HtmlElement, type HtmlNode } from "../src/presets/shared.ts";
import { progressLabels } from "../src/shared/i18n/progress.ts";

function config(): ProgressConfig {
  return {
    title: "Delivery status",
    lang: "en",
    goal: "Ship the accepted workflow",
    updated_at: "2026-10-27T12:00:00Z",
    status: "blocked",
    decisions: [{ question: "Keep the old workflow?", context: "Existing users need a migration.", recommendation: "Keep it for one release.", links: [{ label: "Issue", url: "https://example.com/issues/1" }] }],
    phases: [{
      id: "delivery",
      title: "Delivery",
      items: [
        { id: "done", title: "Accepted design", status: "done", result: "Design accepted", links: [{ label: "Pull request", url: "https://example.com/pull/2" }] },
        { id: "active", title: "Implement workflow", status: "active", result: "Implementation in progress", links: [], session: "lody://session/123", operation: "operation-123", owner: "Build Standard" },
        { id: "blocked", title: "Check access", status: "blocked", result: "Access needs an owner decision", links: [] },
        { id: "next", title: "Verify release", status: "next", result: "Ready after implementation", links: [] },
        { id: "dropped", title: "Old migration", status: "dropped", result: "Migration no longer needed", links: [] },
      ],
    }],
  };
}

function elements(node: HtmlNode): HtmlElement[] {
  return [...(isElement(node) ? [node] : []), ...("childNodes" in node ? node.childNodes.flatMap(elements) : [])];
}

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((entry) => entry.name === name)?.value;
}

function textContent(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textContent).join("") : "";
}

test("render derives compact status columns and excludes dropped items", async () => {
  const data = config();
  const nodes = elements(parse(await renderProgress(data)));
  const root = nodes.find((element) => element.tagName === "html")!;
  assert.equal(attribute(root, "data-blueprint-preset"), "progress");
  const total = nodes.find((element) => attribute(element, "data-progress-total"))!;
  assert.equal(attribute(total, "data-progress-total"), "4");
  assert.equal(attribute(total, "data-progress-done"), "1");
  const groups = nodes.filter((element) => attribute(element, "data-progress-group"));
  assert.equal(groups.length, 3);
  const expected = new Map([
    ["current", ["active", "blocked"]], ["next", ["next"]], ["done", ["done"]],
  ]);
  for (const group of groups) {
    const ids = elements(group).map((element) => attribute(element, "data-item-id")).filter(Boolean);
    assert.deepEqual(ids, expected.get(attribute(group, "data-progress-group")!));
  }
  const plan = nodes.find((element) => attribute(element, "class") === "progress-track")!;
  assert.equal(elements(plan).filter((element) => attribute(element, "data-item-id")).length, 0);
  const progress = elements(plan).find((element) => element.tagName === "progress")!;
  assert.equal(attribute(progress, "max"), "4");
  assert.equal(attribute(progress, "value"), "1");
  for (const item of data.phases[0].items) {
    const rows = nodes.filter((element) => attribute(element, "data-item-id") === item.id);
    assert.equal(rows.length, item.status === "dropped" ? 0 : 1);
    if (item.status === "dropped") continue;
    const detail = elements(rows[0]).find((element) => element.tagName === "details")!;
    assert.equal(attribute(detail, "open"), undefined);
    const summary = detail.childNodes.find((node) => isElement(node) && node.tagName === "summary")!;
    assert.ok(textContent(summary).includes(item.title));
    assert.ok(!textContent(summary).includes(item.result));
    assert.equal(elements(detail).filter((element) => element.tagName === "p" && textContent(element) === item.result).length, 1);
  }
  const completed = groups.find((element) => attribute(element, "data-progress-group") === "done")!;
  assert.equal(completed.tagName, "details");
  assert.equal(attribute(completed, "open"), undefined);
  const session = nodes.find((element) => attribute(element, "class") === "session-link")!;
  assert.equal(attribute(session, "href"), data.phases[0].items[1].session);
  const recovery = nodes.find((element) => attribute(element, "class") === "item")!;
  assert.equal(recovery.tagName, "details");
  assert.equal(attribute(recovery, "open"), undefined);
});

test("render is deterministic and decisions are absent when no decision is needed", async () => {
  const data = config();
  assert.equal(await renderProgress(data), await renderProgress(structuredClone(data)));
  data.decisions = [];
  const nodes = elements(parse(await renderProgress(data)));
  assert.equal(nodes.filter((element) => attribute(element, "data-progress-decisions") !== undefined).length, 0);
});

test("render escapes source text and attributes as inert markup", async () => {
  const data = config();
  const hostile = `</script><img src=x onerror="alert('injected')">&`;
  data.title = hostile;
  data.goal = hostile;
  data.phases[0].title = hostile;
  data.phases[0].items[1].id = hostile;
  data.phases[0].items[1].title = hostile;
  data.phases[0].items[1].result = hostile;
  data.phases[0].items[1].owner = hostile;
  data.phases[0].items[1].operation = hostile;
  data.phases[0].items[1].session = `lody://session/example?x="&y=<tag>`;
  data.decisions = [{ question: hostile, context: hostile, recommendation: hostile, links: [{ label: hostile, url: `https://example.com/?x="&y=<tag>` }] }];
  const nodes = elements(parse(await renderProgress(data)));
  assert.equal(nodes.filter((element) => element.tagName === "img").length, 0);
  assert.equal(nodes.filter((element) => element.attrs.some((entry) => entry.name.startsWith("on"))).length, 0);
  assert.equal(textContent(nodes.find((element) => element.tagName === "h1")!), hostile);
  assert.equal(attribute(nodes.find((element) => attribute(element, "data-item-id") === hostile)!, "data-item-id"), hostile);
  const scripts = nodes.filter((element) => element.tagName === "script");
  assert.equal(scripts.length, 0);
  assert.ok(nodes.some((element) => attribute(element, "href") === data.decisions[0].links[0].url));
  assert.ok(nodes.some((element) => attribute(element, "href") === data.phases[0].items[1].session));
});

test("render handles all-dropped phases and localizes the static interface", async () => {
  const data = config();
  data.phases[0].items = data.phases[0].items.filter((item) => item.status === "dropped");
  data.lang = "zh-CN";
  const nodes = elements(parse(await renderProgress(data)));
  const total = nodes.find((element) => attribute(element, "data-progress-total"))!;
  assert.equal(attribute(total, "data-progress-total"), "0");
  assert.equal(attribute(total, "data-progress-done"), "0");
  const bar = nodes.find((element) => element.tagName === "progress")!;
  assert.equal(bar, undefined);
  assert.equal(nodes.filter((element) => attribute(element, "data-item-id")).length, 0);
  const english = progressLabels("en");
  const localized = progressLabels(data.lang);
  assert.deepEqual(Object.keys(localized), Object.keys(english));
  assert.equal(attribute(nodes.find((element) => element.tagName === "time")!, "datetime"), data.updated_at);
  assert.ok(textContent(nodes.find((element) => attribute(element, "id") === "current-title")!).includes(localized.current));
});

test("render places decision context behind a native disclosure", async () => {
  const data = config();
  const nodes = elements(parse(await renderProgress(data)));
  const decision = nodes.find((element) => attribute(element, "class") === "decision")!;
  assert.equal(decision.tagName, "details");
  assert.equal(attribute(decision, "open"), undefined);
  const summary = decision.childNodes.find((node) => isElement(node) && node.tagName === "summary")!;
  assert.ok(textContent(summary).includes(data.decisions[0].question));
  assert.ok(textContent(summary).includes(data.decisions[0].recommendation));
  assert.ok(!textContent(summary).includes(data.decisions[0].context));
  assert.ok(textContent(decision).includes(data.decisions[0].context));
});

test("render weights phase segments and marks the phase with active work", async () => {
  const data = config();
  data.phases[0].items = [data.phases[0].items[2], data.phases[0].items[0]];
  data.phases.push({ id: "implementation", title: "Implementation", items: [
    { id: "coding", title: "Implement", status: "active", result: "In progress", links: [] },
  ] });
  const nodes = elements(parse(await renderProgress(data)));
  const current = nodes.find((element) => attribute(element, "aria-current") === "step")!;
  assert.ok(textContent(current).includes("Implementation"));
  const bars = nodes.filter((element) => element.tagName === "progress");
  assert.deepEqual(bars.map((bar) => [attribute(bar, "value"), attribute(bar, "max")]), [["1", "2"], ["0", "1"]]);
  assert.equal(textContent(nodes.find((element) => attribute(element, "class") === "percentage")!), "33%");
});

test("render reports integer completion without premature 100 percent", async () => {
  const data = config();
  for (const [completed, total, expected] of [[199, 200, "99%"], [200, 200, "100%"], [29, 50, "58%"], [0, 0, "0%"]] as const) {
    data.phases[0].items = Array.from({ length: total }, (_, index) => ({
      id: `item-${index}`,
      title: `Acceptance item ${index}`,
      status: index < completed ? "done" : "next",
      result: "Acceptance evidence recorded.",
      links: [],
    }));
    const nodes = elements(parse(await renderProgress(data)));
    assert.equal(textContent(nodes.find((element) => attribute(element, "class") === "percentage")!), expected);
  }
});
