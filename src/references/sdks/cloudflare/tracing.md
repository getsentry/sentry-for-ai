# Tracing — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+
> Streaming response span tracking: v10.x+
> `propagateTraceparent`: v10.x+
> OpenTelemetry compatibility tracer: v10.x+
> RPC trace propagation (`enableRpcTracePropagation`): v10.52.0+
> Workers AI (`env.AI`) `gen_ai` spans: v10.67.0+

---

## How Tracing Works

The Cloudflare SDK is **not natively OpenTelemetry-based** (unlike `@sentry/node`), but it sets up an OpenTelemetry compatibility tracer. This means:

- Spans emitted via `@opentelemetry/api` are captured by Sentry
- The SDK creates its own HTTP server spans for incoming requests
- Outbound `fetch()` calls are automatically traced via `fetchIntegration`
- D1 queries and Workers AI (`env.AI`) calls are traced automatically when accessed via `env`

---

## Activating Tracing

Set `tracesSampleRate` or `tracesSampler` in your init options. Without one of these, no spans are created.

```typescript
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0, // 100% in dev, lower in production
  }),
  handler,
);
```

The SDK also reads `SENTRY_TRACES_SAMPLE_RATE` from `env` automatically:

```toml
# wrangler.toml
[vars]
SENTRY_TRACES_SAMPLE_RATE = "0.1"
```

---

## `tracesSampleRate` — Uniform Sampling

A number between `0.0` and `1.0`:

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.ENVIRONMENT === "production" ? 0.1 : 1.0,
  }),
  handler,
);
```

---

## `tracesSampler` — Dynamic Sampling

For fine-grained control:

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampler: (samplingContext) => {
      const url = samplingContext.attributes?.["url.full"] as string | undefined;

      // Never trace health checks
      if (url?.includes("/health")) return 0;

      // Sample API routes at 20%
      if (url?.includes("/api/")) return 0.2;

      // Default: 10%
      return 0.1;
    },
  }),
  handler,
);
```

---

## Automatic Spans

### HTTP Server Spans

Every incoming request wrapped by `withSentry` or `sentryPagesPlugin` creates an `http.server` span with:

| Attribute | Source |
|-----------|--------|
| `http.request.method` | `request.method` |
| `url.full` | `request.url` |
| `http.response.status_code` | Response status |
| `http.request.body.size` | `Content-Length` header |
| `user_agent.original` | `User-Agent` header |
| `network.protocol.name` | `request.cf.httpProtocol` |

> **Note:** `OPTIONS` and `HEAD` requests do not create spans (to reduce noise) but errors are still captured.

### Streaming Response Tracking

The SDK detects streaming responses and keeps the root span alive until the stream is fully consumed. This ensures accurate duration measurement for SSE, streaming AI responses, etc.

### Outbound Fetch Spans

The `fetchIntegration` (enabled by default) automatically traces all outbound `fetch()` calls:

```typescript
// This fetch call is automatically traced
const response = await fetch("https://api.example.com/data");
```

Each outbound fetch creates a child span with method, URL, and response status.

### D1 Query Spans

D1 bindings are **auto-instrumented** by `withSentry` — access `env.DB` from the handler's `env` and queries create `db.query` spans automatically (no manual wrapping needed):

```typescript
// env.DB is auto-instrumented — no wrapper required
const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(1).run();
```

Span attributes include:
- `cloudflare.d1.query_type` — `first`, `run`, `all`, `raw`, `batch`, or `exec`
- `cloudflare.d1.duration` — query duration
- `cloudflare.d1.rows_read` — number of rows read
- `cloudflare.d1.rows_written` — number of rows written

See `./durable-objects.md` for full D1 coverage (prepared statements, `batch`, `exec`).

### Workers AI Spans

The Cloudflare Workers AI binding (`env.AI`) is auto-instrumented by `withSentry` (v10.67.0+). Calls to `env.AI.run(...)` create `gen_ai` spans following Sentry's AI Agent Monitoring conventions — capturing model, request parameters, and token usage:

