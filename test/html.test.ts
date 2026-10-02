import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkEntry, main } from "../src/cli.ts";
import { listProjects, readProject, recordDeployment } from "../src/project.ts";

test("html lifecycle preserves authored reports, interactions, identity, and deployment", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-html-"));
  const entry = path.join(root, "index.html");
  try {
    await main(["create", "html", root]);
    const initial = await readProject(root);
    const minimal = await readFile(entry, "utf8");
    assert.doesNotMatch(minimal, /<style|<script|<link|React|font/i);
    await recordDeployment(root, { account: "test", provider: "cloudflare-workers", url: "https://example.com", workerName: "report" });
    const manifest = await readProject(root);
    assert.equal(manifest.projectId, initial.projectId);
    for (const body of ['<h1>Report</h1><p>Ready</p>', '<button onclick="this.textContent = Number(this.textContent) + 1">0</button><script>const state = {value: 0};</script>']) {
      const html = `<html><head><style>body { color: rebeccapurple }</style></head><body>${body}</body></html>`;
      await writeFile(entry, html);
      assert.equal(await checkEntry(root), entry);
      await main(["create", "html", root]);
      assert.equal(await readFile(entry, "utf8"), html);
      assert.deepEqual(await readProject(root), manifest);
    }
    assert.equal((await listProjects(root))[0].preset, "html");
    const html = await readFile(entry, "utf8");
    await assert.rejects(main(["create", "pitch", root]), /preset is html/);
    assert.equal(await readFile(entry, "utf8"), html);
    await mkdir(path.join(root, "assets"));
    await writeFile(path.join(root, "assets", "chart.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
    await writeFile(path.join(root, "style.css"), 'body { background: url("assets/chart.svg"); color: purple }');
    await writeFile(path.join(root, "app.js"), 'fetch("data.json").then(response => response.json())');
    await writeFile(path.join(root, "data.json"), '{"count":1}');
    const page = '<html><head><link rel="stylesheet" href="style.css"></head><body><img src="assets/chart.svg"><script src="app.js"></script></body></html>';
    await writeFile(entry, page);
    await main(["create", "html", root]);
    assert.equal(await checkEntry(root), entry);
    assert.equal(await readFile(entry, "utf8"), page);
    assert.deepEqual(await readProject(root), manifest);
    await main(["check", root]);
    await assert.rejects(main(["create", "html", root, "--output", path.join(root, "other.html")]), /--output/);
    await writeFile(entry, "<html><head></head>broken</html>");
    const before = await readFile(path.join(root, ".blueprint.json"), "utf8");
    await assert.rejects(main(["create", "html", root]), /missing <body>/);
    assert.equal(await readFile(entry, "utf8"), "<html><head></head>broken</html>");
    assert.equal(await readFile(path.join(root, ".blueprint.json"), "utf8"), before);
    await writeFile(entry, html);
    await writeFile(path.join(root, "data.json"), "{}");
    assert.equal(await checkEntry(root), entry);
    await rm(path.join(root, "data.json"));
    await writeFile(entry, '<html><head></head><body><a href="#summary">Jump</a><img src="data:image/png;base64,AA"><img src="https://example.com/photo.png"><p id="summary">Ready</p></body></html>');
    assert.equal(await checkEntry(root), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
