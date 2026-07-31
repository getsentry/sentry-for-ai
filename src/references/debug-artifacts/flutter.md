# Debug files — Flutter / Dart

Unreadable Dart frames come from **obfuscation**, and the fix is to keep the artifacts that undo it —
the split debug info and the obfuscation map — then upload them with `sentry_dart_plugin`. A Flutter
app that also ships native code needs the platform debug files too.

## Step 1 — Build so the artifacts exist

Obfuscation and debug info are opt-in build flags, and the plugin can only upload what the build wrote:

```bash
# Android
flutter build apk \
  --release \
  --obfuscate \
  --split-debug-info=build/debug-info \
  --extra-gen-snapshot-options=--save-obfuscation-map=build/app/obfuscation.map.json
dart run sentry_dart_plugin

# iOS
flutter build ipa \
  --release \
  --obfuscate \
  --split-debug-info=build/debug-info \
  --extra-gen-snapshot-options=--save-obfuscation-map=build/app/obfuscation.map.json
dart run sentry_dart_plugin

# Web
flutter build web --release --source-maps
dart run sentry_dart_plugin
```

If you are **not** obfuscating, Dart frames are generally readable already and this whole path is
unnecessary — confirm that before adding flags.

## Step 2 — Configure and run `sentry_dart_plugin`

The plugin is configured from `pubspec.yaml` (a `sentry:` section carrying org, project, and the
upload toggles) and reads `SENTRY_AUTH_TOKEN` from the environment. Consult the plugin's own docs for
the current key names before writing that block — they differ across plugin majors, and a
misspelled key is ignored rather than reported.

Run it **after** each build, as shown above. That ordering is the whole contract: the build writes
`build/debug-info` and the obfuscation map, the plugin uploads them.

## Native layers

Flutter apps with native code inherit the platform pipelines: `apple.md` for dSYM,
`android.md` for ProGuard/R8 and NDK symbols. The Dart obfuscation map does not symbolicate a native
crash, and native debug files do not de-obfuscate Dart frames.

## Traps

| Symptom | Cause | Fix |
|---|---|---|
| Dart frames unreadable on release, fine in debug | Release build obfuscates | Build with the flags above and run the plugin |
| Plugin runs, uploads nothing | Build didn't emit debug info — missing `--split-debug-info` / `--obfuscate` | Add the flags; re-run the plugin after the build |
| Uploads happen, frames unchanged | Plugin ran against a different build than the one shipped | Build and upload in the same CI job, in that order |
| Dart frames fixed, native crash still raw addresses | Native debug files not uploaded | Follow `apple.md` / `android.md` |
| Web frames minified | Built without `--source-maps` | Rebuild with it, re-run the plugin |
| Config edits have no effect | Key name wrong for the installed plugin version | Check the plugin docs for your version |
