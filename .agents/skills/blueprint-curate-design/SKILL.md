---
name: blueprint-curate-design
description: Assess websites, screenshots, slide decks, PDFs, repositories, and Blueprint Artifacts for design absorption into the Blueprint catalog. Use when a user asks whether a visual reference should become or improve a Preset, Theme, shared design-system rule, reference example, or nothing; asks to compare a reference with existing Blueprint Presets or Themes; or asks to apply an accepted design improvement without violating Blueprint ownership and validation boundaries.
---

# Blueprint Curate Design

Evaluate references before changing Blueprint. Separate delivery contracts from reusable visual language, concrete examples, and one-off taste.

## Establish the contract

1. Read the repository `CONTEXT.md`.
2. Inspect `src/project.ts`, the relevant `skill/blueprint/references/preset-*.md`, `theme-*.md`, and `design-system.md`.
3. Inspect compiler, scaffold, validator, runtime, and public examples only where they can change the classification.
4. Treat exact supported Preset and Theme IDs as literal.
5. Keep assessment read-only with respect to tracked files. Store captures and working notes under `.local/catalog-intake/<slug>/` when local evidence is needed, unless the user forbids all writes.

Do not classify from aesthetic preference alone. A visually distinctive reference is not evidence for a new Preset.

## Capture the reference

- For a live URL or local web app, use `browser-cdp` to capture the rendered desktop and mobile surfaces, meaningful interaction states, console state, and runtime behavior.
- For screenshots or images, inspect the highest available resolution and state what structure or behavior cannot be proven.
- For PDF or PPT material, render and inspect the complete page or slide sequence. Do not classify from the cover alone. Inspect source layouts or masters when available.
- For a repository, distinguish executable behavior, content, assets, framework defaults, and visual conventions.
- For a collection with many pages, decks, or applications, inventory the whole collection and deeply inspect representative samples covering each distinct runtime and visual family. State the sample and remaining blind spots; do not exhaustively render equivalent variants.
- Record the source URL or path, capture date, supplied assets, and provenance uncertainty.

Do not copy logos, product copy, photographs, illustrations, proprietary assets, or source code merely because the reference is public. Extract abstract, reusable rules and keep attribution where required.

If required browser or rendering transport is unavailable, do not silently substitute an unapproved tool. Continue only with claims supported by source evidence, mark visual and runtime behavior as `UNKNOWN`, and lower confidence unless the missing observation cannot change the verdict. Use `REFERENCE_ONLY` when missing rendering evidence could change catalog ownership.

## Decompose before comparing

Describe the reference on these axes:

1. delivery form and audience;
2. semantic source shape;
3. reading and navigation model;
4. interaction and runtime behavior;
5. build, validation, portability, and deployment needs;
6. layout and composition;
7. typography, color, surfaces, density, imagery, and motion;
8. reusable component vocabulary;
9. responsive and accessibility behavior;
10. content-, brand-, or campaign-specific details.

Read [the admission rubric](references/admission-rubric.md), then compare the reference with the nearest existing Preset, its Themes, and the shared design system.

When multiple Presets overlap, rank durable user intent and delivery form first, then reading and maintenance model, then source and runtime needs. Do not choose a Preset from appearance or the reference framework. Ask at most one owner question when the durable intent would change the target; otherwise use `REFERENCE_ONLY` and name the unresolved owners.

## Classify

Return exactly one primary verdict:

- `REJECT`: unsafe, uninspectable, low-quality, incompatible, derivative, or unsupported by a reusable rule.
- `REFERENCE_ONLY`: useful inspiration or evidence, but not yet a catalog asset.
- `THEME_CANDIDATE`: reusable visual language inside one existing Preset without changing its Artifact contract.
- `PRESET_CANDIDATE`: a recurring delivery, source, runtime, validation, build, or deployment contract that existing Presets cannot express cleanly.
- `DESIGN_SYSTEM_CANDIDATE`: a visual foundation proven useful across multiple Presets.

Also return one catalog action:

- `NONE`
- `IMPROVE_EXISTING`
- `ADD_NEW`

Prefer `IMPROVE_EXISTING` when the nearest owner can absorb the useful rule without weakening its contract. Prefer `REFERENCE_ONLY` over a new Theme when the novelty is mainly topic, content, branding, or one-off composition.

## Report the assessment

Use this compact contract:

```text
BLUEPRINT DESIGN INTAKE
Reference: <URL or path>
Verdict: <primary verdict>
Catalog action: <NONE | IMPROVE_EXISTING | ADD_NEW>
Target: <Preset, Theme, design system, reference example, or none>
Confidence: <HIGH | MEDIUM | LOW>

Evidence:
- FACT: <observed structure, behavior, or source evidence>
- INFERENCE: <what follows from the evidence>
- UNKNOWN: <what could not be inspected>

Nearest existing coverage:
| Axis | Reference | Existing owner | Gap |

Absorb:
- <abstract rule worth keeping>

Do not absorb:
- <content-specific, proprietary, fragile, or duplicate detail>

Proposed delta:
- <smallest owner-correct change, or none>

Verification:
- <real Artifact, visual checks, runtime checks, and project gates>

Recommendation: <one decisive next action>
```

Make the strongest counterargument explicit. A low-confidence assessment cannot authorize catalog mutation.

Calibrate confidence:

- `HIGH`: every decision-changing axis is directly observed, and remaining unknowns cannot change the verdict.
- `MEDIUM`: evidence supports the classification, but one material unknown blocks mutation or exact ownership.
- `LOW`: the reference is partial, provenance is unclear, or multiple owners remain plausible.

## Gate mutation

An assessment does not authorize implementation.

Before changing a canonical Preset, Theme, design-system rule, public example, or runtime owner, show:

```text
accepted scope -> proposed delta -> reason -> recommendation
```

Wait for the owner's explicit acceptance when no accepted proposal exists. Once the owner accepts that exact proposal or explicitly invokes the apply phase, implement it without another approval loop.

Keep `REJECT`, `REFERENCE_ONLY`, and unaccepted candidates read-only. Do not create placeholder Theme files, registry entries, manifest fields, compatibility layers, or speculative selectors.

## Apply an accepted change

Change the shallowest correct owner:

- Reference example or one-off composition: public example or Artifact source.
- Topic-specific geometry: Artifact CSS.
- Reusable visual language for one Preset: its Theme contract and actual visual implementation owner.
- Preset source, runtime, validation, build, or deployment behavior: Preset contract plus the owning implementation and proportionate tests.
- Cross-Preset foundation: shared design system and each affected implementation owner.

Preserve the reference as evidence, not as copied production source. Keep content, brand assets, and campaign-specific details out of reusable contracts.

For design optimization:

1. render a representative existing Artifact before editing;
2. identify the smallest measurable gap exposed by the reference;
3. update only the accepted owner and affected examples;
4. render the same Artifact and viewport states after editing;
5. compare content fit, hierarchy, responsiveness, accessibility, interaction, and console state;
6. run the repository's narrow checks and `blueprint check`;
7. inspect the final diff for unintended contract or catalog expansion.

For a mostly static web reference, the minimum visual pass covers full-page overflow at one desktop and one narrow viewport, navigation or hash behavior, keyboard focus for real controls and overflow regions, relevant contrast and reduced-motion behavior, and console or network failures.

Do not call an improvement complete from source inspection or type checking alone.

## Handoff

Report:

1. verdict and catalog action;
2. changed and unchanged ownership;
3. strongest remaining risk;
4. unresolved counterevidence;
5. shortest viewable and runnable proof;
6. readiness verdict.
