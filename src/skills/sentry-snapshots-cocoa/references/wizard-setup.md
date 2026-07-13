# SnapshotPreviews Wizard Setup

Use this only when no existing snapshot generator/setup exists and the user explicitly wants Sentry's first-party SnapshotPreviews image source.

## Flow

1. Run the non-interactive wizard first.
2. If the wizard succeeds, continue with the main skill's completion checks.
3. If the wizard stops for a known recoverable reason, follow the matching section below.
4. Use manual fallback only after the wizard is unavailable, rejects `appleSnapshots`, or still cannot complete after requested disambiguation.

## Run the Wizard

Pass the directory that contains the selected `.xcodeproj` and let the wizard auto-detect app targets, hosted XCTest targets, and Swift previews:

```bash
npx @sentry/wizard@latest -i appleSnapshots --non-interactive \
  --xcode-project-dir <path-to-xcode-project-dir>
```

Use `.` when the `.xcodeproj` is in the repository root. Use the parent directory when detection returned a nested bundle path, for example `ios` for `ios/MyApp.xcodeproj`.

## Handle Wizard Outcomes


| Outcome                                                                                        | Action                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wizard completes                                                                               | Continue with the main skill's completion checks.                                                                                                                                                                                         |
| Dirty working tree blocks non-interactive mode                                                 | Inspect `git status --short`. If dirty files are pre-existing or expected for the user's scenario, rerun the same command with `--ignore-git-changes`. Do not clean, stash, or revert user files just to satisfy the wizard safety check. |
| Wizard asks for app target or hosted XCTest target                                             | Follow [Target Disambiguation](#target-disambiguation).                                                                                                                                                                                   |
| Wizard reports no hosted XCTest target                                                         | Follow [Target Disambiguation](#target-disambiguation) to confirm. If no hosted target exists, stop and ask the user to add or identify one.                                                                                              |
| Wizard reports no Swift previews                                                               | Stop and ask whether to add Swift previews or use another snapshot image source. Do not add, restore, or rewrite previews just to make SnapshotPreviews produce images unless the user explicitly approves that source change.            |
| Wizard is unavailable, rejects `appleSnapshots`, or still fails after requested disambiguation | Follow [Manual Fallback](#manual-fallback) only if a hosted XCTest target exists.                                                                                                                                                         |




## Target Disambiguation

Use this only when the wizard asks for target values or reports that no hosted XCTest target was found. Start from the wizard's error output. `--xcode-project-dir` should already be present.

Only gather values the wizard asked for. Probe first; ask the user only if probing cannot identify a safe single target.

| Wizard asks for      | How to investigate                                                              | Add flag                                    |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| App target           | `xcodebuild -list -project <Project>.xcodeproj 2>/dev/null`                     | `--app-target <AppTarget>`                 |
| Hosted XCTest target | `grep -rE "TEST_HOST\|BUNDLE_LOADER" --include='project.pbxproj' . 2>/dev/null` | `--hosted-test-target <HostedTestsTarget>` |

If the wizard asks for multiple values, gather all requested values through probing or user clarification, then rerun once with the complete requested flag set.

```bash
npx @sentry/wizard@latest -i appleSnapshots --non-interactive \
  --xcode-project-dir <path-to-xcode-project-dir> \
  --app-target <AppTarget> \
  --hosted-test-target <HostedTestsTarget>
```

Use only the target flags the wizard requested.

If the hosted-target probe returns no `TEST_HOST` or `BUNDLE_LOADER` entries, stop and ask the user to add a hosted Unit Testing Bundle target for the app or identify an existing hosted test target. Do not use the manual fallback until a hosted XCTest target exists; SnapshotPreviews renders through `xcodebuild test`, and a standalone app target cannot run the generated `SnapshotTest` class.

If the rerun still fails after requested disambiguation, use manual fallback only when a hosted XCTest target exists.

## Manual Fallback

Use this only if the wizard is unavailable, rejects `appleSnapshots`, or cannot complete after disambiguation and the project has a hosted XCTest target. If no hosted XCTest target exists, stop and ask for one first.

1. Add the Swift package to the Xcode project/workspace that builds the app and hosted snapshot test target:

```text
https://github.com/getsentry/SnapshotPreviews
```

1. Link products:

| Product               | Target                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `SnapshottingTests`   | Hosted snapshot/layout XCTest target                                         |
| `SnapshotPreferences` | Preview-declaring target only when custom tags/context/thresholds are needed |
| `PreviewGallery`      | Internal app target only when an in-app preview gallery is requested         |

2. Add or verify one hosted XCTest class importing `SnapshottingTests` and inheriting from `SnapshotTest`.
3. Export images with `TEST_RUNNER_SNAPSHOTS_EXPORT_DIR` and `xcodebuild test`.
4. Upload with `sentry-cli snapshots upload`.

```bash
TEST_RUNNER_SNAPSHOTS_EXPORT_DIR="$PWD/snapshot-images" \
xcodebuild test \
  -scheme MyApp \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -only-testing:MyAppTests/MyAppSnapshotTest

sentry-cli snapshots upload "$PWD/snapshot-images" \
  --org your-org \
  --project your-ios-project \
  --app-id com.example.MyApp
```

Only after non-interactive wizard setup, requested target disambiguation, and manual fallback all fail, tell the user they can run the wizard interactively and return with the error output:

```bash
npx @sentry/wizard@latest -i appleSnapshots --xcode-project-dir <path-to-xcode-project-dir>
```



## Rules

- `--app-id` is a stable app identifier/bundle id, not the Sentry project slug.
- Use `sentry-cli snapshots upload`, not deprecated `sentry-cli build snapshots`.
- SnapshotPreviews test-runner environment variables use the `TEST_RUNNER_` prefix so values are forwarded into the app/test process.
- Base branch uploads the full set.
- PR selective uploads require a full image-name manifest; read `snapshots.md`.

Completion for this route means the wizard completed, or manual fallback completed with the same project changes.