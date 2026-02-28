# Logging — Sentry React Native SDK

> **Minimum SDK:** `@sentry/react-native` ≥7.0.0 for `Sentry.logger` API  
> **Scope-based attribute setters** (`getGlobalScope`, `withScope`): requires ≥7.8.0  
> **`consoleLoggingIntegration()`**: requires ≥7.0.0

---

## Enabling Logs

`enableLogs` is **off by default** — opt in explicitly:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  enableLogs: true,
});
```

Place this in your app entry point — `index.js`, `App.tsx`, or `app/_layout.tsx` (Expo Router), depending on your project structure.

---

## Logger API — Six Levels

```typescript
import * as Sentry from "@sentry/react-native";

// Fine-grained debugging — high volume, filter in production
Sentry.logger.trace("Starting authentication flow", { provider: "oauth" });

// Development diagnostics
Sentry.logger.debug("Cache lookup", { key: "user:123", hit: false });

// Normal operations and business milestones
Sentry.logger.info("Order created", { orderId: "order_456", total: 99.99 });

// Degraded state, approaching limits
Sentry.logger.warn("Rate limit approaching", {
  endpoint: "/api/results/",
  current: 95,
  max: 100,
});

// Failures requiring attention
Sentry.logger.error("Payment failed", {
  reason: "card_declined",
  userId: "u_1",
});

// Critical failures — app is down
Sentry.logger.fatal("Database unavailable", { host: "db-primary" });
```

### Level Selection Guide

| Level | When to Use |
|-------|-------------|
| `trace` | Step-by-step internals, loop iterations, low-level flow tracking |
| `debug` | Diagnostic information useful during development |
| `info` | Business events, user actions, meaningful state transitions |
| `warn` | Recoverable errors, degraded performance, approaching limits |
| `error` | Failures that need investigation but don't crash the app |
| `fatal` | Unrecoverable failures — app or critical subsystem is down |

**Attribute value types:** `string`, `number`, and `boolean` only. Other types will be dropped or coerced.

---

## Parameterized Messages with `logger.fmt`

Use `Sentry.logger.fmt` as a tagged template literal to make message variables **individually searchable** in Sentry. Each interpolated value becomes a `message.parameter.N` attribute:

```typescript
const userId = "user_123";
const productName = "Widget Pro";
const amount = 49.99;

Sentry.logger.info(
  Sentry.logger.fmt`User ${userId} purchased ${productName} for $${amount}`
);
// → message.template:    "User %s purchased %s for $%s"
// → message.parameter.0: "user_123"
// → message.parameter.1: "Widget Pro"
// → message.parameter.2: 49.99

Sentry.logger.error(
  Sentry.logger.fmt`Failed to load screen ${screenName}: ${error.message}`
);
```

You can now filter and search for logs by individual parameter values in the Sentry Logs UI — not just by the full message string.

---

## Structured Attributes

Pass attributes as the second argument. They become **queryable columns** in Sentry Logs:

```typescript
Sentry.logger.info("Checkout completed", {
  orderId: order.id,
  userId: user.id,
  cartValue: cart.total,
  itemCount: cart.items.length,
  paymentMethod: "stripe",
  durationMs: Date.now() - startTime,
});

Sentry.logger.error("Navigation failed", {
  fromScreen: "Home",
  toScreen: "Profile",
  errorCode: err.code,
  retryable: true,
});
```

---

## Scope-Based Automatic Attributes (SDK ≥7.8.0)

Set attributes once on a scope and they are **automatically attached to all logs** emitted within that scope.

### Global scope — entire app lifetime

```typescript
// In your Sentry.init block or app startup
Sentry.getGlobalScope().setAttributes({
  app_version: "2.1.0",
  build_number: "42",
  platform: Platform.OS,       // "ios" or "android"
  environment: __DEV__ ? "development" : "production",
});
```

### Scoped attributes — single operation or code block

```typescript
Sentry.withScope(async (scope) => {
  scope.setAttribute("order_id", "ord_789");
  scope.setAttribute("payment_method", "stripe");

  Sentry.logger.info("Validating cart", { cartId: cart.id });
  // order_id and payment_method included in this log
  await processPayment();
  Sentry.logger.info("Payment complete");
  // order_id and payment_method included here too
});
```

---

## Console Logging Integration

Automatically forwards `console.log`, `console.warn`, and `console.error` calls to Sentry as structured logs. Requires SDK ≥7.0.0.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],  // default — adjust as needed
    }),
  ],
});

// These are now automatically forwarded to Sentry:
console.log("User action:", userId, success);
// → message.parameter.0: userId
// → message.parameter.1: success

console.warn("Memory pressure detected", memoryUsage);
console.error("Fetch failed:", error.message);
```

