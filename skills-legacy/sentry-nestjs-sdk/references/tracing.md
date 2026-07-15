# Tracing — Sentry NestJS SDK

> Minimum SDK: `@sentry/nestjs` 8.x (requires Node >= 18.0.0; 18.19.0+ or 19.9.0+ recommended)

## Configuration

| Option                     | Type                   | Default     | Purpose                                                                                      |
| -------------------------- | ---------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `tracesSampleRate`         | `number`               | `undefined` | Fraction of transactions to trace (0.0–1.0); omit to disable tracing                         |
| `tracesSampler`            | `function`             | `undefined` | Per-transaction sampling function; overrides `tracesSampleRate`                              |
| `tracePropagationTargets`  | `(string \| RegExp)[]` | all origins | URLs/patterns to inject `sentry-trace` / `baggage` headers into                              |
| `profileSessionSampleRate` | `number`               | `undefined` | Fraction of **process sessions** to profile (0.0–1.0); decided once at init                  |
| `profileLifecycle`         | `'trace' \| 'manual'`  | `'trace'`   | `'trace'` = auto start/stop with spans; `'manual'` = call `startProfiler()`/`stopProfiler()` |
| `beforeSendSpan`           | `function`             | `undefined` | Callback to mutate or drop individual spans before sending                                   |
| `skipOpenTelemetrySetup`   | `boolean`              | `false`     | Skip automatic OTel provider setup (for custom OTel configurations)                          |
| `strictTraceContinuation`  | `boolean`              | `false`     | Only continue traces from same Sentry org (v10+)                                             |

## Architecture

`@sentry/nestjs` is a thin wrapper over `@sentry/node`. Its tracing stack:

```
@sentry/nestjs
  ├── Sentry.init() → auto-adds nestIntegration() to default integrations
  ├── nestIntegration() → registers 3 OTel instrumentations:
  │     ├── @opentelemetry/instrumentation-nestjs-core   → app_creation, request_context, handler spans
  │     ├── SentryNestInstrumentation                    → middleware, guard, pipe, interceptor, filter spans
  │     └── SentryNestEventInstrumentation               → @OnEvent handler spans
  ├── SentryModule.forRoot() → registers SentryTracingInterceptor globally
  ├── SentryTracingInterceptor → sets HTTP transaction names from Express/Fastify route patterns
  └── SentryGlobalFilter → captures unhandled exceptions (HTTP, GraphQL, RPC)
```

Sentry is the OpenTelemetry provider — any OTel instrumentation automatically flows into Sentry.

## Code Examples

### Enable tracing

```typescript
// instrument.ts — must be loaded FIRST in main.ts, before NestJS imports
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "https://<key>@<org>.ingest.sentry.io/<project>",
  tracesSampleRate: 1.0, // 1.0 = 100% of transactions; reduce in production
});
```

```typescript
// main.ts
import "./instrument"; // MUST be first — before @nestjs/core or any module
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts — two distinct entry points
import { Module } from "@nestjs/common";
import { SentryModule } from "@sentry/nestjs/setup"; // /setup entry point
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter } from "@sentry/nestjs/setup"; // /setup entry point

@Module({
  imports: [SentryModule.forRoot()], // registers SentryTracingInterceptor globally
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter, // captures unhandled HTTP/GraphQL/RPC exceptions
    },
  ],
})
export class AppModule {}
```

> **`@sentry/nestjs` vs `@sentry/nestjs/setup` — two separate entry points:**
>
> - `@sentry/nestjs` — `Sentry.init()`, decorators, span APIs, all `@sentry/node` re-exports
> - `@sentry/nestjs/setup` — `SentryModule`, `SentryTracingInterceptor`, `SentryGlobalFilter`

### HTTP request auto-tracing

HTTP tracing requires no extra code. Two mechanisms work together:

