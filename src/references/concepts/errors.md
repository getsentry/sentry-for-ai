# Error monitoring

Unhandled exceptions and crashes — plus anything you send explicitly with `captureException` — grouped
into **issues** with the context needed to fix them: a stack trace, breadcrumbs (the events leading up
to the error), and request/user/release metadata. An issue is the unit you triage, assign, resolve, and
link a fix to.

## What an issue actually is

- An **issue is a group of events** sharing a fingerprint (stack trace + exception type/message), not a
  single occurrence. Sentry surfaces one **representative event** — the one richest in context, which
  is not necessarily the latest — so you reason about the group and drill into an event for specifics.
- **The cause isn't always in the stack trace.** Suspect commits tie the issue to the commit that
  likely introduced it, and a **trace-related issue** points to a *different* issue in the same request
  that may be the real origin — the crash you're looking at can be a downstream symptom.
- **When one bug shows up as several issues (or several bugs as one), that's a grouping problem** — the
  fingerprint is tunable, not something to live with.

## What makes an error actionable

- **A readable stack trace** — minified JS or unsymbolicated native frames make an issue nearly
  useless; readable frames depend on source maps (JS) or debug symbols (native/mobile) being uploaded.
- **`release` and `environment` tags** — unlock regression detection, resolve-in-next-release, and
  separating prod from staging noise. Set them from the start.
- **Context, not PII** — tags, user IDs, and breadcrumbs make an error diagnosable; scrub sensitive
  data before it leaves the app ([`data-scrubbing.md`](data-scrubbing.md)).
- **Not routine control flow** — expected 404s and validation rejections aren't errors; capturing them
  buries the real problems.

## Related

- [`tracing.md`](tracing.md)
- [`releases.md`](releases.md)
- [`data-scrubbing.md`](data-scrubbing.md)
