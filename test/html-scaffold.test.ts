import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { checkEntry } from "../src/cli.ts";
import { createScaffold } from "../src/presets/scaffold.ts";

const repository = fileURLToPath(new URL("..", import.meta.url));

test("scaffolds an html entry with an inline empty icon and resolved title", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-html-"));
  try {
    const directory = path.join(parent, "cache-study");
    const entry = await createScaffold("html", directory);
    const generated = await readFile(entry, "utf8");

    assert.equal(await checkEntry(entry), entry);
    assert.match(generated, /<title>Cache Study<\/title>/);
    assert.match(generated, /<link rel="icon" href="data:,">/);
    assert.doesNotMatch(generated, /__[A-Z0-9_]+__/);
  } finally {
    await rm(parent, { force: true, recursive: true });
  }
});

test("bundled rendered-acceptance browser probes parse as standalone expressions", async () => {
  for (const scriptName of ["rendered-acceptance-probe.js", "svg-acceptance-probe.js"]) {
    const scriptPath = path.join(repository, "skill", "blueprint", "scripts", scriptName);
    const source = await readFile(scriptPath, "utf8");
    assert.doesNotThrow(() => new vm.Script(`() => (${source})`, { filename: scriptName }));
  }
});
