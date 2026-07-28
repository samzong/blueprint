import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkEntry } from "../src/cli.ts";
import { deployWorker } from "../src/deploy.ts";

test("deploys one HTML file through Wrangler and verifies its URL", async () => {
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
    files: readdirSync(assets),
  }));
  writeFileSync(
    process.env.WRANGLER_OUTPUT_FILE_PATH,
    JSON.stringify({ type: "deploy", targets: ["https://blueprint-demo.example"] }) + "\\n",
  );
}
`,
  );
  await chmod(path.join(bin, "wrangler"), 0o755);

  const originalPath = process.env.PATH;
  const originalAccounts = process.env.BLUEPRINT_TEST_ACCOUNTS;
  const originalCloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalLog = process.env.BLUEPRINT_TEST_LOG;
  const originalFetch = globalThis.fetch;
  process.env.PATH = `${bin}${path.delimiter}${originalPath}`;
  process.env.BLUEPRINT_TEST_ACCOUNTS = JSON.stringify([{ id: "account-id", name: "personal" }]);
  process.env.BLUEPRINT_TEST_LOG = log;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  globalThis.fetch = async () => new Response("ok", { status: 200 });

  try {
    const result = await deployWorker(entry, await checkEntry(entry), { name: "blueprint-demo" });
    const deployment: { account: string; args: string[]; files: string[] } = JSON.parse(
      await readFile(log, "utf8"),
    );
    const { args } = deployment;
    const assets = args[args.indexOf("--assets") + 1];

    assert.equal(result.account, "personal");
    assert.equal(result.url, "https://blueprint-demo.example");
    assert.equal(deployment.account, "account-id");
    assert.deepEqual(deployment.files, ["index.html"]);
    assert.deepEqual(args.slice(0, 5), ["deploy", "--assets", assets, "--name", "blueprint-demo"]);
    assert.ok(args.includes("--no-autoconfig"));
    assert.ok(args.includes("--strict"));

    process.env.BLUEPRINT_TEST_ACCOUNTS = JSON.stringify([
      { id: "personal-id", name: "personal" },
      { id: "team-id", name: "team" },
    ]);
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
    globalThis.fetch = originalFetch;
    await rm(directory, { force: true, recursive: true });
  }
});
