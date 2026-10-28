import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkEntry, main } from "../src/cli.ts";
import { readProject } from "../src/project.ts";

test("creates and recompiles a progress Artifact from its JSON source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-cli-"));
  await main(["create", "progress", root]);
  const manifest = await readProject(root);
  assert.equal(manifest.preset, "progress");
  const source = path.join(root, "src", "progress.json");
  const config = JSON.parse(await readFile(source, "utf8"));
  config.title = "Updated acceptance";
  config.phases[0].items[0].result = "The actual entrypoint now reports the updated result.";
  await writeFile(source, JSON.stringify(config));
  const entry = await checkEntry(root);
  const html = await readFile(entry, "utf8");
  assert.match(html, /Updated acceptance/);
  assert.match(html, /The actual entrypoint now reports the updated result\./);
  assert.equal(await checkEntry(entry), entry);
  assert.equal(await readFile(entry, "utf8"), html);
  await main(["create", "progress", root]);
  assert.deepEqual(await readProject(root), manifest);
  assert.deepEqual(JSON.parse(await readFile(source, "utf8")), config);
  await rm(entry);
  assert.equal(await checkEntry(root), entry);
  assert.equal(await readFile(entry, "utf8"), html);
});

test("rejects invalid progress updates before replacing the last compiled output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-invalid-"));
  await main(["create", "progress", root]);
  const entry = path.join(root, "index.html");
  const prior = await readFile(entry, "utf8");
  const source = path.join(root, "src", "progress.json");
  const config = JSON.parse(await readFile(source, "utf8"));
  config.phases[0].items[0].links = [{ label: "Unsafe", url: "javascript:alert(1)" }];
  await writeFile(source, JSON.stringify(config));
  await assert.rejects(checkEntry(root));
  assert.equal(await readFile(entry, "utf8"), prior);
});

test("preserves existing content and incompatible Artifact identities", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-existing-"));
  const sentinel = path.join(root, "notes.txt");
  await writeFile(sentinel, "Existing owner data");
  await assert.rejects(main(["create", "progress", root]));
  assert.equal(await readFile(sentinel, "utf8"), "Existing owner data");
  const other = path.join(root, "html");
  await mkdir(other);
  await main(["create", "html", other]);
  const prior = await readProject(other);
  await assert.rejects(main(["create", "progress", other]));
  assert.deepEqual(await readProject(other), prior);
});

test("recompiles a recorded custom entry without replacing the JSON source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-entry-"));
  const entry = path.join(root, "pages", "owner.html");
  await main(["create", "progress", root, "--output", entry]);
  const source = path.join(root, "src", "progress.json");
  const raw = await readFile(source, "utf8");
  const config = JSON.parse(raw);
  config.goal = "The recorded entry reflects this source update.";
  await writeFile(source, JSON.stringify(config));
  assert.equal(await checkEntry(entry), entry);
  assert.match(await readFile(entry, "utf8"), /The recorded entry reflects this source update\./);
  assert.equal(await checkEntry(root), entry);
  await assert.rejects(main(["create", "progress", root, "--output", source]));
  assert.deepEqual(JSON.parse(await readFile(source, "utf8")), config);
  const manifest = await readProject(root);
  await assert.rejects(main(["create", "progress", root, "--output", path.join(root, ".blueprint.json")]));
  assert.deepEqual(await readProject(root), manifest);
});

test("rejects progress entries outside the project before writing files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-boundary-"));
  const root = path.join(parent, "project");
  const published = `${root}-published`;
  const entry = path.join(published, "owner.html");
  await mkdir(root);
  await mkdir(published);
  await writeFile(entry, "Existing published page");
  await assert.rejects(main(["create", "progress", root, "--output", entry]));
  assert.equal(await readFile(entry, "utf8"), "Existing published page");
  assert.deepEqual(await readdir(root), []);
});

test("rejects symlink escapes and directory entries before writing files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-progress-realpath-"));
  const root = path.join(parent, "project");
  const outside = path.join(parent, "outside");
  await main(["create", "progress", root]);
  await mkdir(outside);
  await symlink(outside, path.join(root, "pub"), "dir");
  const entry = path.join(outside, "owner.html");
  await writeFile(entry, "Existing published page");
  const empty = path.join(parent, "empty");
  await mkdir(empty);
  await assert.rejects(main(["create", "progress", root, "--output", path.join(root, "pub", "owner.html")]));
  assert.equal(await readFile(entry, "utf8"), "Existing published page");
  await assert.rejects(main(["create", "progress", empty, "--output", empty]));
  assert.deepEqual(await readdir(empty), []);
});
