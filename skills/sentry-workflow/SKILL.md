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

## Routing Instructions

1. If the user mentions fixing errors, debugging exceptions, or investigating production issues → load `sentry-fix-issues`.
2. If the user mentions Sentry bot comments, PR review comments from Sentry, or `sentry[bot]` → load `sentry-code-review`.
3. If the user mentions Seer, bug prediction, or reviewing PRs for predicted issues → load `sentry-pr-code-review`.
4. When unclear, ask whether the task involves live production issues (MCP) or PR review comments.
