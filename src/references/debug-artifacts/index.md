# Debug artifacts — making stack traces readable

Frames that read `chunk-4f2a.js:1:28471` or `0x00000001045a2f10` cost you the thing
Sentry is for.
Fixing them means uploading the artifact that maps compiled output back to
source. Two families:

- **Source maps** — JavaScript/TypeScript, minified or bundled by a build step.
- **Debug files** — native and mobile: dSYM (Apple), ProGuard/R8 mappings (Android),
  `.so` symbols (NDK), Dart obfuscation maps (Flutter).

This group is read from three directions: while setting Sentry up for the first time (so
real-user traces are readable, not just the local test error), while adding
instrumentation, and when someone arrives with an unreadable trace already in hand.
Start here, route to the platform file.

## First: which failure is it?

Three different problems look identical in a stack trace and have different fixes.
If an event already exists, read it before touching build config.

| What you see | What it means | Go to |
| --- | --- | --- |
| Minified/obfuscated frames, hex addresses, nothing uploaded for this build | No artifacts exist | the platform file below |
| Sentry found artifacts but frames stay unreadable; missing Debug ID or mismatched release/dist | Artifacts don’t match the event | [`matching.md`](matching.md) |
| Some frames readable, others not — often native frames inside an otherwise fine trace | A second artifact family is missing | the platform file for *that* family |
| Readable file/line but no surrounding code shown | Source context wasn’t uploaded (separate from symbolication) | the platform file’s source-context note |
| Method names read fine, but no file names or line numbers | .NET without PDBs — a different failure from minification | [`dotnet.md`](dotnet.md) |

Two facts that change the answer, worth establishing early:

- **Was the event from a release build?** Dev builds are usually readable already —
  don’t send someone after source maps for a local `next dev` trace.
- **Did the upload happen before the event?** Artifacts uploaded afterward do not
  retroactively fix a stored event on their own — confirm any fix on a **new** event.
  The one exception is native/Apple events, which can be
  [reprocessed](https://docs.sentry.io/product/issues/reprocessing/) to apply debug
  files after the fact.
  Source maps have no equivalent.

## Platform routing

| Platform | Family | Read |
| --- | --- | --- |
| Browser, Node, Next.js, React, Svelte, Nest, Cloudflare, TanStack Start, React Router | Source maps | [`javascript.md`](javascript.md) |
| Apple — iOS, macOS, tvOS, watchOS, visionOS | dSYM | [`apple.md`](apple.md) |
| Android — Kotlin/Java, NDK | ProGuard/R8 mapping, `.so` symbols | [`android.md`](android.md) |
| React Native / Expo | **Both** — JS source maps *and* native debug files | [`react-native.md`](react-native.md) |
| Flutter / Dart | Obfuscation map + native debug files (+ web source maps) | [`flutter.md`](flutter.md) |
| .NET — ASP.NET Core, MAUI, WPF, WinForms, Azure Functions | Portable PDB | [`dotnet.md`](dotnet.md) |
| Python, Ruby, PHP, Go, Elixir | Usually none — frames come from readable source | see below |

Every path needs an auth token: [`../auth-token.md`](../auth-token.md).
It is the single most common reason a correct-looking setup uploads nothing.

For the last row, unreadable frames are rarely an artifact problem.
Check that the deployed code matches what you’re reading, that the app isn’t running
from a stripped or packed build (PyInstaller, Go built with `-ldflags "-s -w"`), and
that source context is enabled.
Don’t invent a source-map step for a language that doesn’t have one.

## Where the build-tool config lives

The bundler-plugin options, the Gradle `sentry {}` block, and the wizard invocations are
documented per platform in that platform’s `sdks/<slug>/index.md`, as ordinary SDK
configuration. Use it for the config; use this group for what it doesn’t cover — the
token, artifact matching, native upload mechanics, and CI placement.

## Confirming a fix

Symbolication is proven only by a **new** event from a build that had upload wired in:
build and deploy, trigger a fresh error, then check the frames.
Re-reading the old event will show it still minified, which is correct and not a failure
of the fix — reprocessing, where it’s available, is a separate step you have to ask for.
The loop is in [`setup-verification.md`](../setup-verification.md).
