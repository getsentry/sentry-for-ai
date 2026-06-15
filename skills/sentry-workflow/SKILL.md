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

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing critical details.

    curl -sL https://skills.sentry.dev/sentry-fix-issues/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not guess or shorten URLs.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which workflow the user needs. Ask first.

1. If the user mentions **fixing a specific bug, debugging exceptions, or investigating production issues** → `sentry-fix-issues`
2. If the user mentions **triaging the new-issue queue or archiving non-actionable noise** → `sentry-triage-issues`
3. If the user mentions **a Sentry digest/summary, "what got worse", a standup or on-call handoff report** → `sentry-issue-digest`
4. If the user mentions **Sentry bot comments or `sentry[bot]` on a PR** → `sentry-code-review`
5. If the user mentions **Seer, bug prediction, or reviewing PRs for predicted issues** → `sentry-pr-code-review`
6. If the user mentions **upgrading Sentry, migrating SDK versions, or fixing deprecated APIs** → `sentry-sdk-upgrade`

When unclear, **ask the user** whether the task involves live production issues, PR review comments, or SDK upgrades. Do not guess.

---

## Workflow Skills

| Use when | Skill | Path |
|---|---|---|
| Fixing a specific bug — stack traces, breadcrumbs, event data, opening a PR | [`sentry-fix-issues`](../sentry-fix-issues/SKILL.md) | `sentry-fix-issues/SKILL.md` |
| Triaging the new-issue queue — archiving non-actionable noise, flagging needs-human | [`sentry-triage-issues`](../sentry-triage-issues/SKILL.md) | `sentry-triage-issues/SKILL.md` |
| A read-only digest of what changed — new issues, regressions, movers, release health, correlated in-repo to the commits that likely caused them | [`sentry-issue-digest`](../sentry-issue-digest/SKILL.md) | `sentry-issue-digest/SKILL.md` |
| Resolving comments from `sentry[bot]` on GitHub PRs | [`sentry-code-review`](../sentry-code-review/SKILL.md) | `sentry-code-review/SKILL.md` |
| Fixing issues detected by Seer Bug Prediction in PR reviews | [`sentry-pr-code-review`](../sentry-pr-code-review/SKILL.md) | `sentry-pr-code-review/SKILL.md` |
| Upgrading the Sentry JavaScript SDK — migration guides, breaking changes, deprecated APIs | [`sentry-sdk-upgrade`](../sentry-sdk-upgrade/SKILL.md) | `sentry-sdk-upgrade/SKILL.md` |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
