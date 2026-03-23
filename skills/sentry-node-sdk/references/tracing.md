# Tracing — Sentry Node.js SDK

> Minimum SDK: `@sentry/node` ≥8.0.0 (Node.js, Bun)  
> `@sentry/deno` for Deno runtime  
> `ignoreSpans`: ≥8.x  
> `inheritOrSampleWith`: ≥9.x

---

## How Tracing Works in v8+

`@sentry/node` v8 is **built on OpenTelemetry natively**. When you call `Sentry.init()`, it registers:

- **`SentrySpanProcessor`** — captures OTel spans and sends them to Sentry
- **`SentryPropagator`** — injects/extracts `sentry-trace` and `baggage` headers
- **`SentrySampler`** — applies `tracesSampleRate` / `tracesSampler` decisions
- **`SentryContextManager`** — manages active span context via AsyncLocalStorage

This means **any OTel-compatible library** (custom or third-party) automatically produces spans visible in Sentry — no Sentry-specific code needed in those libraries.

---

## Activating Tracing

Set **either** `tracesSampleRate` **or** `tracesSampler` in `Sentry.init()`. Without one of these, no spans are created.

```typescript
// instrument.ts (must run before your app)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0, // 100% in development, lower in production
});
```

> **To disable tracing entirely:** omit both `tracesSampleRate` and `tracesSampler`. Setting `tracesSampleRate: 0` activates the OTel machinery but drops all traces — not the same as disabled.

---

## `tracesSampleRate` — Uniform Sampling

A number between `0.0` and `1.0`:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
```

| Value | Effect |
|-------|--------|
| `1.0` | Capture 100% of traces |
| `0.1` | Capture 10% of traces |
| `0.0` | Initialize tracing but send nothing |
| omitted | Tracing disabled entirely |

---

## `tracesSampler` — Dynamic Per-Request Sampling

When defined, `tracesSampler` **takes precedence** over `tracesSampleRate`. Receives a `SamplingContext` and returns a number `0`–`1` (or boolean).

```typescript
// TypeScript: SamplingContext shape
interface SamplingContext {
  name: string;                                   // e.g. "GET /api/users"
  attributes: SpanAttributes | undefined;
  parentSampled: boolean | undefined;             // parent's sampling decision
  parentSampleRate: number | undefined;
  inheritOrSampleWith: (fallbackRate: number) => number; // ≥9.x
}
```

### Route-Based Sampling

```typescript
Sentry.init({
  tracesSampler: ({ name, inheritOrSampleWith }) => {
    // Always drop health checks
    if (name.includes("/health") || name.includes("/ping")) return 0;

    // Always sample critical flows
    if (name.includes("/checkout") || name.includes("/payment")) return 1.0;

    // Honor parent's decision, fall back to 10%
    return inheritOrSampleWith(0.1);
  },
});
```

### `inheritOrSampleWith()` (≥9.x)

Respects the upstream trace's sampling decision. If no parent decision exists, applies your fallback rate. Always prefer this over checking `parentSampled` directly — it propagates rates accurately through distributed traces and sets the correct `sentry-sampled` value in `baggage`.

```typescript
// Without inheritOrSampleWith (manual check)
tracesSampler: ({ parentSampled }) => {
  if (parentSampled !== undefined) return parentSampled ? 1 : 0;
  return 0.1;
},

