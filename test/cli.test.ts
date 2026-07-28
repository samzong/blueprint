import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkEntry, entryUrl, formatProjectList, parseArgs } from "../src/cli.ts";
import { createBriefing } from "../src/presets/briefing.ts";
import { createPitch } from "../src/presets/pitch.ts";
import { createScaffold } from "../src/presets/scaffold.ts";
import { language, validateFragment } from "../src/presets/shared.ts";

test("parses a safe local preview", () => {
  assert.deepEqual(
    parseArgs(["preview", "demo/index.html", "--root", "demo", "--port", "4175"]),
    {
      command: "preview",
      target: "demo/index.html",
      root: "demo",
      port: 4175,
    },
  );
});

test("parses an explicit Worker deployment", () => {
  assert.deepEqual(
    parseArgs(["deploy", "dist", "--name", "blueprint-demo", "--account", "personal"]),
    {
      account: "personal",
      command: "deploy",
      name: "blueprint-demo",
      port: 4175,
      target: "dist",
    },
  );
  assert.throws(() => parseArgs(["deploy", "dist"]), /--name is required/);
});

test("parses project listing", () => {
  assert.deepEqual(parseArgs(["list"]), {
    command: "list",
    json: false,
    port: 4175,
    root: undefined,
    target: ".",
  });
  assert.deepEqual(parseArgs(["list", "--root", "projects", "--json"]), {
    command: "list",
    json: true,
    port: 4175,
    root: "projects",
    target: ".",
  });
  assert.throws(() => parseArgs(["list", "all"]), /does not accept positional arguments/);
});

test("formats project lists without forcing long fields onto one line", () => {
  assert.equal(
    formatProjectList([
      {
        deployed: true,
        entry: "index.html",
        name: "tokener-demo-day",
        path: "/Users/x/git/lg/ai-gateway/.local/tokener-demo-day-blueprint",
        preset: "briefing",
        projectId: "project-id",
        url: "https://ai-gateway-tokener-demo-day.samzong.workers.dev",
      },
    ]),
    "● tokener-demo-day  deployed\n" +
      "  ├─ preset   briefing\n" +
      "  ├─ local    /Users/x/git/lg/ai-gateway/.local/tokener-demo-day-blueprint\n" +
      "  └─ remote   https://ai-gateway-tokener-demo-day.samzong.workers.dev\n",
  );
});

test("keeps dot-prefixed paths inside the preview root", () => {
  const root = path.resolve("blueprint-preview");

  assert.equal(
    entryUrl(path.join(root, "..safe", "index.html"), root, 4175),
    "http://127.0.0.1:4175/..safe/index.html",
  );
  assert.throws(() => entryUrl(path.resolve(root, "../index.html"), root, 4175), /entry must be inside preview root/);
});

test("validates language tags with the platform parser", () => {
  assert.equal(language({ lang: "zh-Hans-CN" }, "config.json"), "zh-Hans-CN");
  for (const lang of ["en-", "en--US", "e1"]) {
    assert.throws(() => language({ lang }, "config.json"), /lang must be a valid language tag/);
  }
});

test("rejects executable fragment markup", () => {
  for (const tag of ["script", "style"]) {
    assert.throws(() => validateFragment(`<${tag}></${tag}>`, "fragment.html"), /unsafe <script> or <style>/);
  }
});

test("rejects file URLs in generated HTML", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-"));
  const entry = path.join(directory, "index.html");
  await writeFile(entry, '<html><head></head><body><a href="file:///tmp/paper.pdf">PDF</a></body></html>');

  await assert.rejects(checkEntry(entry), /contains file:\/\/ URLs/);
});


