# Error Monitoring — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥8.0.0  
> `onRequestError` hook requires `@sentry/nextjs` ≥8.28.0 and Next.js 15+  
> `withServerActionInstrumentation` available since `@sentry/nextjs` ≥8.0.0

---

## Three-Runtime Architecture

Next.js runs code in three separate environments. Sentry provides **distinct init files** for each:

| File | Runtime | Captures |
|------|---------|---------|
| `instrumentation-client.ts` | Browser | Client-side errors, unhandled rejections |
| `sentry.server.config.ts` | Node.js | API routes, Server Components, Server Actions |
| `sentry.edge.config.ts` | Edge | Middleware, edge routes |

All three use the same DSN but are configured independently.

---

## Automatic vs Manual Error Capture

### What Is Captured Automatically

| Error Type | Captured? | Mechanism |
|-----------|-----------|-----------|
| Unhandled client JS exceptions | ✅ Yes | `window.onerror` (GlobalHandlers integration) |
| Unhandled promise rejections (client) | ✅ Yes | `window.onunhandledrejection` |
| Server Component render errors (Next.js 15+) | ✅ Yes | `onRequestError` hook in `instrumentation.ts` |
| Unhandled API route crashes (server) | ✅ Yes | Node.js uncaught exception handler |
| Re-thrown errors from `try/catch` | ✅ Yes | Bubbles to global handler |
| `error.tsx` boundary errors | ❌ No | Next.js catches before Sentry |
| `global-error.tsx` boundary errors | ❌ No | Next.js catches before Sentry |
| Caught + swallowed `try/catch` errors | ❌ No | Must call `captureException` manually |
| Server Action graceful error returns | ❌ No | Must call `captureException` or use wrapper |
| Caught edge middleware errors | ❌ No | Must call `captureException` manually |

### The Core Rule

> **"If you catch an error and don't re-throw it, Sentry never sees it."**

```typescript
// ✅ Automatically captured — unhandled, bubbles up
throw new Error("Unhandled");

// ✅ Automatically captured — re-thrown
try {
  await doSomething();
} catch (err) {
  throw err;
}

// ❌ NOT captured — swallowed by graceful return
try {
  await doSomething();
} catch (err) {
  return { error: "Failed" }; // ← must add captureException here
}

// ✅ Manually captured
try {
  await doSomething();
} catch (err) {
  Sentry.captureException(err);
  return { error: "Failed" };
}
```

---

## Client-Side Error Capture

### `Sentry.captureException(error, context?)`

Captures an exception and sends it to Sentry. Prefer `Error` objects — they include stack traces.

```typescript
// Basic
Sentry.captureException(new Error("Something broke"));

// With inline context (one-off enrichment)
Sentry.captureException(error, {
  level: "fatal",
  tags: { section: "checkout" },
  extra: { orderId, userId: user.id },
  user: { id: "user-123", email: "user@example.com" },
  fingerprint: ["checkout-failure", String(error.code)],
  contexts: {
    cart: { items: 3, total: 99.99 },
  },
});
```

### `Sentry.captureMessage(message, levelOrContext?)`

Captures a plain message — useful for notable conditions that aren't exceptions.

```typescript
// With severity level
Sentry.captureMessage("Deprecated API used", "warning");
// Levels: "fatal" | "error" | "warning" | "log" | "info" | "debug"

// With full context
Sentry.captureMessage("Payment method expired", {
  level: "warning",
  tags: { payment_provider: "stripe" },
  user: { id: currentUser.id },
});
```

### Unhandled Rejections

Automatically captured by the `GlobalHandlers` integration. To customize:

```typescript
// instrumentation-client.ts
Sentry.init({
  dsn: "___PUBLIC_DSN___",
  integrations: [
    Sentry.globalHandlersIntegration({
      onerror: true,
      onunhandledrejection: true, // set false to handle manually
    }),
  ],
});

// Manual rejection handling (if onunhandledrejection: false)
window.addEventListener("unhandledrejection", (event) => {
  Sentry.captureException(event.reason);
});
```

---

