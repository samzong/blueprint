# Preset: briefing

Use this contract for internal explanations, alignment, responsibility boundaries, process clarification, research summaries, observations, and training. Let the compiler own the slide shell, theme, navigation, responsive behavior, validation, and preview.

## Source

```text
<project>/
  src/
    briefing.json
    slides.html
    style.css          # optional
```

`briefing.json` requires `title`; `lang` is optional and defaults to `en`.

```json
{
  "title": "Document title",
  "lang": "en"
}
```

`slides.html` contains only slide sections:

```html
<section class="slide" data-rail-title="Short title">
  <div class="slide-tag">Section tag</div>
  <div class="slide-num mono">01 / 06</div>
  <div class="slide-inner">...</div>
</section>
```

Include one `.slide.cover`, at least three content slides, and `.slide-tag` plus `.slide-num` on every slide. Default to 6–12 useful pages.

Use `src/style.css` only for topic-specific layout. Reuse the page types and component vocabulary in `theme-briefing.md`; do not copy theme CSS or runtime.

## Content rules

- Outline before writing markup; choose page types that fit the topic.
- Write complete statements, not Lorem Ipsum or TODO shells.
- Use at most one `.highlight` per slide.
- Use `.mono` for numbers, dates, versions, and codes.
- Use intentional line breaks for Chinese display headings.
- Keep wide tables usable on narrow screens.
- Prefer inline SVG or data URIs for portable assets.
- Do not add CTA, contact, or approval-request pages unless explicitly requested.

## Build

```bash
blueprint create briefing <project>
blueprint check <project>/index.html
blueprint preview <project>/index.html
```

Preview only the generated root `index.html`.
