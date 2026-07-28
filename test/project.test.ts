import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findProject,
  listProjects,
  readProject,
  recordDeployment,
  recordProject,
} from "../src/project.ts";

test("records project identity and its latest deployment", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-project-"));
  const project = path.join(directory, "demo");
  const entry = path.join(project, "index.html");
  await mkdir(project);
  await writeFile(entry, "<html><head></head><body>demo</body></html>");

  try {
    const created = await recordProject(project, "briefing", entry, "0.1.0");
    assert.equal(created.name, "demo");
    assert.equal(created.entry, "index.html");
    assert.equal(created.deployment, null);

    const found = await findProject(entry);
    assert.equal(found.root, project);
    assert.equal(found.manifest.projectId, created.projectId);

    await recordDeployment(project, {
      account: "personal",
      provider: "cloudflare-workers",
      url: "https://repo-demo.example.workers.dev",
      workerName: "repo-demo",
    });
    const rebuilt = await recordProject(project, "briefing", entry, "9.9.9");
    assert.equal(rebuilt.projectId, created.projectId);
    assert.equal(rebuilt.createdWith, "0.1.0");
    assert.equal(rebuilt.deployment?.workerName, "repo-demo");

    assert.deepEqual(await listProjects(directory), [
      {
        deployed: true,
        entry: "index.html",
        name: "demo",
        path: project,
        preset: "briefing",
        projectId: created.projectId,
        url: "https://repo-demo.example.workers.dev",
      },
    ]);
    assert.deepEqual(await readProject(project), rebuilt);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
