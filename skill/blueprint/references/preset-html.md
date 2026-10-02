# html

A free-form, unthemed HTML Artifact. The agent owns content, layout, CSS, JavaScript, and local assets. Blueprint uses its existing metadata, discovery, validation, preview, and publication lifecycle. No compiler, Theme, design system, font, framework, or runtime is injected.

```bash
blueprint create html .local/report
blueprint check .local/report
blueprint preview .local/report
blueprint deploy .local/report
```

Author the root `index.html` and any companion images, stylesheets, scripts, pages, or data files in the Artifact directory. Relative paths are preserved in preview and publication; single-file HTML also works. Checks apply the existing document basics without imposing visual or framework structure. Exercise resource loading and interactions in preview before publication.

The Artifact directory is the site's document root. Keep private working notes under `.local/` or outside the Artifact. Deployment excludes dotfiles, hidden directories (including `.blueprint.json` and `.local/`), and `node_modules`; symbolic links are rejected to prevent assets escaping the project boundary. Remaining files are public site content.

Let the CLI own `.blueprint.json`. Repeated create preserves authored content, identity, `createdWith`, and deployment metadata. Upgrade applies required contract corrections in place without regenerating HTML or styling. Advance `createdWith` only after successful verification; it records the last verified Blueprint contract, not content history.

Use the existing preview and deployment flows, including `--protect`. Publication still requires explicit authorization.
