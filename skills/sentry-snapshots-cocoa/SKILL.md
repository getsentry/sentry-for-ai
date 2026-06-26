---
name: sentry-snapshots-cocoa
description: Full Sentry Snapshots setup for Apple/Cocoa projects. Use when asked to "setup SnapshotPreviews", "setup Apple snapshot testing", "upload Apple snapshots to Sentry", "setup Apple snapshot GitHub Actions", or "setup Apple selective snapshot testing".
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Sentry Snapshots

# Sentry Snapshots for Apple/Cocoa

## Scope

- Goal: generate Apple snapshot images and upload them to Sentry Snapshots.
- Detect existing snapshot generation first, including Point-Free `swift-snapshot-testing`; preserve it when it already emits or can emit PNGs or JPEGs.
- Use the Sentry Wizard `appleSnapshots` flow only when setting up Sentry's first-party SnapshotPreviews solution.
- Use manual setup only if the wizard is unavailable, cannot resolve targets non-interactively after disambiguation, or fails after explicit disambiguation.
- Package-only SwiftPM: stop and ask for the host app/test target; standalone `swift test` rendering is not supported.

## Detect

Do only enough detection to route before calling the wizard:

```bash
# Manifest/project files to scan for generator signatures
SNAP_FILES=$(find . \( -name Package.swift -o -name Package.resolved -o -path '*/project.pbxproj' \) 2>/dev/null)

# SnapshotPreviews (Sentry first-party) -> prefer wizard / SnapshotPreviews routing
echo "$SNAP_FILES" | xargs grep -lE "SnapshotPreviews" 2>/dev/null

# Point-Free swift-snapshot-testing -> preserve generator, swift-snapshot-testing CI path
echo "$SNAP_FILES" | xargs grep -lE "swift-snapshot-testing|SnapshotTesting|assertSnapshot|__Snapshots__|TEST_RUNNER_SNAPSHOT_TESTING_RECORD" 2>/dev/null

# Required wizard input
find . -name '*.xcodeproj' -print 2>/dev/null | head -20

# Workflow shape
ls fastlane/Fastfile Gemfile 2>/dev/null

# Sentry auth presence only -> never print secret values
for v in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  [ -n "${!v}" ] && echo "$v=set" || echo "$v=unset"
done
```

Record: existing SnapshotPreviews setup, existing snapshot generator/library, output directory if known, Xcode project directory, CI provider, Fastlane, and Sentry auth. For each `.xcodeproj` match, record the containing directory for `--xcode-project-dir`; if `find` prints `./MyApp/MyApp.xcodeproj`, pass `./MyApp`, not the bundle path. Let the wizard detect app targets, hosted XCTest targets, and Swift previews only when no existing generator is present.

## Route

Apply rows top-down. When multiple generators are detected, use the generator the user explicitly named; otherwise prefer SnapshotPreviews as Sentry's first-party snapshot source.

| State | Action |
|---|---|
| User asks for GitHub Actions/CI and SnapshotPreviews exists with one simulator destination | Read `references/github-actions-simple.md`. |
| User asks for GitHub Actions/CI and SnapshotPreviews exists with multiple simulators/device families, matrix, or selective CI | Read `references/github-actions-fanout.md`; read `references/snapshot-previews.md` for selective-rendering mechanics. |
| User asks for GitHub Actions/CI and Point-Free `swift-snapshot-testing` is the selected generator | Preserve generator; read `references/github-actions-swift-snapshot-testing.md` and `references/snapshots.md` for upload behavior. |
| User asks for GitHub Actions/CI and a non-SnapshotPreviews generator exists | Preserve generator; read `references/snapshots.md` for upload behavior and adapt the project's existing CI. |
| User asks for GitHub Actions/CI but no snapshot generator or SnapshotPreviews setup exists | Establish the image source first using the rows below; do not write CI that has nothing to run. |
| SnapshotPreviews already present | Verify export/upload; read `references/snapshot-previews.md` for SnapshotPreviews-specific debugging or advanced options; read `references/snapshots.md` for upload behavior. |
| Existing non-SnapshotPreviews generator/library, including Point-Free `swift-snapshot-testing` | Preserve generator; read `references/snapshots.md` for upload behavior. |
| Package-only SwiftPM with no `.xcodeproj` host app | Stop and ask for the host app/test target; standalone `swift test` rendering is not supported. |
| No hosted XCTest target exists for the selected app target | Stop and ask the user to add or identify a hosted XCTest target before continuing; SnapshotPreviews requires `xcodebuild test` against a hosted test bundle. |
| No existing generator/setup and user wants SnapshotPreviews | Read `references/wizard-setup.md`. |
| Wizard reports no Swift previews | Stop and ask whether to add Swift previews for SnapshotPreviews or identify the intended Sentry Snapshot image source; do not create, restore, or infer previews without explicit user approval. |

## Optional References

| Need | Read |
|---|---|
| First-party SnapshotPreviews setup, disambiguation, or manual fallback | `references/wizard-setup.md` |
| SnapshotPreviews metadata, rendering preferences, selective rendering, or SnapshotPreviews-specific troubleshooting | `references/snapshot-previews.md` |
| Upload any generated snapshot images to Sentry with Fastlane, `sentry-cli`, manifests, CI notes, or upload troubleshooting | `references/snapshots.md` |
| One-destination GitHub Actions workflow | `references/github-actions-simple.md` |
| Multi-destination/fan-out GitHub Actions workflow | `references/github-actions-fanout.md` |
| Point-Free `swift-snapshot-testing` GitHub Actions workflow | `references/github-actions-swift-snapshot-testing.md` |

## Completion Checks

- The selected snapshot image source is documented and preserved or configured according to the route above.
- Snapshot generation appears in the relevant local or CI test logs.
- Export directory contains `.png` files and any generated `.json` sidecars.
- Upload succeeds and prints a Sentry URL or snapshot id.
- Base branch upload is full; selective PR upload includes the full image-name manifest.
