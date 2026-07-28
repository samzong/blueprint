# Preset: pitch

**Output**: compiled single-file HTML.
**Use for**: investor narratives, product introductions, launches, and compact public-facing stories.

blueprint owns the document shell, tokens, base CSS, deck rail, keyboard navigation, fullscreen, autoplay, mobile navigation, validation, and preview. The Skill owns topic-specific structure, claims, evidence, and custom presentation CSS.

## Source contract

Write these files under the selected project directory:

```text
<project>/
  src/
    pitch.json
    sections.html
    style.css      # optional
```

`src/pitch.json`:

```json
{
  "title": "Document title",
  "brand": "Brand",
  "brandUrl": "https://example.com",
  "date": "YYYY-MM-DD",
  "footer": "Copyright or repository line",
  "lang": "en"
}
```

`brandUrl` is optional. Use the canonical project, company, or repository URL when the brand should be linked. `lang` is optional and defaults to `en`.

`src/sections.html` contains only section markup. Do not include `<html>`, `<head>`, `<body>`, `<style>`, `<script>`, top navigation, or footer. It must contain:

- `<section id="hero">`
- `<section id="solution">`
- `<section id="cta">`

Use 4–7 real sections based on content depth. Do not generate empty placeholders.

`src/style.css` contains topic-specific layout only. Reuse compiler classes and tokens before adding new rules:

- `.mono`
- `.highlight`
- `.meta-tag`
- `.card`
- `.cta-btn`
- the shared CSS variables from `shared/design-system.md`

Do not copy the shared deck CSS or runtime into source files.

## Content rules

1. Write claim-first sections: one repeatable assertion, then evidence.
2. Challenge outdated defaults or workflows, not the audience.
3. Use at most one `.highlight` per section.
4. Put numbers, versions, and timestamps in `.mono`.
5. Use intentional `<br>` breaks for large Chinese headlines; avoid isolated punctuation or 1–2 character final lines.
6. Prefer inline SVG or data URIs for real brand assets when the output must remain one file.
7. Keep mobile layouts readable; CTA controls must remain at least 44px tall.

## Compile and verify

```bash
blueprint create pitch <project>
blueprint check <project>/index.html
blueprint preview <project>/index.html
```

Open only the generated root `index.html`. Files under `src/` are compiler input and are not standalone pages.
