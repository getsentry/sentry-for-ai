---
name: sentry-workflow
description: Review code and keep Sentry SDKs up to date. Use when asked to resolve Sentry bot comments on a PR, address Seer bug predictions in PR reviews, or upgrade the Sentry SDK across major versions.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Workflows

Maintain code quality and keep your Sentry SDK up to date. This page helps you find the right workflow skill for your task.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which workflow the user needs. Ask first.

1. If the user mentions **Sentry bot comments or `sentry[bot]` on a PR** → `sentry-code-review`
2. If the user mentions **Seer, bug prediction, or reviewing PRs for predicted issues** → `sentry-pr-code-review`
3. If the user mentions **upgrading Sentry, migrating SDK versions, or fixing deprecated APIs** → `sentry-sdk-upgrade`

When unclear, **ask the user** whether the task involves PR review comments or SDK upgrades. Do not guess.

> Fixing or investigating a production issue? That's the standalone `sentry-debug-issue` skill.

---

## Workflow Skills

| Use when | Skill |
|---|---|
| Resolving comments from `sentry[bot]` on GitHub PRs | [`sentry-code-review`](../sentry-code-review/SKILL.md) |
| Fixing issues detected by Seer Bug Prediction in PR reviews | [`sentry-pr-code-review`](../sentry-pr-code-review/SKILL.md) |
| Upgrading the Sentry JavaScript SDK — migration guides, breaking changes, deprecated APIs | [`sentry-sdk-upgrade`](../sentry-sdk-upgrade/SKILL.md) |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
