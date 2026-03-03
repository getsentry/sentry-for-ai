---
name: sentry-workflow
description: Fix production issues and review code with Sentry context. Use when asked to fix Sentry errors, debug issues, triage exceptions, review PR comments from Sentry, or resolve bugs.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Workflow — Router

Match the user's intent to the appropriate workflow skill below.

| Skill | Use When |
|---|---|
| `sentry-fix-issues` | Finding and fixing production issues using Sentry MCP — stack traces, breadcrumbs, event data |
| `sentry-code-review` | Resolving comments from `sentry[bot]` on GitHub PRs |
| `sentry-pr-code-review` | Fixing issues detected by Seer Bug Prediction in PR reviews |
| `sentry-sdk-upgrade` | Upgrading the Sentry JavaScript SDK across major versions — migration guides, breaking changes, deprecated APIs |

## Routing Instructions

1. If the user mentions fixing errors, debugging exceptions, or investigating production issues → load `sentry-fix-issues`.
2. If the user mentions Sentry bot comments, PR review comments from Sentry, or `sentry[bot]` → load `sentry-code-review`.
3. If the user mentions Seer, bug prediction, or reviewing PRs for predicted issues → load `sentry-pr-code-review`.
4. If the user mentions upgrading Sentry, migrating SDK versions, fixing deprecated Sentry APIs, or resolving breaking changes after a Sentry version bump → load `sentry-sdk-upgrade`.
5. When unclear, ask whether the task involves live production issues (MCP), PR review comments, or SDK upgrades.

## Dynamic Skill Fetching

If the matched skill is **not installed locally**, fetch it directly from the repository:

1. Build the raw URL: `https://raw.githubusercontent.com/getsentry/sentry-for-ai/main/skills/<skill-name>/SKILL.md`
2. Fetch the file contents (e.g. `curl -sL <url>`) and follow its instructions.

The [Skill Tree](../../SKILL_TREE.md) lists every available skill with its path — use it as the source of truth for valid skill names and paths.
