#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  classifyInstallWorkflowExit,
  directoryBundle,
  installFlagError,
  parseInstallFlags,
  runBundledSkillInstall,
  type InstallFlagValues,
} from "@kitup/sdk";

import { createBriefing } from "./presets/briefing.ts";
import { createPitch } from "./presets/pitch.ts";
import { createScaffold } from "./presets/scaffold.ts";

export type ParsedArgs = {
  command?: string;
  installFlags?: InstallFlagValues;
  output?: string;
  port: number;
  preset?: string;
  root?: string;
  target: string;
};

const usage = `Usage:
  blueprint create pitch [project-directory] [--output index.html]
  blueprint create briefing [project-directory] [--output index.html]
  blueprint create prototype-lite <empty-directory>
  blueprint create prototype-full <empty-directory>
  blueprint create dossier <empty-directory>
  blueprint check [index.html-or-directory]
  blueprint preview [index.html-or-directory] [--root path] [--port 4175]
  blueprint skill install [--scope user|project] [--agent id] [--dry-run] [--yes] [--force]
  blueprint --version`;

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const agents: string[] = [];
  let dryRun = false;
  let force = false;
  let output: string | undefined;
  let root: string | undefined;
  let scope: string | undefined;
  let scopeSet = false;
  let yes = false;
  let port = 4175;

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];

    if (value === "--output" && command === "create") {
      output = rest[++index];
      if (!output) throw new Error("--output requires a path");
      continue;
    }

    if (value === "--root" && command === "preview") {
      root = rest[++index];
      if (!root) throw new Error("--root requires a path");
      continue;
    }

    if (value === "--port" && command === "preview") {
      const rawPort = rest[++index];
      port = Number(rawPort);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("--port must be an integer between 1 and 65535");
      }
      continue;
    }

    if (command === "skill") {
      if (value === "--scope") {
        scope = rest[++index];
        if (!scope) throw new Error("--scope requires user or project");
        scopeSet = true;
        continue;
      }
      if (value === "--agent") {
        const agent = rest[++index];
        if (!agent) throw new Error("--agent requires an id");
        agents.push(agent);
        continue;
      }
      if (value === "--dry-run") {
        dryRun = true;
        continue;
      }
      if (value === "--yes" || value === "-y") {
        yes = true;
        continue;
      }
      if (value === "--force") {
        force = true;
        continue;
      }
    }

    if (value.startsWith("--") || (command === "skill" && value.startsWith("-"))) {
      throw new Error(`unknown option: ${value}`);
    }
    positionals.push(value);
  }

  if (command === "create") {
    if (positionals.length > 2) throw new Error("expected a preset and at most one source directory");
    return {
      command,
      output,
      port,
      preset: positionals[0],
      target: positionals[1] ?? ".",
    };
  }

  if (command === "skill") {
    if (positionals.length !== 1 || positionals[0] !== "install") {
      throw new Error("expected skill install");
    }
    return {
      command,
      installFlags: { agents, dryRun, force, scope, scopeSet, yes },
      port,
      target: ".",
    };
  }

  if (positionals.length > 1) throw new Error("expected at most one target path");
  return {
    command,
    port,
    root,
    target: positionals[0] ?? ".",
  };
}

export async function resolveEntry(target: string): Promise<string> {
  const absoluteTarget = path.resolve(target);
  const targetStat = await stat(absoluteTarget);
  return targetStat.isDirectory() ? path.join(absoluteTarget, "index.html") : absoluteTarget;
}

export async function checkEntry(target: string): Promise<string> {
  const entry = await resolveEntry(target);
  const html = await readFile(entry, "utf8");
  const errors = [
    !/<html(?:\s|>)/i.test(html) && "missing <html>",
    !/<head(?:\s|>)/i.test(html) && "missing <head>",
    !/<body(?:\s|>)/i.test(html) && "missing <body>",
    /\{\{[^}]+\}\}/.test(html) && "contains unresolved template markers",
    /file:\/\//i.test(html) && "contains file:// URLs",
  ].filter(Boolean);

  if (errors.length > 0) throw new Error(`${entry}: ${errors.join(", ")}`);
  return entry;
}

