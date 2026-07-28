import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

type ScaffoldPreset = "dossier" | "prototype-full" | "prototype-lite";

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

  const template = preset === "prototype-lite" ? "prototype-lite" : "dossier";
  const templateDirectory = new URL(`../templates/${template}/`, import.meta.url);
  await cp(templateDirectory, projectDirectory, { recursive: true });

  const tokens = {
    __PROJECT_NAME__: projectName(projectDirectory),
    __PROJECT_TITLE__: projectTitle(projectDirectory),
    __PRESET__: preset === "dossier" ? "Dossier" : "Prototype",
  };
  const tokenFiles =
    template === "prototype-lite"
      ? ["index.html"]
      : ["package.json", "index.html", path.join("src", "App.tsx")];
  await Promise.all(tokenFiles.map((filename) => replaceTokens(path.join(projectDirectory, filename), tokens)));
  return path.join(projectDirectory, "index.html");
}