> **React Native note:** All `console.*` calls in React Native go through the JS bridge. In development, the `consoleLoggingIntegration` will forward them all — use `beforeSendLog` to filter out noise before it reaches Sentry.

---

## Filtering with `beforeSendLog`

Filter or mutate every log before it is transmitted. Return `null` to drop the log entirely:

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  enableLogs: true,
  beforeSendLog: (log) => {
    // Drop low-level logs in production to reduce volume
    if (!__DEV__ && (log.level === "trace" || log.level === "debug")) {
      return null;
    }

    // Scrub sensitive attribute values
    if (log.attributes?.password) {
      delete log.attributes.password;
    }
    if (log.attributes?.credit_card) {
      log.attributes.credit_card = "[REDACTED]";
    }

    // Drop health check noise from console capture
    if (log.message?.includes("heartbeat")) return null;

    return log;
  },
});
```

The `log` object has the following shape:

| Field | Type | Description |
|-------|------|-------------|
| `level` | `string` | `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"` |
| `message` | `string` | The log message (template-expanded) |
| `timestamp` | `number` | Unix timestamp |
| `attributes` | `object` | All structured attributes |

---

## Auto-Generated Attributes

The SDK automatically attaches these attributes to every log:

| Attribute | Source |
|-----------|--------|
| `sentry.environment` | `Sentry.init({ environment })` |
| `sentry.release` | `Sentry.init({ release })` |
| `sentry.sdk.name` | SDK internals |
| `sentry.sdk.version` | SDK internals |
| `user.id`, `user.name`, `user.email` | `Sentry.setUser()` when set |
| `sentry.message.template` | `logger.fmt` usage |
| `sentry.message.parameter.X` | `logger.fmt` interpolated values |
| `origin` | Identifies which integration emitted the log |

### React Native vs Web — Attribute Differences

React Native **does not** emit the following attributes that web SDKs include:

- `browser.name` / `browser.version` — not applicable on native
- `sentry.trace.parent_span_id` — not linked unless using the web tracing stack
- `sentry.replay_id` — not automatically attached to log events in React Native (mobile replay uses a different linking mechanism)
- `server.address` — server-side only
- `payload_size` — web-only

---

## Log Correlation with Traces

When tracing is enabled, logs emitted inside an active span are **automatically correlated** in the Sentry UI. Navigate from a log to its parent span or from a trace to all logs emitted during it.

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  enableLogs: true,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.reactNavigationIntegration(), // auto-instruments screen transitions
  ],
});

// Inside a Sentry span, logs get linked automatically
await Sentry.startSpan({ name: "checkout", op: "ui.action" }, async () => {
  Sentry.logger.info("Validating cart", { cartId: cart.id });
  await validateCart();

  Sentry.logger.info("Initiating payment", { gateway: "stripe" });
  await processPayment();

  Sentry.logger.info("Checkout complete", { orderId: newOrder.id });
});
// All three logs are linked to the "checkout" span in the Sentry trace view
```

---

## Practical Patterns

### Screen lifecycle logging

```typescript
function ProductScreen({ route }) {
  const { productId } = route.params;

  useEffect(() => {
    Sentry.logger.info("Screen mounted", {
      screen: "ProductScreen",
      productId,
    });

    return () => {
      Sentry.logger.debug("Screen unmounted", { screen: "ProductScreen" });
    };
  }, []);

  const handlePurchase = async () => {
    Sentry.logger.info(
      Sentry.logger.fmt`User initiated purchase for product ${productId}`
    );
    try {
      const result = await purchaseProduct(productId);
      Sentry.logger.info("Purchase succeeded", {
        productId,
        orderId: result.orderId,
      });
    } catch (err) {
      Sentry.logger.error("Purchase failed", {
        productId,
        reason: err.message,
        code: err.code,
      });
    }
  };
}
```

### API call logging

```typescript
async function fetchUserData(userId: string) {
  Sentry.logger.debug(
    Sentry.logger.fmt`Fetching user data for ${userId}`
  );

  const startTime = Date.now();

  try {
    const response = await api.get(`/users/${userId}`);
    Sentry.logger.info("User data fetched", {
      userId,
      durationMs: Date.now() - startTime,
      status: response.status,
    });
    return response.data;
  } catch (err) {
    Sentry.logger.error("User data fetch failed", {
      userId,
      durationMs: Date.now() - startTime,
      status: err.response?.status,
      message: err.message,
    });
    throw err;
  }
}
```

### Redux action logging

```typescript
// Log significant state transitions alongside Redux breadcrumbs
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  configureScopeWithState: (scope, state) => {
    scope.setTag("user.plan", state.user.subscription);
  },
});

