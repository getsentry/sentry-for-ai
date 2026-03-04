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

Each skill below is a detailed, step-by-step setup guide. To load one, **append its path to the base URL**:

    https://skills.sentry.gg/<skill-name>/SKILL.md

Use the **exact paths from the `Path` column** in the table below. Do not guess or shorten URLs.

Example — to fetch the Next.js setup skill:

    https://skills.sentry.gg/sentry-nextjs-sdk/SKILL.md

Skills are long, detailed markdown files (10–20 KB). If your fetch tool summarizes or truncates content, use `curl -sL <url>` to download the full file instead. You need the complete text — summaries lose critical configuration details.

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
| Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) | [`sentry-cocoa-sdk`](../sentry-cocoa-sdk/SKILL.md) | `sentry-cocoa-sdk/SKILL.md` |
| .NET | [`sentry-dotnet-sdk`](../sentry-dotnet-sdk/SKILL.md) | `sentry-dotnet-sdk/SKILL.md` |
| Go | [`sentry-go-sdk`](../sentry-go-sdk/SKILL.md) | `sentry-go-sdk/SKILL.md` |
| NestJS | [`sentry-nestjs-sdk`](../sentry-nestjs-sdk/SKILL.md) | `sentry-nestjs-sdk/SKILL.md` |
| Next.js | [`sentry-nextjs-sdk`](../sentry-nextjs-sdk/SKILL.md) | `sentry-nextjs-sdk/SKILL.md` |
| Node.js, Bun, and Deno | [`sentry-node-sdk`](../sentry-node-sdk/SKILL.md) | `sentry-node-sdk/SKILL.md` |
| PHP | [`sentry-php-sdk`](../sentry-php-sdk/SKILL.md) | `sentry-php-sdk/SKILL.md` |
| Python | [`sentry-python-sdk`](../sentry-python-sdk/SKILL.md) | `sentry-python-sdk/SKILL.md` |
| React Native and Expo | [`sentry-react-native-sdk`](../sentry-react-native-sdk/SKILL.md) | `sentry-react-native-sdk/SKILL.md` |
| React | [`sentry-react-sdk`](../sentry-react-sdk/SKILL.md) | `sentry-react-sdk/SKILL.md` |
| Ruby | [`sentry-ruby-sdk`](../sentry-ruby-sdk/SKILL.md) | `sentry-ruby-sdk/SKILL.md` |
| Svelte and SvelteKit | [`sentry-svelte-sdk`](../sentry-svelte-sdk/SKILL.md) | `sentry-svelte-sdk/SKILL.md` |

### Platform Detection Priority

When multiple SDKs could match, prefer the more specific one:

- **Android** (`build.gradle` with android plugin) → `sentry-android-sdk`
- **NestJS** (`@nestjs/core`) → `sentry-nestjs-sdk` over `sentry-node-sdk`
- **Next.js** → `sentry-nextjs-sdk` over `sentry-react-sdk` or `sentry-node-sdk`
- **React Native** → `sentry-react-native-sdk` over `sentry-react-sdk`
- **PHP** with Laravel or Symfony → `sentry-php-sdk`
- **Node.js / Bun / Deno** without a specific framework → `sentry-node-sdk`
- **Browser JS** (vanilla, jQuery, static sites) → `sentry-browser-sdk`
- **No match** → direct user to [Sentry Docs](https://docs.sentry.io/platforms/)

## Quick Lookup

Match your project to a skill by keywords. Append the path to `https://skills.sentry.gg/` to fetch.

| Keywords | Path |
|---|---|
| android, kotlin, java, jetpack compose | `sentry-android-sdk/SKILL.md` |
| browser, vanilla js, javascript, jquery, cdn, wordpress, static site | `sentry-browser-sdk/SKILL.md` |
| ios, macos, swift, cocoa, tvos, watchos, visionos, swiftui, uikit | `sentry-cocoa-sdk/SKILL.md` |
| .net, csharp, c#, asp.net, maui, wpf, winforms, blazor, azure functions | `sentry-dotnet-sdk/SKILL.md` |
| go, golang, gin, echo, fiber | `sentry-go-sdk/SKILL.md` |
| nestjs, nest | `sentry-nestjs-sdk/SKILL.md` |
| nextjs, next.js, next | `sentry-nextjs-sdk/SKILL.md` |
| node, nodejs, node.js, bun, deno, express, fastify, koa, hapi | `sentry-node-sdk/SKILL.md` |
| php, laravel, symfony | `sentry-php-sdk/SKILL.md` |
| python, django, flask, fastapi, celery, starlette | `sentry-python-sdk/SKILL.md` |
| react native, expo | `sentry-react-native-sdk/SKILL.md` |
| react, react router, tanstack, redux, vite | `sentry-react-sdk/SKILL.md` |
| ruby, rails, sinatra, sidekiq, rack | `sentry-ruby-sdk/SKILL.md` |
| svelte, sveltekit | `sentry-svelte-sdk/SKILL.md` |

---

Looking for workflows or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
