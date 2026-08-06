# Live architecture diagram

`blueprint.mmd` is the **single source of truth** for this repository's system
boundary: Skill ownership, CLI surface, Preset/Theme catalog, Artifact
manifest, preview, and deploy.

There is no separate publish step. Updating the file on the default branch is
the publish.

## The rule

**Every change that alters the architecture MUST update `blueprint.mmd` in the
same change.** A change that moves boxes or arrows but leaves the diagram stale
is **incomplete**.

Update the diagram when any of these change:

- supported Preset or Theme contract boundaries
- CLI command surface (`create`, `check`, `preview`, `deploy`, `list`, `skill`)
- Skill ↔ CLI ownership (what the Skill decides vs what the CLI owns)
- compiler, scaffold, validator, or chrome/runtime ownership
- `.blueprint.json` schema or deployment record shape
- preview or deploy path

Do **not** update the diagram for:

- Artifact content, copy, or one-off visual direction
- Preset template text that does not change the contract
- tests or scripts with no external contract change

## Editing

Plain [Mermaid](https://mermaid.js.org/) `flowchart` text — diffable in review.
Keep it at **architecture** altitude: boxes and ownership arrows, not file-level
implementation. Preserve the `classDef` styles. Preview at
<https://mermaid.live>.

Terminology for labels must match `CONTEXT.md`. The diagram owns system
boundary; `CONTEXT.md` owns product terms.
