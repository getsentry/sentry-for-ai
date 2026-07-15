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
# SnapshotPreviews (Sentry first-party) -> prefer wizard / SnapshotPreviews routing
find . \( -name Package.swift -o -name Package.resolved -o -path '*/project.pbxproj' \) -print0 2>/dev/null | xargs -0 grep -lE "SnapshotPreviews" 2>/dev/null

# Point-Free swift-snapshot-testing -> preserve generator, swift-snapshot-testing CI path
find . \( -name Package.swift -o -name Package.resolved -o -path '*/project.pbxproj' \) -print0 2>/dev/null | xargs -0 grep -lE "swift-snapshot-testing|SnapshotTesting|assertSnapshot|__Snapshots__|TEST_RUNNER_SNAPSHOT_TESTING_RECORD" 2>/dev/null

# Required wizard input
find . -name '*.xcodeproj' -print 2>/dev/null | head -20

# Workflow shape
ls fastlane/Fastfile Gemfile 2>/dev/null

# Sentry auth presence only -> never print secret values
[ -n "$SENTRY_AUTH_TOKEN" ] && echo "SENTRY_AUTH_TOKEN=set" || echo "SENTRY_AUTH_TOKEN=unset"
[ -n "$SENTRY_ORG" ] && echo "SENTRY_ORG=set" || echo "SENTRY_ORG=unset"
[ -n "$SENTRY_PROJECT" ] && echo "SENTRY_PROJECT=set" || echo "SENTRY_PROJECT=unset"
```

Record: existing SnapshotPreviews setup, existing snapshot generator/library, output directory if known, Xcode project directory, CI provider, Fastlane, and Sentry auth. For each `.xcodeproj` match, record the containing directory for `--xcode-project-dir`; if `find` prints `./MyApp/MyApp.xcodeproj`, pass `./MyApp`, not the bundle path. Let the wizard detect app targets, hosted XCTest targets, and Swift previews only when no existing generator is present.

## Route

Resolve routing in this order; setup is the primary path and CI is optional follow-up.

1. Select or create the image generator:
   - named generator wins;
   - multiple existing generators with no user choice -> ask;
   - existing non-SnapshotPreviews generator -> preserve it;
   - existing SnapshotPreviews -> use it;
   - no existing generator -> set up SnapshotPreviews by default for Sentry Snapshots or Apple snapshot testing.
2. For SnapshotPreviews, stop before setup/verification/CI if there is no `.xcodeproj` host app or no hosted XCTest target. These stops do not apply when preserving another generator.
3. For setup or verification:
   - existing non-SnapshotPreviews generator -> read `references/snapshots.md`;
   - existing SnapshotPreviews -> read `references/snapshot-previews.md` and `references/snapshots.md`;
   - new SnapshotPreviews setup -> read `references/wizard-setup.md`;
   - wizard reports no Swift previews -> ask before adding previews or choosing another generator.
4. For GitHub Actions/CI only after an image generator exists:
   - Point-Free `swift-snapshot-testing` -> read `references/github-actions-swift-snapshot-testing.md` and `references/snapshots.md`;
   - other non-SnapshotPreviews generator -> read `references/snapshots.md` and adapt existing CI/upload;
   - SnapshotPreviews, one simulator only, no matrix/fanout/selective CI -> read `references/github-actions-simple.md`;
   - SnapshotPreviews with multiple simulators, device families, matrix, or any selective CI -> read `references/github-actions-fanout.md` and `references/snapshot-previews.md`.

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

- The selected snapshot image generator is documented and preserved or configured according to the route above.
- Snapshot generation appears in the relevant local or CI test logs.
- Export directory contains `.png` files and any generated `.json` sidecars.
- Upload succeeds and prints a Sentry URL or snapshot id.
- Base branch upload is full; selective PR upload includes the full image-name manifest.
