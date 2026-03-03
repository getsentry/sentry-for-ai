---
name: sentry-sdk-setup
description: Set up Sentry in any language or framework. Detects the user's platform and loads the right SDK skill. Use when asked to add Sentry, install an SDK, or set up error monitoring in a project.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry SDK Setup — Router

Detect the user's platform from project files (e.g. `package.json`, `go.mod`, `Gemfile`, `*.csproj`, `*.xcodeproj`), then load the matching SDK skill below.

| Skill | Platform | Key Frameworks |
|---|---|---|
| `sentry-android-sdk` | Android | Jetpack Compose, Views, OkHttp, Room, Fragment, Timber |
| `sentry-cocoa-sdk` | iOS, macOS, tvOS, watchOS, visionOS | Swift, SwiftUI, UIKit |
| `sentry-dotnet-sdk` | .NET, C# | ASP.NET Core, MAUI, WPF, Blazor, Azure Functions |
| `sentry-go-sdk` | Go | net/http, Gin, Echo, Fiber |
| `sentry-nestjs-sdk` | NestJS | Express, Fastify, GraphQL, Microservices |
| `sentry-nextjs-sdk` | Next.js | App Router, Pages Router |
| `sentry-node-sdk` | Node.js, Bun, Deno | Express, Fastify, Koa, Hapi, Connect, Bun.serve(), Deno.serve() |
| `sentry-php-sdk` | PHP | Laravel, Symfony |
| `sentry-python-sdk` | Python | Django, Flask, FastAPI, Celery |
| `sentry-browser-sdk` | Browser JavaScript | Vanilla JS, jQuery, WordPress, static sites, CDN |
| `sentry-react-native-sdk` | React Native | Expo managed, Expo bare |
| `sentry-react-sdk` | React | React Router, TanStack, Redux |
| `sentry-ruby-sdk` | Ruby | Rails, Sinatra, Sidekiq |
| `sentry-svelte-sdk` | Svelte | SvelteKit |

## Routing Instructions

1. Inspect project files to identify the platform and framework.
2. Match to the table above and load the corresponding skill.
3. If Android (`build.gradle` with android plugin) is detected, use `sentry-android-sdk`.
4. If NestJS is detected (`@nestjs/core`), prefer `sentry-nestjs-sdk` over `sentry-node-sdk`.
5. If Next.js is detected, prefer `sentry-nextjs-sdk` over `sentry-react-sdk` and `sentry-node-sdk`.
6. If React Native is detected, prefer `sentry-react-native-sdk` over `sentry-react-sdk`.
7. If `composer.json` with `laravel/framework` or `symfony/framework-bundle` is detected, use `sentry-php-sdk`.
8. If Node.js, Bun, or Deno is detected without a specific framework skill above, use `sentry-node-sdk`.
9. If vanilla JavaScript, jQuery, WordPress, a static HTML site, or a browser project without a framework is detected, use `sentry-browser-sdk`.
10. If no match is found, direct the user to https://docs.sentry.io/platforms/ to find their platform.

## Dynamic Skill Fetching

If the matched SDK skill is **not installed locally**, fetch it directly from the repository:

1. Build the raw URL: `https://raw.githubusercontent.com/getsentry/sentry-for-ai/main/skills/<skill-name>/SKILL.md`
2. Fetch the file contents (e.g. `curl -sL <url>`) and follow its instructions.

The [Skill Tree](../../SKILL_TREE.md) lists every available skill with its path — use it as the source of truth for valid skill names and paths.
