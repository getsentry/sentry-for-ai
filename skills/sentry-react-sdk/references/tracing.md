# Tracing — Sentry React SDK

> Minimum SDK: `@sentry/react` ≥8.0.0+  
> `reactRouterV7BrowserTracingIntegration`: requires `@sentry/react` ≥8.0.0  
> `ignoreSpans`: requires `@sentry/react` ≥10.2.0  
> `enableAsyncRouteHandlers` + `lazyRouteManifest`: requires `@sentry/react` ≥10.39.0  
> `enableLongAnimationFrame`: requires `@sentry/react` ≥8.18.0

---

## How Automatic Tracing Works

| What's traced | Op | How |
|---------------|----|-----|
| Initial page load | `pageload` | `browserTracingIntegration()` reads `window.performance` timing |
| Client-side navigations | `navigation` | History API (pushState / replaceState) |
| `fetch()` requests | `http.client` | Patched automatically |
| `XMLHttpRequest` requests | `http.client` | Patched automatically |
| Long Tasks (main-thread blocks > 50ms) | `ui.long-task` | `PerformanceLongTaskTiming` observer |
| Long Animation Frames (≥8.18.0) | `ui.long-animation-frame` | `PerformanceLongAnimationFrameTiming` observer |
| INP interactions | `ui.interaction` | `PerformanceEventTiming` observer, emitted on page hide |

---

## Core Setup

```typescript
// src/instrument.ts (imported FIRST in main.tsx / index.tsx)
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  // Tracing sample rates
  tracesSampleRate: 1.0,   // 100% in dev; lower to 0.1–0.2 in production

  // Which outgoing requests get sentry-trace + baggage headers
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yourapp\.com/,
  ],
});
```

> **To disable tracing entirely:** omit both `tracesSampleRate` and `tracesSampler`. Setting `tracesSampleRate: 0` is **not** the same — the integration still runs, it just doesn't send data.

---

## `browserTracingIntegration` — All Options

```typescript
Sentry.browserTracingIntegration({
  /* option: default */
})
```

### Page Load & Navigation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `instrumentPageLoad` | `boolean` | `true` | Create a `pageload` span on initial load. Disable when you want to name the span yourself via `startBrowserTracingPageLoadSpan`. |
| `instrumentNavigation` | `boolean` | `true` | Create `navigation` spans on History API changes. |

### Span Lifecycle / Timing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `idleTimeout` | `number` (ms) | `1000` | How long to wait after the last child span finishes before closing the root span. The root takes the last child's end time as its own end time. |
| `finalTimeout` | `number` (ms) | `30000` | Hard cap on how long a pageload/navigation span can live. Prevents runaway open spans. |
| `childSpanTimeout` | `number` (ms) | `15000` | If a child span hasn't finished within this time, the root span finishes anyway. |
| `markBackgroundSpan` | `boolean` | `true` | When the tab goes to the background, mark the active span as `cancelled` and close it. |

### HTTP Request Spans

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `traceFetch` | `boolean` | `true` | Auto-create child spans for `fetch()` calls. |
| `traceXHR` | `boolean` | `true` | Auto-create child spans for `XMLHttpRequest` calls. |
| `enableHTTPTimings` | `boolean` | `true` | Enrich HTTP spans with Resource Timing API data: DNS lookup, TLS handshake, connection, TTFB, download time. |
| `shouldCreateSpanForRequest` | `(url: string) => boolean` | — | Return `false` to skip creating a span for a specific URL. |
| `onRequestSpanStart` | `(span, requestInfo) => void` | — | Fires when a fetch/XHR span starts. Add custom attributes based on headers or URL. |

### Performance Observations

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLongTask` | `boolean` | `true` | Capture spans for Long Tasks — main-thread blocks > 50ms. |
| `enableLongAnimationFrame` | `boolean` | `true` | Capture Long Animation Frames (LoAF). Supersedes Long Tasks for most use cases. SDK ≥8.18.0. |
| `enableInp` | `boolean` | `true` (SDK 8.x+) | Auto-capture INP events as standalone spans. In SDK 7.x, defaults to `false` and must be opted in. |
| `interactionsSampleRate` | `number` | `1.0` | Applied **on top of** `tracesSampleRate` for INP spans. `interactionsSampleRate: 0.5` + `tracesSampleRate: 0.1` = **5%** of interactions captured. |

### Span Naming

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `beforeStartSpan` | `(context: StartSpanOptions) => StartSpanOptions` | — | Called just before every pageload or navigation span is created. Mutate and return `context` to rename the span, change `op`, or add attributes. Primary use: parameterize URLs (`/users/123` → `/users/<id>`). |

```typescript
browserTracingIntegration({
  beforeStartSpan: (context) => ({
    ...context,
    name: location.pathname
      .replace(/\/[a-f0-9]{8,}/g, "/<hash>")  // strip hashes/UUIDs
      .replace(/\/\d+/g, "/<id>"),              // strip numeric IDs
  }),
})
```

### Trace Linking

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `linkPreviousTrace` | `'in-memory' \| 'session-storage' \| false` | `'in-memory'` | How a new pageload links back to the previous trace. `'session-storage'` persists across hard reloads. `false` disables linking. |
| `enableReportPageLoaded` | `boolean` | `false` | Enables `Sentry.reportPageLoaded()` for manually signalling page load completion in complex hydration scenarios. |

### Span Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignoreResourceSpans` | `string[]` | `[]` | Skip resource spans by `op` prefix. Example: `["resource.css", "resource.script", "resource.img"]`. |
| `ignorePerformanceApiSpans` | `Array<string \| RegExp>` | `[]` | Skip spans created from `performance.mark()`/`performance.measure()` matching these names. |

