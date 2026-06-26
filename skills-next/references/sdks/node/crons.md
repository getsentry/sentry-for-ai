# Crons / Job Monitoring — Sentry Node.js SDK

> Minimum SDK: `@sentry/node` ≥7.51.1 (`captureCheckIn`, `withMonitor`)  
> `instrumentNodeCron` / `instrumentCron`: ≥7.92.0  
> `instrumentNodeSchedule`: ≥7.93.0  
> `failureIssueThreshold` / `recoveryThreshold`: ≥8.7.0  
> `isolateTrace` in `MonitorConfig`: ≥10.28.0  
> Status: ✅ **Generally Available**

---

## Overview

Sentry Crons (job monitoring) tracks whether scheduled tasks run on time, succeed, and complete within expected durations. Sentry will alert when a job:
- Misses its scheduled start time (checkin margin exceeded)
- Takes too long to complete (maxRuntime exceeded)
- Fails (status `"error"`)

---

## Core API

### `Sentry.captureCheckIn(checkIn, monitorConfig?)` → `string`

```typescript
// Three check-in shapes:

// 1. Heartbeat — single-shot, no duration tracking
Sentry.captureCheckIn({ monitorSlug: "my-job", status: "ok" });
Sentry.captureCheckIn({ monitorSlug: "my-job", status: "error" });

// 2. In-progress — signals job started, returns ID for completion
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "my-job",
  status: "in_progress",
});

// 3. Finished — completes an in-progress check-in
Sentry.captureCheckIn({
  checkInId,
  monitorSlug: "my-job",
  status: "ok",          // or "error"
  duration: 12.3,        // optional, in seconds
});
```

### `Sentry.withMonitor(slug, callback, monitorConfig?)` → `T`

Wraps a sync or async function. Automatically sends `in_progress`, then `ok` on success or `error` on throw. Records duration automatically.

```typescript
// Simple form
await Sentry.withMonitor("my-job", async () => {
  await runJob();
});

// With monitor config
await Sentry.withMonitor("my-job", async () => {
  await runJob();
}, {
  schedule: { type: "crontab", value: "0 * * * *" },
  checkinMargin: 5,
  maxRuntime: 30,
  timezone: "America/New_York",
});
```

---

## Check-In Status Values

| Status        | Meaning                                           |
|---------------|---------------------------------------------------|
| `"in_progress"` | Job has started; Sentry waiting for completion  |
| `"ok"`          | Job completed successfully                      |
| `"error"`       | Job failed; triggers incident in Sentry         |

---

## Usage Patterns

### Heartbeat (simplest — detect missed runs only)

```typescript
try {
  await runMyJob();
  Sentry.captureCheckIn({ monitorSlug: "my-cron-job", status: "ok" });
} catch (err) {
  Sentry.captureCheckIn({ monitorSlug: "my-cron-job", status: "error" });
  throw err;
}
```

### Start/Finish (tracks in-progress state and duration)

```typescript
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "my-cron-job",
  status: "in_progress",
});

const startTime = Date.now();

try {
  await runMyJob();
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "my-cron-job",
    status: "ok",
    duration: (Date.now() - startTime) / 1000,  // seconds
  });
} catch (err) {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "my-cron-job",
    status: "error",
    duration: (Date.now() - startTime) / 1000,
  });
  throw err;
}
```

### `withMonitor` (recommended — handles all status logic)

```typescript
await Sentry.withMonitor("my-cron-job", async () => {
  await runMyJob();
});
```

---

## Monitor Configuration (Upsert)

Pass a `MonitorConfig` to create or update the monitor from code — no manual setup in Sentry UI needed. On first check-in the monitor is created; subsequent calls update it.

