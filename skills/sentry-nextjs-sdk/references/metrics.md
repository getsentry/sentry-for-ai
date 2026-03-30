# Metrics — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥10.25.0 (stable `Sentry.metrics.*` API)  
> `enableMetrics` top-level option: ≥10.24.0 (default: `true`)  
> `beforeSendMetric` hook: ≥10.24.0  
> Scope attributes on metrics: ≥10.33.0  
> Status: **Open Beta** — "Features in beta are still in-progress and may have bugs"
>
> Available in **all three runtimes**: browser, Node.js server, and Edge.

---

## Overview

Sentry Metrics let you track counters, current values, and value distributions. They appear in Sentry alongside related errors and can be correlated with traces.

Key characteristics:
- Metrics are **enabled by default** — no configuration required for basic use
- Work across all three Next.js runtimes: browser, Node.js server, and Edge
- Buffered in memory (max 1000 entries) and sent periodically
- High-cardinality attributes **degrade backend performance** — keep attribute cardinality low
- Use `Sentry.logger.*` (not metrics) when you need per-user or per-request detail

---

## Initialization

Metrics are on by default in all three runtime config files. No additional configuration is needed. `enableMetrics`, `beforeSendMetric`, and all `Sentry.metrics.*` calls work identically in every runtime.

**`instrumentation-client.ts` (browser runtime):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Metrics are enabled by default — no config needed

  // To disable entirely:
  // enableMetrics: false,

  beforeSendMetric: (metric) => {   // optional filter/transform
    if (metric.name === "debug_metric") return null;
    return metric;
  },
});
```

**`sentry.server.config.ts` (Node.js runtime):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Metrics are enabled by default
  // enableMetrics, beforeSendMetric can be configured here too
});
```

**`sentry.edge.config.ts` (Edge runtime):**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Metrics are enabled by default
  // enableMetrics, beforeSendMetric can be configured here too
});
```

---

## Metrics API

Three methods. No `increment()` or `set()` — those do not exist in v10:

```typescript
Sentry.metrics.count(name, value?, options?)
Sentry.metrics.gauge(name, value, options?)
Sentry.metrics.distribution(name, value, options?)
```

**Full TypeScript signatures:**

```typescript
interface MetricOptions {
  unit?: string;                           // see unit table below
  attributes?: Record<string, unknown>;    // filterable dimensions
  scope?: Scope;                           // optional scope override
}

function count(name: string, value?: number, options?: MetricOptions): void;
       // value defaults to 1

function gauge(name: string, value: number, options?: MetricOptions): void;

function distribution(name: string, value: number, options?: MetricOptions): void;
```

---

## Metric Types

| Method         | Underlying Type | Use For                                          |
|----------------|-----------------|--------------------------------------------------|
| `count`        | counter         | Event frequency — requests, errors, signups      |
| `gauge`        | gauge           | Current snapshot value — queue depth, CPU %       |
| `distribution` | distribution    | Value histograms/ranges — latencies, file sizes  |

```typescript
// count — how many times something happened
Sentry.metrics.count("user.signups", 1);
Sentry.metrics.count("api.errors", 1, { attributes: { endpoint: "/checkout" } });

// gauge — what the current state is
Sentry.metrics.gauge("queue.depth", 42);
Sentry.metrics.gauge("memory.usage", 512, { unit: "megabyte" });

// distribution — spread of a measured value
Sentry.metrics.distribution("api.latency", 187.5, { unit: "millisecond" });
Sentry.metrics.distribution("payload.size", 1024, { unit: "byte" });
```

---

## Next.js Patterns

### API Routes (App Router)

Track request timing and business events in route handlers:

**`app/api/orders/route.ts`**

```typescript
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const start = Date.now();

  try {
    const order = await createOrder(request);

    Sentry.metrics.count("orders_created", 1, {
      attributes: { status: "success" },
    });

    return Response.json(order);
  } catch (error) {
    Sentry.metrics.count("orders_created", 1, {
      attributes: { status: "failed" },
    });
    throw error;
  } finally {
    Sentry.metrics.distribution("order_latency", Date.now() - start, {
      unit: "millisecond",
    });
  }
}
```

### Server Actions

Track form submissions and mutations:

**`app/actions.ts`**

```typescript
"use server";

import * as Sentry from "@sentry/nextjs";

export async function submitCheckout(formData: FormData) {
  Sentry.metrics.count("checkout_attempts", 1);

  try {
    const result = await processCheckout(formData);
    Sentry.metrics.count("checkout_success", 1);
    return result;
  } catch (error) {
    Sentry.metrics.count("checkout_failures", 1);
    throw error;
  }
}
```

### Proxy / Middleware

Track request patterns at the edge. Next.js 16+ uses `proxy.ts`, while earlier versions use `middleware.ts`. The pattern is the same:

**`proxy.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

export function proxy(request: NextRequest) {
  // Use a bounded route pattern, not the raw pathname (which is high-cardinality)
  const route = request.nextUrl.pathname.split("/").slice(0, 3).join("/"); // e.g. "/api/orders"

  Sentry.metrics.count("requests", 1, {
    attributes: {
      route,
      method: request.method,
    },
  });

  return NextResponse.next();
}
```

---

## Units

Pass a `unit` string in `MetricOptions`. Used for display formatting in Sentry.

| Category  | Unit Values                                                                       |
|-----------|-----------------------------------------------------------------------------------|
| Time      | `millisecond`, `second`, `minute`, `hour`, `day`, `week`                          |
| Storage   | `bit`, `byte`, `kilobyte`, `megabyte`, `gigabyte`, `terabyte`, `petabyte`         |
| Fractions | `ratio`, `percent`                                                                |
| None      | `none` (or omit `unit`)                                                           |

```typescript
Sentry.metrics.distribution("api.latency", 187.5, { unit: "millisecond" });
Sentry.metrics.distribution("job.duration", 3.2,   { unit: "second" });
Sentry.metrics.gauge("memory.usage", 512,          { unit: "megabyte" });
Sentry.metrics.gauge("cache.hit_rate", 0.87,       { unit: "ratio" });
Sentry.metrics.gauge("disk.usage_pct", 72.4,       { unit: "percent" });
Sentry.metrics.count("user.logins");               // omit unit for plain counts
```

---

## Attributes (Tags)

Use `attributes` in `MetricOptions` to add filterable/groupable dimensions.

**Size limit:** 2 KB per metric envelope. Metrics exceeding this are **dropped**.

```typescript
Sentry.metrics.count("api.requests", 1, {
  attributes: {
    endpoint: "/api/orders",
    method: "POST",
    status_code: 200,
    user_tier: "pro",
    region: "us-west-2",
    version: "v2",
  },
});

