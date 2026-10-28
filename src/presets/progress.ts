import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { checkDocumentBasics } from "./check.ts";
import { parseProgress } from "./progress-schema.ts";
import { renderProgress } from "./progress-render.ts";

export async function createProgress(project: string, output?: string): Promise<string> {
  const root = path.resolve(project);
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
  const config = parseProgress(await readFile(source, "utf8"), source);
  const html = await renderProgress(config);
  const entry = path.resolve(output ?? path.join(root, "index.html"));
  checkDocumentBasics(entry, html);
  await mkdir(path.dirname(entry), { recursive: true });
  await writeFile(entry, html);
  return entry;
}