1. **`nestIntegration`** (via `@opentelemetry/instrumentation-nestjs-core`) creates spans:
   - `app_creation.nestjs` — NestJS bootstrap
   - `request_context.nestjs` — overall request handling
   - `handler.nestjs` — each route handler

2. **`SentryTracingInterceptor`** (registered via `SentryModule.forRoot()`) sets the transaction name from the parameterized route:
   - Express: `GET /users/:id` (from `req.route.path`)
   - Fastify: `GET /users/:id` (from `req.routeOptions.url`)

**Typical span tree for a request:**

```
GET /api/users/:id  (transaction name)
  └── request_context.nestjs
        ├── AuthGuard              (middleware.nestjs)
        ├── ParseIntPipe           (middleware.nestjs)
        ├── LoggingInterceptor     (middleware.nestjs — before route)
        │     └── handler.nestjs
        │           └── db query span (auto from pg/mysql/etc.)
        └── LoggingInterceptor - Interceptors - After Route  (middleware.nestjs)
```

> All NestJS lifecycle spans (middleware, guards, pipes, interceptors, filters) share op `middleware.nestjs`.

### `@SentryTraced` decorator

```typescript
import { SentryTraced } from "@sentry/nestjs";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrderService {
  @SentryTraced("db.query") // op="db.query", name="findOrder" (method name)
  async findOrder(id: string) {
    return this.orderRepo.findOne({ where: { id } });
  }

  @SentryTraced() // op="function" (default)
  async processOrder(data: CreateOrderDto) {
    return this.process(data);
  }
}
```

- Span `name` = method name (e.g., `"findOrder"`)
- Span `op` = decorator argument, defaults to `"function"`
- Works with both sync and async methods
- Copies `reflect-metadata` keys — NestJS DI compatibility preserved

### Custom spans with `startSpan` (auto-ends)

```typescript
import * as Sentry from "@sentry/nestjs";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PaymentService {
  async charge(userId: string, amount: number) {
    return Sentry.startSpan(
      { name: "charge-card", op: "payment.charge" },
      async (span) => {
        span.setAttribute("payment.userId", userId);
        span.setAttribute("payment.amount", amount);
        const result = await this.stripeService.charge(userId, amount);
        span.setAttribute("payment.transactionId", result.id);
        return result;
      },
    );
  }
}
```

### `startSpanManual` (callback-style, must call `span.end()`)

```typescript
return Sentry.startSpanManual(
  { name: "legacy-callback", op: "function" },
  (span) => {
    legacyLib.doWork((err, result) => {
      span.setStatus({ code: err ? 2 : 1 }); // 1=OK, 2=ERROR
      span.end();
      callback(err, result);
    });
  },
);
```

### `startInactiveSpan` (detached, no auto-parent)

```typescript
const span = Sentry.startInactiveSpan({ name: "background-index", op: "task" });
// ... do work independently ...
span.end();
```

### Span options reference

| Option             | Type                                          | Description                                                             |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------------- |
| `name`             | `string`                                      | **Required.** Span name                                                 |
| `op`               | `string`                                      | Operation type (`db`, `http.client`, `function`, `queue.process`, etc.) |
| `attributes`       | `Record<string, string \| number \| boolean>` | Key-value metadata                                                      |
| `startTime`        | `number`                                      | Custom start timestamp (Unix seconds)                                   |
| `parentSpan`       | `Span`                                        | Explicit parent (overrides auto-parent from context)                    |
| `onlyIfParent`     | `boolean`                                     | Skip creating span if no active parent exists                           |
| `forceTransaction` | `boolean`                                     | Display as root transaction in Sentry UI                                |

### Accessing and modifying the active span

```typescript
import * as Sentry from "@sentry/nestjs";

// Read active span
const span = Sentry.getActiveSpan();
if (span) {
  span.setAttribute("user.id", userId);
  span.setAttributes({ "order.type": "subscription", "order.currency": "USD" });
}

// Update span name (v8.47.0+)
if (span) Sentry.updateSpanName(span, "Refined Operation Name");

// Span status codes: 0=UNSET, 1=OK, 2=ERROR
span?.setStatus({ code: 2 });
```

