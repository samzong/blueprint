import assert from "node:assert/strict";
import { appendFile, cp, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { availablePort, checkEntry, entryUrl, formatProjectList, main, parseArgs, preview } from "../src/cli.ts";
import { archiveZhCNLabels } from "../src/presets/archive.zh-CN.ts";
import { createArchive } from "../src/presets/archive.ts";
import { createBriefing } from "../src/presets/briefing.ts";
import { createPitch } from "../src/presets/pitch.ts";
import { createScaffold } from "../src/presets/scaffold.ts";
import { checkSlidesOutput, createSlides } from "../src/presets/slides.ts";
import { language, validateFragment } from "../src/presets/shared.ts";
import { recordProject } from "../src/project.ts";

test("parses a safe local preview", () => {
  assert.equal(parseArgs(["preview"]).target, undefined);
  assert.equal(parseArgs(["preview", "demo/index.html"]).port, 0);
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

test("chooses an available default preview port", async () => {
  const port = await availablePort();
  assert.ok(port > 0 && port <= 65535);
});

test("parses an explicit Worker deployment", () => {
  assert.deepEqual(
    parseArgs(["deploy", "dist", "--name", "blueprint-demo", "--account", "personal"]),
    {
      account: "personal",
      command: "deploy",
      name: "blueprint-demo",
      port: 0,
      target: "dist",
    },
  );
  assert.deepEqual(parseArgs(["deploy"]), {
    account: undefined,
    command: "deploy",
    name: undefined,
    port: 0,
    target: undefined,
  });
});

test("parses project listing", () => {
  assert.deepEqual(parseArgs(["list"]), {
    command: "list",
    json: false,
    port: 0,
    root: undefined,
    target: ".",
  });
  assert.deepEqual(parseArgs(["list", "--root", "projects", "--json"]), {
    command: "list",
    json: true,
    port: 0,
    root: "projects",
    target: ".",
  });
  assert.throws(() => parseArgs(["list", "all"]), /does not accept positional arguments/);
});

test("formats project lists without forcing long fields onto one line", () => {
  assert.equal(
    formatProjectList([
      {
        createdWith: "0.1.3",
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
      "  ├─ version  0.1.3\n" +
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
  assert.throws(
    () => validateFragment('<img src="blob:https://example.com/image">', "fragment.html"),
    /fragment\.html: unsafe URL in src/,
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

test("routes managed Vite projects through their dev server", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-preview-vite-"));
  const directory = path.join(parent, "report");
  const entry = await createScaffold("dossier", directory);
  const bin = path.join(parent, "bin");
  const capture = path.join(parent, "capture.json");
  const originalPath = process.env.PATH;
  const originalCapture = process.env.BLUEPRINT_PREVIEW_CAPTURE;
  await recordProject(directory, "dossier", entry, "0.1.0");
  await assert.rejects(preview(entry, undefined, 43179), /dependencies are missing; run pnpm install --ignore-workspace/);
  await mkdir(path.join(directory, "node_modules", "vite"), { recursive: true });
  await mkdir(bin);
  await writeFile(
    path.join(bin, "pnpm"),
    `#!${process.execPath}\nrequire("node:fs").writeFileSync(process.env.BLUEPRINT_PREVIEW_CAPTURE, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }));\n`,
    { mode: 0o755 },
  );
  process.env.PATH = bin;
  process.env.BLUEPRINT_PREVIEW_CAPTURE = capture;

  try {
    assert.equal(await preview(entry, undefined, 43179), 0);
    const captured: { argv: string[]; cwd: string } = JSON.parse(await readFile(capture, "utf8"));
    assert.deepEqual(captured.argv, [
      "--reporter=silent",
      "--ignore-workspace",
      "dev",
      "--port",
      "43179",
      "--strictPort",
    ]);
    assert.equal(captured.cwd, await realpath(directory));
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalCapture === undefined) delete process.env.BLUEPRINT_PREVIEW_CAPTURE;
    else process.env.BLUEPRINT_PREVIEW_CAPTURE = originalCapture;
    await rm(parent, { force: true, recursive: true });
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
  assert.match(generated, /data-deck-next-label="Next section"/);
  assert.match(generated, /--accent: #2563eb/);
  assert.match(generated, /Build the brief/);
  assert.match(generated, /grid-template-columns: repeat\(2/);
  assert.match(generated, /\.hero-facts\s*\{/);
  assert.match(generated, /\.stack-wrap\s*\{/);
  assert.match(generated, /\.proof-layout\s*\{/);
  assert.match(generated, /\.terminal\s*\{/);
  assert.match(generated, /\.starter-grid\s*\{/);
  assert.match(generated, /<img class="brand-logo" src="data:image\/svg\+xml;base64,/);
  assert.match(generated, /<span class="brand-name">blueprint<\/span>/);
  assert.match(generated, /<span class="brand-tagline">Agent-native websites<\/span>/);
  assert.match(generated, /<div class="meta-tag">2026-07-27<\/div>/);
  assert.doesNotMatch(generated, /\{\{[^}]+\}\}/);
});

test("keeps pitch brand logos inside src", async () => {
  const fixture = fileURLToPath(new URL("fixtures/pitch", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-pitch-logo-"));
  await cp(fixture, directory, { recursive: true });
  const configFile = path.join(directory, "src", "pitch.json");
  const config = JSON.parse(await readFile(configFile, "utf8"));
  config.brandLogo = "../outside.svg";
  await writeFile(path.join(directory, "outside.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
  await writeFile(configFile, JSON.stringify(config));

  await assert.rejects(createPitch(directory), /brandLogo must stay inside the project src directory/);
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
  assert.match(generated, />Download all<\/button>/);
  assert.match(generated, /placeholder="Search documents"/);
  assert.match(generated, /"empty":"No matching documents"/);
  assert.match(generated, /"count":"2 documents"/);
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


test("localizes archive chrome for Chinese projects", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-archive-zh-"));
  const docs = path.join(directory, "src", "docs");
  await mkdir(docs, { recursive: true });
  await writeFile(
    path.join(directory, "src", "archive.json"),
    JSON.stringify({ lang: "zh-CN", title: "Archive" }),
  );
  await writeFile(path.join(docs, "README.md"), "# Archive\n");

  const labels = archiveZhCNLabels(1);
  const generated = await readFile(await createArchive(directory), "utf8");
  assert.match(generated, new RegExp(`>${labels.download}</button>`));
  assert.match(generated, new RegExp(`placeholder="${labels.search}"`));
  assert.match(generated, new RegExp(`"empty":"${labels.empty}"`));
  assert.match(generated, new RegExp(`"count":"${labels.count}"`));
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
  assert.match(generated, /data-blueprint-preset="briefing"/);
  assert.match(generated, /data-deck-selector="\.slide"/);
  assert.match(generated, /data-deck-hash="true"/);
  assert.match(generated, /data-deck-next-label="Next page"/);
  assert.match(generated, /<section(?=[^>]*class="slide cover")(?=[^>]*id="slide-01")[^>]*>/);
  assert.match(generated, /<section(?=[^>]*class="slide")(?=[^>]*id="portable-output")[^>]*>/);
  assert.match(generated, /<section(?=[^>]*class="slide section-divider")(?=[^>]*id="slide-06")[^>]*>/);
  assert.match(generated, /--accent: #0033ff/);
  assert.match(generated, /class="slide-num mono">01 \/ 06/);
  assert.match(generated, /class="slide-num mono">06 \/ 06/);
  assert.match(generated, /\.metric \{/);
  assert.match(generated, /\.source-note \{/);
  assert.match(generated, /@media print/);
  assert.match(generated, /\.compiler-mark \{/);
  assert.match(generated, /data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(generated, /assets\/compiler\.svg/);
});


test("creates portable Reveal slides with a Dify-X theme", async () => {
  const fixture = fileURLToPath(new URL("fixtures/slides", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-slides-"));
  const output = path.join(directory, "index.html");

  const entry = await createSlides(fixture, output);
  const generated = await readFile(entry, "utf8");

  assert.equal(await checkEntry(entry), entry);
  checkSlidesOutput(generated, entry);
  assert.throws(
    () => checkSlidesOutput(generated.replace("<section", '<section data-background="assets/brand.svg"'), entry),
    /data-background is not supported/,
  );
  assert.match(generated, /data-blueprint-preset="slides"/);
  assert.match(generated, /data-blueprint-theme="dify-x"/);
  assert.match(generated, /6\.0\.1/);
  assert.match(generated, /RevealNotes/);
  assert.match(generated, /plugins: \[RevealNotes\]/);
  assert.match(generated, /class="slides-shortcuts"/);
  assert.match(generated, /70: toggleFullscreen/);
  assert.match(generated, /document\.exitFullscreen/);
  assert.match(generated, /Promise\.resolve\(method\.call\(owner\)\)\.catch\(\(\) => \{\}\)/);
  assert.match(generated, /Enter \/ exit fullscreen/);
  assert.match(generated, /data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(generated, /assets\/brand\.svg/);
  assert.match(generated, /\.cover-layout \{/);
  assert.match(generated, /\.architecture \{/);
  assert.match(generated, /\.evidence-layout \{/);
  assert.match(generated, /\.matrix \{/);
  assert.match(generated, /\.source-note \{/);
  assert.match(generated, /\.slides-chrome \{/);
  assert.doesNotMatch(generated, /class="slides-chrome"/);
});

test("adds optional brand chrome and portable language switching", async () => {
  const fixture = fileURLToPath(new URL("fixtures/slides", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-slides-locales-"));
  await cp(fixture, directory, { recursive: true });
  const sourceDirectory = path.join(directory, "src");
  const source = await readFile(path.join(sourceDirectory, "locales", "zh-CN.html"), "utf8");
  await writeFile(path.join(sourceDirectory, "locales", "en.html"), source);
  await writeFile(
    path.join(sourceDirectory, "slides.json"),
    JSON.stringify({
      title: "Enterprise Agent",
      lang: "zh-CN",
      theme: "dify-x",
      brand: {
        label: "Governance × Operations",
        logos: [{ src: "assets/brand.svg", alt: "Blueprint" }],
      },
      locales: [
        { lang: "zh-CN", label: "ZH", source: "locales/zh-CN.html", title: "Enterprise Agent" },
        { lang: "en", label: "EN", source: "locales/en.html", title: "Enterprise Agent" },
      ],
    }),
  );

  const entry = await createSlides(directory);
  const generated = await readFile(entry, "utf8");

  assert.match(generated, /class="slides-chrome"/);
  assert.match(generated, /class="deck-brand"/);
  assert.match(generated, /Governance × Operations/);
  assert.match(generated, /data-slides-lang-link="en"/);
  assert.match(generated, /template data-slides-lang="en"/);
  assert.match(generated, /blueprintSlideLocales/);
  assert.match(generated, /replaceChildren\(template\.content\.cloneNode\(true\)\)/);
  assert.match(generated, /data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(generated, /assets\/brand\.svg/);

  const brokenLocale = generated.replace(/(<template data-slides-lang="en">\s*)<section>/, "$1<div>");
  assert.throws(() => checkSlidesOutput(brokenLocale, entry), /locale en: slides must contain only top-level <section>/);
});

test("rejects invalid slides themes, wrappers, and local CSS assets", async () => {
  const fixture = fileURLToPath(new URL("fixtures/slides", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-slides-invalid-"));
  await cp(fixture, directory, { recursive: true });

  await writeFile(path.join(directory, "src", "slides.json"), '{"title":"Invalid","theme":"missing"}\n');
  await assert.rejects(createSlides(directory), /unknown theme "missing"/);

  await writeFile(path.join(directory, "src", "slides.json"), '{"title":"Invalid","theme":"dify-x"}\n');
  await writeFile(path.join(directory, "src", "slides.html"), '<div class="reveal"><section>Wrapped</section></div>\n');
  await assert.rejects(createSlides(directory), /only top-level <section>/);

  await writeFile(path.join(directory, "src", "slides.html"), '<section><h1>Slide</h1></section>\n');
  await writeFile(path.join(directory, "src", "style.css"), '.hero { background: url("assets/brand.svg"); }\n');
  await assert.rejects(createSlides(directory), /local CSS assets are not supported/);

  await writeFile(path.join(directory, "src", "style.css"), '@import "assets/theme.css";\n');
  await assert.rejects(createSlides(directory), /CSS imports are not supported/);

  await writeFile(path.join(directory, "src", "style.css"), '@\\69mport "assets/theme.css";\n');
  await assert.rejects(createSlides(directory), /CSS escape sequences are not supported/);

  await writeFile(path.join(directory, "src", "style.css"), 'body { background: image-set("assets/theme.png" 1x); }\n');
  await assert.rejects(createSlides(directory), /CSS image sets are not supported/);

  await writeFile(
    path.join(directory, "src", "slides.html"),
    '<section data-background-iframe="javascript:alert(1)">Unsafe</section>\n',
  );
  await writeFile(path.join(directory, "src", "style.css"), "");
  await assert.rejects(createSlides(directory), /unsafe URL in data-background-iframe/);

  await writeFile(path.join(directory, "src", "slides.html"), '<section data-background="assets/brand.svg">Unsafe</section>\n');
  await assert.rejects(createSlides(directory), /data-background is not supported/);

  await writeFile(
    path.join(directory, "src", "slides.html"),
    '<section data-background-gradient="url(assets/brand.svg)">Unsafe</section>\n',
  );
  await assert.rejects(createSlides(directory), /local CSS assets are not supported/);

  for (const attribute of ["data-src", "data-preview-image", "data-preview-video", "data-preview-link", "data-notes"]) {
    await writeFile(path.join(directory, "src", "slides.html"), `<section ${attribute}="https://example.com/asset">Unsafe</section>\n`);
    await assert.rejects(createSlides(directory), new RegExp(`${attribute} is not supported`));
  }
  for (const attribute of ["data-background-image", "data-background-video"]) {
    await writeFile(path.join(directory, "src", "slides.html"), `<section ${attribute}="https://example.com/asset, assets/missing">Unsafe</section>\n`);
    await assert.rejects(createSlides(directory), new RegExp(`${attribute} must contain one URL`));
  }
  await writeFile(path.join(directory, "src", "slides.html"), '<section data-background-image="data:image/svg+xml,x),url(assets/missing.png">Unsafe</section>\n');
  await assert.rejects(createSlides(directory), /data-background-image must contain one URL/);

  await writeFile(path.join(directory, "src", "slides.html"), "<section><h1>Slide</h1></section>\n");
  await writeFile(
    path.join(directory, "src", "slides.json"),
    JSON.stringify({
      title: "Invalid",
      theme: "dify-x",
      brand: { logos: [{ src: "https://example.com/logo.svg", alt: "Remote" }] },
    }),
  );
  await assert.rejects(createSlides(directory), /brand logo must be a local image/);

  await writeFile(path.join(directory, "src", "slides.en.html"), "<section>One</section><section>Two</section>\n");
  await writeFile(
    path.join(directory, "src", "slides.json"),
    JSON.stringify({
      title: "Invalid",
      lang: "en",
      theme: "dify-x",
      locales: [
        { lang: "en", label: "EN", source: "slides.html" },
        { lang: "zh-CN", label: "ZH", source: "slides.en.html" },
      ],
    }),
  );
  await assert.rejects(createSlides(directory), /must match the default slide topology/);
});

test("parses pitch creation without widening other commands", () => {
  assert.deepEqual(parseArgs(["create", "pitch", "demo", "--output", "dist/index.html"]), {
    command: "create",
    output: "dist/index.html",
    port: 0,
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


test("rejects invalid briefing structure and local CSS assets", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-briefing-invalid-"));
  const source = path.join(directory, "src");
  await mkdir(source);
  await writeFile(path.join(source, "briefing.json"), JSON.stringify({ title: "Invalid" }));
  const validSlides = [
    '<section class="slide cover"><div class="slide-tag">Cover</div><div class="slide-inner"></div></section>',
    '<section class="slide"><div class="slide-tag">Two</div><div class="slide-inner"></div></section>',
    '<section class="slide"><div class="slide-tag">Three</div><div class="slide-inner"></div></section>',
    '<section class="slide"><div class="slide-tag">Four</div><div class="slide-inner"></div></section>',
  ].join("");
  await writeFile(
    path.join(source, "slides.html"),
    [
      '<section class="slide cover"><div class="slide-tag">Cover</div><div class="slide-inner"></div></section>',
      '<section class="slide"><div class="slide-tag">Two</div></section>',
      '<section class="slide"><div class="slide-tag">Three</div><div class="slide-inner"></div></section>',
      '<section class="slide"><div class="slide-tag">Four</div><div class="slide-inner"></div></section>',
    ].join(""),
  );
  await assert.rejects(createBriefing(directory), /slide 2 is missing \.slide-inner/);

  await writeFile(path.join(source, "slides.html"), `<div>${validSlides}</div>`);
  await assert.rejects(createBriefing(directory), /expected only top-level <section class="slide">/);

  await writeFile(
    path.join(source, "slides.html"),
    validSlides.replace('<div class="slide-inner"></div>', '<div class="slide-inner"><iframe src="https://example.com"></iframe></div>'),
  );
  await assert.rejects(createBriefing(directory), /iframes are not supported/);

  const duplicateIds = validSlides
    .replace('<section class="slide cover"', '<section id="duplicate" class="slide cover"')
    .replace('<section class="slide"', '<section id="duplicate" class="slide"');
  await writeFile(path.join(source, "slides.html"), duplicateIds);
  await assert.rejects(createBriefing(directory), /duplicate slide id "duplicate"/);

  await writeFile(path.join(source, "slides.html"), validSlides);
  await writeFile(path.join(source, "style.css"), '@import "assets/theme.css";\n');
  await assert.rejects(createBriefing(directory), /CSS imports are not supported/);
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

test("scaffolds distinct dossier and prototype-full projects", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-scaffold-"));
  const dossier = path.join(parent, "My Dossier");
  const prototype = path.join(parent, "My Prototype");

  await createScaffold("dossier", dossier);
  await createScaffold("prototype-full", prototype);

  const dossierPackage = JSON.parse(await readFile(path.join(dossier, "package.json"), "utf8"));
  const dossierApp = await readFile(path.join(dossier, "src", "App.tsx"), "utf8");
  const dossierContent = await readFile(path.join(dossier, "src", "data", "content.ts"), "utf8");
  const dossierCss = await readFile(path.join(dossier, "src", "index.css"), "utf8");
  const prototypeApp = await readFile(path.join(prototype, "src", "App.tsx"), "utf8");
  const prototypeContent = await readFile(path.join(prototype, "src", "data", "content.ts"), "utf8");
  const viteTypes = await readFile(path.join(dossier, "src", "vite-env.d.ts"), "utf8");
  const workspace = await readFile(path.join(dossier, "pnpm-workspace.yaml"), "utf8");
  assert.equal(dossierPackage.name, "my-dossier");
  assert.equal(workspace, "packages: []\n");
  assert.match(viteTypes, /vite\/client/);
  assert.match(dossierApp, /Open record/);
  assert.match(dossierApp, /dialog/);
  assert.match(dossierApp, /dossier\.layout === "sectioned"/);
  assert.match(dossierApp, /group-focus-within:visible/);
  assert.match(dossierApp, /activeNavigation\.children/);
  assert.doesNotMatch(dossierApp, /children:\s*\[/);
  assert.match(dossierContent, /layout: "continuous"/);
  assert.match(dossierContent, /My Dossier/);
  assert.match(dossierContent, /A decision-focused research dashboard/);
  assert.match(dossierCss, /@import "tailwindcss" source\(none\)/);
  assert.match(dossierCss, /@source "\.\/"/);
  assert.match(dossierCss, /dialog::backdrop/);
  assert.match(dossierCss, /input:focus-visible/);
  assert.match(dossierCss, /min-height: 42px/);
  assert.match(prototypeApp, /My Prototype/);
  assert.match(prototypeApp, />Prototype</);
  assert.doesNotMatch(prototypeContent, /DossierContent/);
  assert.equal(await checkEntry(dossier), path.join(dossier, "index.html"));
  assert.equal(await checkEntry(prototype), path.join(prototype, "index.html"));
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
  html = html.replace(' data-blueprint-preset="briefing"', "");
  await writeFile(entry, html);
  assert.equal(await checkEntry(entry), entry);

  await writeFile(entry, html.replace(/data:image\/svg\+xml;base64,[^"]+/, "blob:https://example.com/image"));
  await assert.rejects(checkEntry(entry), /unsafe URL in src/);

  html = html.replace(/\bslide-num\b/g, "slide-number");
  await writeFile(entry, html);
  await assert.rejects(checkEntry(entry), /missing \.slide-num/);
});


test("managed check enforces the slides runtime and portable output", async () => {
  const fixture = fileURLToPath(new URL("fixtures/slides", import.meta.url));
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-slides-"));
  const entry = await createSlides(fixture, path.join(directory, "index.html"));
  await recordProject(directory, "slides", entry, "0.1.0");

  const html = await readFile(entry, "utf8");
  await writeFile(entry, html.replace("Reveal.initialize({", "Reveal.start({"));
  await assert.rejects(checkEntry(entry), /missing Reveal\.js runtime/);
  await writeFile(entry, html.replace("</style>", '@import "assets/missing.css";</style>'));
  await assert.rejects(checkEntry(entry), /CSS imports are not supported/);
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

test("managed Vite check requires a local source entry and build scripts", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "blueprint-check-vite-entry-"));
  const directory = path.join(parent, "report");
  const entry = await createScaffold("dossier", directory);
  await recordProject(directory, "dossier", entry, "0.1.0");

  const html = await readFile(entry, "utf8");
  await writeFile(entry, html.replace("/src/main.tsx", "/recovered/assets/app.js"));
  await assert.rejects(checkEntry(directory), /missing module source entry \/recovered\/assets\/app\.js/);

  await writeFile(entry, html);
  const packageFile = path.join(directory, "package.json");
  const packageValue = JSON.parse(await readFile(packageFile, "utf8"));
  delete packageValue.scripts.build;
  await writeFile(packageFile, `${JSON.stringify(packageValue, null, 2)}\n`);
  await assert.rejects(checkEntry(directory), /requires non-empty dev and build scripts/);
});
