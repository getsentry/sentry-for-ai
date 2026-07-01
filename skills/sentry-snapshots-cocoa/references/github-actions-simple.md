# Simple GitHub Actions Workflow for SnapshotPreviews

Use this when adding Sentry Snapshots CI for a SnapshotPreviews Apple app with one simulator destination. Start here by default for single-device SnapshotPreviews onboarding.

Do not extend this template with sequential loops over multiple simulators. If the user asks for multiple simulator destinations or device families, use `github-actions-fanout.md` instead.

Do not use this template for Point-Free `swift-snapshot-testing` or another existing generator. For `swift-snapshot-testing`, use `github-actions-swift-snapshot-testing.md`; for other generators, preserve the generator and adapt its existing CI/upload path.

For a public production SnapshotPreviews workflow, compare against the [EmergeTools HackerNews fan-out workflow](https://github.com/EmergeTools/hackernews/blob/main/.github/workflows/ios_sentry_upload_snapshots.yml). This simple template intentionally keeps the same upload model but removes matrix fan-out and build-product sharing.

Before adapting this template:

1. Verify the runner image has the required Xcode, SDK, and simulator. Do not guess from memory.
2. Prefer the project's existing shared scheme and single simulator destination.
3. Keep base-branch uploads full. Add selective flags only for selective PR uploads.
4. Use Fastlane instead of direct `sentry-cli` when the project already has a Sentry Fastlane lane.

```yaml
name: Upload iOS snapshots to Sentry

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

env:
  SNAPSHOT_EXPORT_DIR: ${{ github.workspace }}/snapshot-images
  SNAPSHOT_PROJECT: MyApp.xcodeproj
  SNAPSHOT_SCHEME: MyApp
  SNAPSHOT_DESTINATION: platform=iOS Simulator,name=iPhone 17 Pro Max,arch=arm64

  # Define SENTRY_AUTH_TOKEN as a repository secret and SENTRY_ORG/SENTRY_PROJECT as repository variables.
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  SENTRY_ORG: ${{ vars.SENTRY_ORG }}
  SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
  SENTRY_APP_ID: com.example.MyApp
jobs:
  upload_snapshots:
    runs-on: macos-26

    steps:
      # On PRs, checkout builds the merge candidate; sentry-cli labels uploads from GitHub event head/base SHAs.
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_26.5.app

      - name: Resolve Swift packages
        run: |
          xcodebuild -resolvePackageDependencies \
            -project "${SNAPSHOT_PROJECT}" \
            -scheme "${SNAPSHOT_SCHEME}"

      - name: Render snapshots
        env:
          TEST_RUNNER_SNAPSHOTS_EXPORT_DIR: ${{ env.SNAPSHOT_EXPORT_DIR }}
        run: |
          xcodebuild test \
            -project "${SNAPSHOT_PROJECT}" \
            -scheme "${SNAPSHOT_SCHEME}" \
            -sdk iphonesimulator \
            -destination "${SNAPSHOT_DESTINATION}" \
            -skipPackagePluginValidation \
            CODE_SIGNING_ALLOWED=NO

      - name: Install sentry-cli
        run: curl -sL https://sentry.io/get-cli/ | bash

      - name: Upload snapshots to Sentry
        run: |
          sentry-cli snapshots upload "${SNAPSHOT_EXPORT_DIR}" \
            --org "${SENTRY_ORG}" \
            --project "${SENTRY_PROJECT}" \
            --app-id "${SENTRY_APP_ID}"
```

If using Fastlane, replace the install/upload steps with the project's existing Ruby setup and lane, for example:

```yaml
      - name: Upload snapshots to Sentry
        run: bundle exec fastlane ios upload_sentry_snapshots path:"${SNAPSHOT_EXPORT_DIR}"
```
