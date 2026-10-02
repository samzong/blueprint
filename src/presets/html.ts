import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readCompatibleProject } from "../project.ts";

export async function createHtml(project: string): Promise<string> {
  const root = path.resolve(project);
  const existing = await readCompatibleProject(root, "html");
  if (existing) return path.resolve(root, existing.entry);
  await mkdir(root, { recursive: true });
  if ((await readdir(root)).length > 0) throw new Error(`output directory must be empty: ${root}`);
  const entry = path.join(root, "index.html");
  await writeFile(entry, '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Untitled</title>\n</head>\n<body></body>\n</html>\n', { flag: "wx" });
  return entry;
}


export async function checkHtmlOutput(entry: string, root: string): Promise<void> {
  if (path.resolve(entry) !== path.join(path.resolve(root), "index.html") || (await lstat(entry)).isSymbolicLink()) {
    throw new Error(`${entry}: html entry must be a regular project-root index.html`);
  }
}
