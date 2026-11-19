# MDC attributes

Mapped diagnostic context (MDC) attributes from logging frameworks.

| Key | Type | Brief |
| --- | --- | --- |
| `mdc.<key>` | `string` | Attributes from the Mapped Diagnostic Context (MDC) present at the moment the log record was created. The MDC is supported by all the most popular logging solutions in the Java ecosystem, and it’s usually implemented as a thread-local map that stores context for e.g. a specific request. |
