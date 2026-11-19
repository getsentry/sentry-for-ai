# Tracing — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥8.0.0  
> `withServerActionInstrumentation`: ≥8.0.0  
> `enableLongAnimationFrame`: ≥8.18.0  
> `ignoreSpans`: ≥10.2.0

---

## How Tracing Is Activated

Tracing is enabled by setting **`tracesSampleRate`** or **`tracesSampler`** in all three runtime config files. Without one of these, no spans are created.

| Config file | Runtime | What it traces |
|---|---|---|
| `instrumentation-client.ts` | Browser | Page loads, navigations, fetch/XHR, Web Vitals, INP |
| `sentry.server.config.ts` | Node.js | API routes, RSC renders, `getServerSideProps`, background work |
| `sentry.edge.config.ts` | Edge | Next.js middleware |

> ⚠️ **All three must have tracing configured.** Missing one means that runtime produces no spans.

---

## `tracesSampleRate` — Uniform Sampling

A number between `0.0` and `1.0`. Set the same option in all three configs:

```typescript
// Recommended: 100% in development, lower in production
tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
```

> **To disable tracing entirely:** omit both `tracesSampleRate` and `tracesSampler`. Setting `tracesSampleRate: 0` is not the same — it still activates instrumentation but sends nothing.

---

## `tracesSampler` — Dynamic Per-Request Sampling

When defined, `tracesSampler` takes **precedence** over `tracesSampleRate`. Receives a `SamplingContext` and returns a number (0–1) or boolean.

```typescript
// TypeScript: SamplingContext shape
interface SamplingContext {
  name: string;                                      // e.g. "GET /api/users"
  attributes: SpanAttributes | undefined;
  parentSampled: boolean | undefined;                // parent's sampling decision
  parentSampleRate: number | undefined;
  inheritOrSampleWith: (fallbackRate: number) => number;
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

    // Sample admin routes at 50%
    if (name.includes("/admin")) return 0.5;

    // For everything else: honor parent's decision, fall back to 10%
    return inheritOrSampleWith(0.1);
  },
});
```

### With Parent Trace Inheritance

```typescript
Sentry.init({
  tracesSampler: ({ name, parentSampled, inheritOrSampleWith }) => {
    if (name.includes("healthcheck")) return 0;
    if (name.includes("auth"))        return 1;
    // inheritOrSampleWith: respects parent decision if present, else uses fallback
    return inheritOrSampleWith(0.5);
  },
});
```

**Why use `inheritOrSampleWith` instead of checking `parentSampled` directly?**  
It ensures consistent rates flow through distributed traces, enables accurate metric extrapolation, and sets the correct `sentry-sampled` value in downstream `baggage`.

### Sampling Precedence

1. `tracesSampler` function (if defined) — evaluated first
2. Parent's sampling decision (propagated via `sentry-trace` header)
3. `tracesSampleRate` (uniform fallback)

---

## Auto-Instrumented Operations

### Client-Side (Browser)

| Operation | Op | What's captured |
|---|---|---|
| Initial page load | `pageload` | LCP, CLS, FCP, TTFB Web Vitals; resource load child spans |
| Client-side navigation | `navigation` | Route change duration; child fetch/XHR spans |
| `fetch()` requests | `http.client` | URL, method, status code, duration, HTTP timings |
| `XMLHttpRequest` | `http.client` | Same as fetch |
| User interactions | `ui.interaction` | INP (Interaction to Next Paint) — emitted on page hide |
| Long Tasks (> 50ms) | `ui.long-task` | Main-thread blocking events |
| Long Animation Frames | `ui.long-animation-frame` | LoAF rendering work — SDK ≥8.18.0 |

### Server-Side (Node.js)

| Operation | Op | Notes |
|---|---|---|
| API route handlers (App Router) | `http.server` | `app/api/*/route.ts` — auto-instrumented |
| API route handlers (Pages Router) | `http.server` | `pages/api/*.ts` — auto-instrumented |
| React Server Components | `http.server` | RSC render times |
| `getServerSideProps` | `http.server` | Pages Router SSR data fetching |
| Edge Middleware | `http.server` | Via `sentry.edge.config.ts` |

