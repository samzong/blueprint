/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function requireElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`archive: missing #${id}`);
  return element;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function requireInput(id) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) throw new Error(`archive: missing #${id}`);
  return element;
}

const documents = ARCHIVE.documents;
const documentsByPath = new Map(
  documents.map((archiveDocument) => [archiveDocument.path, archiveDocument]),
);
const docsEl = requireElement("docs");
const contentEl = requireElement("content");
const metaEl = requireElement("meta");
const filterEl = requireInput("filter");
const countEl = requireElement("doc-count");
const downloadEl = requireElement("download");
const copyDocEl = requireElement("copy-doc");
const copyAgentEl = requireElement("copy-agent-url");
const llmsIndexEl = requireElement("llms-index");
const llmsFullEl = requireElement("llms-full");
const agentEl = requireElement("agent");
const narrowScreen = window.matchMedia("(max-width: 820px)");
const crcTable = new Uint32Array(256);
const collapsedGroups = new Set();
const docTree = buildTree(documents);
let activePath = docPathFromLocation();
/** @type {MermaidModule | null} */
let mermaidModule = null;

for (let n = 0; n < crcTable.length; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

/**
 * @param {string} documentPath
 * @returns {string}
 */
function slugFromDocPath(documentPath) {
  if (documentPath === "README.md") return "";
  return documentPath.replace(/\/README\.md$/i, "").replace(/\.md$/i, "");
}

/**
 * @param {string} slug
 * @returns {string}
 */
function docPathFromSlug(slug) {
  const normalized = slug.replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");
  if (!normalized) return documents[0].path;
  const direct = `${normalized}.md`;
  if (documentsByPath.has(direct)) return direct;
  const readme = `${normalized}/README.md`;
  return documentsByPath.has(readme) ? readme : "";
}

/**
 * @returns {string}
 */
function docPathFromLocation() {
  try {
    const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    return docPathFromSlug(slug) || documents[0].path;
  } catch {
    return documents[0].path;
  }
}

/**
 * @param {string} documentPath
 * @param {boolean} replace
 */
function updateLocation(documentPath, replace) {
  const slug = slugFromDocPath(documentPath);
  const next = slug ? `#/${encodeURIComponent(slug).replaceAll("%2F", "/")}` : "#/";
  if (location.hash === next) return;
  history[replace ? "replaceState" : "pushState"]({}, "", next);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {Uint8Array} bytes
 * @returns {number}
 */
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @param {number} value
 */
function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @param {number} value
 */
function writeUint32(view, offset, value) {
  view.setUint32(offset, value, true);
}

/**
 * @param {{ content: string; name: string }[]} files
 * @returns {Blob}
 */
function makeZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  const stamp = {
    date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1),
  };
  let offset = 0;
  let centralSize = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, stamp.time);
    writeUint16(localView, 12, stamp.date);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, dataBytes.length);
    writeUint32(localView, 22, dataBytes.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, stamp.time);
    writeUint16(centralView, 14, stamp.date);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, dataBytes.length);
    writeUint32(centralView, 24, dataBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
    centralSize += centralHeader.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

function downloadAllDocs() {
  const url = URL.createObjectURL(
    makeZip(
      documents.map((archiveDocument) => ({
        name: archiveDocument.path,
        content: archiveDocument.content,
      })),
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = ARCHIVE.downloadName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param {string} _match
 * @param {string} label
 * @param {string} href
 * @returns {string}
 */
function markdownLink(_match, label, href) {
  const internalPath = docPathFromSlug(href);
  if (internalPath) return `<a href="#/${slugFromDocPath(internalPath)}">${label}</a>`;
  if (!/^(https?:|mailto:|#)/i.test(href)) return label;
  return `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, markdownLink);
  return html;
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * @param {string} markdown
 * @returns {string}
 */
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  /** @type {"ul" | "ol" | null} */
  let list = null;
  const flushList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith("```")) {
      flushList();
      const language = line.replace(/^```/, "").trim().toLowerCase();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      html.push(
        language === "mermaid"
          ? `<pre class="mermaid">${escapeHtml(code.join("\n"))}</pre>`
          : `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      index += 1;
      continue;
    }

    if (!line.trim()) {
      flushList();
      index += 1;
      continue;
    }

    const tableNext = lines[index + 1];
    if (line.includes("|") && tableNext && isTableSeparator(tableNext)) {
      flushList();
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      html.push("<table><thead><tr>");
      headers.forEach((cell) => html.push(`<th>${inlineMarkdown(cell)}</th>`));
      html.push("</tr></thead><tbody>");
      rows.forEach((row) => {
        html.push("<tr>");
        headers.forEach((_header, cellIndex) => {
          html.push(`<td>${inlineMarkdown(row[cellIndex] || "")}</td>`);
        });
        html.push("</tr>");
      });
      html.push("</tbody></table>");
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushList();
      const parts = [quote[1]];
      index += 1;
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${parts.map(inlineMarkdown).join("<br>")}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      if (list !== "ul") {
        flushList();
        html.push("<ul>");
        list = "ul";
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      index += 1;
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      if (list !== "ol") {
        flushList();
        html.push("<ol>");
        list = "ol";
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      index += 1;
      continue;
    }

    flushList();
    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !lines[index].startsWith("```")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  flushList();
  return html.join("\n");
}

async function renderMermaidDiagrams() {
  const diagrams = Array.from(contentEl.querySelectorAll("pre.mermaid"));
  if (diagrams.length === 0) return;

  try {
    if (!mermaidModule) {
      const imported = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
      mermaidModule = imported.default;
      mermaidModule.initialize({ securityLevel: "strict", startOnLoad: false, theme: "default" });
    }
    await mermaidModule.run({ nodes: diagrams });
  } catch (error) {
    console.warn("Mermaid render failed", error);
  }
}

function renderNav() {
  const query = filterEl.value.trim().toLowerCase();
  const nodes = query ? pruneTree(docTree, query) : docTree;
  const filtering = query !== "";
  docsEl.replaceChildren();

  if (nodes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = ARCHIVE.labels.empty;
    docsEl.append(empty);
    return;
  }

  renderTree(nodes, docsEl, filtering);
}

/**
 * @param {ArchiveDocument[]} list
 * @returns {TreeNode[]}
 */
function buildTree(list) {
  /** @type {TreeNode[]} */
  const root = [];
  /** @type {Map<string, DirectoryNode>} */
  const groups = new Map();

  for (const archiveDocument of list) {
    const parts = archiveDocument.path.split("/");
    let siblings = root;
    let prefix = "";
    for (const segment of parts.slice(0, -1)) {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      let group = groups.get(prefix);
      if (!group) {
        group = { kind: "directory", label: segment, path: prefix, children: [] };
        groups.set(prefix, group);
        siblings.push(group);
      }
      siblings = group.children;
    }
    siblings.push({ kind: "document", document: archiveDocument });
  }

  /** @param {TreeNode[]} nodes */
  const order = (nodes) => {
    nodes.sort((left, right) =>
      left.kind === right.kind ? 0 : left.kind === "document" ? -1 : 1,
    );
    for (const node of nodes) {
      if (node.kind === "directory") order(node.children);
    }
  };
  order(root);
  return root;
}

/**
 * @param {TreeNode[]} nodes
 * @param {string} query
 * @returns {TreeNode[]}
 */
function pruneTree(nodes, query) {
  /** @type {TreeNode[]} */
  const kept = [];
  for (const node of nodes) {
    if (node.kind === "document") {
      if (`${node.document.path} ${node.document.title}`.toLowerCase().includes(query)) kept.push(node);
      continue;
    }
    const children = pruneTree(node.children, query);
    if (children.length > 0) kept.push({ ...node, children });
  }
  return kept;
}

/**
 * @param {TreeNode[]} nodes
 * @param {HTMLElement} container
 * @param {boolean} filtering
 */
function renderTree(nodes, container, filtering) {
  for (const node of nodes) {
    if (node.kind === "document") {
      const archiveDocument = node.document;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "doc-button";
      button.setAttribute("aria-current", archiveDocument.path === activePath ? "true" : "false");
      button.textContent = archiveDocument.title;
      button.title = archiveDocument.path;
      button.addEventListener("click", () => loadDoc(archiveDocument.path, false));
      container.append(button);
      continue;
    }
    const group = document.createElement("details");
    group.className = "doc-group";
    group.open = filtering || !collapsedGroups.has(node.path);
    group.addEventListener("toggle", () => {
      if (filtering || !group.isConnected) return;
      if (group.open) collapsedGroups.delete(node.path);
      else collapsedGroups.add(node.path);
    });
    const summary = document.createElement("summary");
    summary.className = "doc-group-label";
    summary.textContent = node.label;
    summary.title = node.path;
    group.append(summary);
    const body = document.createElement("div");
    body.className = "doc-group-body";
    renderTree(node.children, body, filtering);
    group.append(body);
    container.append(group);
  }
}

/**
 * @param {HTMLElement} button
 * @param {string} message
 */
function flashLabel(button, message) {
  const original = button.dataset.label ?? button.textContent ?? "";
  button.dataset.label = original;
  button.textContent = message;
  setTimeout(() => {
    button.textContent = original;
  }, 1400);
}

/**
 * @param {string} text
 * @param {HTMLElement} button
 */
async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    flashLabel(button, ARCHIVE.labels.copied);
  } catch {
    flashLabel(button, ARCHIVE.labels.copyFailed);
  }
}

/**
 * @param {string} documentPath
 * @param {boolean} replaceUrl
 */
async function loadDoc(documentPath, replaceUrl) {
  const archiveDocument = documentsByPath.get(documentPath) ?? documents[0];
  activePath = archiveDocument.path;
  updateLocation(archiveDocument.path, replaceUrl);
  renderMeta(archiveDocument);
  contentEl.innerHTML = markdownToHtml(archiveDocument.content);
  document.title = `${archiveDocument.title} · ${ARCHIVE.title}`;
  renderNav();
  await renderMermaidDiagrams();
}

/**
 * @param {ArchiveDocument} archiveDocument
 */
function renderMeta(archiveDocument) {
  metaEl.replaceChildren();
  const pathLabel = document.createElement("span");
  pathLabel.textContent = archiveDocument.path;
  metaEl.append(pathLabel);
  const url = ARCHIVE.sourceUrl
    ? `${ARCHIVE.sourceUrl}${archiveDocument.path.split("/").map(encodeURIComponent).join("/")}`
    : "";
  if (!url) return;
  const separator = document.createElement("span");
  separator.className = "meta-separator";
  separator.textContent = " · ";
  const source = document.createElement("a");
  source.href = url;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.className = "source-link";
  source.textContent = `${ARCHIVE.labels.source} ↗`;
  metaEl.append(separator, source);
}

function syncAgentDisclosure() {
  agentEl.toggleAttribute("open", !narrowScreen.matches);
  agentEl.querySelector("summary")?.setAttribute("tabindex", narrowScreen.matches ? "0" : "-1");
}

narrowScreen.addEventListener("change", syncAgentDisclosure);
syncAgentDisclosure();

downloadEl.addEventListener("click", downloadAllDocs);
filterEl.addEventListener("input", renderNav);
window.addEventListener("hashchange", () => loadDoc(docPathFromLocation(), true));
llmsIndexEl.setAttribute("href", new URL("llms.txt", location.href).href);
llmsFullEl.setAttribute("href", new URL("llms-full.txt", location.href).href);
copyAgentEl.addEventListener("click", () =>
  copyText(new URL("llms-full.txt", location.href).href, copyAgentEl),
);
copyDocEl.addEventListener("click", () =>
  copyText(documentsByPath.get(activePath)?.content ?? "", copyDocEl),
);

countEl.textContent = ARCHIVE.labels.count;
renderNav();
loadDoc(activePath, true);
