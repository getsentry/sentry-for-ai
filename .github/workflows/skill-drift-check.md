---
on:
  schedule: weekly on monday

description: >
  Weekly SDK skill drift detector. Compares recent merged PRs in Sentry SDK
  repos against the corresponding skill files. Creates issues when skill
  content may need updating due to SDK changes.

engine: claude

permissions:
  contents: read
  issues: read

network:
  allowed:
    - defaults
    - mcp.sentry.dev

safe-outputs:
  create-issue:
    title-prefix: "[skill-drift] "
    labels: [skill-drift, automated]
    assignees: [copilot]
    max: 15
    expires: "14d"
    close-older-issues: true
  allowed-github-references:
    - getsentry/sentry-javascript
    - getsentry/sentry-python
    - getsentry/sentry-go
    - getsentry/sentry-ruby
    - getsentry/sentry-php
    - getsentry/sentry-cocoa
    - getsentry/sentry-android
    - getsentry/sentry-dart
    - getsentry/sentry-dotnet
    - getsentry/sentry-react-native
---

# SDK Skill Drift Detector

You are a Sentry SDK skill quality validator. Your job is to detect when SDK skill files
in this repository have fallen behind changes in the actual Sentry SDK repositories.

## SDK-to-Repo Mapping

Each skill in `skills/sentry-*-sdk/` corresponds to one or more Sentry SDK GitHub repos.
Some repos are monorepos — use the path filters to determine which skills are affected.

| Skill | Repo | Path Filter (monorepo only) | Team Owner |
|-------|------|---------------------------|------------|
| `sentry-android-sdk` | `getsentry/sentry-android` | — | `@getsentry/team-mobile` |
| `sentry-browser-sdk` | `getsentry/sentry-javascript` | `packages/browser/`, `packages/core/` | `@getsentry/team-javascript-sdks` |
| `sentry-cocoa-sdk` | `getsentry/sentry-cocoa` | — | `@getsentry/team-mobile` |
| `sentry-dotnet-sdk` | `getsentry/sentry-dotnet` | — | `@getsentry/team-web-sdk-backend` |
| `sentry-flutter-sdk` | `getsentry/sentry-dart` | — | `@getsentry/team-mobile-cross-platform` |
| `sentry-go-sdk` | `getsentry/sentry-go` | — | `@getsentry/team-web-sdk-backend` |
| `sentry-nestjs-sdk` | `getsentry/sentry-javascript` | `packages/nestjs/`, `packages/node/`, `packages/core/` | `@getsentry/team-javascript-sdks` |
| `sentry-nextjs-sdk` | `getsentry/sentry-javascript` | `packages/nextjs/`, `packages/node/`, `packages/react/`, `packages/core/` | `@getsentry/team-javascript-sdks` |
| `sentry-node-sdk` | `getsentry/sentry-javascript` | `packages/node/`, `packages/bun/`, `packages/deno/`, `packages/core/` | `@getsentry/team-javascript-sdks` |
| `sentry-php-sdk` | `getsentry/sentry-php` | — | `@getsentry/team-web-sdk-backend` |
| `sentry-python-sdk` | `getsentry/sentry-python` | — | `@getsentry/owners-python-sdk` |
| `sentry-react-native-sdk` | `getsentry/sentry-react-native` | — | `@getsentry/team-mobile-cross-platform` |
| `sentry-react-sdk` | `getsentry/sentry-javascript` | `packages/react/`, `packages/browser/`, `packages/core/` | `@getsentry/team-javascript-sdks` |
| `sentry-ruby-sdk` | `getsentry/sentry-ruby` | — | `@getsentry/team-web-sdk-backend` |
| `sentry-svelte-sdk` | `getsentry/sentry-javascript` | `packages/svelte/`, `packages/sveltekit/`, `packages/browser/`, `packages/core/` | `@getsentry/team-javascript-sdks` |

## Step 1: Gather Recent Merged PRs

