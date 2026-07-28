import assert from "node:assert/strict";
import { appendFile, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkEntry, entryUrl, formatProjectList, main, parseArgs, preview } from "../src/cli.ts";
import { createArchive } from "../src/presets/archive.ts";
import { createBriefing } from "../src/presets/briefing.ts";
import { createPitch } from "../src/presets/pitch.ts";
import { createScaffold } from "../src/presets/scaffold.ts";
import { language, validateFragment } from "../src/presets/shared.ts";
import { recordProject } from "../src/project.ts";

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
  assert.throws(
    () => validateFragment('<img src="missing.png" onerror="globalThis.pwned = true">', "fragment.html"),
    /unsafe event handler attribute/,
  );
  assert.throws(
    () => validateFragment('<iframe srcdoc="<script>alert(1)</script>"></iframe>', "fragment.html"),
    /unsafe srcdoc attribute/,
  );
  assert.throws(
    () => validateFragment('<a href="java&#x0A;script:alert(1)">open</a>', "fragment.html"),
    /unsafe URL/,
  );
  assert.throws(
    () => validateFragment('<a href="http://[">broken</a>', "fragment.html"),
    /fragment\.html: unsafe URL in href/,
  );
  assert.throws(
    () => validateFragment('<a href="data:text/html,hello">data</a>', "fragment.html"),
    /fragment\.html: unsafe URL in href/,
  );
  assert.doesNotThrow(() =>
    validateFragment('<img src="data:image/png;base64,iVBORw0KGgo=" alt="">', "fragment.html"),
  );
  for (const embedded of [
    '<svg><image href="data:image/png;base64,iVBORw0KGgo="></image></svg>',
    '<svg><image xlink:href="data:image/png;base64,iVBORw0KGgo="></image></svg>',
  ]) {
    assert.doesNotThrow(() => validateFragment(embedded, "fragment.html"));
  }
  assert.throws(
    () => validateFragment('<svg><image href="data:text/html,hello"></image></svg>', "fragment.html"),
    /fragment\.html: unsafe URL in href/,
  );
  for (const carrier of [
    '<object data="javascript:alert(1)"></object>',
    '<object data="data:text/html,hello"></object>',
    '<video poster="javascript:alert(1)"></video>',
    '<blockquote cite="javascript:alert(1)">quote</blockquote>',
  ]) {
    assert.throws(() => validateFragment(carrier, "fragment.html"), /unsafe URL/);
  }
  assert.doesNotThrow(() =>
    validateFragment('<video poster="data:image/png;base64,iVBORw0KGgo="></video>', "fragment.html"),
  );
  assert.throws(
    () => validateFragment('<meta http-equiv="refresh" content="0;url=https://evil.example">', "fragment.html"),
    /unsafe <meta http-equiv="refresh"> element/,
  );
  assert.doesNotThrow(() => validateFragment('<meta name="description" content="hello">', "fragment.html"));
  assert.throws(
    () => validateFragment('<div xlink:href="javascript:alert(1)">x</div>', "fragment.html"),
    /unsafe URL in xlink:href/,
  );
});

test("rejects file URLs in generated HTML", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-"));
  const entry = path.join(directory, "index.html");
  await writeFile(entry, '<html><head></head><body><a href="file:///tmp/paper.pdf">PDF</a></body></html>');

  await assert.rejects(checkEntry(entry), /contains file:\/\/ URLs/);
});

test("rejects local URLs and unresolved markers outside URL attributes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-style-"));
  const write = async (name: string, body: string) => {
    const entry = path.join(directory, name);
    await writeFile(entry, `<html><head>${body}</head><body>ok</body></html>`);
    return entry;
  };

  await assert.rejects(
    checkEntry(await write("css.html", "<style>body{background:url(file:///Users/x/bg.png)}</style>")),
    /contains file:\/\/ URLs/,
  );
  await assert.rejects(
    checkEntry(await write("import.html", '<style>@import "file:///Users/x/theme.css";</style>')),
    /contains file:\/\/ URLs/,
  );
  await assert.rejects(
    checkEntry(await write("inline.html", '</head><body><div style="background:url(file:///Users/x/a.png)">y')),
    /contains file:\/\/ URLs/,
  );
  await assert.rejects(
    checkEntry(await write("attribute.html", '</head><body><img src="{{hero_image}}" alt="">')),
    /contains unresolved template markers/,
  );

  // Braces in ordinary CSS are not template markers.
  assert.ok(await checkEntry(await write("braces.html", "<style>@media screen{.a{color:red}}</style>")));
});

test("reports a missing gofs before printing a preview URL", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-preview-"));
  const entry = path.join(directory, "index.html");
  const bin = path.join(directory, "bin");
  const originalPath = process.env.PATH;
  const originalWrite = process.stdout.write;
  let output = "";
  await mkdir(bin);
  await writeFile(entry, "<html><head></head><body>ready</body></html>");
  process.env.PATH = bin;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += chunk.toString();
    return true;
  }) as typeof process.stdout.write;

  try {
    await assert.rejects(preview(entry, undefined, 4175), /gofs is required; install with brew install gofs/);
    assert.equal(output, "");
  } finally {
    process.stdout.write = originalWrite;
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    await rm(directory, { force: true, recursive: true });
  }
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

