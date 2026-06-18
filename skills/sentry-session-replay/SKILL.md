---
name: sentry-session-replay
description: Session Replay concepts and best practices for Sentry. Covers what replay captures, sampling, and privacy/PII masking — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Session Replay

# Session Replay — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "session replay".

## What it is

A video-like reproduction of a user session around an error or UX problem (web = DOM snapshots,
mobile = view-hierarchy + periodic screenshots).

## When to reach for it

- You want to *see* what the user did before an error or a confusing UX moment.
- You're investigating rage clicks, dead clicks, or hydration errors.

## Best practices

- **Sampling:** keep `replaysSessionSampleRate` low and `replaysOnErrorSampleRate` high — capture
  most error sessions, a small slice of normal ones.
- **Privacy first:** defaults mask all text and block media; review before relaxing. Use the
  mask/block selectors for anything sensitive. Network bodies are opt-in — keep them off unless
  you've scrubbed them.
- **Browser is the primary product;** mobile replay is a separate, more aggressively-redacted
  variant.

## How

Read the platform SDK skill scoped to session replay (the replay integration + sample rates +
privacy config).

## Verify

Confirm a replay lands with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
