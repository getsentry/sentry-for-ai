# Application Metrics — What & Why

**Application Metrics** are numeric values you emit and watch over time, trace-connected so a spike on a
chart links back to the producing traces. Unlike traditional (StatsD-style) metrics they support high
cardinality and dimensionality — a key difference that changes how you instrument them (see below).
Three types, picked by the question:

| Type | Answers | Example |
|---|---|---|
| **count** | *How many?* | `checkout.failed`, `signup.completed` |
| **gauge** | *What's the value now?* | `queue.depth`, `connections.active` |
| **distribution** | *What's the spread (p50/p95/max)?* | `api.latency`, `payload.size` |

## What Application Metrics excel at

They answer *how many / how much / what's the trend* — the aggregate view you alert and build dashboards
on, where the other signals don't fit: tracing is for request performance and flow, logging for runtime
decisions and audit trails, errors for critical failures. A metric tells you *that* something moved, not
*why* — and because Application Metrics are trace-connected, you pivot from a point on the chart to its
samples and the traces behind them to find the cause.

## Setup essentials

- **Don't re-invent what Sentry derives** — issue counts, throughput, latency percentiles, and
  crash-free rate come from errors/spans for free. Reserve Application Metrics for KPIs Sentry can't
  see: conversion, business failures, saturation, cache-hit ratio.
- **A KPI already sitting in your logs is a candidate to promote to a metric** — a log is an ephemeral
  signal optimized for search; a metric is a durable, review-worthy code artifact optimized for alerting
  and dashboards.
- **High cardinality and dimensionality are fine — and a key benefit.** Unlike traditional metrics,
  Application Metrics can carry high-cardinality attributes (user IDs, request IDs, URLs); don't force
  low-cardinality attributes the way you would with a StatsD-style metric or you'll throw away useful
  signal. Set **units** on distributions (ms, bytes) and name consistently (`domain.thing.action`).
- Values are emitted **per occurrence and aggregated at query time** (not a client-side pre-aggregate).
- The old beta `Sentry.metrics.increment` / StatsD-style API was **removed in SDK v9** — use the current
  `count` / `gauge` / `distribution` API (the exact surface varies by platform).

## Related

- [`monitors.md`](monitors.md) — a Metric Monitor can alert on an Application Metric (it can also watch
  logs, spans, or errors — it isn't metrics-specific).
- [`tracing.md`](tracing.md) — Application Metrics complement, don't replace, spans.
