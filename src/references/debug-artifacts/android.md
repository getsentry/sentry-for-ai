# Debug files — Android (ProGuard/R8, NDK)

Two independent artifact families, and a release build usually needs both:

- **ProGuard/R8 mapping** — undoes name obfuscation in Kotlin/Java frames (`a.b.c()` →
  real names).
- **Native symbols (`.so`)** — symbolicates NDK/C++ frames.
  Only relevant if the app ships native code.

## Path A — the Sentry Gradle plugin (preferred)

The plugin uploads on release builds, so it can’t be forgotten at release time.
The plugin id and the dependency wiring live in `sdks/android/index.md`; the
upload-related options in the `sentry {}` block are:

```groovy
sentry {
    org = "YOUR_ORG_SLUG"
    projectName = "YOUR_PROJECT_SLUG"
    authToken = System.getenv("SENTRY_AUTH_TOKEN")

    // Kotlin/Java deobfuscation
    autoUploadProguardMapping = true

    // Code context next to frames
    includeSourceContext = true
}
```

For an app with native code, also enable native symbol upload (`uploadNativeSymbols`,
plus the matching include-sources option for native).
Check the plugin’s own documentation for the current option names before adding them —
the native options have changed across plugin majors, and a wrong name is silently
ignored rather than failing the build.

`authToken` from `System.getenv` keeps the secret out of the build file.
A gitignored `sentry.properties` also works.

## Path B — the wizard

```
npx @sentry/wizard@latest -i android
```

Interactive, so the **user** runs it.
It handles login, org/project selection, the Gradle plugin, the DSN, and ProGuard/R8
mapping upload.

## Path C — manual `sentry-cli`

For builds the plugin can’t be added to.
The mapping file is produced by R8 at `app/build/outputs/mapping/<variant>/mapping.txt`,
and it must be uploaded with the **UUID that the app reports**, so the plugin path is
strongly preferred — doing this by hand means managing that UUID in
`AndroidManifest.xml` yourself and keeping it in sync with each upload.
Reach for it only when Gradle-plugin adoption is genuinely blocked, and read the current
sentry-cli docs for the exact `debug-files upload` invocation for mappings.

## Traps

| Symptom | Cause | Fix |
| --- | --- | --- |
| Frames still obfuscated after a release build | `autoUploadProguardMapping` not enabled, or minification runs in a variant the plugin doesn’t cover | Enable it; confirm the release variant is the one shipped |
| Debug builds look fine, release doesn’t | Expected — obfuscation only runs for release | Always test symbolication on a release build |
| Kotlin frames readable, native frames not | Only the mapping was uploaded | Enable native symbol upload |
| Nothing uploads, build green | Token unset — see `../auth-token.md` | Add `SENTRY_AUTH_TOKEN` to the build environment |
| Worked, then stopped after a version bump | Plugin option renamed across a major, now silently ignored | Re-check option names against the plugin docs for your version |
| Frames readable, no code context | `includeSourceContext` off | Enable it and re-check a new event |
