---
name: sentry-nestjs-sdk
description: Full Sentry SDK setup for NestJS. Use when asked to "add Sentry to NestJS", "install @sentry/nestjs", "setup Sentry in NestJS", or configure error monitoring, tracing, profiling, logging, metrics, crons, or AI monitoring for NestJS applications. Supports Express and Fastify adapters, GraphQL, microservices, WebSockets, and background jobs.
license: Apache-2.0
category: sdk-setup
parent: sentry-sdk-setup
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [SDK Setup](../sentry-sdk-setup/SKILL.md) > NestJS SDK

# Sentry NestJS SDK

Opinionated wizard that scans your NestJS project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to NestJS" or "setup Sentry" in a NestJS app
- User wants error monitoring, tracing, profiling, logging, metrics, or crons in NestJS
- User mentions `@sentry/nestjs` or Sentry + NestJS
- User wants to monitor NestJS controllers, services, guards, microservices, or background jobs

> **Note:** SDK versions and APIs below reflect `@sentry/nestjs` 10.x (NestJS 8–11 supported).
> Always verify against [docs.sentry.io/platforms/node/guides/nestjs/](https://docs.sentry.io/platforms/node/guides/nestjs/) before implementing.

---

## Phase 1: Detect

Run these commands to understand the project before making recommendations:

```bash
# Confirm NestJS project
grep -E '"@nestjs/core"' package.json 2>/dev/null

# Check NestJS version
node -e "console.log(require('./node_modules/@nestjs/core/package.json').version)" 2>/dev/null

# Check existing Sentry
grep -i sentry package.json 2>/dev/null
ls src/instrument.ts 2>/dev/null
grep -r "Sentry.init\|@sentry" src/main.ts src/instrument.ts 2>/dev/null

# Check for existing Sentry DI wrapper (common in enterprise NestJS)
grep -rE "SENTRY.*TOKEN|SentryProxy|SentryService" src/ libs/ 2>/dev/null

# Check for config-class-based init (vs env-var-based)
grep -rE "class SentryConfig|SentryConfig" src/ libs/ 2>/dev/null

# Check if SentryModule.forRoot() is already registered in a shared module
grep -rE "SentryModule\.forRoot|SentryProxyModule" src/ libs/ 2>/dev/null

# Detect HTTP adapter (default is Express)
grep -E "FastifyAdapter|@nestjs/platform-fastify" package.json src/main.ts 2>/dev/null

# Detect GraphQL
grep -E '"@nestjs/graphql"|"apollo-server"' package.json 2>/dev/null

# Detect microservices
grep '"@nestjs/microservices"' package.json 2>/dev/null

# Detect WebSockets
grep -E '"@nestjs/websockets"|"socket.io"' package.json 2>/dev/null

# Detect task queues / scheduled jobs
grep -E '"@nestjs/bull"|"@nestjs/bullmq"|"@nestjs/schedule"|"bullmq"|"bull"' package.json 2>/dev/null

# Detect databases
grep -E '"@prisma/client"|"typeorm"|"mongoose"|"pg"|"mysql2"' package.json 2>/dev/null

# Detect AI libraries
grep -E '"openai"|"@anthropic-ai"|"langchain"|"@langchain"|"@google/generative-ai"|"ai"' package.json 2>/dev/null

# Check for companion frontend
ls -d ../frontend ../web ../client ../ui 2>/dev/null
```

**What to note:**

- Is `@sentry/nestjs` already installed? If yes, check if `instrument.ts` exists and `Sentry.init()` is called — may just need feature config.
- **Sentry DI wrapper detected?** → The project wraps Sentry behind a DI token (e.g. `SENTRY_PROXY_TOKEN`) for testability. Use the injected proxy for all runtime Sentry calls (`startSpan`, `captureException`, `withIsolationScope`) instead of importing `@sentry/nestjs` directly in controllers, services, and processors. Only `instrument.ts` should import `@sentry/nestjs` directly.
- **Config class detected?** → The project uses a typed config class for `Sentry.init()` options (e.g. loaded from YAML or `@nestjs/config`). Any new SDK options must be added to the config type — do not hardcode values that should be configurable per environment.
- **`SentryModule.forRoot()` already registered?** → If it's in a shared module (e.g. a Sentry proxy module), do not add it again in `AppModule` — this causes duplicate interceptor registration.
- Express (default) or Fastify adapter? Express is fully supported; Fastify works but has known edge cases.
- GraphQL detected? → `SentryGlobalFilter` handles it natively.
- Microservices detected? → Recommend RPC exception filter.
- Task queues / `@nestjs/schedule`? → Recommend crons.
- AI libraries? → Auto-instrumented, zero config.
- Prisma? → Requires manual `prismaIntegration()`.
- Companion frontend? → Triggers Phase 4 cross-link.

---

## Phase 2: Recommend

Based on what you found, present a concrete proposal. Don't ask open-ended questions — lead with a recommendation:

**Always recommended (core coverage):**

- ✅ **Error Monitoring** — captures unhandled exceptions across HTTP, GraphQL, RPC, and WebSocket contexts
- ✅ **Tracing** — auto-instruments middleware, guards, pipes, interceptors, filters, and route handlers

**Recommend when detected:**

- ✅ **Profiling** — production apps where CPU performance matters (`@sentry/profiling-node`)
- ✅ **Logging** — structured Sentry Logs + optional console capture
- ✅ **Crons** — `@nestjs/schedule`, Bull, or BullMQ detected
- ✅ **Metrics** — business KPIs or SLO tracking
- ✅ **AI Monitoring** — OpenAI/Anthropic/LangChain/etc. detected (auto-instrumented, zero config)

**Recommendation matrix:**

| Feature          | Recommend when...                                  | Reference                                      |
| ---------------- | -------------------------------------------------- | ---------------------------------------------- |
| Error Monitoring | **Always** — non-negotiable baseline               | `${SKILL_ROOT}/references/error-monitoring.md` |
| Tracing          | **Always** — NestJS lifecycle is auto-instrumented | `${SKILL_ROOT}/references/tracing.md`          |
| Profiling        | Production + CPU-sensitive workloads               | `${SKILL_ROOT}/references/profiling.md`        |
| Logging          | Always; enhanced for structured log aggregation    | `${SKILL_ROOT}/references/logging.md`          |
| Metrics          | Custom business KPIs or SLO tracking               | `${SKILL_ROOT}/references/metrics.md`          |
| Crons            | `@nestjs/schedule`, Bull, or BullMQ detected       | `${SKILL_ROOT}/references/crons.md`            |
| AI Monitoring    | OpenAI/Anthropic/LangChain/etc. detected           | `${SKILL_ROOT}/references/ai-monitoring.md`    |

Propose: _"I recommend Error Monitoring + Tracing + Logging. Want Profiling, Crons, or AI Monitoring too?"_

---

## Phase 3: Guide

### Install

```bash
# Core SDK (always required — includes @sentry/node)
npm install @sentry/nestjs

# With profiling support (optional)
npm install @sentry/nestjs @sentry/profiling-node
```

> ⚠️ **Do NOT install `@sentry/node` alongside `@sentry/nestjs`** — `@sentry/nestjs` re-exports everything from `@sentry/node`. Installing both causes duplicate registration.

### Three-File Setup (Required)

NestJS requires a specific three-file initialization pattern because the Sentry SDK must patch Node.js modules (via OpenTelemetry) **before** NestJS loads them.

> **Before creating new files**, check Phase 1 results:
>
> - If `instrument.ts` already exists → modify it, don't create a new one.
> - If a config class drives `Sentry.init()` → read options from the config instead of hardcoding env vars.
> - If a Sentry DI wrapper exists → use it for runtime calls instead of importing `@sentry/nestjs` directly in services/controllers.

#### Step 1: Create `src/instrument.ts`

```typescript
import * as Sentry from "@sentry/nestjs";
// Optional: add profiling
// import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? "production",
  release: process.env.SENTRY_RELEASE,
  sendDefaultPii: true,

  // Tracing — lower to 0.1–0.2 in high-traffic production
  tracesSampleRate: 1.0,

  // Profiling (requires @sentry/profiling-node)
  // integrations: [nodeProfilingIntegration()],
  // profileSessionSampleRate: 1.0,
  // profileLifecycle: "trace",

  // Structured logs (SDK ≥ 9.41.0)
  enableLogs: true,
});
```

**Config-driven `Sentry.init()`:** If Phase 1 found a typed config class (e.g. `SentryConfig`), read options from it instead of using raw `process.env`. This is common in NestJS apps that use `@nestjs/config` or custom config loaders:

```typescript
import * as Sentry from "@sentry/nestjs";
import { loadConfiguration } from "./config";

const config = loadConfiguration();

Sentry.init({
  dsn: config.sentry.dsn,
  environment: config.sentry.environment ?? "production",
  release: config.sentry.release,
  sendDefaultPii: config.sentry.sendDefaultPii ?? true,
  tracesSampleRate: config.sentry.tracesSampleRate ?? 1.0,
  profileSessionSampleRate: config.sentry.profilesSampleRate ?? 1.0,
  profileLifecycle: "trace",
  enableLogs: true,
});
```

When adding new SDK options (e.g. `sendDefaultPii`, `profileSessionSampleRate`), add them to the config type so they can be configured per environment.

#### Step 2: Import `instrument.ts` FIRST in `src/main.ts`

```typescript
// instrument.ts MUST be the very first import — before NestJS or any other module
import "./instrument";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown — flushes Sentry events on SIGTERM/SIGINT
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
```

> **Why first?** OpenTelemetry must monkey-patch `http`, `express`, database drivers, and other modules before they load. Any module that loads before `instrument.ts` will not be auto-instrumented.

#### Step 3: Register `SentryModule` and `SentryGlobalFilter` in `src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SentryModule, SentryGlobalFilter } from "@sentry/nestjs/setup";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    SentryModule.forRoot(), // Registers SentryTracingInterceptor globally
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter, // Captures all unhandled exceptions
    },
  ],
})
export class AppModule {}
```

**What each piece does:**

- `SentryModule.forRoot()` — registers `SentryTracingInterceptor` as a global `APP_INTERCEPTOR`, enabling HTTP transaction naming
- `SentryGlobalFilter` — extends `BaseExceptionFilter`; captures exceptions across HTTP, GraphQL (rethrows `HttpException` without reporting), and RPC contexts

> ⚠️ **Do NOT register `SentryModule.forRoot()` twice.** If Phase 1 found it already imported in a shared library module (e.g. a `SentryProxyModule` or `AnalyticsModule`), do not add it again in `AppModule`. Duplicate registration causes every span to be intercepted twice, bloating trace data.

> ⚠️ **Two entrypoints, different imports:**
>
> - `@sentry/nestjs` → SDK init, capture APIs, decorators (`SentryTraced`, `SentryCron`, `SentryExceptionCaptured`)
> - `@sentry/nestjs/setup` → NestJS DI constructs (`SentryModule`, `SentryGlobalFilter`)
>
> Never import `SentryModule` from `@sentry/nestjs` (main entrypoint) — it loads `@nestjs/common` before OpenTelemetry patches it, breaking auto-instrumentation.

### ESM Setup (Node ≥ 18.19.0)

For ESM applications, use `--import` instead of a file import:

```javascript
// instrument.mjs
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

