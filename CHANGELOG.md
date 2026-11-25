# Changelog

## [0.1.7] (2026-10-15)

### Features

* **deploy:** add --protect basic-auth gate for published Workers (#22)
* **architecture:** add direct diagram workflow (#23)
* **html:** manage unthemed standalone HTML artifacts (#25)
* **charts:** add authoring toolkit and palette screening (#29)

### Fixes

* **deploy:** enforce preview-safe Worker names (#27)

### Refactors

* **html:** reuse scaffold lifecycle for the html preset (#26)

### Documentation

* **charts:** add copyable dashboard and color binding patterns (#30)
## [0.1.6] (2026-08-07)

### Features

* **presets:** enforce presentation capacity budgets (#17)
* **cli:** resolve bare Artifact names and document terminology (#18)
* **catalog:** add design curation workflow (#19)

### Fixes

* **release:** allow npm publish retry

### Documentation

* **architecture:** add live system boundary diagram (#20)
## [0.1.5] (2026-08-04)

### Features

* **presets:** ship dossier evidence dashboard and distinct prototype-full (#8)
* **dossier:** support adaptive research layouts (#9)
* **slides:** add Reveal.js presentation preset (#10)
* **briefing:** improve portable deck output (#11)
* **briefing:** hash-synced slides, auto preview port, upgrade skill (#12)
* **cli:** interactive project and account selection (#14)

### Fixes

* **deploy:** resolve managed project by name from cwd
* **cli:** separate project selection from worker naming (#15)

### Documentation

* sync usage and prototype guidance (#13)
## [0.1.3] (2026-07-29)

### Features

* **presets:** harden production blueprint output (#7)

### Documentation

* **readme:** add showcase screenshots and agent install prompt
* **readme:** link Mosoo showcase to GitHub repo
## [0.1.2] (2026-07-28)

### Features

* **preview:** route managed Vite projects through pnpm dev (#6)
## [0.1.1] (2026-07-28)

### Features

* **check:** enforce preset contracts for managed projects (#3)

### Fixes

* **deploy:** publish only assets and harden fragment checks (#4)
* **cli:** harden URL checks, preview errors, and archive links (#5)
* **security:** close URL attribute gaps in fragment validation
* **deploy:** reject targets that are not the project entry

### Refactors

* consolidate CLI entry and shared deck styles

### Documentation

* **readme:** document homebrew install path
## [0.1.0] (2026-07-28)

### Features

* introduce blueprint CLI, presets, and bundled skill
* add deploy command for Cloudflare Workers static assets
* add project identity, list command, and deploy recording
* **archive:** add searchable single-file markdown preset (#1)

### Fixes

* **ci:** install packed release from local path

### Refactors

* **skill:** reorganize presets and themes under references (#2)
