# Error Monitoring — Sentry Node.js SDK

> Minimum SDK: `@sentry/node` ≥8.0.0  
> NestJS integration: `@sentry/nestjs` ≥8.0.0  
> Bun integration: `@sentry/bun` ≥8.0.0 (thin wrapper over `@sentry/node`)  
> Deno integration: `npm:@sentry/deno` (Deno 2+)

---

## The Instrument-First Rule

`@sentry/node` patches modules at import time via OpenTelemetry. The instrument file **must be loaded before everything else** — before your framework, before your database driver, before any HTTP client.

```javascript
// instrument.js — loaded first
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  release: "my-app@1.2.3",
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});
```

```javascript
// app.js
require("./instrument");  // MUST be line 1
const express = require("express");
// ...
```

**ESM (Node 18.19+ / 19.9+):**

```javascript
// instrument.mjs
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });
```

```bash
# Launch with --import
node --import ./instrument.mjs app.mjs
# or:
NODE_OPTIONS="--import ./instrument.mjs" npm start
```

---

## What Is Captured Automatically

| Error Type | Captured? | Mechanism |
|-----------|-----------|-----------|
| Uncaught exceptions | ✅ Yes | `process.on("uncaughtException")` |
| Unhandled promise rejections | ✅ Yes | `process.on("unhandledRejection")` |
| Framework errors (Express, Fastify, Koa, Hapi, Connect) | ✅ Yes | Error handler middleware (see below) |
| NestJS non-HttpExceptions | ✅ Yes | `SentryGlobalFilter` |
| Caught + re-thrown errors | ✅ Yes | Bubbles to global handler |
| Caught + swallowed errors | ❌ No | Must call `captureException` manually |
| `HttpException` in NestJS (4xx) | ❌ No | Treated as control flow by design |

### The Core Rule

> **"If you catch an error and don't re-throw it, Sentry never sees it."**

```javascript
// ✅ Auto-captured — unhandled, bubbles up
throw new Error("Unhandled");

// ✅ Auto-captured — re-thrown
try {
  await doSomething();
} catch (err) {
  throw err;
}

// ❌ NOT captured — swallowed by graceful return
try {
  await doSomething();
} catch (err) {
  return res.status(500).json({ error: "Failed" }); // ← add captureException!
}

// ✅ Manually captured
try {
  await doSomething();
} catch (err) {
  Sentry.captureException(err);
  return res.status(500).json({ error: "Failed" });
}
```

---

## Framework Error Handler Placement

**Critical: placement rules differ per framework. Getting this wrong silently misses errors.**

| Framework | Function | Placement | Async? |
|-----------|----------|-----------|--------|
| Express | `setupExpressErrorHandler(app)` | **AFTER routes** | No |
| Fastify | `setupFastifyErrorHandler(app)` | **BEFORE routes** | No |
| Koa | `setupKoaErrorHandler(app)` | **FIRST middleware** | No |
| Hapi | `setupHapiErrorHandler(server)` | Before routes | **YES — must `await`** |
| Connect | `setupConnectErrorHandler(app)` | **BEFORE routes** | No |
| NestJS | `SentryGlobalFilter` + `SentryModule.forRoot()` | AppModule providers | No |

---

## Express

Error handler goes **after all routes**, before your own error handler.

```javascript
require("./instrument");
const express = require("express");
const Sentry = require("@sentry/node");

const app = express();
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ ok: true }));
app.post("/orders", async (req, res, next) => {
  try {
    const result = await processOrder(req.body.orderId);
    res.json(result);
  } catch (err) {
    next(err); // pass to error handlers
  }
});

// ↓ Sentry AFTER routes, BEFORE your error handler
Sentry.setupExpressErrorHandler(app);

// Optional: capture only specific status codes
// Sentry.setupExpressErrorHandler(app, {
//   shouldHandleError(error) {
//     return !error.status || parseInt(String(error.status)) >= 500;
//   },
// });

// ── Your error handler (runs after Sentry) ──────────────────────
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

app.listen(3000);
```