```typescript
interface MonitorConfig {
  schedule: CrontabSchedule | IntervalSchedule;  // REQUIRED
  checkinMargin?: number;          // minutes: grace period before "missed" alert
  maxRuntime?: number;             // minutes: max execution before timeout alert
  timezone?: string;               // IANA timezone, e.g. "America/New_York"
  failureIssueThreshold?: number;  // consecutive failures before creating issue (≥8.7.0)
  recoveryThreshold?: number;      // consecutive OKs before resolving issue (≥8.7.0)
  isolateTrace?: boolean;          // new trace per monitor run (≥10.28.0)
}
```

Pass as the **second argument** to `captureCheckIn()` or **third argument** to `withMonitor()`.

---

## Schedule Types

**Crontab schedule:**

```typescript
{ type: "crontab", value: "* * * * *" }          // every minute
{ type: "crontab", value: "0 * * * *" }          // every hour
{ type: "crontab", value: "0 4 * * *" }          // daily at 4:00am
{ type: "crontab", value: "0 9 * * MON-FRI" }    // weekdays at 9am
{ type: "crontab", value: "0 0 1 * *" }          // first of every month
{ type: "crontab", value: "*/15 * * * *" }       // every 15 minutes
```

**Interval schedule:**

```typescript
{ type: "interval", value: 1,  unit: "hour" }
{ type: "interval", value: 30, unit: "minute" }
{ type: "interval", value: 7,  unit: "day" }
{ type: "interval", value: 1,  unit: "week" }
// unit: "year" | "month" | "week" | "day" | "hour" | "minute"
```

---

## Full Upsert Example

```typescript
const monitorConfig: Sentry.MonitorConfig = {
  schedule: {
    type: "crontab",
    value: "0 4 * * *",           // daily at 4am
  },
  checkinMargin: 5,               // alert if not started within 5 min
  maxRuntime: 30,                 // alert if running > 30 min
  timezone: "America/New_York",
  failureIssueThreshold: 3,       // create issue after 3 consecutive failures
  recoveryThreshold: 2,           // resolve issue after 2 consecutive successes
  isolateTrace: true,             // SDK ≥10.28.0
};

await Sentry.withMonitor("daily-report-job", generateDailyReport, monitorConfig);
```

---

## Scheduler Library Integrations

### `node-cron` (SDK ≥7.92.0)

```typescript
import cron from "node-cron";
import * as Sentry from "@sentry/node";

const cronWithCheckIn = Sentry.cron.instrumentNodeCron(cron);

// `name` option is REQUIRED — becomes the monitor slug
cronWithCheckIn.schedule(
  "* * * * *",
  () => { /* task */ },
  { name: "my-cron-job" },
);
```

### `cron` package — `CronJob` (SDK ≥7.92.0)

```typescript
import { CronJob } from "cron";
import * as Sentry from "@sentry/node";

// Monitor slug is bound at instrumentation time
const CronJobWithCheckIn = Sentry.cron.instrumentCron(CronJob, "my-cron-job");

// Constructor form
const job = new CronJobWithCheckIn("* * * * *", () => { /* task */ });

// Static factory form
const job2 = CronJobWithCheckIn.from({
  cronTime: "* * * * *",
  onTick: () => { /* task */ },
});
```

### `node-schedule` (SDK ≥7.93.0)

```typescript
import * as schedule from "node-schedule";
import * as Sentry from "@sentry/node";

const scheduleWithCheckIn = Sentry.cron.instrumentNodeSchedule(schedule);

// First argument must be the job name (monitor slug)
scheduleWithCheckIn.scheduleJob(
  "my-cron-job",      // monitor slug — REQUIRED as first arg
  "* * * * *",        // cron expression
  () => { /* task */ },
);
```

### Agenda (no official helper — use `withMonitor`)

```typescript
import Agenda from "agenda";
import * as Sentry from "@sentry/node";

const agenda = new Agenda({ db: { address: "mongodb://localhost/agenda" } });

agenda.define("send-newsletter", async (job) => {
  await Sentry.withMonitor(
    "send-newsletter",
    async () => { await sendNewsletterEmails(); },
    {
      schedule: { type: "crontab", value: "0 8 * * MON" },
      maxRuntime: 60,
      timezone: "UTC",
    },
  );
});
```

