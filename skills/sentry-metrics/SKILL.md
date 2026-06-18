---
name: sentry-metrics
description: Application metrics concepts and best practices for Sentry. Covers counters/gauges/distributions, which KPIs are worth tracking, attributes, and trace correlation — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Metrics

# Metrics — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "metrics".

## What it is

Custom **counters, gauges, and distributions** (e.g. `checkout.failed`, `queue.depth`,
`api.latency`). Every metric is trace-connected, so a spike can jump you to the producing traces.

## When to reach for it

- You want to track a business or operational KPI over time, not a per-event record.
- You want to alert on a threshold or trend (pairs with `sentry-metric-alerts`).

## Best practices

- **Three types only:** `count`, `gauge`, `distribution`. Pick by question: how many? current
  value? distribution of values?
- **Track decisions, not everything.** Choose KPIs that map to a real signal (conversion,
  failures, saturation). Low-cardinality attributes only — don't put unbounded ids in attributes.
- **Units matter** for distributions (ms, bytes) — set them so charts read correctly.
- ⚠️ **Do not use the old beta `Sentry.metrics.increment`/StatsD-style API — it was removed.** Use
  the current `count`/`gauge`/`distribution` API.

## How

Read the platform SDK skill scoped to metrics for the exact API and minimum SDK versions.

## Verify

Confirm metrics land with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