### Nested spans

```typescript
return Sentry.startSpan(
  { name: "process-checkout", op: "business.logic" },
  async () => {
    const cart = await Sentry.startSpan(
      { name: "fetch-cart", op: "db.query" },
      () => this.cartRepo.findById(cartId),
    );

    await Sentry.startSpan({ name: "apply-discount", op: "function" }, () =>
      this.discountService.apply(cart),
    );

    return Sentry.startSpan({ name: "create-order", op: "db.query" }, () =>
      this.orderRepo.create(cart),
    );
  },
);
```

### Modify all spans globally (`beforeSendSpan`)

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  beforeSendSpan(span) {
    if (span.op === "db.query" && span.description?.includes("password")) {
      span.description = "[REDACTED]";
    }
    // return null to drop the span entirely
    return span;
  },
});
```

### Dynamic sampling with `tracesSampler`

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampler: ({ name, attributes, parentSampled }) => {
    // Drop health check endpoints
    if (/\/(health|ping|readiness|liveness)/.test(name)) return 0;

    // Always capture authentication flows
    if (name.includes("/auth/")) return 1;

    // Inherit parent's sampling decision (distributed tracing)
    if (parentSampled !== undefined) return parentSampled;

    // Default 10%
    return 0.1;
  },
});
```

### Event emitter auto-tracing (`@OnEvent`)

Requires `@nestjs/event-emitter` >= 2.0.0. Handlers are auto-wrapped — no code changes needed:

```typescript
import { OnEvent } from "@nestjs/event-emitter";
import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationListener {
  @OnEvent("user.created")
  async handleUserCreated(payload: UserCreatedEvent) {
    // Auto span: name="event user.created", op="event.nestjs"
    // forceTransaction: true → appears as separate root transaction in Sentry UI
    // Unhandled exceptions auto-captured (they bypass SentryGlobalFilter)
    await this.emailService.sendWelcome(payload.userId);
  }

  @OnEvent("user.created")
  @OnEvent("user.updated")
  async handleUserChange(payload: UserEvent) {
    // Span: name="event user.created|user.updated"
  }

  @OnEvent("order.*") // wildcards supported
  async handleOrder(payload: OrderEvent) {
    await this.orderService.process(payload);
  }
}
```

> **Note:** Event spans always use `forceTransaction: true` — they appear as isolated root
> transactions, not child spans of the HTTP request that emitted the event.

### GraphQL resolver tracing

GraphQL is auto-traced via `graphqlIntegration` (enabled by default). No configuration needed:

```typescript
// Spans auto-created for:
// - Query/mutation/subscription execution
// - Individual resolver fields

// SentryGlobalFilter handles GraphQL exceptions correctly:
// - HttpException → rethrown without capturing (expected)
// - All other errors → captured then rethrown (GraphQL ExternalExceptionFilter needs the rethrow)
```

### Microservices — transport support matrix

| Transport       | Auto-traced? | Mechanism                                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------------------------ |
| AMQP / RabbitMQ | ✅           | `amqplibIntegration` — `amqp.publish` + `amqp.process` spans, headers auto-injected        |
| Kafka (KafkaJS) | ✅           | `kafkaIntegration` — `kafka.send` + `kafka.process` spans, trace context in record headers |
| Redis pub/sub   | ⚠️ Partial   | `redisIntegration` traces Redis commands only                                              |
| TCP             | ❌           | No OTel instrumentation                                                                    |
| NATS            | ❌           | Community OTel NATS package needed                                                         |
| gRPC            | ❌           | Community OTel gRPC package needed                                                         |

### WebSocket gateway tracing (manual)

No dedicated WebSocket auto-tracing exists. `SentryTracingInterceptor` only handles HTTP contexts:

