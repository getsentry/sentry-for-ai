# Tracing — Sentry Svelte/SvelteKit SDK

> Minimum SDK: `@sentry/sveltekit` ≥7.0.0+ / `@sentry/svelte` ≥7.0.0+  
> `Sentry.updateSpanName()`: requires `@sentry/sveltekit` ≥8.47.0+

---

## How Automatic Tracing Works

### SvelteKit

| What's traced | Where | How |
|---------------|-------|-----|
| Client-side page loads | Browser | `browserTracingIntegration()` in `hooks.client.ts` |
| Client-side navigations | Browser | `browserTracingIntegration()` — SvelteKit router changes |
| Outbound fetch/XHR requests | Browser | `browserTracingIntegration()` with `tracePropagationTargets` |
| Server-side request handling | Node | `sentryHandle()` in `hooks.server.ts` |
| Load functions (`+page.ts`, `+layout.ts`) | Both | Auto via `sentryHandle()` (≥10.8.0) |
| Server → client trace stitching | SSR → browser | SDK injects `<meta>` tags; `browserTracingIntegration()` reads them |

### Standalone Svelte

Only client-side tracing is available. All instrumentation happens in a single init call.

---

## Configuration

### SvelteKit — hooks.client.ts

```typescript
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  tracesSampleRate: 1.0,   // 100% in dev; use 0.1–0.2 in production

  // Which outbound URLs get sentry-trace + baggage headers
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.myapp\.com/,
  ],
});

export const handleError = Sentry.handleErrorWithSentry();
```

### SvelteKit — instrumentation.server.ts (or hooks.server.ts for legacy)

```typescript
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  // No browserTracingIntegration() here — server-side only
});
```

### SvelteKit — hooks.server.ts

```typescript
import * as Sentry from "@sentry/sveltekit";

export const handleError = Sentry.handleErrorWithSentry();
// sentryHandle() creates root spans for all incoming requests
export const handle = Sentry.sentryHandle();
```

### Standalone Svelte — main.ts

```typescript
import * as Sentry from "@sentry/svelte";
import App from "./App.svelte";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourapi\.io/],
});

const app = new App({ target: document.getElementById("app")! });
export default app;
```

---

## Sampling

| Option | Behavior |
|--------|----------|
| `tracesSampleRate: 1.0` | Capture 100% of traces (dev / low-traffic) |
| `tracesSampleRate: 0.2` | Capture 20% uniformly |
| `tracesSampler: (ctx) => number` | Per-transaction logic; **overrides** `tracesSampleRate` when both set |
| omit both | Tracing fully disabled — no overhead |
| `tracesSampleRate: 0` | Code runs but nothing is sent — not the same as disabled |

### Dynamic sampler

```typescript
Sentry.init({
  tracesSampler: (samplingContext) => {
    const name = samplingContext.transactionContext?.name ?? "";
    if (name === "/health" || name === "/ping") return 0;
    if (name.startsWith("/checkout")) return 1.0;
    return 0.2; // default
  },
});
```

### Disable tracing for production builds (tree-shaking)

Set the build flag `__SENTRY_TRACING__ = false` to strip all tracing code at bundle time:

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __SENTRY_TRACING__: false,
  },
});
```

---

## `tracePropagationTargets`

Controls which outbound requests receive `sentry-trace` and `baggage` headers. Essential for distributed tracing between the SvelteKit frontend and your APIs.

```typescript
tracePropagationTargets: [
  "localhost",                              // substring match
  /^https:\/\/api\.myapp\.com/,             // regex match
  /^https:\/\/internal-service\.io\/api/,   // second backend
]
```

- Only matching URLs get distributed tracing headers
- Prevents leaking trace IDs to third-party services
- Omit to disable propagation entirely; set to `[""]` to propagate to all URLs

---

## Custom Spans

Three APIs with different lifecycle models:

### `Sentry.startSpan()` — recommended, auto-ends

```typescript
// Async work
const result = await Sentry.startSpan(
  {
    name: "fetch-user-profile",
    op: "http.client",
    attributes: {
      "user.id": userId,
      "cache.hit": false,
    },
  },
  async () => {
    return await fetchUserProfile(userId);
  }
);

