# Tracing — Sentry TanStack Start React SDK

> Minimum SDK: `@sentry/tanstackstart-react` (alpha)  
> Framework target: TanStack Start React `1.0 RC`

---

## What Tracing Captures

| Layer | Integration | Result |
|------|-------------|--------|
| Browser route transitions | `tanstackRouterBrowserTracingIntegration(router)` | Navigation and route-level transaction timing |
| Server request handling | `wrapFetchWithSentry(...)` | Server request spans and request-level errors |
| Server middleware/functions | `sentryGlobalRequestMiddleware` / `sentryGlobalFunctionMiddleware` | Middleware and server function timing context |
| Custom operations | `Sentry.startSpan` | Business operations and async block timing |

---

## Browser Tracing Setup (`src/router.tsx`)

```tsx
import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";

export const getRouter = () => {
  const router = createRouter();

  if (!router.isServer) {
    Sentry.init({
      dsn: "___PUBLIC_DSN___",
      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      tracesSampleRate: 1.0,
    });
  }

  return router;
};
```

---

## Server Tracing Setup

### `instrument.server.mjs`

```javascript
import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  tracesSampleRate: 1.0,
});
```

### `src/server.ts`

```typescript
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry(
  wrapFetchWithSentry({
    fetch(request: Request) {
      return handler.fetch(request);
    },
  }),
);
```

---

## Custom Span Example

```tsx
import * as Sentry from "@sentry/tanstackstart-react";

await Sentry.startSpan(
  {
    name: "Example Frontend Span",
    op: "test",
  },
  async () => {
    const res = await fetch("/api/sentry-example");
    if (!res.ok) {
      throw new Error("Sentry Example Frontend Error");
    }
  },
);
```

Use `startSpan` for key flows such as checkout, search, and expensive data loads.

---

## Sampling Guidance

| Environment | Suggested `tracesSampleRate` |
|-------------|-------------------------------|
| Development | `1.0` |
| Production (starting point) | `0.1` to `0.3` |
| High-volume traffic | Tune with lower fixed rate or use server-side dynamic sampling |

---

## Verifying Traces

1. Trigger a page navigation and one API call in the app.
2. Open **Traces** in Sentry.
3. Confirm one trace shows:
   - browser transaction/span
   - server request span
   - linked errors (if thrown)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No browser transactions | Ensure router integration gets the actual router instance |
| No server spans | Verify runtime loads `instrument.server.mjs` (`--import` path or direct import path) |
| Trace disconnected between client and server | Confirm both browser and server init are active in the same environment |
| Too many traces | Reduce `tracesSampleRate` for production |