### Full Example With All Common Options

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration({
      // Lifecycle
      idleTimeout: 1000,
      finalTimeout: 30_000,
      childSpanTimeout: 15_000,
      markBackgroundSpan: true,

      // HTTP spans
      traceFetch: true,
      traceXHR: true,
      enableHTTPTimings: true,
      shouldCreateSpanForRequest: (url) =>
        !url.includes("/health") && !url.includes("/__webpack_hmr"),
      onRequestSpanStart: (span, { headers }) => {
        const rid = headers?.["x-request-id"];
        if (rid) span.setAttribute("request.id", rid);
      },

      // Performance observations
      enableLongTask: true,
      enableLongAnimationFrame: true,  // SDK ≥8.18.0
      enableInp: true,
      interactionsSampleRate: 1.0,

      // Span naming
      beforeStartSpan: (context) => ({
        ...context,
        name: context.name.replace(/\/\d+/g, "/<id>"),
      }),

      // Filtering
      ignoreResourceSpans: ["resource.css"],

      // Trace linking
      linkPreviousTrace: "in-memory",
    }),
  ],

  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/api\.myapp\.com/],
});
```

---

## What's Auto-Instrumented

### Page Load (`op: "pageload"`)
- Created on initial page render using `window.performance` timing API
- Contains Web Vitals: **LCP**, **CLS**, **FCP**, **TTFB**
- HTTP requests made during page load appear as child spans
- Long Tasks and Long Animation Frames appear as child spans

### Navigation (`op: "navigation"`)
- Created on every client-side navigation via the History API
- Does **not** include Web Vitals (those are page-load only)
- HTTP requests during navigation appear as child spans

### HTTP Spans (`op: "http.client"`)
- Automatic for both `fetch()` and `XMLHttpRequest`
- Captures: method, URL, HTTP status code, response size
- With `enableHTTPTimings`: DNS lookup time, TLS handshake, connection time, TTFB, download time

### Long Task Spans (`op: "ui.long-task"`)
- Created for any main-thread block > 50ms
- Helps identify JavaScript that blocks interactivity

### Long Animation Frame Spans (`op: "ui.long-animation-frame"`)
- SDK 8.18.0+; based on the LoAF API
- Captures render-blocking work including style/layout recalculations
- More accurate than Long Tasks for measuring rendering bottlenecks

### INP / Interaction Spans (`op: "ui.interaction"`)
- Standalone spans capturing Interaction to Next Paint
- Emitted on page hide (tab switch, navigation away)
- Attributes: `component`, `element`, `interaction_type`
- On by default in SDK 8.x+; opt-in (`enableInp: true`) in SDK 7.x

---

## Web Vitals

`browserTracingIntegration()` captures Core Web Vitals automatically and surfaces them in the **Sentry Web Vitals** product module:

| Vital | What it measures | Good | Needs Improvement | Poor |
|-------|-----------------|------|-------------------|------|
| **LCP** — Largest Contentful Paint | Time for largest viewport element to render | ≤ 2.5s | ≤ 4s | > 4s |
| **INP** — Interaction to Next Paint | Time from user interaction to next paint (replaced FID March 2024) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** — Cumulative Layout Shift | Sum of unexpected layout shift scores | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **FCP** — First Contentful Paint | Time for first content to render | ≤ 1s | ≤ 3s | > 3s |
| **TTFB** — Time to First Byte | Time until browser receives first byte | ≤ 100ms | ≤ 200ms | > 200ms |
| **FID** — First Input Delay | *(Legacy — collected but replaced by INP)* | ≤ 100ms | ≤ 300ms | > 300ms |

> **LCP and CLS timing note:** These keep changing after the pageload span ends. Sentry captures their final values via `visibilitychange` and page hide events. INP is similarly emitted as a standalone span on page hide.

**INP in SDK 7.x** (must opt in):
```typescript
browserTracingIntegration({ enableInp: true })
```

---

## React Router Integrations

All React Router integrations live in `@sentry/react`. The core mechanism: **replace** `browserTracingIntegration()` with the router-specific variant. Both cannot be used simultaneously.

---

### React Router v7 (Library Mode)

**Package:** `react-router` (v7)  
**Import source for hooks:** `"react-router"`

#### Method 1 — `createBrowserRouter` (Recommended)

```typescript
// src/instrument.ts
import React from "react";
import {
  createBrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/api\.myapp\.com/],
});
```

```typescript
// src/router.ts
import { createBrowserRouter } from "react-router";
import * as Sentry from "@sentry/react";
import { RootLayout, RootErrorBoundary } from "./layouts";
import { HomePage, UsersPage, UserDetailPage, DashboardPage } from "./pages";

