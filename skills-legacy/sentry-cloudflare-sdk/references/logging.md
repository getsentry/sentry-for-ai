# Logging — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v9.41.0+ (stable GA)
> First experimental: v9.10.0+ (via `_experiments.enableLogs`)
> Status: ✅ **Generally Available**

---

## Overview

Sentry Logs are high-cardinality structured log entries that link directly to traces and errors. They let you answer *why* something broke, not just *what* broke.

Key characteristics:
- Sent as structured data — each attribute is individually searchable in Sentry UI
- Automatically linked to the active trace (if tracing is enabled)
- Buffered and batched — no per-log network overhead
- NOT a replacement for a logging library; designed to complement one

---

## Initialization

`enableLogs: true` is **required**. Logging is disabled by default.

```typescript
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    enableLogs: true,
    tracesSampleRate: 1.0,

    beforeSendLog: (log) => {
      // Optional: filter or transform logs
      if (log.level === "debug") return null; // Drop debug logs
      return log;
    },
  }),
  handler,
);
```

---

## Logger API

All six methods live at `Sentry.logger.*`:

```typescript
Sentry.logger.trace("Processing request for path %s", [request.url]);
Sentry.logger.debug("Cache lookup result: %s", [cacheHit ? "hit" : "miss"]);
Sentry.logger.info("User %s authenticated successfully", [userId]);
Sentry.logger.warn("Rate limit approaching for key %s: %d/%d", [apiKey, current, limit]);
Sentry.logger.error("Payment processing failed for order %s", [orderId]);
Sentry.logger.fatal("Worker initialization failed: %s", [error.message]);
```

### Signature

```typescript
Sentry.logger.<level>(message: string, params?: unknown[], attributes?: Record<string, unknown>)
```

- **`message`** — format string with `%s`, `%d`, `%f`, `%o`, `%O` placeholders (printf-style)
- **`params`** — parameter values substituted into the format string
- **`attributes`** — structured key-value data attached to the log entry

### With Attributes

```typescript
Sentry.logger.info("Request processed", [], {
  "http.method": request.method,
  "http.url": request.url,
  "http.status_code": response.status,
  "response.time_ms": elapsed,
});
```

---

## Console Integration

The `consoleIntegration` (enabled by default) captures `console.log`, `console.warn`, `console.error`, etc. as **breadcrumbs** — not as Sentry Logs.

For actual Sentry Logs that appear in the Logs product, use `Sentry.logger.*`.

To also forward `console.*` calls to Sentry Logs, add the `consoleLoggingIntegration`:

```typescript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    enableLogs: true,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  }),
  handler,
);
```

This captures `console.warn()` and `console.error()` calls as Sentry Logs in addition to their normal breadcrumb behavior.

---

## Log-to-Trace Correlation

When tracing is enabled, logs are automatically linked to the active trace. In the Sentry UI, you can navigate from a log entry to the trace timeline and vice versa.

```typescript
await Sentry.startSpan(
  { op: "function", name: "processOrder" },
  async () => {
    Sentry.logger.info("Starting order processing for %s", [orderId]);

    await validateOrder(orderId);
    Sentry.logger.debug("Order validated", [], { orderId });

    await chargePayment(orderId);
    Sentry.logger.info("Payment charged for order %s", [orderId]);
  },
);
// All three log entries are linked to the "processOrder" span
```

---

## Configuration

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `enableLogs` | `boolean` | `false` | Must be `true` to enable Sentry Logs |
| `beforeSendLog` | `(log) => log \| null` | — | Filter or modify logs; return `null` to drop |

---

## Best Practices

1. **Use structured attributes** — put searchable data in the `attributes` parameter, not in the message string. This makes logs filterable in the Sentry UI.

2. **Use format strings with parameters** — `Sentry.logger.info("User %s did %s", [userId, action])` is better than template literals because Sentry can group similar logs.

3. **Don't log everything** — Sentry Logs are for observability, not a firehose. Focus on key events: authentication, payment, external API calls, errors.

4. **Combine with `console.log` for local dev** — `Sentry.logger.*` sends to Sentry only. Keep `console.log` for local development output and `Sentry.logger.*` for production observability.

5. **Filter noisy logs** — use `beforeSendLog` to drop debug/trace level logs in production if they generate too much volume.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Verify `enableLogs: true` is set in init options |
| Logs not linked to traces | Ensure tracing is enabled (`tracesSampleRate` or `tracesSampler` set) |
| `console.log` not in Sentry Logs | `console.*` creates breadcrumbs, not Logs. Use `consoleLoggingIntegration` to also forward to Sentry Logs |
| Log volume too high | Use `beforeSendLog` to filter by level or content; avoid logging in tight loops |
