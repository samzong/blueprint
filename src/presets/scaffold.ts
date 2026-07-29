import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type ScaffoldPreset = "dossier" | "prototype-full" | "prototype-lite";

const unresolvedToken = /__[A-Z0-9_]+__/;

function projectName(project: string): string {
  return (
    path
      .basename(path.resolve(project))
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "blueprint-project"
  );
}

function projectTitle(project: string): string {
  return path
    .basename(path.resolve(project))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function replaceTokens(filename: string, tokens: Record<string, string>): Promise<void> {
  let content = await readFile(filename, "utf8");
  for (const [token, value] of Object.entries(tokens)) content = content.replaceAll(token, value);
  await writeFile(filename, content);
}

export async function createScaffold(preset: ScaffoldPreset, project: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  await mkdir(projectDirectory, { recursive: true });
  const existing = await readdir(projectDirectory);
  if (existing.length > 0) throw new Error(`output directory must be empty: ${projectDirectory}`);

  const template = preset === "prototype-full" ? "dossier" : preset;
  const templateDirectory = new URL(`../templates/${template}/`, import.meta.url);
  await cp(templateDirectory, projectDirectory, { recursive: true });
  if (preset === "prototype-full") {
    await cp(new URL("../templates/prototype-full/", import.meta.url), projectDirectory, { recursive: true });
  }

  const tokens = {
    __PROJECT_NAME__: projectName(projectDirectory),
    __PROJECT_TITLE__: projectTitle(projectDirectory),
    __PRESET__: preset === "dossier" ? "Dossier" : "Prototype",
  };
  const tokenFiles =
    template === "prototype-lite"
      ? ["index.html"]
      : [
          "package.json",
          "index.html",
          path.join("src", "App.tsx"),
          path.join("src", "data", "content.ts"),
        ];
  await Promise.all(tokenFiles.map((filename) => replaceTokens(path.join(projectDirectory, filename), tokens)));
  return path.join(projectDirectory, "index.html");
}

export async function checkScaffoldOutput(
  html: string,
  filename: string,
  preset: ScaffoldPreset,
  projectRoot: string,
): Promise<void> {
  if (unresolvedToken.test(html)) {
    throw new Error(`${filename}: contains unresolved scaffold tokens`);
  }

  if (preset === "prototype-lite") {
    if (!/ReactDOM\.createRoot/.test(html)) {
      throw new Error(`${filename}: missing ReactDOM.createRoot bootstrap`);
    }
    return;
  }

  const packageFile = path.join(projectRoot, "package.json");
  let packageRaw: string;
  try {
    packageRaw = await readFile(packageFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${packageFile}: missing package.json for ${preset}`);
    }
    throw error;
  }

  if (unresolvedToken.test(packageRaw)) {
    throw new Error(`${packageFile}: contains unresolved scaffold tokens`);
  }

  let packageValue: unknown;
  try {
    packageValue = JSON.parse(packageRaw);
  } catch {
    throw new Error(`${packageFile}: invalid JSON`);
  }
  const manifest = packageValue as { name?: unknown; scripts?: Record<string, unknown> };
  if (
    typeof packageValue !== "object" ||
    packageValue === null ||
    typeof manifest.name !== "string" ||
    manifest.name.trim() === ""
  ) {
    throw new Error(`${packageFile}: name must be a non-empty string`);
  }

  const scripts = manifest.scripts;
  if (
    !scripts ||
    typeof scripts.build !== "string" ||
    scripts.build.trim() === "" ||
    typeof scripts.dev !== "string" ||
    scripts.dev.trim() === ""
  ) {
    throw new Error(`${packageFile}: ${preset} requires non-empty dev and build scripts`);
  }

  const moduleTag = html.match(/<script\b[^>]*\btype=["']module["'][^>]*>/i)?.[0];
  const moduleSource = moduleTag?.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (!moduleSource || /^[a-z][a-z0-9+.-]*:/i.test(moduleSource) || moduleSource.startsWith("//")) {
    throw new Error(`${filename}: ${preset} requires a local module source entry`);
  }

  const sourcePath = decodeURIComponent(moduleSource.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
  const sourceFile = path.resolve(projectRoot, sourcePath);
  const relativeSource = path.relative(projectRoot, sourceFile);
  if (relativeSource === ".." || relativeSource.startsWith(`..${path.sep}`) || path.isAbsolute(relativeSource)) {
    throw new Error(`${filename}: module source entry must stay inside the project`);
  }
  try {
    await readFile(sourceFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${filename}: missing module source entry ${moduleSource}`);
    }
    throw error;
  }
}
