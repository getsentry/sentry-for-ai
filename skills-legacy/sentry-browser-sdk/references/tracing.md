# Tracing — Sentry Browser SDK

> Minimum SDK: `@sentry/browser` ≥7.0.0  
> `enableInp` defaults to `true` as of SDK ≥8.0.0 (was `false` in 7.x)  
> `enableLongAnimationFrame` available since SDK ≥8.18.0  
> `inheritOrSampleWith` in `tracesSampler` available since SDK ≥9.0.0  
> `profileSessionSampleRate` replaces `profilesSampleRate` as of SDK ≥10.27.0

---

## Minimal Setup

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2, // Capture 20% of all transactions
});
```

> **Disabling tracing:** Omit **both** `tracesSampleRate` and `tracesSampler`. Setting `tracesSampleRate: 0` does not disable tracing — it simply never sends any traces.

---

## `browserTracingIntegration()` — Configuration Reference

All options are passed as a single object to `browserTracingIntegration()`.

### Page Load & Navigation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `instrumentPageLoad` | `boolean` | `true` | Create a `pageload` root span on initial page load |
| `instrumentNavigation` | `boolean` | `true` | Create a `navigation` root span on client-side history changes |
| `markBackgroundSpan` | `boolean` | `true` | Mark `pageload`/`navigation` spans as cancelled when the tab goes to the background |
| `enableReportPageLoaded` | `boolean` | `false` | Enable the `Sentry.reportPageLoaded()` utility function *(SDK ≥10.13.0)* |
| `linkPreviousTrace` | `"in-memory" \| "session-storage" \| false` | `"in-memory"` | Controls how new `pageload` spans link to the previous trace across navigations |

### HTTP Request Instrumentation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `traceFetch` | `boolean` | `true` | Automatically create spans for outgoing `fetch` requests |
| `traceXHR` | `boolean` | `true` | Automatically create spans for outgoing `XMLHttpRequest` calls |
| `enableHTTPTimings` | `boolean` | `true` | Attach detailed HTTP timing data via the Performance Resource Timing API |
| `shouldCreateSpanForRequest` | `(url: string) => boolean` | — | Predicate to exclude specific requests from tracing (e.g., health checks) |
| `onRequestSpanStart` | `(span, fetchInput, fetchInit) => void` | — | Callback invoked when a span is started for an outgoing `fetch`/XHR request |

### Interaction & Long Task Instrumentation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableInp` | `boolean` | `true` (8.x+), `false` (7.x) | Capture Interaction to Next Paint (INP) events |
| `interactionsSampleRate` | `number` | `1.0` | Additional sampling rate for INP spans (applied on top of `tracesSampleRate`) |
| `enableLongTask` | `boolean` | `true` | Create spans for main-thread blocking tasks exceeding 50 ms |
| `enableLongAnimationFrame` | `boolean` | `true` | Create spans for long animation frames *(SDK ≥8.18.0)* |

### Timing & Timeouts

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `idleTimeout` | `number` | `1000` | Milliseconds of inactivity before `pageload`/`navigation` span auto-finishes |
| `finalTimeout` | `number` | `30000` | Maximum lifespan (ms) for any root span regardless of activity |
| `childSpanTimeout` | `number` | `15000` | Maximum time (ms) a child span may remain open before the parent can finish |

### Propagation & Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tracePropagationTargets` | `Array<string \| RegExp>` | `["localhost", /^\//]` | Outgoing requests whose URL matches an entry receive `sentry-trace` and `baggage` headers |
| `beforeStartSpan` | `(context: SpanContext) => SpanContext` | — | Modify or enrich a span's context before it is created |
| `ignoreResourceSpans` | `Array<string>` | `[]` | Suppress automatic spans by operation category (e.g., `"resource.css"`) |
| `ignorePerformanceApiSpans` | `Array<string \| RegExp>` | `[]` | Suppress spans from `performance.mark()` / `performance.measure()` calls |

