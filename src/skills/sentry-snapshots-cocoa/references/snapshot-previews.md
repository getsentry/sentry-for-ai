# SnapshotPreviews Details

Use this reference when the project uses Sentry's first-party SnapshotPreviews library and needs SnapshotPreviews-specific metadata, rendering preferences, selective rendering, or troubleshooting.

Wizard setup, target disambiguation, and manual fallback live in `wizard-setup.md`. Shared upload guidance for `sentry-cli`, Fastlane, manifests, and CI lives in `snapshots.md`.

## Metadata and Rendering Preferences

Add `SnapshotPreferences` to the preview-declaring target only when default SnapshotPreviews sidecar metadata is insufficient. See Sentry's SnapshotPreviews metadata docs: https://docs.sentry.io/platforms/apple/snapshots/snapshotpreviews-metadata/

```swift
import SnapshotPreferences

#Preview("Map") {
  MapPreview()
    .snapshotTags(["screen": "map"])
    .snapshotAdditionalContext(["fixture": "city-route"])
}
```

| Modifier | Use when |
|---|---|
| `.snapshotTags([String: String])` | Sentry needs searchable filters beyond defaults. |
| `.snapshotAdditionalContext([String: Any])` | Reviewers need extra sidecar context. |
| `.snapshotDiffThreshold(Float?)` | A deterministic snapshot still has tolerated visual noise. |
| `.snapshotAccessibility(true)` | Need an accessibility-overlay variant on iOS. |
| `.snapshotRenderingMode(.coreAnimation)` | Default renderer is wrong for blur, maps, video, or renderer-sensitive content. |
| `.snapshotExpansion(false)` | Expanded scroll views create unstable or unhelpful images. |

Rules:

- Prefer deterministic previews over thresholds.
- Avoid live network, timers, animations, current-clock dates, locale-dependent data, and real user data.
- Use fixed fixtures and mocked dependencies.

## Selective Rendering

Use for PRs that should render only changed/high-signal SnapshotPreviews while preserving Sentry comparison semantics.

1. Generate the full image-name manifest without rendering:

```bash
TEST_RUNNER_SNAPSHOTS_ALL_IMAGE_NAMES_FILE="$PWD/all-image-names.txt" \
xcodebuild test \
  -scheme MyApp \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

2. Render the subset with `snapshotPreviews()`, `snapshotPreviewModules()`, `excludedSnapshotPreviews()`, `excludedSnapshotPreviewModules()`, or `-only-testing:` while `TEST_RUNNER_SNAPSHOTS_EXPORT_DIR` is set.

3. Upload the rendered subset using the full manifest. Read `snapshots.md` for the upload command and manifest flags.

Rules:

- `TEST_RUNNER_`-prefixed environment variables are forwarded into the app/test process.
- Sharded simulators export into separate subdirectories.
- Sharded manifests must be merged and de-duplicated with `sort -u` before upload.
- Generate the manifest and rendered subset from the same commit.

## GitHub Actions Notes

Do not duplicate workflow templates here.

| CI shape | Read |
|---|---|
| One simulator destination | `github-actions-simple.md` |
| Multiple simulators/device families, parallel rendering, large suites | `github-actions-fanout.md` |

Before writing workflows:

- Verify current runner image, Xcode path, SDKs, and simulator names from existing CI or current runner docs.
- Use `fetch-depth: 0` so `sentry-cli` can resolve base/head commits.
- Prefer existing Fastlane upload lanes when present; upload configuration lives in `snapshots.md`.

## Troubleshooting

| Issue | Fix |
|---|---|
| No generated tests/previews | Confirm previews are loaded by the hosted app/test process, build conditions match, and test target depends on `SnapshottingTests`. |
| Package-only project | Ask for the host app/test target; standalone `swift test` rendering is not supported. |
| Export directory empty | Set `TEST_RUNNER_SNAPSHOTS_EXPORT_DIR`; ensure `TEST_RUNNER_SNAPSHOTS_ALL_IMAGE_NAMES_FILE` is not also set. |
| Manifest mismatch | Regenerate manifest and subset from same commit; merge shard manifests. |
| Image too large | Keep images below 40M pixels; constrain preview layout or use `.snapshotExpansion(false)`. |
| Flaky snapshots | Remove nondeterminism first; then try rendering mode or per-preview diff threshold. |
| Duplicate path warnings | Make display names unique and avoid overlapping shard filters. |