## Error Boundaries

### App Router: `app/error.tsx` (Segment-level)

Each route segment can have its own `error.tsx`. Next.js catches these before Sentry — you **must** call `captureException` manually inside `useEffect`.

```tsx
// app/error.tsx  (also: app/dashboard/error.tsx, etc.)
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // REQUIRED: Next.js catches this before Sentry can
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

> **`digest`:** Server-side errors include a `digest` hash. Use it to correlate Sentry events with server logs.

### App Router: `app/global-error.tsx` (Root Layout)

Last-resort catch-all for root layout errors. Must render its own `<html>` and `<body>`. Use the `NextError` component for consistency with Next.js default error pages.

```tsx
// app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/*
          App Router doesn't expose HTTP status codes for errors,
          so pass 0 to render a generic error message.
        */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
```

### App Router: Error Boundary Directory Structure

```
app/
├── global-error.tsx        # Root layout errors (last resort)
├── error.tsx               # App-wide segment fallback
├── layout.tsx
├── page.tsx
└── dashboard/
    ├── error.tsx           # Dashboard-specific error boundary
    ├── layout.tsx
    └── page.tsx
```

### React 18 and Earlier: `<Sentry.ErrorBoundary>`

For client components using React 18 or earlier, wrap with `<Sentry.ErrorBoundary>` for additional control and fallback UIs:

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";

function CheckoutPage() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <p>Checkout failed: {error.message}</p>
          <button onClick={resetError}>Retry</button>
        </div>
      )}
      beforeCapture={(scope, error) => {
        scope.setTag("section", "checkout");
        scope.setLevel("fatal");
      }}
      onError={(error, componentStack, eventId) => {
        analytics.track("error_boundary", { eventId });
      }}
    >
      <CheckoutFlow />
    </Sentry.ErrorBoundary>
  );
}
```

### React 19+: `Sentry.reactErrorHandler()` with `createRoot`

React 19 exposes hooks on `createRoot`. If you're using React 19 client components, pass `Sentry.reactErrorHandler()` to each hook:

```tsx
// In your client entry point or root layout setup
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/nextjs";

createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler(),    // fatal — tree unmounts
  onCaughtError: Sentry.reactErrorHandler(),      // caught by an ErrorBoundary
  onRecoverableError: Sentry.reactErrorHandler(), // auto-recovery (hydration)
}).render(<App />);
```

> **Use both together:** `reactErrorHandler()` is the global net; `<Sentry.ErrorBoundary>` provides scoped fallback UIs.

---

## Pages Router Error Handling

### `pages/_error.tsx`

Use `captureUnderscoreErrorException` — a helper that reads Next.js context and captures the error with correct status code.

```tsx
// pages/_error.tsx
import * as Sentry from "@sentry/nextjs";
import type { NextPage } from "next";
import type { ErrorProps } from "next/error";
import Error from "next/error";

const CustomErrorComponent: NextPage<ErrorProps> = (props) => {
  return <Error statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData) => {
  // CRITICAL: await so Sentry flushes before the serverless function exits
  await Sentry.captureUnderscoreErrorException(contextData);
  return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
```

### `pages/_app.tsx`

For global error handling at the app level in Pages Router:

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import * as Sentry from "@sentry/nextjs";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>}>
      <Component {...pageProps} />
    </Sentry.ErrorBoundary>
  );
}
```

---

## Server-Side Error Capture

### `onRequestError` Hook (Next.js 15+, SDK ≥8.28.0)

Export `onRequestError` from `instrumentation.ts` to automatically capture Server Component errors without adding `captureException` everywhere:

```typescript
// instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Automatically captures errors from Server Components, Middleware, and proxies
export const onRequestError = Sentry.captureRequestError;
```

### API Routes (App Router)

Unhandled errors crash the request and are auto-captured. Caught errors must be captured manually:

```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await db.users.create(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/users", method: "POST" },
    });
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
```

### API Routes (Pages Router)

```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await fetchData();
    res.status(200).json(data);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
```

### Server Actions

#### Manual Pattern

```typescript
// app/actions.ts
"use server";

