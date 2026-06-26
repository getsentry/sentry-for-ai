# Logging — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥9.41.0+ for `Sentry.logger` API and `enableLogs`  
> `consoleLoggingIntegration()` multi-arg parsing: requires ≥10.13.0+  
> Scope-based attributes (`getGlobalScope`, `getIsolationScope`): requires ≥10.32.0+

> ⚠️ **Not available via CDN/loader snippet** — NPM install required.

---

## Enabling Logs

`enableLogs` must be set in **all three** Next.js runtime config files:

```typescript
// instrumentation-client.ts → use NEXT_PUBLIC_SENTRY_DSN
// sentry.server.config.ts   → use SENTRY_DSN
// sentry.edge.config.ts     → use SENTRY_DSN
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // use NEXT_PUBLIC_SENTRY_DSN in client config
  enableLogs: true, // Required — logging is disabled by default
});
```

Without `enableLogs: true`, all `Sentry.logger.*` calls are silently no-ops.

---

## Logger API — Six Levels

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.logger.trace("Entering processOrder", { fn: "processOrder", orderId: "ord_1" });
Sentry.logger.debug("Cache lookup", { key: "user:123", hit: false });
Sentry.logger.info("Order created", { orderId: "order_456", total: 99.99 });
Sentry.logger.warn("Rate limit approaching", { current: 95, max: 100 });
Sentry.logger.error("Payment failed", { reason: "card_declined", userId: "u_1" });
Sentry.logger.fatal("Database unavailable", { host: "db-primary" });
```

| Level | Method | Typical Use |
|-------|--------|-------------|
| `trace` | `Sentry.logger.trace()` | Ultra-granular function entry/exit; high-volume — filter out in production |
| `debug` | `Sentry.logger.debug()` | Development diagnostics, cache hits/misses |
| `info` | `Sentry.logger.info()` | Normal business milestones, confirmations |
| `warn` | `Sentry.logger.warn()` | Degraded state, approaching limits, recoverable issues |
| `error` | `Sentry.logger.error()` | Failures requiring attention |
| `fatal` | `Sentry.logger.fatal()` | Critical failures, system unavailable |

**Attribute value types:** `string`, `number`, `boolean` only — `undefined`, arrays, and objects are not accepted.

---

## Parameterized Messages — `Sentry.logger.fmt`

The `fmt` tagged template literal binds each interpolated variable as a **structured, searchable attribute** in Sentry:

```typescript
const userId = "user_123";
const productName = "Widget Pro";
const amount = 49.99;

Sentry.logger.info(
  Sentry.logger.fmt`User ${userId} purchased ${productName} for $${amount}`
);
```

This produces:
```
message.template:     "User %s purchased %s for $%s"
message.parameter.0:  "user_123"
message.parameter.1:  "Widget Pro"
message.parameter.2:  49.99
```

Each parameter is independently searchable in Sentry's log explorer.

> ⚠️ `logger.fmt` must be used as a **tagged template literal** — not a function call. `Sentry.logger.fmt("text")` will not produce structured parameters.

### When to use `fmt` vs plain attributes

| Approach | Use when |
|----------|----------|
| `Sentry.logger.info(msg, { key: val })` | Variables are logically distinct attributes with names |
| `Sentry.logger.info(Sentry.logger.fmt\`...\`)` | Variables are part of a human-readable sentence |

---

## Console Capture — `consoleLoggingIntegration`

Automatically forwards `console.*` calls to Sentry as structured logs:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"], // which console methods to forward
    }),
  ],
});
```

Multiple arguments are mapped to positional parameters (requires SDK ≥10.13.0):
```
console.log("User action recorded", userId, success)
  → message.parameter.0 = <userId value>
  → message.parameter.1 = <success value>
```

| Console method | Sentry log level |
|----------------|-----------------|
| `console.log` | `info` |
| `console.info` | `info` |
| `console.warn` | `warn` |
| `console.error` | `error` |
| `console.debug` | `debug` |
| `console.assert` (failing) | `error` |

---

## Log Filtering — `beforeSendLog`

Use `beforeSendLog` to drop, modify, or scrub logs before they are sent. Return `null` to discard:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  beforeSendLog: (log) => {
    // Drop debug and trace logs in production
    if (log.level === "debug" || log.level === "trace") {
      return null;
    }

    // Scrub sensitive attribute keys
    if (log.attributes?.password) {
      delete log.attributes.password;
    }
    if (log.attributes?.["credit_card"]) {
      log.attributes["credit_card"] = "[REDACTED]";
    }

    // Drop noisy health-check logs by message content
    if (log.message?.includes("/health")) {
      return null;
    }

    return log; // send the (possibly modified) log
  },
});
```

### The `log` object shape

| Field | Type | Description |
|-------|------|-------------|
| `level` | `string` | `"trace"` \| `"debug"` \| `"info"` \| `"warn"` \| `"error"` \| `"fatal"` |
| `message` | `string` | The log message text |
| `timestamp` | `number` | Unix timestamp |
| `attributes` | `object` | Key/value pairs attached to this log |

---

## Scope-Based Automatic Attributes (SDK ≥10.32.0)

Attributes set on scopes are automatically added to all logs emitted within that scope.

