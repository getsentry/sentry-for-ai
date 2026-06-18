---
name: sentry-profiling
description: Profiling concepts and best practices for Sentry. Covers what profiling shows, when it's worth it, continuous vs UI profiling, and that it requires tracing — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Profiling

# Profiling — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "profiling".

## What it is

Code-level sampling of production execution (function/line resolution) that shows the exact slow
code behind a span — flame graphs, aggregated and differential.

## When to reach for it

- Tracing told you *which* operation is slow and you need to know *which function/line*.
- You're chasing CPU/main-thread bottlenecks or frame drops.

## Best practices

- **Requires tracing on** — the profile sample rate is evaluated relative to traced transactions.
- Choose the mode: continuous profiling (backend, no time cap), UI profiling (frontend/mobile),
  or the legacy transaction-based mode.
- Mind minimum SDK versions and the small (~1–5%) overhead; sample, don't profile everything.

## How

Read the platform SDK skill scoped to profiling (profiling integration, sample rate, lifecycle,
any extra package).

## Verify

Confirm a profile lands with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