import * as Sentry from "@sentry/nextjs";

export async function createPost(formData: FormData) {
  try {
    const post = await db.posts.create({
      data: { title: formData.get("title") as string },
    });
    return { success: true, id: post.id };
  } catch (error) {
    // Graceful return swallows — must capture manually
    Sentry.captureException(error);
    return { success: false, error: "Failed to create post" };
  }
}
```

#### `withServerActionInstrumentation` (Recommended)

Automatically instruments server actions with tracing, attaches form data, and connects client/server traces:

```typescript
// app/actions.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";

export async function submitForm(formData: FormData) {
  return Sentry.withServerActionInstrumentation(
    "submitForm",
    {
      headers: await headers(), // connects client and server traces
      formData,                 // attaches form data to Sentry events
      recordResponse: true,     // includes response data
    },
    async () => {
      // Errors thrown here are automatically captured
      const result = await processForm(formData);
      return { success: true, data: result };
    },
  );
}
```

---

## Edge Runtime Error Capture

Edge runtime runs in Next.js middleware and edge API routes. Initialize Sentry via `sentry.edge.config.ts`:

```typescript
// sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "___PUBLIC_DSN___",
  tracesSampleRate: 1.0,
  // Note: Edge runtime has limited Node.js API access
  // Some Node.js-specific integrations are not available
});
```

Errors in middleware are auto-captured via `onRequestError`. Caught errors require manual capture:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

export function middleware(request: NextRequest) {
  try {
    // middleware logic
    return NextResponse.next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { runtime: "edge", path: request.nextUrl.pathname },
    });
    return NextResponse.next();
  }
}

export const config = {
  // Exclude tunnel route from middleware if using tunnelRoute in withSentryConfig
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Scope Management

Sentry merges three scope layers before sending each event. Later scopes override earlier ones:

```
Global → Isolation → Current → Event Sent
```

### Global Scope

Applied to every event. Use for universal data (app version, build ID):

```typescript
Sentry.getGlobalScope().setTag("app_version", "2.1.0");
Sentry.getGlobalScope().setContext("build", { sha: process.env.VERCEL_GIT_COMMIT_SHA });
```

### Isolation Scope

- **Server:** Forked per request — safe for per-request user data (no cross-contamination)
- **Browser:** One per page load

All top-level `Sentry.setXxx()` methods write to the isolation scope:

```typescript
// These are identical:
Sentry.setTag("my-tag", "my value");
Sentry.getIsolationScope().setTag("my-tag", "my value");

// Set user on login (persists for the current request/page):
Sentry.setUser({ id: "user-42", email: "user@example.com" });

// Clear user on logout:
Sentry.setUser(null);
```

### `withScope` — Temporary Per-Capture Context

The primary tool for adding context to a single capture without affecting other events:

```typescript
Sentry.withScope((scope) => {
  scope.setTag("operation", "bulk-delete");
  scope.setLevel("warning");
  scope.setUser({ id: order.userId });
  scope.setContext("bulk", { count: items.length });
  scope.addBreadcrumb({
    category: "operation",
    message: "Bulk delete started",
    level: "info",
  });
  Sentry.captureException(deleteError);
});
// Tags/context above do NOT appear on subsequent events
```

### Scope Decision Guide

| Goal | API |
|------|-----|
| Data on ALL events (app version, build ID) | `Sentry.getGlobalScope().setTag(...)` |
| Current request/page-load data | `Sentry.setTag(...)` (isolation scope) |
| One specific capture only | `Sentry.withScope((scope) => { ... })` |
| Inline on a single event | Second arg to `captureException(err, { tags: {...} })` |

---

## Event Enrichment

### `setTag` / `setTags` (Searchable)

Tags are **indexed and searchable** — use them for filtering, grouping, and alerting.

- Key: max 32 chars, `a-zA-Z0-9_.:- ` (no spaces); Value: max 200 chars, no newlines

```typescript
Sentry.setTag("page_locale", "de-at");
Sentry.setTags({
  payment_method: "stripe",
  subscription_tier: "pro",
  region: "eu-west-1",
});
```

### `setContext` (Structured, Non-searchable)

Attaches arbitrary structured data visible in the issue detail view. Not indexed or searchable.

```typescript
Sentry.setContext("checkout", {
  step: "payment",
  cart_items: 3,
  total_usd: 99.99,
  coupon_applied: "SAVE20",
});

