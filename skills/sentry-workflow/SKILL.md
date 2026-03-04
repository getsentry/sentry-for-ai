---
name: sentry-workflow
description: Fix production issues and review code with Sentry context. Use when asked to fix Sentry errors, debug issues, triage exceptions, review PR comments from Sentry, or resolve bugs.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Workflows

Debug production issues and maintain code quality with Sentry context. This page helps you find the right workflow skill for your task.

## How to Fetch Skills

Each skill below is a detailed, step-by-step workflow guide. To load one, **append its path to the base URL**:

    https://skills.sentry.gg/<skill-name>/SKILL.md

Use the **exact paths from the `Path` column** in the table below. Do not guess or shorten URLs.

Example — to fetch the issue-fixing skill:

    https://skills.sentry.gg/sentry-fix-issues/SKILL.md

Skills are long, detailed markdown files (10–20 KB). If your fetch tool summarizes or truncates content, use `curl -sL <url>` to download the full file instead. You need the complete text — summaries lose critical configuration details.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which workflow the user needs. Ask first.

1. If the user mentions **fixing errors, debugging exceptions, or investigating production issues** → `sentry-fix-issues`
2. If the user mentions **Sentry bot comments or `sentry[bot]` on a PR** → `sentry-code-review`
3. If the user mentions **Seer, bug prediction, or reviewing PRs for predicted issues** → `sentry-pr-code-review`
4. If the user mentions **upgrading Sentry, migrating SDK versions, or fixing deprecated APIs** → `sentry-sdk-upgrade`

When unclear, **ask the user** whether the task involves live production issues, PR review comments, or SDK upgrades. Do not guess.

---

## Workflow Skills

| Use when | Skill | Path |
|---|---|---|
| Finding and fixing production issues — stack traces, breadcrumbs, event data | [`sentry-fix-issues`](../sentry-fix-issues/SKILL.md) | `sentry-fix-issues/SKILL.md` |
| Resolving comments from `sentry[bot]` on GitHub PRs | [`sentry-code-review`](../sentry-code-review/SKILL.md) | `sentry-code-review/SKILL.md` |
| Fixing issues detected by Seer Bug Prediction in PR reviews | [`sentry-pr-code-review`](../sentry-pr-code-review/SKILL.md) | `sentry-pr-code-review/SKILL.md` |
| Upgrading the Sentry JavaScript SDK — migration guides, breaking changes, deprecated APIs | [`sentry-sdk-upgrade`](../sentry-sdk-upgrade/SKILL.md) | `sentry-sdk-upgrade/SKILL.md` |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
