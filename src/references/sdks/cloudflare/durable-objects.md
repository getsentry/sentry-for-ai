# Durable Objects, Workflows, and D1 — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+ Durable Object instrumentation: v8.x+
> `instrumentPrototypeMethods`: v10.x+ Workflow instrumentation: v10.x+ D1 automatic
> (`env`-based) instrumentation: v10.x+ Durable Object Storage instrumentation: v10.x+
> Agents SDK instrumentation (`instrumentAgentWithSentry`): v10.69.0+ RPC trace
> propagation (`enableRpcTracePropagation`): v10.52.0+

* * *

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

> **Important:** Export the wrapped class, not the base class.
> The wrapped class must be the one referenced in `wrangler.toml`.

### Instrumented Methods

| Method | Span Op | Auto-captured |
| --- | --- | --- |
| `fetch` | `http.server` | ✅ Errors and spans |
| `alarm` | — (named `alarm`) | ✅ Errors and spans |
| `webSocketMessage` | — (named `webSocketMessage`) | ✅ Errors and spans |
| `webSocketClose` | — (named `webSocketClose`) | ✅ Errors and spans |
| `webSocketError` | — (named `webSocketError`) | ✅ Errors captured with `handled: false` |
| Instance methods (RPC) | `rpc` | ✅ Errors and spans |

### Prototype Method Instrumentation

By default, only instance methods (defined directly on the object) are instrumented.
To also instrument methods defined on the prototype chain (useful for RPC methods
defined in a base class), enable `instrumentPrototypeMethods`:

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

Durable Object Storage operations (`get`, `put`, `delete`, `list`) are automatically
instrumented when using `instrumentDurableObjectWithSentry`. Each storage operation
creates a span.

> Framework-internal storage operations are filtered out automatically (v10.69.0+): keys
> prefixed with `cf_`, `cf:`, `__ps_`, or `/` (used internally by the Agents SDK and
> PartyServer) don’t create spans, so your traces show only your own storage access.

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

### Cloudflare Agents SDK (`instrumentAgentWithSentry`)

> `instrumentAgentWithSentry`: v10.69.0+

For classes built on the
[Cloudflare Agents SDK](https://developers.cloudflare.com/agents/) (`Agent` from
`agents`, `AIChatAgent` from `@cloudflare/ai-chat`, `McpAgent` from `agents/mcp`), use
the dedicated `instrumentAgentWithSentry` wrapper.
Agents are Durable Objects under the hood, so it applies everything
`instrumentDurableObjectWithSentry` does (request transactions, `alarm`, WebSocket
handlers, RPC trace propagation, SQL spans) **plus** Agent-specific telemetry:

- **Callable RPC spans** — a span (op `rpc`) for each `@callable()` method invoked over
  WebSocket, with `cloudflare.agent.class` / `cloudflare.agent.name` attributes
- **Automatic conversation IDs** — sets the conversation ID on the scope for each chat
  turn (`onChatMessage`) and each callable RPC call, defaulting to the agent instance
  name, so `gen_ai` spans group in Conversations without any `setConversationId` call
