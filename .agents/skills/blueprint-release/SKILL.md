---
name: blueprint-release
description: Publish and verify a versioned Blueprint application release on GitHub and npm. Use when the user invokes $blueprint-release or asks to release, publish, tag, or ship a concrete Blueprint version such as "release v0.1.3"; owns the version bump, signed release commit, push, annotated tag, GitHub Actions monitoring, and public artifact verification.
---

# Blueprint Release

## Contract

Work only in the Blueprint repository. Publish only the application GitHub Release and `@samzong/blueprint` npm package. Never update Homebrew, deploy to Cloudflare, create a PR, or modify unrelated files.

A request naming a concrete version and asking to release or publish it authorizes the complete workflow: edit the package version, commit, push `main`, create and push the tag, monitor GitHub Actions, and verify both published artifacts. Do not ask for another confirmation.

Keep preparation, readiness, explanation, or validation requests read-only. Require `vX.Y.Z`, `vX.Y.Z-alpha.N`, `vX.Y.Z-beta.N`, or `vX.Y.Z-rc.N` before publishing.
Use nonnegative integers without leading zeros for `X`, `Y`, and `Z`. Start `N` at 1 without leading zeros.
Use alpha for incomplete features, beta for feature-complete testing, and rc when all release gates pass.
Increment the candidate number for each publication. For fixes after a stable release, increment PATCH instead of appending a suffix.
For an accepted candidate, promote its tested content unchanged. Change only required version metadata during promotion.

Stop rather than stash, reset, discard, stage, or commit unrelated user changes. Never delete, replace, or force-move a release tag.

## Inspect Live State

Read `package.json`, `cliff.toml`, `CHANGELOG.md`, `.github/workflows/ci.yml`, and `.github/workflows/release.yml` before acting.
Use `package.json` as the version source. The first workflow job must reject invalid tags and mismatched manifest versions before building or publishing.

Set `TAG` to the requested `v...` value and `VERSION` to the value without `v`.

Set `NPM_TAG` to `alpha`, `beta`, or `rc` for a prerelease. For a stable release, set `NPM_TAG=latest`.
Use git-cliff 2.14.1 to regenerate the changelog.

Then make sure that the live state meets the requirements below:

```bash
git status --short --branch
git fetch origin --tags --prune
gh auth status
gh release list --repo samzong/blueprint --limit 10
git tag --sort=-version:refname | head -20
git ls-remote --tags origin "refs/tags/$TAG"
npm view @samzong/blueprint version
npm view @samzong/blueprint dist-tags --json
npm view @samzong/blueprint versions --json
npm view "@samzong/blueprint@$VERSION" version
```

Require all of these before editing:

- the branch is `main`
- the index and worktree are clean
- local `HEAD` equals `origin/main`
- the requested tag does not exist locally, remotely, or as a GitHub Release
- the requested version returns `E404` from npm
- the requested version has higher SemVer precedence than every published version in its release line
- the package version matches its published GitHub Release and npm version, including a preceding candidate
- commits exist after the latest published release

Review the release delta with `git log` and `git diff --stat` from the latest published tag to `HEAD`. Do not infer current release state from memory.
Compare candidate numbers numerically. If a target used undotted prereleases such as `beta1`, start dotted prereleases with the next target version.
If the workflow and this skill disagree, stop before publication and report the conflict.

## Build the Candidate

Update `package.json` and regenerate `CHANGELOG.md` from Conventional Commits with `cliff.toml`:

```bash
pnpm version "$VERSION" --no-git-tag-version
git cliff --config cliff.toml --tag "$TAG" --ignore-tags='-(alpha|beta|rc)\.' --output CHANGELOG.md
pnpm install --frozen-lockfile
pnpm check
```

Require `blueprint --version` packaging to work before publishing. Pack into a `mktemp -d` directory, install the resulting `samzong-blueprint-$VERSION.tgz` under a temporary prefix, and require its binary to print `blueprint $VERSION`. Remove the temporary directory afterward.

Make sure that the only tracked changes are the expected package version and generated changelog. Run `git diff --check`.
Make sure that the target changelog section contains at least one change entry. Review the generated English notes before publication.
Prerelease tags do not split the target version's notes. Regeneration replaces candidate sections with the complete target version section.
The workflow reads that exact section from `CHANGELOG.md` and rejects notes without change entries.

## Publish

Stage only `package.json` and `CHANGELOG.md`, inspect the staged diff, and create the signed release commit:

```bash
git add -- package.json CHANGELOG.md
git diff --cached
git diff --cached --check
git commit -s -m "chore: release $TAG"
git push origin main
```

Wait for the `CI` workflow associated with the exact release commit SHA. Require success. Before tagging, confirm `origin/main` still points to that SHA.

Create an annotated tag consistent with existing Blueprint releases:

```bash
git tag -a "$TAG" -m "$TAG"
git push origin "$TAG"
```

The tag-triggered `Release` workflow owns GitHub Release creation and npm publication. Do not create either publication separately. Wait for the run whose tag and commit SHA match the candidate, and require both `release` and `publish-npm` to succeed.

If a job fails, inspect its exact failed log. Rerun failed jobs once only when evidence shows a transient infrastructure failure. Otherwise stop and report the blocker.

## Verify the Published Artifact

Use `gh release view` to require a non-draft release for `TAG`.
For a prerelease, require `prerelease=true` and make sure that the release did not become GitHub's latest release.
For a stable release, require `prerelease=false`.
Make sure that the GitHub Release notes match the target section generated from `cliff.toml`.
Download `samzong-blueprint-$VERSION.tgz` into a new temporary directory.

Require `npm view "@samzong/blueprint@$VERSION"` to report the requested version, integrity, and tarball URL. Download the GitHub asset and `npm pack` output into separate subdirectories of the temporary directory, then require their SHA-256 values to match.
Require `npm view @samzong/blueprint dist-tags --json` to map `NPM_TAG` to `VERSION`.
For a prerelease, make sure that npm's `latest` remains equal to its value before publication.

If GitHub publication succeeds but npm publication fails, use the existing `workflow_dispatch` input `tag` after diagnosing the failure.
The recovery path validates the manifest at the existing tag and publishes its GitHub asset to the same npm channel.
Do not recreate the tag or GitHub Release. Do not retry an npm version that already exists.

Install `@samzong/blueprint@$VERSION` from npm under a temporary prefix and require:

```text
blueprint $VERSION
```

Remove temporary files after verification.

## Report

Report the released version, release commit SHA, annotated tag, CI URL, Release workflow URL, GitHub Release URL, npm package URL, npm integrity, matching asset SHA-256, and installed-binary version result.

Claim completion only after the GitHub and npm artifacts match and the registry-installed binary passes verification.
