# Crons — Sentry Next.js SDK

> Minimum SDK: `@sentry/nextjs` ≥7.51.1+ for `captureCheckIn`  
> `Sentry.withMonitor()`: ≥7.76.0+  
> Cron library auto-instrumentation: ≥7.92.0+

> ⚠️ **Server and Edge runtimes only.** Cron monitoring is not available in the browser runtime.

---

## Overview

Sentry Cron Monitoring detects:
- **Missed check-ins** — job didn't run at the expected time
- **Runtime failures** — job ran but encountered an error
- **Timeouts** — job exceeded `maxRuntime` without completing

---

## Option A: Automatic Vercel Cron Integration

For **Vercel-hosted Next.js** apps using Vercel Cron Jobs:

```javascript
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  automaticVercelMonitors: true,
});
```

> ⚠️ **Critical limitation:** `automaticVercelMonitors` only works with the **Pages Router**. **App Router route handlers are NOT yet supported** for automatic instrumentation. Use `captureCheckIn` or `withMonitor` manually for App Router cron routes.

---

## Option B: Auto-Instrumentation of Cron Libraries (SDK ≥7.92.0)

### `cron` npm package

```typescript
import { CronJob } from "cron";
import * as Sentry from "@sentry/nextjs";

const CronJobWithCheckIn = Sentry.cron.instrumentCron(CronJob, "my-cron-job");

const job = new CronJobWithCheckIn("* * * * *", () => {
  console.log("Runs every minute");
});

// Or via .from() factory:
const job2 = CronJobWithCheckIn.from({
  cronTime: "* * * * *",
  onTick: () => console.log("Runs every minute"),
});
```

### `node-cron` npm package

```typescript
import cron from "node-cron";
import * as Sentry from "@sentry/nextjs";

const cronWithCheckIn = Sentry.cron.instrumentNodeCron(cron);

cronWithCheckIn.schedule(
  "* * * * *",
  () => {
    console.log("Running every minute");
  },
  { name: "my-cron-job" }, // ← name is required for Sentry monitoring
);
```

### `node-schedule` npm package (SDK ≥7.93.0)

```typescript
import * as schedule from "node-schedule";
import * as Sentry from "@sentry/nextjs";

const scheduleWithCheckIn = Sentry.cron.instrumentNodeSchedule(schedule);

scheduleWithCheckIn.scheduleJob(
  "my-cron-job",   // ← first arg is the monitor slug
  "* * * * *",
  () => {
    console.log("Running every minute");
  },
);
```

> ⚠️ `node-schedule` instrumentation only supports **cron string format**. Date objects and RecurrenceRule objects are not supported.

---

## Option C: `Sentry.withMonitor()` Wrapper (SDK ≥7.76.0)

Wraps any callback and automatically sends `in_progress` → `ok`/`error` check-ins:

```typescript
import * as Sentry from "@sentry/nextjs";

// Basic usage — monitor must already exist in Sentry
await Sentry.withMonitor("my-monitor-slug", async () => {
  await processQueue();
});
```

### With Full Monitor Configuration (Upsert)

```typescript
await Sentry.withMonitor(
  "hourly-report-job",
  async () => {
    await generateHourlyReport();
  },
  {
    schedule: {
      type: "crontab",
      value: "0 * * * *",   // runs at top of every hour
    },
    checkinMargin: 2,        // minutes of grace before "missed"
    maxRuntime: 10,          // minutes before marking as failed
    timezone: "America/Los_Angeles",
    failureIssueThreshold: 3,   // consecutive failures before creating issue (SDK ≥8.7.0)
    recoveryThreshold: 2,        // consecutive successes before resolving issue (SDK ≥8.7.0)
  },
);
```

### Interval Schedule

```typescript
await Sentry.withMonitor(
  "data-sync-job",
  async () => {
    await syncData();
  },
  {
    schedule: {
      type: "interval",
      value: 30,         // numeric value
      unit: "minute",    // "minute" | "hour" | "day" | "week" | "month" | "year"
    },
  },
);
```

---

## Option D: Manual `Sentry.captureCheckIn()` (SDK ≥7.51.1)

For full control — send check-ins manually at job start and end:

```typescript
import * as Sentry from "@sentry/nextjs";

// 1. Signal job started — returns a checkInId for correlation
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "my-monitor-slug",
  status: "in_progress",
});

try {
  await doWork();

  // 2a. Signal success
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "my-monitor-slug",
    status: "ok",
  });
} catch (err) {
  // 2b. Signal failure
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "my-monitor-slug",
    status: "error",
  });
  throw err;
}
```

### With Upsert Config

