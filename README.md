# blueprint

blueprint turns a conversational web brief into a deterministic, portable output.

The project owns mechanical behavior:

- shared design tokens and runtime code
- preset templates
- output validation
- local preview through `gofs`
- Cloudflare Workers Static Assets deployment through Wrangler
- project identity and local discovery

The bundled skill owns semantic behavior:

- intent and preset selection
- topic-specific research and writing
- final visual review

## Current milestone

This repository contains the blueprint skill migration baseline, executable shared assets, and working `create`, `check`, `preview`, `deploy`, and `list` commands. `pitch`, `briefing`, and `archive` compile semantic source files into portable single-file HTML. Prototype and dossier remain scaffold workflows.

## Commands

Requires Node.js 24+, pnpm 10, and `gofs` 0.2.4+ on `PATH`. Deployment additionally requires Wrangler 4+.

Installed CLI:

```bash
blueprint --version
blueprint create pitch <project-directory>
blueprint create briefing <project-directory>
blueprint create archive <project-directory>
blueprint create prototype-lite <empty-directory>
blueprint create prototype-full <empty-directory>
blueprint create dossier <empty-directory>
blueprint check <index.html-or-directory>
blueprint preview <index.html-or-directory>
blueprint preview <index.html> --root <asset-root> --port 4175
blueprint deploy <index.html-or-directory> --name <worker-name>
blueprint deploy <index.html-or-directory> --name <worker-name> --account <name-or-id>
blueprint list
blueprint list --root <path> --json
blueprint skill install
blueprint skill install --scope user --agent codex --yes
```

Preview binds `gofs` to `127.0.0.1`, mounts the selected root read-only, and uses its default theme so single-file inline scripts remain executable.

Every successful `create` writes `.blueprint.json` at the project root. The file contains a stable project ID, name, preset, entry point, creating blueprint version, and the latest successful deployment target. Rebuilding a project preserves its ID and deployment.

`deploy` requires that project marker, validates the entry point, publishes it with Cloudflare Workers Static Assets, verifies the resulting URL, and then records the deployment in `.blueprint.json`. A file target is staged alone as `index.html`; a directory target must be deploy-ready build output. `--account` is normally omitted: blueprint reuses the project's recorded account, `CLOUDFLARE_ACCOUNT_ID`, or the only available account, and requires an explicit account only when none resolves a unique account. The bundled skill derives Worker names as `<repo-name>-<task-name>` inside a Git repository and `<task-name>` elsewhere. Install and authenticate Wrangler separately:

```bash
brew install cloudflare-wrangler
wrangler login
```

`list` discovers projects by their `.blueprint.json` marker. It scans the current directory by default, accepts `--root <path>`, and emits machine-readable records with `--json`.

`skill install` uses `@kitup/sdk` to detect supported agent hosts, select user or project scope, install the bundled `skill/blueprint` tree, and protect unmanaged targets from accidental overwrite. It supports repeatable `--agent`, `--dry-run`, `--yes` / `-y`, and `--force`.

Development:

```bash
pnpm install
pnpm check
pnpm blueprint --version
pnpm blueprint create pitch <project-directory>
```

## Distribution

`npm pack` builds an installable tarball containing the compiled JavaScript CLI, runtime assets, templates, and bundled Agent Skill. Installing that tarball must expose `blueprint` without requiring TypeScript execution from `node_modules`.

This is the package boundary intended for a future `samzong/homebrew-tap` formula. The formula should provide Node.js 24+ and `gofs` 0.2.4+, install the package, and expose its `blueprint` bin. Wrangler remains an optional external dependency for deployment. Users can install the bundled Agent Skill with `blueprint skill install`.

```bash
npm pack
```

## Compiler source

```text
<project-directory>/
  src/
    pitch.json | briefing.json | archive.json
    sections.html | slides.html | docs/**/*.md
    style.css                  # optional
  index.html                   # generated
```

Pitch uses `src/pitch.json` plus `src/sections.html`; briefing uses `src/briefing.json` plus `src/slides.html`; archive uses `src/archive.json` plus a Markdown corpus under `src/docs`. Source files are compiler input, not standalone pages. Open or preview only the generated root `index.html`.

`pitch.json` supplies `title`, `brand`, `date`, `footer`, and optional `lang`. Pitch sections must include `hero`, `solution`, and `cta` IDs. `briefing.json` supplies `title` and optional `lang`; briefing requires a cover plus at least three content slides, each with `.slide-tag` and `.slide-num`.

`archive.json` supplies `title`, optional `lang`, and optional `downloadName`. Archive embeds every Markdown document, the `win98-web` theme, hash routing, search, ZIP download, and optional Mermaid rendering into one generated file.

blueprint inlines preset styles, runtime, content, and optional custom CSS into the generated output.

## Layout

```text
src/
  cli.ts
  deploy.ts
  project.ts
  presets/
    archive.css
    archive-runtime.js
    archive.ts
    briefing.css
    briefing.ts
    pitch.css
    pitch.ts
    scaffold.ts
    shared.ts
  shared/
    deck.css
    deck.js
    tokens.css
  templates/
    dossier/
    prototype-lite/
skill/
  blueprint/
test/
```

## License

MIT
