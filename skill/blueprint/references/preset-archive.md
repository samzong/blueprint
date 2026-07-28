# Preset: archive

Use this contract for a searchable, downloadable collection of Markdown documents.

## Source

```text
<project>/
  src/
    archive.json
    style.css          # optional
    docs/**/*.md
  index.html           # generated
  .blueprint.json      # managed
```

`archive.json` requires `title` and accepts:

- `lang`: valid language tag; defaults to `en`
- `downloadName`: ZIP filename; defaults to `<project>.zip`

The compiler recursively embeds `src/docs`, ignores hidden paths and `node_modules`, places a root `README.md` first, and derives labels from the first H1 or filename. The generated file includes the theme, renderer, hash routing, search, ZIP download, and optional Mermaid loader; it must not fetch source documents at runtime.

## Build

```bash
blueprint create archive <project>
blueprint check <project>/index.html
```

## Content rules

- Use `README.md` as the landing document and one H1 per document.
- Preserve evidence labels, code fences, tables, quotes, and lists.
- Use fenced `mermaid` blocks only when a diagram improves the document.
- Put project-specific visual overrides in `src/style.css`.
- Edit Markdown sources, never the generated HTML or compiler CSS/runtime.
