# blueprint

blueprint turns a conversational brief into a deterministic, portable Artifact.

- The CLI owns presets, validation, preview, deployment, and project metadata.
- The bundled Agent Skill owns preset selection, research, writing, upgrades, and visual review.

## Showcase

The examples below show selected Preset outputs. Click a screenshot to open the live Artifact.


| Pitch                                                             | Briefing                                                                      | Archive(Win 98)                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Lathe pitch](https://lathe-ai-native-pitch.samzong.workers.dev/) | [Blueprint briefing](https://blueprint-session-briefing.samzong.workers.dev/) | [Mosoo archive](https://mosoo-product-inquiry.samzong.workers.dev/) |
| [Lathe](https://github.com/lathe-cli/lathe) · `pitch`             | [Blueprint](https://github.com/samzong/blueprint) · `briefing`                | [Mosoo](https://github.com/langgenius/mosoo) · `archive`            |




## Install

```bash
brew tap samzong/tap
brew trust samzong/tap
brew install blueprint
```

Homebrew installs Node.js, `gofs`, and Wrangler as dependencies.

Copy this prompt to your agent:

```text
Install Blueprint and its bundled Agent Skill for your current agent: run brew tap samzong/tap, brew trust samzong/tap, brew install blueprint, and blueprint skill install, then verify the installation with blueprint --version.
```



## Quick start

```bash
blueprint create prototype-lite .local/demo
blueprint check .local/demo
blueprint preview .local/demo
blueprint --help
```

Available presets:


| Preset           | Output                                                                                            | Theme model                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `architecture`   | Agent-designed SVG in a reviewable HTML shell with deterministic SVG/PNG export                    | Project-specific composition derived from Recall and rx visual DNA     |
| `pitch`          | Compiled single-file story                                                                        | No named Theme; shared design system and fixed Preset baseline        |
| `briefing`       | Compiled single-file slide deck                                                                   | Fixed `briefing` Theme                                                |
| `slides`         | Compiled single-file Reveal.js presentation with optional brand/language chrome and speaker notes | Configured `dify-x` Theme; currently the only supported value         |
| `archive`        | Compiled searchable Markdown reader                                                               | Fixed `win98-web` Theme                                               |
| `prototype-lite` | Single-file React prototype                                                                       | No named Theme; Artifact-specific styling on the shared design system |
| `prototype-full` | Vite + React + TypeScript prototype                                                               | No named Theme; Artifact-specific styling on the shared design system |
| `dossier`        | Maintained Vite + React + TypeScript report                                                       | No named Theme; Artifact-specific styling and entity color strategy   |


A Preset is the Artifact contract, not a visual style. Architecture diagrams are composed for the actual system instead of selected from a Theme switch. `slides` exposes `dify-x`; `briefing` and `archive` use fixed Themes. See [CONTEXT.md](CONTEXT.md) for canonical terminology and ownership.

For architecture work, ask the Agent to draw the diagram. It inspects the project and directly authors the complete `src/diagram.svg`; Blueprint validates it, wraps it in an HTML review surface, and exports that same drawing as SVG or PNG. You do not provide nodes, coordinates, or layout JSON.

```bash
blueprint create architecture .local/system-map
blueprint check .local/system-map
blueprint preview .local/system-map
blueprint export .local/system-map --format svg
blueprint export .local/system-map --format png
```

The Agent chooses and adapts the composition from the system facts: Recall-style system maps for ownership and flow, rx-style runtime posters for dense execution paths, or a project-specific blend when the content requires it. Exported SVG can be embedded in another Blueprint Artifact while `src/diagram.svg` remains the editable source.

Every successful `create` writes `.blueprint.json` with the project identity, entry point, preset, last verified preset version, and latest verified deployment. Rebuilding preserves the project ID, version marker, and deployment record; the bundled skill advances `createdWith` only after a verified upgrade.

`blueprint list` discovers projects under the current directory. Use `--root <path>` to change the scan root and `--json` for machine-readable output.

## Deploy

Deployment requires Wrangler 4+:

```bash
wrangler login
blueprint deploy .local/demo --name repo-task
```

`deploy` validates a managed project, publishes it through Cloudflare Workers Static Assets, verifies the URL, and records the result in `.blueprint.json`.

Pass `--protect` to gate the published Worker behind HTTP basic auth: blueprint generates `viewer` credentials, stores them as Worker secrets, records them alongside `protected: true` in `.blueprint.json`, and verifies that anonymous requests are rejected. Protected redeploys reuse the recorded credentials; omitting `--protect` publishes openly and clears the recorded protection and credentials.

Single-file presets, including `slides`, may be deployed from the project directory. For `prototype-full` and `dossier`, run `pnpm build` in the project and deploy its `dist` directory.

`--account` is usually unnecessary. blueprint reuses the recorded account, `CLOUDFLARE_ACCOUNT_ID`, or the only available account. The bundled skill derives Worker names as `<repo-name>-<task-name>` inside a Git repository and `<task-name>` elsewhere.

## Install the Agent Skill

```bash
blueprint skill install
```

The installer uses `@kitup/sdk` to detect supported agents, select user or project scope, and protect unmanaged targets from accidental overwrite. Run `blueprint skill install --help` for agent, scope, dry-run, and force options.

## Development

Development requires Node.js 24+ and pnpm 10.

```bash
pnpm install
pnpm check
npm pack
```

`npm pack` builds the GitHub Release artifact.

## Acknowledgements

blueprint directly uses:

- [gofs](https://github.com/samzong/gofs) for single-file local preview serving
- [@kitup/sdk](https://github.com/lathe-cli/kitup) for bundled Agent Skill installation
- [resvg-js](https://github.com/thx/resvg-js) for deterministic SVG-to-PNG rendering
- [Wrangler](https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler) and [Cloudflare Workers](https://developers.cloudflare.com/workers/) for deployment



## License

[MIT](LICENSE)
