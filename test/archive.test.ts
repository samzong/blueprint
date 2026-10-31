import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkEntry } from "../src/cli.ts";
import { createArchive } from "../src/presets/archive.ts";

test("archive groups nested paths, emits agent files, and links sources", async () => {
  const fixture = fileURLToPath(new URL("fixtures/archive", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-tree-"));
  await cp(fixture, directory, { recursive: true });
  await writeFile(
    path.join(directory, "src", "archive.json"),
    JSON.stringify({ lang: "en", sourceUrl: "https://example.com/docs", title: "Archive" }),
  );

  const entry = await createArchive(directory);
  const generated = await readFile(entry, "utf8");
  const index = await readFile(path.join(directory, "llms.txt"), "utf8");
  const full = await readFile(path.join(directory, "llms-full.txt"), "utf8");

  assert.equal(await checkEntry(entry), entry);
  assert.match(generated, /id="agent"/);
  assert.match(generated, /id="copy-doc"/);
  assert.match(generated, /id="llms-full"/);
  assert.match(generated, /"sourceUrl":"https:\/\/example\.com\/docs\/"/);
  assert.ok(generated.includes('href="https://example.com/docs/"'));
  assert.ok(generated.includes("new URL(\"llms-full.txt\", location.href)"));
  assert.doesNotMatch(generated, /fetch\(/);

  assert.ok(index.startsWith("# Archive\n"));
  assert.ok(index.includes("> 2 documents"));
  assert.ok(index.includes("- `README.md` — Blueprint Docs"));
  assert.ok(index.includes("- `guides/01-guide.md` — User Guide"));
  assert.ok(index.includes("- `guides/01-guide.md` — User Guide — https://example.com/docs/guides/01-guide.md"));

  assert.ok(full.startsWith("# Archive\n"));
  assert.ok(full.includes("=== guides/01-guide.md · User Guide ==="));
  assert.ok(full.includes("path: README.md"));
  assert.ok(full.includes("source: https://example.com/docs/README.md"));
  assert.ok(full.includes("This is the landing document."));
});

test("archive rejects a source URL that is not http(s)", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-source-"));
  await mkdir(path.join(directory, "src", "docs"), { recursive: true });
  await writeFile(
    path.join(directory, "src", "archive.json"),
    JSON.stringify({ sourceUrl: "javascript:alert(1)", title: "Archive" }),
  );
  await writeFile(path.join(directory, "src", "docs", "README.md"), "# Archive\n");

  await assert.rejects(() => createArchive(directory), /sourceUrl must be an http\(s\) URL/);
});

test("archive builds and prunes nested navigation without losing collapsed groups", async () => {
  const fixture = fileURLToPath(new URL("fixtures/archive", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-nav-"));
  const generated = await readFile(await createArchive(fixture, path.join(directory, "index.html")), "utf8");
  const start = generated.indexOf("function buildTree(");
  const end = generated.indexOf("function flashLabel(", start);
  assert.ok(start >= 0 && end > start);
  const run = new Function(`
    const collapsedGroups = new Set();
    const activePath = "README.md";
    const loadDoc = () => {};
    class Element {
      children = [];
      listeners = {};
      isConnected = true;
      open = false;
      append(child) { this.children.push(child); }
      setAttribute() {}
      addEventListener(event, listener) { this.listeners[event] = listener; }
      toggle(open) { this.open = open; this.listeners.toggle(); }
    }
    const document = { createElement: () => new Element() };
    ${generated.slice(start, end)}
    const tree = buildTree([
      { path: "guides/nested/install.md", title: "Install" },
      { path: "guides/start.md", title: "Start" },
      { path: "README.md", title: "Home" },
      { path: "reference/api.md", title: "API" },
    ]);
    const initial = new Element();
    renderTree(tree, initial, false);
    const group = initial.children[1];
    group.toggle(false);
    const filtered = new Element();
    renderTree(pruneTree(tree, "INSTALL".toLowerCase()), filtered, true);
    const filteringOpen = filtered.children[0].open;
    filtered.children[0].toggle(true);
    const restored = new Element();
    renderTree(tree, restored, false);
    group.isConnected = false;
    group.toggle(true);
    const afterStaleEvent = new Element();
    renderTree(tree, afterStaleEvent, false);
    const shape = (nodes) => nodes.map(node => node.kind === "document"
      ? node.document.path : { path: node.path, children: shape(node.children) });
    return {
      tree: shape(tree),
      pruned: shape(pruneTree(tree, "install")),
      noMatches: pruneTree(tree, "missing").length,
      filteringOpen,
      restoredOpen: restored.children[1].open,
      afterStaleEventOpen: afterStaleEvent.children[1].open,
    };
  `);
  assert.deepEqual(run(), {
    tree: ["README.md", { path: "guides", children: ["guides/start.md", {
      path: "guides/nested", children: ["guides/nested/install.md"],
    }] }, { path: "reference", children: ["reference/api.md"] }],
    pruned: [{ path: "guides", children: [{
      path: "guides/nested", children: ["guides/nested/install.md"],
    }] }],
    noMatches: 0,
    filteringOpen: true,
    restoredOpen: false,
    afterStaleEventOpen: false,
  });
});
