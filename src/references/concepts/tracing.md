# Tracing & Performance — What & Why

Distributed tracing links one request across services.
See [Tracing](https://docs.sentry.io/product/tracing/) and
[Tracing key terms](https://docs.sentry.io/concepts/key-terms/tracing/).

Detection of performance issues (N+1 queries, slow DB calls) requires tracing on.
A dashed or orphan span means a missing transaction (unsent, sampled out, rate-limited).
Multiple roots usually mean a custom-instrumentation trace-ID bug.

## Setup essentials

- **Sampling is the main cost lever.** See
  [Configure sampling](https://docs.sentry.io/platforms/javascript/tracing/configure-sampling/).
  **`tracesSampleRate: 0` does not disable tracing** — it keeps tracing enabled but
  samples nothing; omit the sampling config entirely to truly disable.
- **Cross-service:** add your API domains to `tracePropagationTargets` so the SDK
  attaches trace headers (`sentry-trace`, `baggage`, and the newer `traceparent`) on
  outbound requests, and allow those headers via CORS — or propagation silently fails
  and you get two disconnected traces.
- **Instrument boundaries first** (incoming/outbound HTTP, DB / cache / queue — mostly
  auto-instrumented), add custom spans for meaningful business operations, and keep span
  names **low-cardinality and templated** (`GET /users/:id`, not `/users/12345`) with
  searchable attributes rather than baking values into the name.
  Follow Sentry’s semantic conventions for span and attribute names.
  The instrument skill lists the domain references under Semantic conventions; open only
  the one you need (for example `references/semantics/http.md`).

## Related

- [`profiling.md`](profiling.md)
- [`reduce-volume.md`](reduce-volume.md) — sampling is the main lever.
- [`search-query-language.md`](../search-query-language.md) — span properties for
  querying traces.
