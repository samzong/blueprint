# Preset: pitch

Use this contract for investor narratives, product introductions, launches, and compact public stories. Let the compiler own the shell, tokens, navigation, responsive behavior, validation, and preview.

## Source

```text
<project>/
  src/
    pitch.json
    sections.html
    style.css          # optional
```

`pitch.json` requires `title`, `brand`, `date`, and `footer`. `brandUrl` and `lang` are optional; `lang` defaults to `en`.

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

`sections.html` contains only section markup. Do not include document chrome, styles, scripts, navigation, or footer. Include `hero`, `solution`, and `cta` section IDs, with 4–7 real sections total.

Use `src/style.css` only for topic-specific layout. Reuse compiler classes and shared tokens; do not copy deck CSS or runtime.

## Content rules

- Lead each section with one repeatable claim, then evidence.
- Challenge outdated defaults, not the audience.
- Use at most one `.highlight` per section.
- Use `.mono` for numbers, versions, and timestamps.
- Break Chinese display headings intentionally.
- Prefer inline SVG or data URIs for portable assets.
- Keep mobile layouts readable and controls at least 44px tall.

## Build

```bash
blueprint create pitch <project>
blueprint check <project>/index.html
blueprint preview <project>/index.html
```

Preview only the generated root `index.html`.
