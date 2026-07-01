# Durable Objects, Workflows, and D1 — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+
> Durable Object instrumentation: v8.x+
> `instrumentPrototypeMethods`: v10.x+
> Workflow instrumentation: v10.x+
> D1 instrumentation: v8.x+
> Durable Object Storage instrumentation: v10.x+
> Synchronous KV storage instrumentation: v10.59.0+

---

## Durable Objects

### Overview

`instrumentDurableObjectWithSentry` wraps a Durable Object class to automatically:
- Initialize the Sentry SDK per-request
- Capture unhandled errors in all DO methods
- Create spans for fetch, alarm, WebSocket, and RPC methods
- Track Durable Object Storage operations (async storage: get, put, delete, list; sync KV: kv.get, kv.put, kv.delete, kv.list)

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
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/cloudflare/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
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

Durable Object Storage operations are automatically instrumented when using `instrumentDurableObjectWithSentry`. Each storage operation creates a span.

**Async storage operations** (`get`, `put`, `delete`, `list`):

```typescript
class MyDurableObjectBase extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // These async storage operations are automatically traced
    await this.ctx.storage.put("key", "value");
    const value = await this.ctx.storage.get("key");
    await this.ctx.storage.delete("key");
    const entries = await this.ctx.storage.list();

    return new Response("OK");
  }
}
```

**Synchronous KV storage operations** (v10.59.0+):

The synchronous KV API (`ctx.storage.kv.*`) is also automatically instrumented:

```typescript
class MyDurableObjectBase extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // Synchronous KV operations are automatically traced (v10.59.0+)
    this.ctx.storage.kv.put("counter", { value: 42 });
    const counter = this.ctx.storage.kv.get("counter");
    const entries = [...this.ctx.storage.kv.list()];
    this.ctx.storage.kv.delete("counter");

    return new Response(JSON.stringify({ counter, entriesCount: entries.length }));
  }
}
```

Both async storage and sync KV operations create spans with the operation name (`durable_object_storage_get`, `durable_object_storage_kv_get`, etc.).

### SQL Storage Instrumentation (v10.61.0+)

Durable Objects with SQL storage (`ctx.storage.sql`) are automatically instrumented when using `instrumentDurableObjectWithSentry`:

```typescript
class MyDurableObjectBase extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // SQL queries are automatically traced.
    // sql.exec() is synchronous and returns a SqlStorageCursor.
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)"
    );

    this.ctx.storage.sql.exec(
      "INSERT INTO users (id, name) VALUES (?, ?)",
      1,
      "Alice"
    );

    // Consume the cursor with .toArray() before serializing —
    // JSON.stringify on the cursor itself yields "{}".
    const users = this.ctx.storage.sql.exec("SELECT * FROM users").toArray();

    return new Response(JSON.stringify(users));
  }
}
```

Each `sql.exec()` call creates a `db.query` span with:
- `db.system.name`: `"cloudflare-durable-object-sql"`
- `db.operation.name`: `"exec"`
- `db.query.text`: sanitized SQL query
- `db.query.summary`: extracted operation summary (e.g., `"SELECT users"`)
- `cloudflare.durable_object.query.bindings`: number of bind parameters

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

D1 database bindings are instrumented **automatically** as of v10.57.0. When your handler is wrapped with `Sentry.withSentry`, all D1 bindings on `env` are instrumented for you — queries create spans and breadcrumbs with no extra code.

> `Sentry.instrumentD1WithSentry(env.DB)` is **deprecated** and no longer required. It still works (and is a harmless no-op on an already-instrumented binding), but it will be removed in the next major version. Use `env.DB` directly.

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
      // env.DB is already instrumented by withSentry — use it directly
      const users = await env.DB.prepare("SELECT * FROM users WHERE active = ?").bind(1).all();

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
| `db.batch(statements[])` | `"D1 batch"` | Execute multiple prepared statements (v10.61.0+) |
| `db.exec(query)` | SQL query text | Execute raw SQL directly (v10.61.0+) |
| `db.withSession(constraintOrBookmark?)` | — | Returns instrumented session synchronously; `session.prepare()` and `session.batch()` are also traced (v10.61.0+) |

All methods create:
- A `db.query` span with the SQL statement as the span name
- A breadcrumb in the `query` category
- Span attributes include: `db.operation.name` (query type), `cloudflare.d1.duration`, `cloudflare.d1.rows_read`, `cloudflare.d1.rows_written`

### Bind Support

The instrumentation follows through `statement.bind()`:

```typescript
// bind() returns a new statement — it's also instrumented
const result = await env.DB
  .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
  .bind("Alice", "alice@example.com")
  .run();
```

### Batch Operations

The SDK instruments `db.batch()` for executing multiple prepared statements atomically:

```typescript
const results = await env.DB.batch([
  env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind("active", 1),
  env.DB.prepare("INSERT INTO logs (action) VALUES (?)").bind("user_activated"),
  env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(1),
]);
```

This creates a single `db.query` span named `"D1 batch"` with attributes:
- `db.operation.name`: `"batch"`
- `db.operation.batch.size`: number of statements
- `db.query.text`: concatenated SQL statements (newline-separated)

### Sessions

`db.withSession()` is instrumented, and any `prepare()` or `batch()` calls made on the returned session are automatically traced. `withSession()` takes an optional consistency constraint (`"first-primary"`, `"first-unconstrained"`) or a bookmark string, and returns the session synchronously:

```typescript
const session = env.DB.withSession("first-primary");
const user = await session.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
await session.prepare("UPDATE users SET last_seen = ? WHERE id = ?").bind(Date.now(), userId).run();
```

### Limitations

- Query parameters are not captured in span data (to avoid PII leakage)

---

## Best Practices

1. **Use D1 bindings directly** — `withSentry` auto-instruments all `env` D1 bindings (v10.57.0+), so use `env.DB` as-is. The deprecated `instrumentD1WithSentry(env.DB)` wrapper is no longer needed.

2. **Export wrapped classes** — always export the instrumented class (`Sentry.instrumentDurableObjectWithSentry(...)`) as the binding target, not the base class.

3. **Use `instrumentPrototypeMethods` selectively** — it wraps all prototype methods which adds overhead. Use an array of method names if you only need specific RPC methods.

4. **Workflow error handling** — step errors are captured with `handled: true` since Workflows may retry steps. The dedupe integration is automatically disabled.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DO errors not captured | Ensure you exported the instrumented class, not the base class |
| RPC methods not creating spans | Enable `instrumentPrototypeMethods: true` or list specific methods |
| D1 queries not traced | D1 bindings are auto-instrumented by `withSentry` (v10.57.0+) — ensure your handler is wrapped and you're using the `env.DB` binding. All methods (`prepare`, `batch`, `exec`, `withSession`) are traced in v10.61.0+ |
| Workflow spans disconnected | Verify all steps in the same workflow instance share the same trace (automatic) |
| Storage operations not traced | Ensure you're using `instrumentDurableObjectWithSentry` — storage (async, KV, and SQL) instrumentation is included |
| SQL storage not traced | Upgrade to v10.61.0+; `ctx.storage.sql.exec()` is automatically instrumented |
