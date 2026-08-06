# Blueprint Design Admission Rubric

Use this rubric after capturing the complete reference. It is a decision aid, not a numeric score.

## Gate 1: Evidence

Proceed only when the available artifact proves the qualities being classified.

| Evidence | What it can prove | What it cannot prove alone |
|---|---|---|
| Screenshot | visual hierarchy, composition, typography, color | interaction, responsive behavior, runtime, source ownership |
| Full page or slide capture | sequence, density, recurring visual grammar | hidden interaction, implementation portability |
| Live rendered reference | responsive and interactive behavior | source quality or licensing |
| Source repository | implementation and runtime ownership | actual production rendering without execution |
| Multiple independent examples | recurrence and reuse potential | product demand without usage evidence |

Use `REFERENCE_ONLY` when the missing evidence could change the owner or verdict.

## Gate 2: Contract delta

Classify as a `PRESET_CANDIDATE` only when an essential, recurring difference exists in one or more of:

- delivery form or audience experience;
- semantic source shape;
- generator, compiler, or scaffold;
- navigation, interaction, or runtime ownership;
- validation or rejection rules;
- preview, build, portability, or deployment contract;
- maintenance and upgrade behavior.

Do not create a Preset for a topic, industry, brand, palette, typography choice, component arrangement, or visual trend.

## Gate 3: Reuse scope

Use this ownership order:

| Reuse scope | Owner |
|---|---|
| one Artifact | visual direction or Artifact CSS |
| one concrete use case on an existing contract | reference example |
| multiple independent Artifacts within one Preset | Theme |
| multiple Presets | design system |
| distinct recurring Artifact contract | Preset |

Require multiple independent examples before promoting a visual rule into a Theme. Treat repetition inside one brand, campaign, source deck, or generated family as one example.

## Gate 4: Novelty

Compare with the nearest existing owner before adding anything.

- If an existing Theme already expresses the same grammar, improve its guidance or preserve the reference as an example.
- If the reference adds one reusable state or component vocabulary, improve the existing Theme.
- If the useful part is content arrangement for one use case, keep it as a reference example.
- Add a new Theme only when the visual grammar remains materially distinct across different content.
- Add a new Preset only when adapting an existing Preset would make its contract conditional, misleading, or difficult to validate.

Do not use a new catalog entry to avoid fixing an incomplete existing owner.

## Gate 5: Quality and portability

Reject or narrow any rule that depends on:

- illegible contrast or inaccessible interaction;
- fragile viewport assumptions;
- hover-only essential behavior;
- proprietary fonts or unavailable assets without an acceptable substitute;
- remote runtime assets that violate the Preset's portability contract;
- copied minified code or opaque generated bundles;
- content density that succeeds only with the reference's exact copy;
- animation that obscures meaning or ignores reduced motion;
- a framework or dependency not justified by the Artifact contract.

## Gate 6: Provenance

Separate inspiration from copying.

May absorb:

- abstract spacing and density principles;
- type-scale relationships using permitted fonts;
- semantic color roles;
- general composition and responsive strategies;
- reusable interaction patterns supported by the target Preset;
- component roles expressed independently.

Do not absorb without explicit rights:

- logos and brand marks;
- product copy or narrative;
- photographs, illustrations, icons, or video;
- distinctive proprietary artwork;
- source code, templates, or assets under incompatible terms;
- names that imply affiliation or endorsement.

Record attribution, license, and uncertainty. Provenance uncertainty blocks direct reuse but may still permit an independently expressed abstract rule.

When provenance is unclear:

- keep catalog action at `NONE` until direct-use rights are established or the rule is independently re-authored;
- lower confidence when provenance could change the proposed delta;
- preserve abstract observations without copying names, source, assets, content, or distinctive expression.

## Improvement test

Use `IMPROVE_EXISTING` only when all are true:

1. the current owner is clearly identified;
2. the reference exposes a reproducible gap;
3. the proposed rule generalizes beyond the reference;
4. the change does not silently widen the owner's contract;
5. a representative before/after Artifact can verify the improvement.

Otherwise use `REFERENCE_ONLY` or `ADD_NEW`.

## Candidate acceptance evidence

Before accepting a Theme or Preset candidate, require:

- at least one public or locally reproducible reference Artifact;
- desktop and mobile captures, or complete slide/page renders;
- a written contract that excludes content-specific details;
- comparison with every plausibly overlapping current owner;
- a concrete implementation owner;
- a narrow verification plan;
- explicit owner acceptance.

For a new Preset, also require a generator, compiler or scaffold plan; validator and rejection rules; preview/build/deployment behavior; and an upgrade or compatibility position.
