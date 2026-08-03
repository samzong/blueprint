import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyInstallWorkflowExit,
  directoryBundle,
  installFlagError,
  parseInstallFlags,
  runBundledSkillInstall,
  type InstallFlagValues,
} from "@kitup/sdk";
import { parse, type DefaultTreeAdapterMap } from "parse5";

import { deployWorker } from "./deploy.ts";
import { checkArchiveOutput, createArchive } from "./presets/archive.ts";
import { checkBriefingOutput, createBriefing } from "./presets/briefing.ts";
import { checkPitchOutput, createPitch } from "./presets/pitch.ts";
import { checkScaffoldOutput, createScaffold } from "./presets/scaffold.ts";
import { checkSlidesOutput, createSlides } from "./presets/slides.ts";
import { urlAttributes } from "./presets/shared.ts";
import {
  findProject,
  findProjectOrNull,
  listProjects,
  readCompatibleProject,
  recordDeployment,
  recordProject,
  type ProjectPreset,
} from "./project.ts";

export type ParsedArgs = {
  account?: string;
  command?: string;
  installFlags?: InstallFlagValues;
  json?: boolean;
  name?: string;
  output?: string;
  port: number;
  preset?: string;
  root?: string;
  target: string;
};

const usage = `blueprint — agent-native web scaffolding

Usage:
  blueprint <command> [options]

Commands:
  create <preset> [directory]  Create a project from a preset
  check [target]                Validate generated output
  preview [target]              Preview locally
  deploy [target]               Publish to Cloudflare Workers
  list                          List managed projects
  skill install                 Install the bundled Agent Skill
  help [command]                Show help

Presets:
  pitch, briefing, archive, slides
  prototype-lite, prototype-full, dossier

Global options:
  -v, --version  Show version
  -h, --help     Show help

Run 'blueprint <command> --help' for command options.`;

