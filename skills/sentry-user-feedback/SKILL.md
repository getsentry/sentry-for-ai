---
name: sentry-user-feedback
description: User Feedback concepts and best practices for Sentry. Covers the widget vs API vs crash-report modal, and when to use each — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > User Feedback

# User Feedback — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "user feedback".

## What it is

Collect qualitative reports from users, linked to errors, replays, and context.

## When to reach for it

- You want a "report a problem" path in your app tied to Sentry context.
- You want to prompt for detail after a crash.

## The three mechanisms (pick by need)

- **Feedback widget** (browser) — embeddable button/form, optional screenshot; auto-injected by
  default. Good default for web apps.
- **`captureFeedback` API** (most SDKs) — programmatic; wire it to your own UI.
- **Crash-report modal** — prompts the user for detail after an error (often the only option on
  backend/Python).

## Best practices

- Route feedback somewhere actionable (Slack/Jira) so it isn't a black hole.
- Decide on required fields and screenshots up front; respect privacy in screenshots.

## How

Read the platform SDK skill scoped to user feedback for the exact integration/API.

## Verify

Confirm feedback lands with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
