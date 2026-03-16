# Error Monitoring — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+
> Hono integration: v10.0.0+
> Durable Object instrumentation: v8.x+
> Queue/Email/Tail handler instrumentation: v10.x+

---

## Overview

The `@sentry/cloudflare` SDK captures errors across all Cloudflare runtime contexts:

- **Fetch handlers** (Workers and Pages)
- **Scheduled handlers** (cron triggers)
- **Queue handlers** (Cloudflare Queues consumers)
- **Email handlers** (Email Workers)
- **Durable Object methods** (fetch, alarm, WebSocket, RPC)
- **Workflow steps**
- **Hono `onError` handler**

When you wrap your handler with `withSentry` or `sentryPagesPlugin`, unhandled exceptions are automatically captured with proper mechanism metadata.

---

## Automatic Error Capture

### Workers (via `withSentry`)

All exported handler methods are automatically instrumented:

```typescript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: true,
  }),
  {
    async fetch(request, env, ctx) {
      // Unhandled errors here are captured automatically
      throw new Error("This is captured by Sentry");
    },

    async scheduled(controller, env, ctx) {
      // Unhandled errors in scheduled handlers are captured too
      throw new Error("Cron job failed");
    },

    async queue(batch, env, ctx) {
      // Queue handler errors are captured with queue metadata
      for (const message of batch.messages) {
        await processMessage(message);
      }
    },

    async email(message, env, ctx) {
      // Email handler errors are captured automatically
      await forwardEmail(message);
    },
  } satisfies ExportedHandler<Env>,
);
```

### Pages (via `sentryPagesPlugin`)

```typescript
// functions/_middleware.ts
import * as Sentry from "@sentry/cloudflare";

export const onRequest = Sentry.sentryPagesPlugin((context) => ({
  dsn: context.env.SENTRY_DSN,
  sendDefaultPii: true,
}));
```

Errors in any Pages function are captured, re-thrown (so your error responses still work), and flushed via `ctx.waitUntil()`.

---

## Manual Error Capture

### `Sentry.captureException(error, hint?)`

```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: "risky" },
    extra: { inputData: someData },
  });
  // Handle the error gracefully
  return new Response("Something went wrong", { status: 500 });
}
```

### `Sentry.captureMessage(message, level?)`

```typescript
Sentry.captureMessage("User performed unusual action", "warning");
```

Supported levels: `"fatal"`, `"error"`, `"warning"`, `"info"`, `"debug"`.

### `Sentry.captureEvent(event)`

```typescript
Sentry.captureEvent({
  message: "Custom event",
  level: "info",
  tags: { component: "auth" },
});
```

---

## Enriching Events

### Tags

Tags are indexed key-value pairs for filtering and searching:

```typescript
Sentry.setTag("region", "us-east-1");
Sentry.setTag("worker_name", "api-gateway");

Sentry.setTags({
  version: "2.1.0",
  tier: "premium",
});
```

### User Context

```typescript
Sentry.setUser({
  id: "user-123",
  email: "user@example.com",
  ip_address: "{{auto}}",
});

// Clear user on logout
Sentry.setUser(null);
```

> **PII note:** Set `sendDefaultPii: true` in init options to automatically include request headers and cookies. Without it, the SDK strips headers and cookies from request data.

### Extra Data

For arbitrary unindexed data attached to events:

```typescript
Sentry.setExtra("requestBody", JSON.stringify(body));

Sentry.setExtras({
  queryParams: Object.fromEntries(url.searchParams),
  workerVersion: "1.2.3",
});
```

### Context

Structured context data for specific categories:

```typescript
Sentry.setContext("cloudflare", {
  worker: "api-gateway",
  route: "/api/users",
  datacenter: request.cf?.colo,
});
```

The SDK automatically sets `cloud_resource` context with `cloud.provider: "cloudflare"` and `culture` context with timezone from `request.cf`.

### Breadcrumbs

Breadcrumbs record a trail of events leading to an error:

```typescript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User authenticated via API key",
  level: "info",
  data: { method: "api_key" },
});
```

The `fetchIntegration` (default) automatically creates breadcrumbs for outbound `fetch()` calls. The `consoleIntegration` (default) captures `console.*` calls as breadcrumbs.

---

## Scopes

### `withScope` — Temporary Scope

```typescript
Sentry.withScope((scope) => {
  scope.setTag("handler", "api");
  scope.setExtra("requestId", requestId);
  Sentry.captureException(error);
  // Tags and extras only apply to this captureException call
});
```

### `withIsolationScope` — Request-Level Isolation

Each request processed by `withSentry` or `sentryPagesPlugin` automatically runs in its own isolation scope. You typically don't need to call this manually.

### `getCurrentScope` / `getIsolationScope` / `getGlobalScope`

```typescript
const currentScope = Sentry.getCurrentScope();
const isolationScope = Sentry.getIsolationScope();
const globalScope = Sentry.getGlobalScope();
```

---

## Event Filtering

### `beforeSend`

Filter or modify events before they are sent:

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    beforeSend(event, hint) {
      // Drop events with specific messages
      if (event.message?.includes("expected error")) {
        return null;
      }

      // Scrub sensitive data
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
      }

      return event;
    },
  }),
  handler,
);
```

### `ignoreErrors`

```typescript
Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    ignoreErrors: [
      "AbortError",
      /^NetworkError/,
      "Non-Error promise rejection captured",
    ],
  }),
  handler,
);
```

---

## Cloudflare-Specific Request Data

The SDK automatically captures Cloudflare-specific request data when `request.cf` is available:

- **Timezone** — set as `culture` context from `request.cf.timezone`
- **HTTP protocol** — set as `network.protocol.name` span attribute from `request.cf.httpProtocol`
- **Cloud provider** — always set as `cloud.provider: "cloudflare"` in `cloud_resource` context
- **Request data** — URL, method, headers (respects `sendDefaultPii`)
- **Content-Length** — captured as `http.request.body.size` span attribute
- **User-Agent** — captured as `user_agent.original` span attribute

---

## Best Practices

1. **Always use `withSentry` or `sentryPagesPlugin`** — don't call `Sentry.init()` directly. The wrappers handle per-request isolation, flushing via `ctx.waitUntil()`, and client disposal.

2. **Store DSN as a secret** — use `wrangler secret put SENTRY_DSN`, not environment variables in `wrangler.toml` (which are visible in source control).

3. **Use `sendDefaultPii: true` thoughtfully** — it includes request headers and cookies. Required for meaningful user context but may have privacy implications.

4. **Set `tracesSampleRate` lower in production** — `1.0` is fine for development; use `0.1`–`0.5` for production to manage costs.

5. **Don't catch and swallow errors silently** — if you catch an error for graceful handling, still call `Sentry.captureException(error)` to report it.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Verify `SENTRY_DSN` is set; add `debug: true` to init options; check worker logs for SDK output |
| Duplicate events | Ensure handler is wrapped only once; don't nest `withSentry` calls |
| Missing request data | Set `sendDefaultPii: true` to include headers and cookies |
| Events cut off mid-request | Ensure `withSentry`/`sentryPagesPlugin` is used — they handle `ctx.waitUntil()` for flushing |
| `captureException` returns undefined | Verify SDK is initialized — `Sentry.isInitialized()` should return `true` inside a handler |