```typescript
// Global scope — shared across the entire app lifetime
Sentry.getGlobalScope().setAttributes({
  service: "checkout",
  version: "2.1.0",
});

// Isolation scope — unique per request
// ⚠️ CRITICAL for Next.js server-side: use isolation scope (not global)
// to prevent attributes from one request leaking into another
Sentry.getIsolationScope().setAttributes({
  org_id: user.orgId,
  user_tier: user.tier,
});

// Current scope — wraps a single operation
Sentry.withScope((scope) => {
  scope.setAttribute("request_id", req.id);
  Sentry.logger.info("Processing order"); // gets request_id attribute
});
```

> ⚠️ **Next.js server-side isolation:** Always use `getIsolationScope()` for per-request data on the server. The isolation scope is unique per request, preventing attributes from one user's request from bleeding into another's concurrent request.

---

## Third-Party Logger Integrations

### Pino (SDK ≥10.18.0)

```typescript
// sentry.server.config.ts — Pino is a Node.js integration (server-side only)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],
});
// No changes needed to your pino logger — it auto-captures logs
```

### Consola (SDK ≥10.12.0)

```typescript
import { consola } from "consola";

const sentryReporter = Sentry.createConsolaReporter({
  levels: ["error", "warn"], // optional: only forward these levels
});

consola.addReporter(sentryReporter);
```

### Winston (SDK ≥9.13.0)

```typescript
import winston from "winston";
import Transport from "winston-transport";

const SentryTransport = Sentry.createSentryWinstonTransport(Transport, {
  levels: ["error", "warn"],
});

const logger = winston.createLogger({
  transports: [new SentryTransport()],
});
```

---

## Auto-Generated Attributes

These are added by the SDK to every log without any developer configuration:

| Attribute | Notes |
|-----------|-------|
| `sentry.environment` | Always present |
| `sentry.release` | Always present |
| `sentry.sdk.name` | e.g., `"sentry.javascript.nextjs"` |
| `sentry.sdk.version` | Always present |
| `browser.name`, `browser.version` | Client-side only |
| `user.id`, `user.name`, `user.email` | When `Sentry.setUser()` + `sendDefaultPii: true` |
| `sentry.trace.parent_span_id` | When inside an active span (enables log ↔ trace correlation) |
| `sentry.replay_id` | Client-side with Replay enabled |
| `server.address` | Server-side only |
| `message.template` | When using `logger.fmt` |
| `message.parameter.N` | When using `logger.fmt` or `consoleLoggingIntegration` |

---

## Next.js-Specific: Three-Runtime Configuration

For consistency across all runtimes, enable logging in all three config files:

```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
});

// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()], // or consoleLoggingIntegration
});

// sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
});
```

### Server Action Logging Example

```typescript
// app/actions/order.ts
"use server";
import * as Sentry from "@sentry/nextjs";

export async function createOrder(formData: FormData) {
  // Use isolation scope for per-request context on the server
  Sentry.getIsolationScope().setAttributes({
    action: "createOrder",
    userId: formData.get("userId") as string,
  });

  Sentry.logger.info("Order creation started", {
    productId: formData.get("productId") as string,
  });

  try {
    const order = await db.orders.create(/* ... */);
    Sentry.logger.info("Order created successfully", { orderId: order.id });
    return order;
  } catch (err) {
    Sentry.logger.error("Order creation failed", {
      reason: (err as Error).message,
    });
    throw err;
  }
}
```

---

## Best Practice: Wide Events

Prefer **one comprehensive log with all context** over many fragmented logs:

```typescript
// ✅ Preferred — one wide log with full context
Sentry.logger.info("Checkout completed", {
  orderId: order.id,
  userId: user.id,
  cartValue: cart.total,
  itemCount: cart.items.length,
  paymentMethod: "stripe",
  userTier: user.tier,
  durationMs: Date.now() - startTime,
});

// ❌ Avoid — fragmented logs that are hard to correlate
Sentry.logger.info("Cart validated");
Sentry.logger.info("Payment processed");
Sentry.logger.info("Checkout done");
```

---

## SDK Version Matrix

| Feature | Min SDK Version |
|---------|----------------|
| `enableLogs` / `Sentry.logger.*` | **9.41.0** |
| Winston transport | 9.13.0 |
| Consola reporter | 10.12.0 |
| Console integration multi-arg parsing | 10.13.0 |
| Pino integration | 10.18.0 |
| Scope attributes (`setAttributes`) | **10.32.0** |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Verify `enableLogs: true` in `Sentry.init()`; check all three config files (client, server, edge) |
| `logger.fmt` not creating `message.parameter.*` | Use as tagged template: `Sentry.logger.fmt\`text ${var}\`` — not `Sentry.logger.fmt("text", var)` |
| Logs not linked to traces | Ensure `tracesSampleRate` > 0 and the log is emitted inside an active span |
| `consoleLoggingIntegration` not available | Upgrade to ≥10.13.0 |
| Scope attributes not appearing | Upgrade to ≥10.32.0; use `getIsolationScope()` (not `getGlobalScope()`) for server request data |
| Cross-request attribute leakage on server | Replace `getGlobalScope()` with `getIsolationScope()` for per-request data |
| Too many logs / high volume | Use `beforeSendLog` to drop `trace` and `debug` levels in production |
| Log attributes contain `undefined` | Only `string`, `number`, `boolean` are accepted — filter out undefined values |
| `beforeSendLog` not firing | Confirm `enableLogs: true` is set — without it, no logs are processed |
| Sensitive data appearing in logs | Add filtering in `beforeSendLog`; better yet, avoid logging sensitive data at the call site |
| Edge runtime logs missing | Add `enableLogs: true` to `sentry.edge.config.ts` |