// Wrap createBrowserRouter with Sentry instrumentation
const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV7(createBrowserRouter);

export const router = sentryCreateBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RootErrorBoundary />,  // see Error Boundary section below
    children: [
      { index: true,                      element: <HomePage /> },
      { path: "users",                    element: <UsersPage /> },
      { path: "users/:userId",            element: <UserDetailPage /> },
      { path: "dashboard",                element: <DashboardPage />,
        children: [
          { path: "analytics",            element: <AnalyticsPage /> },
        ],
      },
    ],
  },
]);
```

```typescript
// src/main.tsx
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import "./instrument";   // ← MUST be first
import { router } from "./router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
```

**Lazy routes (SDK ≥10.39.0):** add `enableAsyncRouteHandlers` and declare all route paths:

```typescript
Sentry.reactRouterV7BrowserTracingIntegration({
  useEffect: React.useEffect,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
  enableAsyncRouteHandlers: true,
  lazyRouteManifest: [
    "/",
    "/users",
    "/users/:userId",
    "/users/:userId/settings",
    "/dashboard",
    "/dashboard/analytics",
  ],
})
```

**Other router factories:**

| Factory | Sentry wrapper |
|---------|---------------|
| `createBrowserRouter` | `Sentry.wrapCreateBrowserRouterV7` |
| `createMemoryRouter` | `Sentry.wrapCreateMemoryRouterV7` |
| `createHashRouter` | `Sentry.wrapCreateBrowserRouterV7` (works for both) |

#### Method 2 — `<Routes>` Component

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter, Routes, Route,
  createRoutesFromChildren, matchRoutes,
  useLocation, useNavigationType,
} from "react-router";
import * as Sentry from "@sentry/react";

Sentry.init({
  // ... same init as Method 1
});

// Wrap Routes ONCE at the top level — do NOT wrap nested <Routes>
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/about"          element={<AboutPage />} />
        <Route path="/users/:userId"  element={<UserDetailPage />} />
        <Route path="*"               element={<NotFoundPage />} />
      </SentryRoutes>
    </BrowserRouter>
  );
}
```

Also works with `MemoryRouter` and `HashRouter`.

#### Method 3 — `useRoutes` Hook

```typescript
import { useRoutes, BrowserRouter } from "react-router";
import * as Sentry from "@sentry/react";

// MUST call wrapUseRoutesV7 OUTSIDE any React component
const useSentryRoutes = Sentry.wrapUseRoutesV7(useRoutes);

function App() {
  return useSentryRoutes([
    { path: "/",               element: <HomePage /> },
    { path: "/users/:userId",  element: <UserDetailPage /> },
    { path: "/dashboard",      element: <DashboardPage />,
      children: [
        { path: "analytics",   element: <AnalyticsPage /> },
      ],
    },
  ]);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter><App /></BrowserRouter>
);
```

#### Error Boundary (Required for Production Error Capture)

React Router v7's default `errorElement` swallows errors silently. You must capture them manually:

```typescript
import { useRouteError } from "react-router";
import * as Sentry from "@sentry/react";

export function SentryRouteErrorBoundary() {
  const error = useRouteError() as Error;

  React.useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert">
      <h1>Something went wrong</h1>
      <p>{error?.message ?? "An unexpected error occurred."}</p>
    </div>
  );
}

// Apply as errorElement on your root route and any nested boundaries:
const router = sentryCreateBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <SentryRouteErrorBoundary />,
    children: [
      {
        path: "checkout",
        element: <CheckoutPage />,
        errorElement: <SentryRouteErrorBoundary />,  // nested boundary
      },
    ],
  },
]);
```

---

### React Router v6

**Package:** `react-router-dom` (v6)  
**Import source for hooks:** `"react-router-dom"`

#### Method 1 — `createBrowserRouter` (Recommended for v6.4+)

```typescript
import React from "react";
import {
  createBrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: 1.0,
});

// Wrap createBrowserRouter
const sentryCreateBrowserRouter =
  Sentry.wrapCreateBrowserRouterV6(createBrowserRouter);

export const router = sentryCreateBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true,           element: <HomePage /> },
      { path: "users/:userId", element: <UserDetailPage /> },
      { path: "settings",      element: <SettingsPage /> },
    ],
  },
]);
```

**Other router factories (SDK ≥8.50.0):**

| Factory | Sentry wrapper |
|---------|---------------|
| `createBrowserRouter` | `Sentry.wrapCreateBrowserRouterV6` |
| `createMemoryRouter` | `Sentry.wrapCreateMemoryRouterV6` |

#### Method 2 — `<Routes>` Component