---

## Fastify

Error handler goes **before routes**. Internally registers a Fastify plugin using `onError` lifecycle hook.

```javascript
require("./instrument");
const Fastify = require("fastify");
const Sentry = require("@sentry/node");

const app = Fastify({ logger: true });

// ↓ Sentry BEFORE routes
Sentry.setupFastifyErrorHandler(app);

// Optional: customize which errors are captured
// Sentry.setupFastifyErrorHandler(app, {
//   shouldHandleError(error, request, reply) {
//     return reply.statusCode >= 500;
//   },
// });

app.get("/", async (request, reply) => ({ hello: "world" }));
app.get("/debug-sentry", async () => {
  throw new Error("Test Fastify error!");
});

app.listen({ port: 3000 });
```

---

## Koa

Error handler goes as the **first `app.use()` call**, before any route.

```javascript
require("./instrument");
const Koa = require("koa");
const Router = require("@koa/router");
const Sentry = require("@sentry/node");

const app = new Koa();
const router = new Router();

// ↓ Sentry FIRST middleware
Sentry.setupKoaErrorHandler(app);

router.get("/", async (ctx) => { ctx.body = { ok: true }; });
router.get("/debug-sentry", async () => { throw new Error("Test Koa error!"); });

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
```

> **Note:** `setupKoaErrorHandler` has no `shouldHandleError` option — it captures all errors.

---

## Hapi

`setupHapiErrorHandler` is **async** — you must `await` it. Internally registers a Hapi lifecycle extension on `onPreResponse`.

```javascript
require("./instrument");
const Sentry = require("@sentry/node");
const Hapi = require("@hapi/hapi");

const init = async () => {
  const server = Hapi.server({ port: 3000, host: "localhost" });

  // ↓ MUST be awaited!
  await Sentry.setupHapiErrorHandler(server);

  server.route({
    method: "GET",
    path: "/debug-sentry",
    handler: () => { throw new Error("Test Hapi error!"); },
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

init();
```

> **Caution:** Forgetting `await` silently skips Sentry registration. No error is thrown.

---

## Connect

Error handler goes **before routes**.

```javascript
require("./instrument");
const connect = require("connect");
const Sentry = require("@sentry/node");

const app = connect();

// ↓ Sentry BEFORE routes
Sentry.setupConnectErrorHandler(app);

app.use("/", (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ hello: "world" }));
});

app.use("/debug-sentry", (req, res, next) => {
  throw new Error("Test Connect error!");
});

// Your own error handler (after Sentry)
app.use((err, req, res, next) => {
  res.statusCode = err.status || 500;
  res.end("Internal Server Error");
});

require("http").createServer(app).listen(3000);
```

---

## NestJS

NestJS uses a **separate package** `@sentry/nestjs`. The setup has three parts:

1. `instrument.ts` at project root (loaded before `NestFactory`)
2. `SentryModule.forRoot()` in `AppModule.imports`
3. `SentryGlobalFilter` as an `APP_FILTER` provider

```bash
npm install @sentry/nestjs
```

```typescript
// instrument.ts  ← project root, NOT inside src/
import * as Sentry from "@sentry/nestjs";

// Must run before NestFactory and before AppModule is imported
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  enableLogs: true,
});
```

```typescript
// src/main.ts
import "../instrument"; // ← line 1, before NestFactory

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

```typescript
// src/app.module.ts
import { Module }               from "@nestjs/common";
import { APP_FILTER }           from "@nestjs/core";
import { SentryModule }         from "@sentry/nestjs/setup";
import { SentryGlobalFilter }   from "@sentry/nestjs/setup";

