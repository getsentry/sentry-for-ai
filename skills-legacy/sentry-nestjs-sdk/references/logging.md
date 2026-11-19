# Logging — Sentry NestJS SDK

> Minimum SDK: `@sentry/nestjs` 9.41.0+ for structured Sentry Logs (`enableLogs: true`)

## Two Logging Systems

| System | Produces | Requires |
|--------|----------|---------|
| **Sentry Structured Logs** | Searchable log records in Sentry Logs UI | `enableLogs: true` + `Sentry.logger.*` |
| **Framework integrations** | Bridge NestJS/Pino/Winston logs to Sentry Logs | Integration-specific setup |

## Configuration

```typescript
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "https://<key>@<org>.ingest.sentry.io/<project>",
  enableLogs: true, // required — without this, all Sentry.logger.* calls are no-ops
});
```

## Code Examples

### Sentry Structured Logs — direct API

```typescript
import * as Sentry from "@sentry/nestjs";

// All six log levels
Sentry.logger.trace("Starting database connection {database}", { database: "users" });
Sentry.logger.debug("Cache miss for user {userId}", { userId: 123 });
Sentry.logger.info("User signed in");
Sentry.logger.warn("Rate limit reached for endpoint {endpoint}", { endpoint: "/api/results" });
Sentry.logger.error("Failed to process payment for order {orderId}", { orderId: "or_2342" });
Sentry.logger.fatal("Database {database} connection pool exhausted", { database: "users" });
```

**Available levels:** `trace`, `debug`, `info`, `warn`, `error`, `fatal`

### Tagged template for parameterized messages

Use `Sentry.logger.fmt` to create structured, searchable messages where each placeholder becomes an individually queryable attribute in the Sentry Logs UI:

```typescript
import * as Sentry from "@sentry/nestjs";

Sentry.logger.info(Sentry.logger.fmt`User ${"userId"} signed in from ${"region"}`, {
  userId: 42,
  region: "eu-west-1",
});
```

### NestJS ConsoleLogger integration

To route NestJS's built-in `ConsoleLogger` output to Sentry Logs, use `consoleLoggingIntegration` with `forceConsole: true`:

```typescript
import * as Sentry from "@sentry/nestjs";
import { consoleLoggingIntegration } from "@sentry/nestjs";

Sentry.init({
  dsn: "...",
  enableLogs: true,
  integrations: [
    consoleLoggingIntegration({ forceConsole: true }),
  ],
});
```

Then use NestJS's built-in logger as usual — all output is captured:

```typescript
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  doSomething() {
    this.logger.log("Processing request");      // → Sentry Logs: info
    this.logger.warn("Unusual payload size");   // → Sentry Logs: warn
    this.logger.error("Payment failed");        // → Sentry Logs: error
  }
}
```

### Pino integration (SDK 10.18.0+)

```bash
npm install pino
```

```typescript
import * as Sentry from "@sentry/nestjs";
import { pinoIntegration } from "@sentry/nestjs";

Sentry.init({
  dsn: "...",
  enableLogs: true,
  integrations: [pinoIntegration()],
});
```

### Winston integration

```bash
npm install winston
```

```typescript
import * as Sentry from "@sentry/nestjs";
import { createSentryWinstonTransport } from "@sentry/nestjs";
import winston from "winston";

Sentry.init({ dsn: "...", enableLogs: true });

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    createSentryWinstonTransport({ minLevel: "info" }),
  ],
});
```

> **Bunyan is not supported.** Use Pino or Winston if you need a framework logger bridge.

### `beforeSendLog` hook — filter and sanitize

```typescript
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "...",
  enableLogs: true,
  beforeSendLog(log) {
    // Drop debug logs to reduce volume
    if (log.level === "debug") return null;

    // Redact sensitive fields
    if (log.attributes?.["user.email"]) {
      log.attributes["user.email"] = "[redacted]";
    }

    return log;
  },
});
```

## Log-to-Trace Correlation

Log entries are automatically correlated to the active trace — no configuration required. When a log is emitted inside an instrumented request or span, Sentry links it to the corresponding transaction in the Traces UI.

## Decision Table

| Goal | Tool |
|------|------|
| Searchable structured records in Sentry Logs UI | `Sentry.logger.*` + `enableLogs: true` |
| Bridge NestJS `ConsoleLogger` to Sentry Logs | `consoleLoggingIntegration({ forceConsole: true })` |
| Bridge Pino to Sentry Logs | `pinoIntegration()` (SDK 10.18.0+) |
| Bridge Winston to Sentry Logs | `createSentryWinstonTransport()` |
| Drop or modify a log before sending | `beforeSendLog` callback |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Sentry.logger.*` calls have no effect | Ensure `enableLogs: true` is set in `Sentry.init()` |
| NestJS `ConsoleLogger` output not appearing | Add `consoleLoggingIntegration({ forceConsole: true })` |
| Pino logs not appearing | Requires `@sentry/nestjs` 10.18.0+; add `pinoIntegration()` |
| Too many log records hitting quota | Use `beforeSendLog` to filter by level or attribute |