```typescript
import {
  BrowserRouter, Routes, Route,
  createRoutesFromChildren, matchRoutes,
  useLocation, useNavigationType,
} from "react-router-dom";
import * as Sentry from "@sentry/react";

Sentry.init({ /* ... same as above */ });

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/users/:userId"  element={<UserPage />} />
        <Route path="*"               element={<NotFoundPage />} />
      </SentryRoutes>
    </BrowserRouter>
  );
}
```

#### Method 3 — `useRoutes` Hook

```typescript
import { useRoutes, BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";

// Call OUTSIDE components
const useSentryRoutes = Sentry.wrapUseRoutesV6(useRoutes);

function App() {
  return useSentryRoutes([
    { path: "/",              element: <Home /> },
    { path: "/users/:userId", element: <User /> },
  ]);
}
```

---

### React Router v4 / v5

**Package:** `react-router-dom` (v4 or v5) + `history`

#### Method 1 — `withSentryRouting` HOC (Recommended)

```typescript
import React from "react";
import ReactDOM from "react-dom";
import { Route, Router, Switch } from "react-router-dom";
import { createBrowserHistory } from "history";
import * as Sentry from "@sentry/react";

// 1. Create a history instance
const history = createBrowserHistory();

// 2. Init with reactRouterV5BrowserTracingIntegration
Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.reactRouterV5BrowserTracingIntegration({ history }),
  ],
  tracesSampleRate: 1.0,
});

// 3. Wrap Route with HOC — enables parameterized transaction names
const SentryRoute = Sentry.withSentryRouting(Route);

// 4. Use SentryRoute everywhere instead of Route
//    ORDER MATTERS — most specific paths first (decreasing specificity)
function App() {
  return (
    <Router history={history}>
      <Switch>
        <SentryRoute path="/users/:userId/settings" component={UserSettingsPage} />
        <SentryRoute path="/users/:userId"          component={UserPage} />
        <SentryRoute path="/users"                  component={UsersPage} />
        <SentryRoute path="/"                       component={HomePage} />
      </Switch>
    </Router>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
```

#### Method 2 — Static Route Config (no HOC)

```typescript
import { matchPath } from "react-router-dom";
import { createBrowserHistory } from "history";
import * as Sentry from "@sentry/react";

const history = createBrowserHistory();

// Define all routes; most specific first
const routes = [
  { path: "/users/:userId/settings" },
  { path: "/users/:userId" },
  { path: "/users" },
  { path: "/dashboard/analytics" },
  { path: "/dashboard" },
  { path: "/" },
];

Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.reactRouterV5BrowserTracingIntegration({
      history,
      routes,
      matchPath,   // from react-router-dom
    }),
  ],
  tracesSampleRate: 1.0,
});
```

**React Router v4:** use `Sentry.reactRouterV4BrowserTracingIntegration` — the API is identical to v5.

---

### TanStack Router

**Requires:** `@tanstack/react-router` ≥1.64.0

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";   // generated by TanStack Router

// 1. Create the router first
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// 2. Init Sentry, passing the router instance
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.tanstackRouterBrowserTracingIntegration(router),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/api\.myapp\.com/],
});

// 3. Render
ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
```

**Key difference vs React Router:** `tanstackRouterBrowserTracingIntegration` takes the router instance directly — no hooks (`useLocation`, `useNavigationType`) or helpers (`createRoutesFromChildren`, `matchRoutes`) are needed. TanStack Router exposes its route definitions directly to the SDK.

---

### How Route Names Are Parameterized

All router integrations extract parameterized route patterns instead of literal URLs:

| Actual URL | Transaction Name |
|-----------|-----------------|
| `/users/42` | `/users/:userId` |
| `/orders/abc-123/items` | `/orders/:orderId/items` |
| `/posts/2024/my-first-post` | `/posts/:year/:slug` |

This grouping is essential for meaningful performance data — without it, every user generates a unique transaction name and nothing can be aggregated.

---

### Router Integration Quick-Reference

```
Are you using React Router?
├─ v7 (react-router package) ──────► reactRouterV7BrowserTracingIntegration
│    ├─ createBrowserRouter? ──────► wrapCreateBrowserRouterV7(createBrowserRouter)
│    ├─ createMemoryRouter? ───────► wrapCreateMemoryRouterV7(createMemoryRouter)
│    ├─ <Routes> component? ───────► withSentryReactRouterV7Routing(Routes)
│    └─ useRoutes hook? ────────────► wrapUseRoutesV7(useRoutes)
│
├─ v6 (react-router-dom) ──────────► reactRouterV6BrowserTracingIntegration
│    ├─ createBrowserRouter? ──────► wrapCreateBrowserRouterV6(createBrowserRouter)
│    ├─ createMemoryRouter? ───────► wrapCreateMemoryRouterV6(createMemoryRouter) [≥8.50.0]
│    ├─ <Routes> component? ───────► withSentryReactRouterV6Routing(Routes)
│    └─ useRoutes hook? ────────────► wrapUseRoutesV6(useRoutes)
│
├─ v4/v5 ───────────────────────────► reactRouterV5BrowserTracingIntegration({ history })
│    ├─ with static routes array ──► add { routes, matchPath }
│    └─ without static routes ─────► withSentryRouting(Route) HOC
│
└─ No router / unsupported router ──► browserTracingIntegration()
     └─ custom router ──────────────► { instrumentPageLoad: false, instrumentNavigation: false }
                                       + startBrowserTracingPageLoadSpan
                                       + startBrowserTracingNavigationSpan

