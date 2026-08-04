# Release tagging (`release` and `environment` on events)

Tagging every event with the version it came from is the SDK half of releases, and the
half that is pure configuration — one or two `init` options, no CI, no integrations.
It is worth doing as soon as anything ships to production: without it every event is
“unknown release” and regression detection, crash-free rates, and suspect commits have
nothing to attach to.

This file covers the tag itself.
Creating the release *object* — associating commits, finalizing it, recording deploys —
is a CI-side job: [`ci-pipeline.md`](ci-pipeline.md).

## The invariant

**The release name the SDK tags events with must be byte-identical to the name CI
creates the release under.** If they differ by a `v` prefix, a short vs.
full SHA, or a trailing build number, you get two releases: one with commits and a
deploy but no events, and one with events but no commits.
Nothing errors — the features just stay empty.

Pick the name **once**, in one place, and derive both sides from it.
In CI that usually means computing it into an environment variable that the build and
the release step both read.
This matters even if you are only doing the tagging half today: choose a name a future
CI step can reproduce exactly.

## Naming rules

Release names are **global per Sentry organization**, not per project.
Two projects that both ship `1.0.0` will collide into one release, so prefix with
something project-specific (`checkout-api@1.0.0`, not `1.0.0`).

A name cannot:

- contain newlines, tabs, forward slashes (`/`), or backslashes (`\`)
- be entirely `.`, `..`, or a space
- exceed 200 characters

Avoid `1.0.0 (42)` — parentheses are how Sentry *displays* `foo@1.0+2`, so using them in
the name itself errors.

## Two naming strategies

**Semantic versioning** — `package@version` or `package@version+build`, e.g.
`my.project.name@2.3.12+1234`. This is the right choice for anything with a user-facing
version, and required for mobile, where `package` is the bundle/package id, `version` is
`CFBundleShortVersionString` / `versionName`, and `build` is `CFBundleVersion` /
`versionCode`.

**Commit SHA** — the full hash, e.g. `da39a3ee5e6b4b0d3255bfef95601890afd80709`. The
right choice for continuously-deployed services with no meaningful version number.
`sentry-cli releases propose-version` derives it for you.

The choice has a side effect worth knowing: Sentry auto-detects whether a project is
using semver by looking at recent releases, and **regression detection and
`release:latest` sorting behave differently** between semver and SHA/time-based
projects. Don’t switch schemes casually mid-project.

## Getting the name onto events

Tagging events is the SDK’s half.
Most SDKs already produce *some* release name — the table below is as much about knowing
what the default is as about overriding it, because a default you didn’t know about is
exactly what breaks the invariant above.

| Platform | Default when you set nothing | How to set it explicitly |
| --- | --- | --- |
| JavaScript, bundled (`browser`, `react`, `svelte`, `nextjs`, `react-router-framework`, `tanstack-start`, `cloudflare`) | The Sentry bundler plugin detects a name — Cordova, Heroku, AWS CodeBuild, CircleCI, Xcode, and Gradle environments, otherwise the git `HEAD` commit SHA — and **injects** it into the bundle for the SDK to pick up | `release.name` in the bundler plugin options, or `SENTRY_RELEASE` at build time |
| JavaScript, server-side (`node`, `nestjs`) | `SENTRY_RELEASE` from the runtime environment | `release` in `Sentry.init`, or set `SENTRY_RELEASE` where the process runs |
| Python | `SENTRY_RELEASE`, otherwise an inferred git commit SHA | `release="myapp@1.0.0"` in `sentry_sdk.init` |
| Ruby | First match of: `SENTRY_RELEASE`, `KAMAL_VERSION`, git HEAD SHA, a `REVISION` file (Capistrano), `HEROKU_SLUG_COMMIT` | `config.release` |
| Go | `SENTRY_RELEASE` | `Release` in `sentry.ClientOptions` |
| PHP (incl. Laravel, Symfony) | `SENTRY_RELEASE` | `release` in `\Sentry\init([...])`, or the framework’s Sentry config |
| .NET | First match of: `SENTRY_RELEASE`, `AssemblyInformationalVersionAttribute`, `AssemblyVersionAttribute` — the latter two yielding `<assembly-name>@<version>` | `options.Release` |
| Elixir | — | `config :sentry, release: "myapp@1.0.0"` in `config/prod.exs` |
| Android | `packageName@versionName+versionCode`, e.g. `my.project.name@2.3.12+1234` | `io.sentry.release` meta-data in `AndroidManifest.xml`, or `options.release` if initializing manually |
| Apple / Cocoa | `CFBundleIdentifier@CFBundleShortVersionString+CFBundleVersion` | `options.releaseName` |
| Flutter / Dart | `name@version` from `pubspec.yaml`; on Android and iOS `packageName@versionName+versionCode` | `options.release`; on Flutter Web pass `SENTRY_RELEASE` via `--dart-define` |
| React Native | The app version and build number from the native project | `release` **and** `dist` in `Sentry.init` — read the warning below |

Two traps in that table:

- **Don’t set `release` in `Sentry.init` when a Sentry bundler plugin is in the build.**
  The plugin injects its own value; a hardcoded `init` release silently wins over it and
  drifts from the release CI created.
  Change `release.name` in the plugin options instead.
- **React Native:** setting a custom `release`/`dist` **disables the automatic source
  map upload script**, which only recognizes the default values.
  You then have to upload source maps manually — using the React Native source map
  procedure. Prefer leaving the defaults alone on React Native unless you have a reason.

The platform’s own SDK reference has the surrounding `init` and build-plugin
configuration if you need to see where these options sit.

## `dist` — the second half of mobile identity

`dist` disambiguates multiple builds of the same release: same `1.0.0`, build `51` vs
`52`. It matters on iOS, Android, and React Native, where the store version stays put
across builds, and it must match between the SDK and any artifact upload for that build.
Server-side platforms can ignore it.

## Environment

`environment` is a separate tag (`environment` option, or `SENTRY_ENVIRONMENT`) and
releases need it to be useful: it’s what keeps staging crashes out of production
crash-free rates, and a deploy is always recorded *into* an environment.
Set it alongside the release, not later.

## Release health needs sessions

Crash-free rate and adoption come from **session** data, not errors, so they only appear
if the SDK sends sessions.
Session tracking is on by default in most modern SDKs.
Release health is supported on Android, Apple, Flutter/Dart, browser and Node
JavaScript, React Native, .NET, PHP, and Python; it is not available on every platform,
so don’t promise the graphs before checking the platform.

## When the tag isn’t enough

Tagging alone gets you release-scoped filtering, regression detection, and (where
supported) release health.
It does **not** get you commits on the release, deploy tracking, suspect commits, or
`Fixes PROJECT-NAME-12A` resolution — those need a release created in CI with its
commits associated ([`ci-pipeline.md`](ci-pipeline.md)) and, for suspect commits, an SCM
integration ([`suspect-commits.md`](suspect-commits.md)). Flag that as the natural
follow-up rather than implying the tag finished the job.

## Related

- [`../search-query-language.md`](../search-query-language.md) — `release`,
  `firstRelease`, `release.stage`.
