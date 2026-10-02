import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { chooseOne } from "./interactive.ts";
import { findProjectOrNull, projectFilename, readProject } from "./project.ts";

const execFileAsync = promisify(execFile);

type Account = {
  id: string;
  name: string;
};

function parseAccounts(output: string): Account[] {
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch {
    throw new Error("Wrangler returned invalid account data");
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("loggedIn" in value) ||
    value.loggedIn !== true ||
    !("accounts" in value) ||
    !Array.isArray(value.accounts)
  ) {
    throw new Error("Wrangler is not authenticated; run wrangler login");
  }

  const accounts = value.accounts.filter(
    (account): account is Account =>
      typeof account === "object" &&
      account !== null &&
      "id" in account &&
      typeof account.id === "string" &&
      "name" in account &&
      typeof account.name === "string",
  );
  if (accounts.length === 0) throw new Error("no Cloudflare accounts are available");
  return accounts;
}

async function selectAccount(accounts: Account[], requested: string | undefined): Promise<Account> {
  if (requested) {
    const matches = accounts.filter((account) => account.id === requested || account.name === requested);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new Error(`Cloudflare account name is ambiguous: ${requested}`);
    throw new Error(`Cloudflare account not found: ${requested}`);
  }

  if (accounts.length === 1) return accounts[0];
  const names = accounts.map((account) => account.name).join(", ");
  return await chooseOne(
    "Select a Cloudflare account",
    accounts.map((account) => ({ description: account.id, name: account.name, value: account })),
    `multiple Cloudflare accounts available; pass --account <name-or-id>: ${names}`,
  );
}

export type DeployCredentials = {
  username: string;
  password: string;
};

const gateWorkerSource = `export default {
  async fetch(request, env) {
    if (!isAuthorized(request.headers.get("Authorization"), env.BASIC_AUTH_USER, env.BASIC_AUTH_PASS)) {
      return new Response("401 Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="blueprint", charset="UTF-8"',
          "Cache-Control": "no-store",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};

function isAuthorized(header, user, pass) {
  if (!header || !header.startsWith("Basic ") || !user || !pass) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const expected = \`\${user}:\${pass}\`;
  if (decoded.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < decoded.length; i++) diff |= decoded.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
`;

async function runWrangler(args: string[], env: NodeJS.ProcessEnv, cwd: string, input?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("wrangler", args, {
      cwd,
      env,
      stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler exited with ${signal ?? code ?? "an unknown status"}`));
    });
    if (input !== undefined) child.stdin?.end(input);
  });
}

function deploymentUrl(output: string): string {
  for (const line of output.trim().split(/\r?\n/).reverse()) {
    try {
      const event: unknown = JSON.parse(line);
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "deploy" &&
        "targets" in event &&
        Array.isArray(event.targets)
      ) {
        const target = event.targets.find(
          (candidate): candidate is string =>
            typeof candidate === "string" && URL.canParse(candidate) && new URL(candidate).protocol === "https:",
        );
        if (target) return target;
      }
    } catch {
      continue;
    }
  }
  throw new Error("Wrangler did not report a deployment URL");
}

async function verifyDeployment(url: string, credentials?: DeployCredentials): Promise<void> {
  let status: number | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      status = response.status;
      await response.body?.cancel();
      if (!credentials && response.ok) return;
      if (credentials && response.status === 401) {
        const authorized = await fetch(url, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10_000),
        });
        status = authorized.status;
        await authorized.body?.cancel();
        if (authorized.ok) return;
      }
    } catch {
      status = undefined;
    }
    if (attempt < 4) await delay(1_000);
  }
  throw new Error(
    `published ${url}, but it did not return the expected response${status ? ` (last status: ${status})` : ""}`,
  );
}

export async function deployWorker(
  target: string,
  entry: string,
  options: { account?: string; name: string; protect?: boolean; credentials?: DeployCredentials },
): Promise<{ account: string; url: string; credentials?: DeployCredentials }> {
  let version: string;
  try {
    ({ stdout: version } = await execFileAsync("wrangler", ["--version"], { encoding: "utf8" }));
  } catch {
    throw new Error("wrangler 4+ is required; install with brew install cloudflare-wrangler");
  }
  const major = Number(/\b(\d+)\.\d+\.\d+\b/.exec(version)?.[1]);
  if (!Number.isInteger(major) || major < 4) {
    throw new Error("wrangler 4+ is required; install with brew install cloudflare-wrangler");
  }

  let whoami: string;
  try {
    ({ stdout: whoami } = await execFileAsync("wrangler", ["whoami", "--json"], { encoding: "utf8" }));
  } catch {
    throw new Error("Wrangler is not authenticated; run wrangler login");
  }
  const account = await selectAccount(parseAccounts(whoami), options.account ?? process.env.CLOUDFLARE_ACCOUNT_ID);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "blueprint-deploy-"));

  try {
    const cache = path.join(temporary, "cache");
    const output = path.join(temporary, "wrangler.ndjson");
    const targetPath = path.resolve(target);
    let assets = targetPath;
    await mkdir(cache);

    const targetStat = await stat(targetPath);
    let singleFile = !targetStat.isDirectory();
    if (targetStat.isDirectory()) {
      try {
        const project = await readProject(targetPath);
        if (project.preset === "prototype-full" || project.preset === "dossier") {
          throw new Error(`${projectFilename}: run pnpm build and deploy the dist directory`);
        }
        singleFile = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }

    const project = await findProjectOrNull(entry);
    if (project?.manifest.preset === "html") {
      assets = path.join(temporary, "site");
      await cp(project.root, assets, {
        recursive: true,
        filter: (source) => !path.relative(project.root, source).split(path.sep).some((part) => part.startsWith(".")),
      });
    } else if (singleFile) {
      assets = path.join(temporary, "site");
      await mkdir(assets);
      await copyFile(entry, path.join(assets, "index.html"));
    }

    const wranglerEnv = {
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID: account.id,
      WRANGLER_CACHE_DIR: cache,
      WRANGLER_OUTPUT_FILE_PATH: output,
    };

    let credentials: DeployCredentials | undefined;
    if (options.protect) {
      credentials = options.credentials ?? { username: "viewer", password: randomBytes(16).toString("hex") };
      await writeFile(path.join(temporary, "worker.js"), gateWorkerSource);
      await writeFile(
        path.join(temporary, "wrangler.jsonc"),
        `${JSON.stringify(
          {
            name: options.name,
            main: "worker.js",
            compatibility_date: new Date().toISOString().slice(0, 10),
            workers_dev: true,
            assets: {
              directory: path.relative(temporary, assets),
              binding: "ASSETS",
              run_worker_first: true,
            },
          },
          null,
          2,
        )}\n`,
      );
      await runWrangler(["deploy", "--strict"], wranglerEnv, temporary);
      await runWrangler(
        ["secret", "put", "BASIC_AUTH_USER", "--name", options.name],
        wranglerEnv,
        temporary,
        credentials.username,
      );
      await runWrangler(
        ["secret", "put", "BASIC_AUTH_PASS", "--name", options.name],
        wranglerEnv,
        temporary,
        credentials.password,
      );
    } else {
      await runWrangler(
        [
          "deploy",
          "--assets",
          assets,
          "--name",
          options.name,
          "--compatibility-date",
          new Date().toISOString().slice(0, 10),
          "--no-autoconfig",
          "--strict",
        ],
        wranglerEnv,
        temporary,
      );
    }

    const url = deploymentUrl(await readFile(output, "utf8"));
    await verifyDeployment(url, credentials);
    return { account: account.name, url, credentials };
  } finally {
    await rm(temporary, { force: true, recursive: true });
  }
}
