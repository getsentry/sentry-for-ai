# Logging — Sentry Svelte/SvelteKit SDK

> Minimum SDK: `@sentry/sveltekit` ≥9.41.0+ / `@sentry/svelte` ≥9.41.0+ for `Sentry.logger` API  
> `consoleLoggingIntegration()`: requires ≥10.13.0+  
> Scope-based attribute setters (`getIsolationScope`, `getGlobalScope`): requires ≥10.32.0+

> ⚠️ **Not available via CDN/loader snippet** — NPM install required.

---

## Enabling Logs

`enableLogs` is opt-in. Add it to every `Sentry.init()` call where you want logs captured.

### SvelteKit — both files

```typescript
// src/instrumentation.server.ts (or hooks.server.ts for legacy)
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableLogs: true,
});
```

```typescript
// src/hooks.client.ts
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
});

export const handleError = Sentry.handleErrorWithSentry();
```

### Standalone Svelte — main.ts

```typescript
import * as Sentry from "@sentry/svelte";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
});
```

---

## Logger API — Six Levels

```typescript
import * as Sentry from "@sentry/sveltekit"; // or "@sentry/svelte"

Sentry.logger.trace("Entering processOrder", { fn: "processOrder", orderId: "ord_1" });
Sentry.logger.debug("Cache lookup", { key: "user:123", hit: false });
Sentry.logger.info("Order created", { orderId: "order_456", total: 99.99 });
Sentry.logger.warn("Rate limit approaching", { current: 95, max: 100 });
Sentry.logger.error("Payment failed", { reason: "card_declined", userId: "u_1" });
Sentry.logger.fatal("Database unavailable", { host: "db-primary", port: 5432 });
```

| Level | Intent |
|-------|--------|
| `trace` | Fine-grained debugging, high-volume — filter aggressively in production |
| `debug` | Development diagnostics |
| `info` | Normal operations, business milestones |
| `warn` | Degraded state, near-limit conditions |
| `error` | Failures requiring attention |
| `fatal` | Critical failures, system-down conditions |

**Attribute value types:** `string`, `number`, `boolean` only.

---

## Parameterized Messages (`logger.fmt`)

Use `logger.fmt` tagged template literals to bind variables as **structured, searchable attributes** in Sentry:

```typescript
const userId = "user_123";
const productName = "Widget Pro";
const amount = 49.99;

Sentry.logger.info(
  Sentry.logger.fmt`User ${userId} purchased ${productName} for $${amount}`
);
```

Results in:
```
message.template:     "User %s purchased %s for $%s"
message.parameter.0:  "user_123"
message.parameter.1:  "Widget Pro"
message.parameter.2:  49.99
```

This allows filtering in Sentry by any individual parameter value, not just the full message string.

---

## Console Capture Integration

Automatically forwards `console.*` calls to Sentry as structured logs. Requires SDK ≥10.13.0.

```typescript
Sentry.init({
  dsn: "...",
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],  // which console levels to forward
    }),
  ],
});

// These are now automatically sent to Sentry:
console.log("User action", { userId: 123, action: "checkout" });
console.warn("High memory usage", 85, "%");
console.error("Fetch failed", new Error("timeout"));
```

`console.log("Text", 123, true)` → `message.parameter.0 = 123`, `message.parameter.1 = true`

### Consola integration (SvelteKit server-side)

For apps using the `consola` logging library (common in SvelteKit SSR):

```typescript
// SDK >= 10.12.0
import consola from "consola";
import * as Sentry from "@sentry/sveltekit";

const reporter = Sentry.createConsolaReporter();
consola.addReporter(reporter);
```

---

## Scope-Based Automatic Attributes (SDK ≥10.32.0)

Attributes set on scopes are **automatically added to all subsequent logs** within that scope — no need to repeat them on every log call.

### Global scope (process lifetime)

```typescript
// Set once at startup — applies everywhere, client and server
Sentry.getGlobalScope().setAttributes({
  service: "checkout-service",
  version: "2.1.0",
  region: "us-east-1",
});
```

### Isolation scope (per-request in SvelteKit)

SvelteKit creates a new isolation scope per server request. Set per-request context here:

```typescript
// src/hooks.server.ts — enrich every server log with request context
import * as Sentry from "@sentry/sveltekit";

export const handle = sequence(
  Sentry.sentryHandle(),
  async ({ event, resolve }) => {
    Sentry.getIsolationScope().setAttributes({
      org_id: event.locals.user?.orgId,
      user_tier: event.locals.user?.tier,
      request_id: event.request.headers.get("x-request-id") ?? undefined,
    });
    return resolve(event);
  }
);
```

### Current scope (narrowest, single operation)

```typescript
Sentry.withScope((scope) => {
  scope.setAttribute("order_id", "ord_789");
  scope.setAttribute("payment_method", "stripe");
  Sentry.logger.info("Processing payment", { amount: 49.99 });
  // order_id and payment_method are included in this log only
});
```

---

## Log Filtering with `beforeSendLog`

