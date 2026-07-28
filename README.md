# blueprint

blueprint turns a conversational web brief into a deterministic, portable output.

The project owns mechanical behavior:

- shared design tokens and runtime code
- preset templates
- output validation
- local preview through `gofs`
- Cloudflare Workers Static Assets deployment through Wrangler

The bundled skill owns semantic behavior:

- intent and preset selection
- topic-specific research and writing
- final visual review

## Current milestone

This repository contains the blueprint skill migration baseline, executable shared assets, and working `create`, `check`, `preview`, and `deploy` commands. `pitch` and `briefing` compile semantic source files into portable single-file HTML. Prototype and dossier remain scaffold workflows.

## Commands

Requires Node.js 24+, pnpm 10, and `gofs` 0.2.4+ on `PATH`. Deployment additionally requires Wrangler 4+.

Installed CLI:

```bash
blueprint --version
blueprint create pitch <project-directory>
blueprint create briefing <project-directory>
blueprint create prototype-lite <empty-directory>
blueprint create prototype-full <empty-directory>
blueprint create dossier <empty-directory>
blueprint check <index.html-or-directory>
blueprint preview <index.html-or-directory>
blueprint preview <index.html> --root <asset-root> --port 4175
blueprint deploy <index.html-or-directory> --name <worker-name>
blueprint deploy <index.html-or-directory> --name <worker-name> --account <name-or-id>
blueprint skill install
blueprint skill install --scope user --agent codex --yes
```

Preview binds `gofs` to `127.0.0.1`, mounts the selected root read-only, and uses its default theme so single-file inline scripts remain executable.

`deploy` validates the entry point, publishes it with Cloudflare Workers Static Assets, and returns only after the resulting URL responds successfully. A file target is staged alone as `index.html`; a directory target must be deploy-ready build output. `--account` is normally omitted: blueprint uses the only available account or `CLOUDFLARE_ACCOUNT_ID`, and requires an explicit account only when neither resolves a unique account. The bundled skill derives Worker names as `<repo-name>-<task-name>` inside a Git repository and `<task-name>` elsewhere. Install and authenticate Wrangler separately:

```bash
brew install cloudflare-wrangler
wrangler login
```

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
    pitch.json | briefing.json
    sections.html | slides.html
    style.css                  # optional
  index.html                   # generated
```

Pitch uses `src/pitch.json` plus `src/sections.html`; briefing uses `src/briefing.json` plus `src/slides.html`. Source fragments are compiler input, not standalone pages. Open or preview only the generated root `index.html`.

`pitch.json` supplies `title`, `brand`, `date`, `footer`, and optional `lang`. Pitch sections must include `hero`, `solution`, and `cta` IDs. `briefing.json` supplies `title` and optional `lang`; briefing requires a cover plus at least three content slides, each with `.slide-tag` and `.slide-num`.

blueprint inlines preset tokens, shared deck styles, runtime, and optional custom CSS into the generated output.

## Layout

```text
src/
  cli.ts
  deploy.ts
  presets/
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