For each unique repo in the mapping above, use the GitHub tools to list PRs merged to the
default branch in the **last 7 days**. Focus on the repos one at a time.

**For `getsentry/sentry-javascript`** (monorepo): fetch PRs and check which `packages/` paths
each PR touches. Map changed paths to the affected skills using the path filters above.
A single PR may affect multiple skills.

**For all other repos**: every merged PR is potentially relevant to the corresponding skill.

## Step 2: Filter for Skill-Relevant Changes

Ignore PRs that ONLY touch:
- Test files (`*_test.go`, `*.test.ts`, `test/`, `tests/`, `__tests__/`)
- CI/CD files (`.github/`, `.circleci/`, `Makefile`, `Dockerfile`)
- Documentation files (`docs/`, `*.md` in the repo root)
- Changelog/release files (`CHANGELOG.md`, `CHANGES`, `RELEASES.md`)
- Dependency updates only (`package-lock.json`, `yarn.lock`, `go.sum` without `go.mod`)
- Internal tooling (`scripts/`, `tools/`, `lint/`)

Keep PRs that touch:
- Source code in SDK packages (especially public API surface)
- Configuration options or init parameters
- Framework integrations or middleware
- New features or feature removals
- Breaking changes or deprecations

For each kept PR, note: title, URL, and a brief summary of what changed.

## Step 3: Compare Against Skill Content

For each skill with relevant PRs, read the skill files:
- `skills/<skill-name>/SKILL.md` — the main wizard
- `skills/<skill-name>/references/*.md` — feature deep-dives

Check for these types of drift:

### 3a. New Config Options
If a PR adds a new `init()` option, check option, or SDK configuration parameter,
verify it appears in the skill's Configuration Reference table or the relevant
reference file's config options table. Missing options = drift.

### 3b. Removed or Deprecated APIs
If a PR removes or deprecates a public API, check if the skill still references it.
Skills that recommend deprecated APIs = drift.

### 3c. New Framework Integrations
If a PR adds support for a new framework or library (e.g., a new middleware, a new
ORM integration), check if the skill's framework table or reference files mention it.

### 3d. Feature Additions or Removals
If a PR adds a major new feature (new pillar support, new integration) or removes one
(e.g., profiling removed from a platform), check if the skill's Phase 2 recommendation
matrix and reference files reflect this accurately.

### 3e. Version Bumps
If a PR changes minimum supported versions (Node.js version, framework version, etc.),
check if the skill reflects the new requirements.

### 3f. Breaking Changes
If a PR title or body mentions "BREAKING" or the PR modifies public API signatures,
flag it as high priority drift.

## Step 4: Create Issues

If you find drift for a skill, create ONE issue per affected skill (not per PR).

**Do NOT create an issue if:**
- No relevant PRs were merged in the last 7 days for that repo
- All relevant PRs only touch areas already covered by the skill
- An open issue with the same `[skill-drift]` prefix already exists for that skill

**Issue format:**

Title: `[skill-drift] <skill-name> may need updates`

Body:
```
cc <team-owner from the mapping table above>

## SDK Changes Detected

The following PRs were merged to `<repo>` in the last 7 days that may affect
the `<skill-name>` skill:

- <repo>#<number> — <title> (<url>)
- <repo>#<number> — <title> (<url>)

## Potential Skill Gaps

1. **<Gap type>**: <Description of what changed and what the skill is missing>
2. **<Gap type>**: <Description>

## Skill Files to Review

- `skills/<skill-name>/SKILL.md`
- `skills/<skill-name>/references/<relevant-file>.md`

## Priority

<HIGH if breaking changes or removed features, MEDIUM if new APIs/options, LOW if minor additions>
```

The `cc` line must use the exact team handle from the "Team Owner" column in the mapping table.
This notifies the SDK team that owns the upstream repo so they can review the Copilot-generated fix.

## Step 5: Summary

After processing all repos, output a brief summary of:
- How many repos were checked
- How many had relevant PRs
- How many issues were created
- Any repos that couldn't be accessed (permission errors, etc.)