// Clear a context:
Sentry.setContext("checkout", null);
```

> **Depth:** Normalized to 3 levels deep by default. The `type` key is reserved — don't use it.

### `setUser` (User Identity)

```typescript
// On login
Sentry.setUser({
  id: "user-42",
  email: "jane@example.com",
  username: "janedoe",
  subscription: "pro",  // arbitrary extra fields accepted
});

// On logout
Sentry.setUser(null);
```

### `setExtra` / `setExtras` (Arbitrary Debug Data)

Non-indexed supplementary data. Prefer `setContext` for structured objects with meaningful names.

```typescript
Sentry.setExtra("raw_api_response", responseText);
Sentry.setExtras({
  formData: { fieldA: "value1" },
  processingStep: "validation",
  retryCount: 3,
});
```

### Tags vs Context vs Extra

| Feature | Searchable? | Indexed? | Best For |
|---------|------------|---------|---------|
| **Tags** | ✅ Yes | ✅ Yes | Filtering, grouping, alerting |
| **Context** | ❌ No | ❌ No | Structured debug info (nested objects) |
| **Extra** | ❌ No | ❌ No | Arbitrary debug values |
| **User** | ✅ Partially | ✅ Yes | User attribution and filtering |

---

## Breadcrumbs

### Automatic Breadcrumbs (Zero Config)

| Type | What's Captured |
|------|----------------|
| `ui.click` | DOM element clicks |
| `navigation` | URL changes, route transitions |
| `http` | XHR/fetch requests (URL, method, status) |
| `console` | `console.log`, `warn`, `error` |

### Manual Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User authenticated",
  level: "info",
  data: { userId: "u_42", method: "oauth2" },
});

Sentry.addBreadcrumb({
  type: "http",
  category: "api.request",
  message: "POST /api/orders",
  level: "info",
  data: {
    url: "/api/orders",
    method: "POST",
    status_code: 422,
    reason: "Validation failed",
  },
});

Sentry.addBreadcrumb({
  type: "navigation",
  category: "navigation",
  message: "User navigated to checkout",
  data: { from: "/cart", to: "/checkout/payment" },
});
```

### Breadcrumb Properties

| Key | Type | Values |
|-----|------|--------|
| `type` | string | `"default"` \| `"debug"` \| `"error"` \| `"info"` \| `"navigation"` \| `"http"` \| `"query"` \| `"ui"` \| `"user"` |
| `category` | string | Dot-notation: `"auth"`, `"ui.click"`, `"api.request"` |
| `message` | string | Human-readable description |
| `level` | string | `"fatal"` \| `"error"` \| `"warning"` \| `"log"` \| `"info"` \| `"debug"` |
| `timestamp` | number | Unix timestamp (auto-set if omitted) |
| `data` | object | Arbitrary key/value data |

### `beforeBreadcrumb` — Filter or Mutate

```typescript
Sentry.init({
  beforeBreadcrumb(breadcrumb, hint) {
    // Drop password field interactions
    if (breadcrumb.category === "ui.click") {
      if (hint?.event?.target?.type === "password") return null;
    }

    // Drop verbose console.debug in production
    if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
      return null;
    }

    // Enrich fetch breadcrumbs
    if (breadcrumb.category === "fetch" && hint?.response) {
      breadcrumb.data = {
        ...breadcrumb.data,
        responseStatus: hint.response.status,
      };
    }

    return breadcrumb;
  },
  maxBreadcrumbs: 50, // default: 100
});
```

---

## `beforeSend` and Filtering Hooks

### `beforeSend` — Modify or Drop Error Events

Last chance to modify or discard events. Runs after all event processors. Return `null` to drop.