### Full Configuration Example

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.browserTracingIntegration({
      // Page / navigation spans
      instrumentPageLoad: true,
      instrumentNavigation: true,
      markBackgroundSpan: true,
      linkPreviousTrace: "in-memory",

      // HTTP spans
      traceFetch: true,
      traceXHR: true,
      enableHTTPTimings: true,
      shouldCreateSpanForRequest: (url) => !url.match(/\/health\/?$/),

      // INP / long-task spans
      enableInp: true,
      interactionsSampleRate: 0.5,
      enableLongTask: true,
      enableLongAnimationFrame: true,

      // Timeouts
      idleTimeout: 1000,
      finalTimeout: 30000,
      childSpanTimeout: 15000,

      // Propagation
      tracePropagationTargets: ["localhost", /^https:\/\/api\.yourapp\.com/],

      // Normalise dynamic URL segments in transaction names
      beforeStartSpan: (context) => ({
        ...context,
        name: location.pathname
          .replace(/\/[a-f0-9]{32}/g, "/<hash>")
          .replace(/\/\d+/g, "/<id>"),
      }),
    }),
  ],
  tracesSampleRate: 1.0,
});
```

---

## Automatic Instrumentation

When `browserTracingIntegration()` is active, the following are captured automatically:

### Page Loads

A root `pageload` span covers the full page-load lifecycle. Child spans are attached for:
- **Web Vitals**: LCP, CLS, TTFB
- **Resource loads**: CSS, JS, images, fonts (each as a `resource.*` child span)
- **HTTP requests** made during load

### Navigations (SPA Route Changes)

Each client-side route change (via the History API) produces a new `navigation` root span, along with any HTTP requests and web vitals captured during that navigation.

### Fetch / XHR Requests

Every outgoing `fetch` or `XMLHttpRequest` produces an `http.client` child span containing: request duration, HTTP status code, and URL.

Use `shouldCreateSpanForRequest` to exclude URLs you don't want traced:

```javascript
Sentry.browserTracingIntegration({
  shouldCreateSpanForRequest: (url) => {
    return !url.includes("/health") && !url.includes("/metrics");
  },
});
```

### Web Vitals

| Metric | Description | Auto-captured |
|--------|-------------|---------------|
| **LCP** — Largest Contentful Paint | Perceived load speed | ✅ Always |
| **CLS** — Cumulative Layout Shift | Visual stability | ✅ Always |
| **TTFB** — Time to First Byte | Server responsiveness | ✅ Always |
| **INP** — Interaction to Next Paint | Responsiveness to user inputs | ✅ (SDK ≥8.x) |

### Long Tasks

Main-thread tasks blocking the browser for more than **50 ms** are recorded as `ui.long-task` child spans.

### Custom Router Integration

To integrate with a router that manages its own history, disable automatic span creation and call the low-level helpers directly:

```javascript
const client = Sentry.init({
  integrations: [
    Sentry.browserTracingIntegration({
      instrumentNavigation: false,
      instrumentPageLoad: false,
    }),
  ],
});