```json
// package.json
{
  "scripts": {
    "start": "node --import ./instrument.mjs -r ts-node/register src/main.ts"
  }
}
```

Or via environment:

```bash
NODE_OPTIONS="--import ./instrument.mjs" npm run start
```

### Exception Filter Options

Choose the approach that fits your existing architecture:

#### Option A: No existing global filter — use `SentryGlobalFilter` (recommended)

Already covered in Step 3 above. This is the simplest option.

#### Option B: Existing custom global filter — add `@SentryExceptionCaptured()` decorator

```typescript
import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { SentryExceptionCaptured } from "@sentry/nestjs";

@Catch()
export class YourExistingFilter implements ExceptionFilter {
  @SentryExceptionCaptured() // Wraps catch() to auto-report exceptions
  catch(exception: unknown, host: ArgumentsHost): void {
    // Your existing error handling continues unchanged
  }
}
```

#### Option C: Specific exception type — manual capture

```typescript
import { ArgumentsHost, Catch } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/nestjs";

@Catch(ExampleException)
export class ExampleExceptionFilter extends BaseExceptionFilter {
  catch(exception: ExampleException, host: ArgumentsHost) {
    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
```

#### Option D: Microservice RPC exceptions

```typescript
import { Catch, RpcExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { RpcException } from "@nestjs/microservices";
import * as Sentry from "@sentry/nestjs";

@Catch(RpcException)
export class SentryRpcFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    Sentry.captureException(exception);
    return throwError(() => exception.getError());
  }
}
```

