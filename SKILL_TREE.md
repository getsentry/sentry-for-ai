# Sentry Skill Tree

This file maps the full skill structure for the Sentry-for-AI plugin. Read it to find the right skill for any task, then follow the path to load it.

## Quick Navigation

| If the user wants to... | Start here |
|---|---|
| Set up Sentry in a project | [`sentry-sdk-setup`](skills/sentry-sdk-setup/SKILL.md) |
| Fix issues, review code, debug production | [`sentry-workflow`](skills/sentry-workflow/SKILL.md) |
| Configure a specific Sentry feature | [`sentry-feature-setup`](skills/sentry-feature-setup/SKILL.md) |

## SDK Setup ([`sentry-sdk-setup`](skills/sentry-sdk-setup/SKILL.md))

| Skill | Path | Platform |
|---|---|---|
| [`sentry-cocoa-sdk`](skills/sentry-cocoa-sdk/SKILL.md) | skills/sentry-cocoa-sdk/SKILL.md | iOS, macOS, tvOS, watchOS, visionOS (Swift) |
| [`sentry-dotnet-sdk`](skills/sentry-dotnet-sdk/SKILL.md) | skills/sentry-dotnet-sdk/SKILL.md | .NET, C# (ASP.NET Core, MAUI, WPF, Blazor) |
| [`sentry-go-sdk`](skills/sentry-go-sdk/SKILL.md) | skills/sentry-go-sdk/SKILL.md | Go (net/http, Gin, Echo, Fiber) |
| [`sentry-nextjs-sdk`](skills/sentry-nextjs-sdk/SKILL.md) | skills/sentry-nextjs-sdk/SKILL.md | Next.js (App Router, Pages Router) |
| [`sentry-python-sdk`](skills/sentry-python-sdk/SKILL.md) | skills/sentry-python-sdk/SKILL.md | Python (Django, Flask, FastAPI, Celery) |
| [`sentry-react-native-sdk`](skills/sentry-react-native-sdk/SKILL.md) | skills/sentry-react-native-sdk/SKILL.md | React Native (Expo, bare RN) |
| [`sentry-react-sdk`](skills/sentry-react-sdk/SKILL.md) | skills/sentry-react-sdk/SKILL.md | React (React Router, TanStack, Redux) |
| [`sentry-ruby-sdk`](skills/sentry-ruby-sdk/SKILL.md) | skills/sentry-ruby-sdk/SKILL.md | Ruby (Rails, Sinatra, Sidekiq) |
| [`sentry-svelte-sdk`](skills/sentry-svelte-sdk/SKILL.md) | skills/sentry-svelte-sdk/SKILL.md | Svelte (SvelteKit) |

## Workflow ([`sentry-workflow`](skills/sentry-workflow/SKILL.md))

| Skill | Path | Use when |
|---|---|---|
| [`sentry-fix-issues`](skills/sentry-fix-issues/SKILL.md) | skills/sentry-fix-issues/SKILL.md | Finding and fixing production issues via Sentry MCP |
| [`sentry-code-review`](skills/sentry-code-review/SKILL.md) | skills/sentry-code-review/SKILL.md | Resolving sentry[bot] comments on GitHub PRs |
| [`sentry-pr-code-review`](skills/sentry-pr-code-review/SKILL.md) | skills/sentry-pr-code-review/SKILL.md | Fixing Seer Bug Prediction findings in PR reviews |

## Feature Setup ([`sentry-feature-setup`](skills/sentry-feature-setup/SKILL.md))

| Skill | Path | Feature |
|---|---|---|
| [`sentry-setup-ai-monitoring`](skills/sentry-setup-ai-monitoring/SKILL.md) | skills/sentry-setup-ai-monitoring/SKILL.md | LLM/AI call monitoring (OpenAI, Anthropic, LangChain) |
| [`sentry-otel-exporter-setup`](skills/sentry-otel-exporter-setup/SKILL.md) | skills/sentry-otel-exporter-setup/SKILL.md | OpenTelemetry Collector with Sentry Exporter |
| [`sentry-create-alert`](skills/sentry-create-alert/SKILL.md) | skills/sentry-create-alert/SKILL.md | Alerts via workflow engine API (email, Slack, PagerDuty) |

## Internal

| Skill | Path | Purpose |
|---|---|---|
| [`sentry-sdk-skill-creator`](skills/sentry-sdk-skill-creator/SKILL.md) | skills/sentry-sdk-skill-creator/SKILL.md | Create new SDK skill bundles (contributors only) |