// Sync work
const parsed = Sentry.startSpan(
  { name: "parse-payload", op: "deserialize" },
  () => JSON.parse(rawPayload)
);
```

### `Sentry.startSpanManual()` — manual `span.end()`

Use when the span lifetime doesn't match a callback (event-driven flows, middleware):

```typescript
function middleware(_req: Request, res: Response, next: NextFunction) {
  return Sentry.startSpanManual({ name: "express.middleware", op: "middleware" }, (span) => {
    res.once("finish", () => {
      span.setStatus({ code: res.statusCode < 400 ? 1 : 2 }); // 1=ok, 2=error
      span.end();
    });
    return next();
  });
}
```

### `Sentry.startInactiveSpan()` — explicit parent control

```typescript
// Span is not automatically set as the active span
const span = Sentry.startInactiveSpan({ name: "background-job", op: "task" });
await doBackgroundWork();
span.end();

// Explicit parent-child wiring
const parent = Sentry.startInactiveSpan({ name: "checkout-flow" });
const child = Sentry.startInactiveSpan({ name: "validate-cart", parentSpan: parent });
await validateCart();
child.end();
parent.end();
```

---

## Span Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | **Required.** Span label in the UI |
| `op` | `string` | Operation category (e.g., `http.client`, `db.query`, `ui.render`, `task`) |
| `startTime` | `number` | Unix timestamp override |
| `attributes` | `Record<string, string \| number \| boolean>` | Key-value metadata |
| `parentSpan` | `Span` | Explicit parent reference |
| `onlyIfParent` | `boolean` | Drop span if no active parent exists |
| `forceTransaction` | `boolean` | Show as top-level transaction in Sentry UI |

---

## Enriching Active Spans

```typescript
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("db.rows_affected", 42);
  span.setAttributes({ "cache.key": "user:123", "cache.hit": true });
  span.setStatus({ code: 1 }); // 0=unknown, 1=ok, 2=error

  // Rename span (SDK ≥8.47.0)
  Sentry.updateSpanName(span, "Updated Span Name");
}

// Inject attributes into all spans globally
Sentry.init({
  beforeSendSpan(span) {
    span.data = { ...span.data, "app.region": "us-west-2" };
    return span;
  },
});
```

---

## Distributed Tracing: SvelteKit SSR ↔ Client ↔ APIs

SvelteKit's SDK automatically propagates trace context across the full request lifecycle:

```
Browser request
  → SvelteKit server receives request
      → sentryHandle() creates server root span
      → SSR renders HTML with injected <meta name="sentry-trace"> + <meta name="baggage">
  → Browser parses HTML
      → browserTracingIntegration() reads <meta> tags
      → Client span becomes child of SSR span
  → Client makes API call (matching tracePropagationTargets)
      → sentry-trace + baggage headers added to fetch request
      → Backend can continue the trace
```

All of this is automatic when:
1. `sentryHandle()` is exported from `hooks.server.ts`
2. `browserTracingIntegration()` is in client init
3. API URLs are listed in `tracePropagationTargets`

---

## Load Function Tracing (SvelteKit)

With `sentryHandle()` (≥10.8.0), all load functions are automatically instrumented. No wrapper needed.

**Legacy setup only** (if using `@sentry/sveltekit` <10.8.0):

```typescript
// src/routes/+page.ts (client load) — legacy only
import { wrapLoadWithSentry } from "@sentry/sveltekit";

export const load = wrapLoadWithSentry(async ({ fetch, params }) => {
  return { data: await fetch(`/api/${params.id}`).then(r => r.json()) };
});

// src/routes/+page.server.ts (server load) — legacy only
import { wrapServerLoadWithSentry } from "@sentry/sveltekit";

