# mdc attributes

Stable Sentry semantic convention attributes for `mdc`.
Generated — do not edit by hand. Re-run `scripts/gen-semantics.py`.

| Key | Type | Brief |
| --- | --- | --- |
| `mdc.<key>` | `string` | Attributes from the Mapped Diagnostic Context (MDC) present at the moment the log record was created. The MDC is supported by all the most popular logging solutions in the Java ecosystem, and it's usually implemented as a thread-local map that stores context for e.g. a specific request. |