```typescript
const checkInId = Sentry.captureCheckIn(
  {
    monitorSlug: "my-monitor-slug",
    status: "in_progress",
  },
  {
    schedule: {
      type: "crontab",
      value: "*/5 * * * *",  // every 5 minutes
    },
    checkinMargin: 1,
    maxRuntime: 5,
    timezone: "UTC",
  },
);
```

### Heartbeat Check-In (Detects Missed Jobs Only)

If you only need to know whether the job ran (not runtime failures), send a single check-in at completion:

```typescript
try {
  await doWork();
  Sentry.captureCheckIn({ monitorSlug: "my-monitor-slug", status: "ok" });
} catch (err) {
  Sentry.captureCheckIn({ monitorSlug: "my-monitor-slug", status: "error" });
}
```

---

## Using Crons with Next.js Route Handlers

For App Router cron endpoints called by Vercel Cron or an external scheduler:

```typescript
// app/api/cron/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "my-api-cron",
    status: "in_progress",
  });

  try {
    await runMyScheduledTask();

    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "my-api-cron",
      status: "ok",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "my-api-cron",
      status: "error",
    });
    throw err;
  }
}
```

### Using `withMonitor` in a Route Handler

```typescript
// app/api/cron/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  await Sentry.withMonitor(
    "my-api-cron",
    async () => {
      await runMyScheduledTask();
    },
    {
      schedule: { type: "crontab", value: "0 * * * *" },
      checkinMargin: 2,
      maxRuntime: 5,
      timezone: "UTC",
    },
  );

  return NextResponse.json({ ok: true });
}
```

### Edge Runtime Route Handler

```typescript
// app/api/cron/route.ts
export const runtime = "edge";

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  await Sentry.withMonitor("my-edge-cron", async () => {
    await runEdgeTask();
  });

  return NextResponse.json({ ok: true });
}
```

---

## Monitor Configuration Reference

Full upsert config object shape:

```typescript
interface MonitorConfig {
  schedule: {
    type: "crontab";
    value: string;       // Standard cron expression, e.g. "0 9 * * 1-5"
  } | {
    type: "interval";
    value: number;       // Numeric quantity
    unit: "minute" | "hour" | "day" | "week" | "month" | "year";
  };
  checkinMargin?: number;          // Minutes of grace period before "missed" alert
  maxRuntime?: number;             // Minutes before in-progress job is marked failed
  timezone?: string;               // IANA tz string, e.g. "America/New_York"
  failureIssueThreshold?: number;  // Consecutive failures → create issue (SDK ≥8.7.0)
  recoveryThreshold?: number;      // Consecutive successes → resolve issue (SDK ≥8.7.0)
}
```

---

## Cron Status Values

| Status | When to use |
|--------|------------|
| `in_progress` | Job has started, work is underway |
| `ok` | Job completed successfully |
| `error` | Job failed — an error occurred |

---

## Rate Limits

Cron check-ins are rate-limited to **6 check-ins per minute per monitor environment**. Each environment (production, staging, etc.) is tracked independently.

---

## Alerting

Create issue alerts filtered by the tag **`monitor.slug`** equals `[your-monitor-slug]` in Sentry's Alerts sidebar.

---

## SDK Version Matrix

| Feature | Min SDK Version |
|---------|----------------|
| `Sentry.captureCheckIn()` | **7.51.1** |
| `Sentry.withMonitor()` | **7.76.0** |
| `cron` library auto-instrumentation | **7.92.0** |
| `node-cron` auto-instrumentation | **7.92.0** |
| `node-schedule` auto-instrumentation | **7.93.0** |
| `failureIssueThreshold` / `recoveryThreshold` | **8.7.0** |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Check-ins not appearing in Sentry | Verify `monitorSlug` matches the slug configured in Sentry; check DSN is correct |
| Monitor shows "missed" despite job running | Adjust `checkinMargin` to allow more grace time; check clock skew |
| Monitor shows "timeout" | Increase `maxRuntime`; investigate why the job is taking longer than expected |
| `automaticVercelMonitors` not working | Confirm you're using Pages Router — App Router is NOT supported for automatic instrumentation |
| `withMonitor` not creating the monitor | First check-in with upsert config creates the monitor; ensure config is passed |
| Edge runtime check-ins failing | Ensure `sentry.edge.config.ts` is configured; crons work in Edge runtime |
| Client-side cron calls failing | Move cron monitoring to server/edge code — browser runtime is not supported |
| Rate limit errors on check-ins | Job is sending more than 6 check-ins/minute; reduce polling frequency or combine check-ins |
| `node-schedule` with date/RecurrenceRule | Only cron string format is supported for auto-instrumentation; use `withMonitor` instead |
