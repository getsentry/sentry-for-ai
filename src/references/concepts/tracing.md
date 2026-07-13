# Tracing & Performance — What & Why

## What it is

Distributed tracing reconstructs one request as it flows across frontend, backend, and downstream
services. A trace is a tree of **spans** — each a timed operation (an HTTP request, a DB query, a
function call) with a name, duration, parent, and attributes. The root span is the **transaction**.
Tracing answers *why* something is slow, and it's the substrate Sentry uses to **automatically detect
performance issues** — N+1 queries, slow DB calls, render-blocking assets, consecutive HTTP calls
(detection requires tracing on).

## What a trace shows

A trace is a waterfall of spans nested by ancestry, and the shape *is* the diagnosis: the widest
span — or a gap between spans — is where the time went (a slow query, a blocking upstream call), which
the stack trace alone can't tell you. A trace is also a cross-issue view: an error inside it links to
its issue, and the real root cause can be a *different* issue in the same request — a frontend exception,
say, driven by a failing span in the backend service upstream. Two shapes to read correctly — a dashed/orphan span means a transaction is **missing**
(unsent, sampled out, rate-limited), usually from a low sample rate rather than a real gap; multiple
roots usually means a custom-instrumentation trace-ID bug. A span also carries its profile, the bridge
down to the function level.

## Setup essentials

- **Sampling is the main cost/signal lever** (trace volume dwarfs errors). `tracesSampleRate` is a flat
  fraction (start 5–20% in prod); `tracesSampler` is a function returning a per-transaction rate — use
  it to sample *down* noise (health checks) and *up* the paths you care about. **`tracesSampleRate: 0`
  does not disable tracing** — it keeps tracing enabled but samples nothing; omit the sampling config
  entirely to truly disable. The head-of-trace sampling decision propagates downstream, so you capture
  whole traces, not fragments.
- **Cross-service:** add your API domains to `tracePropagationTargets` so the SDK attaches trace headers
  (`sentry-trace`, `baggage`, and the newer `traceparent`) on outbound requests, and allow those
  headers via CORS — or propagation silently fails and you get two disconnected traces.
- **Instrument boundaries first** (incoming/outbound HTTP, DB / cache / queue — mostly
  auto-instrumented), add custom spans for meaningful business operations, and keep span names
  **low-cardinality and templated** (`GET /users/:id`, not `/users/12345`) with searchable attributes
  rather than baking values into the name. Follow Sentry's semantic conventions (aligned with
  OpenTelemetry) for span and attribute names so they match what the product expects.

## Related

- [`profiling.md`](profiling.md)
- [`reduce-volume.md`](reduce-volume.md) — sampling is the main lever.
- [`search-query-language.md`](search-query-language.md) — span properties for querying traces.