// Initial page load
let pageLoadSpan = Sentry.startBrowserTracingPageLoadSpan(client, {
  name: window.location.pathname,
  attributes: {
    [Sentry.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: "url",
  },
});

myRouter.on("routeChange", (route) => {
  if (pageLoadSpan) {
    // Update the name of the in-flight page-load span
    pageLoadSpan.updateName(route.name);
    pageLoadSpan.setAttribute(Sentry.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, "route");
    pageLoadSpan = undefined;
  } else {
    // Start a navigation span for subsequent route changes
    Sentry.startBrowserTracingNavigationSpan(client, {
      op: "navigation",
      name: route.name,
      attributes: {
        [Sentry.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: "route",
      },
    });
  }
});
```

---

## Custom Spans

Three functions are available for manual instrumentation. All accept the same options object.

### `startSpan(options, callback)` — Auto-ending Span (Recommended)

Creates an active span that ends automatically when the callback returns (sync or async).

```javascript
// Synchronous
const result = Sentry.startSpan({ name: "process-checkout", op: "function" }, () => {
  return processCheckoutData();
});

// Asynchronous
const data = await Sentry.startSpan(
  { name: "fetch-user-profile", op: "http.client" },
  async () => {
    const response = await fetch("/api/user/profile");
    return response.json();
  }
);

// With attributes
const result = await Sentry.startSpan(
  {
    name: "query-products",
    op: "db",
    attributes: {
      "db.system": "postgresql",
      "db.table": "products",
      "db.query.count": 50,
    },
  },
  () => db.query("SELECT * FROM products LIMIT 50")
);
```

---

### `startSpanManual(options, callback)` — Manually-ended Active Span

Creates an active span that must be ended explicitly by calling `span.end()`. Use when the span's end is decoupled from the callback's return (e.g., event-driven code).

```javascript
function attachUploadTracing(input) {
  input.addEventListener("change", (event) => {
    Sentry.startSpanManual({ name: "file-upload", op: "file.upload" }, (span) => {
      const file = event.target.files[0];
      span.setAttribute("file.size", file.size);
      span.setAttribute("file.type", file.type);

      const upload = uploadFile(file);
      upload.on("complete", () => {
        span.setStatus({ code: 1 }); // ok
        span.end();
      });
      upload.on("error", (err) => {
        span.setStatus({ code: 2 }); // error
        span.end();
      });
    });
  });
}
```

---

### `startInactiveSpan(options)` — Manually-ended Inactive Span

Creates a span that is **not** set as the active span. Useful for parallel work sharing a common parent.

```javascript
const span1 = Sentry.startInactiveSpan({ name: "task-a", op: "function" });
const span2 = Sentry.startInactiveSpan({ name: "task-b", op: "function" });

await Promise.all([workA(), workB()]);

span1.end();
span2.end();
```

---

### Span Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | ✅ | Human-readable identifier shown in the Sentry UI |
| `op` | `string` | — | Operation type for categorization (see Operation Types below) |
| `startTime` | `number` | — | Custom Unix timestamp (seconds, sub-second precision) for span start |
| `attributes` | `Record<string, string \| number \| boolean \| string[] \| number[] \| boolean[]>` | — | Key/value metadata attached to the span |
| `parentSpan` | `Span` | — | Explicitly designate a parent span instead of using the active span |
| `onlyIfParent` | `boolean` | — | If `true`, the span is a no-op when there is no active parent span |
| `forceTransaction` | `boolean` | — | Force this span to appear as a root transaction in the Sentry UI |

---

### Operation Types

Use well-known `op` values so the Sentry UI presents appropriate icons and filtering:

| `op` Value | Use Case |
|------------|----------|
| `http.client` | Outgoing HTTP requests |
| `db` | Database queries |
| `db.system` | Database system operations |
| `ui.click` | User click interactions |
| `ui.long-task` | Long-running main-thread tasks |
| `navigation` | Client-side route transitions |
| `pageload` | Initial full page load |
| `resource.script` | Script resource load |
| `resource.css` | CSS resource load |
| `resource.img` | Image resource load |
| `function` | Generic function calls |
| `file.upload` | File upload operations |

---

### Working with Span Attributes and Status

```javascript
// Set attributes at creation
Sentry.startSpan(
  {
    name: "process-payment",
    attributes: { "payment.provider": "stripe", "payment.amount": 9999 },
  },
  () => processPayment()
);

// On an existing span
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("key", "value");
  span.setAttributes({ key1: "val1", key2: 42 });
}

// Update span name (SDK ≥8.47.0)
Sentry.updateSpanName(span, "New Name");

// Set span status
span.setStatus({ code: 1 }); // 0 = unknown, 1 = ok, 2 = error
span.setHttpStatus(404);
```

---

## Distributed Tracing

Distributed tracing connects browser activity to backend requests, enabling a single timeline across services.

### How It Works

Sentry propagates two HTTP headers on every outgoing request matching `tracePropagationTargets`:

| Header | Contents |
|--------|----------|
| `sentry-trace` | Trace ID, parent span ID, and sampling decision flag |
| `baggage` | Dynamic sampling context: trace ID, public key, sample rate, environment |

> **CORS:** Both headers must be added to your server's `Access-Control-Allow-Headers` — otherwise browsers or gateways will strip them.

### `tracePropagationTargets` Configuration

```javascript
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yourapp\.com/,
  ],
});
```

**Rules:**
- String entries = exact substring match against the full URL
- RegExp entries = tested against the full URL (including scheme and port)
- Port numbers matter — a service on port 8080 requires a separate entry
- Set to `[]` to **disable** header propagation entirely

**Common patterns:**

```javascript
// E-commerce with multiple backend services
tracePropagationTargets: [
  "https://api.myecommerce.com",
  "https://auth.myecommerce.com",
];

// Mixed absolute URLs and relative API paths
tracePropagationTargets: [
  "https://api.myapp.com",
  /^\/api\//,
];

// Disable all header propagation
tracePropagationTargets: [];
```

---

### Continuing a Server-Initiated Trace

When your server renders the HTML, emit the current trace context as `<meta>` tags. The `browserTracingIntegration` reads them automatically on page load and continues the same trace:

```html
<meta name="sentry-trace"
  content="12345678901234567890123456789012-1234567890123456-1" />
<meta name="baggage"
  content="sentry-trace_id=12345678901234567890123456789012,sentry-environment=production,sentry-sample_rate=1" />
```

---

### Manual Trace Propagation (Non-HTTP Channels)

For WebSockets, message queues, or any non-HTTP transport:

```javascript
const traceData = Sentry.getTraceData();