```typescript
// env.AI is auto-instrumented — creates a gen_ai span
const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [{ role: "user", content: "What is the capital of France?" }],
});
```

#### Tracking Conversations

> **Beta:** configuration options and behavior may change.

The Workers AI instrumentation does **not** infer the conversation ID automatically. To group multi-turn AI calls into a single [Conversation](https://docs.sentry.io/product/ai/monitoring/conversations/), set the ID manually with `Sentry.setConversationId(id)`. It's applied as the `gen_ai.conversation.id` attribute to **all AI spans within the current scope**, so call it once at the start of a request handler — before any `env.AI.run(...)` calls — and every AI span for that request is grouped. Pass `null` to unset it.

When you use the [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/), each agent instance already has a stable identifier — its Durable Object instance name, `this.name` — which is a natural conversation ID. Set it at the top of the handler (`onRequest` for `Agent`, `onChatMessage` for `AIChatAgent`) so every AI call triggered while handling that message shares the ID:

```typescript
import * as Sentry from "@sentry/cloudflare";
import { AIChatAgent } from "@cloudflare/ai-chat";

class MyChatAgentBase extends AIChatAgent<Env> {
  async onChatMessage(): Promise<Response | undefined> {
    // Every AI call in this chat session shares the same conversation ID
    Sentry.setConversationId(this.name);

    const result = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: this.messages.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join(""),
      })),
    });

    return new Response(JSON.stringify(result));
  }
}

export const MyChatAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  MyChatAgentBase,
);
```

For a plain `Agent`, the pattern is the same — call `Sentry.setConversationId(this.name)` at the top of `onRequest` before your `this.env.AI.run(...)` calls. Grouped calls appear in the [Conversations](https://docs.sentry.io/product/ai/monitoring/conversations/) view, where you can inspect token usage, latency, and errors across the whole conversation.

---

## Custom Spans

### `Sentry.startSpan`

Wrap a block of code in a span:

```typescript
const result = await Sentry.startSpan(
  {
    op: "function",
    name: "processPayment",
    attributes: { "payment.provider": "stripe" },
  },
  async (span) => {
    const payment = await chargeCustomer(amount);
    span.setAttributes({ "payment.id": payment.id });
    return payment;
  },
);
```

### `Sentry.startInactiveSpan`

Create a span without making it the active span:

```typescript
const span = Sentry.startInactiveSpan({
  op: "cache.lookup",
  name: "Check KV cache",
});

const cached = await env.KV.get(key);
span.end();
```

### `Sentry.startSpanManual`

Full control over span lifecycle:

```typescript
await Sentry.startSpanManual(
  { op: "task", name: "Background processing" },
  async (span) => {
    try {
      await doWork();
      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.setStatus({ code: 2, message: "internal_error" }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  },
);
```

---

## Distributed Tracing

### Incoming Trace Propagation

The SDK automatically reads `sentry-trace` and `baggage` headers from incoming requests and continues the trace. This works out of the box with `withSentry` and `sentryPagesPlugin`.

### Outbound Trace Propagation

The `fetchIntegration` automatically injects `sentry-trace` and `baggage` headers into outbound `fetch()` calls. Control which URLs get trace headers with `tracePropagationTargets`:

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      "api.myservice.com",
      /^https:\/\/.*\.myapp\.com/,
    ],
  }),
  handler,
);
```

By default (when `tracePropagationTargets` is not set), trace headers are attached to **all** outbound requests.

### `propagateTraceparent`

Controls whether the `sentry-trace` header is attached to outgoing requests (default: SDK behavior). Set explicitly to control:

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    propagateTraceparent: true, // explicit opt-in
  }),
  handler,
);
```

### Manual Trace Continuation

```typescript
const traceData = Sentry.getTraceData();
// Returns { "sentry-trace": "...", "baggage": "..." }

// Inject into outbound request manually
const response = await fetch("https://api.example.com", {
  headers: {
    ...traceData,
  },
});
```

