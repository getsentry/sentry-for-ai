# Durable Objects, Workflows, and D1 — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+
> Durable Object instrumentation: v8.x+
> `instrumentPrototypeMethods`: v10.x+
> Workflow instrumentation: v10.x+
> D1 instrumentation: v8.x+
> Durable Object Storage instrumentation: v10.x+

---

## Durable Objects

### Overview

`instrumentDurableObjectWithSentry` wraps a Durable Object class to automatically:
- Initialize the Sentry SDK per-request
- Capture unhandled errors in all DO methods
- Create spans for fetch, alarm, WebSocket, and RPC methods
- Track Durable Object Storage operations (get, put, delete, list)

### Setup

```typescript
import * as Sentry from "@sentry/cloudflare";
import { DurableObject } from "cloudflare:workers";

class MyDurableObjectBase extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/process") {
      await this.processData();
      return new Response("Processed");
    }

    return new Response("OK");
  }

  async alarm(): Promise<void> {
    await this.runMaintenance();
  }

  async processData(): Promise<void> {
    // Business logic — automatically instrumented as RPC span
    await this.ctx.storage.put("last-processed", Date.now());
  }
}

// Wrap the class with Sentry instrumentation
export const MyDurableObject = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
  }),
  MyDurableObjectBase,
);
```

> **Important:** Export the wrapped class, not the base class. The wrapped class must be the one referenced in `wrangler.toml`.

### Instrumented Methods

| Method | Span Op | Auto-captured |
|--------|---------|---------------|
| `fetch` | `http.server` | ✅ Errors and spans |
| `alarm` | — (named `alarm`) | ✅ Errors and spans |
| `webSocketMessage` | — (named `webSocketMessage`) | ✅ Errors and spans |
| `webSocketClose` | — (named `webSocketClose`) | ✅ Errors and spans |
| `webSocketError` | — (named `webSocketError`) | ✅ Errors captured with `handled: false` |
| Instance methods (RPC) | `rpc` | ✅ Errors and spans |

### Prototype Method Instrumentation

By default, only instance methods (defined directly on the object) are instrumented. To also instrument methods defined on the prototype chain (useful for RPC methods defined in a base class), enable `instrumentPrototypeMethods`:

```typescript
export const MyDurableObject = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    instrumentPrototypeMethods: true, // Instrument ALL prototype methods
  }),
  MyDurableObjectBase,
);
```

Or instrument only specific methods:

```typescript
export const MyDurableObject = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    instrumentPrototypeMethods: ["myRpcMethod", "anotherMethod"],
  }),
  MyDurableObjectBase,
);
```

### Durable Object Storage Instrumentation

Durable Object Storage operations (`get`, `put`, `delete`, `list`) are automatically instrumented when using `instrumentDurableObjectWithSentry`. Each storage operation creates a span.

```typescript
class MyDurableObjectBase extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // These storage operations are automatically traced
    await this.ctx.storage.put("key", "value");
    const value = await this.ctx.storage.get("key");
    await this.ctx.storage.delete("key");
    const entries = await this.ctx.storage.list();

    return new Response("OK");
  }
}
```

---

## Workflows

### Overview

`instrumentWorkflowWithSentry` wraps a Workflow class to automatically:
- Initialize the Sentry SDK for each workflow run
- Create a consistent trace ID derived from the workflow instance ID
- Create spans for each `step.do()` call
- Capture errors in workflow steps with `handled: true` (since steps may retry)
- Disable the dedupe integration (to capture all step failures, even duplicates)

### Setup

```typescript
import * as Sentry from "@sentry/cloudflare";
import { WorkflowEntrypoint } from "cloudflare:workers";

class MyWorkflowBase extends WorkflowEntrypoint<Env, { orderId: string }> {
  async run(event, step) {
    const order = await step.do("fetch-order", async () => {
      return await fetchOrder(event.payload.orderId);
    });

    await step.do("process-payment", { retries: { limit: 3, delay: "1s" } }, async () => {
      return await processPayment(order);
    });

    await step.do("send-confirmation", async () => {
      return await sendEmail(order.email);
    });
  }
}

export const MyWorkflow = Sentry.instrumentWorkflowWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  MyWorkflowBase,
);
```