const commandHelp: Record<string, string> = {
  create: `Usage:
  blueprint create <preset> [directory] [--output <file>]

Presets:
  pitch, briefing, archive, slides
    Build one HTML file from source content
  prototype-lite
    Create a single-file React prototype
  prototype-full, dossier
    Create a Vite project

Options:
  --output <file>  Output path for compiled presets
  -h, --help       Show this help`,
  check: `Usage:
  blueprint check [target]

Arguments:
  target  HTML file or project directory (default: .)

Options:
  -h, --help  Show this help`,
  preview: `Usage:
  blueprint preview [target] [options]

Arguments:
  target  HTML file or project directory (default: .)

Options:
  --root <path>  Additional filesystem root
  --port <port>  Local port (default: auto-selected)
  -h, --help     Show this help`,
  deploy: `Usage:
  blueprint deploy [target] --name <name> [options]

Arguments:
  target  Project entry or project directory (default: .)

Options:
  --name <name>             Worker name (required)
  --account <name-or-id>    Cloudflare account
  -h, --help                Show this help`,
  list: `Usage:
  blueprint list [options]

Options:
  --root <path>  Scan root (default: .)
  --json         Print JSON
  -h, --help     Show this help`,
  skill: `Usage:
  blueprint skill install [options]

Options:
  --scope <user|project>  Installation scope
  --agent <id>            Target agent; repeatable
  --dry-run               Preview changes
  -y, --yes               Skip confirmation
  --force                 Replace conflicting installation
  -h, --help              Show this help`,
};

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const agents: string[] = [];
  let account: string | undefined;
  let dryRun = false;
  let force = false;
  let json = false;
  let name: string | undefined;
  let output: string | undefined;
  let root: string | undefined;
  let scope: string | undefined;
  let scopeSet = false;
  let yes = false;
  let port = 0;

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];

    if (value === "--output" && command === "create") {
      output = rest[++index];
      if (!output) throw new Error("--output requires a path");
      continue;
    }

    if (value === "--root" && (command === "preview" || command === "list")) {
      root = rest[++index];
      if (!root || root.startsWith("--")) throw new Error("--root requires a path");
      continue;
    }

    if (value === "--json" && command === "list") {
      json = true;
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

    if (value === "--name" && command === "deploy") {
      name = rest[++index];
      if (!name || name.startsWith("-")) throw new Error("--name requires a Worker name");
      continue;
    }

    if (value === "--account" && command === "deploy") {
      account = rest[++index];
      if (!account || account.startsWith("-")) throw new Error("--account requires a name or id");
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

  if (command === "list") {
    if (positionals.length > 0) throw new Error("list does not accept positional arguments");
    return { command, json, port, root, target: "." };
  }

  if (command === "deploy") {
    if (positionals.length > 1) throw new Error("expected at most one target path");
    if (!name) throw new Error("--name is required");
    return {
      account,
      command,
      name,
      port,
      target: positionals[0] ?? ".",
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
  if (!targetStat.isDirectory()) return absoluteTarget;

  const project = await findProjectOrNull(absoluteTarget);
  return project?.root === absoluteTarget
    ? path.resolve(project.root, project.manifest.entry)
    : path.join(absoluteTarget, "index.html");
}

const cssFileUrl = /(?:url\(|@import\s+)\s*['"]?\s*file:/i;
const templateMarker = /\{\{[^}]+\}\}/;

function checkDocumentBasics(entry: string, html: string): void {
  let fileUrl = false;
  let unresolvedMarker = false;
  const nodes: Array<{ node: DefaultTreeAdapterMap["node"]; rawTextTag: string }> = parse(html).childNodes.map(
    (node) => ({ node, rawTextTag: "" }),
  );
  for (const current of nodes) {
    const { node } = current;
    if ("tagName" in node) {
      for (const attribute of node.attrs) {
        if (
          urlAttributes.includes(attribute.name) &&
          URL.canParse(attribute.value, "https://blueprint.invalid") &&
          new URL(attribute.value, "https://blueprint.invalid").protocol === "file:"
        ) {
          fileUrl = true;
        }
        if (attribute.name === "style" && cssFileUrl.test(attribute.value)) fileUrl = true;
        if (templateMarker.test(attribute.value)) unresolvedMarker = true;
      }
      const rawTextTag =
        node.tagName === "script" || node.tagName === "style" ? node.tagName : current.rawTextTag;
      nodes.push(...node.childNodes.map((child) => ({ node: child, rawTextTag })));
      if ("content" in node) {
        nodes.push(...node.content.childNodes.map((child) => ({ node: child, rawTextTag })));
      }
    } else if ("value" in node) {
      if (current.rawTextTag === "style" && cssFileUrl.test(node.value)) fileUrl = true;
      if (current.rawTextTag !== "script" && templateMarker.test(node.value)) unresolvedMarker = true;
    }
  }

  const errors = [
    !/<html(?:\s|>)/i.test(html) && "missing <html>",
    !/<head(?:\s|>)/i.test(html) && "missing <head>",
    !/<body(?:\s|>)/i.test(html) && "missing <body>",
    unresolvedMarker && "contains unresolved template markers",
    fileUrl && "contains file:// URLs",
  ].filter(Boolean);

  if (errors.length > 0) throw new Error(`${entry}: ${errors.join(", ")}`);
}

async function checkPresetOutput(
  preset: ProjectPreset,
  entry: string,
  html: string,
  projectRoot: string,
): Promise<void> {
  switch (preset) {
    case "pitch":
      checkPitchOutput(html, entry);
      return;
    case "briefing":
      checkBriefingOutput(html, entry);
      return;
    case "archive":
      checkArchiveOutput(html, entry);
      return;
    case "slides":
      checkSlidesOutput(html, entry);
      return;
    case "prototype-lite":
    case "prototype-full":
    case "dossier":
      await checkScaffoldOutput(html, entry, preset, projectRoot);
      return;
  }
}

async function checkCreatedEntry(entry: string, preset: ProjectPreset, projectRoot: string): Promise<void> {
  const html = await readFile(entry, "utf8");
  checkDocumentBasics(entry, html);
  await checkPresetOutput(preset, entry, html, projectRoot);
}

export async function checkEntry(target: string): Promise<string> {
  const targetProject = await findProjectOrNull(target);
  const entry = await resolveEntry(target);
  const html = await readFile(entry, "utf8");
  checkDocumentBasics(entry, html);

  const project = targetProject ?? (await findProjectOrNull(entry));
  if (project && path.resolve(project.root, project.manifest.entry) === entry) {
    await checkPresetOutput(project.manifest.preset, entry, html, project.root);
  }

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

export async function availablePort(): Promise<number> {
  const server = createServer();
  server.unref();
  return await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate a preview port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

export async function preview(target: string, rootOption: string | undefined, port: number): Promise<number> {
  const entry = await checkEntry(target);
  const project = await findProjectOrNull(entry);
  const viteProject =
    project &&
    path.resolve(project.root, project.manifest.entry) === entry &&
    (project.manifest.preset === "prototype-full" || project.manifest.preset === "dossier")
      ? project
      : null;
  if (viteProject && rootOption) throw new Error(`${viteProject.manifest.preset}: --root is not supported`);

  const root = viteProject?.root ?? path.resolve(rootOption ?? path.dirname(entry));
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new Error(`preview root is not a directory: ${root}`);

  if (viteProject) {
    try {
      await stat(path.join(root, "node_modules", "vite"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          `${viteProject.manifest.preset}: dependencies are missing; run pnpm install --ignore-workspace in ${root}`,
        );
      }
      throw error;
    }
  }

  port ||= await availablePort();
  const url = entryUrl(entry, root, port);
  const child = viteProject
    ? spawn("pnpm", ["--reporter=silent", "--ignore-workspace", "dev", "--port", String(port), "--strictPort"], {
        cwd: root,
        stdio: "inherit",
      })
    : spawn("gofs", ["--host", "127.0.0.1", "--port", String(port), "-d", `/:${root}:ro:blueprint`], {
        stdio: "inherit",
      });

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
    if (!viteProject) child.once("spawn", () => process.stdout.write(`Open ${url}\n`));
    child.once("error", (error) => {
      cleanup();
      reject(
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? new Error(
              viteProject
                ? `pnpm is required to preview ${viteProject.manifest.preset} projects`
                : "gofs is required; install with brew install gofs",
            )
          : error,
      );
    });
    child.once("exit", (code, signal) => {
      cleanup();
      if (interrupted || signal === "SIGINT" || signal === "SIGTERM") return resolve(0);
      if (signal) return resolve(128);
      resolve(code ?? 1);
    });
  });
}

async function packageVersion(): Promise<string> {
  const metadata: unknown = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("version" in metadata) ||
    typeof metadata.version !== "string"
  ) {
    throw new Error("package.json: missing version");
  }
  return metadata.version;
}


export function formatProjectList(
  projects: Awaited<ReturnType<typeof listProjects>>,
  color = false,
): string {
  const paint = (code: number, value: string) => (color ? `\u001b[${code}m${value}\u001b[0m` : value);
  const label = (value: string) => paint(2, value.padEnd(8));
  if (projects.length === 0) return `${paint(2, "No blueprint projects found")}\n`;

  return `${projects
    .map((project) => {
      if (project.error) {
        return `${paint(31, "×")} ${paint(1, "invalid")}  ${paint(31, "invalid")}\n  ├─ ${label("local")} ${project.path}\n  └─ ${label("error")} ${project.error}`;
      }
      const status = project.deployed ? "deployed" : "local";
      const statusColor = project.deployed ? 32 : 33;
      return `${paint(statusColor, project.deployed ? "●" : "○")} ${paint(1, project.name ?? "unnamed")}  ${paint(statusColor, status)}\n  ├─ ${label("preset")} ${project.preset}\n  ├─ ${label("version")} ${project.createdWith}\n  ├─ ${label("local")} ${project.path}\n  └─ ${label("remote")} ${project.url ?? "-"}`;
    })
    .join("\n\n")}\n`;
}

export async function main(argv: string[]): Promise<number> {
  const helpRequested = argv.includes("-h") || argv.includes("--help");
  if (argv.length === 0 || (argv.length === 1 && helpRequested)) {
    process.stdout.write(`${usage}\n`);
    return 0;
  }

  if (argv[0] === "help") {
    if (argv.length > 2) throw new Error("help accepts at most one command");
    const command = argv[1];
    const text = command ? commandHelp[command] : usage;
    if (!text) throw new Error(`unknown command: ${command}`);
    process.stdout.write(`${text}\n`);
    return 0;
  }

  if (helpRequested) {
    const text = commandHelp[argv[0]];
    if (!text) throw new Error(`unknown command: ${argv[0]}`);
    process.stdout.write(`${text}\n`);
    return 0;
  }

  const args = parseArgs(argv);

  if (args.command === "--version" || args.command === "-v" || args.command === "version") {
    process.stdout.write(`blueprint ${await packageVersion()}\n`);
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

  if (args.command === "list") {
    const projects = await listProjects(args.root ?? ".");
    if (args.json) {
      process.stdout.write(`${JSON.stringify(projects, null, 2)}\n`);
    } else {
      process.stdout.write(formatProjectList(projects, Boolean(process.stdout.isTTY) && !("NO_COLOR" in process.env)));
    }
    return 0;
  }

  if (args.command === "create") {
    let entry: string;
    let preset: ProjectPreset;
    if (
      args.preset === "pitch" ||
      args.preset === "archive" ||
      args.preset === "briefing" ||
      args.preset === "slides" ||
      args.preset === "prototype-lite" ||
      args.preset === "prototype-full" ||
      args.preset === "dossier"
    ) {
      await readCompatibleProject(args.target, args.preset);
    }
    if (args.preset === "pitch") {
      preset = args.preset;
      entry = await createPitch(args.target, args.output);
    } else if (args.preset === "archive") {
      preset = args.preset;
      entry = await createArchive(args.target, args.output);
    } else if (args.preset === "briefing") {
      preset = args.preset;
      entry = await createBriefing(args.target, args.output);
    } else if (args.preset === "slides") {
      preset = args.preset;
      entry = await createSlides(args.target, args.output);
    } else if (
      args.preset === "prototype-lite" ||
      args.preset === "prototype-full" ||
      args.preset === "dossier"
    ) {
      if (args.output) throw new Error("--output is only available for compiled presets");
      preset = args.preset;
      entry = await createScaffold(preset, args.target);
    } else {
      throw new Error("unknown preset");
    }

    await checkCreatedEntry(entry, preset, path.resolve(args.target));
    await recordProject(args.target, preset, entry, await packageVersion());
    process.stdout.write(`Created ${entry}\nPreview with: blueprint preview ${JSON.stringify(entry)}\n`);
    return 0;
  }

  if (args.command === "check") {
    const entry = await checkEntry(args.target);
    process.stdout.write(`OK ${entry}\n`);
    return 0;
  }

  if (args.command === "deploy" && args.name) {
    let target = args.target;
    if (target === ".") {
      const matches = (await listProjects(target)).filter((project) => project.name === args.name);
      if (matches.length > 1) {
        throw new Error(`multiple managed projects named ${args.name}: ${matches.map((project) => project.path).join(", ")}`);
      }
      target = matches[0]?.path ?? target;
    }

    const entry = await checkEntry(target);
    const project = await findProject(target);
    if (project.manifest.preset === "prototype-full" || project.manifest.preset === "dossier") {
      if (path.resolve(target) !== path.join(project.root, "dist")) {
        throw new Error(`${project.manifest.preset}: run pnpm build and deploy ${path.join(project.root, "dist")}`);
      }
    } else if (entry !== path.resolve(project.root, project.manifest.entry)) {
      throw new Error(
        `${entry}: not the entry of the project at ${project.root}; deploy ${project.manifest.entry} or the project directory`,
      );
    }
    const result = await deployWorker(target, entry, {
      account: args.account ?? project.manifest.deployment?.account,
      name: args.name,
    });
    await recordDeployment(project.root, {
      account: result.account,
      provider: "cloudflare-workers",
      url: result.url,
      workerName: args.name,
    });
    process.stdout.write(`Published ${result.url}\n`);
    return 0;
  }

  if (args.command === "preview") {
    return await preview(args.target, args.root, args.port);
  }

  process.stderr.write(`${usage}\n`);
  return 1;
}
