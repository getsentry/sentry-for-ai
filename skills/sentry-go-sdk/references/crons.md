# Crons — Sentry Go SDK

> Minimum SDK: `github.com/getsentry/sentry-go` v0.18.0+

Sentry Cron Monitoring detects two failure modes:
- **Missed jobs** — the job never ran (schedule was skipped)
- **Timed-out jobs** — the job started but ran too long

## Configuration

No extra `ClientOptions` are required beyond a valid DSN:

```go
sentry.Init(sentry.ClientOptions{
    Dsn: os.Getenv("SENTRY_DSN"),
})
defer sentry.Flush(2 * time.Second)
```

> Check-ins are async by default — always `defer sentry.Flush()` before program exit.

## Core Types

### `CheckIn`

```go
type CheckIn struct {
    ID          EventID       // leave zero on start; use *id from start call on completion
    MonitorSlug string        // slug of the monitor in Sentry
    Status      CheckInStatus // in_progress | ok | error
    Duration    time.Duration // optional; set on final check-in
}
```

### `CheckInStatus` constants

```go
sentry.CheckInStatusInProgress // "in_progress" — job started
sentry.CheckInStatusOK         // "ok"           — job completed successfully
sentry.CheckInStatusError      // "error"         — job failed
```

### `MonitorConfig`

```go
type MonitorConfig struct {
    Schedule              MonitorSchedule     // when the job should run
    CheckInMargin         int64               // minutes of grace period before "missed"
    MaxRuntime            int64               // minutes before in-progress job times out
    Timezone              string              // tz database name, e.g. "America/New_York"
    FailureIssueThreshold int64               // consecutive failures before creating an issue
    RecoveryThreshold     int64               // consecutive successes before auto-resolving
}
```

### Schedule constructors

```go
// Standard 5-field cron expression
sentry.CrontabSchedule("*/10 * * * *")

// Interval-based
sentry.IntervalSchedule(1, sentry.MonitorScheduleUnitHour)
```

`MonitorScheduleUnit` constants: `MonitorScheduleUnitMinute`, `MonitorScheduleUnitHour`, `MonitorScheduleUnitDay`, `MonitorScheduleUnitWeek`, `MonitorScheduleUnitMonth`, `MonitorScheduleUnitYear`.

> `IntervalSchedule` takes `int64`, not `int`.

## Code Examples

### Check-in pattern (recommended)

Sends both a start and a completion check-in. Detects **missed** and **timed-out** jobs.

```go
func runHourlyReport() error {
    monitorConfig := &sentry.MonitorConfig{
        Schedule:              sentry.CrontabSchedule("0 * * * *"),
        MaxRuntime:            5,  // alert if still running after 5 minutes
        CheckInMargin:         2,  // allow 2 minutes late before "missed"
        FailureIssueThreshold: 2,  // create issue after 2 consecutive failures
        RecoveryThreshold:     1,  // auto-resolve after 1 success
        Timezone:              "America/New_York",
    }

    // Send in_progress — pass MonitorConfig here (only needed on first call)
    checkinID := sentry.CaptureCheckIn(
        &sentry.CheckIn{
            MonitorSlug: "hourly-report",
            Status:      sentry.CheckInStatusInProgress,
        },
        monitorConfig,
    )

    err := generateReport()

    // Send ok or error — dereference the *EventID returned by start
    status := sentry.CheckInStatusOK
    if err != nil {
        status = sentry.CheckInStatusError
    }
    sentry.CaptureCheckIn(
        &sentry.CheckIn{
            ID:          *checkinID, // dereference *EventID
            MonitorSlug: "hourly-report",
            Status:      status,
        },
        nil, // no config needed on completion
    )

    return err
}
```

### Heartbeat pattern

Sends only a completion check-in. Detects **missed** jobs only (no timeout detection).

```go
func runDailyCleanup() {
    start := time.Now()

    cleanupOldRecords()

    sentry.CaptureCheckIn(
        &sentry.CheckIn{
            MonitorSlug: "daily-cleanup",
            Status:      sentry.CheckInStatusOK,
            Duration:    time.Since(start),
        },
        &sentry.MonitorConfig{
            Schedule: sentry.CrontabSchedule("0 0 * * *"), // midnight daily
        },
    )
}
```

### Error handling in jobs

