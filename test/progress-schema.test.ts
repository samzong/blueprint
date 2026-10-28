import assert from "node:assert/strict";
import test from "node:test";

import { parseProgress } from "../src/presets/progress-schema.ts";

function source() {
  return {
    title: "Delivery acceptance",
    goal: "Ship the accepted workflow",
    updated_at: "2026-10-27T12:00:00-04:00",
    status: "on_track",
    phases: [{ id: "build", title: "Build", items: [{
      id: "schema", title: "Validate input", status: "active", result: "Validation is in progress",
    }] }],
  };
}

function parse(value: unknown) {
  return parseProgress(JSON.stringify(value), "src/progress.json");
}

test("normalizes defaults and preserves recovery metadata and supported links", () => {
  const minimal = parse(source());
  assert.equal(minimal.lang, "en");
  assert.deepEqual(minimal.decisions, []);
  assert.deepEqual(minimal.phases[0].items[0].links, []);
  const links = ["https://example.com/pr/1", "http://localhost:8080/", "lody://session/abc?workspace=def"]
    .map((url) => ({ label: "Evidence", url }));
  const item = { ...source().phases[0].items[0], links, session: links[2].url, operation: "operation-1", owner: "Build Standard" };
  const config = parse({ ...source(), lang: "zh-CN",
    phases: [{ id: "build", title: "Build", items: [item] }],
    decisions: [{ question: "Keep the fallback?", context: "It adds a manual step on failure.", recommendation: "Drop it" }],
  });
  assert.equal(config.lang, "zh-CN");
  assert.deepEqual(config.phases[0].items[0], item);
  assert.deepEqual(config.decisions[0].links, []);
  assert.deepEqual(parse({ ...source(), phases: [{ id: "plan", title: "Plan", items: [] }] }).phases[0].items, []);
});

test("rejects invalid JSON shapes, missing fields, and invalid nested records", () => {
  for (const value of [null, [], true, "text"]) assert.throws(() => parse(value));
  assert.throws(() => parseProgress("{", "src/progress.json"));
  for (const field of ["title", "goal", "updated_at", "status", "phases"]) {
    const config: Record<string, unknown> = source();
    delete config[field];
    assert.throws(() => parse(config), field);
  }
  for (const value of [null, {}, "text", 1]) {
    assert.throws(() => parse({ ...source(), phases: value }));
    assert.throws(() => parse({ ...source(), decisions: value }));
    assert.throws(() => parse({ ...source(), phases: [{ id: "p", title: "Plan", items: value }] }));
  }
  for (const entry of [null, [], "text", {}]) {
    assert.throws(() => parse({ ...source(), phases: [entry] }));
    assert.throws(() => parse({ ...source(), decisions: [entry] }));
    assert.throws(() => parse({ ...source(), phases: [{ id: "p", title: "Plan", items: [entry] }] }));
  }
  for (const lang of ["", "invalid_tag", null, 1]) assert.throws(() => parse({ ...source(), lang }));
});

test("accepts exactly the declared document and item statuses", () => {
  for (const status of ["on_track", "at_risk", "blocked", "done"]) assert.equal(parse({ ...source(), status }).status, status);
  for (const status of ["done", "active", "next", "blocked", "dropped"]) {
    const config = source();
    config.phases[0].items[0].status = status;
    assert.equal(parse(config).phases[0].items[0].status, status);
  }
  for (const status of ["active", "DONE", "done ", "", null, 1]) assert.throws(() => parse({ ...source(), status }));
  for (const status of ["on_track", "DONE", "active ", "", null, 1]) {
    assert.throws(() => parse({ ...source(), phases: [{ id: "p", title: "Plan", items: [{ ...source().phases[0].items[0], status }] }] }));
  }
});

test("enforces slug syntax and uniqueness across phases and items", () => {
  for (const id of ["", "-start", "a b", "a/b", "a\n", "x".repeat(65)]) {
    assert.throws(() => parse({ ...source(), phases: [{ id, title: "Plan", items: [] }] }));
  }
  assert.equal(parse({ ...source(), phases: [{ id: `A_${"x".repeat(62)}`, title: "Plan", items: [] }] }).phases[0].id.length, 64);
  for (const phases of [
    [{ id: "build", title: "Build", items: [] }, { id: "build", title: "Repeat", items: [] }],
    [{ id: "schema", title: "Build", items: source().phases[0].items }],
    [source().phases[0], { id: "review", title: "Review", items: source().phases[0].items }],
    [source().phases[0], { id: "schema", title: "Review", items: [] }],
  ]) assert.throws(() => parse({ ...source(), phases }));
});