export const load = wrapServerLoadWithSentry(async ({ params }) => {
  return { id: params.id };
});
```

Remove these wrappers when upgrading to `@sentry/sveltekit` ≥10.8.0.

---

## Route-Based Transaction Names

SvelteKit automatically names transactions from SvelteKit's routing system:
- `GET /` → `pageload /`
- `GET /users/[id]` → `pageload /users/[id]`
- `GET /api/users` → server request span name

No manual transaction naming is needed for standard SvelteKit routes.

---

## Performance Data: Web Vitals

`browserTracingIntegration()` captures Core Web Vitals automatically:

| Metric | What it measures |
|--------|-----------------|
| LCP | Largest Contentful Paint |
| FID | First Input Delay |
| CLS | Cumulative Layout Shift |
| TTFB | Time to First Byte |
| FCP | First Contentful Paint |

Visible in the Sentry Performance dashboard under each page transaction.

---

## Flat Span Hierarchy (Browser)

By default, browser spans are **flat** — all spans become direct children of the root span rather than nesting. This avoids incorrect async parent-child associations.

To opt into full nesting (for structured waterfall views, at your own risk):

```typescript
Sentry.init({
  parentSpanIsAlwaysRootSpan: false,
});
```

---

## Filtering Transactions and Spans

```typescript
Sentry.init({
  // Drop entire transactions by name
  ignoreTransactions: ["/health", "/ping", /_next\/static/],

  // Filter/modify transactions before send
  beforeSendTransaction(event) {
    if (event.transaction?.startsWith("/_next/")) return null;
    return event;
  },

  // Filter/modify individual spans (e.g., drop asset spans)
  ignoreSpans: [
    { op: /^browser\.(cache|connect|DNS)$/ },
    { op: "resource.other", name: /.+\.(woff2|ttf|eot)$/ },
    { op: /resource\.(link|script)/, name: /.+\.js.*$/ },
  ],
});
```

---

## Svelte vs SvelteKit: Key Differences

| Concern | Standalone Svelte | SvelteKit |
|---------|-------------------|-----------|
| Server-side tracing | ❌ N/A | ✅ Auto via `sentryHandle()` |
| `browserTracingIntegration()` | In single init call | In `hooks.client.ts` only |
| Distributed tracing | Client-only | Full SSR → client → backend |
| Load function tracing | N/A | Auto (≥10.8.0) |
| Transaction names | URL-based | SvelteKit route patterns |
| Web Vitals | ✅ Both | ✅ Both |

---

## Best Practices

- Use `tracesSampleRate: 1.0` in development; drop to `0.1`–`0.2` in production
- Never add `browserTracingIntegration()` to server-side init
- Use `tracePropagationTargets` to restrict trace header injection to your own backends
- Add `sentryHandle()` before other handles in `sequence()` so it wraps the full request lifecycle
- Use `onlyIfParent: true` on optional spans to avoid orphaned root transactions

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Performance dashboard | Ensure `tracesSampleRate` > 0; check `browserTracingIntegration()` is in client init |
| Distributed trace not connected (server ↔ client) | Verify `sentryHandle()` is exported from `hooks.server.ts` |
| API calls not connected to frontend trace | Add API URL to `tracePropagationTargets` |
| Load functions not instrumented | Upgrade to `@sentry/sveltekit` ≥10.8.0; remove legacy `wrapLoadWithSentry` |
| `sentryHandle()` breaking other handles | Wrap with `sequence(Sentry.sentryHandle(), myHandle)` from `@sveltejs/kit/hooks` |
| Web Vitals missing | Confirm `browserTracingIntegration()` is included; check browser support |
| Spans missing after async gap | Browser flat hierarchy; use `startInactiveSpan` with explicit `parentSpan` |
| High transaction volume / cost | Lower `tracesSampleRate`; use `tracesSampler` to drop health checks and static assets |
