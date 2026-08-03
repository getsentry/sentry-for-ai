# Debug files — .NET (Portable PDB)

.NET fails differently from JavaScript and native, and the difference matters for triage: method
names survive. What goes missing is the **file name and line number**. A frame that reads
`MyApp.Services.Checkout.Charge()` with no `Checkout.cs:118` after it is this problem — the trace
isn't unreadable, it's unlocatable. Don't go looking for a minification story that doesn't exist.

The artifact is the **PDB** the build already produces — Portable PDB on modern .NET, supported by
Sentry since 22.11.0 (sentry-cli 2.8.0).

## Path A — MSBuild (preferred)

The Sentry NuGet package bundles sentry-cli and can upload during the build. Both upload properties
default to **`false`**, so a project that installed the SDK and did nothing else uploads nothing —
this is the normal starting state, not a broken config.

```xml
<PropertyGroup Condition="'$(Configuration)' == 'Release'">
  <SentryOrg>YOUR_ORG_SLUG</SentryOrg>
  <SentryProject>YOUR_PROJECT_SLUG</SentryProject>
  <SentryUploadSymbols>true</SentryUploadSymbols>
  <SentryUploadSources>true</SentryUploadSources>
</PropertyGroup>
```

- `SentryUploadSources` is the source-context switch — file/line without it, surrounding code with it.
  Omit it if your source can't leave the build machine.
- Condition on `Release`. An unconditional block uploads on every local Debug build.
- `UseSentryCLI` (default `true`) disables the bundled CLI outright; if something in the build sets it
  to `false`, nothing uploads regardless of the properties above.

The wider property block — release creation and commit association — lives in `sdks/dotnet/index.md`
as ordinary SDK config. This file covers the upload itself.

## Path B — sentry-cli directly

For a publish pipeline that doesn't run the Sentry MSBuild targets:

```bash
sentry-cli debug-files upload --include-sources <path-to-build-output>
```

Same command as every other native platform — to sentry-cli a PDB is just another debug-file format.

## Auth

Don't inline the token in the project file. `SentryAuthToken` exists as an MSBuild property but is
discouraged for exactly that reason.

- **Workstation:** `sentry-cli login` stores credentials in `~/.sentryclirc`.
- **CI:** set `SENTRY_AUTH_TOKEN` from the platform's secret store.
- **Docker:** BuildKit's `--secret`, so the token never persists into an image layer.

Details in [`auth-token.md`](auth-token.md).

## Traps

| Symptom | Cause | Fix |
|---|---|---|
| Method names present, no file/line | Symbols never uploaded — both properties default to `false` | Set `SentryUploadSymbols`; this is the default state, not a misconfiguration |
| File/line present, no surrounding code | `SentryUploadSources` off | Turn it on, then check a **new** event |
| Build log shows no upload and no error | `SentryOrg`/`SentryProject` unset, or `UseSentryCLI=false` | Supply both slugs — the upload is silent when it has nowhere to send |
| No `.pdb` in the build output to upload | `DebugType` is `none`, or `embedded` (which emits no separate file) | Confirm what the build actually produces before debugging the upload |
| Works locally, not on CI | `SENTRY_AUTH_TOKEN` missing from the CI environment | Add it as a CI secret |
