import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "parse5";

import { renderProgress } from "../src/presets/progress-render.ts";
import { parseProgress } from "../src/presets/progress-schema.ts";
import type { ProgressConfig } from "../src/presets/progress-types.ts";
import { isElement, type HtmlElement, type HtmlNode } from "../src/presets/shared.ts";

function config(): ProgressConfig {
  return {
    title: "Delivery", lang: "en", goal: "Ship the agreed workflow", updated_at: "2026-10-27T12:00:00Z", status: "blocked",
    decisions: [{ question: "Proceed?", context: "The owner must decide.", recommendation: "Proceed", links: [] }],
    phases: [{ id: "delivery", title: "Delivery", items: ["done", "active", "blocked", "next", "dropped"].map((status) => ({
      id: status, title: status, status: status as "done" | "active" | "blocked" | "next" | "dropped",
      result: "Acceptance evidence", links: [], session: "lody://session/example",
    })) }],
  };
}

function elements(node: HtmlNode): HtmlElement[] {
  return [...(isElement(node) ? [node] : []), ...("childNodes" in node ? node.childNodes.flatMap(elements) : [])];
}

const attribute = (element: HtmlElement, name: string) => element.attrs.find((entry) => entry.name === name)?.value;

test("progress derives three columns and excludes dropped work", async () => {
  const data = config();
  const nodes = elements(parse(await renderProgress(data)));
  const groups = nodes.filter((element) => attribute(element, "data-progress-group"));
  assert.deepEqual(groups.map((group) => [attribute(group, "data-progress-group"), elements(group).map((item) => attribute(item, "data-item-id")).filter(Boolean)]), [
    ["done", ["done"]], ["current", ["active", "blocked"]], ["next", ["next"]],
  ]);
  assert.equal(attribute(groups[0], "open"), undefined);
  assert.equal(attribute(nodes.find((node) => attribute(node, "data-progress-total"))!, "data-progress-total"), "4");
  assert.equal(nodes.filter((node) => attribute(node, "class") === "session-link").length, 4);
  assert.equal(nodes.find((node) => attribute(node, "class") === "decision")?.tagName, "details");
  data.decisions = [];
  assert.doesNotMatch(await renderProgress(data), /data-progress-decisions/);
});

test("progress reports incomplete, complete and empty percentages", async () => {
  const data = config();
  for (const [done, total, expected] of [[199, 200, 99], [200, 200, 100], [29, 50, 58], [0, 0, 0]]) {
    data.phases[0].items = Array.from({ length: total }, (_, index) => ({
      id: `item-${index}`, title: "Item", status: index < done ? "done" : "next", result: "Evidence", links: [],
    }));
    assert.match(await renderProgress(data), new RegExp(`class="percentage">${expected}%`));
  }
});

test("progress escapes text and link attributes", async () => {
  const data = config();
  const hostile = '</script><img src=x onerror="alert(1)">&';
  data.title = data.goal = data.phases[0].title = hostile;
  data.phases[0].items[0].title = data.phases[0].items[0].result = hostile;
  data.decisions[0].question = data.decisions[0].context = data.decisions[0].recommendation = hostile;
  const url = 'https://example.com/?q="&x=<tag>';
  data.decisions[0].links = [{ label: hostile, url }];
  const html = await renderProgress(data);
  const nodes = elements(parse(html));
  assert.equal(nodes.filter((node) => ["img", "script"].includes(node.tagName) || node.attrs.some((item) => item.name.startsWith("on"))).length, 0);
  assert.match(html, /&lt;img/);
  assert.ok(nodes.some((node) => attribute(node, "href") === url));
});

test("progress accepts evidence links and rejects dangerous schemes", () => {
  const data = config();
  for (const url of ["http://localhost:8080", "https://example.com", "lody://session/example"]) {
    data.phases[0].items[0].links = [{ label: "Evidence", url }];
    assert.doesNotThrow(() => parseProgress(JSON.stringify(data), "progress.json"));
  }
  for (const url of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/test", "ftp://example.com"]) {
    data.phases[0].items[0].links = [{ label: "Evidence", url }];
    assert.throws(() => parseProgress(JSON.stringify(data), "progress.json"));
  }
});
