import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { projectFilename } from "../project.ts";
import { parseProgress } from "./progress-schema.ts";
import { renderProgress } from "./progress-render.ts";

async function resolveRealPath(target: string): Promise<string> {
  try {
    return await realpath(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = path.dirname(target);
    if (parent === target) throw error;
    return path.join(await resolveRealPath(parent), path.basename(target));
  }
}

export async function compileProgress(project: string, output?: string): Promise<string> {
  const source = path.resolve(project, "src", "progress.json");
  const config = parseProgress(await readFile(source, "utf8"), source);
  const html = await renderProgress(config);
  const entry = path.resolve(output ?? path.join(project, "index.html"));
  if ([source, path.resolve(project, projectFilename)].includes(entry)) {
    throw new Error("progress: output must not overwrite the source or project metadata");
  }
  await mkdir(path.dirname(entry), { recursive: true });
  await writeFile(entry, html);
  return entry;
}

export async function createProgress(project: string, output?: string): Promise<string> {
  const root = path.resolve(project);
  const entry = path.resolve(output ?? path.join(root, "index.html"));
  const [realRoot, realEntry] = await Promise.all([resolveRealPath(root), resolveRealPath(entry)]);
  const relative = path.relative(realRoot, realEntry);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("progress: output must be inside the project directory");
  }
  const source = path.join(root, "src", "progress.json");
  try {
    await readFile(source, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(root, { recursive: true });
    if ((await readdir(root)).length > 0) throw new Error(`output directory must be empty: ${root}`);
    await mkdir(path.dirname(source), { recursive: true });
    await writeFile(source, `${JSON.stringify({
      title: "Project progress",
      lang: "en",
      goal: "Deliver the agreed outcome with verified evidence.",
      updated_at: new Date().toISOString(),
      status: "on_track",
      decisions: [],
      phases: [{
        id: "delivery",
        title: "Delivery",
        items: [{
          id: "confirm-outcome",
          title: "Confirm the outcome",
          status: "active",
          result: "Define acceptance evidence before implementation.",
          links: [],
        }],
      }],
    }, null, 2)}\n`, { flag: "wx" });
  }
  return await compileProgress(root, path.join(root, relative));
}