### Decorators

#### `@SentryTraced(op?)` — Instrument any method

```typescript
import { Injectable } from "@nestjs/common";
import { SentryTraced } from "@sentry/nestjs";

@Injectable()
export class OrderService {
  @SentryTraced("order.process")
  async processOrder(orderId: string): Promise<void> {
    // Automatically wrapped in a Sentry span
  }

  @SentryTraced()  // Defaults to op: "function"
  async fetchInventory() { ... }
}
```

#### `@SentryCron(slug, config?)` — Monitor scheduled jobs

```typescript
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SentryCron } from "@sentry/nestjs";

@Injectable()
export class ReportService {
  @Cron("0 * * * *")
  @SentryCron("hourly-report", {
    // @SentryCron must come AFTER @Cron
    schedule: { type: "crontab", value: "0 * * * *" },
    checkinMargin: 2, // Minutes before marking missed
    maxRuntime: 10, // Max runtime in minutes
    timezone: "UTC",
  })
  async generateReport() {
    // Check-in sent automatically on start/success/failure
  }
}
```

#### Background Job Scope Isolation

Background jobs share the default isolation scope — wrap with `Sentry.withIsolationScope()` to prevent cross-contamination:

```typescript
import * as Sentry from "@sentry/nestjs";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class JobService {
  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    Sentry.withIsolationScope(() => {
      Sentry.setTag("job", "hourly-sync");
      this.doWork();
    });
  }
}
```