test("creates a portable archive from a Markdown corpus", async () => {
  const fixture = fileURLToPath(new URL("fixtures/archive", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-"));
  const output = path.join(directory, "index.html");

  const entry = await createArchive(fixture, output);
  const generated = await readFile(entry, "utf8");

  assert.equal(await checkEntry(entry), entry);
  assert.match(generated, /const ARCHIVE =/);
  assert.match(generated, /#c0c0c0/);
  assert.ok(generated.includes("guides/01-guide.md"));
  assert.ok(generated.includes("\\u003c/script>"));
  assert.match(generated, /location\.hash/);
  assert.doesNotMatch(generated, /fetch\(/);

  const runtimeStart = generated.indexOf("function escapeHtml");
  const runtimeEnd = generated.indexOf("function isTableSeparator");
  assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart);
  const renderInline = new Function(
    "value",
    `function docPathFromSlug() { return ""; }
function slugFromDocPath(value) { return value; }
${generated.slice(runtimeStart, runtimeEnd)}
return inlineMarkdown(value);`,
  ) as (value: string) => string;
  assert.equal(
    renderInline("[docs](https://example.com/s?a=1&b=2)"),
    '<a href="https://example.com/s?a=1&amp;b=2" target="_blank" rel="noreferrer">docs</a>',
  );
});

test("archive accepts documentation containing local URLs and template syntax", async () => {
  const fixture = fileURLToPath(new URL("fixtures/archive", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-content-"));
  await cp(fixture, directory, { recursive: true });
  await appendFile(
    path.join(directory, "src", "docs", "README.md"),
    "\nLogs are written to `file:///var/log/app.log`.\n\nTemplate example: `{{ service_name }}`.\n",
  );

  assert.equal(await main(["create", "archive", directory]), 0);
  assert.match(await readFile(path.join(directory, ".blueprint.json"), "utf8"), /"preset": "archive"/);
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

test("managed check enforces pitch sections after the project is recorded", async () => {
  const fixture = fileURLToPath(new URL("fixtures/pitch", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-pitch-"));
  const project = path.join(directory, "project");
  const entry = await createPitch(fixture, path.join(directory, "dist", "custom.html"));
  await mkdir(project);
  await recordProject(project, "pitch", entry, "0.1.0");

  assert.equal(await checkEntry(project), entry);

  let html = await readFile(entry, "utf8");
  html = html.replace(/<section\b[^>]*\bid=(["'])cta\1[^>]*>[\s\S]*?<\/section>/i, "");
  await writeFile(entry, html);
  await assert.rejects(checkEntry(project), /missing required section #cta/);
});

test("create preserves managed output when the requested preset conflicts", async () => {
  const fixture = fileURLToPath(new URL("fixtures/briefing", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-create-conflict-"));
  const entry = path.join(directory, "index.html");
  const original = "<html><head></head><body>last good output</body></html>";
  await cp(path.join(fixture, "src"), path.join(directory, "src"), { recursive: true });
  await writeFile(entry, original);
  await recordProject(directory, "pitch", entry, "0.1.0");

  try {
    await assert.rejects(main(["create", "briefing", directory]), /preset is pitch, not briefing/);
    assert.equal(await readFile(entry, "utf8"), original);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("managed check enforces briefing slide chrome", async () => {
  const fixture = fileURLToPath(new URL("fixtures/briefing", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-briefing-"));
  const entry = await createBriefing(fixture, path.join(directory, "index.html"));
  await recordProject(directory, "briefing", entry, "0.1.0");

  let html = await readFile(entry, "utf8");
  html = html.replace(/\bslide-num\b/g, "slide-number");
  await writeFile(entry, html);
  await assert.rejects(checkEntry(entry), /missing \.slide-num/);
});

test("managed check enforces archive shell and payload", async () => {
  const fixture = fileURLToPath(new URL("fixtures/archive", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-archive-"));
  const entry = await createArchive(fixture, path.join(directory, "index.html"));
  await recordProject(directory, "archive", entry, "0.1.0");

  assert.equal(await checkEntry(directory), entry);

  let html = await readFile(entry, "utf8");
  html = html.replace(/\bid=(["'])docs\1/i, 'id="document-list"');
  await writeFile(entry, html);
  await assert.rejects(checkEntry(directory), /missing #docs/);
});

test("unmanaged HTML keeps the shallow document checks only", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-shallow-"));
  const entry = path.join(directory, "index.html");
  await writeFile(
    entry,
    "<html><head></head><body><section id='hero'></section></body></html>",
  );
  assert.equal(await checkEntry(entry), entry);
});

test("managed check rejects unresolved scaffold tokens", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-scaffold-"));
  const entry = await createScaffold("prototype-lite", directory);
  await recordProject(directory, "prototype-lite", entry, "0.1.0");
  assert.equal(await checkEntry(directory), entry);

  await writeFile(entry, (await readFile(entry, "utf8")).replace("ReactDOM.createRoot", "/* removed */"));
  await assert.rejects(checkEntry(directory), /missing ReactDOM\.createRoot bootstrap/);
});

test("check validates the requested path even inside a managed project", async () => {
  const fixture = fileURLToPath(new URL("fixtures/pitch", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-target-"));
  const entry = await createPitch(fixture, path.join(directory, "index.html"));
  await recordProject(directory, "pitch", entry, "0.1.0");

  const broken = path.join(directory, "broken.html");
  await writeFile(broken, "<html><head></head>NO BODY TAG {{unresolved}}");
  await assert.rejects(checkEntry(broken), /missing <body>/);
  assert.equal(await checkEntry(entry), entry);

  const sibling = path.join(directory, "sibling.html");
  await writeFile(sibling, "<html><head></head><body><section id='hero'></section></body></html>");
  assert.equal(await checkEntry(sibling), sibling);
});

test("managed dossier check does not require src/App.tsx", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-dossier-"));
  const directory = path.join(parent, "report");
  const entry = await createScaffold("dossier", directory);
  await recordProject(directory, "dossier", entry, "0.1.0");

  await rename(path.join(directory, "src", "App.tsx"), path.join(directory, "src", "Report.tsx"));
  assert.equal(await checkEntry(directory), entry);
});
