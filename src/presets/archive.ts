import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { archiveZhCNLabels } from "./archive.zh-CN.ts";
import { escapeHtml, language, optionalFile, parseObject, requiredString } from "./shared.ts";

type ArchiveConfig = {
  downloadName: string;
  lang: string;
  title: string;
};

type ArchiveDocument = {
  content: string;
  path: string;
  title: string;
};

function parseConfig(raw: string, filename: string, projectDirectory: string): ArchiveConfig {
  const config = parseObject(raw, filename);
  const downloadName = config.downloadName ?? `${path.basename(projectDirectory)}.zip`;
  if (
    typeof downloadName !== "string" ||
    downloadName.trim() === "" ||
    downloadName.includes("/") ||
    downloadName.includes("\\")
  ) {
    throw new Error(`${filename}: downloadName must be a filename`);
  }
  return {
    downloadName,
    lang: language(config, filename),
    title: requiredString(config, "title", filename),
  };
}

async function markdownFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(absolutePath, relativePath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }
  return files;
}

function documentTitle(content: string, documentPath: string): string {
  const heading = /^#\s+(.+)$/m.exec(content)?.[1]?.trim();
  if (heading) return heading;
  return path.posix
    .basename(documentPath, ".md")
    .replace(/^\d+-/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sortDocuments(documents: ArchiveDocument[]): ArchiveDocument[] {
  return documents.sort((left, right) => {
    if (left.path === "README.md") return -1;
    if (right.path === "README.md") return 1;
    const leftDirectory = path.posix.dirname(left.path);
    const rightDirectory = path.posix.dirname(right.path);
    if (leftDirectory === rightDirectory && path.posix.basename(left.path) === "README.md") return -1;
    if (leftDirectory === rightDirectory && path.posix.basename(right.path) === "README.md") return 1;
    return left.path.localeCompare(right.path, "zh-Hans-CN", { numeric: true });
  });
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

const archiveRequiredIds = ["docs", "content", "meta", "filter", "download", "doc-count"] as const;

export function checkArchiveOutput(html: string, filename: string): void {
  if (!/\bconst\s+ARCHIVE\s*=/.test(html)) {
    throw new Error(`${filename}: missing ARCHIVE payload`);
  }
  if (!/"documents"\s*:\s*\[\s*\{/.test(html)) {
    throw new Error(`${filename}: ARCHIVE documents must be a non-empty array`);
  }
  for (const id of archiveRequiredIds) {
    const marker = new RegExp(`\\bid=(["'])${id}\\1`, "i");
    if (!marker.test(html)) throw new Error(`${filename}: missing #${id}`);
  }
}

export async function createArchive(project: string, output?: string): Promise<string> {
  const projectDirectory = path.resolve(project);
  const sourceDirectory = path.join(projectDirectory, "src");
  const configFile = path.join(sourceDirectory, "archive.json");
  const docsDirectory = path.join(sourceDirectory, "docs");
  const customCssFile = path.join(sourceDirectory, "style.css");
  const [configRaw, documentPaths, customCss, archiveCss, archiveRuntime] = await Promise.all([
    readFile(configFile, "utf8"),
    markdownFiles(docsDirectory),
    optionalFile(customCssFile),
    readFile(new URL("./archive.css", import.meta.url), "utf8"),
    readFile(new URL("./archive-runtime.js", import.meta.url), "utf8"),
  ]);

  if (documentPaths.length === 0) throw new Error(`${docsDirectory}: no Markdown documents found`);
  if (/<\/style/i.test(customCss)) throw new Error(`${customCssFile}: contains </style`);

  const config = parseConfig(configRaw, configFile, projectDirectory);
  const documents = sortDocuments(
    await Promise.all(
      documentPaths.map(async (documentPath) => {
        const content = await readFile(path.join(docsDirectory, documentPath), "utf8");
        return { content, path: documentPath, title: documentTitle(content, documentPath) };
      }),
    ),
  );
  const labels = config.lang.toLowerCase().startsWith("zh")
    ? archiveZhCNLabels(documents.length)
    : {
        count: `${documents.length} documents`,
        download: "Download all",
        empty: "No matching documents",
        search: "Search documents",
      };
  const payload = scriptJson({ ...config, documents, labels });
  const document = `<!doctype html>
<html lang="${escapeHtml(config.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(config.title)}</title>
<style>
${archiveCss.trim()}
${customCss.trim()}
</style>
</head>
<body>
<div class="shell">
  <aside>
    <header class="brand">
      <h1>${escapeHtml(config.title)}</h1>
      <p id="doc-count"></p>
    </header>
    <div class="filter">
      <button class="download-button" id="download" type="button">${labels.download}</button>
      <input id="filter" type="search" placeholder="${labels.search}" autocomplete="off">
    </div>
    <nav id="docs"></nav>
  </aside>
  <main>
    <article>
      <p class="meta" id="meta"></p>
      <div class="content" id="content"></div>
    </article>
  </main>
</div>
<script>
const ARCHIVE = ${payload};
${archiveRuntime.trim()}
</script>
</body>
</html>
`;

  const outputFile = path.resolve(output ?? path.join(projectDirectory, "index.html"));
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, document);
  return outputFile;
}