Apply `withIsolationScope` to: `@Cron()`, `@Interval()`, `@OnEvent()`, `@Processor()`, and any code outside the request lifecycle.

### Working with Sentry DI Wrappers

Some NestJS projects wrap Sentry behind a dependency injection token (e.g. `SENTRY_PROXY_TOKEN`) for testability and decoupling. If Phase 1 detected this pattern, **use the injected service for all runtime Sentry calls** — do not import `@sentry/nestjs` directly in controllers, services, or processors.

```typescript
import { Controller, Inject } from "@nestjs/common";
import { SENTRY_PROXY_TOKEN, type SentryProxyService } from "./sentry-proxy";

@Controller("orders")
export class OrderController {
  constructor(
    @Inject(SENTRY_PROXY_TOKEN) private readonly sentry: SentryProxyService,
    private readonly orderService: OrderService,
  ) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.sentry.startSpan(
      { name: "createOrder", op: "http" },
      async () => this.orderService.create(dto),
    );
  }
}
```

**Where direct `@sentry/nestjs` import is still correct:**

- `instrument.ts` — always uses `import * as Sentry from "@sentry/nestjs"` for `Sentry.init()`
- Standalone scripts and exception filters that run outside the DI container

### Verification

Add a test endpoint to confirm events reach Sentry:

