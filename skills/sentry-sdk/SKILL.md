---
name: sentry-sdk
description: Set up and instrument Sentry in any language or framework. Detects the platform, then loads a bundled per-SDK reference for error monitoring, tracing, logging, profiling, metrics, crons, session replay, user feedback, and AI monitoring. Use when asked to add Sentry, install an SDK, or add a signal to an existing Sentry install.
license: Apache-2.0
role: router
category: sdk-setup
---

> [All Skills](../../SKILL_TREE.md)

# Sentry SDK

The single HOW for instrumenting Sentry on any platform. This skill carries one bundled
reference tree per SDK under `references/[sdk]/` — an `index.md` plus a file per signal. It is the
mechanics layer: install, `init`, and the code for each capability. The strategy layer (when to
reach for a signal, sampling, naming, pitfalls) lives in the platform-agnostic concept skills
(`sentry-tracing`, `sentry-logging`, …) and is linked from each reference.

Callers land here with different **scope** — the scope decides how much of a reference you act on:

- **First-error setup** (`sentry-sdk-setup` flow / `/sentry-get-started`) → enter scoped to
  **error monitoring only**: install + `init` + a first event. Defer every other signal. **Skip the
  reference's recommendation step** — don't propose tracing/logging/etc. yet.
- **Add a signal** (`sentry-add-signal`) → the concept skill explains the WHAT/WHY, then jump
  straight to that one signal's reference file here for the HOW. The signal is already chosen, so
  there is nothing to recommend.
- **Full setup** (the user explicitly asks to "set up Sentry properly / with sensible defaults") →
  this is the only scope that runs the reference's recommendation step, which proposes a default set
  of signals from what the project actually uses.

When in doubt, default to **first-error** — don't over-instrument upfront.

## What Sentry can capture

A quick orientation so you know which reference to open. These are *what the features are*, not how
to set them up — the per-signal concept skills go deeper.

| Signal | What it is |
|---|---|
| **Error Monitoring** | Unhandled exceptions and crashes, grouped into issues with stack traces, breadcrumbs, and context. The baseline — always set up first. |
| **Tracing & Performance** | Distributed traces and spans across services and requests, showing where time goes and how a request flows end to end. |
| **Profiling** | Function-level CPU/wall-clock samples tied to traces — which lines are slow. Requires tracing. |
| **Logging** | Structured application logs sent to Sentry and correlated with errors and traces. |
| **Metrics** | Counters, gauges, and distributions for operational metrics — request rates, queue depths, cache hit ratios, and other system-health signals. |
| **Cron Monitoring** | Check-ins for scheduled/recurring jobs — alerts when a job runs late, fails, or never runs. |
| **Session Replay** | A video-like reproduction of a user's session (browser and mobile) leading up to an error. |
| **User Feedback** | A widget or API to collect user-submitted reports, optionally attached to an event. |
| **AI / LLM Monitoring** | Spans, token usage, and tool calls for LLM SDKs (OpenAI, Anthropic, Vercel AI, LangChain, Google GenAI). |

Releases, source maps / debug files, data scrubbing, and quota tuning are **not** here — they live
in the `sentry-improve-setup` router.

## How references work

Each SDK has a reference tree:

    references/[sdk]/index.md          # overview, detect, install, init, feature catalog
    references/[sdk]/error-monitoring.md
    references/[sdk]/tracing.md
    references/[sdk]/<signal>.md        # one file per supported signal

Read `references/[sdk]/index.md` **first** — it owns detection, install, the recommended `init`,
and a catalog table that links to each signal's file (and marks unsupported ones). Then read only
the signal files you need. The exact format both files must follow is documented in
[`STRUCTURE.md`](./STRUCTURE.md).

Read them locally with `${SKILL_ROOT}/references/[sdk]/index.md`. Harnesses that fetch over HTTP
can use the published mirror — append the path to `https://skills.sentry.dev/sentry-sdk/`:

    curl -sL https://skills.sentry.dev/sentry-sdk/references/nextjs/index.md

Do not guess or shorten these paths.

## Start Here — Read This Before Doing Anything

> **Prompting tip:** When presenting choices, use your harness's interactive prompt or
> multiple-choice tool if one is available — it is clearer and faster than free-form text.
> Otherwise list the options plainly and wait for a reply.

**Do not skip this section.** Do not assume which SDK the user needs from their project files alone.
Do not install packages or write config until you have confirmed intent.

