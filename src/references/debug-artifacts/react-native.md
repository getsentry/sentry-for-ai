# Source maps + debug files — React Native / Expo

React Native is the one platform where **four** artifacts matter, and fixing one family leaves the
other broken. A JS error and a native crash from the same app symbolicate through different pipelines.

| Layer | Artifact | Produced during |
|---|---|---|
| iOS — JS | Source maps (`.map`; Hermes emits `.hbc.map`) | Xcode build |
| iOS — native | dSYM bundles | Xcode archive / Xcode Cloud |
| Android — JS | Source maps (+ Hermes bytecode map) | Gradle build |
| Android — native | ProGuard/R8 mapping, NDK `.so` symbols | Gradle build |

Decide up front which layer the unreadable frames are in: a JS stack (`.tsx`, `bundle`) is the source-map
path; a native stack (addresses, ObjC/Java symbols) is the debug-file path.

## Expo — automatic

The `@sentry/react-native/expo` config plugin wires the upload hooks into native builds. Maps upload
during `eas build` and during local release builds, as long as the token is in the environment:

```bash
SENTRY_AUTH_TOKEN=<token> npx expo run:ios --configuration Release
```

For EAS, put `SENTRY_AUTH_TOKEN` in EAS secrets — an EAS build cannot see your local env file.

## Bare React Native — the wizard

```
npx @sentry/wizard@latest -i reactNative
```

Interactive, so the **user** runs it. This is the path to prefer: it patches the Xcode bundle-and-upload
build phase *and* the Gradle side, which is exactly the wiring that's error-prone by hand. Verify
afterward that both platforms were patched — the wizard can succeed on one and skip the other if a
project layout is unusual.

## Bare React Native — manual JS upload

When the build hooks can't be used:

```bash
npx sentry-cli sourcemaps upload \
  --org YOUR_ORG \
  --project YOUR_PROJECT \
  --release "my-app@1.0.0+1" \
  ./dist
```

The release name must match what the SDK reports at runtime (`packageName@version+build`), or the
upload won't attach to events. Prefer the build-hook path precisely because it derives that value for you.

## Native side

The native halves are the same procedures as the standalone platforms — `apple.md` for dSYM upload,
`android.md` for ProGuard/R8 and NDK symbols. The RN build hooks handle these too when the wizard has
wired them; the standalone references are what you need when uploading after the fact or from CI.

## Traps

| Symptom | Cause | Fix |
|---|---|---|
| JS frames readable, native crash isn't (or vice versa) | Only one artifact family is wired | Do the other layer — this is the default RN failure |
| Frames show Hermes bytecode offsets | Hermes map not uploaded | Ensure the build hook runs for the Hermes output, not just the plain bundle |
| Works on `expo run:ios`, not on EAS | Token in local env only | Add it to EAS secrets |
| Upload succeeds, frames unchanged | Manual upload's `--release` doesn't match the runtime release/dist | Use the build hooks, or align the release name exactly |
| Only Android fixed after the wizard | Wizard patched one platform | Re-run and confirm both the Xcode phase and the Gradle wiring exist |
| Dev-build frames unreadable | Metro dev bundles don't need upload | Test on a release build instead |
