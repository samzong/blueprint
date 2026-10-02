# html

An unthemed, single-file HTML Artifact. The CLI owns identity, discovery, contract validation, preview, and publication. The agent owns all content, layout, CSS, and optional JavaScript. There is no compiler, Theme, design-system reference, font, framework, or injected runtime.

```bash
blueprint create html .local/report
blueprint check .local/report
blueprint preview .local/report
blueprint list --root .local --json
```

Author the project-root `index.html` directly. Keep explicit `<html>`, `<head>`, and `<body>` elements. The CLI creates `.blueprint.json`; preserve its identity, entry, and deployment record. Repeated create checks the existing entry without replacing it or advancing `createdWith`. Upgrade applies required contract corrections in place and advances `createdWith` only after verification; it is a verified contract marker, not content revision history.

## Asset boundary

Publication copies only `index.html`. No companion files or directories are supported: the Artifact directory contains only `index.html` and `.blueprint.json`. Put working notes outside it. Inline CSS, scripts, and data assets, or use absolute external resources (prefer HTTPS). Same-document fragment references are supported. Local references in markup (including iframe `srcdoc`, background attributes, and refresh destinations) and CSS are rejected by checks; `<base>`, `srcset`, CSS imports, CSS escapes, and CSS image sets are unsupported by the portable validator. Use `src` and inline styles instead.

JavaScript may implement arbitrary interactions but must not load local files, modules, or data at runtime. Checks do not execute JavaScript or analyze dynamically constructed URLs; the agent must exercise those paths in the browser before requesting publication. External resource availability, content accuracy, accessibility, and visual quality require runtime review.

Never regenerate over customized HTML or styling. Report required conflicts. Preview through `blueprint preview`; deploy through the existing `blueprint deploy` flow, optionally with `--protect`, only after explicit publication authorization.
