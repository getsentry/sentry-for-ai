# GitHub Actions Workflow for Point-Free swift-snapshot-testing

Use this when a project already uses Point-Free `swift-snapshot-testing` and the user wants GitHub Actions/CI upload to Sentry Snapshots. Do not run the `appleSnapshots` wizard or use the SnapshotPreviews workflow templates for this path.

This pattern follows the public [EmergeTools HackerNews workflow](https://github.com/EmergeTools/hackernews/blob/main/.github/workflows/ios_sentry_upload_swift_snapshots.yml). Run the existing XCTest suite in record mode, allow the recording step to fail because `swift-snapshot-testing` treats recording as test failures, then upload the generated `__Snapshots__` directory to Sentry.

Before adapting this template:

1. Locate the test target/class that owns the `assertSnapshot` calls.
2. Confirm the generated `__Snapshots__/<TestClass>/` path.
3. Prefer the project's existing Ruby/Fastlane setup if it already uploads snapshots.
4. Keep local test behavior unchanged; set record mode only in CI through the environment.

```yaml
name: Upload iOS swift-snapshot-testing snapshots to Sentry

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

env:
  SNAPSHOT_PROJECT: MyApp.xcodeproj
  SNAPSHOT_SCHEME: MyApp
  SNAPSHOT_DESTINATION: platform=iOS Simulator,name=iPhone 17 Pro Max,arch=arm64
  SNAPSHOT_TEST_IDENTIFIER: MyAppTests/MyAppSnapshotTest
  SNAPSHOT_OUTPUT_DIR: MyAppTests/__Snapshots__/MyAppSnapshotTest

  # Define SENTRY_AUTH_TOKEN as a repository secret and SENTRY_ORG/SENTRY_PROJECT as repository variables.
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  SENTRY_ORG: ${{ vars.SENTRY_ORG }}
  SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
  SENTRY_APP_ID: com.example.MyApp.swift-snapshot-testing

jobs:
  upload_swift_snapshots:
    runs-on: macos-26

    env:
      # Propagates SNAPSHOT_TESTING_RECORD=all into the iOS test runner.
      TEST_RUNNER_SNAPSHOT_TESTING_RECORD: all

    steps:
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

      - name: Boot simulator
        run: xcrun simctl boot "iPhone 17 Pro Max" || true

      - name: Generate snapshot images
        continue-on-error: true
        run: |
          xcodebuild test \
            -project "${SNAPSHOT_PROJECT}" \
            -scheme "${SNAPSHOT_SCHEME}" \
            -sdk iphonesimulator \
            -destination "${SNAPSHOT_DESTINATION}" \
            -only-testing:"${SNAPSHOT_TEST_IDENTIFIER}" \
            -resultBundlePath SnapshotResults-swift-snapshots.xcresult \
            -skipPackagePluginValidation \
            CODE_SIGNING_ALLOWED=NO

      - name: List generated images
        run: |
          find "${SNAPSHOT_OUTPUT_DIR}" -type f | sort
          echo "Total PNG images: $(find "${SNAPSHOT_OUTPUT_DIR}" -type f -name '*.png' | wc -l | tr -d ' ')"

      - name: Install sentry-cli
        run: curl -sL https://sentry.io/get-cli/ | bash

      - name: Upload snapshots to Sentry
        run: |
          sentry-cli snapshots upload "${SNAPSHOT_OUTPUT_DIR}" \
            --org "${SENTRY_ORG}" \
            --project "${SENTRY_PROJECT}" \
            --app-id "${SENTRY_APP_ID}"
```

If using Fastlane, replace the install/upload steps with the project's existing lane, for example:

```yaml
      - name: Upload snapshots to Sentry
        run: bundle exec fastlane ios upload_sentry_snapshots_swift_snapshot_testing
```

Rules:

- Use `TEST_RUNNER_SNAPSHOT_TESTING_RECORD=all`, not `SNAPSHOT_TESTING_RECORD=all`, so the value reaches the iOS test runner.
- Keep `continue-on-error: true` on the recording test step; otherwise recording failures prevent upload.
- Upload the generated `__Snapshots__` directory that contains PNG images.
- Use a stable `--app-id`. If the same app also uploads SnapshotPreviews images, give this generator a distinct app id to avoid mixing baselines.
