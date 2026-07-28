# Preset: archive

**Use for**: a browsable collection of Markdown documents with navigation, search, Mermaid rendering, and full-corpus download.

## Source contract

```text
<project-directory>/
  src/
    archive.json
    style.css            # optional
    docs/
      README.md
      **/*.md
  index.html             # generated
  .blueprint.json        # managed by blueprint
```

`archive.json` requires `title` and accepts:

- `lang`: valid language tag; defaults to `en`
- `downloadName`: ZIP filename; defaults to `<project-directory>.zip`

The compiler recursively includes Markdown files from `src/docs`, ignores hidden paths and `node_modules`, places the root `README.md` first when present, and derives each navigation label from its first H1 or filename.

## Generate

```bash
blueprint create archive <project-directory>
blueprint check <project-directory>/index.html
```

The generated `index.html` embeds the documents, `win98-web` theme, Markdown renderer, hash routing, search, ZIP writer, and Mermaid loader. It must not fetch a manifest or Markdown files at runtime.

## Content rules

- Keep source documents as Markdown; do not hand-edit generated HTML.
- Use one H1 per document for its navigation title.
- Use `README.md` as the archive landing document.
- Preserve evidence labels, code fences, tables, quotes, ordered lists, and unordered lists.
- Use fenced `mermaid` blocks only when a diagram materially improves the document.
- Put project-specific visual overrides in `src/style.css`; do not copy compiler CSS or runtime.
