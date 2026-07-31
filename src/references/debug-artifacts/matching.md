# Artifacts exist but don't match the event

This is a different failure from "nothing was uploaded," and uploading again won't fix it. Something
about *this* event doesn't line up with *those* artifacts. Work the four causes in order — they're
ranked by how often they're the answer.

## 1. The artifacts were uploaded after the event happened

Symbolication happens when the event is processed, not when you open it. An event that arrived before
the upload stays unreadable, and that is correct behaviour rather than a bug to chase.

**Check:** compare the event timestamp to when the upload ran (the release/artifact creation time in
Sentry, or the CI log).
**Fix:** trigger a new event from the current build. If the fix is real, the new event is readable and
the old one stays broken. Don't judge a fix by re-reading the old event.

Native/Apple events are the exception: they can be
[reprocessed](https://docs.sentry.io/product/issues/reprocessing/) to apply debug files uploaded after
the fact — an opt-in step you trigger from the issue, with no equivalent for source maps. It repairs
the old event but proves nothing about the build, so still confirm on a new one.

## 2. The build that uploaded isn't the build that shipped

Any rebuild between upload and deploy invalidates the link — new bundle hashes for JS, a new binary
UUID for native.

**Check:** did the upload run locally while CI produced the deployed artifact? Did a rebuild or a
cached build step run after the upload?
**Fix:** upload from the same job that produces the shipped artifact, before deploy.

## 3. The identifier doesn't match

Which identifier depends on the platform:

| Platform | Identifier | What goes wrong |
|---|---|---|
| JavaScript (modern) | **Debug ID** injected into both the minified file and its map | `sourcemaps upload` ran without `sourcemaps inject`, so there's no Debug ID to match on and it silently falls back to legacy matching |
| JavaScript (legacy) | `release` + `dist` + file path | The `release` in `Sentry.init()` doesn't equal the release the artifacts were uploaded under; or paths don't line up with the URLs frames report |
| Apple | dSYM **UUID** | dSYM belongs to a different compile of the binary |
| Android | mapping **UUID** | Manual upload with a UUID that doesn't match the one in `AndroidManifest.xml` |
| React Native (manual upload) | `release` as `packageName@version+build` | Hand-written `--release` differs from what the SDK reports at runtime |

**Fix for JS:** add `sentry-cli sourcemaps inject` before `upload`, or use the bundler plugin — Debug
IDs remove this entire class of problem. Only fall back to aligning `release`/`dist` if Debug IDs
genuinely aren't available.
**Fix for native:** re-upload the artifacts from the archive that shipped.

## 4. Right artifacts, wrong place

**Check:** the org and project the upload targeted (`SENTRY_ORG` / `SENTRY_PROJECT`) versus the project
the event landed in. A monorepo with several Sentry projects, or a token scoped to one project while
the DSN points at another, produces uploads that succeed into the wrong place.
**Fix:** align the upload's org/project with the DSN's project.

## Where the authority is

The **event's debug-images / processing-errors information in Sentry** — not the build log — tells you
whether Sentry looked for an artifact and whether it found one. A green upload step plus an unreadable
frame means matching, every time. For native, `sentry-cli debug-files` can confirm what Sentry holds
for a given UUID before you rebuild anything.

## If all four check out

Consider that the frames may not be symbolicatable at all: third-party or vendored code with no maps
published, an eval'd or dynamically-generated bundle, a stripped single-file binary, or a platform
whose frames were never minified in the first place. Say so plainly rather than continuing to upload —
"these frames can't be mapped, here's why" is a real answer.
