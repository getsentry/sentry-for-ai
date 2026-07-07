# Structured Logging — What & Why

Structured, trace-connected logs: each log carries a level, a message, and key/value **attributes**, and
Sentry automatically attaches the trace ID so it correlates with the spans, errors, and other logs in
the same request. Logs record the context and decisions that explain *what happened* during
execution — the context a stack trace alone can't give.

## When to reach for a log

- **Not for timing or flow** — that's a span / trace.
- **Not for unexpected critical failures** — that's an error (it groups into an issue with a stack
  trace). A log is for noteworthy-but-handled events: a runtime decision (a feature flag served a
  different path), an audit or business event (created / updated / deleted / permission changed), a
  summary of a multi-step operation, or context around a *recoverable* failure (a retry before the final
  attempt, a non-critical upstream that failed).
- **Not for every function call** — high-frequency line-spam is noise and billed volume. A log should
  answer a concrete production question and still be useful if emitted thousands of times.

## Structure

- **Consistent key/value attributes, not interpolation.** Namespace them (`myapp.<domain>.<field>`) and
  reuse field names across the app so events can be searched and aggregated. A good log answers who did
  it, what happened, and when. Attributes are what you query — `severity:error`, `trace_id:...`,
  `user.id:...` with `AND`/`OR` (the level field is `severity` in search); raw text search matches only
  the message, so anything you want to filter on must be an attribute.
- **Accumulate context as a request evolves** — early logs may carry only request info; later ones add
  the authenticated user, feature flags, and outcomes. Prefer the SDK's `set_user` over repeating a user
  ID on every log.
- **Levels carry meaning:** `debug` (temporary diagnostics), `info` (normal events), `warn` (recoverable
  but notable), `error` (handled failures — prefer a real error for anything that should become an
  issue).
- **Log fields, not whole objects** — pick the fields you'll query and omit absent optional attributes
  rather than logging `null`.
- Sentry can integrate with an existing logging abstraction (Monolog, slog, Rails logger, Pino/console)
  or you can call the SDK's logger directly.

## Don't log sensitive data

Assume anything logged will be read by another human. Never log passwords, tokens, API keys, or raw
request/response bodies; prefer opaque user IDs over emails or names, and mind PCI / GDPR / CCPA /
HIPAA-regulated fields. Server-side scrubbing is a backstop, not a license to log carelessly
([`data-scrubbing.md`](data-scrubbing.md)).

## Related

- [`data-scrubbing.md`](data-scrubbing.md)
- [`reduce-volume.md`](reduce-volume.md)
- [`search-query-language.md`](search-query-language.md) — querying logs.
