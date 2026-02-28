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
| `sentry-cocoa-sdk` | iOS, macOS, tvOS, watchOS, visionOS | Swift, SwiftUI, UIKit |
| `sentry-dotnet-sdk` | .NET, C# | ASP.NET Core, MAUI, WPF, Blazor, Azure Functions |
| `sentry-go-sdk` | Go | net/http, Gin, Echo, Fiber |
| `sentry-nextjs-sdk` | Next.js | App Router, Pages Router |
| `sentry-python-sdk` | Python | Django, Flask, FastAPI, Celery |
| `sentry-react-native-sdk` | React Native | Expo managed, Expo bare |
| `sentry-react-sdk` | React | React Router, TanStack, Redux |
| `sentry-ruby-sdk` | Ruby | Rails, Sinatra, Sidekiq |
| `sentry-svelte-sdk` | Svelte | SvelteKit |

## Routing Instructions

1. Inspect project files to identify the platform and framework.
2. Match to the table above and load the corresponding skill.
3. If Next.js is detected, prefer `sentry-nextjs-sdk` over `sentry-react-sdk`.
4. If React Native is detected, prefer `sentry-react-native-sdk` over `sentry-react-sdk`.
5. If no match is found, direct the user to https://docs.sentry.io/platforms/ to find their platform.