```typescript
Sentry.init({
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Drop non-Error rejections (e.g. cancelled requests)
    if (error && !(error instanceof Error)) return null;

    // Drop browser extension errors
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some(f => f.filename?.includes("extension://"))) return null;

    // Scrub PII
    if (event.user?.email) {
      event.user = { ...event.user, email: "[filtered]" };
    }

    // Override fingerprint for known patterns
    if (error?.name === "ChunkLoadError") {
      event.fingerprint = ["chunk-load-failure"];
    }

    return event;
  },
});
```

> **Note:** Only one `beforeSend` is allowed. For multiple processors, use `addEventProcessor()`.

### `beforeSendTransaction` — Modify or Drop Performance Events

```typescript
Sentry.init({
  beforeSendTransaction(event) {
    if (event.transaction === "/api/health") return null;
    return event;
  },
});
```

### `ignoreErrors` — Pattern-Based Filtering

```typescript
Sentry.init({
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "fb_xd_fragment",
    /^Network Error$/i,
    /Loading chunk \d+ failed/,
    /^Script error\.?$/,
  ],
});
```

### `allowUrls` / `denyUrls`

```typescript
Sentry.init({
  // Only capture errors from your own scripts:
  allowUrls: [/https?:\/\/((cdn|www)\.)?yourapp\.com/],

  // Block third-party noise:
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /gtm\.js/,
  ],
});
```

---

## Fingerprinting and Custom Grouping

All events have a **fingerprint**. Events with the same fingerprint group into the same issue.

### Per-Event Fingerprinting

```typescript
Sentry.captureException(error, {
  fingerprint: ["checkout-failure", "stripe", String(error.code)],
});
```

### `withScope` Fingerprinting

```typescript
Sentry.withScope((scope) => {
  scope.setFingerprint([method, path, String(err.statusCode)]);
  Sentry.captureException(err);
});
```

### `beforeSend` Fingerprinting

```typescript
Sentry.init({
  beforeSend(event, hint) {
    const error = hint.originalException;

    // All DatabaseConnectionErrors → one issue:
    if (error instanceof DatabaseConnectionError) {
      event.fingerprint = ["database-connection-error"];
    }

    // Extend default grouping (keep Sentry's stack-trace hash + add dimension):
    if (error instanceof RPCError) {
      event.fingerprint = [
        "{{ default }}",              // keep Sentry's default
        String(error.functionName),   // + split by RPC function
        String(error.errorCode),
      ];
    }

    return event;
  },
});
```

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{ default }}` | Sentry's normally computed hash (extend rather than replace) |
| `{{ transaction }}` | Current transaction name |
| `{{ function }}` | Top function in stack trace |
| `{{ type }}` | Exception type |

---

## Event Processors

Unlike `beforeSend` (only one allowed), you can register multiple event processors:

```typescript
// Global — runs for all events
Sentry.addEventProcessor((event, hint) => {
  event.extra = {
    ...event.extra,
    buildId: process.env.VERCEL_GIT_COMMIT_SHA,
  };
  return event;
});

// Scoped — runs only inside the withScope callback
Sentry.withScope((scope) => {
  scope.addEventProcessor((event) => {
    event.tags = { ...event.tags, processed_by: "checkout_handler" };
    return event;
  });
  Sentry.captureException(checkoutError);
});
```

**Execution order:** All `addEventProcessor()` processors run first, then `beforeSend` runs last (guaranteed).

---

## Error Capture Quick Reference

### Scenario Coverage Table

| Scenario | Auto Captured? | Solution |
|----------|---------------|---------|
| Unhandled client JS exception | ✅ Yes | — |
| Unhandled promise rejection | ✅ Yes | — |
| Server Component error (Next.js 15+) | ✅ Yes | `onRequestError` hook |
| Unhandled API route crash | ✅ Yes | — |
| `app/error.tsx` boundary | ❌ No | `captureException` in `useEffect` |
| `app/global-error.tsx` | ❌ No | `captureException` in `useEffect` |
| `try/catch` with graceful return | ❌ No | `captureException` before return |
| `try/catch` with re-throw | ✅ Yes | — |
| Server Action graceful error | ❌ No | `captureException` or `withServerActionInstrumentation` |
| Caught edge middleware error | ❌ No | `captureException` manually |

### API Quick Reference

```typescript
// ── Capture ───────────────────────────────────────────────────────────
Sentry.captureException(error)
Sentry.captureException(error, { level, tags, extra, contexts, fingerprint, user })
Sentry.captureMessage("text", "warning")
Sentry.captureMessage("text", { level, tags, extra })