Are you using TanStack Router?
└─ Any version ≥1.64.0 ─────────────► tanstackRouterBrowserTracingIntegration(router)
```

---

## Custom Spans

### The Three Span APIs

#### `Sentry.startSpan()` — Active, Auto-Ending (Recommended)

Wraps a block of work. The span is active (collects children) and automatically ends when the callback returns or resolves:

```typescript
// Asynchronous
const data = await Sentry.startSpan(
  {
    name: "fetchUserProfile",
    op: "http.client",
    attributes: {
      "user.id": userId,
      "cache.hit": false,
    },
  },
  async () => {
    const res = await fetch(`/api/users/${userId}`);
    return res.json();
  }
);

// Synchronous
const result = Sentry.startSpan(
  { name: "computeRecommendations", op: "function" },
  () => expensiveComputation()
);

// Thrown errors are captured and the span is marked as error automatically
```

#### `Sentry.startSpanManual()` — Active, Manual End

Use when the span lifetime cannot be enclosed in a single callback — e.g., middleware that calls `next()`:

```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  return Sentry.startSpanManual(
    { name: "auth.verify", op: "middleware" },
    (span) => {
      // span is active inside this callback only
      res.once("finish", () => {
        span.setStatus({ code: res.statusCode < 400 ? 1 : 2 });
        span.end();  // ← REQUIRED — will not end automatically
      });
      return next();
    }
  );
}
```

#### `Sentry.startInactiveSpan()` — Not Active, Manual End

For spans that cross event boundaries and should **not** automatically collect children as parent:

```typescript
let checkoutSpan: Sentry.Span | undefined;

// On flow start
document.getElementById("checkout-btn")!.addEventListener("click", () => {
  checkoutSpan = Sentry.startInactiveSpan({
    name: "checkout-flow",
    op: "ui.flow",
  });
});

// On flow end (later, in a different event handler)
document.getElementById("confirm-btn")!.addEventListener("click", () => {
  checkoutSpan?.setAttribute("payment.method", "stripe");
  checkoutSpan?.setStatus({ code: 1 });
  checkoutSpan?.end();  // ← REQUIRED
});
```

Explicit parent-child wiring with inactive spans:

```typescript
const parentSpan = Sentry.startInactiveSpan({ name: "checkout-flow" });

const childA = Sentry.startInactiveSpan({
  name: "validate-cart",
  op: "function",
  parentSpan,           // ← explicit parent reference
});
await validateCart();
childA.end();

const childB = Sentry.startInactiveSpan({
  name: "process-payment",
  op: "function",
  parentSpan,
});
await processPayment();
childB.end();

parentSpan.end();
```

---

### Span Options Reference

```typescript
interface StartSpanOptions {
  name: string;             // Required — label shown in the UI
  op?: string;              // Operation category (see table below)
  startTime?: number;       // Unix timestamp in seconds (can be float)
  attributes?: Record<string, string | number | boolean | string[] | number[] | boolean[]>;
  parentSpan?: Span;        // Override default parent (mainly for startInactiveSpan)
  onlyIfParent?: boolean;   // Drop this span if there is no currently active parent
  forceTransaction?: boolean; // Force span to appear as a root transaction in the UI
}
```

**Common `op` values:**

| `op` | When to use |
|------|-------------|
| `http.client` | Outgoing HTTP requests |
| `db.query` | Database queries |
| `ui.render` | React component render work |
| `ui.load` | Async data loading for a page/view |
| `ui.click` | User click event handling |
| `ui.flow` | Multi-step UI flow (checkout, wizard) |
| `function` | General JS function calls |
| `task` | Background/scheduled work |
| `cache.get` / `cache.set` | Cache reads/writes |
| `middleware` | Express/Koa/Fastify middleware |

---

### Enriching Spans

```typescript
const span = Sentry.getActiveSpan();