### HTML Meta Tags (for frontend)

```typescript
const metaTags = Sentry.getTraceMetaTags();
// Returns: <meta name="sentry-trace" content="..."/><meta name="baggage" content="..."/>

// Include in HTML response for frontend SDK to continue the trace
return new Response(`<html><head>${metaTags}</head>...`, {
  headers: { "Content-Type": "text/html" },
});
```

### RPC Trace Propagation

> `enableRpcTracePropagation`: v10.52.0+

Trace context isn't propagated across [Service Binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) / [RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/) calls (including Durable Object RPC and Workflows) by default. Set `enableRpcTracePropagation: true` on **both** the caller and the receiver to link these calls into a single distributed trace.

**Recommended:** enable it whenever your Workers communicate over RPC / service bindings or you use Durable Objects or Workflows.

**Caller (Worker calling into a service binding / DO):**

```typescript
export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    enableRpcTracePropagation: true,
  }),
  handler,
);
```

**Receiver (the Durable Object / target Worker):**

```typescript
export const MyDurableObject = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    enableRpcTracePropagation: true,
  }),
  MyDurableObjectBase,
);
```

---

## Durable Object Tracing

Durable Objects instrumented with `instrumentDurableObjectWithSentry` automatically create spans for:

- `fetch` — creates `http.server` spans (same as regular fetch handlers)
- `alarm` — creates spans named `alarm`
- `webSocketMessage` — creates spans named `webSocketMessage`
- `webSocketClose` — creates spans named `webSocketClose`
- `webSocketError` — creates spans named `webSocketError`
- **RPC methods** — any public instance method creates spans with `op: "rpc"`

See `./durable-objects.md` for full setup.

---

## Workflow Step Tracing

Workflows instrumented with `instrumentWorkflowWithSentry` create spans for each `step.do()` call:

```typescript
// Each step.do() creates a span with op "function.step.do"
await step.do("process-payment", async () => {
  return await processPayment();
});
```

See the Workflows section in `./durable-objects.md` for full setup.

---

## Best Practices

1. **Set `tracesSampleRate` low in production** — Cloudflare Workers handle high request volumes. Start with `0.05`–`0.1` and adjust based on volume and cost.

2. **Use `tracePropagationTargets`** — avoid leaking trace headers to third-party APIs. Only propagate to your own services.

3. **Access bindings via `env`** — D1 and Workers AI are auto-instrumented when you use `env.DB` / `env.AI` directly, giving query- and model-level visibility with no manual wrapping.

4. **Use `startSpan` for custom operations** — wrap business logic in spans for detailed visibility beyond HTTP/DB.

5. **Don't forget `span.end()`** — when using `startInactiveSpan` or `startSpanManual`, always end the span.

### `waitUntil()` Background Work

Spans started inside `ctx.waitUntil()` run **after** the response is returned, so the request's root span has usually already ended. To make sure background spans are recorded as their own transaction, start them with `forceTransaction: true`:

```typescript
ctx.waitUntil(
  Sentry.startSpan(
    { name: "background-cleanup", op: "task", forceTransaction: true },
    async () => {
      await cleanup(env.DB);
    },
  ),
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No traces appearing | Verify `tracesSampleRate` or `tracesSampler` is set in init options |
| Missing outbound fetch spans | Ensure `fetchIntegration` is not removed from `defaultIntegrations` |
| Trace headers not propagated | Check `tracePropagationTargets` includes the target URL |
| D1 spans not appearing | Access the binding via `env.DB` (auto-instrumented by `withSentry`); ensure `tracesSampleRate` is set |
| RPC / Durable Object calls not in the same trace | Set `enableRpcTracePropagation: true` on **both** caller and receiver |
| Background (`waitUntil`) work missing from traces | Start the span with `forceTransaction: true` |
| Very short span durations (0ms) | Expected for CPU-bound work — Cloudflare Workers timers only advance during I/O |
| Streaming response spans too short | Update to latest SDK — streaming response tracking was added in v10.x |
