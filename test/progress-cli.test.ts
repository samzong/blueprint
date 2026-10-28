import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseFragment } from "parse5";

import { checkEntry, main } from "../src/cli.ts";
import { readProject } from "../src/project.ts";

test("repeated progress creation preserves source and identity and compiles edits", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-"));
  await main(["create", "progress", root]);
  const manifest = await readProject(root);
  const source = path.join(root, "src", "progress.json");
  const entry = path.join(root, "index.html");
  const prior = await readFile(entry, "utf8");
  const config = JSON.parse(await readFile(source, "utf8"));
  config.goal = "Repeated create compiles the edited JSON.";
  config.phases[0].items[0].result = "Document the {{x}} template syntax.";
  const raw = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(source, raw);
  await checkEntry(root);
  assert.equal(await readFile(entry, "utf8"), prior);
  await main(["create", "progress", root]);
  assert.equal(await readFile(source, "utf8"), raw);
  assert.deepEqual(await readProject(root), manifest);
  const html = await readFile(await checkEntry(root), "utf8");
  assert.match(html, /Repeated create compiles the edited JSON\./);
  const result = parseFragment(html.match(/<p class="result">(.*?)<\/p>/)![1]);
  assert.equal(result.childNodes.map((node) => "value" in node ? node.value : "").join(""), config.phases[0].items[0].result);
});

test("invalid progress source or output preserves the last compiled output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-invalid-"));
  await main(["create", "progress", root]);
  const entry = path.join(root, "index.html");
  const prior = await readFile(entry, "utf8");
  const source = path.join(root, "src", "progress.json");
  const config = JSON.parse(await readFile(source, "utf8"));
  config.phases[0].items[0].links = [{ label: "Unresolved", url: "https://example.com/{{name}}" }];
  for (const raw of ["{", JSON.stringify(config)]) {
    await writeFile(source, raw);
    await assert.rejects(main(["create", "progress", root]));
    assert.equal(await readFile(entry, "utf8"), prior);
  }
});