```typescript
import {
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
} from "@nestjs/websockets";
import * as Sentry from "@sentry/nestjs";

@WebSocketGateway(3001)
export class ChatGateway {
  @SubscribeMessage("message")
  async handleMessage(@MessageBody() payload: { data: any; _sentry?: any }) {
    const { sentryTrace, baggage } = payload._sentry ?? {};

    return Sentry.continueTrace({ sentryTrace, baggage }, () =>
      Sentry.startSpan(
        {
          name: "ws.chat.message",
          op: "websocket.server",
          forceTransaction: true,
        },
        async () => this.chatService.process(payload.data),
      ),
    );
  }
}

// Client: attach trace context to every message
const traceData = Sentry.getTraceData();
socket.emit("message", {
  data: payload,
  _sentry: {
    sentryTrace: traceData["sentry-trace"],
    baggage: traceData["baggage"],
  },
});
```

### Bull/BullMQ job tracing (manual)

No dedicated Bull integration — use manual spans in `@Process()` handlers. Always wrap with `withIsolationScope` to prevent scope leakage between concurrent jobs.

#### BullMQ with `WorkerHost` (recommended for `@nestjs/bullmq`)

```typescript
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import * as Sentry from "@sentry/nestjs";

@Processor("email")
export class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    return Sentry.withIsolationScope(() =>
      Sentry.startSpan(
        {
          name: `email ${job.name}`,
          op: "queue.process",
          forceTransaction: true,
          attributes: {
            "messaging.system": "bullmq",
            "messaging.destination": "email",
            "messaging.message.id": job.id ?? "unknown",
            "job.name": job.name,
            "job.attemptsMade": job.attemptsMade,
          },
        },
        async () => {
          await this.emailService.sendWelcomeEmail(job.data.userId);
        },
      ),
    );
  }
}
```

> **Why `withIsolationScope`?** BullMQ processes jobs concurrently in the same process. Without isolation, `setTag`, `setUser`, and breadcrumbs leak between concurrent jobs.

#### Bull with `@Process()` decorator

```typescript
import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import * as Sentry from "@sentry/nestjs";

@Processor("email")
export class EmailProcessor {
  @Process("send-welcome")
  async handle(job: Job<{ userId: string; _sentry?: Record<string, string> }>) {
    const { _sentry, ...data } = job.data;

    return Sentry.withIsolationScope(() =>
      Sentry.continueTrace(
        {
          sentryTrace: _sentry?.["sentry-trace"],
          baggage: _sentry?.["baggage"],
        },
        () =>
          Sentry.startSpan(
            {
              name: "email.send-welcome",
              op: "queue.process",
              forceTransaction: true,
            },
            async (span) => {
              span.setAttribute("job.id", job.id.toString());
              span.setAttribute("job.attemptsMade", job.attemptsMade);
              await this.emailService.sendWelcomeEmail(data.userId);
            },
          ),
      ),
    );
  }
}
```

#### Publisher — attach trace context to job data

```typescript
async queueWelcomeEmail(userId: string) {
  return Sentry.startSpan({ name: "email.queue", op: "queue.publish" }, () => {
    const traceData = Sentry.getTraceData();
    return this.emailQueue.add("send-welcome", { userId, _sentry: traceData });
  });
}
```

### Kafka / NATS microservice handler tracing

Kafka messages are auto-instrumented by `kafkaIntegration` (KafkaJS), but NATS and other transports require manual spans. For consistency, wrapping `@EventPattern()` and `@MessagePattern()` handlers with explicit spans is recommended for all transports:

```typescript
import { Controller } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import * as Sentry from "@sentry/nestjs";

@Controller()
export class OrderController {
  @EventPattern("order.created")
  async handleOrderCreated(@Payload() data: OrderEvent) {
    return Sentry.startSpan(
      { name: "handleOrderCreated", op: "kafka", forceTransaction: true },
      async () => {
        await this.orderService.processCreated(data);
      },
    );
  }

  @MessagePattern("order.get")
  async getOrder(@Payload() data: { id: string }) {
    return Sentry.startSpan({ name: "getOrder", op: "rpc" }, async () => {
      return this.orderService.findById(data.id);
    });
  }
}
```

