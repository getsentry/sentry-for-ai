# Logging — Sentry Node.js SDK

> Minimum SDK: `@sentry/node` ≥9.41.0 (stable GA)  
> First experimental: ≥9.10.0 (via `_experiments.enableLogs`)  
> Console multi-arg parsing: ≥10.13.0  
> Consola reporter: ≥10.12.0  
> Scope attributes on logs: ≥10.32.0  
> Status: ✅ **Generally Available**

---

## Overview

Sentry Logs are high-cardinality structured log entries that link directly to traces and errors. They let you answer *why* something broke, not just *what* broke.

Key characteristics:
- Sent as structured data — each attribute is individually searchable in Sentry UI
- Automatically linked to the active trace (if tracing is enabled)
- Buffered and batched (max 100 per buffer) — no per-log network overhead
- NOT a replacement for a logging library; designed to complement one

---

## Initialization

`enableLogs: true` is **required**. Logging is disabled by default.

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,                   // REQUIRED — default: false

  beforeSendLog: (log) => {           // optional filter/transform
    if (log.level === "debug") return null;  // null = drop this log
    return log;
  },
});
```

---

## Logger API

All six methods live at `Sentry.logger.*`:

```typescript
Sentry.logger.trace(message, attributes?, options?)
Sentry.logger.debug(message, attributes?, options?)
Sentry.logger.info(message, attributes?, options?)
Sentry.logger.warn(message, attributes?, options?)
Sentry.logger.error(message, attributes?, options?)
Sentry.logger.fatal(message, attributes?, options?)
```

| Method  | Severity # | When to Use                             |
|---------|------------|-----------------------------------------|
| `trace` | 1          | Fine-grained debugging, hot paths       |
| `debug` | 5          | Development diagnostics, variable dumps |
| `info`  | 9          | Normal operations, milestones, events   |
| `warn`  | 13         | Potential issues, degraded state        |
| `error` | 17         | Failures that need attention            |
| `fatal` | 21         | Critical failures, service down         |

**Full TypeScript signature** (same shape for all six methods):

```typescript
function info(
  message: ParameterizedString,          // string or fmt`` tagged template
  attributes?: Record<string, unknown>,  // string | number | boolean values
  options?: { scope?: Scope },           // optional scope override
): void;
```

---

## Basic Usage

```typescript
Sentry.logger.trace("Entering function", { fn: "processOrder" });
Sentry.logger.debug("Cache lookup", { key: "user:123", hit: false });
Sentry.logger.info("Order created", { orderId: "order_456", total: 99.99 });
Sentry.logger.warn("Rate limit approaching", { current: 95, max: 100 });
Sentry.logger.error("Payment failed", { reason: "card_declined", userId: 42 });
Sentry.logger.fatal("Database unavailable", { host: "primary-db", port: 5432 });
```

---

## Parameterized Messages — `Sentry.logger.fmt`

Use the `fmt` tagged template literal to create parameterized messages. Interpolated values are extracted as **individually searchable attributes** in Sentry.

```typescript
const userId = "user_123";
const productName = "Widget Pro";

Sentry.logger.info(
  Sentry.logger.fmt`User ${userId} purchased ${productName}`,
);

// Stored in Sentry as:
// sentry.message.template  → "User '%s' purchased '%s'"
// sentry.message.parameter.0 → "user_123"
// sentry.message.parameter.1 → "Widget Pro"
```

You can combine `fmt` with additional attributes:

```typescript
Sentry.logger.info(
  Sentry.logger.fmt`Order ${orderId} placed by ${userId}`,
  { total: 149.99, itemCount: 3, region: "us-west-2" },
);
```

`fmt` is an alias for `Sentry.parameterize()` internally. The returned string carries hidden `__sentry_template_string__` and `__sentry_template_values__` properties used by the SDK for serialization.

---

## Structured Attributes

The second argument is a plain object. Values must be `string`, `number`, or `boolean`.

```typescript
Sentry.logger.info("API request completed", {
  userId: user.id,
  userTier: user.plan,          // "free" | "pro" | "enterprise"
  endpoint: "/api/orders",
  method: "POST",
  statusCode: 200,
  durationMs: 234,
  orderValue: 149.99,
  isBeta: true,
  retryCount: 0,
});
```

Attributes become filterable columns in the Sentry Logs view.

---

## Scope-Based Attributes (SDK ≥10.32.0)

Set attributes on a scope once and they are automatically attached to every log emitted within that scope.

```typescript
// Global scope — applies to all logs for the app's lifetime
Sentry.getGlobalScope().setAttributes({
  service: "checkout-service",
  version: "2.1.0",
  region: "us-west-2",
});

// Isolation scope — unique per HTTP request (auto-created by HTTP integrations)
Sentry.getIsolationScope().setAttributes({
  org_id: user.orgId,
  user_tier: user.tier,
  request_id: req.id,
});

