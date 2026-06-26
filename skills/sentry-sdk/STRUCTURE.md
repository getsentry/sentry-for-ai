> [!WARNING]
> THIS IS AN INTERNAL DOCUMENT. It is not relevant to using the skill — it exists only for the
> development and maintenance of the SDK references. Skip it during normal skill use.

# `references/[sdk]/` structure

This document is the contract every SDK reference tree must follow. It exists so that all 19 SDKs
read the same way and a router (or an agent) can predict exactly where a given piece of information
lives. When you add or edit an SDK reference, conform to this — don't invent a per-SDK shape.

## Directory layout

Each SDK gets one directory under `references/`, named by its **slug** (the `SDK slug` column in
[`SKILL.md`](./SKILL.md) — lowercase, no `sentry-` prefix, no `-sdk` suffix, e.g. `nextjs`,
`react-native`):

    references/[sdk]/
      index.md                  # required — overview, detect, install, init, feature catalog
      error-monitoring.md       # required — every SDK supports it
      tracing.md                # one file per SUPPORTED canonical signal
      logging.md
      profiling.md
      metrics.md
      crons.md
      session-replay.md
      user-feedback.md
      ai-monitoring.md
      <extension>.md            # optional — platform-specific topics (see below)

Create a signal file **only if the SDK supports that signal.** Unsupported signals are not files —
they are listed in `index.md`'s catalog table marked as not available (see below).

## The WHAT vs HOW rule

These references are the **HOW** — install commands, `init` options, and the code to wire up a
signal on this platform. They are **not** the place for strategy.

- Best practices, when-to-use, sampling philosophy, naming conventions, and pitfalls →
  the platform-agnostic concept skills (`sentry-tracing`, `sentry-logging`, `sentry-metrics`,
  `sentry-crons`, `sentry-profiling`, `sentry-session-replay`, `sentry-user-feedback`).
- Every signal file **must link to its concept skill** at the top for the WHAT/WHY, then get on
  with the HOW.