// With inheritOrSampleWith (cleaner, accurate metric extrapolation)
tracesSampler: ({ inheritOrSampleWith }) => inheritOrSampleWith(0.1),
```

### Sampling Precedence

1. `tracesSampler` function (if defined) — evaluated first
2. Parent's sampling decision (propagated via `sentry-trace` header)
3. `tracesSampleRate` (uniform fallback)

---

## Auto-Instrumented Libraries

`@sentry/node` v8 ships with **28+ auto-instrumented packages** via bundled OTel instrumentations. No additional configuration needed — they activate automatically on `Sentry.init()`.

### HTTP & Web

| Library | `op` | What's captured |
|---------|------|-----------------|
| `node:http` / `node:https` (incoming) | `http.server` | Method, URL, status code, duration |
| `node:http` / `node:https` (outgoing) | `http.client` | Method, URL, status code, duration |
| `fetch` / `undici` | `http.client` | Method, URL, status code (headers opt-in via `headersToSpanAttributes`) |
| `axios` | `http.client` | Method, URL, status code |

#### Capturing HTTP Headers on Fetch Spans

Since `@opentelemetry/instrumentation-undici@0.22.0`, response headers like `content-length` are **no longer captured automatically** on outgoing `fetch`/`undici` spans. To restore header capture or add custom headers, use `headersToSpanAttributes` on `nativeNodeFetchIntegration()`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.nativeNodeFetchIntegration({
      headersToSpanAttributes: {
        requestHeaders: ["x-request-id", "x-custom-header"],
        responseHeaders: ["content-length", "content-type"],
      },
    }),
  ],
});
```

