# Error monitoring

The baseline signal, and the first thing to set up. Error monitoring captures unhandled exceptions
and crashes, groups them into **issues**, and attaches the context needed to fix them — a stack
trace, breadcrumbs (the events leading up to the error), and request/user/release metadata.

## Why it comes first

Everything else in Sentry builds on errors. An issue is the unit you triage, assign, resolve, and
link a fix to. Until errors are flowing and grouped sensibly, the rest of the signals have nothing to
hang off. So the first milestone for any project is always: **one real error, captured and visible in
Sentry, end to end.**

## What to capture

- **Unhandled exceptions / crashes** — captured automatically once the SDK is initialized. This is
  the bulk of the value and needs no per-error code.
- **Handled-but-notable failures** — a caught exception you still want to know about (a failed
  payment, a degraded fallback) — capture explicitly. Reserve this for things a human should see.
- **Not routine control flow** — expected 404s, validation rejections, and normal branches are
  **not** errors. Capturing them pollutes the issue stream and buries the real problems.

## What makes an error actionable

- **A readable stack trace.** Minified JS or unsymbolicated native frames make an issue nearly
  useless — readable frames depend on source maps (JS) or debug symbols (native/mobile) being in
  place. An error that arrived but isn't readable is not "done."
- **Release and environment.** Tagging each event with the deployed version and environment is what
  unlocks regression detection, "resolved in next release," and separating prod from staging noise.
- **Grouping.** Sentry fingerprints errors into issues by stack trace and type. Good grouping keeps
  one bug as one issue; when grouping is wrong, it's worth tuning rather than living with noise.
- **Context, not PII.** Tags, user identifiers, and breadcrumbs make an error diagnosable — but
  sensitive data should be scrubbed before it leaves the app. Capture what helps debugging, not
  everything.

## Best-practice baseline

Errors on, everywhere, always. Set `release` and `environment` from the start, make sure stack
traces are readable for the platform, and resist the urge to capture routine events as errors. That
baseline is enough to make the issue stream trustworthy; richer signals (tracing, logs, replay) come
after.
