import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
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
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log("wrangler 4.105.0");
} else if (args[0] === "whoami") {
  console.log(JSON.stringify({
    loggedIn: true,
    accounts: JSON.parse(process.env.BLUEPRINT_TEST_ACCOUNTS),
  }));
} else if (args[0] === "secret") {
  let input = "";
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    appendFileSync(
      process.env.BLUEPRINT_TEST_SECRETS,
      JSON.stringify({ name: args[2], value: input }) + "\\n",
    );
  });
} else {
  const configPath = join(process.cwd(), "wrangler.jsonc");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : null;
  const assets = args.indexOf("--assets") >= 0 ? args[args.indexOf("--assets") + 1] : resolve(process.cwd(), config.assets.directory);
  function contents(directory, prefix = "") {
    const files = {};
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + item.name;
      if (item.isDirectory()) Object.assign(files, contents(join(directory, item.name), name + "/"));
      else files[name] = readFileSync(join(directory, item.name), "utf8");
    }
    return files;
  }
  writeFileSync(process.env.BLUEPRINT_TEST_LOG, JSON.stringify({
    account: process.env.CLOUDFLARE_ACCOUNT_ID,
    args,
    config,
    contents: contents(assets),
    cwd: process.cwd(),
    files: readdirSync(assets),
    html: existsSync(join(assets, "index.html")) ? readFileSync(join(assets, "index.html"), "utf8") : null,
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
  const originalSecrets = process.env.BLUEPRINT_TEST_SECRETS;
  const originalTargets = process.env.BLUEPRINT_TEST_TARGETS;
  const originalFetch = globalThis.fetch;
  process.env.PATH = `${bin}${path.delimiter}${originalPath}`;
  process.env.BLUEPRINT_TEST_ACCOUNTS = JSON.stringify([{ id: "account-id", name: "personal" }]);
  process.env.BLUEPRINT_TEST_LOG = log;
  process.env.BLUEPRINT_TEST_SECRETS = path.join(directory, "secrets.log");
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

    const authedRequests: (string | undefined)[] = [];
    globalThis.fetch = async (_input: unknown, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization") ?? undefined;
      authedRequests.push(authorization);
      return new Response(authorization?.startsWith("Basic ") ? "ok" : "denied", {
        status: authorization?.startsWith("Basic ") ? 200 : 401,
      });
    };
    const protectedResult = await deployWorker(entry, await checkEntry(entry), {
      name: "blueprint-gated",
      protect: true,
    });
    assert.equal(protectedResult.credentials?.username, "viewer");
    assert.match(protectedResult.credentials?.password ?? "", /^[0-9a-f]{32}$/);
    const secrets = (await readFile(process.env.BLUEPRINT_TEST_SECRETS as string, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { name: string; value: string });
    assert.deepEqual(secrets, [
      { name: "BASIC_AUTH_USER", value: "viewer" },
      { name: "BASIC_AUTH_PASS", value: protectedResult.credentials?.password },
    ]);
    const gatedDeployment: {
      args: string[];
      config: { name: string; main: string; assets: { binding: string; run_worker_first: boolean } } | null;
      files: string[];
    } = JSON.parse(await readFile(log, "utf8"));
    assert.deepEqual(gatedDeployment.args, ["deploy", "--strict"]);
    assert.equal(gatedDeployment.config?.name, "blueprint-gated");
    assert.equal(gatedDeployment.config?.main, "worker.js");
    assert.equal(gatedDeployment.config?.assets.binding, "ASSETS");
    assert.equal(gatedDeployment.config?.assets.run_worker_first, true);
    assert.deepEqual(gatedDeployment.files, ["index.html"]);
    assert.deepEqual(authedRequests, [
      undefined,
      `Basic ${Buffer.from(`viewer:${protectedResult.credentials?.password}`).toString("base64")}`,
    ]);

    const reusedResult = await deployWorker(entry, await checkEntry(entry), {
      name: "blueprint-gated",
      credentials: protectedResult.credentials,
      protect: true,
    });
    assert.deepEqual(reusedResult.credentials, protectedResult.credentials);
    assert.equal(
      (await readFile(process.env.BLUEPRINT_TEST_SECRETS as string, "utf8")).trim().split("\n").length,
      4,
    );
    globalThis.fetch = async () => new Response("ok", { status: 200 });

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

    globalThis.fetch = async (_input: unknown, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      return new Response(authorization?.startsWith("Basic ") ? "ok" : "denied", {
        status: authorization?.startsWith("Basic ") ? 200 : 401,
      });
    };
    assert.equal(await main(["deploy", project, "--protect"]), 0);
    globalThis.fetch = async () => new Response("ok", { status: 200 });
    const gateManifest: {
      deployment: { credentials: { username: string; password: string }; protected: boolean };
    } = JSON.parse(await readFile(path.join(project, ".blueprint.json"), "utf8"));
    assert.equal(gateManifest.deployment.protected, true);
    assert.equal(gateManifest.deployment.credentials.username, "viewer");
    assert.match(gateManifest.deployment.credentials.password, /^[0-9a-f]{32}$/);

    const originalCwd = process.cwd();
    process.chdir(directory);
    try {
      assert.equal(await main(["deploy"]), 0);
    } finally {
      process.chdir(originalCwd);
    }

    const slidesProject = path.join(directory, "nested", "slides");
    await mkdir(path.dirname(slidesProject), { recursive: true });
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
      assert.equal(await main(["deploy", "slides"]), 0);
      assert.equal(await main(["deploy", "--project", "slides"]), 0);
      const redeployed: { args: string[] } = JSON.parse(await readFile(log, "utf8"));
      assert.equal(redeployed.args[redeployed.args.indexOf("--name") + 1], "blueprint-slides");
      const slidesManifest: { deployment: { workerName: string } } = JSON.parse(
        await readFile(path.join(slidesProject, ".blueprint.json"), "utf8"),
      );
      assert.equal(slidesManifest.deployment.workerName, "blueprint-slides");
      await assert.rejects(main(["deploy", "--name", "slides"]), /multiple Artifacts available; pass an Artifact name, target path, or --project/);
      await assert.rejects(main(["deploy"]), /multiple Artifacts available; pass an Artifact name, target path, or --project/);
      await assert.rejects(main(["deploy", "--project", "missing"]), /no Artifact named missing/);
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

    const htmlProject = path.join(directory, "html-report");
    await main(["create", "html", htmlProject]);
    const htmlEntry = path.join(htmlProject, "index.html");
    const authored = '<html><head><link rel="stylesheet" href="css/site.css"></head><body><img src="media/chart.svg"><script src="js/app.js"></script></body></html>';
    const publicFiles = {
      "index.html": authored,
      "css/site.css": 'body { background: url("../media/chart.svg") }',
      "js/app.js": 'fetch("data.json").then(response => response.json())',
      "media/chart.svg": '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
      "data.json": '{"count":1}',
    };
    for (const [name, content] of Object.entries(publicFiles)) {
      const filename = path.join(htmlProject, name);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, content);
    }
    await mkdir(path.join(htmlProject, ".local"));
    await writeFile(path.join(htmlProject, ".local", "notes.md"), "private working notes");
    await writeFile(path.join(htmlProject, ".env"), "private environment");
    await main(["deploy", htmlProject, "--name", "html-report"]);
    const htmlDeployment = JSON.parse(await readFile(log, "utf8"));
    assert.deepEqual(htmlDeployment.contents, publicFiles);
    assert.equal(htmlDeployment.html, authored);
    globalThis.fetch = async (_input: unknown, init?: RequestInit) => new Response("test", {
      status: new Headers(init?.headers).has("Authorization") ? 200 : 401,
    });
    await deployWorker(htmlEntry, await checkEntry(htmlProject), {
      name: "html-report", protect: true,
    });
    const protectedHtml = JSON.parse(await readFile(log, "utf8"));
    assert.equal(protectedHtml.config.assets.run_worker_first, true);
    assert.deepEqual(protectedHtml.contents, publicFiles);
    assert.equal(await readFile(htmlEntry, "utf8"), authored);
    await symlink(entry, path.join(htmlProject, "outside.html"));
    await assert.rejects(deployWorker(htmlProject, htmlEntry, { name: "html-report" }), /symbolic links/);
    await rm(path.join(htmlProject, "outside.html"));
    globalThis.fetch = async () => new Response("ok", { status: 200 });

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
    if (originalSecrets === undefined) delete process.env.BLUEPRINT_TEST_SECRETS;
    else process.env.BLUEPRINT_TEST_SECRETS = originalSecrets;
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
