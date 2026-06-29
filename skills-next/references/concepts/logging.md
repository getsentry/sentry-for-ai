# Structured Logging — What & Why

## What it is

Structured, trace-connected logs sent from your app to Sentry. Each log carries a level, a
message, and **structured attributes**, and is linked to the trace it occurred in — so from a
log you can jump to the surrounding spans, errors, and other logs.

Logs are the **narrative** signal: a searchable record of *what happened* leading up to and
around a problem.

## When to reach for it

- You want a searchable trail of discrete events with structured attributes, not just stack
  traces.
- You're correlating app behavior across a request and want the logs tied to the trace.
- You want to centralize logs you'd otherwise only have on a box or in a file.

## Log vs. the other signals

- **Log vs. error.** An unhandled/exceptional failure is an **error** — capture it as one so
  it groups into an issue and gets a stack trace. A log is for noteworthy-but-not-failure
  events ("retrying", "feature flag X served", "cache miss"). Don't downgrade real errors to
  logs, and don't promote routine logs to errors.
- **Log vs. span.** A log says *what happened*; a span says *how long it took*. If you're
  logging timestamps to measure duration, you want a span.

## Best practices

- **Log events, not noise.** A few high-signal logs per request beat line-spam. Verbose
  logging is expensive (it's billed volume) and drowns the signal.
- **Use levels deliberately** — `trace`/`debug`/`info`/`warn`/`error`/`fatal` — so you can
  filter and so severity actually means something.
- **Attach attributes, don't interpolate.** Prefer `user_id`, `route`, `outcome` as
  structured attributes over stuffing them into the message string. Attributes are searchable
  and aggregatable; an interpolated message is just text.
- **Keep attribute cardinality reasonable** — fine to attach an ID as an attribute for lookup,
  but don't rely on unbounded values as your primary grouping.
- **Console/logger integrations** can auto-capture your existing logging (e.g. `console`,
  `logging`, `logback`). Decide deliberately whether you want that firehose or explicit
  `logger.info(...)` calls — auto-capture is convenient but can blow up volume.

## PII — the most common footgun

Logs are the easiest place to leak sensitive data. **Never log** secrets, tokens, full
request/response bodies, raw headers, passwords, or personal data. Treat the message and every
attribute as something a support engineer will read. Pair with
[`data-scrubbing.md`](data-scrubbing.md) — and note that scrubbing is a *backstop*, not a
license to log carelessly.

## Pitfalls

- Auto-capturing every `console.log` and quadrupling your log volume.
- Logging full payloads "just in case" — expensive and a PII risk.
- Using logs to do what spans (timing) or metrics (aggregates) do better.

## Related

- [`data-scrubbing.md`](data-scrubbing.md) · [`reduce-volume.md`](reduce-volume.md)
- [`search-query-language.md`](search-query-language.md) — querying logs.