Sentry.metrics.distribution("db.query_time", 45.3, {
  unit: "millisecond",
  attributes: {
    table: "orders",
    operation: "SELECT",
    index_used: true,
    rows_scanned: 1240,
  },
});
```

---

## Cardinality

Keep attribute values bounded. High-cardinality attributes (per-user IDs, request UUIDs) cause performance issues in Sentry's metrics backend.

```typescript
// BAD: HIGH CARDINALITY — avoid as metric attributes
Sentry.metrics.count("page.view", 1, {
  attributes: { user_id: "uuid-abc-123" },   // millions of unique values
});

// GOOD: LOW CARDINALITY — bounded enums and sets
Sentry.metrics.count("page.view", 1, {
  attributes: {
    page: "/dashboard",
    user_tier: "pro",        // bounded enum
    ab_variant: "control",   // bounded enum
    region: "us-east-1",     // bounded set
  },
});
```

Use `Sentry.logger.*` for per-user or per-request data — logs handle high cardinality gracefully.

---

## Scope-Based Attributes (SDK ≥10.33.0)

Set attributes on a scope and they auto-attach to all metrics emitted within it:

```typescript
// Global scope — applies to all metrics app-wide
Sentry.getGlobalScope().setAttributes({
  service: "payments",
  deploy_env: "production",
});

// Per-request scope
Sentry.withScope((scope) => {
  scope.setAttribute("step", "checkout");
  scope.setAttribute("user_tier", "enterprise");

  // Both metrics inherit the scope attributes above
  Sentry.metrics.count("checkout.attempts", 1);
  Sentry.metrics.gauge("cart.value", 249.99);
});
```

---

## Auto-Attached Default Attributes

| Attribute                            | Value                               | Context     |
|--------------------------------------|-------------------------------------|-------------|
| `sentry.environment`                 | From `Sentry.init({ environment })` | Always      |
| `sentry.release`                     | From `Sentry.init({ release })`     | Always      |
| `sentry.sdk.name`                    | SDK identifier                      | Always      |
| `sentry.sdk.version`                 | e.g., `"10.42.0"`                   | Always      |
| `user.id`, `user.name`, `user.email` | If user is set in scope             | When set    |
| `browser.name`, `browser.version`    | Browser info                        | Client-side |
| `sentry.replay_id`                   | Session replay ID                   | Client-side |
| `server.address`                     | Server hostname                     | Server-side |

---

## `beforeSendMetric` Hook

Filter or modify metrics before transmission. Return `null` to drop. Configure in any runtime config file (`instrumentation-client.ts`, `sentry.server.config.ts`, or `sentry.edge.config.ts`):

**`sentry.server.config.ts`**

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSendMetric: (metric) => {
    // metric: { name, value, type, unit?, attributes? }

    // Drop internal debug metrics
    if (metric.name.startsWith("_internal.")) {
      return null;
    }

    // Normalize metric names
    metric.name = metric.name.toLowerCase().replace(/[^a-z0-9_.]/g, "_");

    // Add global context
    metric.attributes = {
      ...metric.attributes,
      deploy_id: process.env.DEPLOY_ID,
    };

    return metric;
  },
});
```

---

## Flushing

Metrics are buffered (up to 1000 entries) and flushed periodically. In serverless or edge environments, the function may terminate before the buffer flushes automatically. Use `flush()` to send pending metrics while keeping the client alive (suitable for reusable function instances), or `close()` to flush and permanently shut down the client:

```typescript
await Sentry.flush(2000);  // send pending data, keep client alive (use in serverless)
await Sentry.close(2000);  // send pending data + tear down client (use on permanent shutdown)
```

This is especially important for:
- **Serverless / Vercel API routes** — function instances may terminate or freeze before the buffer auto-flushes
- **Edge runtime handlers** — short-lived execution contexts with no background flush opportunity

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Metrics not appearing | SDK < 10.24.0 | Upgrade to ≥10.24.0 |
| `Sentry.metrics` is undefined | SDK < 10.25.0 | Upgrade to ≥10.25.0 |
| Metrics silently dropped | Attribute envelope > 2 KB | Reduce number or size of `attributes` |
| `increment()` not found | Renamed in v10 | Use `count()` instead |
| `set()` not found | Removed in v10 | No equivalent; use `count()` with bounded attributes |
| Scope attributes missing | SDK < 10.33.0 | Upgrade to ≥10.33.0 |
| Metrics lost in serverless | Buffer not flushed | Call `await Sentry.flush(2000)` before function returns |
| Metrics missing on edge | Edge runtime not initialized | Ensure `sentry.edge.config.ts` has `Sentry.init()` |
| High-cardinality issues | Unbounded attribute values | Keep attributes to bounded enums/sets |
| Metrics not in server actions | Server config missing | Verify `sentry.server.config.ts` is loaded via `instrumentation.ts` |