webSocket.send(
  JSON.stringify({
    payload: myData,
    metadata: {
      sentryTrace: traceData["sentry-trace"],
      baggage: traceData["baggage"],
    },
  })
);
```

---

## Sampling

### `tracesSampleRate` — Uniform Sampling

```javascript
Sentry.init({
  tracesSampleRate: 0.2, // Sample 20% of transactions
});
```

- Range: `0` – `1` (random, uniform percentage)
- `0` = send no traces (tracing is still "active"; omit both options to fully disable)
- `1` = send 100% of traces

### `tracesSampler` — Dynamic / Context-Aware Sampling

A function that receives a `SamplingContext` and returns a sample rate (`0`–`1`) or a `boolean`.

```javascript
Sentry.init({
  tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
    // Never sample health checks
    if (name.includes("healthcheck") || name.includes("/health")) return 0;

    // Always sample authentication flows
    if (name.includes("auth") || name.includes("login")) return 1;

    // Sample checkout at high rate (business critical)
    if (name.includes("checkout")) return 0.5;

    // For everything else, inherit the parent's decision or default to 20%
    return inheritOrSampleWith(0.2);
  },
});
```

### `SamplingContext` Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | The span's initial name |
| `attributes` | `Record<string, unknown>` | Initial span attributes |
| `parentSampled` | `boolean \| undefined` | Whether the parent span was sampled (`undefined` if no parent) |
| `parentSampleRate` | `number \| undefined` | The sample rate used by the incoming trace |
| `inheritOrSampleWith(rate)` | `function` | *(SDK ≥9)* Returns `parentSampled` if defined, otherwise uses `rate` |

### Sampling Precedence

1. **`tracesSampler`** — highest priority (if defined)
2. **Parent sampling decision** — used when no sampler is defined but a parent trace exists
3. **`tracesSampleRate`** — fallback uniform rate

### INP-Specific Sampling

`interactionsSampleRate` applies an **additional** multiplier on top of `tracesSampleRate` for INP interaction spans:

```javascript
Sentry.init({
  tracesSampleRate: 0.5,
  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true,
      interactionsSampleRate: 0.1, // Effective rate: 50% × 10% = 5% of interactions
    }),
  ],
});
```

---

## Best Practices

- **Set `tracePropagationTargets` explicitly** — the default (`localhost` + `/`) is rarely correct for production. Define your API origins precisely.
- **Use `beforeStartSpan` to normalize transaction names** — avoid high cardinality from dynamic URLs (`/users/123` → `/users/<id>`).
- **Use `shouldCreateSpanForRequest` to exclude noise** — skip health checks, analytics pixels, and third-party beacons.
- **Prefer `startSpan` over `startInactiveSpan`** — the auto-ending behavior prevents runaway spans.
- **Set `op` on custom spans** — the Sentry UI uses `op` for icons, grouping, and performance charts.
- **Use `inheritOrSampleWith` in `tracesSampler`** — ensures sampling decisions are deterministically propagated from parent to child traces.
- **Add CORS headers on your servers** — `sentry-trace` and `baggage` must be in `Access-Control-Allow-Headers` and `Access-Control-Expose-Headers`.
- **Tune `idleTimeout` for your SPA** — if your navigation transitions are slow (>1s), increase `idleTimeout` to avoid premature span termination.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Transactions not appearing in Sentry | Ensure `tracesSampleRate > 0` (or `tracesSampler` returns a value > 0). Check that `browserTracingIntegration()` is in the `integrations` array. |
| Missing `sentry-trace` / `baggage` headers on requests | Check `tracePropagationTargets` — the request URL must match an entry. Also verify CORS headers allow these. |
| Transaction names showing raw URLs with IDs | Use `beforeStartSpan` to normalize dynamic URL segments. |
| Distributed trace not connecting to backend | Ensure the backend SDK reads `sentry-trace` and `baggage` headers. Add them to `Access-Control-Allow-Headers`. |
| `pageload` span ends too early | Increase `idleTimeout` (default: 1000ms) or `finalTimeout` (default: 30000ms). |
| INP spans not appearing | Requires SDK ≥8.0.0 (enabled by default). In SDK 7.x set `enableInp: true` explicitly. |
| Too many transactions overwhelming quota | Use `tracesSampler` to sample high-volume routes at a lower rate. Drop health checks entirely (return `0`). |
| Parallel spans showing wrong parent | Use `startInactiveSpan` with explicit `parentSpan` option to control hierarchy. |
| `beforeSendTransaction` not called | Ensure you're returning from `beforeSend` correctly — `beforeSendTransaction` is a separate hook for transactions only. |
| Long tasks not captured | Ensure `enableLongTask: true` (default). Long animation frames require SDK ≥8.18.0 and `enableLongAnimationFrame: true`. |
