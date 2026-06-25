# Logging

This document provides language-agnostic suggestions for:

- When to use logs, vs., other types of telemetry.
- Log entries to instrument in a codebase.
- How to structure log entries.
- Anti-patterns: what metadata to exclude from logs and types of log entries to
  avoid.

---

## When to use logs, vs., other types of telemetry

Logs are ideal for recording the context and decisions that explain what
happened during an application's execution.

- For measuring the performance and flow of requests, use
  [Tracing](./tracing.md).
- For unexpected critical failures, use [Errors](./errors.md).

The next section describes the kinds of application events that are good
candidates for logging.

---

## Valuable log entries to instrument

### Important runtime decisions made by your application

The decisions made leading up to how a request is served are useful when
debugging runtime behaviour.

Examples include:

- A user has a feature flag enabled resulting in a different code path.
- Mobile users are redirected to a different experience.
- Paid and free users receive different functionality.

This information can be useful both as a standalone log entry, e.g., emitting a
log when a feature flag is evaluated, or a redirect takes place.

This information can be useful as context included on other structured logs,
e.g., including pertinent feature flags with a log entry.

### Whether a feature or algorithm is behaving as expected

Logs are useful when a feature performs multiple steps. By recording
intermediate outcomes, you can understand where a process is breaking down and
why.

Here's an example from a site that allows users to import a log-book from
another external service:

```js
// Stage 1 outcome: the export was authenticated and parsed. Record how much
// work we're about to do — if a user reports a bad import, the first question
// is "how many entries did we even receive?"
Sentry.logger.info("Aurora import started", {
  "import.source": "aurora",
  "import.entries_received": body.ascents.length,
});



// Algorithm runs here, populating skipDetails.
// Final stage outcome: a flat, queryable breakdown of how the run resolved.
// Each skip reason is its own scalar field so you can chart, say, a spike in
// `import.skipped.unknown_grade` (a Font→V-scale conversion gap) on its own.
Sentry.logger.info("Aurora import finished", {
  "import.source": "aurora",
  "import.entries_received": body.ascents.length,
  "import.imported": imported,
  "import.climbs_created": climbsCreated,
  "import.skipped": skipped,
  "import.skipped.missing_name": skipDetails.missingName,
  "import.skipped.unknown_grade": skipDetails.unknownGrade,
  "import.skipped.invalid_angle": skipDetails.invalidAngle,
  "import.skipped.already_imported": skipDetails.alreadyImported,
});
```

Key steps in the algorithm are logged and outcomes are collected. At the end of
the run, the outcomes are included in the log message, helping evaluate whether
or not the algorithm ran as expected.

### Audit and forensic events (creates, updates, deletes, access, permissions)

Audit logs help answer questions like "Who changed this?", "When did it
happen?", and "Was this action expected?"

When the entities in your application are created, updated, deleted, accessed,
or have permissions changed, consider logging an event.

Use your best judgment. You probably don’t need to log every database read, but
key decision points where access is evaluated, permissions change, or sensitive
data is viewed are worth capturing.

### Context surrounding errors and failures

For exceptions, you’ll often be better off using [Errors](./errors.md), rather
than adding a log line.

Here are exampls of errors that may be better suited as log entries:

- Failures from non-critical, optional, upstream services.
- Failures that occur in a retry loop, prior to the final attempt.

For these types of `error` log lines, here's some context to consider logging:

- Retry count.
- For external API calls: response status code and critical, non-sensitive,
  fields from the request or response.
- Runtime decisions leading up to the error.

---

## How to structure log messages

### Use structured log messages

Use structured logs that capture information as consistent key/value pairs.
Maintain consitency with the key/value pairs you choose throughout the
application.

A good log message typically answers three questions:

- Who performed the action (for example, the authenticated user).
- What happened (a human-readable message and supporting metadata).
- When it happened (typically added automatically by the logging system).

Use Sentry's SDK when appropriate for setting context globally. As an example,
the `set_user` function is available for various SDKs to add user context to
events in a single location.

### Add context as a request evolves

Logs should accumulate context as a request moves through your application. Emit
that context alongside event-specific metadata in your log messages.

For example, logs emitted before authentication won't contain user information.
Later in the request lifecycle, after authentication.

Sentry automatically attaches a Trace ID to log messages, allowing them to be
correlated to traces.

### Choose the appropriate log level

Using appropriate log levels conveys additional meaning in your log messages.

Use `debug` for detailed diagnostic information. Debug logs are often disabled
in production and enabled temporarily when troubleshooting a problem.

Use `info` for normal application events and contextual information.

Use `warn` for recoverable events that may require attention, e.g., an upstream
service having high latency.

Use `error` for unexpected handled errors, preferring [Errors](./errors.md) for
uncaught exceptions.

### How to log objects

Avoid logging entire objects, in favor of logging the individual values
applicable to the log message.

Use dot notation to namespace keys when using a nested value from an object.

## What not to log

### Do not log every line of code or function call

Instrumenting every function call or service invocation is better handled by
[Tracing](./tracing.md), or [Profiling](./profiling.md).

### Do not log PII and other sensitive information

- Prefer opaque user IDs over email addresses or full names when possible.
- Passwords, access tokens, API keys, and similar secrets should never appear in
  logs. Store them only in systems designed for secret storage.
- Other types of personal information may also be regulated depending on
  jurisdiction, including age, gender, and postal code.
- Be aware of local and international laws and standards, such as PCI, GDPR,
  CCPA, and HIPAA, which provide guidance on what should and shouldn't be
  logged, retained, or exposed.

Be intentional about what you log. Log the minimum information necessary to
debug and operate your application, and understand the requirements that apply
to your industry, your country, and your customers' countries.

### Large blobs of data (without a specific purpose)

There are good reasons to log large unstructured blobs of data:

- Seeing a full LLM prompt and response may help you understand whether your
  product is behaving as expected.
- Logging a webhook body may help you debug issues with an external integration.

However, logging this type of data has both costs and risks:

- Users may include personal or sensitive information in an LLM prompt.
- Entire HTTP requests and responses may contain access tokens, secrets, or
  other sensitive data.
