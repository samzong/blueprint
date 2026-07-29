import { randomUUID } from "node:crypto";
import { readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const projectFilename = ".blueprint.json";

export type ProjectPreset = "pitch" | "briefing" | "archive" | "slides" | "prototype-lite" | "prototype-full" | "dossier";

export type ProjectDeployment = {
  account: string;
  provider: "cloudflare-workers";
  url: string;
  workerName: string;
};

export type ProjectManifest = {
  createdWith: string;
  deployment: ProjectDeployment | null;
  entry: string;
  name: string;
  preset: ProjectPreset;
  projectId: string;
  schemaVersion: 1;
};

export type ProjectSummary = {
  deployed: boolean;
  entry?: string;
  error?: string;
  name?: string;
  path: string;
  preset?: ProjectPreset;
  projectId?: string;
  url: string | null;
};

const presets = new Set<ProjectPreset>(["pitch", "briefing", "archive", "slides", "prototype-lite", "prototype-full", "dossier"]);
const ignoredDirectories = new Set([".git", ".cache", ".Trash", "Library", "node_modules"]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseDeployment(value: unknown, filename: string): ProjectDeployment | null {
  if (value === null) return null;
  if (
    !object(value) ||
    value.provider !== "cloudflare-workers" ||
    !nonEmpty(value.account) ||
    !nonEmpty(value.workerName) ||
    !nonEmpty(value.url)
  ) {
    throw new Error(`${filename}: invalid deployment`);
  }

  let url: URL;
  try {
    url = new URL(value.url);
  } catch {
    throw new Error(`${filename}: deployment URL must be HTTPS`);
  }
  if (url.protocol !== "https:") throw new Error(`${filename}: deployment URL must be HTTPS`);

  return {
    account: value.account,
    provider: value.provider,
    url: value.url,
    workerName: value.workerName,
  };
}

function parseManifest(value: unknown, filename: string): ProjectManifest {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !nonEmpty(value.projectId) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.entry) ||
    !nonEmpty(value.createdWith) ||
    typeof value.preset !== "string" ||
    !presets.has(value.preset as ProjectPreset) ||
    !("deployment" in value)
  ) {
    throw new Error(`${filename}: invalid blueprint project metadata`);
  }

  return {
    createdWith: value.createdWith,
    deployment: parseDeployment(value.deployment, filename),
    entry: value.entry,
    name: value.name,
    preset: value.preset as ProjectPreset,
    projectId: value.projectId,
    schemaVersion: 1,
  };
}

function errorCode(error: unknown): string | undefined {
  return object(error) && typeof error.code === "string" ? error.code : undefined;
}

async function writeManifest(projectRoot: string, manifest: ProjectManifest): Promise<void> {
  const filename = path.join(projectRoot, projectFilename);
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  try {
    if ((await readFile(filename, "utf8")) === content) return;
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
  }

  const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: "wx" });
    await rename(temporary, filename);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function readProject(projectRoot: string): Promise<ProjectManifest> {
  const filename = path.join(path.resolve(projectRoot), projectFilename);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${filename}: invalid JSON`);
    throw error;
  }
  return parseManifest(value, filename);
}

export async function readCompatibleProject(
  projectRoot: string,
  preset: ProjectPreset,
): Promise<ProjectManifest | undefined> {
  const root = path.resolve(projectRoot);
  let existing: ProjectManifest;
  try {
    existing = await readProject(root);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
  if (existing.preset !== preset) {
    throw new Error(`${path.join(root, projectFilename)}: preset is ${existing.preset}, not ${preset}`);
  }
  return existing;
}

export async function recordProject(
  projectRoot: string,
  preset: ProjectPreset,
  entry: string,
  createdWith: string,
): Promise<ProjectManifest> {
  const root = path.resolve(projectRoot);
  const relativeEntry = path.relative(root, path.resolve(entry)).split(path.sep).join("/") || ".";
  const existing = await readCompatibleProject(root, preset);

  const manifest: ProjectManifest = existing
    ? { ...existing, entry: relativeEntry }
    : {
        createdWith,
        deployment: null,
        entry: relativeEntry,
        name: path.basename(root),
        preset,
        projectId: randomUUID(),
        schemaVersion: 1,
      };
  await writeManifest(root, manifest);
  return manifest;
}

export async function findProjectOrNull(
  target: string,
): Promise<{ manifest: ProjectManifest; root: string } | null> {
  const resolved = path.resolve(target);
  let directory = (await stat(resolved)).isDirectory() ? resolved : path.dirname(resolved);

  for (;;) {
    try {
      return { manifest: await readProject(directory), root: directory };
    } catch (error) {
      if (errorCode(error) !== "ENOENT") throw error;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  return null;
}

export async function findProject(target: string): Promise<{ manifest: ProjectManifest; root: string }> {
  const project = await findProjectOrNull(target);
  if (!project) throw new Error(`${projectFilename} not found for ${path.resolve(target)}`);
  return project;
}

export async function recordDeployment(projectRoot: string, deployment: ProjectDeployment): Promise<void> {
  const manifest = await readProject(projectRoot);
  await writeManifest(projectRoot, { ...manifest, deployment });
}

async function directoryEntries(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (["EACCES", "ENOENT", "EPERM"].includes(errorCode(error) ?? "")) return [];
    throw error;
  }
}

export async function listProjects(root: string): Promise<ProjectSummary[]> {
  const resolvedRoot = path.resolve(root);
  if (!(await stat(resolvedRoot)).isDirectory()) throw new Error(`list root must be a directory: ${resolvedRoot}`);

  const directories = [resolvedRoot];
  const projects: ProjectSummary[] = [];

  while (directories.length > 0) {
    const batch = directories.splice(0, 32);
    const listings = await Promise.all(batch.map(async (directory) => [directory, await directoryEntries(directory)] as const));

    for (const [directory, entries] of listings) {
      for (const entry of entries) {
        if (entry.isFile() && entry.name === projectFilename) {
          try {
            const manifest = await readProject(directory);
            projects.push({
              deployed: manifest.deployment !== null,
              entry: manifest.entry,
              name: manifest.name,
              path: directory,
              preset: manifest.preset,
              projectId: manifest.projectId,
              url: manifest.deployment?.url ?? null,
            });
          } catch (error) {
            projects.push({
              deployed: false,
              error: error instanceof Error ? error.message : String(error),
              path: directory,
              url: null,
            });
          }
        }

        if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
        directories.push(path.join(directory, entry.name));
      }
    }
  }

  return projects.sort((left, right) => left.path.localeCompare(right.path));
}
