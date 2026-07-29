import { useState } from "react";

import { sections } from "./data/content";

export default function App() {
  const [active, setActive] = useState(sections[0].id);
  const current = sections.find((section) => section.id === active) ?? sections[0];

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 z-10 border-b border-line bg-bg p-4 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-6">
        <div className="mb-4 text-lg font-bold tracking-tight lg:mb-6">__PROJECT_TITLE__</div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={`min-h-11 shrink-0 rounded-md px-3 py-2 text-left text-sm ${
                active === section.id ? "bg-fg text-bg" : "text-fg-muted hover:bg-bg-muted"
              }`}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </aside>

      <main className="w-full max-w-4xl flex-1 px-6 py-12 lg:px-12 lg:py-16">
        <div className="mono mb-4 text-xs uppercase tracking-widest text-accent">__PRESET__</div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">{current.title}</h1>
        <p className="mb-8 text-lg text-fg-muted">{current.summary}</p>
        <div className="space-y-4 text-fg-muted">
          {current.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </main>
    </div>
  );
}