- **Conversation rotation on chat clear** — when the chat is cleared (`clearHistory()`
  from `useAgentChat`, or anything that emits the
  [`message:clear` observability event](https://developers.cloudflare.com/agents/runtime/operations/observability/#channels)),
  the SDK rotates to a fresh conversation ID while the instance (and its MCP/OAuth
  state) stays put

```typescript
import { Agent, callable } from "agents";
import * as Sentry from "@sentry/cloudflare";

class MyAgentBase extends Agent<Env> {
  @callable()
  async greet(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }
}

export const MyAgent = Sentry.instrumentAgentWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    enableRpcTracePropagation: true,
  }),
  MyAgentBase,
);
```

When building with the Sentry Vite plugin’s `autoInstrumentation`, Agent classes are
detected and wrapped with `instrumentAgentWithSentry` automatically (v10.69.0+) — see
`./ai-monitoring.md`.

The automatic conversation ID uses the agent instance name — correct when one instance
is one chat session (e.g. `useAgent({ name: chatSessionId })`). If your instances are
per-user or a shared singleton like `"default"`, override it with your own chat session
ID via `Sentry.setConversationId(id)` at the start of `onChatMessage` — see
`./ai-monitoring.md`.

On SDK versions before 10.69.0, wrap Agent classes with
`instrumentDurableObjectWithSentry` instead and call `Sentry.setConversationId()`
manually in the handler.

### RPC Trace Propagation

Trace context isn’t propagated across Durable Object RPC calls by default.
To connect a caller Worker and a DO into a single distributed trace, set
`enableRpcTracePropagation: true` on **both** the caller (`withSentry`) and the DO
(`instrumentDurableObjectWithSentry`) — recommended whenever you use Durable Objects.
See [RPC Trace Propagation in `./tracing.md`](./tracing.md#rpc-trace-propagation) for
the full setup.

* * *

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
| --- | --- |
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

`step.sleep()`, `step.sleepUntil()`, and `step.waitForEvent()` are passed through
without instrumentation (they don’t execute user code).

* * *

## D1 Database Instrumentation

### Overview

D1 bindings are **automatically instrumented** when accessed through the handler’s
`env`. As long as your Worker is wrapped with `withSentry` (or the DO/Workflow is
wrapped), every query on `env.DB` creates spans and breadcrumbs — no manual wrapping
needed.

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
      // env.DB is already instrumented — use it directly
      const users = await env.DB.prepare("SELECT * FROM users WHERE active = ?").bind(1).all();

      return new Response(JSON.stringify(users.results));
    },
  } satisfies ExportedHandler<Env>,
);
```

> **Deprecated:** the explicit `Sentry.instrumentD1WithSentry(env.DB)` wrapper still
> works but is **deprecated and will be removed in v11**. Access `env.DB` directly
> instead — it’s instrumented automatically.

### Instrumented Methods

| Method | Span Name | Notes |
| --- | --- | --- |
| `statement.first()` | SQL query text | Returns first row |
| `statement.run()` | SQL query text | Execute with metadata return |
| `statement.all()` | SQL query text | Returns all rows with metadata |
| `statement.raw()` | SQL query text | Returns raw row arrays |
| `db.batch([...])` | SQL of the batched statements | Executes multiple statements in one transaction |
| `db.exec(sql)` | SQL query text | Executes raw SQL |

All methods create:
- A `db.query` span with the SQL statement as the span name
- A breadcrumb in the `query` category
- Span attributes: `cloudflare.d1.query_type`, `cloudflare.d1.duration`,
  `cloudflare.d1.rows_read`, `cloudflare.d1.rows_written`

`db.batch()` and `db.exec()` additionally set:
- `db.operation.name` — `batch` or `exec`
- `db.operation.batch.size` — number of statements (for `batch`)

### Bind Support

The instrumentation follows through `statement.bind()`:

```typescript
// bind() returns a new statement — it's also instrumented
const result = await env.DB
  .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
  .bind("Alice", "alice@example.com")
  .run();
```

### Limitations

- Query parameters are not captured in span data (to avoid PII leakage)

* * *

## Best Practices

1. **Access D1 via `env`** — use `env.DB` directly; it’s auto-instrumented.
   Don’t reach for the deprecated `instrumentD1WithSentry` wrapper.

2. **Export wrapped classes** — always export the instrumented class
   (`Sentry.instrumentDurableObjectWithSentry(...)`) as the binding target, not the base
   class.

3. **Use `instrumentPrototypeMethods` selectively** — it wraps all prototype methods
   which adds overhead.
   Use an array of method names if you only need specific RPC methods.

4. **Enable RPC trace propagation for cross-Worker traces** — set
   `enableRpcTracePropagation: true` on both caller and receiver when you want
   DO/service-binding RPC calls in one trace (see
   [RPC Trace Propagation](#rpc-trace-propagation)).

5. **Workflow error handling** — step errors are captured with `handled: true` since
   Workflows may retry steps.
   The dedupe integration is automatically disabled.

* * *

## Troubleshooting

| Issue | Solution |
| --- | --- |
| DO errors not captured | Ensure you exported the instrumented class, not the base class |
| RPC methods not creating spans | Enable `instrumentPrototypeMethods: true` or list specific methods |
| D1 queries not traced | Access the binding via `env.DB` (auto-instrumented by `withSentry`) and ensure `tracesSampleRate` is set |
| Workflow spans disconnected | Verify all steps in the same workflow instance share the same trace (automatic) |
| Storage operations not traced | Ensure you’re using `instrumentDurableObjectWithSentry` — storage instrumentation is included |
| DO / service-binding RPC calls in separate traces | Set `enableRpcTracePropagation: true` on both caller and receiver |
