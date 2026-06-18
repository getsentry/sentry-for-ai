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

> **Prompting tip:** When presenting the choices below, use your harness's built-in interactive
> prompt or multiple-choice tool if one is available (for example a question/selection UI) — it
> gives the user a clearer, faster way to choose than free-form text. Otherwise, list the options
> plainly and wait for their reply.

**Do not skip this section.** Do not assume which workflow the user needs. Ask first.

1. If the user mentions **fixing errors, debugging exceptions, or investigating production issues** → `sentry-fix-issues`
2. If the user mentions **Sentry/Seer bot comments on a PR** (`sentry[bot]` or `seer-by-sentry[bot]` / bug prediction) → `sentry-code-review`

If the user has **no specific problem** and just wants to understand what the agent can do to help
debug & fix with Sentry, briefly explain the options here (Seer root-cause/autofix, issue triage,
`/seer` environment queries, automated PR review) and point them back when they hit something.

Upgrading the SDK or migrating APIs is no longer here — see
[`sentry-improve-setup`](../sentry-improve-setup/SKILL.md).

When unclear, **ask the user** whether the task involves live production issues or PR review
comments. Do not guess.

---

## Workflow Skills

| Use when | Skill | Path |
|---|---|---|
| Finding and fixing production issues — stack traces, breadcrumbs, event data | [`sentry-fix-issues`](../sentry-fix-issues/SKILL.md) | `sentry-fix-issues/SKILL.md` |
| Resolving Sentry/Seer bot comments on GitHub PRs (`sentry[bot]` and `seer-by-sentry[bot]`) | [`sentry-code-review`](../sentry-code-review/SKILL.md) | `sentry-code-review/SKILL.md` |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
