# Crons / Job Monitoring — Sentry Cloudflare SDK

> Minimum SDK: `@sentry/cloudflare` v8.0.0+ (`captureCheckIn`, `withMonitor`)
> Auto-instrumented `scheduled` handler: v10.x+
> Status: ✅ **Generally Available**

---

## Overview

Sentry Crons tracks whether scheduled tasks run on time, succeed, and complete within expected durations. Sentry alerts when a job:
- Misses its scheduled start time (checkin margin exceeded)
- Takes too long to complete (maxRuntime exceeded)
- Fails (status `"error"`)

Cloudflare Workers support cron triggers via the `scheduled` handler. When wrapped with `withSentry`, the scheduled handler is automatically instrumented with a `faas.cron` span that includes:
- `faas.cron` — the cron expression
- `faas.time` — the scheduled time (ISO 8601)
- `faas.trigger` — `"timer"`

---

## Automatic Scheduled Handler Instrumentation

When you use `withSentry`, the `scheduled` handler is automatically wrapped. Errors are captured and the span records duration:

```typescript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  {
    async fetch(request, env, ctx) {
      return new Response("OK");
    },

    async scheduled(controller, env, ctx) {
      // Automatically instrumented — errors captured, spans created
      await cleanupOldRecords(env.DB);
    },
  } satisfies ExportedHandler<Env>,
);
```

Configure the cron trigger in `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

---

## `Sentry.withMonitor` — Named Monitor Tracking

For fine-grained monitoring with named monitors (visible in the Sentry Crons dashboard):

```typescript
async scheduled(controller, env, ctx) {
  ctx.waitUntil(
    Sentry.withMonitor("cleanup-old-records", async () => {
      await cleanupOldRecords(env.DB);
    }),
  );
},
```

### With Monitor Config (Upsert)

Supply a config to auto-create or update the monitor in Sentry:

```typescript
const monitorConfig = {
  schedule: {
    type: "crontab",
    value: "*/5 * * * *",
  },
  checkinMargin: 2,    // In minutes — how late is "missed"
  maxRuntime: 10,      // In minutes — when to alert for "timed out"
  timezone: "America/Los_Angeles",
};

async scheduled(controller, env, ctx) {
  ctx.waitUntil(
    Sentry.withMonitor(
      "cleanup-old-records",
      async () => {
        await cleanupOldRecords(env.DB);
      },
      monitorConfig,
    ),
  );
},
```

---

## `Sentry.captureCheckIn` — Manual Check-Ins

For more control over the check-in lifecycle:

### Heartbeat (Single-Shot)

```typescript
// Report success
Sentry.captureCheckIn({ monitorSlug: "health-check", status: "ok" });

// Report failure
Sentry.captureCheckIn({ monitorSlug: "health-check", status: "error" });
```

### In-Progress + Completion

```typescript
// Signal start
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "data-sync",
  status: "in_progress",
});

try {
  await syncData(env.DB);

  // Signal success
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "data-sync",
    status: "ok",
  });
} catch (error) {
  // Signal failure
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "data-sync",
    status: "error",
  });
  throw error;
}
```

### With Upsert Config

```typescript
const checkInId = Sentry.captureCheckIn(
  { monitorSlug: "data-sync", status: "in_progress" },
  {
    schedule: { type: "crontab", value: "0 * * * *" },
    checkinMargin: 5,
    maxRuntime: 30,
    timezone: "UTC",
  },
);
```

---

## Schedule Types

| Type | Format | Example |
|------|--------|---------|
| `crontab` | Standard cron expression | `"*/5 * * * *"` (every 5 min) |
| `interval` | Repeated interval | `{ value: 10, unit: "minute" }` |

### Interval Schedule

```typescript
const monitorConfig = {
  schedule: {
    type: "interval",
    value: 10,
    unit: "minute", // "minute", "hour", "day", "week", "month", "year"
  },
  checkinMargin: 2,
  maxRuntime: 10,
};
```

---

## Monitor Config Options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `schedule.type` | `"crontab" \| "interval"` | — | Required |
| `schedule.value` | `string \| number` | — | Cron expression or interval value |
| `schedule.unit` | `string` | — | Required for `interval` type |
| `checkinMargin` | `number` | — | Minutes before a check-in is considered missed |
| `maxRuntime` | `number` | — | Minutes before a running job is considered timed out |
| `timezone` | `string` | `"UTC"` | IANA timezone for crontab schedules |
| `failureIssueThreshold` | `number` | — | Number of consecutive failures before creating an issue |
| `recoveryThreshold` | `number` | — | Number of consecutive successes before resolving an issue |

---

## Best Practices

1. **Use `withMonitor` for most cases** — it handles the check-in lifecycle automatically and records duration.

2. **Use `ctx.waitUntil`** — wrap `withMonitor` in `ctx.waitUntil()` to ensure the check-in is flushed before the worker terminates.

3. **Use upsert configs** — supply `monitorConfig` to auto-create monitors. This avoids manual configuration in the Sentry UI.

4. **Name monitors clearly** — use descriptive slugs like `"daily-cleanup"` or `"hourly-sync"`, not `"cron-1"`.

5. **Set reasonable thresholds** — `checkinMargin` should be slightly larger than typical scheduling jitter. `maxRuntime` should be longer than the 99th percentile duration.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor not appearing in Crons dashboard | Ensure `captureCheckIn` or `withMonitor` is called at least once with a valid `monitorSlug` |
| Check-in always shows "missed" | Verify `checkinMargin` is large enough for scheduling jitter |
| Check-in shows "timed out" | Verify `maxRuntime` exceeds expected job duration |
| In-progress check-in never completes | Ensure both `in_progress` and `ok`/`error` check-ins use the same `checkInId` |
| Schedule mismatch | Ensure `schedule.value` in config matches the actual cron expression in `wrangler.toml` |