Matched headers appear as span attributes: `http.request.header.<name>` and `http.response.header.<name>`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headersToSpanAttributes.requestHeaders` | `string[]` | `undefined` | Request header names to capture as span attributes |
| `headersToSpanAttributes.responseHeaders` | `string[]` | `undefined` | Response header names to capture as span attributes |

### Databases

| Library | `op` | What's captured |
|---------|------|-----------------|
| `pg` (PostgreSQL) | `db.query` | SQL query text, duration |
| `mysql2` | `db.query` | SQL query text, duration |
| `mysql` | `db.query` | SQL query text, duration |
| `mongodb` | `db` | Collection, operation name |
| `redis` | `db.redis` | Command, key |
| `ioredis` | `db.redis` | Command, key |
| `prisma` (v5+) | `db.query` | SQL query, model |
| `sequelize` | `db.query` | SQL query text |
| `typeorm` | `db.query` | SQL query text |
| `knex` | `db.query` | SQL query text |

### Message Queues & Async

| Library | `op` | What's captured |
|---------|------|-----------------|
| `kafkajs` | `queue.publish` / `queue.process` | Topic, partition |
| `amqplib` | `queue.publish` / `queue.process` | Exchange, routing key |
| `@google-cloud/pubsub` | `queue.publish` / `queue.process` | Topic, subscription |
| `@aws-sdk/*` (SNS/SQS) | `queue.publish` / `queue.process` | Queue URL, message ID |
| `bull` | `queue.process` | Job name, queue name |
| `bullmq` | `queue.process` | Job name, queue name |

### GraphQL & RPC

| Library | `op` | What's captured |
|---------|------|-----------------|
| `graphql` / `apollo-server` | `graphql.resolve` | Operation name, field path |

### AI/LLM

| Library | `op` | What's captured |
|---------|------|-----------------|
| `@openai/sdk` | `ai.pipeline.*` | Model, tokens, prompt/completion |
| `@anthropic-ai/sdk` | `ai.pipeline.*` | Model, tokens |
| `langchain` | `ai.pipeline.*` | Chain, retriever, LLM operation |
| `ai` (Vercel AI SDK) | `ai.pipeline.*` | Model, tokens |
| `@google/generative-ai` | `ai.pipeline.*` | Model name |

> **Note:** AI library instrumentation may require `Sentry.init()` with `skipOpenTelemetrySetup: false` (the default). See the AI Monitoring reference for full configuration.

---

## Custom Spans

### `Sentry.startSpan()` — Active, Auto-Ending (Recommended)

Creates an active span (children nest under it automatically) that ends when the callback returns or resolves:

```typescript
// Async
const data = await Sentry.startSpan(
  {
    name: "fetchUserProfile",
    op: "http.client",
    attributes: { "user.id": userId, "cache.hit": false },
  },
  async () => {
    const res = await fetch(`/api/users/${userId}`);
    return res.json();
  },
);

// Sync
const result = Sentry.startSpan(
  { name: "computeScore", op: "function" },
  () => expensiveComputation(),
);
```

### Nested Spans (Parent–Child Hierarchy)

```typescript
await Sentry.startSpan({ name: "checkout-flow", op: "function" }, async () => {
  // Automatically children of "checkout-flow"
  const cart = await Sentry.startSpan(
    { name: "fetchCart", op: "db.query" },
    () => db.cart.findUnique({ where: { userId } }),
  );

  const payment = await Sentry.startSpan(
    { name: "processPayment", op: "http.client" },
    () => stripe.paymentIntents.create({ amount: cart.total }),
  );

  return { cart, payment };
});
```

### `Sentry.startSpanManual()` — Active, Manual End

Use when the span lifetime cannot be enclosed in a callback (e.g., middleware with async continuations):

```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  return Sentry.startSpanManual({ name: "auth.verify", op: "middleware" }, (span) => {
    res.once("finish", () => {
      span.setStatus({ code: res.statusCode < 400 ? 1 : 2 });
      span.end(); // ← required; leaks if omitted
    });
    return next();
  });
}
```

### `Sentry.startInactiveSpan()` — Not Active, Manual End

Creates a span that is **never** automatically made active. Use for parallel work or spans that don't fit the call stack:

```typescript
// Parallel independent operations
const spanA = Sentry.startInactiveSpan({ name: "operation-a" });
const spanB = Sentry.startInactiveSpan({ name: "operation-b" });

await Promise.all([doA(), doB()]);

spanA.end();
spanB.end();

// Explicit parent assignment
const parent = Sentry.startInactiveSpan({ name: "parent" });
const child = Sentry.startInactiveSpan({ name: "child", parentSpan: parent });
child.end();
parent.end();
```

### `Sentry.withActiveSpan()` — Temporarily Activate a Span

Makes an inactive span active for the duration of a callback. Does **not** end the span:

```typescript
const backgroundSpan = Sentry.startInactiveSpan({ name: "background-task", op: "task" });

await Sentry.withActiveSpan(backgroundSpan, async () => {
  // Any nested startSpan() calls are children of backgroundSpan
  await sendEmails();
  await db.save(results);
});

backgroundSpan.end();
```

---

## Span Options Reference

```typescript
interface StartSpanOptions {
  name: string;               // Required: label shown in the UI
  op?: string;                // Operation category (see table below)
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: Span;          // Override automatic parent
  onlyIfParent?: boolean;     // Skip span if no active parent exists
  forceTransaction?: boolean; // Force display as root transaction in UI
  startTime?: number;         // Unix timestamp in seconds
}
```

**Common `op` values:**

| `op` | Use for |
|------|---------|
| `http.client` | Outgoing HTTP requests |
| `http.server` | Incoming HTTP requests |
| `db` / `db.query` | Database queries |
| `db.redis` | Redis operations |
| `function` | General function calls |
| `queue.publish` | Publishing to message queues |
| `queue.process` | Consuming from message queues |
| `cache.get` / `cache.put` | Cache reads/writes |
| `task` | Background / scheduled work |
| `ai.pipeline.*` | AI/LLM inference calls |

---

## Span Enrichment

```typescript
// Set attributes on the currently active span
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("db.table", "users");
  span.setAttributes({
    "http.method": "POST",
    "order.total": 99.99,
    "user.tier": "premium",
  });

  // Status: 0=unset, 1=ok, 2=error
  span.setStatus({ code: 1 });
  span.setStatus({ code: 2, message: "Payment declined" });
}

// Record an exception on the active span
const span = Sentry.getActiveSpan();
if (span) span.recordException(error);

// Rename a span at runtime
Sentry.updateSpanName(span, "GET /users/:id");

// Modify all spans globally before sending
Sentry.init({
  beforeSendSpan(span) {
    // Add deployment metadata to every span
    span.data = { ...span.data, "deployment.region": process.env.AWS_REGION };
    return span; // return null to drop (prefer ignoreSpans for filtering)
  },
});
```

---

## Advanced Span APIs

### `continueTrace()` — Continue an Incoming Trace

For message queues, cron triggers, and other non-HTTP channels that carry trace headers:

```typescript
Sentry.continueTrace(
  {
    sentryTrace: message.headers["sentry-trace"],
    baggage: message.headers["baggage"],
  },
  () => {
    return Sentry.startSpan({ name: "processJob", op: "queue.process" }, () =>
      doWork(),
    );
  },
);
```

> HTTP servers handled by framework integrations (Express, Fastify, etc.) call `continueTrace()` automatically. You only need it for non-HTTP channels.

### `startNewTrace()` — Force a New Trace

Breaks the distributed chain — creates an independent trace with a new `traceId`:

```typescript
Sentry.startNewTrace(() => {
  return Sentry.startSpan({ name: "isolated-background-job" }, () => doWork());
});
```

### `suppressTracing()` — Prevent Span Capture

Suppresses span creation inside the callback, even for auto-instrumented code:

```typescript
// Health check polling — don't create spans
const result = await Sentry.suppressTracing(() => {
  return fetch("/internal/health");
});
```

### `getActiveSpan()`, `getRootSpan()`

```typescript
const span = Sentry.getActiveSpan();
if (span) {
  const root = Sentry.getRootSpan(span);
  console.log(Sentry.spanToJSON(root).name);
}
```

### `forceTransaction` and `onlyIfParent`

```typescript
// Force span to appear as root transaction in Sentry UI
Sentry.startSpan(
  { name: "background-job", op: "function", forceTransaction: true },
  () => runBackgroundJob(),
);

// Only create span when an active parent exists (drop orphan spans)
Sentry.startSpan(
  { name: "optional-metric", onlyIfParent: true },
  () => measureSomething(),
);
```

---

## `ignoreSpans` — Filtering Spans

Drop specific spans before they are sent. Accepts strings (substring match), RegExp, or functions:

```typescript
Sentry.init({
  ignoreSpans: [
    // Drop health check spans
    /health|heartbeat|ping/,
    // Drop internal DB keepalive queries
    (span) => span.op === "db.query" && span.description?.includes("SELECT 1"),
  ],
});
```

---

## Distributed Tracing

### How It Works

Sentry injects two headers into outgoing HTTP requests:

| Header | Format | Purpose |
|--------|--------|---------|
| `sentry-trace` | `{traceId}-{spanId}-{sampled}` | Carries trace context |
| `baggage` | W3C Baggage with `sentry-*` keys | Carries sampling decision + metadata |

Backends must allowlist these for CORS:
```
Access-Control-Allow-Headers: sentry-trace, baggage
```

### `tracePropagationTargets`

Controls which outgoing requests get trace headers. Accepts strings (substring match) and/or RegExp:

```typescript
Sentry.init({
  tracePropagationTargets: [
    "localhost",                           // any URL containing "localhost"
    /^https:\/\/api\.yourapp\.com/,        // your API
    /^https:\/\/auth\.yourapp\.com/,       // auth service
  ],
});
```

**Default:** `['localhost', /^\//]` — only localhost and relative paths.  
**Disable entirely:** `tracePropagationTargets: []`

> ⚠️ If your API is at `http://localhost:3001`, use `"localhost:3001"` or a regex matching the port — `"localhost"` alone won't match.

### Manual Trace Propagation (Non-HTTP Channels)

For Kafka, AMQP, WebSockets, and other protocols:

```typescript
// Publisher — extract current trace context
import * as Sentry from "@sentry/node";

await Sentry.startSpan({ name: "Publish order event", op: "queue.publish" }, async () => {
  const traceData = Sentry.getTraceData();
  // Returns: { "sentry-trace": "...", "baggage": "..." }

  await kafka.send({
    topic: "orders",
    messages: [{
      value: JSON.stringify({ orderId: 123 }),
      headers: {
        "sentry-trace": traceData["sentry-trace"],
        "baggage": traceData["baggage"],
      },
    }],
  });
});

// Consumer — continue the trace
consumer.run({
  eachMessage: async ({ message }) => {
    Sentry.continueTrace(
      {
        sentryTrace: message.headers["sentry-trace"]?.toString(),
        baggage: message.headers["baggage"]?.toString(),
      },
      () => Sentry.startSpan({ name: "Process order", op: "queue.process" }, () =>
        processOrder(message),
      ),
    );
  },
});
```

### Head-Based Sampling

The originating (head) service makes the sampling decision and propagates it via `sentry-trace`. All downstream services either all sample or all drop — ensuring complete traces, never partial ones.

---

## Framework Auto-Instrumentation

Framework integrations are included in `@sentry/node` and activated automatically. You don't add them via `integrations: []` — they are registered when you call `Sentry.init()` and `setupXxxErrorHandler()`.

### Express

```typescript
import express from "express";
import * as Sentry from "@sentry/node";

// instrument.ts must load FIRST — before express is required
Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });

const app = express();

app.get("/api/users/:id", async (req, res) => {
  // DB queries are automatically child spans of this HTTP transaction
  const user = await db.users.findUnique({ where: { id: req.params.id } });
  res.json(user);
});

// Error handler AFTER all routes
Sentry.setupExpressErrorHandler(app);
app.listen(3000);
```

Sentry automatically traces all incoming requests. Each `GET /api/users/:id` becomes an `http.server` transaction with DB query spans as children.

### Fastify

```typescript
import Fastify from "fastify";
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });

const fastify = Fastify();

// Error handler BEFORE routes (Fastify-specific — not async, unlike Hapi)
Sentry.setupFastifyErrorHandler(fastify);

fastify.get("/api/data", async (request, reply) => {
  return fetchData();
});

await fastify.listen({ port: 3000 });
```

### Koa

```typescript
import Koa from "koa";
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });

const app = new Koa();
Sentry.setupKoaErrorHandler(app); // FIRST middleware

app.use(async (ctx) => {
  ctx.body = await fetchData();
});

app.listen(3000);
```

### Hapi

```typescript
import Hapi from "@hapi/hapi";
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });

const server = Hapi.server({ port: 3000 });
await Sentry.setupHapiErrorHandler(server); // must await

server.route({
  method: "GET",
  path: "/api/data",
  handler: async (request) => fetchData(),
});

await server.start();
```

### NestJS

> **NestJS has a dedicated skill: [`sentry-nestjs-sdk`](../sentry-nestjs-sdk/SKILL.md)**
> It covers `SentryModule.forRoot()`, `@SentryTraced` decorator for custom spans,
> `SentryTracingInterceptor`, and GraphQL resolver tracing.

---

## Configuration Reference

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sampling
  tracesSampleRate: 0.1,
  // OR:
  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("/health")) return 0;
    if (name.includes("/checkout")) return 1.0;
    return inheritOrSampleWith(0.1);
  },

  // Propagation — which outgoing requests get trace headers
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yourapp\.com/,
  ],

  // Drop specific spans before sending
  ignoreSpans: [
    /health|ping/,
    (span) => span.op === "db.query" && span.description?.includes("SELECT 1"),
  ],

  // Modify all spans before sending (or return null to drop)
  beforeSendSpan(span) {
    if (span.op === "http.client" && span.data?.url?.includes("/internal")) {
      return null; // drop internal health check spans
    }
    return span;
  },

  // Capture HTTP headers on outgoing fetch/undici spans
  integrations: [
    Sentry.nativeNodeFetchIntegration({
      headersToSpanAttributes: {
        requestHeaders: ["x-request-id"],
        responseHeaders: ["content-length", "content-type"],
      },
    }),
  ],
});
```

**Environment variables:**

| Variable | Effect |
|----------|--------|
| `SENTRY_TRACES_SAMPLE_RATE` | Sets `tracesSampleRate` |
| `SENTRY_ENVIRONMENT` | Sets `environment` |

---

## Runtime Differences

### Node.js

Full tracing support via `@sentry/node`. All 28+ auto-instrumentations available. Profiling available via `@sentry/profiling-node`.

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "...",
  tracesSampleRate: 1.0,
});
```

### Bun

`@sentry/bun` wraps `@sentry/node` — tracing is 99% identical to Node.js. The same auto-instrumentation table applies. Profiling is **not** available (native addon incompatible with Bun).

```typescript
// bun-instrument.ts — loaded via --preload
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "...",
  tracesSampleRate: 1.0,
});
```

```bash
bun --preload ./bun-instrument.ts run app.ts
```

`Bun.serve()` is automatically instrumented — each request becomes an `http.server` transaction.

### Deno

`@sentry/deno` uses `npm:@sentry/deno`. Auto-instrumented libraries are limited — Deno doesn't load Node.js OTel instrumentations. Custom spans work identically.

```typescript
import * as Sentry from "npm:@sentry/deno";

Sentry.init({
  dsn: "...",
  tracesSampleRate: 1.0,
});

// Deno.serve — wrap handlers manually (not auto-instrumented)
Deno.serve(async (req) => {
  return Sentry.startSpan(
    { name: `${req.method} ${new URL(req.url).pathname}`, op: "http.server" },
    async () => {
      const data = await handleRequest(req);
      return new Response(JSON.stringify(data));
    },
  );
});
```

**Runtime comparison:**

| Feature | Node.js | Bun | Deno |
|---------|---------|-----|------|
| Tracing (OTel) | ✅ Full | ✅ Via Node | ✅ Custom OTel |
| HTTP auto-instrumentation | ✅ | ✅ | ⚠️ Manual |
| Database auto-instrumentation | ✅ 10+ drivers | ✅ | ❌ |
| Message queue auto-instrumentation | ✅ | ✅ | ❌ |
| Profiling | ✅ | ❌ | ❌ |
| Custom spans | ✅ | ✅ | ✅ |
| Distributed tracing | ✅ | ✅ | ✅ |

---

## Complete Example

```typescript
// instrument.ts — loaded first via --require or --import
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("/health") || name.includes("/ping")) return 0;
    if (name.includes("/checkout") || name.includes("/payment")) return 1.0;
    return inheritOrSampleWith(0.1);
  },

  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.myapp\.com/,
    /^https:\/\/auth\.myapp\.com/,
  ],

  ignoreSpans: [/health|heartbeat/],
});
```

```typescript
// orders.service.ts
import * as Sentry from "@sentry/node";

export async function createOrder(userId: string, items: Item[]) {
  return Sentry.startSpan({ name: "createOrder", op: "function" }, async () => {
    // DB queries are automatically child spans
    const user = await db.users.findUnique({ where: { id: userId } });

    const total = await Sentry.startSpan(
      { name: "calculateTotal", op: "function" },
      () => computeTotal(items),
    );

    // Enrich the active span
    const span = Sentry.getActiveSpan();
    if (span) {
      span.setAttributes({ "order.total": total, "order.item_count": items.length });
    }

    // Outgoing HTTP — automatically traced
    const payment = await stripe.paymentIntents.create({ amount: total });

    return db.orders.create({ data: { userId, items, total, paymentId: payment.id } });
  });
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Performance dashboard | Verify `tracesSampleRate` or `tracesSampler` is set; `Sentry.init()` must run before any imports |
| Spans missing for DB queries | Confirm the driver is in the auto-instrumentation table above; `Sentry.init()` must run first |
| Distributed trace not linking services | Add the target URL to `tracePropagationTargets`; verify `Access-Control-Allow-Headers: sentry-trace, baggage` |
| `tracePropagationTargets` port not matching | `"localhost"` won't match `localhost:3001` — use `"localhost:3001"` or a regex |
| `continueTrace()` not linking to parent | Confirm incoming headers are `"sentry-trace"` and `"baggage"` (not `traceparent`) |
| High transaction volume | Use `tracesSampler` to return `0` for health checks; lower default rate |
| `tracesSampler` not working | When both `tracesSampler` and `tracesSampleRate` are set, `tracesSampler` wins — expected |
| Spans show generic names (raw URLs) | Use `beforeSendSpan` or framework route parameterization to normalize names |
| Bun profiling not working | Profiling requires `@sentry/profiling-node` native addon — incompatible with Bun |
| Deno DB spans missing | Deno doesn't load Node.js OTel instrumentations; use `startSpan()` manually |
