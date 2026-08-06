# Repository Guidelines

## Product Context

- Read `CONTEXT.md` before non-trivial work and use its canonical terminology in code, documentation, planning, and reviews.
- Do not treat a topic, layout, visual direction, or CSS implementation as a new Preset or Theme without crossing the product-decision boundary explicitly.

## Live architecture diagram

- `docs/architecture/live/blueprint.mmd` is the system-boundary source of truth.
- Any change that alters Skill ↔ CLI ownership, Preset/Theme catalog boundaries, compiler/validator/chrome ownership, `.blueprint.json`, or the preview/deploy path MUST update that diagram in the same change.
- A change that alters the architecture but leaves the diagram stale is incomplete. See `docs/architecture/live/README.md`.

## Localization

- Do not add CJK literals outside recognized localization paths.
- Put translated strings under `**/i18n/**`, `**/locales/**`, or locale-named files such as `*.zh-CN.ts`.
- Runtime assets such as `src/shared/deck.js` must consume compiler-injected locale data and keep English fallbacks.
- Before shipping, inspect staged added lines with `git diff --cached --unified=0 | rg --pcre2 '^\+(?!\+\+).*\p{Script=Han}'`.
- Non-localization CJK additions block `/ship`.
