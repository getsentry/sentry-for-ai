# Crons / Monitors — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android` (any version — uses core Java SDK APIs)  
> **Status:** Stable (`Sentry.captureCheckIn()`); `CheckInUtils` is `@ApiStatus.Experimental`  
> **Docs:** https://docs.sentry.io/platforms/java/crons/ (Android-specific page returns 404)

---

## Overview

Sentry Crons lets you monitor scheduled jobs, background sync workers, and periodic tasks. A **check-in** signals to Sentry that a job started (`IN_PROGRESS`) and completed (`OK`) or failed (`ERROR`). If a check-in is missed or overdue, Sentry fires an alert.

**Key facts for Android:**

- Uses the core Java SDK — no Android-specific integration or module exists
- No `SentryWorker`, no WorkManager adapter, no AlarmManager wrapper — all wiring is manual
- `duration` is in **seconds as a Double**, not milliseconds
- `CheckInUtils` helper is `@ApiStatus.Experimental` (API may change between releases)
- Rate limit: 6 check-ins per minute per monitor per environment

---

## Pattern A — `CheckInUtils.withCheckIn()` (Recommended)

`CheckInUtils` is the simplest API. It sends `IN_PROGRESS` on entry, automatically calculates duration, and sends `OK` on success or `ERROR` on exception.

> **Note:** `CheckInUtils` carries `@ApiStatus.Experimental`. Prefer Pattern B for production code where you need stable guarantees.

```kotlin
import io.sentry.CheckInUtils
import io.sentry.MonitorConfig
import io.sentry.MonitorSchedule

// Minimal — slug only
CheckInUtils.withCheckIn("nightly-sync") {
    performNightlySync()
}

// With upsert config — creates or updates the monitor automatically
val monitorConfig = MonitorConfig(MonitorSchedule.crontab("0 2 * * *")).apply {
    setCheckinMargin(5L)     // alert if check-in is 5+ minutes late
    setMaxRuntime(60L)       // alert if running for 60+ minutes
    setTimezone("UTC")
}

CheckInUtils.withCheckIn("nightly-sync", "production", monitorConfig) {
    performNightlySync()
}
```

**Full signature:**

```kotlin
CheckInUtils.withCheckIn(
    monitorSlug:  String,           // required — must match slug in Sentry dashboard
    environment:  String?,          // null → uses SDK default environment
    monitorConfig: MonitorConfig?,  // null → no upsert; monitor must exist in dashboard
    callable: Callable<T>
): T
```

---

## Pattern B — Manual Two-Step (Full Control)

Send `IN_PROGRESS` before the job starts, then `OK` or `ERROR` when it finishes. This gives you full control over duration and error handling.

```kotlin
import io.sentry.CheckIn
import io.sentry.CheckInStatus
import io.sentry.MonitorConfig
import io.sentry.MonitorSchedule
import io.sentry.Sentry

fun runDatabaseBackup() {
    val startedAt = SystemClock.elapsedRealtime()

    // 1. Signal that the job has started
    val startCheckIn = CheckIn("db-backup", CheckInStatus.IN_PROGRESS)
    val checkInId    = Sentry.captureCheckIn(startCheckIn)

    val status: CheckInStatus
    try {
        performBackup()
        status = CheckInStatus.OK
    } catch (e: Exception) {
        Sentry.captureException(e)   // also capture the error for Sentry Issues
        status = CheckInStatus.ERROR
    }

    // 2. Signal completion — link via checkInId
    val elapsed = SystemClock.elapsedRealtime() - startedAt
    val done = CheckIn(checkInId, "db-backup", status).apply {
        // ⚠️ Duration is in SECONDS (Double), not milliseconds
        setDuration(elapsed / 1000.0)
        setMonitorConfig(
            MonitorConfig(MonitorSchedule.crontab("0 3 * * *")).apply {
                setTimezone("UTC")
                setMaxRuntime(45L)
                setCheckinMargin(10L)
            }
        )
    }
    Sentry.captureCheckIn(done)
}
```

