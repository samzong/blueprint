import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkEntry, main } from "../src/cli.ts";
import { deployWorker } from "../src/deploy.ts";
import { createPitch } from "../src/presets/pitch.ts";
import { createScaffold } from "../src/presets/scaffold.ts";
import { createSlides } from "../src/presets/slides.ts";
import { recordProject } from "../src/project.ts";

test("deploys only publishable assets through Wrangler and verifies its URL", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-deploy-test-"));
  const bin = path.join(directory, "bin");
  const entry = path.join(directory, "page.html");
  const log = path.join(directory, "args.json");
  await mkdir(bin);
  await writeFile(entry, "<html><head></head><body>ready</body></html>");
  await writeFile(
    path.join(bin, "wrangler"),
    `#!/usr/bin/env node
import { readdirSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log("wrangler 4.105.0");
} else if (args[0] === "whoami") {
  console.log(JSON.stringify({
    loggedIn: true,
    accounts: JSON.parse(process.env.BLUEPRINT_TEST_ACCOUNTS),
  }));
} else {
  const assets = args[args.indexOf("--assets") + 1];
  writeFileSync(process.env.BLUEPRINT_TEST_LOG, JSON.stringify({
    account: process.env.CLOUDFLARE_ACCOUNT_ID,
    args,
    cwd: process.cwd(),
    files: readdirSync(assets),
  }));
  writeFileSync(
    process.env.WRANGLER_OUTPUT_FILE_PATH,
    JSON.stringify({
      type: "deploy",
      targets: process.env.BLUEPRINT_TEST_TARGETS
        ? JSON.parse(process.env.BLUEPRINT_TEST_TARGETS)
        : ["https://blueprint-demo.example"],
    }) + "\\n",
  );
}
`,
  );
  await chmod(path.join(bin, "wrangler"), 0o755);

  const originalPath = process.env.PATH;
  const originalAccounts = process.env.BLUEPRINT_TEST_ACCOUNTS;
  const originalCloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalLog = process.env.BLUEPRINT_TEST_LOG;
  const originalTargets = process.env.BLUEPRINT_TEST_TARGETS;
  const originalFetch = globalThis.fetch;
  process.env.PATH = `${bin}${path.delimiter}${originalPath}`;
  process.env.BLUEPRINT_TEST_ACCOUNTS = JSON.stringify([{ id: "account-id", name: "personal" }]);
  process.env.BLUEPRINT_TEST_LOG = log;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  globalThis.fetch = async () => new Response("ok", { status: 200 });

  try {
    const result = await deployWorker(entry, await checkEntry(entry), { name: "blueprint-demo" });
    const deployment: { account: string; args: string[]; cwd: string; files: string[] } = JSON.parse(
      await readFile(log, "utf8"),
    );
    const { args } = deployment;
    const assets = args[args.indexOf("--assets") + 1];

    assert.equal(result.account, "personal");
    assert.equal(result.url, "https://blueprint-demo.example");
    assert.equal(deployment.account, "account-id");
    assert.equal(deployment.cwd, path.join(await realpath(os.tmpdir()), path.basename(path.dirname(assets))));
    assert.deepEqual(deployment.files, ["index.html"]);
    assert.deepEqual(args.slice(0, 5), ["deploy", "--assets", assets, "--name", "blueprint-demo"]);
    assert.ok(args.includes("--no-autoconfig"));
    assert.ok(args.includes("--strict"));

    process.env.BLUEPRINT_TEST_TARGETS = JSON.stringify(["not-a-url", "https://blueprint-demo.example"]);
    assert.equal(
      (await deployWorker(entry, await checkEntry(entry), { name: "blueprint-demo" })).url,
      "https://blueprint-demo.example",
    );
    delete process.env.BLUEPRINT_TEST_TARGETS;

    const project = path.join(directory, "managed");
    const projectEntry = path.join(directory, "managed-output", "custom.html");
    await mkdir(path.join(project, "src"), { recursive: true });
    await createPitch(path.resolve("test/fixtures/pitch"), projectEntry);
    await writeFile(path.join(project, "src", "source.txt"), "private source");
    await recordProject(project, "pitch", projectEntry, "0.1.0");
    assert.equal(await main(["deploy", project]), 0);
    const managedDeployment: { args: string[]; files: string[] } = JSON.parse(await readFile(log, "utf8"));
    assert.deepEqual(managedDeployment.files, ["index.html"]);
    assert.equal(managedDeployment.args[managedDeployment.args.indexOf("--name") + 1], "managed");

    const originalCwd = process.cwd();
    process.chdir(directory);
    try {
      assert.equal(await main(["deploy"]), 0);
    } finally {
      process.chdir(originalCwd);
    }

    const slidesProject = path.join(directory, "slides");
    await cp(path.resolve("test/fixtures/slides"), slidesProject, { recursive: true });
    const slidesEntry = await createSlides(slidesProject);
    await recordProject(slidesProject, "slides", slidesEntry, "0.1.0");
    assert.equal(await main(["deploy", slidesProject, "--name", "blueprint-slides"]), 0);
    const slidesDeployment: { files: string[] } = JSON.parse(await readFile(log, "utf8"));
    assert.deepEqual(slidesDeployment.files, ["index.html"]);

    const app = path.join(directory, "app");
    const appEntry = await createScaffold("dossier", app);
    await recordProject(app, "dossier", appEntry, "0.1.0");
    const projectPickerCwd = process.cwd();
    process.chdir(directory);
    try {
      assert.equal(await main(["deploy", "--name", "slides"]), 0);
      await assert.rejects(main(["deploy"]), /multiple managed projects available; pass a target path/);
    } finally {
      process.chdir(projectPickerCwd);
    }
    await assert.rejects(
      main(["deploy", appEntry, "--name", "blueprint-demo"]),
      /run pnpm build and deploy/,
    );
    await assert.rejects(
      deployWorker(app, appEntry, { name: "blueprint-demo" }),
      /run pnpm build and deploy the dist directory/,
    );

    const dist = path.join(app, "dist");
    const distEntry = path.join(dist, "index.html");
    await mkdir(dist);
    await writeFile(distEntry, "<html><head></head><body>built app</body></html>");
    await writeFile(path.join(dist, "app.js"), "console.log('built')");
    await deployWorker(dist, distEntry, { name: "blueprint-demo" });
    const appDeployment: { files: string[] } = JSON.parse(await readFile(log, "utf8"));
    assert.deepEqual(appDeployment.files.sort(), ["app.js", "index.html"]);

    process.env.BLUEPRINT_TEST_ACCOUNTS = JSON.stringify([
      { id: "personal-id", name: "personal" },
      { id: "team-id", name: "team" },
    ]);
    const recordedAccountCwd = process.cwd();
    process.chdir(slidesProject);
    try {
      assert.equal(await main(["deploy"]), 0);
    } finally {
      process.chdir(recordedAccountCwd);
    }
    assert.equal(JSON.parse(await readFile(log, "utf8")).account, "personal-id");
    await assert.rejects(
      deployWorker(entry, await checkEntry(entry), { name: "blueprint-demo" }),
      /multiple Cloudflare accounts available.*personal, team/,
    );
    process.env.CLOUDFLARE_ACCOUNT_ID = "team-id";
    await deployWorker(entry, await checkEntry(entry), { name: "blueprint-demo" });
    const defaultDeployment: { account: string } = JSON.parse(await readFile(log, "utf8"));
    assert.equal(defaultDeployment.account, "team-id");

    await deployWorker(entry, await checkEntry(entry), {
      account: "personal",
      name: "blueprint-demo",
    });
    const explicitDeployment: { account: string } = JSON.parse(await readFile(log, "utf8"));
    assert.equal(explicitDeployment.account, "personal-id");
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalAccounts === undefined) delete process.env.BLUEPRINT_TEST_ACCOUNTS;
    else process.env.BLUEPRINT_TEST_ACCOUNTS = originalAccounts;
    if (originalCloudflareAccountId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = originalCloudflareAccountId;
    if (originalLog === undefined) delete process.env.BLUEPRINT_TEST_LOG;
    else process.env.BLUEPRINT_TEST_LOG = originalLog;
    if (originalTargets === undefined) delete process.env.BLUEPRINT_TEST_TARGETS;
    else process.env.BLUEPRINT_TEST_TARGETS = originalTargets;
    globalThis.fetch = originalFetch;
    await rm(directory, { force: true, recursive: true });
  }
});

test("refuses to deploy a file that is not the project entry", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blueprint-deploy-entry-"));
  const project = path.join(directory, "site");
  const entry = path.join(project, "index.html");
  await mkdir(project);
  await writeFile(entry, "<html><head></head><body>entry</body></html>");
  await writeFile(path.join(project, "other.html"), "<html><head></head><body>sibling</body></html>");
  await recordProject(project, "pitch", entry, "0.1.0");

  try {
    await assert.rejects(
      () => main(["deploy", path.join(project, "other.html"), "--name", "demo"]),
      /not the entry of the project/,
    );
    const manifest: { deployment: unknown } = JSON.parse(
      await readFile(path.join(project, ".blueprint.json"), "utf8"),
    );
    assert.equal(manifest.deployment, null);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});