// Current scope — single operation block
Sentry.withScope((scope) => {
  scope.setAttribute("operation", "payment-processing");
  scope.setAttribute("payment_method", "stripe");

  Sentry.logger.info("Processing payment", { amount: 99.99 });
  // → includes all scope attributes + the explicit { amount }
});
```

---

## Auto-Attached Attributes

The SDK automatically attaches these to every log:

| Attribute Key                | Value                                  |
|------------------------------|----------------------------------------|
| `sentry.environment`         | `environment` from `Sentry.init()`     |
| `sentry.release`             | `release` from `Sentry.init()`         |
| `sentry.sdk.name`            | e.g., `"sentry.javascript.node"`       |
| `sentry.sdk.version`         | e.g., `"10.42.0"`                      |
| `server.address`             | Server hostname / `server_name`        |
| `user.id`                    | Current scope user ID (if set)         |
| `user.name`                  | Current scope username (if set)        |
| `user.email`                 | Current scope user email (if set)      |
| `sentry.message.template`    | Parameterized template (when using `fmt`) |
| `sentry.message.parameter.N` | Positional interpolated values         |

---

## Console Integration

Capture `console.*` calls as Sentry logs using the built-in integration (SDK ≥9.41.0):

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
      // Default levels: ['debug','info','warn','error','log','trace','assert']
    }),
  ],
});

// These now send to Sentry Logs automatically:
console.log("User action:", "checkout");   // → severity: info
console.warn("Memory pressure");           // → severity: warn
console.error("Unhandled rejection");      // → severity: error
```

Multi-argument parsing (args become `message.parameter.N` attributes) requires SDK ≥10.13.0.

---

## Consola Integration (SDK ≥10.12.0)

```typescript
import { createConsola } from "consola";
import * as Sentry from "@sentry/node";

const logger = createConsola();
logger.addReporter(Sentry.createConsolaReporter());

logger.info("This goes to Sentry Logs");
logger.error("This too");
```

---

## `beforeSendLog` Hook

Filter or transform logs before they are sent. Return `null` to drop:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
  beforeSendLog: (log) => {
    // Drop debug logs in production
    if (process.env.NODE_ENV === "production" && log.level === "debug") {
      return null;
    }

    // Scrub sensitive fields
    if (log.attributes?.credit_card) {
      log.attributes.credit_card = "[REDACTED]";
    }

    // Add computed attributes
    log.attributes = {
      ...log.attributes,
      processed_at: Date.now(),
    };

    return log;
  },
});
```

The `log` object shape: `{ level, message, attributes, severityNumber }`.

---

## Third-Party Logger Bridges

Sentry does **not** provide official first-party transports for Winston, Pino, Bunyan, or Morgan. Use the patterns below to forward logs to `Sentry.logger.*`.

**Winston:**

```typescript
import winston from "winston";
import * as Sentry from "@sentry/node";

const levelMap: Record<string, keyof typeof Sentry.logger> = {
  silly: "trace", verbose: "debug", debug: "debug",
  http: "info", info: "info", warn: "warn", error: "error",
};

const sentryTransport = new winston.transports.Stream({
  stream: {
    write: (message: string) => {
      const parsed = JSON.parse(message);
      const fn = levelMap[parsed.level] ?? "info";
      (Sentry.logger[fn] as Function)(parsed.message, parsed.meta ?? {});
    },
  },
});

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console(), sentryTransport],
});
```

**Pino:**

```typescript
import pino from "pino";
import * as Sentry from "@sentry/node";

const PINO_TO_SENTRY: Record<number, keyof typeof Sentry.logger> = {
  10: "trace", 20: "debug", 30: "info",
  40: "warn", 50: "error", 60: "fatal",
};

const dest = pino.destination({
  write(chunk: string) {
    const log = JSON.parse(chunk);
    const fn = PINO_TO_SENTRY[log.level] ?? "info";
    const { msg, level, time, pid, hostname, ...attrs } = log;
    (Sentry.logger[fn] as Function)(msg, attrs);
  },
});

const logger = pino({ level: "trace" }, dest);
```

---

## Trace Linking

Logs emitted during an active span automatically include `sentry.trace.parent_span_id`, linking them to the active trace. From a log in Sentry you can navigate to its parent trace; from a trace you can see all logs emitted during that request.

---

## Log Buffering and Flushing

Logs are buffered in memory (max 100 per buffer: `MAX_LOG_BUFFER_SIZE = 100`). The buffer flushes automatically when full or on `client.close()`.

For **serverless or short-lived processes**, flush explicitly before exit:

```typescript
await Sentry.flush(2000);  // flush with 2s timeout
await Sentry.close(2000);  // flush + close all transports
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Logs not appearing in Sentry | `enableLogs` not set | Add `enableLogs: true` to `Sentry.init()` |
| `Sentry.logger` is undefined | SDK < 9.41.0 | Upgrade to ≥9.41.0 |
| Attributes not searchable | Using complex objects | Use only `string`, `number`, `boolean` values |
| Console logs not captured | Missing integration | Add `consoleLoggingIntegration()` to `integrations` |
| Logs cut off in serverless | Buffer not flushed | Call `await Sentry.flush(2000)` before function returns |
| `fmt` values not parameterized | Using string interpolation | Use tagged template: `` fmt`msg ${val}` `` not `"msg " + val` |
| Logs missing trace link | No active span | Enable tracing with `tracesSampleRate` |
| `beforeSendLog` not firing | `enableLogs: false` | Logs are dropped before the hook if logging is disabled |
| Scope attributes missing from logs | SDK < 10.32.0 | Upgrade to ≥10.32.0 for scope attribute inheritance |
| Consola reporter not working | SDK < 10.12.0 | Upgrade to ≥10.12.0 |
