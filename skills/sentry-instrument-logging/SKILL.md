---
name: sentry-instrument-logging
description: Instruments structured Sentry logs in a new or existing application.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
---

# Instrument Sentry Logging

This skill adds structured Sentry logs to an application following the guidance
in [Instrumentation guidance](#instrumentation-guidance).

The goal is to provide a small set of high-value log messages that make
production behavior easier to understand and debug.

The log messages added by this skill should also serve as clear, repeatable,
examples that users can follow when instrumenting the rest of their application.

## Prerequisites

The repository should already have basic Sentry configuration.

If Sentry has not yet been configured, offer to set it up using the appropriate
[skills](./).

## Steps

1. **Inventory every application in the repository.** Locate language/runtime
   manifests (`composer.json`, `package.json`, `go.mod`, `Gemfile`,
   `pyproject.toml`, `Cargo.toml`, …). Each manifest typically marks a
   separately deployed application. Produce an explicit table and treat it as
   the work list for the rest of this skill:

   | App | Path | Language | Sentry SDK? | Logging abstraction | Status |
   |-----|------|----------|-------------|---------------------|--------|

   If the repo has more than ~2 apps, confirm scope with the user before
   starting: which apps to instrument now, and at what depth.

2. **Establish shared conventions once, up front** — before touching any app.
   Decide on consistent attribute namespacing (e.g. `myapp.<domain>.<field>`),
   event-name phrasing, and log levels, so logs from every language can be
   searched and correlated together. Record these so each per-app pass follows
   them. Note service boundaries that propagate trace headers
   (baggage / sentry-trace) — logs on both sides of such a call should share
   attribute names so a single trace reads coherently across languages.

3. **For each application in the inventory, complete the full pass below before
   moving to the next**, updating its Status as you go
   (`not started → configured → instrumented → verified`):

   a. Read the corresponding language-specific skill in [skills](../) and
      confirm Sentry logging is configured.
   b. Determine the app's logging abstraction (Monolog/PHP, slog/Go,
      Rails logger/Ruby, Pino or console/JS). If Sentry supports it, configure
      that integration; otherwise use Sentry's logging SDK directly.
   c. Identify a small number of high-value log messages, prioritizing runtime
      decisions, important algorithms, audit events, and context around
      recoverable failures. Follow
      [Valuable log entries to instrument](#valuable-log-entries-to-instrument).
   d. Add structured logs following the shared conventions from Step 2 and the
      [Instrumentation guidance](#instrumentation-guidance).
   e. Verify: run the app's lint/type/test tooling if available, and confirm
      logs are emitted. If the toolchain isn't available locally,
      say so explicitly rather than implying it passed.

4. **Apply a high-value log validation check.** Review every added or modified log line
   and remove or revise any log that does not pass this check:

   | Check | Question |
   |-------|----------|
   | Production question | What concrete production question does this log answer? |
   | Signal | Would this still be useful if emitted hundreds or thousands of times? |
   | Telemetry fit | Is this better represented as a trace, metric, or Sentry error? |
   | Existing coverage | Is this already captured by an exception, existing log, or shared API/client wrapper? |
   | Structure | Are event names and attributes consistent with the shared conventions? |
   | Safety | Does it avoid PII, secrets, raw payloads, and unstable exception messages? |
   | Actionability | Would seeing this log change how someone investigates or responds? |

   Prefer removing logs that merely confirm routine UI interactions, duplicate
   generic API failures, or record expected validation failures without adding
   meaningful context.

   Keep logs that explain important runtime decisions, summarize multi-step
   workflows, record important audit/business events, or provide context around
   recoverable failures.

   For each remaining log, be able to write a one-sentence justification:
   "This log is valuable because it helps answer <specific question>."

5. **Reconcile against the inventory.** Confirm every in-scope app reached
   `verified` (or was explicitly deferred). Report per-app status so partial
   coverage is never mistaken for full coverage.

## Instrumentation guidance

### When to reach for logging, vs., other types of telemetry

Logs are ideal for recording the context and decisions that explain what
happened during an application's execution.

- For measuring the performance and flow of requests, use tracing.
- For unexpected critical failures, use errors.

### Valuable log entries to instrument

#### Important runtime decisions made by your application

The decisions your application makes while serving a request are often the
missing context needed to explain production behaviour.

Examples include:

- A user has a feature flag enabled, resulting in a different code path.
- Mobile users are redirected to a different experience.
- Paid and free users receive different functionality.

This information can be useful both as a standalone log entry, for example when
a feature flag is evaluated, and as structured context included with later log
messages.

#### Whether a feature or algorithm is behaving as expected

Logs are useful when a feature performs multiple steps. By recording
intermediate outcomes, you can understand where a process is breaking down and
why.

Here's an example from a site that allows users to import a logbook from another
service:

```js
Sentry.logger.info("Aurora import started", {
  "import.source": "aurora",
  "import.entries_received": body.ascents.length,
});

// Algorithm runs here...

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

Key stages are logged and the final outcome summarizes the work performed,
making it easier to understand where the import succeeded, failed, or produced
unexpected results.

#### Audit and access events (creates, updates, deletes, access, permissions)

Audit logs help answer questions like "Who changed this?", "When did it
happen?", and "Was this action expected?"

Log important changes to application state, such as entities being created,
updated, deleted, viewed, or having permissions modified.

Use good judgment. Most applications don't need a log entry for every database
operation, but they often benefit from recording security-sensitive actions and
important business events.

#### Context surrounding errors and failures

For exceptions, you'll often be better off using errors rather than adding a log
line.

Not every failure should become a Sentry issue.

Examples of failures that are often better represented as log messages include:

* Failures from non-critical, optional upstream services.
* Failures that occur in a retry loop prior to the final attempt.

For these types of `error` log messages, consider including:

* Retry count.
* Response status code and important non-sensitive request or response fields
  for external API calls.
* Runtime decisions leading up to the failure.

### How to structure log messages

#### Use structured log messages

Use structured logs that capture information as consistent key/value pairs.

Use consistent field names throughout the application so similar events can be
searched, aggregated, and compared.

A good log message typically answers three questions:

* Who performed the action (for example, the authenticated user).
* What happened (a human-readable message and supporting metadata).
* When it happened (typically added automatically by the logging system).

Use Sentry's SDK when appropriate for setting context globally. For example,
`set_user` is available in many SDKs to attach authenticated user information
to all events in a single location.

#### Add context as a request evolves

Logs should accumulate context as a request moves through your application.

Early log messages may contain only request information. Later messages can add
authenticated user information, feature flags, runtime decisions, and
event-specific metadata.

Sentry automatically attaches a Trace ID to log messages, allowing them to be
correlated with traces.

#### Choose the appropriate log level

Using appropriate log levels conveys additional meaning in your log messages.

Use `debug` for temporary diagnostic information.

Use `info` for normal application events and contextual information.

Use `warn` for recoverable situations that deserve attention but do not prevent
the application from functioning correctly.

Use `error` for unexpected failures that are handled gracefully. Prefer errors
for exceptions that should become Sentry issues.

#### How to log objects

Avoid logging entire objects. Instead, log only the fields relevant to the
event, using dot notation to namespace nested values.

Omit optional attributes when they are not present instead of logging empty
strings, `null`, or placeholder values.

### What not to log

#### Do not log every line of code or function call

Instrumenting every function call or service invocation is better handled by
tracing or profiling.

#### Do not log PII and other sensitive information

Assume anything written to logs may eventually be viewed by another human.

* Prefer opaque user IDs over email addresses, usernames, or full names whenever
  possible, including when setting global user context (for example via
  `set_user`).
* Passwords, access tokens, API keys, and similar secrets should never appear
  in logs.
* Other types of personal information may also be regulated depending on
  jurisdiction, including age, gender, and postal code.
* Be aware of laws and standards such as PCI, GDPR, CCPA, and HIPAA when
  deciding what should be logged, retained, or exposed.

Be intentional about what you log. Log the minimum information necessary to
debug and operate your application.

#### Large blobs of data (without a specific purpose)

There are legitimate reasons to log large unstructured blobs of data:

* Seeing a full LLM prompt and response may help you understand whether your
  product is behaving as expected.
* Logging a webhook body may help you debug issues with an external integration.

However, logging this type of data has both costs and risks:

* Users may include personal or sensitive information in an LLM prompt.
* Entire HTTP requests and responses may contain access tokens, secrets, or
  other sensitive data.

When possible, prefer logging the specific fields you expect to query rather
than entire payloads.

### Skill-specific guidance

The purpose of this skill is to demonstrate good logging practices, not to
maximize log coverage.

Prefer adding a handful of high-value log messages over instrumenting every
possible code path.

Each log message should:

* Be immediately useful when debugging production behaviour.
* Demonstrate effective use of structured logging.
* Serve as a practical example that users can follow elsewhere in the codebase.

For small codebases, add enough representative logs that the result serves as a
practical model for future instrumentation.

For large codebases, focus on a few representative locations rather than trying
to instrument everything.

Strongly prefer using the SDK's setUser functionality to associate logs with
the authenticated user, rather than repeating user identifiers as log attributes.
Only include user identifiers as log attributes when they describe something other
than the authenticated user.

### When the codebase already has logging

Before adding new log lines, inspect existing logs and identify gaps.

Prefer to:

- Improve existing logs by making them structured.
- Add missing context to existing important logs.
- Add logs only where an important production question is currently unanswered.
  Pay specific attention to whether the failure is already represented as an
  uncaught exception, and therefore likely captured by Sentry errors.
