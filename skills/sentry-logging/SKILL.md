---
name: sentry-logging
description: Structured logging concepts and best practices for Sentry. Covers when to use logs vs other signals, what to log, attributes, trace correlation, and PII pitfalls — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Logging

# Logging — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "logging".

## What it is

Structured, trace-connected logs sent from your app. Click a log in Sentry and jump to the full
trace (spans, errors, other logs around it).

## When to reach for it

- You want a searchable record of *what happened* leading up to issues, with structured
  attributes (not just stack traces).
- You're correlating app behavior across a request and want logs tied to the trace.

## Best practices

- **Log events, not noise.** Prefer a few high-signal logs with structured attributes over
  verbose line spam. Use levels deliberately (`info`/`warn`/`error`).
- **Attach attributes** (ids, route, outcome) rather than interpolating everything into the
  message — attributes are searchable.
- **PII discipline:** never log secrets, tokens, full request bodies, or personal data. This is
  the most common footgun. Pair with `sentry-data-scrubbing` if needed.
- Console/logger integrations can auto-capture existing logs — decide whether you want that
  firehose or explicit calls.

## How

Read the platform SDK skill scoped to logging (enabling logs in `init`, the logger API, console
integration).

## Verify

Confirm logs land with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