// In your reducers or middleware
function checkoutMiddleware(store) {
  return (next) => (action) => {
    if (action.type === "checkout/completed") {
      Sentry.logger.info("Checkout completed via Redux", {
        orderId: action.payload.orderId,
        total: action.payload.total,
      });
    }
    return next(action);
  };
}
```

---

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLogs` | `boolean` | `false` | Master switch — must be `true` for all logging features |
| `beforeSendLog` | `(log) => log \| null` | `undefined` | Filter/mutate logs before transmission |
| `consoleLoggingIntegration` | integration | not added | Capture `console.*` calls as structured logs |

---

## Performance Considerations

- **Log volume:** Every `Sentry.logger.*` call is batched and sent asynchronously — there is no synchronous network overhead per call.
- **Sampling:** Unlike errors and transactions, logs do not currently support sampling rates. Use `beforeSendLog` to drop entire log levels in production (e.g., drop `trace` and `debug`).
- **Size limit:** Log payloads over **1 MB** are dropped server-side. If logs are silently disappearing, check your Sentry org stats.
- **Missing logs on crash:** If the app terminates before the SDK flushes its buffer, the most recent logs may not reach Sentry. This is a known limitation under active improvement.
- **`console.*` forwarding overhead:** `consoleLoggingIntegration` wraps native console methods. In development this is fine; in production, scope it tightly using the `levels` option.

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| Crash buffer loss | Logs buffered since last flush are lost on unexpected termination |
| No per-log sampling | Use `beforeSendLog` to reduce volume; sampling is all-or-nothing |
| 1 MB size cap | Logs larger than 1 MB are dropped server-side |
| No `browser.*` attributes | React Native emits no browser context — these columns are empty in the Logs UI |
| Session Replay not on logs | Expected — mobile replay doesn't populate this attribute on log events; replay is still linked via trace context |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Check `enableLogs: true` is set in `Sentry.init()` |
| SDK version too old | Upgrade to `@sentry/react-native` ≥7.0.0 for `Sentry.logger`; ≥7.0.0 for `consoleLoggingIntegration`; ≥7.8.0 for scope attribute setters |
| `logger.fmt` not creating `parameter.*` attributes | Ensure it is called as a tagged template literal: `Sentry.logger.fmt\`...\`` — not as a function `Sentry.logger.fmt(...)` |
| Logs disappearing silently | Check Sentry org stats for rate limiting or logs exceeding 1 MB |
| Attribute values showing `[Filtered]` | Server-side PII scrubbing rule matched — adjust **Data Scrubbing** settings in your Sentry project |
| `console.log` calls not forwarded | Add `consoleLoggingIntegration()` to `integrations` and ensure the `levels` array includes `"log"` |
| Too many logs in production | Use `beforeSendLog` to drop `trace`/`debug` levels when `!__DEV__` |
| Logs not linked to traces | Enable tracing (`tracesSampleRate > 0`) and emit logs inside a `Sentry.startSpan()` callback |
| Scope attributes not attaching | Upgrade to ≥7.8.0 for `getGlobalScope().setAttributes()` support |