### Step Span Attributes

Each `step.do()` creates a span with:

| Attribute | Value |
|-----------|-------|
| `op` | `function.step.do` |
| `name` | The step name (first argument to `step.do()`) |
| `cloudflare.workflow.timeout` | Step timeout config (if set) |
| `cloudflare.workflow.retries.limit` | Max retries (if set) |
| `cloudflare.workflow.retries.delay` | Retry delay (if set) |
| `cloudflare.workflow.retries.backoff` | Backoff strategy (if set) |

### Trace Consistency

The SDK generates a deterministic trace ID from the workflow instance ID. This means:
- All steps in the same workflow instance share the same trace
- Retried steps appear as separate spans within the same trace
- The sampling decision is consistent across steps

### Other Step Types

`step.sleep()`, `step.sleepUntil()`, and `step.waitForEvent()` are passed through without instrumentation (they don't execute user code).

---

## D1 Database Instrumentation

### Overview

`instrumentD1WithSentry` wraps a Cloudflare D1 database binding to automatically create spans and breadcrumbs for all queries.

### Setup

```typescript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  {
    async fetch(request, env, ctx) {
      // Wrap the D1 binding
      const db = Sentry.instrumentD1WithSentry(env.DB);

      // Use as normal — all queries are traced
      const users = await db.prepare("SELECT * FROM users WHERE active = ?").bind(1).all();

      return new Response(JSON.stringify(users.results));
    },
  } satisfies ExportedHandler<Env>,
);
```

### Instrumented Methods

| Method | Span Name | Notes |
|--------|-----------|-------|
| `statement.first()` | SQL query text | Returns first row |
| `statement.run()` | SQL query text | Execute with metadata return |
| `statement.all()` | SQL query text | Returns all rows with metadata |
| `statement.raw()` | SQL query text | Returns raw row arrays |

All methods create:
- A `db.query` span with the SQL statement as the span name
- A breadcrumb in the `query` category
- Span attributes: `cloudflare.d1.query_type`, `cloudflare.d1.duration`, `cloudflare.d1.rows_read`, `cloudflare.d1.rows_written`

### Bind Support

The instrumentation follows through `statement.bind()`:

```typescript
const db = Sentry.instrumentD1WithSentry(env.DB);

// bind() returns a new statement — it's also instrumented
const result = await db
  .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
  .bind("Alice", "alice@example.com")
  .run();
```

### Limitations

- `db.exec()` and `db.batch()` are **not** instrumented — only prepared statements
- Query parameters are not captured in span data (to avoid PII leakage)

---

## Best Practices

1. **Instrument D1 once per request** — call `instrumentD1WithSentry(env.DB)` at the top of your handler and use the wrapped binding throughout.

2. **Export wrapped classes** — always export the instrumented class (`Sentry.instrumentDurableObjectWithSentry(...)`) as the binding target, not the base class.

3. **Use `instrumentPrototypeMethods` selectively** — it wraps all prototype methods which adds overhead. Use an array of method names if you only need specific RPC methods.

4. **Don't wrap already-wrapped objects** — calling `instrumentD1WithSentry` twice on the same binding is harmless (it checks for existing instrumentation) but unnecessary.

5. **Workflow error handling** — step errors are captured with `handled: true` since Workflows may retry steps. The dedupe integration is automatically disabled.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DO errors not captured | Ensure you exported the instrumented class, not the base class |
| RPC methods not creating spans | Enable `instrumentPrototypeMethods: true` or list specific methods |
| D1 queries not traced | Call `instrumentD1WithSentry(env.DB)` before executing queries |
| Workflow spans disconnected | Verify all steps in the same workflow instance share the same trace (automatic) |
| Storage operations not traced | Ensure you're using `instrumentDurableObjectWithSentry` — storage instrumentation is included |
| `db.batch()` not creating spans | Expected — batch and exec are not instrumented; use prepared statements |