1. **Detect the platform** from project files (`package.json`, `go.mod`, `requirements.txt`,
   `Gemfile`, `*.csproj`, `build.gradle`, `pubspec.yaml`, etc.).
2. **Tell the user what you found** and which SDK you recommend.
3. **Wait for confirmation** before reading the reference and proceeding.

Each `index.md` carries its own detection logic, prerequisites, and step-by-step configuration.
Trust the reference — read it carefully and follow it. Do not improvise or take shortcuts.

---

## SDK Catalog

| Platform | SDK slug | Reference |
|---|---|---|
| Android | `android` | `references/android/index.md` |
| browser JavaScript | `browser` | `references/browser/index.md` |
| Cloudflare Workers and Pages | `cloudflare` | `references/cloudflare/index.md` |
| Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) | `cocoa` | `references/cocoa/index.md` |
| .NET | `dotnet` | `references/dotnet/index.md` |
| Elixir | `elixir` | `references/elixir/index.md` |
| Go | `go` | `references/go/index.md` |
| NestJS | `nestjs` | `references/nestjs/index.md` |
| Next.js | `nextjs` | `references/nextjs/index.md` |
| Node.js, Bun, and Deno | `node` | `references/node/index.md` |
| PHP | `php` | `references/php/index.md` |
| Python | `python` | `references/python/index.md` |
| Flutter and Dart | `flutter` | `references/flutter/index.md` |
| React Native and Expo | `react-native` | `references/react-native/index.md` |
| React | `react` | `references/react/index.md` |
| React Router Framework | `react-router-framework` | `references/react-router-framework/index.md` |
| TanStack Start React | `tanstack-start` | `references/tanstack-start/index.md` |
| Ruby | `ruby` | `references/ruby/index.md` |
| Svelte and SvelteKit | `svelte` | `references/svelte/index.md` |

### Platform Detection Priority

When multiple SDKs could match, prefer the more specific one:

- **Android** (`build.gradle` with android plugin) → `android`
- **Cloudflare** (`wrangler.toml` or `wrangler.jsonc`) → `cloudflare` over `node`
- **NestJS** (`@nestjs/core`) → `nestjs` over `node`
- **Next.js** → `nextjs` over `react` or `node`
- **React Router Framework** (`@sentry/react-router` or `@react-router/*`) → `react-router-framework` over `react`
- **TanStack Start React** (`@tanstack/react-start`) → `tanstack-start` over `react`
- **Flutter** (`pubspec.yaml` with `flutter:` dependency or `sentry_flutter`) → `flutter`
- **React Native** → `react-native` over `react`
- **PHP** with Laravel or Symfony → `php`
- **Elixir** (`mix.exs` detected) → `elixir`
- **Node.js / Bun / Deno** without a specific framework → `node`
- **Browser JS** (vanilla, jQuery, static sites) → `browser`
- **No match** → direct the user to [Sentry Docs](https://docs.sentry.io/platforms/)

### Quick Lookup

| Keywords | SDK slug |
|---|---|
| android, kotlin, java, jetpack compose | `android` |
| browser, vanilla js, javascript, jquery, cdn, wordpress, static site | `browser` |
| cloudflare, cloudflare workers, cloudflare pages, wrangler, durable objects, d1 | `cloudflare` |
| ios, macos, swift, cocoa, tvos, watchos, visionos, swiftui, uikit | `cocoa` |
| .net, csharp, c#, asp.net, maui, wpf, winforms, blazor, azure functions | `dotnet` |
| go, golang, gin, echo, fiber | `go` |
| elixir, phoenix, plug, oban | `elixir` |
| nestjs, nest | `nestjs` |
| nextjs, next.js, next | `nextjs` |
| node, nodejs, node.js, bun, deno, express, fastify, koa, hapi | `node` |
| php, laravel, symfony | `php` |
| python, django, flask, fastapi, celery, starlette | `python` |
| flutter, dart, pubspec | `flutter` |
| react native, expo | `react-native` |
| react, react router, tanstack, redux, vite | `react` |
| react-router framework, @sentry/react-router, @react-router/dev | `react-router-framework` |
| tanstack start, @tanstack/react-start | `tanstack-start` |
| ruby, rails, sinatra, sidekiq | `ruby` |
| svelte, sveltekit | `svelte` |