> Use `forceTransaction: true` for event handlers that should appear as root transactions in Sentry UI.

### Distributed tracing between services

HTTP services propagate `sentry-trace` and `baggage` headers automatically. For custom channels:

```typescript
// Service A — publish with trace context
async sendToQueue(data: any) {
  return Sentry.startSpan({ name: "queue.publish", op: "queue.publish" }, () => {
    const traceData = Sentry.getTraceData();
    return this.queue.send({
      payload: data,
      headers: {
        "sentry-trace": traceData["sentry-trace"],
        "baggage": traceData["baggage"],
      },
    });
  });
}

// Service B — continue trace from received message
async handleMessage(message: any) {
  return Sentry.continueTrace(
    {
      sentryTrace: message.headers["sentry-trace"],
      baggage: message.headers["baggage"],
    },
    () => Sentry.startSpan(
      { name: "queue.process", op: "queue.process" },
      () => this.processPayload(message.payload)
    )
  );
}
```

### Limit trace propagation targets

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracePropagationTargets: [
    "localhost",
    "https://api.internal.example.com",
    /^https:\/\/microservice-[a-z]+\.internal\./,
    // tracePropagationTargets: []  → disable outgoing propagation entirely
  ],
});
```

### Database auto-instrumentation

| Driver / ORM         | Auto-enabled | Notes                                                                              |
| -------------------- | ------------ | ---------------------------------------------------------------------------------- |
| PostgreSQL (`pg`)    | ✅           | `postgresIntegration`                                                              |
| MySQL                | ✅           | `mysqlIntegration`                                                                 |
| MySQL2               | ✅           | `mysql2Integration`                                                                |
| MongoDB              | ✅           | `mongoIntegration`                                                                 |
| Mongoose             | ✅           | `mongooseIntegration`                                                              |
| Prisma               | ⚠️ Manual    | `prismaIntegration` — add explicitly: `integrations: [Sentry.prismaIntegration()]` |
| SQL Server (Tedious) | ✅           | `tediousIntegration`                                                               |
| Knex                 | ❌           | Must add manually                                                                  |
| TypeORM              | ❌           | Use `opentelemetry-instrumentation-typeorm` community package                      |
| Sequelize            | ❌           | No known integration                                                               |

```typescript
// Knex — must add explicitly:
import { knexIntegration } from "@sentry/node";
Sentry.init({ dsn: "YOUR_DSN", integrations: [knexIntegration()] });
```

### Redis auto-instrumentation

`redisIntegration` is auto-enabled — traces all `ioredis` and `node-redis` commands:

```
name: "SET user:123"   op: "db.redis"
name: "GET session:abc"   op: "db.redis"
```

No configuration needed.

### Using OTel APIs directly

Since Sentry is the OTel provider, OTel spans automatically appear in Sentry:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("my-service", "1.0.0");

tracer.startActiveSpan("process-event", (span) => {
  try {
    processEvent();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (e) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw e;
  } finally {
    span.end();
  }
});
// → Appears in Sentry automatically, no extra config
```

Third-party OTel instrumentations also work without any Sentry-specific setup:

```typescript
// e.g., community TypeORM OTel instrumentation
import "opentelemetry-instrumentation-typeorm";
// → TypeORM query spans appear in Sentry automatically
```

### Disable or customize integrations

```typescript
Sentry.init({
  // Disable a specific integration:
  integrations: (defaults) => defaults.filter((i) => i.name !== "Kafka"),
});

// Override integration config:
Sentry.init({
  integrations: [Sentry.breadcrumbsIntegration({ console: false })],
});

// Add non-default integration:
Sentry.addIntegration(Sentry.captureConsoleIntegration());

// Disable all defaults (uncommon):
Sentry.init({ defaultIntegrations: false });
```

