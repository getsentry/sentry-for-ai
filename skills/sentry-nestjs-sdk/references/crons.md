# Crons — Sentry NestJS SDK

> Minimum SDK: `@sentry/nestjs` 8.16.0+ for `@SentryCron` decorator; 7.76.0+ for `withMonitor()`

## Overview

Sentry Crons monitors scheduled jobs by receiving check-ins at job start, success, and failure. Three approaches:

| Approach | Use when |
|----------|---------|
| `@SentryCron` decorator | NestJS `@Cron` scheduled tasks — zero boilerplate |
| `Sentry.withMonitor()` | Manual wrapping — Bull/BullMQ processors, arbitrary functions |
| `Sentry.captureCheckIn()` | Full control — heartbeats, conditional status, or two-step patterns |

## Prerequisites

Install the NestJS scheduler package:

```bash
npm install --save @nestjs/schedule
```

Register the module in your app:

```typescript
// app.module.ts
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
})
export class AppModule {}
```

## Code Examples

### `@SentryCron` decorator with `@Cron`

`@SentryCron` must be placed **after** `@Cron` in the decorator stack (closer to the method).

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SentryCron, MonitorConfig } from "@sentry/nestjs";
import type { MonitorConfig } from "@sentry/core";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron("0 2 * * *")
  @SentryCron("nightly-report")   // slug only — monitor must exist in Sentry UI
  async handleNightlyReport() {
    this.logger.log("Running nightly report...");
    await generateReport();
  }
}
```

### `@SentryCron` with `MonitorConfig` — upsert monitor definition (SDK 8.16.0+)

Supply `monitorConfig` to create or update the monitor automatically on first execution — no Sentry UI setup needed.

```typescript
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SentryCron } from "@sentry/nestjs";
import type { MonitorConfig } from "@sentry/core";

const monitorConfig: MonitorConfig = {
  schedule: {
    type: "crontab",
    value: "0 2 * * *",
  },
  timezone: "Europe/Vienna",
  checkinMargin: 10,       // minutes late before MISSED alert
  maxRuntime: 30,          // minutes after IN_PROGRESS before TIMEOUT
  failureIssueThreshold: 3,
  recoveryThreshold: 3,
};

@Injectable()
export class TasksService {
  @Cron("0 2 * * *")
  @SentryCron("nightly-report", monitorConfig)
  async handleNightlyReport() {
    await generateReport();
  }
}
```

### Interval schedule

```typescript
import { MonitorConfig } from "@sentry/core";

const syncConfig: MonitorConfig = {
  schedule: {
    type: "interval",
    value: 2,
    unit: "hour",   // minute | hour | day | week | month | year
  },
  checkinMargin: 5,
  maxRuntime: 20,
};

@Injectable()
export class SyncService {
  @Cron("0 */2 * * *")
  @SentryCron("data-sync", syncConfig)
  async handleSync() {
    await syncData();
  }
}
```

### Manual wrapping with `Sentry.withMonitor()`

Use for Bull/BullMQ processors or any function outside of `@nestjs/schedule`.

```typescript
import * as Sentry from "@sentry/nestjs";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("reports")
export class ReportProcessor extends WorkerHost {
  async process(job: Job) {
    return Sentry.withMonitor(
      "report-queue-processor",
      async () => {
        await generateReport(job.data);
      },
      {
        schedule: { type: "crontab", value: "0 3 * * *" },
        timezone: "UTC",
        checkinMargin: 5,
        maxRuntime: 60,
      },
    );
  }
}
```

### Manual check-ins with `captureCheckIn()`

For full control over timing, status, or heartbeat patterns.

```typescript
import * as Sentry from "@sentry/nestjs";

async function runLongJob() {
  // 1. Signal job started
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug: "data-pipeline",
      status: "in_progress",
    },
    {
      schedule: { type: "crontab", value: "0 4 * * *" },
      maxRuntime: 120,
    },
  );

  try {
    await processData();

    // 2a. Signal success
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "data-pipeline",
      status: "ok",
    });
  } catch (err) {
    // 2b. Signal failure
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "data-pipeline",
      status: "error",
    });
    throw err;
  }
}
```

### Heartbeat pattern for long-running jobs

Send periodic `in_progress` check-ins to prevent premature TIMEOUT alerts.

```typescript
import * as Sentry from "@sentry/nestjs";

async function runBatchJob(batches: Batch[]) {
  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: "batch-processor", status: "in_progress" },
    { schedule: { type: "crontab", value: "0 1 * * *" }, maxRuntime: 240 },
  );

  try {
    for (const batch of batches) {
      await processBatch(batch);

      // Send heartbeat to reset TIMEOUT timer
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: "batch-processor",
        status: "in_progress",
      });
    }

    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "batch-processor",
      status: "ok",
    });
  } catch (err) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "batch-processor",
      status: "error",
    });
    throw err;
  }
}
```

## `MonitorConfig` Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schedule` | `object` | ✅ | `{ type: "crontab", value: "* * * * *" }` or `{ type: "interval", value: N, unit: "..." }` |
| `timezone` | `string` | No | IANA timezone name, default `"UTC"` |
| `checkinMargin` | `number` | No | Minutes late before MISSED alert |
| `maxRuntime` | `number` | No | Minutes after `in_progress` before TIMEOUT |
| `failureIssueThreshold` | `number` | No | Consecutive failures before opening an issue |
| `recoveryThreshold` | `number` | No | Consecutive successes to resolve an issue |

## Best Practices

- Supply `monitorConfig` in `@SentryCron` or `withMonitor()` so monitors are created automatically — no Sentry UI setup needed
- Decorator order matters: `@Cron` must come **before** `@SentryCron` (farther from the method)
- For Bull/BullMQ processors, auto-instrumentation is not supported — use `withMonitor()` instead
- Send `in_progress` before starting work so TIMEOUT detection begins immediately
- For jobs longer than `maxRuntime`, send periodic `in_progress` heartbeats to reset the timer
- Sentry enforces a rate limit of **6 check-ins/minute per monitor-environment** — excess are dropped silently

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor not created in Sentry | Provide `monitorConfig` — monitors are not auto-created without it |
| Decorator has no effect | Ensure `@SentryCron` is **below** `@Cron` in the decorator stack |
| MISSED alerts firing too early | Increase `checkinMargin` to allow for startup latency |
| TIMEOUT alerts on slow jobs | Increase `maxRuntime` or send periodic `in_progress` heartbeats |
| Bull/BullMQ check-ins not working | Auto-instrumentation not supported — wrap with `Sentry.withMonitor()` |
| `@SentryCron` import missing | Import from `@sentry/nestjs`; `MonitorConfig` type from `@sentry/core` |