> **⚠️ Duration is in SECONDS, not milliseconds.** Always divide elapsed milliseconds by `1000.0`:
> ```kotlin
> setDuration(SystemClock.elapsedRealtime() - startMs) / 1000.0)  // CORRECT
> setDuration(SystemClock.elapsedRealtime() - startMs)             // WRONG — 1000× too large
> ```

---

## Pattern C — Heartbeat (Simplest)

Use when you only need to detect missed schedules — not overruns. No `IN_PROGRESS` check-in, just a success or failure on completion.

```kotlin
fun runHeartbeatJob() {
    try {
        performWork()
        Sentry.captureCheckIn(CheckIn("heartbeat-job", CheckInStatus.OK))
    } catch (e: Exception) {
        Sentry.captureCheckIn(CheckIn("heartbeat-job", CheckInStatus.ERROR))
        throw e
    }
}
```

---

## Pattern D — WorkManager (Manual Wiring)

WorkManager is the recommended Android API for deferrable background work. There is no SDK adapter — wire check-ins manually:

```kotlin
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val t0    = SystemClock.elapsedRealtime()
        val start = CheckIn("workmanager-sync", CheckInStatus.IN_PROGRESS)
        val id    = Sentry.captureCheckIn(start)

        return try {
            performSync()
            Sentry.captureCheckIn(
                CheckIn(id, "workmanager-sync", CheckInStatus.OK).apply {
                    setDuration((SystemClock.elapsedRealtime() - t0) / 1000.0) // SECONDS
                    setMonitorConfig(
                        MonitorConfig(MonitorSchedule.interval(15, MonitorScheduleUnit.MINUTE)).apply {
                            setMaxRuntime(10L)
                            setCheckinMargin(3L)
                        }
                    )
                }
            )
            Result.success()
        } catch (e: Exception) {
            Sentry.captureException(e)
            Sentry.captureCheckIn(
                CheckIn(id, "workmanager-sync", CheckInStatus.ERROR).apply {
                    setDuration((SystemClock.elapsedRealtime() - t0) / 1000.0) // SECONDS
                }
            )
            Result.failure()
        }
    }
}
```

---

## Configuration Reference

### `CheckIn` Object

```kotlin
// Constructors
CheckIn(monitorSlug: String, status: CheckInStatus)
CheckIn(checkInId: SentryId, monitorSlug: String, status: CheckInStatus)

// Key setters
fun setDuration(durationSeconds: Double)    // ⚠️ SECONDS, not milliseconds
fun setMonitorConfig(config: MonitorConfig)
fun setRelease(release: String)
fun setEnvironment(environment: String)
```

### `CheckInStatus` Enum

| Status | Serialized | Sentry UI Color | Use When |
|--------|-----------|-----------------|----------|
| `IN_PROGRESS` | `"in_progress"` | Yellow | Job has started but not finished |
| `OK` | `"ok"` | Green | Job completed successfully |
| `ERROR` | `"error"` | Red | Job failed |

### Monitor Schedule

```kotlin
// Crontab — standard 5-field cron expression
MonitorSchedule.crontab("0 3 * * *")        // daily at 3:00 AM
MonitorSchedule.crontab("*/15 * * * *")     // every 15 minutes
MonitorSchedule.crontab("0 9 * * MON-FRI")  // weekdays at 9:00 AM

// Interval — simple repeating interval
MonitorSchedule.interval(30, MonitorScheduleUnit.MINUTE)
MonitorSchedule.interval(6,  MonitorScheduleUnit.HOUR)
MonitorSchedule.interval(1,  MonitorScheduleUnit.DAY)
```