### Profiling with `@sentry/profiling-node`

```bash
# Version must exactly match @sentry/nestjs
npm install @sentry/profiling-node
```

```typescript
// instrument.ts
import * as Sentry from "@sentry/nestjs";
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "YOUR_DSN",
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0, // profile 100% of process sessions
  profileLifecycle: "trace", // auto start/stop with spans (recommended)
});
```

| `profileLifecycle`  | Start                             | Stop                             | Use case                        |
| ------------------- | --------------------------------- | -------------------------------- | ------------------------------- |
| `"trace"` (default) | First active span                 | Last span ends                   | General profiling — zero config |
| `"manual"`          | `Sentry.profiler.startProfiler()` | `Sentry.profiler.stopProfiler()` | Targeted hot paths              |

> **`profileSessionSampleRate` is process-level** — decided once at startup, not per-request.
> Use `0.1` to profile 10% of pods in a fleet without overhead on the rest.

## Auto-Instrumented Integrations

### Framework & HTTP (all auto-enabled)

| Integration                  | What is traced                                                        |
| ---------------------------- | --------------------------------------------------------------------- |
| `nestIntegration`            | Middleware, guards, pipes, interceptors, filters, `@OnEvent` handlers |
| `httpIntegration`            | Incoming HTTP requests + outgoing `http`/`https` calls                |
| `nativeNodeFetchIntegration` | Outgoing `fetch()` calls                                              |
| `requestDataIntegration`     | HTTP request data attached to error events                            |

### Databases (all auto-enabled)

`mongoIntegration`, `mongooseIntegration`, `mysqlIntegration`, `mysql2Integration`, `postgresIntegration`, `prismaIntegration`, `tediousIntegration`

### Cache & Queues (all auto-enabled)

`redisIntegration` (ioredis + node-redis), `amqplibIntegration` (AMQP/RabbitMQ), `kafkaIntegration` (KafkaJS)

### AI / LLM (all auto-enabled)

`openAIIntegration`, `anthropicAIIntegration`, `googleGenAIIntegration`, `langChainIntegration`, `vercelAiIntegration`

### Must be added manually

`knexIntegration`, `dataloaderIntegration`, `supabaseIntegration`, `captureConsoleIntegration`

## What Is and Isn't Auto-Traced

### Auto-traced (no code changes needed)

| Feature                                            | Mechanism                                                    |
| -------------------------------------------------- | ------------------------------------------------------------ |
| HTTP requests + transaction naming                 | `nestIntegration` + `SentryTracingInterceptor`               |
| Middleware, guard, pipe, interceptor, filter spans | `SentryNestInstrumentation` (patches `@Injectable`/`@Catch`) |
| `@OnEvent` handler spans                           | `SentryNestEventInstrumentation` (patches `@OnEvent`)        |
| GraphQL queries/mutations/resolvers                | `graphqlIntegration`                                         |
| AMQP/RabbitMQ + Kafka messages                     | `amqplibIntegration` + `kafkaIntegration`                    |
| Redis, MongoDB, Mongoose, MySQL, PG                | Auto-integrations                                            |
| Outgoing HTTP (axios, fetch, http)                 | `httpIntegration` + `nativeNodeFetchIntegration`             |
| Any OTel instrumentation                           | Auto-forwarded via OTel bridge                               |

### Requires manual instrumentation

