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
| [`sentry-cocoa-sdk`](skills/sentry-cocoa-sdk/SKILL.md) | skills/sentry-cocoa-sdk/SKILL.md | Apple platforms (iOS, macOS, tvOS, watchOS, visionOS) |
| [`sentry-dotnet-sdk`](skills/sentry-dotnet-sdk/SKILL.md) | skills/sentry-dotnet-sdk/SKILL.md | .NET |
| [`sentry-go-sdk`](skills/sentry-go-sdk/SKILL.md) | skills/sentry-go-sdk/SKILL.md | Go |
| [`sentry-nextjs-sdk`](skills/sentry-nextjs-sdk/SKILL.md) | skills/sentry-nextjs-sdk/SKILL.md | Next.js |
| [`sentry-python-sdk`](skills/sentry-python-sdk/SKILL.md) | skills/sentry-python-sdk/SKILL.md | Python |
| [`sentry-react-native-sdk`](skills/sentry-react-native-sdk/SKILL.md) | skills/sentry-react-native-sdk/SKILL.md | React Native and Expo |
| [`sentry-react-sdk`](skills/sentry-react-sdk/SKILL.md) | skills/sentry-react-sdk/SKILL.md | React |
| [`sentry-ruby-sdk`](skills/sentry-ruby-sdk/SKILL.md) | skills/sentry-ruby-sdk/SKILL.md | Ruby |
| [`sentry-svelte-sdk`](skills/sentry-svelte-sdk/SKILL.md) | skills/sentry-svelte-sdk/SKILL.md | Svelte and SvelteKit |

## Workflow ([`sentry-workflow`](skills/sentry-workflow/SKILL.md))

| Skill | Path | Use when |
|---|---|---|
| [`sentry-code-review`](skills/sentry-code-review/SKILL.md) | skills/sentry-code-review/SKILL.md | Analyze and resolve Sentry comments on GitHub Pull Requests |
| [`sentry-fix-issues`](skills/sentry-fix-issues/SKILL.md) | skills/sentry-fix-issues/SKILL.md | Find and fix issues from Sentry using MCP |
| [`sentry-pr-code-review`](skills/sentry-pr-code-review/SKILL.md) | skills/sentry-pr-code-review/SKILL.md | Review a project's PRs to check for issues detected in code review by Seer Bug Prediction |

## Feature Setup ([`sentry-feature-setup`](skills/sentry-feature-setup/SKILL.md))

| Skill | Path | Feature |
|---|---|---|
| [`sentry-create-alert`](skills/sentry-create-alert/SKILL.md) | skills/sentry-create-alert/SKILL.md | Create Sentry alerts using the workflow engine API |
| [`sentry-otel-exporter-setup`](skills/sentry-otel-exporter-setup/SKILL.md) | skills/sentry-otel-exporter-setup/SKILL.md | Configure the OpenTelemetry Collector with Sentry Exporter for multi-project routing and automatic project creation |
| [`sentry-setup-ai-monitoring`](skills/sentry-setup-ai-monitoring/SKILL.md) | skills/sentry-setup-ai-monitoring/SKILL.md | Setup Sentry AI Agent Monitoring in any project |

## Internal

| Skill | Path | Purpose |
|---|---|---|
| [`sentry-sdk-skill-creator`](skills/sentry-sdk-skill-creator/SKILL.md) | skills/sentry-sdk-skill-creator/SKILL.md | Create a complete Sentry SDK skill bundle for any platform |