@Module({
  imports: [
    SentryModule.forRoot(),  // Registers SentryTracingInterceptor globally
    // ... your other modules
  ],
  providers: [
    {
      // Catches all unhandled exceptions; reports non-HttpExceptions to Sentry
      provide:  APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
```

### What `SentryGlobalFilter` Captures

By design, NestJS `HttpException` subclasses (4xx responses like `BadRequestException`, `NotFoundException`, `ForbiddenException`) are **not** reported — they're treated as normal control flow. Everything else — including `Error`, database exceptions, uncaught runtime errors — is captured.

```typescript
// src/app.controller.ts
import { Controller, Get, NotFoundException } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Controller()
export class AppController {
  @Get("missing")
  getMissing() {
    throw new NotFoundException("User not found"); // ← NOT reported to Sentry
  }

  @Get("broken")
  getBroken() {
    throw new Error("Database exploded"); // ← Reported to Sentry
  }
}
```

### Capturing Specific Error Types in NestJS

If you need to capture `HttpException`s too (e.g., 4xx errors for debugging):

```typescript
// Option A: custom filter alongside SentryGlobalFilter
import { Catch, ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter }  from "@nestjs/core";
import { HttpException }        from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Catch(HttpException)
export class SentryHttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Only capture 4xx that are interesting (e.g. 422 Unprocessable)
    if (exception.getStatus() >= 422) {
      Sentry.captureException(exception, {
        tags: { status: exception.getStatus() },
      });
    }
    return super.catch(exception, host);
  }
}
```

```typescript
// Option B: @SentryExceptionCaptured on an existing filter
import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { SentryExceptionCaptured } from "@sentry/nestjs";

@Catch()
export class MyGlobalFilter implements ExceptionFilter {
  @SentryExceptionCaptured() // ← adds Sentry reporting to existing catch()
  catch(exception: unknown, host: ArgumentsHost): void {
    // existing logic unchanged
  }
}
```

### NestJS Background Job Isolation

`SentryTracingInterceptor` only isolates HTTP requests. Background jobs and queues need manual isolation:

```typescript
import * as Sentry from "@sentry/nestjs";

@Injectable()
export class JobProcessor {
  async processJob(job: Job): Promise<void> {
    await Sentry.withIsolationScope(async (scope) => {
      scope.setUser({ id: job.userId });
      scope.setTag("job_type", job.type);
      scope.setTag("job_id", job.id);
      await this.doWork(job); // all events inside are fully isolated
    });
  }
}
```

---

## Vanilla Node.js (`http` Module)

No framework integration needed — rely on the global `uncaughtException` / `unhandledRejection` handlers plus manual `captureException` for caught errors.

```javascript
require("./instrument");
const http = require("http");
const Sentry = require("@sentry/node");

const server = http.createServer(async (req, res) => {
  try {
    const data = await handleRequest(req);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    Sentry.captureException(err, {
      tags: { path: req.url, method: req.method },
    });
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(3000);
```

---

## `captureException` — Full API

```typescript
function captureException(
  exception: unknown,
  captureContext?: CaptureContext | ((scope: Scope) => Scope)
): string; // returns EventId

type CaptureContext = Scope | Partial<ScopeContext> | ((scope: Scope) => Scope);

interface ScopeContext {
  user?: User;
  level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
  extra?: Record<string, unknown>;
  tags?: Record<string, Primitive>;
  contexts?: Record<string, Record<string, unknown>>;
  fingerprint?: string[];
}
```

```javascript
// Basic
Sentry.captureException(new Error("Something broke"));

// With inline CaptureContext
Sentry.captureException(error, {
  level: "fatal",
  tags: { order_id: orderId, payment_method: "stripe" },
  user: { id: req.user.id, email: req.user.email },
  extra: { requestBody: req.body, retryCount: 3 },
  fingerprint: ["order-processing-failure", orderId],
  contexts: {
    order: { id: orderId, total: 99.99, currency: "USD" },
  },
});

// Scope callback form — most flexible
Sentry.captureException(error, (scope) => {
  scope.setTag("component", "payment");
  scope.setLevel("error");
  scope.setTransactionName("POST /orders");
  return scope; // must return scope
});

// Non-Error values are accepted (but stack traces may be synthetic)
Sentry.captureException("something broke");
Sentry.captureException({ code: "AUTH_FAILED", userId: 42 });

// Capture and use the returned event ID
const eventId = Sentry.captureException(err);
res.status(500).json({ error: "Something went wrong", eventId });
```

---

## `captureMessage`

```typescript
function captureMessage(
  message: string,
  captureContext?: CaptureContext | SeverityLevel
): string; // returns EventId

type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";
```

```javascript
// Basic
Sentry.captureMessage("Payment gateway timeout");

// With severity level shorthand
Sentry.captureMessage("Disk usage above 90%", "warning");
Sentry.captureMessage("Cache miss rate critical", "fatal");
Sentry.captureMessage("User signed up", "info");

// With full context
Sentry.captureMessage("Rate limit exceeded", {
  level: "warning",
  tags: { service: "api-gateway", region: "us-east-1" },
  user: { id: req.user.id },
  extra: { requestsPerMinute: 1500, limit: 1000 },
  fingerprint: ["rate-limit", req.headers["x-client-id"]],
});
```

---

## Scope Management (v8+ — Hub Removed)

In SDK v8, `Hub` is removed. Use the three scope types directly.

| Scope | Accessor | Lifetime | Use For |
|-------|----------|----------|---------|
| **Global** | `Sentry.getGlobalScope()` | Process lifetime | App version, region, build ID |
| **Isolation** | `Sentry.getIsolationScope()` | Per HTTP request (auto-forked) | User identity, request metadata |
| **Current** | `Sentry.getCurrentScope()` | Narrow/temporary | Per-operation context |

**Priority (current wins):** Current > Isolation > Global

```javascript
// All Sentry.setXXX() top-level methods write to the ISOLATION scope
Sentry.setTag("key", "value");
// identical to:
Sentry.getIsolationScope().setTag("key", "value");

// Global scope — survives the lifetime of the process
Sentry.getGlobalScope().setTag("server_region", "eu-west-1");
Sentry.getGlobalScope().setContext("runtime", {
  name: "node",
  version: process.version,
});
```

### `withScope` — Temporary Per-Capture Context

Primary tool for adding context to a single capture without contaminating other events.

```javascript
Sentry.withScope((scope) => {
  scope.setTag("payment_method", "stripe");
  scope.setFingerprint(["stripe-payment-error"]);
  scope.setLevel("error");
  scope.setUser({ id: req.user.id });
  scope.setContext("cart", { items: req.body.items.length });
  scope.addBreadcrumb({ category: "payment", message: "Attempt #3", level: "info" });
  Sentry.captureException(stripeError);
  // All above ONLY applies to this one capture
});
```

### `withIsolationScope` — Full Isolation (Background Jobs)

Use for background jobs, workers, and queue processors where you need a completely clean scope.

```javascript
Sentry.withIsolationScope(async (scope) => {
  scope.setUser({ id: job.userId });
  scope.setTag("job_type", job.type);
  scope.setTag("job_id", job.id);
  await processJob(job); // all events inside are fully isolated from other jobs
});
```

### Scope Decision Guide

| Goal | API |
|------|-----|
| Data on ALL events (app version, build ID) | `Sentry.getGlobalScope().setTag(...)` |
| Current request data | `Sentry.setTag(...)` (writes to isolation scope) |
| One specific capture only | `Sentry.withScope((scope) => { ... })` |
| Background job / worker | `Sentry.withIsolationScope(async (scope) => { ... })` |
| Inline on a single event | Second arg to `captureException(err, { tags: {...} })` |

---

## Context Enrichment

### `setTag` / `setTags` — Indexed, Searchable

Tags are **indexed** — use them for filtering, grouping, and alerting. Key: max 32 chars, `[a-zA-Z0-9_.:−]`. Value: max 200 chars.

```javascript
Sentry.setTag("db_region", "us-east-1");
Sentry.setTag("feature_flag_new_ui", true);
Sentry.setTags({
  service: "checkout",
  version: "2.1.4",
  region: "eu",
});
```

### `setContext` — Structured, Non-Searchable

Attaches structured data visible in the issue detail view. Not indexed. Normalized to 3 levels deep. The `type` key is reserved — don't use it.

```javascript
Sentry.setContext("order", {
  id: orderId,
  total: 99.99,
  currency: "USD",
  coupon: "SAVE20",
});
Sentry.setContext("database", {
  host: "postgres.internal",
  query_duration_ms: 4523,
  active_connections: 19,
});
Sentry.setContext("order", null); // clear it
```

### `setUser` — User Identity

```javascript
// On login (writes to isolation scope — safe per-request)
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.displayName,
  subscription_tier: "pro", // custom fields accepted
});

// On logout
Sentry.setUser(null);

// Express middleware pattern — set per-request
app.use((req, res, next) => {
  if (req.user) {
    Sentry.setUser({ id: req.user.id, email: req.user.email });
  }
  next();
});
```

### `setExtra` / `setExtras` — Arbitrary Data

Non-indexed supplementary data. Prefer `setContext` for structured objects.

```javascript
Sentry.setExtra("server_memory_mb", process.memoryUsage().heapUsed / 1024 / 1024);
Sentry.setExtras({
  uptime: process.uptime(),
  node_version: process.version,
});
```

### Tags vs Context vs Extra

| Feature | Searchable? | Indexed? | Best For |
|---------|-----------|---------|---------|
| **Tags** | ✅ Yes | ✅ Yes | Filtering, grouping, alerting |
| **Context** | ❌ No | ❌ No | Structured debug info (nested objects) |
| **Extra** | ❌ No | ❌ No | Arbitrary debug values |
| **User** | ✅ Partially | ✅ Yes | User attribution and filtering |

---

## Breadcrumbs

### Automatic Breadcrumbs (Zero Config)

| Type | What's Captured |
|------|----------------|
| `http` | Outgoing HTTP requests (URL, method, status code) |
| `console` | `console.log`, `warn`, `error` calls |
| `db` | Database queries (via OTel auto-instrumentation) |

### Manual Breadcrumbs

```javascript
Sentry.addBreadcrumb({
  category: "auth",
  message: `User ${user.email} authenticated`,
  level: "info",
  data: { method: "oauth2", provider: "google" },
});

Sentry.addBreadcrumb({
  type: "http",
  category: "http",
  data: {
    method: "POST",
    url: "https://api.stripe.com/v1/charges",
    status_code: 402,
  },
  level: "warning",
});

Sentry.addBreadcrumb({
  type: "query",
  category: "db.query",
  message: "SELECT * FROM orders WHERE user_id = ?",
  data: { db: "postgres", duration_ms: 42 },
});
```

### Breadcrumb Properties

| Key | Type | Values |
|-----|------|--------|
| `type` | string | `"default"` \| `"debug"` \| `"error"` \| `"info"` \| `"http"` \| `"navigation"` \| `"query"` \| `"ui"` \| `"user"` |
| `category` | string | Dot-notation: `"auth"`, `"db.query"`, `"job.start"` |
| `message` | string | Human-readable description |
| `level` | string | `"fatal"` \| `"error"` \| `"warning"` \| `"log"` \| `"info"` \| `"debug"` |
| `timestamp` | number | Unix timestamp (auto-set if omitted) |
| `data` | object | Arbitrary key/value data |

---

## `beforeSend` and Filtering Hooks

### `beforeSend` — Modify or Drop Error Events

Last chance to modify or drop events. Runs after all event processors. Return `null` to drop. **Only one `beforeSend` is allowed** — use `addEventProcessor` for multiple processors.

```javascript
Sentry.init({
  beforeSend(event, hint) {
    const err = hint.originalException;

    // Drop in development
    if (process.env.NODE_ENV === "development") return null;

    // Drop specific error types
    if (err instanceof ConnectionResetError) return null;
    if (err?.message?.includes("ECONNRESET")) return null;

    // Scrub PII from user object
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Scrub sensitive keys from request body
    if (event.request?.data) {
      try {
        const body = JSON.parse(event.request.data as string);
        delete body.password;
        delete body.token;
        event.request.data = JSON.stringify(body);
      } catch {}
    }

    // Custom fingerprint from error properties
    if (err instanceof ApiError) {
      event.fingerprint = ["api-error", String(err.statusCode), err.endpoint];
    }

    // Filter noisy breadcrumbs
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values = event.breadcrumbs.values.filter(
        (bc) => !bc.data?.url?.includes("/health")
      );
    }

    return event;
  },

  // Drop specific transaction/span events
  beforeSendTransaction(event) {
    if (event.transaction === "GET /health") return null;
    if (event.transaction === "GET /ping") return null;
    return event;
  },
});
```

### `beforeBreadcrumb` — Filter or Mutate Breadcrumbs

```javascript
Sentry.init({
  beforeBreadcrumb(breadcrumb, hint) {
    // Drop health-check HTTP requests
    if (
      breadcrumb.type === "http" &&
      breadcrumb.data?.url?.includes("/health")
    ) {
      return null;
    }

    // Redact auth tokens from URLs
    if (breadcrumb.type === "http" && breadcrumb.data?.url) {
      try {
        const url = new URL(breadcrumb.data.url);
        url.searchParams.delete("token");
        url.searchParams.delete("api_key");
        breadcrumb.data.url = url.toString();
      } catch {}
    }

    return breadcrumb;
  },
  maxBreadcrumbs: 50, // default: 100
});
```

### `ignoreErrors` — Pattern-Based Filtering

```javascript
Sentry.init({
  ignoreErrors: [
    "Non-Error exception captured",
    /^ECONNRESET/,
    /^ETIMEDOUT/,
    /^socket hang up/,
  ],
  ignoreTransactions: [
    "GET /health",
    "GET /ping",
    "GET /metrics",
    /^GET \/internal\//,
  ],
});
```

---

## Fingerprinting and Custom Grouping

All events have a `fingerprint` array. Events with the same fingerprint group into the same Sentry issue.

### Per-Capture Fingerprinting

```javascript
Sentry.captureException(error, {
  fingerprint: ["payment-declined", req.body.payment_method],
});
```

### `withScope` Fingerprinting

```javascript
Sentry.withScope((scope) => {
  scope.setFingerprint([req.method, req.path, String(err.statusCode)]);
  Sentry.captureException(err);
});
```

### `beforeSend` Fingerprinting (Global Rules)

```javascript
Sentry.init({
  beforeSend(event, hint) {
    const err = hint.originalException;

    // All DB connection errors → one group
    if (err instanceof DatabaseConnectionError) {
      event.fingerprint = ["database-connection-error"];
    }

    // Group ApiErrors by status + endpoint
    if (err instanceof ApiError) {
      event.fingerprint = ["api-error", String(err.statusCode), err.endpoint];
    }

    // Extend Sentry's default algorithm (keep stack-trace hash + add dimension)
    if (err?.code) {
      event.fingerprint = ["{{ default }}", err.code];
    }

    return event;
  },
});
```

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{ default }}` | Sentry's normally computed hash — extend rather than replace |
| `{{ transaction }}` | Current transaction name |
| `{{ function }}` | Top function in stack trace |
| `{{ type }}` | Exception type name |

---

## Event Processors

Unlike `beforeSend` (one allowed), multiple event processors can be registered. Order is not guaranteed. `beforeSend` always runs last.

```javascript
// Runs on every event — enrich with deploy metadata
Sentry.addEventProcessor((event, hint) => {
  event.tags = {
    ...event.tags,
    git_sha: process.env.GIT_SHA ?? "unknown",
    deployed_by: process.env.DEPLOY_USER ?? "unknown",
  };
  return event;
});

// Drop events with a custom ignore flag
Sentry.addEventProcessor((event, hint) => {
  if ((hint.originalException as any)?.ignore_in_sentry === true) return null;
  return event;
});

// Scope-level processor (only inside withScope callback)
Sentry.withScope((scope) => {
  scope.addEventProcessor((event) => {
    event.tags = { ...event.tags, batch_job: "true" };
    return event;
  });
  Sentry.captureException(new Error("job failed"));
});
```

**`addEventProcessor` vs `beforeSend`:**

| | `addEventProcessor` | `beforeSend` |
|---|---|---|
| Count | Unlimited | One only |
| Order | Undefined (before `beforeSend`) | Always last |
| Async | ✅ Yes | ✅ Yes |
| Drop events | Return `null` | Return `null` |

---

## `requestDataIntegration` — Per-Request Data

Auto-enabled. Attaches HTTP request data to all events during a request. Each framework auto-forks an isolation scope per request via OpenTelemetry `AsyncLocalStorage` — concurrent requests stay separate.

| Field | Captured | Notes |
|-------|----------|-------|
| `url` | ✅ Always | Full request URL |
| `method` | ✅ Always | GET, POST, etc. |
| `headers` | ✅ Always | Auth header scrubbed automatically |
| `query_string` | ✅ Always | URL query params |
| `data` (body) | ⚠️ Opt-in | Requires `sendDefaultPii: true` |
| `cookies` | ⚠️ Opt-in | Requires `sendDefaultPii: true` |
| `ip_address` | ⚠️ Opt-in | Requires `sendDefaultPii: true` |

```javascript
Sentry.init({
  sendDefaultPii: true,
  integrations: [
    Sentry.requestDataIntegration({
      include: {
        cookies: true,
        data: true,         // request body
        headers: true,
        ip: true,
        query_string: true,
        url: true,
        user: { id: true, username: true, email: false },
      },
    }),
  ],
});
```

---

## Error Chains

`linkedErrorsIntegration` is auto-enabled and follows the standard `Error.cause` chain.

```javascript
// Standard Error.cause — captured automatically
try {
  await connectToDatabase();
} catch (dbError) {
  throw new Error("Failed to process order", { cause: dbError });
  // Sentry captures BOTH errors as a chain
}

// Configure depth (default: 5)
Sentry.init({
  integrations: [
    Sentry.linkedErrorsIntegration({ key: "cause", limit: 5 }),
  ],
});
```

### `extraErrorDataIntegration` — Custom Error Properties

Captures non-standard properties on Error subclasses:

```javascript
Sentry.init({
  integrations: [Sentry.extraErrorDataIntegration({ depth: 3 })],
});

class HttpError extends Error {
  constructor(message, response) {
    super(message);
    this.statusCode = response.status;    // captured in extras
    this.responseBody = response.body;    // captured in extras
    this.endpoint = response.url;         // captured in extras
  }
}
```

---

## Lifecycle: Flush Before Shutdown

`@sentry/node` batches events and sends asynchronously. Always flush before process exit to avoid losing the last events.

```javascript
// Graceful shutdown — HTTP server
process.on("SIGTERM", async () => {
  server.close(async () => {
    await Sentry.flush(2000); // wait up to 2s for queue to drain
    process.exit(0);
  });
});

// Serverless (Lambda, Cloud Functions) — close disables SDK after flush
export const handler = async (event) => {
  try {
    return await processEvent(event);
  } catch (err) {
    Sentry.captureException(err);
    await Sentry.close(2000); // flush + disable before function freezes
    throw err;
  }
};
```

---

## `Sentry.init()` — Error-Relevant Options

```typescript
Sentry.init({
  // Identity
  dsn?: string;                    // also: SENTRY_DSN env var
  release?: string;                // "my-app@1.2.3+abc123"
  environment?: string;            // default: "production"
  serverName?: string;             // hostname
  enabled?: boolean;               // default: true

  // Sampling
  sampleRate?: number;             // 0.0–1.0 error event sample rate
  tracesSampleRate?: number;       // 0.0–1.0 transaction sample rate

  // Data limits
  maxBreadcrumbs?: number;         // default: 100
  maxValueLength?: number;         // truncate long strings
  normalizeDepth?: number;         // default: 3

  // Privacy
  sendDefaultPii?: boolean;        // default: false — enables body/cookies/IP

  // Filtering
  ignoreErrors?: Array<string | RegExp>;
  ignoreTransactions?: Array<string | RegExp>;

  // Hooks
  beforeSend?: (event: Event, hint: EventHint) => Event | null;
  beforeSendTransaction?: (event: Event, hint: EventHint) => Event | null;
  beforeBreadcrumb?: (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => Breadcrumb | null;

  // Node-specific
  enableLogs?: boolean;             // default: false — Sentry.logger.*
  attachStacktrace?: boolean;       // add stack traces to captureMessage
  includeLocalVariables?: boolean;  // include local vars in stack frames
  onFatalError?: (error: Error) => void;
  shutdownTimeout?: number;         // default: 2000ms
});
```

---

## Bun

`@sentry/bun` is a thin wrapper over `@sentry/node`. The API is identical — use `--preload` instead of `require("./instrument")` first.

```typescript
// instrument.ts
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});
```

```bash
bun --preload ./instrument.ts server.ts
```

For `Bun.serve()`:

```typescript
import * as Sentry from "@sentry/bun";

const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Hello from Bun!");
  },
  error(error) {
    Sentry.captureException(error); // manual — no setupErrorHandler for Bun.serve
    return new Response("Internal Server Error", { status: 500 });
  },
});
```

> **Profiling:** `@sentry/profiling-node` uses a native addon — incompatible with Bun's runtime. Omit `nodeProfilingIntegration()` in Bun apps.

---

## Deno

```typescript
// instrument.ts
import * as Sentry from "npm:@sentry/deno";

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0,
});
```

```typescript
// server.ts
import "../instrument.ts";
import * as Sentry from "npm:@sentry/deno";

Deno.serve({ port: 3000 }, async (request) => {
  try {
    return new Response("Hello from Deno!");
  } catch (error) {
    Sentry.captureException(error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
```

> **Requirements:** Deno 2+. Run with `--allow-net --allow-env --allow-read`. No `setupExpressErrorHandler` equivalent — use `try/catch` + `captureException`.

---

## Quick Reference

```javascript
// Init
Sentry.init({ dsn: "...", tracesSampleRate: 1.0 });

// Capture
Sentry.captureException(new Error("oops"));
Sentry.captureException(err, { tags: { source: "api" }, level: "fatal" });
Sentry.captureMessage("Something happened", "warning");

// Context (→ isolation scope, auto-forked per request)
Sentry.setUser({ id: 1, email: "user@example.com" });
Sentry.setTag("region", "us-east");
Sentry.setTags({ service: "checkout", version: "2.0" });
Sentry.setContext("cart", { items: 3, total: 49.99 });
Sentry.addBreadcrumb({ category: "auth", message: "login", level: "info" });

// Scoped capture (temporary context, one event only)
Sentry.withScope((scope) => {
  scope.setTag("temp_tag", "only-this-event");
  scope.setFingerprint(["my-custom-group"]);
  scope.setLevel("warning");
  Sentry.captureException(err);
});

// Background job isolation
await Sentry.withIsolationScope(async (scope) => {
  scope.setUser({ id: job.userId });
  await processJob(job);
});

// Global (all events, process lifetime)
Sentry.getGlobalScope().setTag("app", "my-api");

// Framework error handlers — placement matters!
Sentry.setupExpressErrorHandler(app);          // Express: AFTER routes
Sentry.setupFastifyErrorHandler(app);          // Fastify: BEFORE routes
Sentry.setupKoaErrorHandler(app);              // Koa: FIRST middleware
await Sentry.setupHapiErrorHandler(server);    // Hapi: BEFORE routes, MUST await
Sentry.setupConnectErrorHandler(app);          // Connect: BEFORE routes

// Shutdown
await Sentry.flush(2000);
```
