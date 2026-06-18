---
name: sentry-tracing
description: Tracing and performance concepts and best practices. Covers what tracing is, when to use it, what's worth instrumenting, sampling strategy, custom spans, and distributed tracing — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Tracing

# Tracing — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "tracing".

## What it is

Distributed tracing reconstructs a request as it flows across frontend, backend, and services —
made of **spans**. It's how you find latency bottlenecks and the chain of events leading to an
error.

## When to reach for it

- You want to know *why* something is slow, not just that it errored.
- You have multiple services and want one connected view of a request.
- You want Sentry's automatic performance-issue detection (N+1 queries, slow DB, etc.), which
  needs tracing on.

## Best practices (the judgment the SDK skill won't make for you)

- **Sampling:** use `tracesSampleRate` for uniform sampling, or a `tracesSampler` to sample hot
  paths down and important paths up. `0` does **not** disable tracing — omit sampling entirely to
  turn it off.
- **Instrument the boundaries first:** incoming requests, outbound HTTP, DB/cache/queue calls.
  Auto-instrumentation covers most of these once tracing is on.
- **Custom spans** for meaningful business operations; add attributes for things you'll want to
  filter on. Don't wrap trivial code.
- **Distributed tracing:** add your API domains to `tracePropagationTargets` so frontend↔backend
  spans link into one trace; ensure CORS allows the trace headers.

## How

Read the platform SDK skill scoped to tracing for the exact API
(`startSpan`/`start_span`, sampler config, integrations).

## Verify

After enabling, confirm spans land with
[`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
