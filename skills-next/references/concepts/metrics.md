# Metrics — What & Why

## What it is

Custom application **metrics** — aggregate numbers you emit and watch over time. Three types,
and you pick by the question:

| Type | Answers | Example |
|---|---|---|
| **count** | *How many?* | `checkout.failed`, `signup.completed` |
| **gauge** | *What's the current value?* | `queue.depth`, `connections.active` |
| **distribution** | *What's the spread (p50/p95/max)?* | `api.latency`, `payload.size` |

Metrics are trace-connected, so a spike on a chart can take you to the producing traces.

## When to reach for it

- You want to track a business or operational **KPI over time** — not a per-event record.
- You want to **alert on a threshold or trend** (pairs with a Metric Monitor — see
  [`monitors.md`](monitors.md)).
- The thing you care about isn't already derivable from errors or spans.

## Metric vs. counting events (the key judgment)

Don't emit a metric for something Sentry already computes from errors/spans — issue counts,
throughput, latency percentiles, crash-free rate are all derived for you. **Reserve custom
metrics for KPIs Sentry can't see**: conversion, business failures, saturation, cache hit
ratio, domain-specific counters.

Metrics also **survive sampling** — an individual span may be sampled away, but a metric is
an aggregate over *every* occurrence. If you need an exact count or a true p95, a metric is
more reliable than counting sampled spans.

## Best practices

- **Track decisions, not everything.** Pick KPIs that map to a real signal you'd act on
  (a conversion drop, a failure rate, a queue backing up).
- **Low-cardinality attributes only.** Tag a metric with `region`, `tier`, `endpoint` — never
  with unbounded values like user IDs, request IDs, or full URLs. High cardinality explodes
  storage and makes charts meaningless.
- **Set units on distributions** (ms, bytes, etc.) so charts and thresholds read correctly.
- **Name consistently** — `domain.thing.action` (`checkout.payment.failed`) — so related
  metrics sort and group together.

## Pitfalls

- ⚠️ **Do not use the old beta `Sentry.metrics.increment` / StatsD-style API — it was
  removed.** Use the current `count` / `gauge` / `distribution` API. (Calling the removed API
  silently does nothing.)
- Putting high-cardinality values in attributes.
- Re-inventing metrics Sentry already derives from your errors/spans.

## Related

- [`monitors.md`](monitors.md) — alert on a metric with a Metric Monitor.
- [`tracing.md`](tracing.md) — metrics complement, don't replace, spans.
