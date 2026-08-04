# Debug files — Apple (iOS, macOS, tvOS, watchOS, visionOS)

Native crashes arrive as addresses.
Symbolication needs the **dSYM** bundle produced by the build that shipped — a different
dSYM won’t do, because the UUID must match.

## Prerequisite: the build must produce dSYMs

Xcode only emits them when the build setting is right:

- **`DEBUG_INFORMATION_FORMAT`** = `DWARF with dSYM File`. This is the default for
  **Release** only — a Debug-configuration build produces no dSYM, so a crash from it
  can’t be symbolicated this way.
- **`ENABLE_USER_SCRIPT_SANDBOXING`** = `NO`, or an upload build phase can’t read the
  dSYM directory.

## Path A — the wizard (preferred)

```
brew install getsentry/tools/sentry-wizard && sentry-wizard -i ios
```

Interactive (browser login), so the **user** runs it.
It sets up the auth token, the SDK, and the dSYM upload build phase — which is the part
that’s easy to get wrong by hand.

## Path B — an Xcode Run Script build phase

Add a Run Script phase after the compile/archive steps:

```bash
sentry-cli debug-files upload --include-sources "$DWARF_DSYM_FOLDER_PATH"
```

- `$DWARF_DSYM_FOLDER_PATH` is provided by Xcode and points at the dSYMs for this build.
- `--include-sources` bundles source snippets so Sentry can show code context next to
  native frames. Omit it if your source can’t leave the build machine.
- Supply `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` to the phase’s
  environment (or a gitignored `sentry.properties`).
- Add `--force-foreground` while debugging the phase — the upload otherwise backgrounds
  itself and its output can be lost from the build log.

For the phase’s input file list, the per-executable dSYM path is:

```
${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${EXECUTABLE_NAME}
```

## Path C — Fastlane

If the project already uses Fastlane, upload there instead of in Xcode:

```ruby
sentry_debug_files_upload(
  auth_token: ENV["SENTRY_AUTH_TOKEN"],
  org_slug: "your-org",
  project_slug: "your-project",
  include_sources: true
)
```

Self-hosted Sentry: export `SENTRY_URL`, or pass `url:` to the Fastlane action.

## Path D — after the fact, from App Store Connect

When Apple processes the build (or the shipped dSYMs were never uploaded), fetch them
and upload separately.
Fastlane’s `download_dsyms` handles the fetch; then run the same
`sentry-cli debug-files upload` against the downloaded path.

Uploading alone does not change the crash you’re already looking at — symbolication runs
at ingest, so the stored event keeps the frames it was processed with.
Unlike source maps, though, native events can be **reprocessed**: trigger it from the
issue and Sentry re-runs symbolication against the debug files it now has.
Three things to know before you do — wait at least an hour after the upload (the
internal caches must expire first), reprocessed events count against quota a second
time, and issue alerts don’t fire for them.
See [Reprocessing](https://docs.sentry.io/product/issues/reprocessing/).

## Verifying the artifact side

`sentry-cli debug-files` can confirm what Sentry has before you re-run the app.
Sentry’s issue view also lists the debug images an event needed and whether each was
found — that list, not the build log, is the authority on whether the right UUID
arrived.

## Traps

| Symptom | Cause | Fix |
| --- | --- | --- |
| No dSYM anywhere in the build output | Debug configuration, or `DEBUG_INFORMATION_FORMAT` set to DWARF-only | Set `DWARF with dSYM File`; symbolicate release builds |
| Build phase fails reading the dSYM dir | User script sandboxing on | `ENABLE_USER_SCRIPT_SANDBOXING = NO` |
| Uploads succeed, crash still unsymbolicated | UUID mismatch — a rebuild produced a new binary after the upload | Upload from the archive that shipped; don’t rebuild between |
| Frames symbolicated, no source lines | `--include-sources` not used | Add it, re-upload, check a new event |
| Works locally, not on CI/Xcode Cloud | Token or org/project env missing in the CI build environment | Add them as CI secrets |
| Only your code is unsymbolicated; system frames fine | Sentry symbolicates OS frames itself; yours need your dSYM | Nothing about system symbols to fix — chase your own upload |
