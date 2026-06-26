# Tracing & Performance — What & Why

## What it is

Distributed tracing reconstructs a single request as it flows across frontend, backend, and
downstream services. A trace is a tree of **spans** — each span is one timed operation (an
HTTP request, a DB query, a function call) with a name, duration, parent, and attributes.
The root span is the **transaction**.

Tracing is how you answer *why* something is slow (not just *that* it errored), and it's the
substrate Sentry uses to **automatically detect performance issues** — N+1 queries, slow DB
calls, render-blocking resources, consecutive HTTP calls.

## When to reach for it

- You want latency and throughput, not just crashes.
- You have multiple services and want one connected view of a request end-to-end.
- You want automatic performance-issue detection (it requires tracing to be on).
- You're about to add **profiling** — profiling samples inside traced transactions, so
  tracing is a prerequisite.

## Sampling strategy (the most important decision)

Tracing volume dwarfs error volume, so sampling is where you control cost and signal.

- **`tracesSampleRate`** — a flat fraction (e.g. `0.1` = 10% of transactions). Simplest;
  good default. Start modest in production (5–20%) and raise if you need more resolution.
- **`tracesSampler`** — a function returning a rate per transaction. Use it to sample *down*
  high-volume noise (health checks, static assets) and *up* the paths you care about
  (checkout, login, a flaky endpoint). This is the right tool when a flat rate either costs
  too much or starves the interesting traffic.
- **Sampling decisions propagate.** The head-of-trace sampling decision is carried downstream
  so a trace is captured (or dropped) consistently across services — you don't get half a
  trace.
- **`0` is not "off."** A sample rate of `0` keeps tracing *enabled* but samples nothing.
  To truly disable tracing, omit the sampling config entirely.

## What's worth instrumenting

1. **Boundaries first.** Incoming requests, outbound HTTP, DB / cache / queue calls.
   Auto-instrumentation covers most of these the moment tracing is enabled — you usually get
   a lot for free.
2. **Custom spans for meaningful business operations** — a checkout, a report generation, a
   batch job step. Wrap the unit you'd actually want to see timed and broken down.
3. **Don't wrap trivial code.** A span around a one-line getter is noise that inflates the
   trace and the bill.

## Naming & attributes

- **Span names should be low-cardinality and templated** — `GET /users/:id`, not
  `GET /users/12345`. High-cardinality names fragment your data and make aggregation useless.
- **Attributes (span data / tags) are searchable** — put the things you'll want to filter or
  group by (route, customer tier, queue name, outcome) on the span as attributes rather than
  baking them into the name.
- Keep attribute **cardinality bounded** — no raw user IDs or unbounded values as the primary
  grouping key.

## Distributed tracing across services

- Add your own API domains to **`tracePropagationTargets`** so the SDK attaches trace headers
  (`sentry-trace`, `baggage`) on outbound requests and the frontend↔backend spans link into
  one trace.
- Ensure **CORS** allows those trace headers, or the propagation silently fails and you get
  two disconnected traces instead of one.

## Pitfalls

- Treating `tracesSampleRate: 0` as "disabled" (it isn't).
- Flat-sampling a service whose traffic is 99% health checks — you pay to capture noise and
  miss the rare real request. Use a `tracesSampler`.
- High-cardinality transaction names exploding your dataset.
- Forgetting CORS / propagation targets, then wondering why traces don't connect.

## Related

- [`profiling.md`](profiling.md) — rides on tracing.
- [`reduce-volume.md`](reduce-volume.md) — sampling is the main volume lever.
- [`search-query-language.md`](search-query-language.md) — span properties for querying traces.