```typescript
Sentry.init({
  dsn: "...",
  enableLogs: true,
  beforeSendLog: (log) => {
    // Drop debug logs in production
    if (log.level === "debug" || log.level === "trace") return null;

    // Scrub sensitive attribute keys
    if (log.attributes?.password) {
      delete log.attributes.password;
    }
    if (log.attributes?.["credit_card"]) {
      log.attributes["credit_card"] = "[REDACTED]";
    }

    // Drop health-check noise
    if (log.attributes?.["http.target"] === "/health") return null;

    return log;
  },
});
```

---

## Auto-Generated Attributes

The SDK adds these to every log without any developer action:

| Attribute | Source | Notes |
|-----------|--------|-------|
| `environment` | `Sentry.init({ environment })` | — |
| `release` | `Sentry.init({ release })` | — |
| `sdk.name`, `sdk.version` | SDK internals | — |
| `browser.name`, `browser.version` | User-Agent | Client-side only |
| `user.id`, `user.name`, `user.email` | `Sentry.setUser()` | When `sendDefaultPii: true` |
| `sentry.trace.parent_span_id` | Active tracing span | If tracing is enabled |
| `sentry.replay_id` | Active replay session | If Session Replay is enabled |
| `message.template`, `message.parameter.X` | `logger.fmt` usage | — |
| `sentry.origin` | Integration-generated logs | — |

---

## Trace + Log Correlation

When tracing is enabled alongside logging, logs are **automatically linked** to the current trace:

```typescript
Sentry.init({
  dsn: "...",
  enableLogs: true,
  tracesSampleRate: 1.0,
  integrations: [Sentry.browserTracingIntegration()],
});

// Inside an active span, logs get sentry.trace.parent_span_id automatically
await Sentry.startSpan({ name: "process-order", op: "task" }, async () => {
  Sentry.logger.info("Validating cart", { cartId: "cart_abc" });
  // ^ this log is linked to the "process-order" span in Sentry UI
  await validateCart();
  Sentry.logger.info("Payment initiated", { gateway: "stripe" });
});
```

Navigate from log → parent span, or from span → correlated logs, in the Sentry UI.

---

## SvelteKit Server-Side Logging

On the server side, `enableLogs: true` in `instrumentation.server.ts` enables `Sentry.logger.*` in:
- `hooks.server.ts` handle functions
- `+page.server.ts` / `+layout.server.ts` load functions
- API routes (`+server.ts`)

```typescript
// src/routes/api/orders/+server.ts
import * as Sentry from "@sentry/sveltekit";
import { json } from "@sveltejs/kit";

export const POST = async ({ request }) => {
  const body = await request.json();

  Sentry.logger.info(
    Sentry.logger.fmt`Creating order for user ${body.userId}`,
  );

  try {
    const order = await createOrder(body);
    Sentry.logger.info("Order created", { orderId: order.id, total: order.total });
    return json(order, { status: 201 });
  } catch (err) {
    Sentry.logger.error("Order creation failed", {
      userId: body.userId,
      reason: (err as Error).message,
    });
    throw err;
  }
};
```

---

## Svelte vs SvelteKit: Key Differences

| Concern | Standalone Svelte | SvelteKit |
|---------|-------------------|-----------|
| `enableLogs` location | Single `main.ts` init | Both `hooks.client.ts` + `instrumentation.server.ts` |
| Server-side logging | ❌ N/A | ✅ Full — `Sentry.logger.*` in any server code |
| Isolation scope per request | ❌ N/A | ✅ Set in `hooks.server.ts` for per-request context |
| `consoleLoggingIntegration` | Single init | Both client and server inits |
| `consola` reporter | N/A (client-only) | Server hooks or load functions |
| Trace correlation | Client spans only | Client + server spans |

---

## Best Practices

- Add `enableLogs: true` to **both** `hooks.client.ts` and `instrumentation.server.ts` in SvelteKit — logging is not shared between the two init calls
- Use `Sentry.logger.fmt` for any log that includes a variable — enables search by value in Sentry
- Set global attributes (`getGlobalScope().setAttributes()`) for service-level metadata (service name, version, region)
- Use `getIsolationScope().setAttributes()` in `hooks.server.ts` to enrich all logs for a given request
- Use `beforeSendLog` to drop `trace`/`debug` logs in production to control volume
- Avoid logging raw sensitive data even with `beforeSendLog` — filter at the call site when possible

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Check `enableLogs: true` is set; logs require SDK ≥9.41.0 |
| Server logs missing, client logs present | Add `enableLogs: true` to `instrumentation.server.ts` (separate init from client) |
| `logger.fmt` not creating parameters | Ensure you're calling `Sentry.logger.fmt` as a tagged template — not a function call |
| Too many log entries (noise) | Use `beforeSendLog` to filter by level; increase `trace`/`debug` filter in production |
| Logs not linked to traces | Ensure tracing is enabled and active span exists when log is called |
| `consoleLoggingIntegration` requires upgrade | Upgrade to `@sentry/sveltekit` ≥10.13.0 |
| Scope attributes not appearing | Upgrade to ≥10.32.0 for `getGlobalScope`/`getIsolationScope` APIs |
| Log attributes contain `undefined` | Sentry only accepts `string | number | boolean` attribute values — filter undefined before passing |
