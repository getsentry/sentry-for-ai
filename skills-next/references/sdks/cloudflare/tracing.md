# Tracing — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+
> Streaming response span tracking: v10.x+
> `propagateTraceparent`: v10.x+
> OpenTelemetry compatibility tracer: v10.x+

---

## How Tracing Works

The Cloudflare SDK is **not natively OpenTelemetry-based** (unlike `@sentry/node`), but it sets up an OpenTelemetry compatibility tracer. This means:

- Spans emitted via `@opentelemetry/api` are captured by Sentry
- The SDK creates its own HTTP server spans for incoming requests
- Outbound `fetch()` calls are automatically traced via `fetchIntegration`
- D1 queries are traced when you use `instrumentD1WithSentry`

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

      // Always trace health checks
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

When you instrument D1 with `instrumentD1WithSentry`, all queries create `db.query` spans:

```typescript
const db = Sentry.instrumentD1WithSentry(env.DB);

// This creates a db.query span with the SQL statement
const result = await db.prepare("SELECT * FROM users WHERE id = ?").bind(1).run();
```

Span attributes include:
- `cloudflare.d1.query_type` — `first`, `run`, `all`, or `raw`
- `cloudflare.d1.duration` — query duration
- `cloudflare.d1.rows_read` — number of rows read
- `cloudflare.d1.rows_written` — number of rows written

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

---

## Durable Object Tracing

Durable Objects instrumented with `instrumentDurableObjectWithSentry` automatically create spans for:

- `fetch` — creates `http.server` spans (same as regular fetch handlers)
- `alarm` — creates spans named `alarm`
- `webSocketMessage` — creates spans named `webSocketMessage`
- `webSocketClose` — creates spans named `webSocketClose`
- `webSocketError` — creates spans named `webSocketError`
- **RPC methods** — any public instance method creates spans with `op: "rpc"`

See `references/durable-objects.md` for full setup.

---

## Workflow Step Tracing

Workflows instrumented with `instrumentWorkflowWithSentry` create spans for each `step.do()` call:

```typescript
// Each step.do() creates a span with op "function.step.do"
await step.do("process-payment", async () => {
  return await processPayment();
});
```

See the Workflows section in `references/durable-objects.md` for full setup.

---

## Best Practices

1. **Set `tracesSampleRate` low in production** — Cloudflare Workers handle high request volumes. Start with `0.05`–`0.1` and adjust based on volume and cost.

2. **Use `tracePropagationTargets`** — avoid leaking trace headers to third-party APIs. Only propagate to your own services.

3. **Instrument D1** — `instrumentD1WithSentry` adds almost no overhead and gives you query-level visibility.

4. **Use `startSpan` for custom operations** — wrap business logic in spans for detailed visibility beyond HTTP/DB.

5. **Don't forget `span.end()`** — when using `startInactiveSpan` or `startSpanManual`, always end the span.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No traces appearing | Verify `tracesSampleRate` or `tracesSampler` is set in init options |
| Missing outbound fetch spans | Ensure `fetchIntegration` is not removed from `defaultIntegrations` |
| Trace headers not propagated | Check `tracePropagationTargets` includes the target URL |
| D1 spans not appearing | Ensure `instrumentD1WithSentry(env.DB)` is called before queries |
| Very short span durations (0ms) | Expected for CPU-bound work — Cloudflare Workers timers only advance during I/O |
| Streaming response spans too short | Update to latest SDK — streaming response tracking was added in v10.x |