```typescript
import { Controller, Get } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Controller()
export class DebugController {
  @Get("/debug-sentry")
  triggerError() {
    throw new Error("My first Sentry error from NestJS!");
  }

  @Get("/debug-sentry-span")
  triggerSpan() {
    return Sentry.startSpan({ op: "test", name: "NestJS Test Span" }, () => {
      return { status: "span created" };
    });
  }
}
```

Hit `GET /debug-sentry` and check the Sentry Issues dashboard within seconds.

### For Each Agreed Feature

Walk through features one at a time. Load the reference, follow its steps, verify before moving on:

| Feature          | Reference file                                 | Load when...                           |
| ---------------- | ---------------------------------------------- | -------------------------------------- |
| Error Monitoring | `${SKILL_ROOT}/references/error-monitoring.md` | Always (baseline)                      |
| Tracing          | `${SKILL_ROOT}/references/tracing.md`          | Always (NestJS routes are auto-traced) |
| Profiling        | `${SKILL_ROOT}/references/profiling.md`        | CPU-intensive production apps          |
| Logging          | `${SKILL_ROOT}/references/logging.md`          | Structured log aggregation needed      |
| Metrics          | `${SKILL_ROOT}/references/metrics.md`          | Custom KPIs / SLO tracking             |
| Crons            | `${SKILL_ROOT}/references/crons.md`            | Scheduled jobs or task queues          |
| AI Monitoring    | `${SKILL_ROOT}/references/ai-monitoring.md`    | OpenAI/Anthropic/LangChain detected    |

For each feature: `Read ${SKILL_ROOT}/references/<feature>.md`, follow steps exactly, verify it works.

---

## Configuration Reference

### Key `Sentry.init()` Options

| Option                     | Type                    | Default        | Purpose                                                                                          |
| -------------------------- | ----------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `dsn`                      | `string`                | —              | SDK disabled if empty; env: `SENTRY_DSN`                                                         |
| `environment`              | `string`                | `"production"` | e.g., `"staging"`; env: `SENTRY_ENVIRONMENT`                                                     |
| `release`                  | `string`                | —              | e.g., `"myapp@1.0.0"`; env: `SENTRY_RELEASE`                                                     |
| `sendDefaultPii`           | `boolean`               | `false`        | Include IP addresses and request headers                                                         |
| `tracesSampleRate`         | `number`                | —              | Transaction sample rate; `undefined` disables tracing                                            |
| `tracesSampler`            | `function`              | —              | Custom per-transaction sampling (overrides rate)                                                 |
| `tracePropagationTargets`  | `Array<string\|RegExp>` | —              | URLs to propagate `sentry-trace`/`baggage` headers to                                            |
| `profileSessionSampleRate` | `number`                | —              | Continuous profiling session rate (SDK ≥ 10.27.0)                                                |
| `profileLifecycle`         | `"trace"\|"manual"`     | `"trace"`      | `"trace"` = auto-start profiler with spans; `"manual"` = call `startProfiler()`/`stopProfiler()` |
| `enableLogs`               | `boolean`               | `false`        | Send structured logs to Sentry (SDK ≥ 9.41.0)                                                    |
| `ignoreErrors`             | `Array<string\|RegExp>` | `[]`           | Error message patterns to suppress                                                               |
| `ignoreTransactions`       | `Array<string\|RegExp>` | `[]`           | Transaction name patterns to suppress                                                            |
| `beforeSend`               | `function`              | —              | Hook to mutate or drop error events                                                              |
| `beforeSendTransaction`    | `function`              | —              | Hook to mutate or drop transaction events                                                        |
| `beforeSendLog`            | `function`              | —              | Hook to mutate or drop log events                                                                |
| `debug`                    | `boolean`               | `false`        | Verbose SDK debug output                                                                         |
| `maxBreadcrumbs`           | `number`                | `100`          | Max breadcrumbs per event                                                                        |

### Environment Variables