if (span) {
  // Single attribute
  span.setAttribute("db.table", "users");
  span.setAttribute("db.rows_affected", 5);

  // Multiple attributes at once
  span.setAttributes({
    "http.method": "POST",
    "http.status_code": 201,
    "user.tier": "premium",
  });

  // Status codes: 0=unset, 1=ok, 2=error
  span.setStatus({ code: 1 });
  span.setStatus({ code: 2, message: "Upstream timeout" });

  // HTTP-specific shorthand
  span.setHttpStatus(404);  // sets code=2, message="Not Found"
  span.setHttpStatus(200);  // sets code=1

  // Rename at runtime
  span.updateName("GET /users/:id");

  // End with explicit timestamp (seconds since epoch)
  span.end(Date.now() / 1000);
}
```

---

### Nesting Spans

Children nest automatically under the currently active span:

```typescript
await Sentry.startSpan({ name: "loadDashboard", op: "ui.load" }, async () => {
  // These are children of "loadDashboard"
  const [user, posts] = await Promise.all([
    Sentry.startSpan({ name: "fetchUser", op: "http.client" }, () =>
      fetch("/api/user").then(r => r.json())
    ),
    Sentry.startSpan({ name: "fetchPosts", op: "http.client" }, () =>
      fetch("/api/posts").then(r => r.json())
    ),
  ]);

  // Sequential child — still nested under "loadDashboard"
  await Sentry.startSpan({ name: "renderDashboard", op: "ui.render" }, async () => {
    await renderContent(user, posts);
  });
});
```

### `forceTransaction` — Standalone Root Span

Forces a span to appear as its own root transaction in the Sentry UI, independent of any active parent. Useful for background workers, Web Workers, or queue processors:

```typescript
Sentry.startSpan(
  { name: "processEmailQueue", op: "task", forceTransaction: true },
  async () => {
    const batch = await queue.take(50);
    await processBatch(batch);
  }
);
```

### Browser Flat Span Hierarchy

In browsers, all child spans are attached **flat** to the root span (not nested under intermediate parents). This prevents incorrect parent-child attribution in parallel async flows.

To opt into true nesting (use with care):

```typescript
Sentry.init({
  // ...
  parentSpanIsAlwaysRootSpan: false,
});
```

---

## Distributed Tracing

Distributed tracing connects a browser page load to all backend API calls it triggers, creating a single end-to-end waterfall.

### The Two Headers

| Header | Format | Purpose |
|--------|--------|---------|
| `sentry-trace` | `{traceId}-{spanId}-{sampled}` | Carries trace context |
| `baggage` | W3C Baggage format with `sentry-*` entries | Carries sampling decision + metadata |

Both headers are automatically injected into `fetch()` and `XMLHttpRequest` for URLs matching `tracePropagationTargets`.

### `tracePropagationTargets`

```typescript
Sentry.init({
  tracePropagationTargets: [
    // String = substring match against full URL
    "localhost",
    "api.myapp.com",

    // RegExp = tested against full URL
    /^https:\/\/api\.myapp\.com\//,
    /^\/api\//,  // same-origin relative paths

    // Multiple backends
    "https://auth.myapp.com",
    "https://payments.myapp.com",
  ],
});
```

**Defaults:** Same-origin requests get headers automatically. Cross-origin requests need explicit entries.

**Disable completely:**
```typescript
tracePropagationTargets: []  // no distributed tracing headers on any requests
```

### CORS Requirements

Your backend APIs **must** allowlist these headers:

```
Access-Control-Allow-Headers: sentry-trace, baggage
```

Express example:
```javascript
app.use((_req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, sentry-trace, baggage"
  );
  next();
});
```

Without this, preflight requests fail and browsers suppress the headers.

### SSR / Meta Tag Approach

When your HTML is server-rendered, emit Sentry trace context into `<meta>` tags. `browserTracingIntegration` reads them on init and attaches the pageload span to the server's trace — the full request becomes one continuous trace.

Server (Node.js/Express):

```typescript
import * as Sentry from "@sentry/node";

app.get("/", (_req, res) => {
  const traceData = Sentry.getTraceData();
  // { "sentry-trace": "...", baggage: "..." }
  res.render("index", {
    sentryTrace: traceData["sentry-trace"],
    sentryBaggage: traceData["baggage"],
  });
});
```

HTML template (EJS/Handlebars/Jinja/etc.):

```html
<head>
  <meta name="sentry-trace" content="<%= sentryTrace %>" />
  <meta name="baggage"      content="<%= sentryBaggage %>" />
</head>
```

The browser SDK reads these tags automatically — no extra client config needed.

### Manual Propagation (WebSockets, Custom Channels)

For protocols that don't support HTTP headers:

```typescript
// Browser (sender)
const traceData = Sentry.getTraceData();

socket.send(JSON.stringify({
  type: "rpc.updateProfile",
  payload: { name: "Alice" },
  _sentry: {
    trace: traceData["sentry-trace"],
    baggage: traceData["baggage"],
  },
}));
```

```typescript
// Node.js server (receiver)
import * as Sentry from "@sentry/node";
import { propagation, context } from "@opentelemetry/api";

