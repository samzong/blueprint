---
name: blueprint-release
description: Publish and verify a versioned Blueprint application release on GitHub and npm. Use when the user invokes $blueprint-release or asks to release, publish, tag, or ship a concrete Blueprint version such as "release v0.1.3"; owns the version bump, signed release commit, push, annotated tag, GitHub Actions monitoring, and public artifact verification.
---

# Blueprint Release

## Contract

Work only in the Blueprint repository. Publish only the application GitHub Release and `@samzong/blueprint` npm package. Never update Homebrew, deploy to Cloudflare, create a PR, or modify unrelated files.

A request naming a concrete version and asking to release or publish it authorizes the complete workflow: edit the package version, commit, push `main`, create and push the tag, monitor GitHub Actions, and verify both published artifacts. Do not ask for another confirmation.

Keep preparation, readiness, explanation, or validation requests read-only. Require a target matching `v<major>.<minor>.<patch>` before publishing.

Stop rather than stash, reset, discard, stage, or commit unrelated user changes. Never delete, replace, or force-move a release tag.

## Inspect Live State

Read `package.json`, `.github/workflows/ci.yml`, and `.github/workflows/release.yml` before acting. Trust them over this skill if the repository release contract has changed.

Set `TAG` to the requested `v...` value and `VERSION` to the value without `v`.

Then verify:

```bash
git status --short --branch
git fetch origin --tags --prune
gh auth status
gh release list --repo samzong/blueprint --limit 10
git tag --sort=-version:refname | head -20
git ls-remote --tags origin "refs/tags/$TAG"
npm view @samzong/blueprint version
npm view "@samzong/blueprint@$VERSION" version
```

Require all of these before editing:

- the branch is `main`
- the index and worktree are clean
- local `HEAD` equals `origin/main`
- the requested tag does not exist locally, remotely, or as a GitHub Release
- the requested version returns `E404` from npm
- the requested version is greater than the latest GitHub and npm versions
- the package version equals the latest GitHub and npm versions
- commits exist after the latest published release

Review the release delta with `git log` and `git diff --stat` from the latest published tag to `HEAD`. Do not infer current release state from memory.

## Build the Candidate

Update only `package.json`:

```bash
pnpm version "$VERSION" --no-git-tag-version
pnpm install --frozen-lockfile
pnpm check
```

Require `blueprint --version` packaging to work before publishing. Pack into a `mktemp -d` directory, install the resulting `samzong-blueprint-$VERSION.tgz` under a temporary prefix, and require its binary to print `blueprint $VERSION`. Remove the temporary directory afterward.

Confirm the only tracked change is the expected `package.json` version line. Run `git diff --check`.

## Publish

Stage only `package.json`, inspect the staged diff, and create the signed release commit:

```bash
git add -- package.json
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

Use `gh release view` to require a non-draft, non-prerelease release for `TAG`. Download `samzong-blueprint-$VERSION.tgz` into a new temporary directory.

Require `npm view "@samzong/blueprint@$VERSION"` to report the requested version, integrity, and tarball URL. Download the GitHub asset and `npm pack` output into separate subdirectories of the temporary directory, then require their SHA-256 values to match.

Install `@samzong/blueprint@$VERSION` from npm under a temporary prefix and require:

```text
blueprint $VERSION
```

Remove temporary files after verification.

## Report

Report the released version, release commit SHA, annotated tag, CI URL, Release workflow URL, GitHub Release URL, npm package URL, npm integrity, matching asset SHA-256, and installed-binary version result.

Claim completion only after the GitHub and npm artifacts match and the registry-installed binary passes verification.