// ── Next.js Specific ──────────────────────────────────────────────────
export const onRequestError = Sentry.captureRequestError      // instrumentation.ts
await Sentry.captureUnderscoreErrorException(contextData)     // pages/_error.tsx
Sentry.withServerActionInstrumentation("name", opts, fn)      // server actions

// ── User ──────────────────────────────────────────────────────────────
Sentry.setUser({ id, email, username, ...custom })
Sentry.setUser(null)                                          // clear on logout

// ── Tags (searchable) ─────────────────────────────────────────────────
Sentry.setTag("key", "value")
Sentry.setTags({ key1: "v1", key2: "v2" })

// ── Context (structured, non-searchable) ──────────────────────────────
Sentry.setContext("name", { key: value })
Sentry.setContext("name", null)                               // clear

// ── Extra (arbitrary) ─────────────────────────────────────────────────
Sentry.setExtra("key", anyValue)
Sentry.setExtras({ key1: v1 })

// ── Breadcrumbs ───────────────────────────────────────────────────────
Sentry.addBreadcrumb({ type, category, message, level, data })

// ── Scopes ────────────────────────────────────────────────────────────
Sentry.withScope((scope) => { scope.setTag(...); Sentry.captureException(...) })
Sentry.withIsolationScope((scope) => { ... })
Sentry.getGlobalScope().setTag(...)
Sentry.getIsolationScope().setTag(...)                        // same as Sentry.setTag()

// ── Fingerprinting ────────────────────────────────────────────────────
scope.setFingerprint(["group-key"])
event.fingerprint = ["{{ default }}", "extra-dimension"]      // in beforeSend

// ── Hooks ─────────────────────────────────────────────────────────────
Sentry.init({ beforeSend(event, hint) { return event | null } })
Sentry.init({ beforeSendTransaction(event) { return event | null } })
Sentry.init({ beforeBreadcrumb(breadcrumb, hint) { return breadcrumb | null } })
Sentry.init({ ignoreErrors: ["string", /regex/] })
Sentry.init({ allowUrls: [/regex/] })
Sentry.init({ denyUrls: [/regex/] })
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Errors not appearing from `error.tsx` | Add `Sentry.captureException(error)` in a `useEffect` — Next.js catches these before Sentry |
| Server Component errors missing | Ensure `export const onRequestError = Sentry.captureRequestError` is in `instrumentation.ts`; requires SDK ≥8.28.0 + Next.js 15 |
| Minified stack traces | Configure `authToken` in `withSentryConfig` for source map upload; use `digest` to correlate server logs with Sentry events |
| Duplicate errors | Check that only one handler captures the same error; in dev, React Strict Mode may double-fire — validate in production builds |
| Server Action errors missing | Use `withServerActionInstrumentation` wrapper or add `captureException` before any graceful `return` |
| Events blocked by ad-blockers | Set `tunnelRoute: "/monitoring"` in `withSentryConfig`; exclude the route from your middleware matcher |
| Missing edge errors | Verify `sentry.edge.config.ts` is imported via `instrumentation.ts` when `NEXT_RUNTIME === "edge"` |
| Turbopack source map issues | Turbopack source map upload support is experimental; fall back to webpack for production builds if maps are missing |
| Events from wrong DSN in hybrid app | All three runtimes (client, server, edge) use the same DSN; verify each init file has identical DSN value |
| `captureUnderscoreErrorException` not awaited | In Pages Router `_error.tsx`, always `await` it — serverless functions may exit before Sentry flushes otherwise |
