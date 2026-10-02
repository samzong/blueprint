import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "parse5";

import { projectFilename, readCompatibleProject } from "../project.ts";
import { assertPortableCss, isElement, localReference, type HtmlNode, urlAttributes } from "./shared.ts";

function checkReference(value: string, entry: string): void {
  if (value.trim() && (localReference(value) || /^\s*file:/i.test(value))) {
    throw new Error(`${entry}: local reference ${value} is not published; inline it or use an absolute external URL`);
  }
}

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

export async function checkHtmlOutput(html: string, entry: string, root: string): Promise<void> {
  if (path.resolve(entry) !== path.join(path.resolve(root), "index.html") || (await lstat(entry)).isSymbolicLink()) {
    throw new Error(`${entry}: html entry must be a regular project-root index.html`);
  }
  const companions = (await readdir(root)).filter((name) => name !== "index.html" && name !== projectFilename);
  if (companions.length > 0) {
    throw new Error(`${entry}: html is single-file; companion files are not published: ${companions.join(", ")}`);
  }
  const nodes: HtmlNode[] = [...parse(html).childNodes];
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node.tagName === "base") throw new Error(`${entry}: <base> is not supported in single-file HTML`);
    if (node.tagName === "meta" && node.attrs.some((attribute) => attribute.name === "http-equiv" && attribute.value.trim().toLowerCase() === "refresh")) {
      const content = node.attrs.find((attribute) => attribute.name === "content")?.value ?? "";
      const destination = /[;,]\s*(?:url\s*=\s*)?(.*)/i.exec(content)?.[1];
      if (destination) checkReference(destination.trim().replace(/^(['"])(.*)\1$/, "$2"), entry);
    }
    for (const attribute of node.attrs) {
      if (attribute.name === "style") assertPortableCss(attribute.value, entry);
      if (attribute.name === "srcdoc") nodes.push(...parse(attribute.value).childNodes);
      if (attribute.name === "srcset" || attribute.name === "imagesrcset") {
        throw new Error(`${entry}: srcset is not supported; use an inline or HTTPS src`);
      }
      if (urlAttributes.includes(attribute.name) || attribute.name === "background") checkReference(attribute.value, entry);
    }
    if (node.tagName === "style") {
      assertPortableCss(node.childNodes.map((child) => "value" in child ? child.value : "").join(""), entry);
    }
    nodes.push(...node.childNodes);
    if ("content" in node) nodes.push(...node.content.childNodes);
  }
}