### Bull / BullMQ (no official helper — use `withMonitor`)

```typescript
import { Worker } from "bullmq";
import * as Sentry from "@sentry/node";

const worker = new Worker("report-queue", async (job) => {
  await Sentry.withMonitor(
    "report-queue-processor",
    async () => { await processReportJob(job.data); },
    {
      schedule: { type: "interval", value: 5, unit: "minute" },
      maxRuntime: 10,
      checkinMargin: 2,
    },
  );
});
```

---

## Library Integration Signatures

```typescript
// node-cron
function instrumentNodeCron<T>(
  lib: Partial<NodeCron> & T,
  monitorConfig?: Pick<MonitorConfig, "isolateTrace">,
): T;

// cron package
function instrumentCron<T>(
  lib: T & CronJobConstructor,
  monitorSlug: string,    // REQUIRED — single slug for all jobs from this constructor
): T;

// node-schedule
function instrumentNodeSchedule<T>(
  lib: T & NodeSchedule,
): T;
```

---

## Serverless / Lambda

Check-ins are lost if the process terminates before flush. Always flush explicitly:

```typescript
export const handler = async (event: any) => {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "lambda-scheduled-job",
    status: "in_progress",
  });

  try {
    await doWork(event);
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "lambda-scheduled-job",
      status: "ok",
    });
  } catch (err) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "lambda-scheduled-job",
      status: "error",
    });
    throw err;
  } finally {
    // CRITICAL — flush before Lambda container freezes
    await Sentry.flush(2000);
  }
};
```

For AWS Lambda, prefer `@sentry/aws-serverless` — it handles flushing automatically.

---

## Deno: Native Cron Integration

Deno provides a built-in `Deno.cron()` API. Use `denoCronIntegration` to automatically monitor all native Deno crons:

```typescript
import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  integrations: [
    Sentry.denoCronIntegration(),
  ],
});

// Automatically monitored — no manual check-ins needed
Deno.cron("daily-cleanup", "0 0 * * *", async () => {
  await cleanupOldRecords();
});

Deno.cron("hourly-sync", "0 * * * *", async () => {
  await syncExternalData();
});
```

The integration intercepts `Deno.cron()` calls and wraps them with automatic `in_progress` → `ok`/`error` check-ins. The monitor slug is the first argument to `Deno.cron()`.

> **Deno Deploy:** `Deno.cron()` runs natively on Deno Deploy. The integration works in both local Deno and Deno Deploy environments.

> **Node.js and Bun:** `denoCronIntegration` is only available in `@sentry/deno`. For Node.js, use the `node-cron`, `cron`, or `node-schedule` library helpers above.

---

## Rate Limits

- Maximum **6 check-ins per minute** per monitor + environment combination
- Each environment (production, staging, etc.) counts separately
- Dropped check-ins appear in Sentry's Usage Stats page

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Monitor not created in Sentry | No `MonitorConfig` passed | Pass `schedule` in `monitorConfig` (upsert) |
| Check-ins not arriving | Process exits before flush | Add `await Sentry.flush(2000)` before exit |
| `withMonitor` status wrong | Callback doesn't throw on failure | Ensure your job throws on error |
| `node-cron` job not tracked | Missing `name` option | Add `{ name: "slug" }` to `cron.schedule()` options |
| `instrumentNodeSchedule` slug not set | First arg is cron expression | First arg to `scheduleJob()` must be the job name |
| `instrumentCron` tracking wrong job | Multiple jobs from one constructor | Each constructor call is for one slug; create multiple if needed |
| Duration always `undefined` | Using heartbeat pattern | Switch to start/finish or `withMonitor` for duration tracking |
| Missing `failureIssueThreshold` | SDK < 8.7.0 | Upgrade to ≥8.7.0 |
| `isolateTrace` not recognized | SDK < 10.28.0 | Upgrade to ≥10.28.0 |
| Rate limit errors in logs | > 6 check-ins/min per monitor | Reduce check-in frequency or consolidate environments |