```go
func runSyncJob(ctx context.Context) {
    id := sentry.CaptureCheckIn(
        &sentry.CheckIn{MonitorSlug: "data-sync", Status: sentry.CheckInStatusInProgress},
        &sentry.MonitorConfig{
            Schedule:   sentry.IntervalSchedule(10, sentry.MonitorScheduleUnitMinute),
            MaxRuntime: 2,
        },
    )

    err := syncData(ctx)
    if err != nil {
        // Capture the error AND complete the check-in as error
        sentry.CaptureException(err)
        sentry.CaptureCheckIn(
            &sentry.CheckIn{ID: *id, MonitorSlug: "data-sync", Status: sentry.CheckInStatusError},
            nil,
        )
        return
    }

    sentry.CaptureCheckIn(
        &sentry.CheckIn{ID: *id, MonitorSlug: "data-sync", Status: sentry.CheckInStatusOK},
        nil,
    )
}
```

### Integration with robfig/cron

The SDK provides no built-in cron library wrappers — wrap manually:

```go
import "github.com/robfig/cron/v3"

c := cron.New()
c.AddFunc("@every 1h", func() {
    id := sentry.CaptureCheckIn(
        &sentry.CheckIn{
            MonitorSlug: "hourly-job",
            Status:      sentry.CheckInStatusInProgress,
        },
        &sentry.MonitorConfig{
            Schedule:      sentry.CrontabSchedule("0 * * * *"),
            MaxRuntime:    5,
            CheckInMargin: 2,
        },
    )

    err := doWork()

    status := sentry.CheckInStatusOK
    if err != nil {
        status = sentry.CheckInStatusError
    }
    sentry.CaptureCheckIn(
        &sentry.CheckIn{ID: *id, MonitorSlug: "hourly-job", Status: status},
        nil,
    )
})
c.Start()
defer c.Stop()
```

### Linking errors to the monitor

```go
sentry.ConfigureScope(func(scope *sentry.Scope) {
    scope.SetContext("monitor", sentry.Context{"slug": "my-monitor-slug"})
})
// Errors captured in this scope will be linked to the monitor in Sentry
```

## CaptureCheckIn API

```go
// Package-level (uses CurrentHub)
func CaptureCheckIn(checkIn *CheckIn, monitorConfig *MonitorConfig) *EventID

// Hub method
func (hub *Hub) CaptureCheckIn(checkIn *CheckIn, monitorConfig *MonitorConfig) *EventID
```

Both return `*EventID`. Always dereference with `*id` when passing to the completion call. Returns `nil` if no client is bound — guard with `if id != nil`.

## MonitorConfig Guidance

| Field | Recommended value | Notes |
|-------|------------------|-------|
| `Schedule` | Match your actual cron expression | Required |
| `CheckInMargin` | 1–5 min for fast jobs; 10–30 min for slow | Grace period before "missed" alert |
| `MaxRuntime` | 2–3× expected runtime | Triggers timeout alert |
| `Timezone` | e.g., `"America/New_York"` | Defaults to UTC if unset |
| `FailureIssueThreshold` | `2` | Avoid noise from one-off failures |
| `RecoveryThreshold` | `1` | Auto-resolve on first success |

Pass `MonitorConfig` on the **start** check-in only; pass `nil` on the completion call.

## Rate Limits

Sentry limits check-ins to **6 per minute per monitor + environment combination**. For jobs running more frequently than every 10 seconds, consider sampling.

## Best Practices

- Always send both a start (`InProgress`) and a completion (`OK`/`Error`) check-in — this enables timeout detection
- Use `defer sentry.Flush(2 * time.Second)` in `main()` — check-ins are queued async
- Set `MaxRuntime` to roughly 2–3× your expected job duration
- Set `FailureIssueThreshold: 2` to avoid noisy alerts from transient failures
- Create the monitor in the Sentry UI first, then use its slug — or let the SDK auto-create it on first check-in
- Don't reuse the same `MonitorSlug` for different jobs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Check-ins not appearing | Check DSN; ensure `sentry.Flush()` is called; set `Debug: true` |
| Monitor shows "missed" unexpectedly | Increase `CheckInMargin`; ensure `InProgress` is sent before work starts |
| Monitor shows "timeout" | Increase `MaxRuntime`; check for job hangs |
| Nil pointer on `*checkinID` | `CaptureCheckIn` returns `nil` if no client — check `sentry.Init` was called |
| Duplicate issues for the same failure | Set `FailureIssueThreshold: 2` to batch consecutive failures |
| Check-ins rate limited | Reduce frequency; batch work; check Sentry plan limits |
