---
name: blueprint
description: >
  Create, rebuild, validate, preview, discover, and deploy blueprint-managed
  web projects using pitch, briefing, slides, archive, prototype, or dossier presets.
  Use when the user mentions blueprint, asks to create a page, demo, deck,
  report, or Markdown archive, or wants to check, preview, list, or publish an
  existing blueprint project. Do not use for unrelated web projects or
  non-web outputs.
---

**Reply language**: use Chinese with the user. Use English for code, comments, filenames, and Git text.

# blueprint

Use the `blueprint` CLI for deterministic scaffolding, compilation, validation, preview, discovery, and deployment. Handle intent, content, and visual judgment in the Skill.

## Route the request

- For a new project or content rebuild, follow **Create or rebuild**.
- For validation, preview, or discovery, follow **Operate a project**.
- For publication, follow **Deploy**.
- Do not collect topic or preset inputs for an existing-project operation.

## Create or rebuild

### Collect inputs

Ask at most one blocking question and only for missing information that changes the output:

1. **Topic**: what the page must communicate.
2. **Output directory**: default demos, examples, and scratch work to `.local/<slug>` in the current repository; ask only for standalone-project locations.
3. **Preset**: infer it when exactly one row matches.

| Intent | Preset |
|---|---|
| Investor pitch, product introduction, landing page | `pitch` |
| Stage presentation, conference talk, speaker deck, PPT | `slides` |
| Clickable concept, interaction demo, state switching | `prototype` |
| Research, comparison, diligence, white paper | `dossier` |
| Responsibility, process, governance, training, internal alignment | `briefing` |
| Markdown library, knowledge base, searchable document set | `archive` |

Ask for the primary audience or delivery form only when multiple rows or none match.

An explicit request for slides, PPT, Reveal.js, speaker notes, or stage delivery selects `slides` even when the subject could also fit `pitch` or `briefing`. Choose `prototype-lite` for one page with at most three core interaction states. Choose `prototype-full` for multiple views or sustained iteration. Default to `prototype-lite`. Use the `dify-x` theme for `slides`; do not ask for a skin while it is the only supported slides theme. Do not ask for a skin for `briefing` or `archive`.

For `slides`, inspect the supplied material for real organization, product, partner, event, and language requirements before writing. Configure optional brand chrome only from verified local assets. Configure multiple locales only when requested or supported by source material, keep their slide topology aligned, and write each language for its audience instead of translating line by line. Never invent logos, partners, presenters, translations, citations, or image credits.

For an existing managed project, preserve its preset, project ID, and deployment metadata. For a new project, stop before writing when the output directory is non-empty.

### Rebuild dated material

When rebuilding a legacy page or time-sensitive product story:

1. Compare volatile claims with current code, runtime, accepted contracts, and authoritative sources before writing.
2. Classify each claim as current fact, dated fact, target, or hypothesis.
3. Keep only verified current facts in the main story. Label dated facts with their evidence date, and move unsupported numbers or superseded claims into an archive or `.local` claim ledger.
4. Preserve the legacy artifact as historical evidence unless the user explicitly requests deletion.

`blueprint check` proves structure, not factual freshness or visual equivalence.

### Load only the selected references

| Preset | References |
|---|---|
| `pitch` | [design system](references/design-system.md), [pitch contract](references/preset-pitch.md) |
| `briefing` | [design system](references/design-system.md), [briefing theme](references/theme-briefing.md), [briefing contract](references/preset-briefing.md) |
| `slides` | [design system](references/design-system.md), [Dify-X theme](references/theme-dify-x.md), [slides contract](references/preset-slides.md) |
| `archive` | [win98-web theme](references/theme-win98-web.md), [archive contract](references/preset-archive.md) |
| `prototype-lite`, `prototype-full` | [design system](references/design-system.md), [prototype contract](references/preset-prototype.md) |
| `dossier` | [design system](references/design-system.md), [dossier contract](references/preset-dossier.md) |

### Generate

1. Run `blueprint --version`. Stop and request installation when unavailable; do not copy an old template as fallback.
2. Write content according to the selected references.
3. For `pitch`, `briefing`, `slides`, or `archive`, write only semantic sources under `src/`, then run:

   ```bash
   blueprint create <preset> <output>
   blueprint check <output>/index.html
   ```

4. For `prototype-lite`, `prototype-full`, or `dossier`, run `blueprint create <preset> <output>` before filling topic-specific content.
5. Return the output path and the appropriate preview command. Do not install dependencies or start a server unless the user requested preview or deployment.

Let `blueprint create` manage `.blueprint.json`. Never hand-write, delete, or copy it to create another project.

## Operate a project

- Validate: `blueprint check <target>`
- Discover from the current directory: `blueprint list`
- Discover under another root: `blueprint list --root <path>`
- Request machine-readable discovery output: append `--json`
- Preview: `blueprint preview <target>`; for `prototype-full` or `dossier`, run `pnpm install` first when dependencies are absent.

Use paths returned by discovery; do not store absolute paths in `.blueprint.json`. Treat `deployed` as a record of a previously verified publish, not proof that the remote still exists.

## Deploy

Deploy only after the user has reviewed the preview and explicitly requested publication:

- Single-file output: `blueprint deploy <output>/index.html --name <worker-name>`
- `prototype-full` or `dossier`: run `pnpm install && pnpm build`, then deploy `<output>/dist`

Derive `worker-name` without asking:

- Inside a Git repository: `<repo-name>-<task-name>`
- Outside a Git repository: `<task-name>`

Use the nearest Git root directory for `repo-name` and a stable task slug for `task-name`. Normalize to lowercase hyphen-case and keep the name within 63 characters. Honor an explicit user-provided name.

Omit `--account` by default. Let the CLI resolve the recorded account, `CLOUDFLARE_ACCOUNT_ID`, or the only available account. Ask only when no unique account can be resolved. Return the verified published URL.

## Boundaries

- Do not run `git init`, install dependencies, or start a server unless required by the requested operation.
- Do not add unrequested documentation, linters, formatters, hooks, state libraries, or UI frameworks.
- Do not write narration comments.
- Preview only the compiled root `index.html` for `pitch`, `briefing`, `slides`, and `archive`.
- Do not recreate compiler-owned navigation, progress, responsive behavior, deck chrome, language controls, CSS, or runtime in semantic sources.
- Do not add CTA, contact, or approval slides to `briefing` unless explicitly requested.
