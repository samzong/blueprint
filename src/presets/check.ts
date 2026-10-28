import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse, type DefaultTreeAdapterMap } from "parse5";

import type { ProjectPreset } from "../project.ts";
import { checkArchitectureOutput } from "./architecture.ts";
import { checkArchiveOutput } from "./archive.ts";
import { checkBriefingOutput } from "./briefing.ts";
import { checkPitchOutput } from "./pitch.ts";
import { checkScaffoldOutput } from "./scaffold.ts";
import { checkSlidesOutput } from "./slides.ts";
import { urlAttributes } from "./shared.ts";

const cssFileUrl = /(?:url\(|@import\s+)\s*['"]?\s*file:/i;
const templateMarker = /\{\{[^}]+\}\}/;

export function checkDocumentBasics(entry: string, html: string): void {
  let fileUrl = false;
  let unresolvedMarker = false;
  const nodes: Array<{ node: DefaultTreeAdapterMap["node"]; rawTextTag: string }> = parse(html, { sourceCodeLocationInfo: true }).childNodes.map(
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
        const location = node.sourceCodeLocation?.attrs?.[attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name];
        if (templateMarker.test(location ? html.slice(location.startOffset, location.endOffset) : attribute.value)) unresolvedMarker = true;
      }
      const rawTextTag =
        node.tagName === "script" || node.tagName === "style" ? node.tagName : current.rawTextTag;
      nodes.push(...node.childNodes.map((child) => ({ node: child, rawTextTag })));
      if ("content" in node) {
        nodes.push(...node.content.childNodes.map((child) => ({ node: child, rawTextTag })));
      }
    } else if ("value" in node) {
      if (current.rawTextTag === "style" && cssFileUrl.test(node.value)) fileUrl = true;
      const location = node.sourceCodeLocation;
      if (current.rawTextTag !== "script" && templateMarker.test(location ? html.slice(location.startOffset, location.endOffset) : node.value)) unresolvedMarker = true;
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