export function entryUrl(entry: string, root: string, port: number): string {
  const relative = path.relative(root, entry);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`entry must be inside preview root: ${root}`);
  }

  const pathname = relative.split(path.sep).map(encodeURIComponent).join("/");
  return `http://127.0.0.1:${port}/${pathname}`;
}

export async function preview(target: string, rootOption: string | undefined, port: number): Promise<number> {
  const entry = await checkEntry(target);
  const root = path.resolve(rootOption ?? path.dirname(entry));
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new Error(`preview root is not a directory: ${root}`);

  const url = entryUrl(entry, root, port);
  process.stdout.write(`Open ${url}\n`);

  const child = spawn(
    "gofs",
    ["--host", "127.0.0.1", "--port", String(port), "-d", `/:${root}:ro:blueprint`],
    { stdio: "inherit" },
  );

  return await new Promise((resolve, reject) => {
    let interrupted = false;
    const stop = (signal: NodeJS.Signals) => {
      interrupted = true;
      if (!child.killed) child.kill(signal);
    };
    const stopOnInterrupt = () => stop("SIGINT");
    const stopOnTerminate = () => stop("SIGTERM");
    const cleanup = () => {
      process.off("SIGINT", stopOnInterrupt);
      process.off("SIGTERM", stopOnTerminate);
    };

    process.once("SIGINT", stopOnInterrupt);
    process.once("SIGTERM", stopOnTerminate);
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      if (interrupted || signal === "SIGINT" || signal === "SIGTERM") return resolve(0);
      if (signal) return resolve(128);
      resolve(code ?? 1);
    });
  });
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (args.command === "--version" || args.command === "-v" || args.command === "version") {
    const metadata: unknown = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      !("version" in metadata) ||
      typeof metadata.version !== "string"
    ) {
      throw new Error("package.json: missing version");
    }
    process.stdout.write(`blueprint ${metadata.version}\n`);
    return 0;
  }

  if (args.command === "skill" && args.installFlags) {
    const flags = parseInstallFlags(args.installFlags);
    const flagError = installFlagError(flags.errors);
    if (flagError) throw flagError;

    const workflow = await runBundledSkillInstall({
      appId: "blueprint",
      skillBundle: directoryBundle(fileURLToPath(new URL("../skill/blueprint", import.meta.url))),
      scope: flags.scope,
      agents: flags.agents,
      force: flags.force,
      yes: flags.yes,
      dryRun: flags.dryRun,
      scopeSet: flags.scopeSet,
      promptScope: true,
      defaultScope: "user",
    });
    const exit = classifyInstallWorkflowExit(workflow);
    if (!exit.ok) {
      process.stderr.write(`${exit.message}\n`);
      return 1;
    }
    return 0;
  }

  if (args.command === "create") {
    let entry: string;
    if (args.preset === "pitch") entry = await createPitch(args.target, args.output);
    else if (args.preset === "briefing") entry = await createBriefing(args.target, args.output);
    else if (
      args.preset === "prototype-lite" ||
      args.preset === "prototype-full" ||
      args.preset === "dossier"
    ) {
      if (args.output) throw new Error("--output is only available for compiled presets");
      entry = await createScaffold(args.preset, args.target);
    } else {
      throw new Error("unknown preset");
    }

    await checkEntry(entry);
    process.stdout.write(`Created ${entry}\nPreview with: blueprint preview ${JSON.stringify(entry)}\n`);
    return 0;
  }

  if (args.command === "check") {
    const entry = await checkEntry(args.target);
    process.stdout.write(`OK ${entry}\n`);
    return 0;
  }

  if (args.command === "preview") {
    return await preview(args.target, args.root, args.port);
  }

  process.stderr.write(`${usage}\n`);
  return args.command === undefined || args.command === "help" || args.command === "--help" ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