> ⚠️ **Server Actions are NOT auto-instrumented.** Wrap each with `withServerActionInstrumentation()` — see below.

---

## `browserTracingIntegration` Options

```typescript
// instrumentation-client.ts
Sentry.init({
  integrations: [
    Sentry.browserTracingIntegration({
      // Page Load & Navigation
      instrumentPageLoad: true,        // default: true
      instrumentNavigation: true,      // default: true

      // HTTP spans
      traceFetch: true,                // default: true
      traceXHR: true,                  // default: true
      enableHTTPTimings: true,         // default: true
      shouldCreateSpanForRequest: (url) => !url.includes("/health"),

      // Performance observations
      enableLongTask: true,            // default: true
      enableLongAnimationFrame: true,  // default: true (SDK ≥8.18.0)
      enableInp: true,                 // INP spans

      // Span lifecycle
      idleTimeout: 1000,               // ms: wait after last child before ending
      finalTimeout: 30000,             // ms: hard cap on span duration
      childSpanTimeout: 15000,         // ms: max time for child spans

      // Span naming — parameterize URLs
      beforeStartSpan: (context) => ({
        ...context,
        name: context.name.replace(/\/\d+/g, "/<id>"),
      }),

      // Span filtering
      ignoreResourceSpans: ["resource.css", "resource.script", "resource.img"],
    }),
  ],
});
```

---

## Custom Spans

### `Sentry.startSpan()` — Active, Auto-Ending (Recommended)

