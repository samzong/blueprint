import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import { parse, parseFragment } from "parse5";

import { assertPortableCss, escapeHtml, isElement, type HtmlElement, type HtmlNode } from "./shared.ts";

type DiagramSource = {
  height: number;
  svg: string;
  title: string;
  width: number;
};

type ProtectedInput = {
  file: string;
  label: string;
};

const forbiddenElements = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "embed",
  "foreignobject",
  "iframe",
  "object",
  "script",
  "set",
]);
const cssReferenceSyntax = /(?:url\(|@import\b|(?:-webkit-)?image-set\s*\(|\\)/i;
const sourceMarker = "data-blueprint-diagram";

function textContent(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textContent).join("") : "";
}

function attribute(element: HtmlElement, name: string): string | undefined {
  const lower = name.toLowerCase();
  return element.attrs.find((item) => item.name.toLowerCase() === lower)?.value;
}

function positiveInteger(value: string | undefined, filename: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${filename}: ${label} must be a positive integer`);
  }
  return parsed;
}

function assertInlineSvgCss(value: string, filename: string, location: string): void {
  try {
    assertPortableCss(value, filename);
  } catch {
    throw new Error(`${filename}: external reference in SVG ${location}`);
  }
  for (const match of value.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^\)"']+))\s*\)/gi)) {
    const reference = (match[2] ?? match[3] ?? "").trim();
    if (reference.startsWith("#") || /^data:image\//i.test(reference)) continue;
    throw new Error(`${filename}: external reference in SVG ${location}`);
  }
}

function parseDiagramSource(raw: string, filename: string): DiagramSource {
  const svg = raw.replace(/^\uFEFF/, "").replace(/^\s*<\?xml[^>]*>\s*/i, "").trim();
  const fragment = parseFragment(svg);
  const roots = fragment.childNodes.filter(isElement);
  const strayText = fragment.childNodes.some((node) => "value" in node && node.value.trim() !== "");
  if (roots.length !== 1 || roots[0].tagName !== "svg" || strayText) {
    throw new Error(`${filename}: expected exactly one root <svg> element`);
  }

  const root = roots[0];
  if (attribute(root, "xmlns") !== "http://www.w3.org/2000/svg") {
    throw new Error(`${filename}: root SVG must declare xmlns="http://www.w3.org/2000/svg"`);
  }
  if (attribute(root, sourceMarker) !== "true") {
    throw new Error(`${filename}: root SVG must declare ${sourceMarker}="true"`);
  }
  if (attribute(root, "width") !== undefined || attribute(root, "height") !== undefined) {
    throw new Error(`${filename}: root SVG dimensions must come from viewBox, not width or height`);
  }

  const viewBox = attribute(root, "viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error(`${filename}: root SVG must have a valid viewBox`);
  }
  const width = positiveInteger(String(viewBox[2]), filename, "viewBox width");
  const height = positiveInteger(String(viewBox[3]), filename, "viewBox height");

  const ids = new Set<string>();
  let title = "";
  let description = "";
  const pending: HtmlNode[] = [root];
  while (pending.length > 0) {
    const node = pending.shift();
    if (!node || !isElement(node)) continue;
    const tagName = node.tagName.toLowerCase();
    if (node !== root && tagName === "svg") throw new Error(`${filename}: nested SVG elements are not supported`);
    if (forbiddenElements.has(tagName)) throw new Error(`${filename}: unsafe <${node.tagName}> element`);
    if (tagName === "title" && title === "") title = textContent(node).trim();
    if (tagName === "desc" && description === "") description = textContent(node).trim();

    for (const item of node.attrs) {
      const name = item.name.toLowerCase();
      const value = item.value.trim();
      if (name.startsWith("on")) throw new Error(`${filename}: unsafe event handler attribute ${item.name}`);
      if (name === "id") {
        if (ids.has(value)) throw new Error(`${filename}: duplicate SVG id ${JSON.stringify(value)}`);
        ids.add(value);
      }
      if (name === "href" || name === "xlink:href" || name === "src") {
        const safeFragment = value.startsWith("#");
        const safeImage = tagName === "image" && /^data:image\//i.test(value);
        if (!safeFragment && !safeImage) throw new Error(`${filename}: external SVG reference in ${item.name}`);
      }
      if (name === "style" || cssReferenceSyntax.test(value)) {
        assertInlineSvgCss(value, filename, `attribute ${item.name}`);
      }
    }
    if (tagName === "style") assertInlineSvgCss(textContent(node), filename, "style");
    pending.push(...node.childNodes);
  }

  if (title === "") throw new Error(`${filename}: SVG must contain a non-empty <title>`);
  if (description === "") throw new Error(`${filename}: SVG must contain a non-empty <desc>`);
  try {
    new Resvg(svg);
  } catch (error) {
    throw new Error(`${filename}: SVG is not renderable: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { height, svg, title, width };
}

function assertCurrentEntry(entry: DiagramSource, canonical: DiagramSource, filename: string): void {
  if (entry.svg !== canonical.svg) {
    throw new Error(`${filename}: architecture entry is stale; run blueprint create architecture again`);
  }
}

function renderDocument(source: DiagramSource): string {
  return `<!DOCTYPE html>
<html lang="en" data-blueprint-preset="architecture">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(source.title)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#e9ebef;color:#171a21;font-family:Inter,"Helvetica Neue",Arial,sans-serif}.diagram-shell{min-height:100vh;padding:24px}.diagram-toolbar{width:min(100%,${source.width}px);margin:0 auto 14px;display:flex;align-items:center;justify-content:space-between;gap:16px}.diagram-meta{display:flex;align-items:center;gap:10px;min-width:0;font-size:13px;color:#69707b}.diagram-meta strong{overflow:hidden;color:#171a21;text-overflow:ellipsis;white-space:nowrap}.diagram-actions{display:flex;gap:8px}.diagram-actions button{appearance:none;border:1px solid #c7cbd2;border-radius:7px;background:#fff;color:#171a21;font:600 13px/1 Inter,"Helvetica Neue",Arial,sans-serif;padding:10px 13px;cursor:pointer}.diagram-actions button:hover{border-color:#2347eb;color:#2347eb}.diagram-canvas{width:min(100%,${source.width}px);margin:0 auto;background:#fff;box-shadow:0 18px 60px rgba(15,23,42,.12)}.diagram-canvas svg{display:block;width:100%;height:auto}@media(max-width:720px){.diagram-shell{padding:12px}.diagram-toolbar{align-items:flex-start;flex-direction:column}.diagram-actions{width:100%}.diagram-actions button{flex:1}}
</style>
</head>
<body>
<main class="diagram-shell">
  <div class="diagram-toolbar">
    <div class="diagram-meta"><strong>${escapeHtml(source.title)}</strong><span>${source.width} × ${source.height}</span></div>
    <div class="diagram-actions"><button type="button" data-download="svg">Download SVG</button><button type="button" data-download="png">Download PNG</button></div>
  </div>
  <div class="diagram-canvas">${source.svg}</div>
</main>
<script>
const diagram=document.querySelector("[${sourceMarker}]");
const source=()=>new XMLSerializer().serializeToString(diagram);
const save=(blob,name)=>{const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0)};
document.querySelector('[data-download="svg"]').addEventListener("click",()=>save(new Blob([source()],{type:"image/svg+xml"}),"architecture.svg"));
document.querySelector('[data-download="png"]').addEventListener("click",()=>{const image=new Image();const url=URL.createObjectURL(new Blob([source()],{type:"image/svg+xml"}));image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=${source.width};canvas.height=${source.height};canvas.getContext("2d").drawImage(image,0,0);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(blob)save(blob,"architecture.png")},"image/png")};image.src=url});
</script>
</body>
</html>
`;
}

async function writeOutput(
  protectedInputs: ProtectedInput[],
  outputFile: string,
  contents: string | Uint8Array,
): Promise<void> {
  await mkdir(path.dirname(outputFile), { recursive: true });
  try {
    const outputLink = await lstat(outputFile);
    if (outputLink.isSymbolicLink()) throw new Error(`output must not be a symbolic link: ${outputFile}`);
    const [outputRealPath, outputStats] = await Promise.all([realpath(outputFile), stat(outputFile)]);
    for (const input of protectedInputs) {
      const [inputRealPath, inputStats] = await Promise.all([realpath(input.file), stat(input.file)]);
      if (
        inputRealPath === outputRealPath ||
        (inputStats.dev === outputStats.dev && inputStats.ino === outputStats.ino)
      ) {
        throw new Error(`output must not overwrite the ${input.label}`);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const temporaryFile = path.join(
    path.dirname(outputFile),
    `.${path.basename(outputFile)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryFile, contents, { flag: "wx" });
    await rename(temporaryFile, outputFile);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

export function extractArchitectureSvg(html: string, filename: string): string {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const diagrams: HtmlElement[] = [];
  const pending: HtmlNode[] = [...document.childNodes];
  for (const node of pending) {
    if (!isElement(node)) continue;
    if (node.tagName === "svg" && attribute(node, sourceMarker) === "true") diagrams.push(node);
    pending.push(...node.childNodes);
  }
  if (diagrams.length !== 1) {
    throw new Error(`${filename}: expected exactly one Blueprint diagram SVG`);
  }
  const location = diagrams[0].sourceCodeLocation;
  if (!location) throw new Error(`${filename}: diagram SVG has no source location`);
  return html.slice(location.startOffset, location.endOffset);
}

export function checkArchitectureOutput(
  html: string,
  filename: string,
  canonicalSource?: { filename: string; raw: string },
): void {
  const root = parse(html).childNodes.find((node) => isElement(node) && node.tagName === "html");
  if (!root || !isElement(root) || attribute(root, "data-blueprint-preset") !== "architecture") {
    throw new Error(`${filename}: missing data-blueprint-preset="architecture"`);
  }
  const entry = parseDiagramSource(extractArchitectureSvg(html, filename), filename);
  if (canonicalSource) {
    assertCurrentEntry(entry, parseDiagramSource(canonicalSource.raw, canonicalSource.filename), filename);
  }
}

export async function createArchitecture(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceFile = path.join(projectDirectory, "src", "diagram.svg");
  const source = parseDiagramSource(await readFile(sourceFile, "utf8"), sourceFile);
  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));
  await writeOutput([{ file: sourceFile, label: "architecture source" }], outputFile, renderDocument(source));
  return outputFile;
}

export async function exportArchitecture(
  entry: string,
  format: "png" | "svg",
  output?: string,
  sourceFile?: string,
): Promise<string> {
  const absoluteEntry = path.resolve(entry);
  const html = await readFile(absoluteEntry, "utf8");
  const source = parseDiagramSource(extractArchitectureSvg(html, absoluteEntry), absoluteEntry);
  const canonicalFile = sourceFile ? path.resolve(sourceFile) : undefined;
  if (canonicalFile) {
    const canonical = parseDiagramSource(await readFile(canonicalFile, "utf8"), canonicalFile);
    assertCurrentEntry(source, canonical, absoluteEntry);
  }
  const outputFile = path.resolve(output ?? path.join(path.dirname(absoluteEntry), `architecture.${format}`));
  const contents =
    format === "svg"
      ? `<?xml version="1.0" encoding="UTF-8"?>\n${source.svg}\n`
      : new Resvg(source.svg, { fitTo: { mode: "original" } }).render().asPng();
  const protectedInputs = [{ file: absoluteEntry, label: "HTML entry" }];
  if (canonicalFile) protectedInputs.push({ file: canonicalFile, label: "architecture source" });
  await writeOutput(protectedInputs, outputFile, contents);
  return outputFile;
}