socket.on("message", (raw) => {
  const msg = JSON.parse(raw);
  const ctx = propagation.extract(context.active(), {
    "sentry-trace": msg._sentry.trace,
    "baggage": msg._sentry.baggage,
  });
  context.with(ctx, () => {
    Sentry.startSpan({ name: "ws.updateProfile" }, () => handleMessage(msg));
  });
});
```

### W3C `traceparent` Compatibility (SDK ≥10.10.0)

Add the W3C `traceparent` header alongside `sentry-trace` for OpenTelemetry-native backends:

```typescript
Sentry.init({
  propagateTraceparent: true,
});
```

---

## Sampling

### `tracesSampleRate` — Uniform Rate

```typescript
Sentry.init({
  tracesSampleRate: 1.0,   // 100% — dev / staging / low-traffic
  // tracesSampleRate: 0.2,  // 20% — light production
  // tracesSampleRate: 0.05, // 5%  — high-traffic production
  // tracesSampleRate: 0.01, // 1%  — very high-traffic production
});
```

### `tracesSampler` — Dynamic Per-Transaction

`tracesSampler` replaces `tracesSampleRate` (when both are set, `tracesSampler` wins):

```typescript
Sentry.init({
  tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
    // Drop health checks and internal routes
    if (["/health", "/ping", "/readyz"].some(p => name.includes(p))) return 0;

    // Always capture critical flows
    if (name.startsWith("/checkout") || name.startsWith("/payment")) return 1.0;

    // Sample admin routes at 50%
    if (name.startsWith("/admin")) return 0.5;

    // High-volume search at 5%
    if (name.includes("/search")) return 0.05;

    // For everything else: honor parent's decision, fall back to 10%
    return inheritOrSampleWith(0.1);
  },
});
```

### Full `samplingContext` Object

```typescript
interface SamplingContext {
  name: string;                     // Span/transaction name (e.g. "GET /users/:id")
  attributes?: SpanAttributes;      // Initial span attributes: op, url, http.method, etc.
  parentSampled?: boolean;          // Was the parent trace sampled? undefined = no parent
  parentSampleRate?: number;        // What rate was used upstream?
  inheritOrSampleWith: (fallbackRate: number) => number;
}
```

### `inheritOrSampleWith` — Why It Matters

Use `inheritOrSampleWith(fallback)` instead of checking `parentSampled` directly. It enables:
- **Deterministic sampling:** the same rate decision is applied throughout the trace chain
- **Accurate metric extrapolation:** Sentry's performance metrics scale correctly only when consistent sample rates flow through all services
- **Correct Sampled flag:** ensures the `sentry-sampled` value in downstream `baggage` matches the actual decision

### Returning Boolean vs Number

```typescript
tracesSampler: ({ name }) => {
  if (name === "/critical")  return true;   // equivalent to 1.0
  if (name === "/noisy")     return false;  // equivalent to 0
  return 0.2;
}
```

### Sampling Guidelines by Traffic Level

| Daily transactions | Recommended `tracesSampleRate` |
|--------------------|-------------------------------|
| < 10K | `1.0` — capture everything |
| 10K–100K | `0.2` — 20% |
| 100K–1M | `0.05` – `0.1` |
| > 1M | `0.01` – `0.02` with `tracesSampler` for priority routes at higher rates |

---

## Span Filtering

### `beforeSendTransaction` — Modify or Drop Whole Transactions

```typescript
Sentry.init({
  beforeSendTransaction(event) {
    // Drop internal/dev routes
    if (event.transaction?.startsWith("/__internal")) return null;

    // Scrub PII from transaction names
    if (event.transaction) {
      event.transaction = event.transaction
        .replace(/\/users\/[^/]+/, "/users/<redacted>");
    }

    // Add custom tags to every transaction
    event.tags = { ...event.tags, "app.build": BUILD_ID };

    return event;
  },
});
```

### `ignoreTransactions` — Declarative Transaction Filtering

```typescript
Sentry.init({
  ignoreTransactions: [
    "/health",            // string = substring match
    /^\/api\/internal/,   // regex = full URL test
    "/__webpack_hmr",
    /\.(png|jpg|svg|ico|woff2)$/,  // static assets
  ],
});
```

### `beforeSendSpan` — Modify Individual Spans

> `beforeSendSpan` **cannot drop spans** — it can only modify them. To suppress spans, use `ignoreSpans` (SDK ≥10.2.0).

```typescript
Sentry.init({
  beforeSendSpan(span) {
    // Redact token from span descriptions
    if (span.op === "http.client" && span.description?.includes("/token")) {
      span.description = span.description.replace(/token=[^&]+/, "token=REDACTED");
    }

    // Enrich all spans with deployment info
    span.data = {
      ...span.data,
      "deployment.region": import.meta.env.VITE_AWS_REGION ?? "unknown",
    };

    return span;  // must return span — never return null
  },
});
```

### `ignoreSpans` — Declarative Span Filtering (SDK ≥10.2.0)

```typescript
Sentry.init({
  ignoreSpans: [
    // String — matches against span name/description
    "font-load",

    // Regex against span name
    /^performance\.mark\./,

    // Object — filter by op only
    { op: "resource.script" },
    { op: "resource.img" },
    { op: "resource.css" },

    // Object — filter by name and op together
    { name: "beacon", op: "http.client" },

    // Object — name regex
    { name: /^(hotjar|analytics|gtag)/ },
  ],
});
```

> **Warning:** If the root span (the transaction itself) matches an `ignoreSpans` rule, the **entire local trace is dropped**.

---

## Custom Routing (Manual Spans)

For unsupported or custom routers, disable auto page spans and drive them yourself:

```typescript
import * as Sentry from "@sentry/react";
import { SEMANTIC_ATTRIBUTE_SENTRY_SOURCE } from "@sentry/react";

const client = Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.browserTracingIntegration({
      instrumentPageLoad: false,   // handled manually
      instrumentNavigation: false, // handled manually
    }),
  ],
  tracesSampleRate: 1.0,
})!;

