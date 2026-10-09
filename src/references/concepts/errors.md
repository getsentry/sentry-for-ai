# Error monitoring

Unhandled exceptions, crashes, and anything sent with `captureException`, grouped into
issues. See [Issues](https://docs.sentry.io/product/issues/).

When one bug shows up as several issues (or several bugs as one), that is a grouping
problem. Tune the fingerprint.
The cause is not always in the stack trace: check suspect commits and the trace-related
issue, which can point to the real origin.

## What makes an error actionable

- **A readable stack trace** — minified JS or unsymbolicated native frames make an issue
  nearly useless; readable frames depend on source maps (JS) or debug symbols
  (native/mobile) being uploaded.
- **`release` and `environment` tags** — unlock regression detection,
  resolve-in-next-release, and separating prod from staging noise.
  Set them from the start.
- **Context, not PII** — tags, user IDs, and breadcrumbs make an error diagnosable;
  scrub sensitive data before it leaves the app
  ([`data-scrubbing.md`](data-scrubbing.md)).
- **Not routine control flow** — expected 404s and validation rejections aren’t errors;
  capturing them buries the real problems.

## Related

- [`tracing.md`](tracing.md)
- [Releases](https://docs.sentry.io/product/releases/)
- [`data-scrubbing.md`](data-scrubbing.md)
