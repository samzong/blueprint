import { readFile } from "node:fs/promises";

import { progressLabels } from "../shared/i18n/progress.ts";
import type { ProgressConfig, ProgressItem, ProgressLink } from "./progress-types.ts";
import { escapeHtml } from "./shared.ts";

function linksHtml(links: ProgressLink[]): string {
  return links.map(({ label, url }) => `<a class="link-tag" href="${escapeHtml(url)}" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`).join("");
}

export async function renderProgress(config: ProgressConfig): Promise<string> {
  const [tokens, css] = await Promise.all([
    readFile(new URL("../shared/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("./progress.css", import.meta.url), "utf8"),
  ]);
  const labels = progressLabels(config.lang);
  const phases = config.phases.map((phase) => ({ ...phase, items: phase.items.filter((item) => item.status !== "dropped") }));
  const allItems = phases.flatMap((phase) => phase.items.map((item) => ({ item, phase: phase.title })));
  const done = allItems.filter(({ item }) => item.status === "done");
  const current = allItems.filter(({ item }) => item.status === "blocked" || item.status === "active");
  const next = allItems.filter(({ item }) => item.status === "next");
  const total = allItems.length;
  const percent = total ? Math.floor(done.length * 100 / total) : 0;
  const currentPhase = ["active", "blocked", "next"].map((status) => phases.find((phase) => phase.items.some((item) => item.status === status))).find(Boolean);
  const renderItem = ({ item, phase }: { item: ProgressItem; phase: string }) => `<li data-item-id="${escapeHtml(item.id)}" data-item-status="${item.status}"><details class="item"><summary><span class="item-row"><span class="item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span><span class="item-status">${escapeHtml(labels.itemStatus[item.status])}</span><span class="item-links">${linksHtml(item.links.slice(0, 2))}</span></span></summary><div class="item-body"><p class="phase-name">${escapeHtml(phase)}</p><p class="result">${escapeHtml(item.result)}</p>${item.links.length > 2 ? `<div class="more-links">${linksHtml(item.links.slice(2))}</div>` : ""}${item.session ? `<a class="session-link" href="${escapeHtml(item.session)}">${escapeHtml(labels.resume)}</a>` : ""}${item.owner || item.operation ? `<dl>${item.owner ? `<dt>${escapeHtml(labels.owner)}</dt><dd>${escapeHtml(item.owner)}</dd>` : ""}${item.operation ? `<dt>${escapeHtml(labels.operation)}</dt><dd><code>${escapeHtml(item.operation)}</code></dd>` : ""}</dl>` : ""}</div></details></li>`;
  const renderItems = (items: typeof allItems, empty: string) => items.length
    ? `<ul class="items">${items.map(renderItem).join("\n")}</ul>`
    : `<p class="empty">${escapeHtml(empty)}</p>`;
  const segments = phases.filter((phase) => phase.items.length).map((phase) => {
    const complete = phase.items.filter((item) => item.status === "done").length;
    return `<li style="flex-grow:${phase.items.length}"${phase === currentPhase ? ' aria-current="step"' : ""}><progress max="${phase.items.length}" value="${complete}" aria-label="${escapeHtml(phase.title)}: ${complete} / ${phase.items.length}"></progress><span class="phase-label" title="${escapeHtml(phase.title)}">${escapeHtml(phase.title)}</span><span class="phase-count">${complete}/${phase.items.length}${phase === currentPhase ? ` · ${escapeHtml(labels.currentPhase)}` : ""}</span></li>`;
  }).join("");
  const decisions = config.decisions.length
    ? `<section class="decisions" aria-label="${escapeHtml(labels.decisions)}" data-progress-decisions>${config.decisions.map((decision) => `<details class="decision"><summary><span class="decision-row"><span class="decision-question" title="${escapeHtml(decision.question)}">${escapeHtml(decision.question)}</span><span class="recommendation" title="${escapeHtml(decision.recommendation)}">${escapeHtml(labels.recommendation)}: ${escapeHtml(decision.recommendation)}</span></span></summary><div class="decision-body"><p>${escapeHtml(decision.context)}</p><div class="more-links">${linksHtml(decision.links)}</div></div></details>`).join("\n")}</section>`
    : "";
  return `<!doctype html>
<html lang="${escapeHtml(config.lang)}" data-blueprint-preset="progress">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(config.title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;family=Noto+Sans+SC:wght@400;500;700;900&amp;display=swap" rel="stylesheet"><style>${tokens.trim()}
${css.trim()}</style></head>
<body><main>
<header class="overview"><div class="heading"><h1>${escapeHtml(config.title)}</h1><p class="updated">${escapeHtml(labels.updated)} <time datetime="${escapeHtml(config.updated_at)}">${escapeHtml(config.updated_at.replace("T", " "))}</time></p></div><div class="goal-row"><p class="goal">${escapeHtml(config.goal)}</p><span class="overall-status" data-status="${config.status}">${escapeHtml(labels.status[config.status])}</span></div><div class="progress-heading"><span class="completion" data-progress-done="${done.length}" data-progress-total="${total}">${done.length} / ${total} ${escapeHtml(labels.complete)}</span><strong class="percentage">${percent}%</strong></div><ol class="progress-track" aria-label="${escapeHtml(labels.plan)}">${segments}</ol></header>
${decisions}
<div class="columns"><details class="work-section completed" data-progress-group="done"><summary><h2>${escapeHtml(labels.completed)} <span class="count">${done.length}</span></h2></summary>${renderItems(done, labels.noCompleted)}</details><section class="work-section" data-progress-group="current" aria-labelledby="current-title"><h2 id="current-title">${escapeHtml(labels.current)} <span class="count">${current.length}</span></h2>${renderItems(current, labels.noCurrent)}</section><section class="work-section" data-progress-group="next" aria-labelledby="next-title"><h2 id="next-title">${escapeHtml(labels.next)} <span class="count">${next.length}</span></h2>${renderItems(next, labels.noNext)}</section></div>
</main></body></html>\n`;
}
