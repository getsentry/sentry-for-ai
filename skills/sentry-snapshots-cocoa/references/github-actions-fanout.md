# Fan-out GitHub Actions Workflow for SnapshotPreviews

Use this when a SnapshotPreviews project needs multiple simulator destinations or device families, parallel rendering, matrix execution, or selective/large-suite CI. This is the maintained multi-simulator pattern: build once, render each simulator in parallel with `test-without-building`, export each simulator to its own subdirectory, aggregate artifacts, then upload once.

Do not replace this with a sequential loop of multiple `xcodebuild test` invocations in the simple workflow. Sequential multi-simulator rendering is slower and not the recommended path.

Do not use this template for Point-Free `swift-snapshot-testing` or another existing generator. For `swift-snapshot-testing`, use `github-actions-swift-snapshot-testing.md`; for other generators, preserve the generator and adapt its existing CI/upload path.

This pattern follows the public [EmergeTools HackerNews SnapshotPreviews workflow](https://github.com/EmergeTools/hackernews/blob/main/.github/workflows/ios_sentry_upload_snapshots.yml).

Adapt target names, paths, Xcode version, simulator list, package setup, and Fastlane/CLI upload to the project.

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
  DERIVED_DATA_PATH: ${{ github.workspace }}/DerivedData-snapshot-upload
  SNAPSHOT_UPLOAD_BASE_DIR: ${{ github.workspace }}/snapshot-images
  BUILD_PRODUCTS_ARCHIVE: ${{ github.workspace }}/snapshot-build-products.tar.gz
  XCTESTRUN_FILENAME: MyAppSnapshotTests.xctestrun
  SNAPSHOT_PROJECT: MyApp.xcodeproj
  SNAPSHOT_SCHEME: MyApp
  BUILD_DESTINATION: platform=iOS Simulator,name=iPhone 17 Pro Max,arch=arm64

  # GitHub Actions does not inherit local sentry-cli config.
  # Define SENTRY_AUTH_TOKEN as a repository secret and SENTRY_ORG/SENTRY_PROJECT as repository variables.
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  SENTRY_ORG: ${{ vars.SENTRY_ORG }}
  SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
  SENTRY_APP_ID: com.example.MyApp

jobs:
  build_for_testing:
    runs-on: macos-26

    steps:
      # On PRs, checkout builds the merge candidate; sentry-cli labels uploads from GitHub event head/base SHAs.
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_26.5.app

      - name: Prepare DerivedData directory
        run: mkdir -p "${DERIVED_DATA_PATH}"

      - name: Cache Swift Package Manager
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/org.swift.swiftpm
            ${{ env.DERIVED_DATA_PATH }}/SourcePackages
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: ${{ runner.os }}-spm-

      - name: Build snapshot tests
        run: |
          xcodebuild build-for-testing \
            -project "${SNAPSHOT_PROJECT}" \
            -scheme "${SNAPSHOT_SCHEME}" \
            -sdk iphonesimulator \
            -destination "${BUILD_DESTINATION}" \
            -derivedDataPath "${DERIVED_DATA_PATH}" \
            -resultBundlePath SnapshotBuildForTesting.xcresult \
            -skipPackagePluginValidation \
            ONLY_ACTIVE_ARCH=YES \
            CODE_SIGNING_ALLOWED=NO

      - name: Normalize xctestrun path
        run: |
          XCTESTRUN_SOURCE="$(find "${DERIVED_DATA_PATH}/Build/Products" -name '*.xctestrun' -print -quit)"
          if [ -z "${XCTESTRUN_SOURCE}" ]; then
            echo "No .xctestrun file found under ${DERIVED_DATA_PATH}/Build/Products" >&2
            exit 1
          fi
          cp "${XCTESTRUN_SOURCE}" "${DERIVED_DATA_PATH}/Build/Products/${XCTESTRUN_FILENAME}"

      - name: Archive test products
        run: tar -C "${DERIVED_DATA_PATH}/Build" -czf "${BUILD_PRODUCTS_ARCHIVE}" Products

      - name: Upload build products artifact
        uses: actions/upload-artifact@v7
        with:
          name: snapshot-build-products
          path: ${{ env.BUILD_PRODUCTS_ARCHIVE }}
          if-no-files-found: error

  generate_snapshots:
    runs-on: macos-26
    needs: build_for_testing

    strategy:
      fail-fast: false
      matrix:
        include:
          - simulator_name: iPhone 17 Pro Max
            slug: iphone-17-pro-max
          - simulator_name: iPhone 17e
            slug: iphone-17e
          - simulator_name: iPad Air 11-inch (M4)
            slug: ipad-air-11-inch-m4

    env:
      # Export each simulator to a separate subdirectory. SnapshotPreviews filenames are preview-based,
      # so the same preview rendered on multiple devices would otherwise collide during aggregation.
      TEST_RUNNER_SNAPSHOTS_EXPORT_DIR: ${{ github.workspace }}/snapshot-images/${{ matrix.slug }}

    steps:
      # On PRs, checkout builds the merge candidate; sentry-cli labels uploads from GitHub event head/base SHAs.
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_26.5.app

      - name: Download build products artifact
        uses: actions/download-artifact@v5
        with:
          name: snapshot-build-products
          path: ${{ github.workspace }}

      - name: Extract test products
        run: |
          mkdir -p "${DERIVED_DATA_PATH}/Build"
          tar -C "${DERIVED_DATA_PATH}/Build" -xzf "${BUILD_PRODUCTS_ARCHIVE}"

      - name: Boot simulator
        run: xcrun simctl boot "${{ matrix.simulator_name }}" || true

      - name: Prepare snapshot export directory
        run: mkdir -p "${TEST_RUNNER_SNAPSHOTS_EXPORT_DIR}"

      - name: Generate snapshot images
        run: |
          xcodebuild test-without-building \
            -xctestrun "${DERIVED_DATA_PATH}/Build/Products/${XCTESTRUN_FILENAME}" \
            -destination "platform=iOS Simulator,name=${{ matrix.simulator_name }},arch=arm64" \
            -resultBundlePath "SnapshotResults-${{ matrix.slug }}.xcresult"

      - name: Upload snapshots artifact
        uses: actions/upload-artifact@v7
        with:
          name: snapshots-${{ matrix.slug }}
          path: ${{ env.TEST_RUNNER_SNAPSHOTS_EXPORT_DIR }}
          if-no-files-found: error

  upload_snapshots:
    runs-on: macos-26
    needs: generate_snapshots

    steps:
      # On PRs, checkout builds the merge candidate; sentry-cli labels uploads from GitHub event head/base SHAs.
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Download generated snapshots
        uses: actions/download-artifact@v5
        with:
          path: ${{ env.SNAPSHOT_UPLOAD_BASE_DIR }}
          pattern: snapshots-*

      - name: List aggregated snapshot files
        run: |
          find "${SNAPSHOT_UPLOAD_BASE_DIR}" -type f | sort
          echo "Total PNG images: $(find "${SNAPSHOT_UPLOAD_BASE_DIR}" -type f -name '*.png' | wc -l | tr -d ' ')"

      - name: Install sentry-cli
        run: curl -sL https://sentry.io/get-cli/ | bash

      - name: Upload snapshots to Sentry
        run: |
          sentry-cli snapshots upload "${SNAPSHOT_UPLOAD_BASE_DIR}" \
            --org "${SENTRY_ORG}" \
            --project "${SENTRY_PROJECT}" \
            --app-id "${SENTRY_APP_ID}"
```

For selective PR rendering, add a separate manifest job with `TEST_RUNNER_SNAPSHOTS_ALL_IMAGE_NAMES_FILE`, aggregate all shard manifests with `sort -u`, and pass `--all-image-file-names-file` only for pull-request uploads. Do not add this complexity unless selective testing is actually required.
