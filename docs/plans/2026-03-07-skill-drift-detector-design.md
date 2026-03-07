# SDK Skill Drift Detector — Design

## Problem

When Sentry SDK repos (sentry-javascript, sentry-python, etc.) merge changes that add, remove, or modify public APIs, config options, or framework integrations, the corresponding skill files in sentry-for-ai can become stale. There's no automated way to detect this drift.

## Solution

A GitHub Agentic Workflow in `sentry-for-ai` that runs weekly, checks all 15 SDK repos for recent merged PRs, compares them against the skill content, and creates issues when gaps are found.

## Architecture

```
sentry-for-ai/.github/workflows/skill-drift-check.md
    │
    │  runs weekly (Monday 9:00 UTC)
    │  engine: claude
    │
    ├─► reads merged PRs from 15 SDK repos via GitHub MCP
    ├─► reads skill files from this repo
    ├─► compares: new APIs, removed features, config changes
    │
    └─► creates issues in sentry-for-ai with:
        - which PRs triggered the alert
        - what skill content needs updating
        - links to relevant files
```

## SDK-to-Repo Mapping

| Skill | GitHub Repo | Monorepo Path Filter |
|-------|-------------|---------------------|
| `sentry-android-sdk` | `getsentry/sentry-android` | — |
| `sentry-browser-sdk` | `getsentry/sentry-javascript` | `packages/browser/`, `packages/core/` |
| `sentry-cocoa-sdk` | `getsentry/sentry-cocoa` | — |
| `sentry-dotnet-sdk` | `getsentry/sentry-dotnet` | — |
| `sentry-flutter-sdk` | `getsentry/sentry-dart` | — |
| `sentry-go-sdk` | `getsentry/sentry-go` | — |
| `sentry-nestjs-sdk` | `getsentry/sentry-javascript` | `packages/nestjs/`, `packages/node/`, `packages/core/` |
| `sentry-nextjs-sdk` | `getsentry/sentry-javascript` | `packages/nextjs/`, `packages/node/`, `packages/react/`, `packages/core/` |
| `sentry-node-sdk` | `getsentry/sentry-javascript` | `packages/node/`, `packages/bun/`, `packages/deno/`, `packages/core/` |
| `sentry-php-sdk` | `getsentry/sentry-php` | — |
| `sentry-python-sdk` | `getsentry/sentry-python` | — |
| `sentry-react-native-sdk` | `getsentry/sentry-react-native` | — |
| `sentry-react-sdk` | `getsentry/sentry-javascript` | `packages/react/`, `packages/browser/`, `packages/core/` |
| `sentry-ruby-sdk` | `getsentry/sentry-ruby` | — |
| `sentry-svelte-sdk` | `getsentry/sentry-javascript` | `packages/svelte/`, `packages/sveltekit/`, `packages/browser/`, `packages/core/` |

## Trigger

- `schedule: cron "0 9 * * 1"` (Monday 9:00 UTC)
- Can also be triggered manually via `workflow_dispatch`

## Output

One issue per SDK with detected drift, labeled `[skill-drift]`. Issue body contains:
- List of relevant merged PRs (title, URL)
- Specific skill gaps identified (new config options, removed APIs, new integrations)
- Links to the skill files that need review

## Engine

`claude` — chosen because the analysis requires understanding code diffs and comparing them against natural-language skill documentation.

## Permissions

- `contents: read` — to read skill files in this repo
- `issues: read` — to check for existing drift issues (avoid duplicates)
- GitHub MCP — to read PRs from external repos (read-only, default access)

## Safe Outputs

- `issues` — create issues with `[skill-drift]` prefix and `skill-drift`, `automated` labels
