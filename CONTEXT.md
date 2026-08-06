# Blueprint Context

## Product model

Blueprint turns a conversational web brief into a managed Artifact through a Preset. A Preset defines the Artifact contract. A Theme defines reusable visual language within that contract.

## Canonical terminology

### Artifact

One managed output project created through Blueprint. Its `.blueprint.json` records identity, entry point, Preset, last verified Preset version, and latest verified deployment.

### Preset

The versioned Artifact contract: intended delivery form, semantic source shape, generator, compiler or scaffold, runtime ownership, validation, preview, build, and deployment expectations. A Preset can include a default visual baseline, but a topic or visual treatment alone does not justify a new Preset.

### Theme

A reusable visual-system contract scoped to a Preset. It may define tokens, typography, surfaces, visual states, component vocabulary, composition, and responsive visual rules. It does not define business content, source schema, runtime behavior, validation, or deployment. A Theme can be fixed by a Preset or explicitly selected; the existence of a Theme does not imply a selection surface.

### Visual direction

A requested visual outcome not yet promoted into a reusable Theme.

### CSS

An implementation mechanism. CSS may implement shared foundations, Preset chrome, a Theme, or Artifact-specific layout. CSS is not itself a product contract.

### Layout

The spatial, reading, and navigation model of an Artifact, such as continuous or sectioned. Layout is neither a Preset nor a Theme.

### Design system

Cross-Preset visual foundations. Add a rule here only when multiple Presets need it.

### Chrome and runtime

Preset- or compiler-owned navigation, progress, controls, routing, search, and other behavior. A Theme may style these surfaces but does not own their behavior.

## Interpretation rules

- When the user informally says "CSS", "theme", "skin", "look", or "style", interpret it as a visual direction unless they explicitly request stylesheet implementation or name a supported Theme.
- When the user asks Blueprint to "remember a theme", treat that as a request to preserve a reusable generation convention. Do not automatically create a new Preset, Theme selector, or manifest field.
- A topic does not create a Preset. Choose a Preset from delivery form, reading model, interaction depth, runtime ownership, and maintenance contract.
- Promote Artifact-specific styling into a Theme only after it recurs across independent Artifacts.
- If an interpretation would add a Preset, Theme selector, manifest field, or compatibility obligation, surface it as a product decision before implementation.
- Treat an exact supported Preset or Theme ID as literal.

## Catalog growth model

Blueprint's reusable product catalog consists primarily of Presets and Preset-scoped Themes.

- Add or extend a Preset when the delivery form, semantic source shape, generator, compiler or scaffold, runtime ownership, validation, build, or deployment contract changes.
- Add a Theme within an existing Preset when the Artifact contract stays the same and a visual system recurs across independent Artifacts.
- Keep one-off visual requests as Artifact-specific visual direction or CSS. Do not add them to the catalog.
- Promote foundations shared by multiple Presets into the design system rather than duplicating them across Themes.
- Scope every Theme to a Preset. Do not introduce a universal cross-Preset Theme without a proven shared contract.

## Sources of truth

- Supported Preset IDs: `src/project.ts`
- Preset selection and generation workflow: `skill/blueprint/SKILL.md`
- Preset contracts: `skill/blueprint/references/preset-*.md`
- Theme contracts: `skill/blueprint/references/theme-*.md`
- Compiler and validator behavior: `src/presets/` and `src/cli.ts`
- System boundary diagram: `docs/architecture/live/blueprint.mmd`