**`MonitorScheduleUnit` values:** `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `YEAR`

### `MonitorConfig` Options

| Method | Type | Description |
|--------|------|-------------|
| `setCheckinMargin(minutes)` | `Long` | Tolerance (minutes) before Sentry marks a check-in as missed |
| `setMaxRuntime(minutes)` | `Long` | Alert if job runs for longer than this many minutes |
| `setTimezone(tz)` | `String` | IANA timezone, e.g. `"America/Chicago"` |
| `setFailureIssueThreshold(n)` | `Long` | Consecutive failures before opening an issue |
| `setRecoveryThreshold(n)` | `Long` | Consecutive successes before auto-resolving the issue |

### Global Defaults via `SentryOptions.Cron`

Set defaults applied to every new `MonitorConfig`:

```kotlin
SentryAndroid.init(this) { options ->
    with(options.cron) {
        defaultTimezone              = "UTC"
        defaultCheckinMargin         = 5L    // 5-minute window
        defaultMaxRuntime            = 30L   // alert after 30 minutes
        defaultFailureIssueThreshold = 3L    // open issue after 3 failures
        defaultRecoveryThreshold     = 2L    // resolve after 2 successes
    }
}
```

---

## Best Practices

1. **Always capture `IN_PROGRESS` for long-running jobs** — heartbeat (OK only) can't detect overruns; two-step check-ins can
2. **Use `setDuration()` in seconds** — divide elapsed milliseconds by `1000.0`; forgetting this is the #1 crons mistake in Android
3. **Set `maxRuntime` with a buffer** — if your job typically runs 10 minutes, set `maxRuntime = 15` to avoid alert noise
4. **Capture exceptions separately** — `CheckIn.ERROR` status marks the schedule failed, but `Sentry.captureException()` creates a full Sentry Issue with stack trace
5. **Keep monitor slugs stable** — changing a slug creates a new monitor in the dashboard; rename via the UI, not by changing the slug in code
6. **Use `setEnvironment()` per check-in** — if you run the same job in staging and production, separate them by environment to avoid cross-contamination
7. **Set `checkinMargin` conservatively** — too tight causes alert noise from slight scheduling jitter; 5–10 minutes is a safe starting point
8. **Test with `debug = true`** — `Sentry.captureCheckIn()` is a synchronous HTTP call; verify check-ins appear in the dashboard before deploying
9. **Avoid `CheckInUtils` in public APIs** — it is `@ApiStatus.Experimental` and may change; prefer the manual two-step pattern in library code

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| No Android-specific integration | No `SentryWorker`, no WorkManager adapter — all wiring is manual |
| Android docs page missing | `https://docs.sentry.io/platforms/android/crons/` returns HTTP 404; use the Java docs page |
| `CheckInUtils` is experimental | `@ApiStatus.Experimental` — API may change between SDK releases |
| No auto-error on crash | If the app crashes mid-job, no `ERROR` check-in is sent automatically; consider a `Thread.UncaughtExceptionHandler` |
| Duration must be in seconds | `setDuration()` accepts `Double` **seconds** — a common mistake is passing milliseconds directly |
| Rate limited | 6 check-ins per minute per monitor per environment (Sentry platform limit) |
| Spring/Quartz integrations are server-side only | `@SentryCheckIn`, `SentryJobListener`, `sentry-quartz` are for JVM servers — do not use on Android |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor shows "missed" immediately | Check that `IN_PROGRESS` was sent before the job started and that `checkinMargin` is set generously enough |
| Duration value looks wrong (1000× too large) | `setDuration()` expects **seconds** — divide `SystemClock.elapsedRealtime()` delta by `1000.0` |
| No check-in events in Sentry dashboard | Confirm `Sentry.isEnabled()` returns `true` and the DSN is correct; check-ins are sent synchronously via `captureCheckIn()` |
| `CheckInUtils` method not found | Ensure SDK ≥ 8.x; `CheckInUtils` is in the core `io.sentry:sentry` dependency bundled in `sentry-android` |
| Monitor shows "error" even on success | Verify the second `CheckIn` uses the `SentryId` returned by the first `captureCheckIn()` call, not a new `CheckIn(slug, OK)` |
| Two monitors created for the same job | Monitor slug changed between deployments — rename via the Sentry UI, not by changing the slug in code |
| Rate limit errors in logs | Reduce check-in frequency; the limit is 6/minute/monitor/environment |
