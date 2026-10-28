import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProjectPreset } from "../project.ts";
import { checkArchitectureOutput } from "./architecture.ts";
import { checkArchiveOutput } from "./archive.ts";
import { checkBriefingOutput } from "./briefing.ts";
import { checkPitchOutput } from "./pitch.ts";
import { checkScaffoldOutput } from "./scaffold.ts";
import { checkSlidesOutput } from "./slides.ts";

export async function checkPresetOutput(
  preset: ProjectPreset,
  entry: string,
  html: string,
  projectRoot: string,
): Promise<void> {
  switch (preset) {
    case "architecture": {
      const sourceFile = path.join(projectRoot, "src", "diagram.svg");
      checkArchitectureOutput(html, entry, { filename: sourceFile, raw: await readFile(sourceFile, "utf8") });
      return;
    }
    case "progress":
      return;
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