Wraps a block of work. The span becomes active (children nest under it) and ends automatically when the callback returns or resolves:

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
  { name: "computeRecommendations", op: "function" },
  () => expensiveComputation(),
);
```

### Nested Spans (Parent–Child Hierarchy)

```typescript
await Sentry.startSpan({ name: "checkout-flow", op: "function" }, async () => {
  // These are automatically children of "checkout-flow"
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

Use when the span lifetime cannot be enclosed in a callback:

```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  return Sentry.startSpanManual({ name: "auth.verify", op: "middleware" }, (span) => {
    res.once("finish", () => {
      span.setStatus({ code: res.statusCode < 400 ? 1 : 2 });
      span.end(); // ← required
    });
    return next();
  });
}
```

### `Sentry.startInactiveSpan()` — Not Active, Manual End

Creates a span that is **never** automatically made active. Use for parallel work or event-based tracking:

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

### Browser: `setActiveSpanInBrowser()` — Persistent Active Span

When a callback-based API isn't practical (e.g., UI event handlers), keep a span active across event calls. Available since SDK v10.15.0:

```typescript
let checkoutSpan: Sentry.Span | undefined;

onCheckoutStart(() => {
  checkoutSpan = Sentry.startInactiveSpan({ name: "checkout-flow" });
  Sentry.setActiveSpanInBrowser(checkoutSpan);
});

onCheckoutComplete(() => {
  checkoutSpan?.end();
});
```

> ⚠️ `setActiveSpanInBrowser` is **browser-only**.

---

## Span Options Reference

```typescript
interface StartSpanOptions {
  name: string;              // Required: label shown in the UI
  op?: string;               // Operation category (see table below)
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: Span;         // Override automatic parent
  onlyIfParent?: boolean;    // Skip span if no active parent exists
  forceTransaction?: boolean; // Force display as root transaction in UI
  startTime?: number;        // Unix timestamp in seconds
}
```

**Common `op` values:**

| `op` | Use for |
|------|---------|
| `http.client` | Outgoing HTTP requests (fetch, XHR) |
| `http.server` | Incoming HTTP requests (API routes, SSR) |
| `db` / `db.query` | Database queries |
| `db.redis` | Redis operations |
| `function` | General function calls |
| `ui.render` | Component render time |
| `ui.action.click` | Click event handling |
| `cache.get` / `cache.put` | Cache reads/writes |
| `queue.publish` / `queue.process` | Message queue operations |
| `task` | Background / scheduled work |

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

// Rename a span at runtime
const span = Sentry.getActiveSpan();
if (span) Sentry.updateSpanName(span, "GET /users/:id");

// Modify all spans globally before sending
Sentry.init({
  beforeSendSpan(span) {
    span.data = {
      ...span.data,
      "deployment.region": process.env.AWS_REGION ?? "unknown",
    };
    return span; // return null to drop (but prefer ignoreSpans for that)
  },
});
```

---

## Server Actions — `withServerActionInstrumentation()`

Server Actions are not auto-instrumented. Wrap each with `withServerActionInstrumentation()`:

```typescript
// app/actions/order.ts
"use server";
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";

export async function createOrder(formData: FormData) {
  return Sentry.withServerActionInstrumentation(
    "createOrder",                       // Action name (becomes span name)
    {
      headers: await headers(),          // Enables distributed trace continuation
      formData,                          // Logged as span data
      recordResponse: true,              // Capture the return value
    },
    async () => {
      const order = await db.orders.create({
        data: { items: formData.get("items"), userId: getCurrentUser() },
      });
      return { success: true, orderId: order.id };
    },
  );
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `formData` | `FormData` | Logged with the span |
| `headers` | `Headers` | Required for distributed trace continuation — always pass `await headers()` |
| `recordResponse` | `boolean` | Whether to capture the return value as span data |

---

## Distributed Tracing

### How It Works

Sentry injects two HTTP headers into outgoing requests:

| Header | Format | Purpose |
|--------|--------|---------|
| `sentry-trace` | `{traceId}-{spanId}-{sampled}` | Carries trace context |
| `baggage` | W3C Baggage with `sentry-*` keys | Carries sampling decision + metadata |

Backends must allowlist these headers for CORS:
```
Access-Control-Allow-Headers: sentry-trace, baggage
```

### `tracePropagationTargets`

Controls which outgoing requests get trace headers. Accepts strings (substring match) and/or RegExp:

```typescript
// instrumentation-client.ts
Sentry.init({
  tracePropagationTargets: [
    "localhost",                            // any URL containing "localhost"
    /^https:\/\/api\.yourapp\.com/,         // your API
    /^https:\/\/auth\.yourapp\.com/,        // auth service
    /^\//,                                  // all same-origin relative paths
  ],
});
```

**Default:** `['localhost', /^\//]` — only localhost and same-origin requests.  
**Disable entirely:** `tracePropagationTargets: []`

> ⚠️ If your API is at `http://localhost:3001`, use `"localhost:3001"` or a regex matching the port — `"localhost"` alone won't match.

### Automatic SSR → Client Trace Continuation

When Next.js server-renders a page, Sentry emits trace context as `<meta>` tags in `<head>`. The browser SDK reads them automatically to continue the same trace:

```html
<!-- Auto-injected by Next.js SDK — no configuration needed -->
<meta name="sentry-trace" content="12345678...-1234567890123456-1" />
<meta name="baggage" content="sentry-trace_id=12345678...,sentry-sample_rate=0.1,..." />
```

This means a single distributed trace spans the server render **and** subsequent client-side activity.

### Manual Trace Propagation (Non-HTTP Channels)

For WebSockets, message queues, or other protocols:

```typescript
// Sender — extract current trace context
const traceData = Sentry.getTraceData();
// Returns: { "sentry-trace": "...", "baggage": "..." }

webSocket.send(JSON.stringify({
  payload: myData,
  _sentryMeta: {
    sentryTrace: traceData["sentry-trace"],
    baggage: traceData["baggage"],
  },
}));

// Receiver — continue the trace
const { sentryTrace, baggage } = message._sentryMeta;

Sentry.continueTrace({ sentryTrace, baggage }, () => {
  return Sentry.startSpan({ name: "handleWebSocketMessage" }, () => {
    processMessage(message);
  });
});
```

### Head-Based Sampling

The originating (head) service makes the sampling decision. That decision propagates to all downstream services via `sentry-trace`. All services either all sample or all drop the trace — ensuring complete traces, never partial ones.

---

## Advanced Span APIs

### `continueTrace()` — Continue Incoming Trace

```typescript
// When receiving trace headers from a message queue, cron trigger, etc.
Sentry.continueTrace(
  {
    sentryTrace: incomingHeaders["sentry-trace"],
    baggage: incomingHeaders["baggage"],
  },
  () => {
    return Sentry.startSpan({ name: "processJob", op: "function" }, () =>
      doWork(),
    );
  },
);
```

### `startNewTrace()` — Force a New Trace

```typescript
// Break the distributed chain — start a completely independent trace
Sentry.startNewTrace(() => {
  return Sentry.startSpan({ name: "isolated-operation" }, () => doWork());
});
```

### `suppressTracing()` — Prevent Span Capture

```typescript
// Prevent spans inside this callback from being sent to Sentry
const result = Sentry.suppressTracing(() => {
  return fetch("/internal/health"); // No span created
});
```

### `getActiveSpan()`, `getRootSpan()`

```typescript
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("custom.key", "value");
  const root = Sentry.getRootSpan(span);
  console.log(Sentry.spanToJSON(root).name);
}
```

### `withActiveSpan()` — Run Code with a Specific Active Span

```typescript
const mySpan = Sentry.startInactiveSpan({ name: "background-task" });

await Sentry.withActiveSpan(mySpan, async (scope) => {
  scope.setTag("task.type", "email");
  await sendEmails(); // Errors associate with mySpan
});

mySpan.end();
```

### `forceTransaction` and `onlyIfParent`

```typescript
// Forces span to appear as root transaction in Sentry UI
Sentry.startSpan(
  { name: "background-job", op: "function", forceTransaction: true },
  () => runBackgroundJob(),
);

// Only creates span when an active parent exists (drops orphan spans)
Sentry.startSpan(
  { name: "optional-metric", onlyIfParent: true },
  () => measureSomething(),
);
```

### Browser Flat Span Hierarchy

In browsers, all child spans are attached flat to the root span by default. To opt into true nesting (use with care — can produce incorrect data with concurrent async operations):

```typescript
Sentry.init({
  parentSpanIsAlwaysRootSpan: false,
});
```

---

## Complete Config Example (All Three Runtimes)

```typescript
// instrumentation-client.ts (Browser)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) => !url.match(/\/health$/),
    }),
  ],

  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("health")) return 0;
    if (name.includes("/checkout")) return 1.0;
    return inheritOrSampleWith(0.1);
  },

  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.myapp\.com/,
  ],
});
```

```typescript
// sentry.server.config.ts (Node.js)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("healthcheck")) return 0;
    return inheritOrSampleWith(0.1);
  },
});
```

```typescript
// sentry.edge.config.ts (Edge)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Performance dashboard | Verify `tracesSampleRate` or `tracesSampler` is set; confirm it's set in all three runtime configs |
| Server Actions not traced | Wrap each with `withServerActionInstrumentation()`; it's not auto-instrumented |
| Distributed trace not linking frontend → backend | Add backend URL to `tracePropagationTargets`; verify `Access-Control-Allow-Headers: sentry-trace, baggage` on the backend |
| SSR page load not linked to server trace | This is automatic — verify both client and server use the same DSN |
| API requests missing `sentry-trace` header | Check CORS preflight — backend must allow `sentry-trace` and `baggage` |
| Transaction names show raw URLs (`/users/42`) | Use `beforeStartSpan` to parameterize: replace `/\d+/g` with `/<id>` |
| `tracesSampler` not working | When both `tracesSampler` and `tracesSampleRate` are set, `tracesSampler` wins — expected behavior |
| Spans missing after async gap (browser) | Browser uses flat hierarchy; use `startInactiveSpan` with explicit `parentSpan` across async boundaries |
| `tracePropagationTargets` port not matching | `"localhost"` won't match `localhost:3001` — use `"localhost:3001"` or a regex |
| High transaction volume | Use `tracesSampler` to return `0` for health checks; lower default rate with `inheritOrSampleWith(0.02)` |
| Server-only spans not appearing | Verify `instrumentation.ts` exports `onRequestError = Sentry.captureRequestError` and loads the server config |
