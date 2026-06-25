---
name: sentry-enable-ai-review
description: Turn on Sentry's AI code review and bug prediction for a repository. Use when a user wants Sentry to automatically review PRs or run on demand via @sentry review. This is the enable side — responding to existing bot comments is sentry-code-review.
license: Apache-2.0
category: improve-setup
parent: sentry-improve-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Improve My Setup](../sentry-improve-setup/SKILL.md) > Enable AI Review

# Enable Sentry AI Code Review

> **Stub — flesh out.**

## What this is

Turn ON Sentry's AI Code Review / Bug Prediction for a repo so it reviews PRs automatically (or on
`@sentry review`) and posts findings as checks/comments.

This is distinct from **responding to** existing bot comments — for that, see
[`sentry-code-review`](../sentry-code-review/SKILL.md), which handles both `sentry[bot]` and
`seer-by-sentry[bot]` (Seer bug prediction) comments.

## Steps (outline)

1. Connect the GitHub/GitLab integration in Sentry (OAuth — the user does this; surface it
   plainly).
2. Enable AI Code Review for the org/repo and configure when it runs (auto on PRs vs. on mention).
3. Confirm the status check / first review appears on a PR.

## Honesty

Most of this is configured in Sentry + the SCM app, not in code. Be clear about what the agent can
do (guide, configure where APIs exist) vs. the OAuth/install step the user must do.