test("creates a portable pitch from semantic source files", async () => {
  const fixture = fileURLToPath(new URL("fixtures/pitch", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-pitch-"));
  const output = path.join(directory, "index.html");

  const entry = await createPitch(fixture, output);
  const generated = await readFile(entry, "utf8");

  assert.equal(await checkEntry(entry), entry);
  assert.match(generated, /data-deck-selector="section"/);
  assert.match(generated, /--accent: #2563eb/);
  assert.match(generated, /Build the brief/);
  assert.match(generated, /grid-template-columns: repeat\(2/);
  assert.match(generated, /<a class="logo" href="https:\/\/github\.com\/samzong\/blueprint">blueprint<\/a>/);
  assert.match(generated, /<div class="meta-tag">2026-07-27<\/div>/);
  assert.doesNotMatch(generated, /\{\{[^}]+\}\}/);
});


test("creates a portable briefing with the shared deck runtime", async () => {
  const fixture = fileURLToPath(new URL("fixtures/briefing", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-briefing-"));
  const output = path.join(directory, "index.html");

  const entry = await createBriefing(fixture, output);
  const generated = await readFile(entry, "utf8");

  assert.equal(await checkEntry(entry), entry);
  assert.match(generated, /data-deck-selector="\.slide"/);
  assert.match(generated, /--accent: #0033ff/);
  assert.match(generated, /class="slide cover"/);
  assert.match(generated, /\.metric \{/);
});

test("parses pitch creation without widening other commands", () => {
  assert.deepEqual(parseArgs(["create", "pitch", "demo", "--output", "dist/index.html"]), {
    command: "create",
    output: "dist/index.html",
    port: 4175,
    preset: "pitch",
    target: "demo",
  });
  assert.throws(() => parseArgs(["check", "demo", "--output", "index.html"]), /unknown option/);
});


test("rejects pitch content without the required sections", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-pitch-invalid-"));
  const source = path.join(directory, "src");
  await mkdir(source);
  await writeFile(
    path.join(source, "pitch.json"),
    JSON.stringify({ title: "Invalid", brand: "blueprint", date: "2026-07-27", footer: "blueprint" }),
  );
  await writeFile(
    path.join(source, "sections.html"),
    '<section id="hero"></section><section id="solution"></section>',
  );

  await assert.rejects(createPitch(directory), /missing required section #cta/);
});

test("rejects a non-HTTP pitch brand URL", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-pitch-brand-"));
  const source = path.join(directory, "src");
  await mkdir(source);
  await writeFile(
    path.join(source, "pitch.json"),
    JSON.stringify({
      title: "Invalid",
      brand: "blueprint",
      brandUrl: "javascript:alert(1)",
      date: "2026-07-27",
      footer: "blueprint",
    }),
  );
  await writeFile(
    path.join(source, "sections.html"),
    '<section id="hero"></section><section id="solution"></section><section id="cta"></section>',
  );

  await assert.rejects(createPitch(directory), /brandUrl must be a non-empty HTTP URL/);
});


test("rejects briefing slides without required chrome", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-briefing-invalid-"));
  const source = path.join(directory, "src");
  await mkdir(source);
  await writeFile(path.join(source, "briefing.json"), JSON.stringify({ title: "Invalid" }));
  await writeFile(
    path.join(source, "slides.html"),
    [
      '<section class="slide cover"><div class="slide-tag">Cover</div><div class="slide-num">01</div></section>',
      '<section class="slide"><div class="slide-tag">Two</div></section>',
      '<section class="slide"><div class="slide-tag">Three</div><div class="slide-num">03</div></section>',
      '<section class="slide"><div class="slide-tag">Four</div><div class="slide-num">04</div></section>',
    ].join(""),
  );

  await assert.rejects(createBriefing(directory), /slide 2 is missing \.slide-num/);
});


test("scaffolds a working prototype-lite", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-prototype-lite-"));
  const entry = await createScaffold("prototype-lite", directory);
  const generated = await readFile(entry, "utf8");

  assert.equal(await checkEntry(entry), entry);
  assert.match(generated, /ReactDOM\.createRoot/);
  assert.match(generated, /data-answer-kind/);
  assert.match(generated, /family=Noto\+Sans\+SC/);
  assert.match(generated, /chat: "flex flex-col gap-3"/);
  assert.match(generated, /chat: "max-w-xl rounded-md/);
  assert.doesNotMatch(generated, /__[A-Z_]+__/);
});

test("scaffolds dossier and prototype-full from the shared template", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-scaffold-"));
  const dossier = path.join(parent, "My Dossier");
  const prototype = path.join(parent, "My Prototype");

  await createScaffold("dossier", dossier);
  await createScaffold("prototype-full", prototype);

  const dossierPackage = JSON.parse(await readFile(path.join(dossier, "package.json"), "utf8"));
  const dossierApp = await readFile(path.join(dossier, "src", "App.tsx"), "utf8");
  const prototypeApp = await readFile(path.join(prototype, "src", "App.tsx"), "utf8");
  const viteTypes = await readFile(path.join(dossier, "src", "vite-env.d.ts"), "utf8");
  assert.equal(dossierPackage.name, "my-dossier");
  assert.match(viteTypes, /vite\/client/);
  assert.match(dossierApp, /My Dossier/);
  assert.match(dossierApp, />Dossier</);
  assert.match(prototypeApp, />Prototype</);
  assert.equal(await checkEntry(dossier), path.join(dossier, "index.html"));
});

test("refuses to scaffold into a non-empty directory", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-non-empty-"));
  await writeFile(path.join(directory, "keep.txt"), "keep");
  await assert.rejects(createScaffold("prototype-lite", directory), /output directory must be empty/);
});
