import { useRef, useState } from "react";

import { dossier } from "./data/content";
import type { Evidence, EvidenceLevel } from "./types";

const navigation = [
  ["overview", "Overview"],
  ["subjects", "Subjects"],
  ["comparison", "Comparison"],
  ["evidence", "Evidence"],
  ["sources", "Sources"],
] as const;

const levelLabels: Record<EvidenceLevel, string> = {
  verified: "Verified",
  reported: "Reported",
  inferred: "Inferred",
  unknown: "Unknown",
};

const levelClasses: Record<EvidenceLevel, string> = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reported: "border-amber-200 bg-amber-50 text-amber-800",
  inferred: "border-blue-200 bg-blue-50 text-blue-800",
  unknown: "border-line bg-bg-muted text-fg-muted",
};

function LevelBadge({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${levelClasses[level]}`}>
      {levelLabels[level]}
    </span>
  );
}

function SectionHeading({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: string }) {
  return (
    <div className="max-w-4xl">
      <div className="mono text-xs font-black uppercase tracking-[0.18em] text-accent">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-fg-muted md:text-lg">{summary}</p>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<EvidenceLevel | "all">("all");
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSources = dossier.sources.filter(
    (source) =>
      (!normalizedQuery ||
        [source.title, source.publisher, source.kind].some((value) => value.toLowerCase().includes(normalizedQuery))) &&
      (level === "all" || dossier.evidence.some((item) => item.level === level && item.sourceIds.includes(source.id))),
  );

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3 md:px-8">
          <a className="min-w-0 shrink-0" href="#overview" aria-label={`${dossier.meta.title} overview`}>
            <div className="truncate text-sm font-black md:text-base">{dossier.meta.title}</div>
            <div className="hidden text-xs text-fg-subtle sm:block">Evidence before confidence</div>
          </a>
          <nav className="ml-auto flex min-w-0 gap-1 overflow-x-auto" aria-label="Dossier sections">
            {navigation.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="min-h-11 shrink-0 rounded-md px-3 py-3 text-xs font-bold text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:text-fg"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section id="overview" className="canvas-bg scroll-mt-20 border-b border-line">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-14 md:px-8 md:py-20 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-fg px-3 py-1.5 text-xs font-black uppercase text-bg">{dossier.meta.eyebrow}</span>
                <span className="rounded-md border border-line-strong bg-card px-3 py-1.5 text-xs font-bold text-fg-muted">{dossier.meta.status}</span>
              </div>
              <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.045em] md:text-7xl xl:text-8xl">
                {dossier.meta.title}
              </h1>
              <p className="mt-8 max-w-3xl text-lg leading-8 text-fg-muted md:text-xl">{dossier.meta.summary}</p>
              <dl className="mt-10 grid gap-4 border-t border-line-strong pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold text-fg-subtle">Evidence date</dt>
                  <dd className="mt-1 text-sm font-black">{dossier.meta.updatedAt}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-fg-subtle">Audience</dt>
                  <dd className="mt-1 text-sm font-black">{dossier.meta.audience}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-fg-subtle">Method</dt>
                  <dd className="mt-1 text-sm font-black">Fact → limitation → implication</dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-3 self-start">
              {dossier.findings.map((finding) => (
                <article key={finding.title} className="rounded-lg border border-line bg-card p-5 shadow-lift">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-black">{finding.title}</h2>
                    <LevelBadge level={finding.level} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-fg-muted">{finding.summary}</p>
                  <p className="mt-4 border-t border-line pt-3 text-sm font-bold leading-6">{finding.implication}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
              {dossier.metrics.map((metric) => (
                <article key={metric.label} className="rounded-lg border border-line bg-card p-5">
                  <div className="text-xs font-bold text-fg-subtle">{metric.label}</div>
                  <div className="mt-2 text-4xl font-black tracking-tight">{metric.value}</div>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">{metric.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="subjects" className="scroll-mt-20 border-b border-line bg-bg py-14 md:py-20">
          <div className="mx-auto max-w-[1480px] px-4 md:px-8">
            <SectionHeading
              eyebrow="01 / Subjects"
              title="Give every subject the same evidence frame"
              summary="Comparable structure keeps visual polish from hiding uneven evidence quality."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {dossier.subjects.map((subject) => (
                <article key={subject.id} className="overflow-hidden rounded-lg border border-line bg-card">
                  <div className="h-1.5" style={{ backgroundColor: subject.color }} />
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-fg-subtle">{subject.label}</div>
                        <h3 className="mt-1 text-2xl font-black">{subject.name}</h3>
                      </div>
                      <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: subject.color }} aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-fg-muted">{subject.summary}</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {subject.metrics.map((metric) => (
                        <div key={metric.label} className="rounded-md border border-line bg-bg-subtle p-3">
                          <div className="text-[11px] font-bold text-fg-subtle">{metric.label}</div>
                          <div className="mt-1 text-xl font-black">{metric.value}</div>
                          <div className="mt-1 text-xs leading-5 text-fg-muted">{metric.detail}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-black text-fg-subtle">Strongest signals</div>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-fg-muted">
                          {subject.strengths.map((strength) => <li key={strength}>• {strength}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                        <div className="text-xs font-black text-amber-800">Caveat</div>
                        <p className="mt-2 text-sm leading-6 text-amber-950">{subject.caveat}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comparison" className="scroll-mt-20 border-b border-line bg-bg-subtle py-14 md:py-20">
          <div className="mx-auto max-w-[1480px] px-4 md:px-8">
            <SectionHeading eyebrow="02 / Comparison" title={dossier.comparison.title} summary={dossier.comparison.summary} />
            <div className="mt-10 overflow-x-auto rounded-lg border border-line bg-card">
              <table className="min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-bg-muted">
                    <th className="w-48 px-4 py-4 text-xs font-black">Criterion</th>
                    {dossier.subjects.map((subject) => (
                      <th key={subject.id} className="min-w-52 px-4 py-4 text-sm font-black" style={{ color: subject.color }}>
                        {subject.name}
                      </th>
                    ))}
                    <th className="min-w-72 px-4 py-4 text-xs font-black">Evidence note</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.comparison.rows.map((row) => (
                    <tr key={row.criterion} className="border-b border-line last:border-b-0 align-top">
                      <th className="px-4 py-4 text-sm font-black">{row.criterion}</th>
                      {dossier.subjects.map((subject) => (
                        <td key={subject.id} className="px-4 py-4 text-sm leading-6 text-fg-muted">{row.values[subject.id]}</td>
                      ))}
                      <td className="bg-bg-subtle px-4 py-4 text-sm leading-6 text-fg-muted">{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="evidence" className="scroll-mt-20 border-b border-line bg-bg py-14 md:py-20">
          <div className="mx-auto max-w-[1480px] px-4 md:px-8">
            <SectionHeading
              eyebrow="03 / Evidence"
              title="Make the reasoning inspectable"
              summary="Each card keeps finding, limitation, implication, and linked sources together. Open a card for the full record."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {dossier.evidence.map((item) => {
                const subject = dossier.subjects.find((candidate) => candidate.id === item.subjectId);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvidence(item);
                      requestAnimationFrame(() => dialogRef.current?.showModal());
                    }}
                    className="rounded-lg border border-line bg-card p-5 text-left transition-colors hover:border-line-strong hover:bg-bg-subtle"
                    aria-label={`Open evidence: ${item.title}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {subject && <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: subject.color }} />}
                        <span className="text-sm font-black">{subject?.name ?? "Cross-cutting"}</span>
                      </div>
                      <LevelBadge level={item.level} />
                    </div>
                    <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-fg-muted">{item.finding}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-bold text-fg-subtle">
                      <span>{item.sourceIds.length} linked source{item.sourceIds.length === 1 ? "" : "s"}</span>
                      <span>Open record →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="sources" className="scroll-mt-20 bg-bg-subtle py-14 md:py-20">
          <div className="mx-auto max-w-[1480px] px-4 md:px-8">
            <SectionHeading
              eyebrow="04 / Sources"
              title="Keep the research corpus usable"
              summary="Search and filter canonical records without mixing metadata-only sources with stronger evidence."
            />
            <div className="mt-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <label>
                <span className="mb-2 block text-xs font-black text-fg-subtle">Search sources</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, publisher, or source type" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black text-fg-subtle">Evidence level</span>
                <select value={level} onChange={(event) => setLevel(event.target.value as EvidenceLevel | "all")}>
                  <option value="all">All levels</option>
                  {Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 overflow-hidden rounded-lg border border-line bg-card">
              {filteredSources.length > 0 ? filteredSources.map((source) => (
                <article key={source.id} className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_160px_120px_auto] md:items-center">
                  <div>
                    <h3 className="text-sm font-black">{source.title}</h3>
                    <div className="mt-1 text-xs text-fg-subtle">{source.publisher}</div>
                  </div>
                  <div className="text-xs font-bold text-fg-muted">{source.publishedAt}</div>
                  <div className="text-xs font-bold text-fg-muted">{source.kind}</div>
                  {source.url ? (
                    <a className="text-sm font-black text-accent" href={source.url} target="_blank" rel="noreferrer">Open source ↗</a>
                  ) : (
                    <span className="text-xs font-bold text-fg-subtle">URL pending</span>
                  )}
                </article>
              )) : (
                <div className="p-10 text-center text-sm text-fg-muted">No sources match the current filters.</div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-fg px-4 py-8 text-bg md:px-8">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 text-sm">
          <div className="font-black">{dossier.meta.title}</div>
          <div className="text-bg/60">Evidence date: {dossier.meta.updatedAt}</div>
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90vh] w-[min(720px,calc(100%-24px))] rounded-lg border border-line bg-card p-0 text-fg shadow-lift"
        onClose={() => setSelectedEvidence(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        {selectedEvidence && (
          <article>
            {selectedEvidence.image && (
              <img className="max-h-80 w-full object-contain bg-white" src={selectedEvidence.image.src} alt={selectedEvidence.image.alt} />
            )}
            <div className="p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <LevelBadge level={selectedEvidence.level} />
                  <h2 className="mt-3 text-2xl font-black">{selectedEvidence.title}</h2>
                </div>
                <button type="button" className="min-h-11 rounded-md border border-line px-3 text-sm font-black" onClick={() => dialogRef.current?.close()} aria-label="Close evidence record">Close</button>
              </div>
              <dl className="mt-6 grid gap-4">
                <div className="rounded-md border border-line bg-bg-subtle p-4">
                  <dt className="text-xs font-black text-fg-subtle">Finding</dt>
                  <dd className="mt-2 text-sm leading-7 text-fg-muted">{selectedEvidence.finding}</dd>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <dt className="text-xs font-black text-amber-800">Limitation</dt>
                  <dd className="mt-2 text-sm leading-7 text-amber-950">{selectedEvidence.limitation}</dd>
                </div>
                <div className="rounded-md border border-line bg-card p-4">
                  <dt className="text-xs font-black text-fg-subtle">Decision implication</dt>
                  <dd className="mt-2 text-sm font-bold leading-7">{selectedEvidence.implication}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <div className="text-xs font-black text-fg-subtle">Linked sources</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEvidence.sourceIds.map((sourceId) => {
                    const source = dossier.sources.find((candidate) => candidate.id === sourceId);
                    if (!source) return null;
                    return source.url ? (
                      <a key={sourceId} className="rounded-md border border-line px-3 py-2 text-sm font-bold text-accent" href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
                    ) : (
                      <span key={sourceId} className="rounded-md border border-line px-3 py-2 text-sm font-bold text-fg-muted">{source.title}</span>
                    );
                  })}
                </div>
              </div>
              {selectedEvidence.image && <p className="mt-5 text-xs leading-5 text-fg-subtle">{selectedEvidence.image.caption}</p>}
            </div>
          </article>
        )}
      </dialog>
    </div>
  );
}
