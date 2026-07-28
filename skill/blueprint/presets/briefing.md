# Preset: briefing

**Output**: compiled single-file slide deck.
**Theme**: `shared/themes/briefing.md`.
**Use for**: internal explanations, alignment material, responsibility boundaries, process clarification, research summaries, observations, and training.

blueprint owns the document shell, briefing theme, component CSS, deck rail, keyboard navigation, fullscreen, autoplay, mobile navigation, validation, and preview. The Skill owns the outline, page types, claims, examples, and topic-specific CSS.

## Source contract

Write these files under the selected project directory:

```text
<project>/
  src/
    briefing.json
    slides.html
    style.css      # optional
```

`src/briefing.json`:

```json
{
  "title": "Document title",
  "lang": "en"
}
```

`lang` is optional and defaults to `en`.

`src/slides.html` contains only slide sections. Do not include `<html>`, `<head>`, `<body>`, `<style>`, or `<script>`.

Each page uses:

```html
<section class="slide" data-rail-title="Short title">
  <div class="slide-tag">Section tag</div>
  <div class="slide-num mono">01 / 06</div>
  <div class="slide-inner">...</div>
</section>
```

The deck must contain one `.slide.cover` and at least three content slides. Default to 6–12 useful pages. Every slide must retain `.slide-tag` and `.slide-num`.

`src/style.css` contains topic-specific layout only. Reuse the page types and component classes from `shared/themes/briefing.md`:

- `.cover`, `.section-divider`, `.alt`
- `.meta-row`
- `.card-grid`, `.card`
- `.matrix`
- `.stage-row`, `.stage`
- `.checklist`
- `.callout`
- `.mono`, `.serif`, `.highlight`

Do not copy shared theme CSS or deck runtime into source files.

## Page selection

Choose page types based on the topic instead of forcing a funnel:

- cover
- section divider
- thesis
- diagnosis
- model
- matrix
- checklist
- evidence
- neutral next steps
- appendix

Do not generate CTA, contact, approval-request, or “call to action” pages unless the user explicitly requested a decision or report.

## Content rules

1. Outline the deck before writing slide markup.
2. Write complete readable statements; do not use Lorem Ipsum or empty TODO shells.
3. Use at most one `.highlight` per slide.
4. Put numbers, dates, versions, and codes in `.mono`.
5. Use intentional line breaks for Chinese display headings.
6. Keep tables horizontally scrollable on narrow screens.
7. Prefer inline SVG or data URIs when the output must remain one file.

## Compile and verify

```bash
blueprint create briefing <project>
blueprint check <project>/index.html
blueprint preview <project>/index.html
```

Open only the generated root `index.html`. Files under `src/` are compiler input and are not standalone pages.