| Feature                        | API                                                                  |
| ------------------------------ | -------------------------------------------------------------------- |
| Custom business logic spans    | `Sentry.startSpan()`, `startSpanManual()`, `startInactiveSpan()`     |
| Method-level tracing           | `@SentryTraced()` decorator                                          |
| Cron job monitoring            | `@SentryCron()` decorator                                            |
| Exception filter error capture | `@SentryExceptionCaptured()` decorator                               |
| WebSocket gateway tracing      | `continueTrace()` + `startSpan()` in message handler                 |
| TCP/NATS/gRPC microservices    | Manual `startSpan()` + `continueTrace()`                             |
| Bull/BullMQ job tracing        | `withIsolationScope()` + `startSpan()` in `process()` / `@Process()` |
| Non-HTTP distributed tracing   | `getTraceData()` + `continueTrace()`                                 |
| TypeORM / Sequelize tracing    | Community OTel packages or manual spans                              |
| Node.js profiling              | `@sentry/profiling-node` + `nodeProfilingIntegration()`              |

## Best Practices

- Always import `instrument.ts` as the **very first import** in `main.ts` — before `@nestjs/core` or any app module
- Use `tracesSampler` instead of `tracesSampleRate` in production — drop health checks, adjust per-route, honour distributed decisions
- Set `tracePropagationTargets` to avoid leaking `sentry-trace` headers to third-party services
- Prefer `startSpan()` (auto-ends) over `startSpanManual()` — forgetting `span.end()` silently drops the span
- Add `sentry-trace` and `baggage` to your CORS allowlist when tracing browser-to-backend flows
- Pin `@sentry/profiling-node` to the **exact same version** as `@sentry/nestjs`
- Use `profileSessionSampleRate` to profile a fraction of pods rather than every pod — the decision is per-process, not per-request
- Always wrap background job handlers (`@Process()`, `WorkerHost.process()`, `@Cron()`, `@OnEvent()`) with `withIsolationScope()` before `startSpan()` — without isolation, concurrent jobs share scope state
- If the project uses a DI wrapper for Sentry (e.g. `SENTRY_PROXY_TOKEN`), use the injected service for `startSpan`, `captureException`, etc. — only `instrument.ts` should import `@sentry/nestjs` directly
- When using a config class for `Sentry.init()`, add new SDK options to the config type rather than hardcoding them — this keeps options configurable per environment

## Troubleshooting

| Issue                                                                  | Solution                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| No transactions appearing                                              | Verify `tracesSampleRate > 0` or `tracesSampler` returns non-zero                                   |
| Transaction names show raw URL (e.g., `/users/123`) instead of pattern | `SentryModule.forRoot()` not imported; or `instrument.ts` loaded after `@nestjs/core`               |
| Middleware/guard/pipe spans missing                                    | `nestIntegration` not registered; ensure `instrument.ts` is first import                            |
| `@OnEvent` spans not appearing                                         | `@nestjs/event-emitter` < 2.0.0; or `instrument.ts` loaded after event emitter                      |
| Distributed traces broken across services                              | Check `sentry-trace` and `baggage` headers pass through proxies/API gateways                        |
| DB spans missing                                                       | Driver loaded before `instrument.ts`; reorder imports                                               |
| Profiler crashes at startup                                            | `@sentry/profiling-node` version doesn't match `@sentry/nestjs`                                     |
| Event spans appear as isolated transactions                            | Expected — `@OnEvent` uses `forceTransaction: true` by design                                       |
| RPC exceptions not captured or app crashes                             | Use a dedicated `@Catch(RpcException)` filter; `SentryGlobalFilter` logs a warning for RPC          |
| OTel instrumentation spans not appearing                               | Ensure the OTel package is loaded after `instrument.ts`                                             |
| BullMQ jobs share tags/user/breadcrumbs                                | Wrap `process()` body with `Sentry.withIsolationScope(() => ...)`                                   |
| `profilesSampleRate` not working                                       | Deprecated in SDK 10.x — use `profileSessionSampleRate` + `profileLifecycle: "trace"`               |
| `SentryModule.forRoot()` registered twice                              | Only register once — if a shared library module already imports it, skip in `AppModule`             |
| `import * as Sentry` blocked by ESLint                                 | Use named imports or the project's DI proxy; namespace imports trigger `no-restricted-syntax` rules |