test("rejects unsafe, relative, credential-bearing, and control-character URLs", () => {
  const urls = ["javascript:alert(1)", "file:///tmp/test", "data:text/html,test", "vbscript:msgbox(1)",
    "blob:https://example.com/id", "ftp://example.com/", "/relative", "//example.com/", "#section", "https://",
    "lody:session/abc", "lody:///session/abc", "https://user:password@example.com/", "lody://user@session/abc",
    "https://example.com/\npath", "https://exam\tple.com/", "https://example.com/\u0000", "https://example.com/\u007f",
    "https://example.com/\u0085"];
  for (const url of urls) {
    const item = { ...source().phases[0].items[0], links: [{ label: "Evidence", url }] };
    const phases = [{ id: "p", title: "Plan", items: [item] }];
    assert.throws(() => parse({ ...source(), phases }), url);
    assert.throws(() => parse({ ...source(), phases: [{ ...phases[0], items: [{ ...item, links: [], session: url }] }] }), url);
    assert.throws(() => parse({ ...source(), decisions: [{ question: "Proceed?", context: "A choice is needed", recommendation: "Proceed", links: item.links }] }), url);
  }
});

test("validates calendar dates and timezone bounds without date rollover", () => {
  for (const updated_at of ["2024-02-29T23:59:59Z", "2000-02-29T00:00:00.123+05:30", "2026-12-31T23:59:59-08:00"]) {
    assert.equal(parse({ ...source(), updated_at }).updated_at, updated_at);
  }
  for (const updated_at of ["2026-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T00:00:00Z",
    "2026-01-00T00:00:00Z", "2026-13-01T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T12:60:00Z",
    "2026-01-01T12:00:60Z", "2026-01-01T12:00:00+24:00", "2026-01-01T12:00:00+00:60",
    "2026-01-01T12:00:00", "2026-01-01", "October 27, 2026", "2026-01-01T12:00:00Z trailing", "2026-01-01T12:00:00Z\n"]) {
    assert.throws(() => parse({ ...source(), updated_at }), updated_at);
  }
});

test("requires non-empty bounded text throughout the document", () => {
  const item = source().phases[0].items[0];
  const decision = { question: "Proceed?", context: "A choice is needed", recommendation: "Proceed" };
  const cases: [number, (value: unknown) => unknown][] = [
    [120, (value) => ({ ...source(), title: value })],
    [240, (value) => ({ ...source(), goal: value })],
    [120, (value) => ({ ...source(), phases: [{ id: "p", title: value, items: [] }] })],
    ...(["title", "result", "owner", "operation"] as const).map((field): [number, (value: unknown) => unknown] => [
      field === "title" ? 120 : 240,
      (value) => ({ ...source(), phases: [{ id: "p", title: "Plan", items: [{ ...item, [field]: value }] }] }),
    ]),
    ...(["question", "context", "recommendation"] as const).map((field): [number, (value: unknown) => unknown] => [
      field === "question" ? 160 : field === "context" ? 480 : 240,
      (value) => ({ ...source(), decisions: [{ ...decision, [field]: value }] }),
    ]),
    [80, (value) => ({ ...source(), decisions: [{ ...decision, links: [{ label: value, url: "https://example.com" }] }] })],
  ];
  for (const [limit, build] of cases) {
    assert.doesNotThrow(() => parse(build("x".repeat(limit))));
    for (const value of ["", " \n ", null, 1, "x".repeat(limit + 1)]) assert.throws(() => parse(build(value)));
  }
  assert.doesNotThrow(() => parse({ ...source(), title: "😀".repeat(120) }));
  assert.throws(() => parse({ ...source(), phases: [{ id: "p", title: "Plan", items: [{ ...item, session: `https://example.com/${"x".repeat(240)}` }] }] }));
});

test("bounds collection sizes including total items across phases", () => {
  assert.throws(() => parse({ ...source(), phases: [] }));
  const phases = Array.from({ length: 20 }, (_, index) => ({ id: `p${index}`, title: "Phase", items: [] }));
  assert.equal(parse({ ...source(), phases }).phases.length, 20);
  assert.throws(() => parse({ ...source(), phases: [...phases, { id: "extra", title: "Extra", items: [] }] }));
  const items = Array.from({ length: 200 }, (_, index) => ({ ...source().phases[0].items[0], id: `i${index}` }));
  const full = { ...source(), phases: [{ id: "p", title: "Plan", items }] };
  assert.equal(parse(full).phases[0].items.length, 200);
  assert.throws(() => parse({ ...full, phases: [...full.phases, { id: "extra", title: "Extra", items: [{ ...items[0], id: "overflow" }] }] }));
  const decision = { question: "Proceed?", context: "A choice is needed", recommendation: "Proceed" };
  assert.equal(parse({ ...source(), decisions: Array(10).fill(decision) }).decisions.length, 10);
  assert.throws(() => parse({ ...source(), decisions: Array(11).fill(decision) }));
  const link = { label: "Evidence", url: "https://example.com" };
  assert.equal(parse({ ...source(), decisions: [{ ...decision, links: Array(8).fill(link) }] }).decisions[0].links.length, 8);
  assert.throws(() => parse({ ...source(), decisions: [{ ...decision, links: Array(9).fill(link) }] }));
  for (const links of [null, {}, [null], [{ label: "Evidence", url: "x".repeat(2049) }], Array(9).fill(link)]) {
    assert.throws(() => parse({ ...source(), phases: [{ id: "p", title: "Plan", items: [{ ...items[0], links }] }] }));
  }
});
