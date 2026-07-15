# Sentry Snapshots Upload

Use this reference after an image source has been selected and the project can produce PNG or JPEG snapshots. The image source can be Sentry's first-party SnapshotPreviews, Point-Free `swift-snapshot-testing`, or a custom generator.

This skill integrates generated snapshot images with Sentry's Snapshot service. It does not replace existing third-party generators. If the project already has an image generator, preserve it and upload the images it already produces.

For SnapshotPreviews-specific generation, metadata, and selective rendering mechanics, read `snapshot-previews.md`.

## Image Source Rules

- Preserve the selected image source.
- Point `sentry-cli snapshots upload` or Fastlane at the directory containing generated `.png` or `.jpg`/`.jpeg` files.
- For existing generators, do not run the `appleSnapshots` wizard; it configures Sentry's first-party SnapshotPreviews flow.
- For Point-Free `swift-snapshot-testing`, keep `SnapshotTesting` linked from the XCTest target or package test target that owns `assertSnapshot` calls; do not link it into the app/library target just to satisfy Sentry upload.
- For Point-Free `swift-snapshot-testing`, set `TEST_RUNNER_SNAPSHOT_TESTING_RECORD=all` so CI pushes `SNAPSHOT_TESTING_RECORD=all` into the iOS test runner without hardcoding record mode in tests. This keeps local Xcode diffing normal while CI records images for Sentry to diff as a service.
- For Point-Free `swift-snapshot-testing`, upload the relevant `__Snapshots__/<TestClass>/` directory, and allow the recording test step to continue so upload still runs.
- Add JSON sidecars only when the project needs Sentry display names, tags, custom context, or per-image thresholds. SnapshotPreviews can emit sidecars through its own metadata API; other generators should use Sentry's generic sidecar schema: https://docs.sentry.io/product/snapshots/uploading-snapshots/#json-metadata

## Fastlane Upload

Use when the project already has Fastlane or wants upload logic in `fastlane/Fastfile`.

```ruby
lane :upload_sentry_snapshots do |options|
  sentry_upload_snapshots(
    auth_token: ENV["SENTRY_AUTH_TOKEN"],
    org_slug: "your-org",
    project_slug: "your-ios-project",
    app_id: "com.example.MyApp",
    path: options[:path]
  )
end
```

```bash
bundle exec fastlane ios upload_sentry_snapshots path:"$PWD/snapshot-images"
```

Verify exact `fastlane-plugin-sentry` action parameter names against the installed plugin version before finalizing.

## `sentry-cli` Upload Flags

```bash
sentry-cli snapshots upload "$PWD/snapshot-images" \
  --org your-org \
  --project your-ios-project \
  --app-id com.example.MyApp
```

| Flag | Purpose |
|---|---|
| `--app-id <APP_ID>` | Required stable application identifier; usually bundle id. |
| `--diff-threshold <0.0-1.0>` | Global changed-pixel threshold; prefer per-image sidecar values when available. |
| `--selective` | Marks upload as a subset. Use a manifest when removals/renames must be detected. |
| `--all-image-file-names-file <PATH>` | Full suite image-name manifest; implies `--selective`. |
| `--all-image-file-names <NAMES>` | Inline comma-separated manifest; conflicts with file variant. |
| `--base-sha <SHA>` | Base commit when CI cannot expose a merge base. |

Rules:

- Auth comes from `SENTRY_AUTH_TOKEN` or `--auth-token`.
- PR number without resolvable base SHA fails upload; pass `--base-sha` or check out full history.
- Images above 40 million pixels are rejected.
- Base branch uploads the full snapshot set without selective flags.
- PR subset uploads should include the full image-name manifest so Sentry can detect removals and renames.
- Every uploaded image must appear in the manifest.
- Generate the manifest and rendered subset from the same commit.
- Sharded manifests must be merged and de-duplicated with `sort -u` before upload.
- `--selective` without a manifest cannot detect removals or renames.

## GitHub Actions Notes

Do not duplicate workflow templates here.

| CI shape | Read |
|---|---|
| SnapshotPreviews with one simulator destination | `github-actions-simple.md` |
| SnapshotPreviews with multiple simulators/device families, parallel rendering, large suites | `github-actions-fanout.md` |
| Point-Free `swift-snapshot-testing` | `github-actions-swift-snapshot-testing.md` |
| Other existing generator | Adapt the project's existing CI and upload the generated image directory. |

Before writing workflows:

- Verify current runner image, Xcode path, SDKs, and simulator names from existing CI or current runner docs.
- Use `fetch-depth: 0` so `sentry-cli` can resolve base/head commits.
- Prefer existing Fastlane upload lanes when present.

## Troubleshooting

| Issue | Fix |
|---|---|
| Upload says no images found | Point upload at the directory containing PNGs; hidden files/directories are skipped. |
| Auth failure | Set `SENTRY_AUTH_TOKEN` or `--auth-token`; confirm `--org` and `--project`. |
| PR upload needs base SHA | Check out full history or pass `--base-sha`. |
| Manifest mismatch | Regenerate manifest and subset from same commit; merge shard manifests. |
| Image too large | Keep images below 40M pixels; constrain snapshot layout or renderer output. |
| Flaky snapshots | Remove nondeterminism first; then use generator-specific diff tolerance or Sentry sidecar thresholds. |
| Wrong comparisons in Sentry | Use stable `--app-id`, usually bundle id, not project slug. |
