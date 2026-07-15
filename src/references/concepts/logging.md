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
- **Agree conventions once, across services.** Decide the attribute namespacing, event-name phrasing,
  and levels up front so logs from every language and service can be searched and correlated together.
  On both sides of a call that propagates trace headers (`baggage` / `sentry-trace`), use the same
  attribute names so a single trace reads coherently across services.
- **Accumulate context as a request evolves** — early logs may carry only request info; later ones add
  the authenticated user, feature flags, and outcomes. Prefer the SDK's `set_user` over repeating a user
  ID on every log.
- **Levels carry meaning:** `debug` (temporary diagnostics), `info` (normal events), `warn` (recoverable
  but notable), `error` (handled failures). For anything critical — or that should group into an issue
  with a stack trace — capture a real Sentry **error** event, not a log. On the `error`-level logs you
  do keep, include what explains the failure: retry count, the response status and key non-sensitive
  request/response fields for external calls, and the runtime decisions that led there.
- **Log fields, not whole objects** — pick the fields you'll query and omit absent optional attributes
  rather than logging `null`.
- Sentry can integrate with an existing logging abstraction (Monolog, slog, Rails logger, Pino/console)
  or you can call the SDK's logger directly.

## Don't log sensitive data

Assume anything logged will be read by another human. Never log passwords, tokens, or API keys; prefer
opaque user IDs over emails or names, and mind PCI / GDPR / CCPA / HIPAA-regulated fields. Large raw
payloads — a full LLM prompt/response, a webhook or HTTP body — have legitimate debugging uses, but
users put personal data in prompts and bodies carry secrets, so weigh the cost and risk and prefer
logging the specific fields you'll query over the whole payload. Server-side scrubbing is a backstop,
not a license to log carelessly ([`data-scrubbing.md`](data-scrubbing.md)).

## Is a log worth keeping?

Review each log you add or change, and drop any that can't answer yes to all of these:

- **Production question** — what concrete production question does it answer?
- **Useful at volume** — would it still help if emitted thousands of times?
- **Right signal** — is it better as a span, a metric, or a real Sentry error?
- **Not already covered** — does an exception, an existing log, or a shared API/client wrapper already
  capture it?
- **Consistent** — do its event name and attributes follow the app's conventions?
- **Safe** — no PII, secrets, raw payloads, or unstable exception-message text?
- **Actionable** — would seeing it change how someone investigates or responds?

For each log you keep, be able to say: *"This log is valuable because it helps answer <specific
question>."* Drop logs that merely confirm a routine UI interaction, duplicate a generic API failure,
or record an expected validation failure without adding context.

## Related

- [`data-scrubbing.md`](data-scrubbing.md)
- [`reduce-volume.md`](reduce-volume.md)
- [`search-query-language.md`](search-query-language.md) — querying logs.
