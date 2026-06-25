# Errors

When should a developer rely on Sentry error-tracking, vs., other types of
telemetry.

---

## When to use errors, vs., other types of telemetry

Errors are ideal for unexpected failures in your application that are likely to
require investigation.

By emitting these failures as errors, you can take advantage of Sentry's issue
platform. Issues provide mechanisms for triage, grouping, assignment, and
detecting regresions.

For recoverable, non-critical, errors, use [Logging](./logging.md).