- Genuinely platform-specific guidance (e.g. "Celery needs dual-process init", "ProGuard mappings
  must be uploaded for readable native frames") *does* belong here — it is HOW, not generic
  strategy.

If you find yourself writing a paragraph that would be true on every platform, it belongs in the
concept skill, not here.

## Canonical signals

This is the fixed, ordered set. Use these exact filenames and section titles. Order matters: it is
the order the catalog table and any walkthrough should follow.

| Order | Signal title | Filename | Notes |
|---|---|---|---|
| 1 | Error Monitoring | `error-monitoring.md` | Always supported. The baseline. |
| 2 | Tracing & Performance | `tracing.md` | |
| 3 | Logging | `logging.md` | |
| 4 | Profiling | `profiling.md` | Requires tracing. |
| 5 | Metrics | `metrics.md` | |
| 6 | Cron Monitoring | `crons.md` | Server/scheduled-job platforms. |
| 7 | Session Replay | `session-replay.md` | Browser and mobile only. |
| 8 | User Feedback | `user-feedback.md` | |
| 9 | AI / LLM Monitoring | `ai-monitoring.md` | Platforms with LLM-SDK auto-instrumentation. |

Do not add a canonical signal without updating this table and the overview in `SKILL.md`.

## Platform-extension files

Topics that aren't one of the canonical signals but are specific to a platform get their own file
with a descriptive slug, linked from `index.md`. Examples already in the tree:

- `integrations.md` / `ecosystem-integrations.md` (Android, Flutter)
- `laravel.md`, `symfony.md` (PHP)
- `durable-objects.md` (Cloudflare)
- `react-features.md`, `react-router-framework-features.md`, `tanstackstart-features.md`
- `expo-config-plugin.md` (React Native)
- `migration.md` (Ruby)

Keep these focused. If an extension grows to cover a canonical signal, move that content into the
signal file and cross-link.

## `index.md` format

The front door for an SDK. An agent reads this first, every time. Sections, in order:

1. **Title** — `# Sentry <Platform> SDK`

2. **What this SDK applies to** — the scope of the SDK so an agent (or user) can confirm it is the
   right one before going further: the runtimes/languages it covers, the frameworks and libraries it
   supports, the package name(s) it ships as, and when to pick a sibling SDK instead (e.g. "use
   `nextjs` for Next.js apps, not this"). A link to the platform's docs
   (`https://docs.sentry.io/platforms/<...>/`) and a version note ("reflects SDK x.y at time of
   writing; verify against the docs") belong here. **If the SDK has more than one target**
   (multiple runtimes, platforms, or tooling variants — see "Multi-target SDKs" below), enumerate
   them here by name; everything downstream (feature catalog, setup subsections, signal files)
   refers back to these names.

3. **Confirm & inspect** — by the time this file is open the platform has already been picked from
   `SKILL.md`'s catalog, so this is not first-pass detection. It serves two jobs: (a) *confirm this
   is the right reference* — quick checks that the project really matches this SDK, and a pointer to
   the sibling SDK if it doesn't (e.g. "found `@nestjs/core` → use `nestjs` instead"); and (b)
   *inspect the specifics* that change the setup — which framework/variant, task queue, AI libs,
   existing Sentry install, companion frontend/backend — with the shell commands to find each and
   what the finding implies.

4. **Recommend** — a concrete proposal, not open questions. A recommendation matrix mapping each
   feature to "recommend when…" and its reference file. **This step is scope-specific: it runs only
   on the full-setup entry.** Under first-error scope the agent installs error monitoring only and
   skips this; under add-a-signal scope the signal is already chosen, so there is nothing to
   recommend (see the scope list in [`SKILL.md`](./SKILL.md)). Write the matrix so it is easy to
   skip — it must not be a prerequisite for reading an individual signal file.

5. **Installation** — how to add the SDK as a project dependency: the package name(s), the
   package-manager command(s) for that ecosystem (npm/pnpm/yarn, pip, gem, go get, NuGet, Gradle,
   CocoaPods/SPM, etc.), where the dependency is declared (the manifest file), and any
   framework-specific extras. This covers *only* getting the package installed and resolvable —
   wiring up `init` is the next section.

6. **Quick Start `init`** — the recommended initialization snippet with sensible defaults and where
   it must be placed. This is the minimal-but-good starting point; deeper per-signal config lives in
   the signal files.

7. **Where to initialize** — guidance on *where and when* `init` should run for this platform, and
   why placement matters. This is best-practice prose: e.g. "must run before any other import,"
   "before the app/server is created," "at the entry point and again in each worker process." Cover
   the common cases inline. Deep, framework-specific placement (a framework with its own bootstrap,
   config file, or lifecycle hook) belongs in that framework's extension file (`laravel.md`,
   `symfony.md`, etc.) — keep `index.md` to the platform-wide rule and link out to the extension
   for the specifics.

8. **Feature catalog** — the table linking every canonical signal to its file or marking it
   unsupported (see next section). This is the routing hub.

9. **Configuration Reference** — key `init` options and environment variables in a table.

10. **Platform considerations** — call out the things unique to this platform/language
    that an agent must handle for Sentry to actually work well — the gotchas that are obvious to a
    platform expert but easy for an agent to miss. The most common are the steps needed for a
    *readable* event, which also feed `sentry-verify-instrumentation`:

    - **JavaScript/TypeScript** — source maps must be configured or stack traces stay minified.
    - **Native / mobile** (Apple, Android, NDK) — debug symbols must be uploaded (dSYM, ProGuard/R8
      mappings, etc.) or frames stay unsymbolicated.

    These are only *examples*. Generalize: think about whatever this platform needs that the others
    don't — build/bundler steps, release/dist matching, environment or runtime quirks, required
    permissions, init ordering constraints, packaging/deploy steps, and so on. List each with what
    happens if it is skipped. Do not omit this section just because a platform "seems
    straightforward" — if there is genuinely nothing, say so explicitly.

11. **Cross-link** — companion projects to suggest (e.g. a backend SDK for a frontend install).

12. **Troubleshooting** — a symptom → solution table.

### The feature catalog table

`index.md` lists **all** canonical signals so coverage is explicit. The `Status` column takes one
of three forms:

- **`Supported`** — available on every target this SDK covers; link the signal to its file.
- **`Supported — <targets> only`** — available on *some* targets but not all (common for
  multi-platform SDKs); still link to the file, and name the targets that have it.
- **`Not available — <reason>`** — unsupported everywhere; do not link (there is no file).

    ## Features

    | Signal | Status |
    |---|---|
    | [Error Monitoring](./error-monitoring.md) | Supported |
    | [Tracing & Performance](./tracing.md) | Supported |
    | [Logging](./logging.md) | Supported |
    | [Profiling](./profiling.md) | Supported — iOS, macOS only |
    | [Metrics](./metrics.md) | Supported |
    | [Session Replay](./session-replay.md) | Supported — iOS, Android only |
    | User Feedback | Not available — no widget on this platform |
    | Cron Monitoring | Not available — no scheduler runtime |
    | AI / LLM Monitoring | Not available — no auto-instrumentation yet |

Use the target names exactly as the SDK enumerates its targets, so the catalog, the signal files,
and the per-target setup sections all speak the same vocabulary.

List platform-extension files in a separate row group or a short list under the table.

### Multi-target SDKs

Some SDKs cover more than one **target** — multiple runtimes (`node`: Node/Bun/Deno), platforms
(`cocoa`: iOS/macOS/tvOS/watchOS/visionOS), or tooling variants (`react-native`: Expo-managed /
bare / vanilla). One slug still maps to one `index.md`; the target axis is handled *inside* it, not
by forking the skill. Two rules:

- **Enumerate targets once**, in *What this SDK applies to*, and reuse those exact names everywhere
  (feature catalog, setup subsections, signal files' target-scope lines).

- **Tier by how much actually diverges — subsections for varied steps, an extension file for a
  varied flow:**
  - *Minor divergence* — the same `init`, differing only in install/build/packaging or a few
    placement details (e.g. Apple OSes, most Flutter platforms). Keep everything in `index.md` and
    use labeled `### <target>` subsections inside the sections that vary: Installation, Quick Start
    `init`, Where to initialize, and Platform considerations.
  - *Major divergence* — a whole distinct setup flow or toolchain for one target (e.g. React
    Native's Expo config-plugin path, a Dart-only non-Flutter path). Give that target its own
    **platform-extension file** and route to it from `index.md`; keep the shared path in `index.md`
    so the common case stays linear.

Per-target *feature availability* is a separate axis covered by the feature catalog's
`Supported — <targets> only` status and a signal file's target-scope line (above).

## Signal-file format

Every canonical signal file (`tracing.md`, `logging.md`, …) follows the same shape:

1. **Title** — `# <Signal title> — <Platform>` (e.g. `# Tracing & Performance — Python`).
2. **Concept link** — one line: "For when-to-use, sampling strategy, and best practices see
   [`sentry-tracing`](../../../sentry-tracing/SKILL.md)." Then state this file is the HOW.
3. **Target scope** — *only when the signal is not available on every target.* One line right after
   the concept link naming where it applies, e.g. "Applies to: iOS, Android." Use the same target
   names as the feature catalog. Omit this line when the signal works on all of the SDK's targets.
4. **Setup** — the minimal config/code to turn the signal on, building on the `index.md` `init`.
   Show exactly what to add and where.
   - **Single path (the default):** one `## Basic setup` section.
   - **Mutually-exclusive paths:** when a signal can be wired up in genuinely different,
     non-combinable ways (e.g. native tracing vs an OpenTelemetry/OTLP path), drop the single
     `## Basic setup` and instead lead with a short **"Which path"** selector — HOW-level routing
     only ("already using OpenTelemetry? use the OTLP path"; the deeper *why* stays in the concept
     skill) — followed by one `## Setup: <Path>` section per path (e.g. `## Setup: Native`,
     `## Setup: OpenTelemetry (OTLP)`).
   - When setup differs by target rather than by path, note the per-target difference here (a short
     `### <target>` subsection or an inline note) rather than leaving the reader to guess.
5. **Additional sections as needed** — `## Custom spans`, `## Sampling`, framework specifics, etc.
   Only what is platform-specific; defer strategy to the concept skill.
6. **Verification** — `## Verification`. A copy-pasteable snippet that *produces this signal*
   (a span, a log line, a metric, a forced replay) so the agent can confirm it lands. This feeds
   `sentry-verify-instrumentation`, which owns the MCP poll/confirm loop — this section only
   provides the trigger and what to expect in Sentry. When the signal has multiple setup paths, share
   one Verification if the produced signal looks the same, or give one per path when they differ.

Keep relative links correct: signal files are one level below `index.md`, so concept skills are
`../../../<concept>/SKILL.md` and sibling signal files are `./<other>.md`.