// Initial page load — name with URL until route is matched
let pageLoadSpan = Sentry.startBrowserTracingPageLoadSpan(client, {
  name: window.location.pathname,
  attributes: {
    [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: "url",  // start with "url" source
  },
});

// Once the router resolves the matched route
myCustomRouter.on("routeResolved", (route) => {
  if (pageLoadSpan) {
    // Upgrade the pageload span's name to the parameterized pattern
    pageLoadSpan.updateName(route.pattern);          // e.g. "/users/:id"
    pageLoadSpan.setAttribute(
      SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, "route"      // upgrade to "route" source
    );
    pageLoadSpan = undefined;
  } else {
    // Subsequent navigations
    Sentry.startBrowserTracingNavigationSpan(client, {
      op: "navigation",
      name: route.pattern,
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: "route",
      },
    });
  }
});
```

Both functions create **idle spans** — they close automatically after `idleTimeout`ms of no new child activity, matching the behavior of automatic pageload/navigation spans.

---

## Full Import Reference

```typescript
import * as Sentry from "@sentry/react";

// ── Integrations ──────────────────────────────────────────────────────────
Sentry.browserTracingIntegration(options)
Sentry.reactRouterV7BrowserTracingIntegration(options)
Sentry.reactRouterV6BrowserTracingIntegration(options)
Sentry.reactRouterV5BrowserTracingIntegration(options)
Sentry.reactRouterV4BrowserTracingIntegration(options)
Sentry.tanstackRouterBrowserTracingIntegration(router)

// ── Router Wrappers — v7 ─────────────────────────────────────────────────
Sentry.wrapCreateBrowserRouterV7(createBrowserRouter)
Sentry.wrapCreateMemoryRouterV7(createMemoryRouter)
Sentry.withSentryReactRouterV7Routing(Routes)
Sentry.wrapUseRoutesV7(useRoutes)

// ── Router Wrappers — v6 ─────────────────────────────────────────────────
Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)
Sentry.wrapCreateMemoryRouterV6(createMemoryRouter)    // SDK ≥8.50.0
Sentry.withSentryReactRouterV6Routing(Routes)
Sentry.wrapUseRoutesV6(useRoutes)

// ── Router Wrappers — v5/v4 ──────────────────────────────────────────────
Sentry.withSentryRouting(Route)

// ── Spans ────────────────────────────────────────────────────────────────
Sentry.startSpan(options, callback)
Sentry.startSpanManual(options, callback)
Sentry.startInactiveSpan(options)
Sentry.getActiveSpan()

// ── Custom Browser Tracing ───────────────────────────────────────────────
Sentry.startBrowserTracingPageLoadSpan(client, options)
Sentry.startBrowserTracingNavigationSpan(client, options)

// ── Distributed Tracing ──────────────────────────────────────────────────
Sentry.getTraceData()
// Returns: { "sentry-trace": string, baggage: string }

// ── Constants ────────────────────────────────────────────────────────────
Sentry.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE  // "sentry.source"
Sentry.SEMANTIC_ATTRIBUTE_SENTRY_OP      // "sentry.op"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transactions in Performance dashboard | Verify `tracesSampleRate` > 0; confirm `browserTracingIntegration()` (or router variant) is in `integrations` array |
| Transaction names show raw URLs (`/users/42`) instead of patterns | Add router integration matching your router version; ensure it's replacing, not supplementing, `browserTracingIntegration()` |
| Transaction named `<unknown>` | Router integration is missing or misconfigured; check `useEffect`, `useLocation`, `useNavigationType` are all passed correctly |
| Distributed trace not linking frontend → backend | Add backend URL to `tracePropagationTargets`; verify `Access-Control-Allow-Headers` includes `sentry-trace, baggage` |
| SSR page load not linked to server trace | Inject `<meta name="sentry-trace">` and `<meta name="baggage">` tags from `Sentry.getTraceData()` in server-rendered HTML |
| API requests missing `sentry-trace` header | Check CORS preflight — backend must allow `sentry-trace` and `baggage` headers |
| INP spans not appearing | In SDK 7.x, enable explicitly: `browserTracingIntegration({ enableInp: true })` |
| Web Vitals missing | Confirm `browserTracingIntegration()` is in client init; check browser support (INP requires Chromium 96+) |
| Spans missing after async gap | Browser uses flat hierarchy; use `startInactiveSpan` with explicit `parentSpan` to enforce parent-child across async boundaries |
| High transaction volume / cost | Use `tracesSampler` to return `0` for health checks and asset routes; lower default rate with `inheritOrSampleWith(0.05)` |
| `beforeSendSpan` returning `null` breaks the SDK | `beforeSendSpan` must always return the span — use `ignoreSpans` to drop spans declaratively |
| Lazy routes not tracked | Upgrade to SDK ≥10.39.0; add `enableAsyncRouteHandlers: true` and `lazyRouteManifest` with all route paths |
| TanStack Router transactions missing | Ensure router is created **before** `Sentry.init()` is called and the router instance is passed to the integration |