| Variable             | Maps to         | Notes                                             |
| -------------------- | --------------- | ------------------------------------------------- |
| `SENTRY_DSN`         | `dsn`           | Used if `dsn` not passed to `init()`              |
| `SENTRY_RELEASE`     | `release`       | Also auto-detected from git SHA, Heroku, CircleCI |
| `SENTRY_ENVIRONMENT` | `environment`   | Falls back to `"production"`                      |
| `SENTRY_AUTH_TOKEN`  | CLI/source maps | For `npx @sentry/wizard@latest -i sourcemaps`     |
| `SENTRY_ORG`         | CLI/source maps | Organization slug                                 |
| `SENTRY_PROJECT`     | CLI/source maps | Project slug                                      |

### Auto-Enabled Integrations

These integrations activate automatically when their packages are detected — no `integrations: [...]` needed:

| Auto-enabled                      | Notes                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| `httpIntegration`                 | Outgoing HTTP calls via `http`/`https`/`fetch`                       |
| `expressIntegration`              | Express adapter (default NestJS)                                     |
| `nestIntegration`                 | NestJS lifecycle (middleware, guards, pipes, interceptors, handlers) |
| `onUncaughtExceptionIntegration`  | Uncaught exceptions                                                  |
| `onUnhandledRejectionIntegration` | Unhandled promise rejections                                         |
| `openAIIntegration`               | OpenAI SDK (when installed)                                          |
| `anthropicAIIntegration`          | Anthropic SDK (when installed)                                       |
| `langchainIntegration`            | LangChain (when installed)                                           |
| `graphqlIntegration`              | GraphQL (when `graphql` package present)                             |
| `postgresIntegration`             | `pg` driver                                                          |
| `mysqlIntegration`                | `mysql` / `mysql2`                                                   |
| `mongoIntegration`                | MongoDB / Mongoose                                                   |
| `redisIntegration`                | `ioredis` / `redis`                                                  |

### Integrations Requiring Manual Setup

| Integration                 | When to add                        | Code                                                                |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `nodeProfilingIntegration`  | Profiling desired                  | `import { nodeProfilingIntegration } from "@sentry/profiling-node"` |
| `prismaIntegration`         | Prisma ORM used                    | `integrations: [Sentry.prismaIntegration()]`                        |
| `consoleLoggingIntegration` | Capture console output             | `integrations: [Sentry.consoleLoggingIntegration()]`                |
| `localVariablesIntegration` | Capture local var values in errors | `integrations: [Sentry.localVariablesIntegration()]`                |

---

## Verification

Test that Sentry is receiving events:

```typescript
// Add a test endpoint (remove before production)
@Get("/debug-sentry")
getError() {
  throw new Error("My first Sentry error!");
}
```

Or send a test message without crashing:

```typescript
import * as Sentry from "@sentry/nestjs";
Sentry.captureMessage("NestJS Sentry SDK test");
```

If nothing appears:

1. Set `debug: true` in `Sentry.init()` — prints SDK internals to stdout
2. Verify `SENTRY_DSN` env var is set in the running process
3. Check that `import "./instrument"` is the **first line** in `main.ts`
4. Confirm `SentryModule.forRoot()` is imported in `AppModule`
5. Check DSN format: `https://<key>@o<org>.ingest.sentry.io/<project>`

---

## Phase 4: Cross-Link

After completing NestJS setup, check for a companion frontend missing Sentry:

```bash
ls -d ../frontend ../web ../client ../ui 2>/dev/null
cat ../frontend/package.json ../web/package.json 2>/dev/null \
  | grep -E '"react"|"svelte"|"vue"|"next"|"nuxt"'
```

If a frontend exists without Sentry, suggest the matching skill:

| Frontend detected   | Suggest skill                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Next.js             | `sentry-nextjs-sdk`                                                                                                                |
| React               | `sentry-react-sdk`                                                                                                                 |
| Svelte / SvelteKit  | `sentry-svelte-sdk`                                                                                                                |
| Vue / Nuxt          | Use `@sentry/vue` — see [docs.sentry.io/platforms/javascript/guides/vue/](https://docs.sentry.io/platforms/javascript/guides/vue/) |
| React Native / Expo | `sentry-react-native-sdk`                                                                                                          |

---

## Troubleshooting

| Issue                                              | Solution                                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events not appearing                               | Set `debug: true`, verify `SENTRY_DSN`, check `instrument.ts` is imported first                                                                               |
| Malformed DSN error                                | Format: `https://<key>@o<org>.ingest.sentry.io/<project>`                                                                                                     |
| Exceptions not captured                            | Ensure `SentryGlobalFilter` is registered via `APP_FILTER` in `AppModule`                                                                                     |
| Auto-instrumentation not working                   | `instrument.ts` must be the **first import** in `main.ts` — before all NestJS imports                                                                         |
| Profiling not starting                             | Requires `tracesSampleRate > 0` + `profileSessionSampleRate > 0` + `@sentry/profiling-node` installed                                                         |
| `enableLogs` not working                           | Requires SDK ≥ 9.41.0                                                                                                                                         |
| No traces appearing                                | Verify `tracesSampleRate` is set (not `undefined`)                                                                                                            |
| Too many transactions                              | Lower `tracesSampleRate` or use `tracesSampler` to drop health checks                                                                                         |
| Fastify + GraphQL issues                           | Known edge cases — see [GitHub #13388](https://github.com/getsentry/sentry-javascript/issues/13388); prefer Express for GraphQL                               |
| Background job events mixed                        | Wrap job body in `Sentry.withIsolationScope(() => { ... })`                                                                                                   |
| Prisma spans missing                               | Add `integrations: [Sentry.prismaIntegration()]` to `Sentry.init()`                                                                                           |
| ESM syntax errors                                  | Set `registerEsmLoaderHooks: false` (disables ESM hooks; also disables auto-instrumentation for ESM modules)                                                  |
| `SentryModule` breaks instrumentation              | Must import from `@sentry/nestjs/setup`, never from `@sentry/nestjs`                                                                                          |
| RPC exceptions not captured                        | Add dedicated `SentryRpcExceptionFilter` (see Option D in exception filter section)                                                                           |
| WebSocket exceptions not captured                  | Use `@SentryExceptionCaptured()` on gateway `handleConnection`/`handleDisconnect`                                                                             |
| `@SentryCron` not triggering                       | Decorator order matters — `@SentryCron` MUST come after `@Cron`                                                                                               |
| TypeScript path alias issues                       | Ensure `tsconfig.json` `paths` are configured so `instrument` resolves from `main.ts` location                                                                |
| `import * as Sentry` ESLint error                  | Many projects ban namespace imports. Use named imports (`import { startSpan, captureException } from "@sentry/nestjs"`) or use the project's DI proxy instead |
| `profilesSampleRate` vs `profileSessionSampleRate` | `profilesSampleRate` is deprecated in SDK 10.x. Use `profileSessionSampleRate` + `profileLifecycle: "trace"` instead                                          |
| Duplicate spans on every request                   | `SentryModule.forRoot()` registered in multiple modules. Ensure it's only called once — check shared/library modules                                          |
| Config property not recognized in `instrument.ts`  | When using a typed config class, new SDK options must be added to the config type definition and the project rebuilt before TypeScript recognizes them        |

### Version Requirements

| Feature                            | Minimum SDK Version |
| ---------------------------------- | ------------------- |
| `@sentry/nestjs` package           | 8.0.0               |
| `@SentryTraced` decorator          | 8.15.0              |
| `@SentryCron` decorator            | 8.16.0              |
| Event Emitter auto-instrumentation | 8.39.0              |
| `SentryGlobalFilter` (unified)     | 8.40.0              |
| `Sentry.logger` API (`enableLogs`) | 9.41.0              |
| `profileSessionSampleRate`         | 10.27.0             |
| Node.js requirement                | ≥ 18                |
| Node.js for ESM `--import`         | ≥ 18.19.0           |
| NestJS compatibility               | 8.x – 11.x          |
