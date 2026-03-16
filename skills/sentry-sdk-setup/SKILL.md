---
name: sentry-sdk-setup
description: Set up Sentry in any language or framework. Detects the user's platform and loads the right SDK skill. Use when asked to add Sentry, install an SDK, or set up error monitoring in a project.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry SDK Setup

Set up Sentry error monitoring, tracing, and session replay in any language or framework. This page helps you find the right SDK skill for your project.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing critical details.

    curl -sL https://skills.sentry.dev/sentry-nextjs-sdk/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not guess or shorten URLs.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which SDK the user needs based on their project files. Do not start installing packages or creating config files until you have confirmed the user's intent.

1. **Detect the platform** from project files (`package.json`, `go.mod`, `requirements.txt`, `Gemfile`, `*.csproj`, `build.gradle`, etc.).
2. **Tell the user what you found** and which SDK you recommend.
3. **Wait for confirmation** before fetching the skill and proceeding.

Each SDK skill contains its own detection logic, prerequisites, and step-by-step configuration. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

## SDK Skills

| Platform | Skill | Path |
|---|---|---|
| Android | [`sentry-android-sdk`](../sentry-android-sdk/SKILL.md) | `sentry-android-sdk/SKILL.md` |
| browser JavaScript | [`sentry-browser-sdk`](../sentry-browser-sdk/SKILL.md) | `sentry-browser-sdk/SKILL.md` |
| Cloudflare Workers and Pages | [`sentry-cloudflare-sdk`](../sentry-cloudflare-sdk/SKILL.md) | `sentry-cloudflare-sdk/SKILL.md` |
| Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) | [`sentry-cocoa-sdk`](../sentry-cocoa-sdk/SKILL.md) | `sentry-cocoa-sdk/SKILL.md` |
| .NET | [`sentry-dotnet-sdk`](../sentry-dotnet-sdk/SKILL.md) | `sentry-dotnet-sdk/SKILL.md` |
| Elixir | [`sentry-elixir-sdk`](../sentry-elixir-sdk/SKILL.md) | `sentry-elixir-sdk/SKILL.md` |
| Go | [`sentry-go-sdk`](../sentry-go-sdk/SKILL.md) | `sentry-go-sdk/SKILL.md` |
| NestJS | [`sentry-nestjs-sdk`](../sentry-nestjs-sdk/SKILL.md) | `sentry-nestjs-sdk/SKILL.md` |
| Next.js | [`sentry-nextjs-sdk`](../sentry-nextjs-sdk/SKILL.md) | `sentry-nextjs-sdk/SKILL.md` |
| Node.js, Bun, and Deno | [`sentry-node-sdk`](../sentry-node-sdk/SKILL.md) | `sentry-node-sdk/SKILL.md` |
| PHP | [`sentry-php-sdk`](../sentry-php-sdk/SKILL.md) | `sentry-php-sdk/SKILL.md` |
| Python | [`sentry-python-sdk`](../sentry-python-sdk/SKILL.md) | `sentry-python-sdk/SKILL.md` |
| Flutter and Dart | [`sentry-flutter-sdk`](../sentry-flutter-sdk/SKILL.md) | `sentry-flutter-sdk/SKILL.md` |
| React Native and Expo | [`sentry-react-native-sdk`](../sentry-react-native-sdk/SKILL.md) | `sentry-react-native-sdk/SKILL.md` |
| React | [`sentry-react-sdk`](../sentry-react-sdk/SKILL.md) | `sentry-react-sdk/SKILL.md` |
| Ruby | [`sentry-ruby-sdk`](../sentry-ruby-sdk/SKILL.md) | `sentry-ruby-sdk/SKILL.md` |
| Svelte and SvelteKit | [`sentry-svelte-sdk`](../sentry-svelte-sdk/SKILL.md) | `sentry-svelte-sdk/SKILL.md` |

### Platform Detection Priority

When multiple SDKs could match, prefer the more specific one:

- **Android** (`build.gradle` with android plugin) → `sentry-android-sdk`
- **Cloudflare** (`wrangler.toml` or `wrangler.jsonc`) → `sentry-cloudflare-sdk` over `sentry-node-sdk`
- **NestJS** (`@nestjs/core`) → `sentry-nestjs-sdk` over `sentry-node-sdk`
- **Next.js** → `sentry-nextjs-sdk` over `sentry-react-sdk` or `sentry-node-sdk`
- **Flutter** (`pubspec.yaml` with `flutter:` dependency or `sentry_flutter`) → `sentry-flutter-sdk`
- **React Native** → `sentry-react-native-sdk` over `sentry-react-sdk`
- **PHP** with Laravel or Symfony → `sentry-php-sdk`
- **Elixir** (`mix.exs` detected) → `sentry-elixir-sdk`
- **Node.js / Bun / Deno** without a specific framework → `sentry-node-sdk`
- **Browser JS** (vanilla, jQuery, static sites) → `sentry-browser-sdk`
- **No match** → direct user to [Sentry Docs](https://docs.sentry.io/platforms/)

## Quick Lookup

Match your project to a skill by keywords. Append the path to `https://skills.sentry.dev/` to fetch.

| Keywords | Path |
|---|---|
| android, kotlin, java, jetpack compose | `sentry-android-sdk/SKILL.md` |
| browser, vanilla js, javascript, jquery, cdn, wordpress, static site | `sentry-browser-sdk/SKILL.md` |
| cloudflare, cloudflare workers, cloudflare pages, wrangler, durable objects, d1 | `sentry-cloudflare-sdk/SKILL.md` |
| ios, macos, swift, cocoa, tvos, watchos, visionos, swiftui, uikit | `sentry-cocoa-sdk/SKILL.md` |
| .net, csharp, c#, asp.net, maui, wpf, winforms, blazor, azure functions | `sentry-dotnet-sdk/SKILL.md` |
| go, golang, gin, echo, fiber | `sentry-go-sdk/SKILL.md` |
| elixir, phoenix, plug, oban | `sentry-elixir-sdk/SKILL.md` |
| nestjs, nest | `sentry-nestjs-sdk/SKILL.md` |
| nextjs, next.js, next | `sentry-nextjs-sdk/SKILL.md` |
| node, nodejs, node.js, bun, deno, express, fastify, koa, hapi | `sentry-node-sdk/SKILL.md` |
| php, laravel, symfony | `sentry-php-sdk/SKILL.md` |
| python, django, flask, fastapi, celery, starlette | `sentry-python-sdk/SKILL.md` |
| flutter, dart, pubspec | `sentry-flutter-sdk/SKILL.md` |
| react native, expo | `sentry-react-native-sdk/SKILL.md` |
| react, react router, tanstack, redux, vite | `sentry-react-sdk/SKILL.md` |
| ruby, rails, sinatra, sidekiq, rack | `sentry-ruby-sdk/SKILL.md` |
| svelte, sveltekit | `sentry-svelte-sdk/SKILL.md` |

---

## Finding the DSN

If the user doesn't have their DSN, guide them to find it:

1. Open the Sentry project settings page: `https://sentry.io/settings/projects/`
2. Select the project
3. Click **"Client Keys (DSN)"** in the left sidebar
4. Copy the DSN

You can help the user open the page directly:
```bash
open https://sentry.io/settings/projects/        # macOS
xdg-open https://sentry.io/settings/projects/    # Linux
start https://sentry.io/settings/projects/        # Windows
```

> **Note:** The DSN is public and safe to include in source code. It is not a secret — it only identifies where to send events.

---

Looking for workflows or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
