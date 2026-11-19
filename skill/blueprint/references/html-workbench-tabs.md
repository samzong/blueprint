# HTML workbench multi-tab shell

Load this companion to [HTML workbench baseline](html-workbench.md) only when an `html` Artifact spans 3 to 5 distinct views. Use this shell when those views benefit from one windowed container with shared chrome. Omit this shell when a reader, canvas, simulator, calculator, or matrix communicates the content directly.

## Multi-tab shell and master-detail classes

Add these classes on top of the tokens and base typography from [HTML workbench baseline](html-workbench.md). Keep `.view-tabs` between 3 and 5 tabs so `.window-chrome` does not crowd `.quota-strip`. Place secondary filters or role perspectives inside `.pane-head` with `.pill-track` instead of adding more top-level tabs:

```css
body[data-layout="full"] .view-panel + .view-panel { border-top: 2px solid var(--line-strong); }
.view-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.stage-window {
  background-color: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--window-shadow);
  overflow: hidden;
  min-width: 0;
}
.window-chrome, .pane-head, .workbench-controls {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
}
.workbench-controls { flex-direction: column; align-items: stretch; gap: 10px; }
.vtab {
  appearance: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background-color: var(--surface-subtle);
  border: 1px solid transparent;
  border-radius: 17px;
  height: 34px;
  padding: 0 10px 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.vtab:hover { color: var(--fg); background-color: var(--surface-selected); }
.vtab[aria-selected="true"] {
  background-color: var(--surface-elevated);
  color: var(--fg);
  border-color: var(--line-strong);
  box-shadow: var(--tab-shadow);
  font-weight: 600;
}
.key-badge {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background-color: var(--surface-selected);
  color: var(--muted);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.vtab[aria-selected="true"] .key-badge { background-color: var(--surface-subtle); color: var(--fg); }
.quota-strip {
  min-height: 28px;
  border-radius: 14px;
  padding: 4px 12px;
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.quota-item b { color: var(--fg); font-weight: 600; }
.master-detail {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(24rem, 1fr);
  align-items: stretch;
}
.master-detail > * { min-width: 0; }
.list-pane { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.readout-pane {
  border-left: 1px solid var(--line);
  padding: 16px 18px;
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cap-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.cap-cell {
  padding: 8px 11px;
  background-color: var(--surface-subtle);
  border: 1px solid var(--line);
  border-radius: 10px;
  min-width: 0;
}
.cap-cell.is-highlighted { background-color: var(--surface-elevated); border-color: var(--attention); box-shadow: var(--tab-shadow); }
.token-box { padding: 8px 12px; background-color: var(--surface-subtle); border-left: 2px solid var(--attention); }
.card-btn {
  width: 100%;
  appearance: none;
  font-family: inherit;
  text-align: left;
  background-color: var(--surface-subtle);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-btn:hover { border-color: var(--line-strong); background-color: var(--surface-selected); }
.card-btn[aria-pressed="true"] { background-color: var(--surface-elevated); border-color: var(--attention); box-shadow: var(--tab-shadow); }
.card-btn.is-pinned { box-shadow: inset 3px 0 0 var(--attention); }
.card-btn.is-pinned[aria-pressed="true"] { box-shadow: inset 3px 0 0 var(--attention), var(--tab-shadow); }
@media (max-width: 64rem) {
  .master-detail { grid-template-columns: minmax(0, 1fr); }
  .readout-pane { border-left: none; border-top: 1px solid var(--line); position: static; }
  .cap-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 48rem) {
  .stage-window { border-radius: 14px; }
  .cap-grid { grid-template-columns: minmax(0, 1fr); }
}
```

## HTML structure and keyboard wiring

Build the multi-tab shell with `.page-shell`, `.top-note`, `.stage-window`, and `.footnote`. Wire `#layout-toggle` and digit keys `1` through `N` for tab selection. In full-layout mode, clear `panel.hidden` so controls inside every panel stay interactive. Do not bind unadorned `ArrowLeft` or `ArrowRight` on `document` because global arrow keys hijack scrolling and selection:

```html
<div class="page-shell">
  <header class="top-note">
    <div class="note-brand">
      <h1>Page title</h1>
    </div>
    <div class="preview-tools">
      <button type="button" id="layout-toggle" class="pill-btn" aria-pressed="false">Expand all panels</button>
      <div class="pill-track" role="group" aria-label="Theme mode">
        <button type="button" class="pill-seg" data-theme-mode="system" aria-pressed="true">System</button>
        <button type="button" class="pill-seg" data-theme-mode="light" aria-pressed="false">Light</button>
        <button type="button" class="pill-seg" data-theme-mode="dark" aria-pressed="false">Dark</button>
      </div>
    </div>
  </header>
  <div class="stage-window">
    <div class="window-chrome">
      <div class="view-tabs" role="tablist" aria-label="Workspace views">
        <button type="button" class="vtab" role="tab" data-tab="overview" aria-controls="panel-overview" aria-selected="true"><span>Overview</span><span class="key-badge" aria-hidden="true">1</span></button>
      </div>
      <div class="quota-strip" role="region" aria-label="Key figures">
        <span class="quota-item">Items <b class="num">24</b></span>
      </div>
    </div>
    <main>
      <section class="view-panel" id="panel-overview" role="tabpanel">
        <div class="pane-head">
          <h2>Overview</h2>
          <div class="pill-track" role="group" aria-label="Filter items">
            <button type="button" class="pill-seg" data-filter="all" aria-pressed="true">All</button>
          </div>
        </div>
        <div class="master-detail">
          <div class="list-pane" id="overview-list"></div>
          <aside class="readout-pane" id="overview-detail" aria-live="polite"></aside>
        </div>
      </section>
    </main>
  </div>
  <footer class="footnote">
    <span>Data scope note</span>
    <span>Switch tabs with <kbd>1</kbd> <kbd>2</kbd></span>
  </footer>
</div>
```

```js
(() => {
  const tabs = Array.from(document.querySelectorAll(".vtab[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".view-panel"));
  const layoutToggle = document.getElementById("layout-toggle");
  let activeTab = tabs[0]?.dataset.tab || "";

  function syncPanels() {
    const full = document.body.dataset.layout === "full";
    panels.forEach(panel => {
      panel.hidden = !full && panel.id !== `panel-${activeTab}`;
    });
  }

  function selectTab(tabKey) {
    activeTab = tabKey;
    tabs.forEach(tab => {
      tab.setAttribute("aria-selected", String(tab.dataset.tab === tabKey));
    });
    syncPanels();
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  });

  if (layoutToggle) {
    layoutToggle.addEventListener("click", () => {
      const full = document.body.dataset.layout !== "full";
      if (full) document.body.dataset.layout = "full";
      else delete document.body.dataset.layout;
      layoutToggle.setAttribute("aria-pressed", String(full));
      syncPanels();
    });
  }

  document.querySelectorAll("[data-theme-mode]").forEach(button => {
    button.addEventListener("click", () => {
      const mode = button.dataset.themeMode;
      document.querySelectorAll("[data-theme-mode]").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      if (mode === "light" || mode === "dark") {
        document.documentElement.dataset.theme = mode;
      } else {
        delete document.documentElement.dataset.theme;
      }
    });
  });

  if (tabs.length > 0) {
    window.addEventListener("keydown", event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < tabs.length) {
        event.preventDefault();
        selectTab(tabs[index].dataset.tab);
      }
    });
  }
})();
```
