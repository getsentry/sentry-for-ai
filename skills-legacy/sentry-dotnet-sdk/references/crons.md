# Crons — Sentry .NET SDK

> Minimum SDK: `Sentry` ≥ 4.2.0

---

## Overview

Sentry Cron Monitoring detects:
- **Missed check-ins** — job didn't run at the expected time
- **Runtime failures** — job ran but encountered an error
- **Timeouts** — job exceeded `MaxRuntime` without completing

---

## `CaptureCheckIn()` API

```csharp
// Signature
SentryId CaptureCheckIn(
    string monitorSlug,
    CheckInStatus status,
    SentryId? checkInId = null,
    TimeSpan? duration = null,
    Action<SentryMonitorOptions>? configureMonitorOptions = null
)
```

### Check-In Status Values

| Status | When to use |
|--------|-------------|
| `CheckInStatus.InProgress` | Job has started, work is underway |
| `CheckInStatus.Ok` | Job completed successfully |
| `CheckInStatus.Error` | Job failed — an error occurred |

---

## Pattern A: Two-Signal Check-Ins (Recommended)

Sends two signals: `InProgress` at start and `Ok`/`Error` at end.  
Enables detection of both **missed jobs** and **timeout violations**.

```csharp
// Mark job as started — save the checkInId for correlation
var checkInId = SentrySdk.CaptureCheckIn("my-monitor-slug", CheckInStatus.InProgress);

try
{
    DoWork();

    // Mark as successful
    SentrySdk.CaptureCheckIn("my-monitor-slug", CheckInStatus.Ok, checkInId);
}
catch (Exception ex)
{
    // Mark as failed
    SentrySdk.CaptureCheckIn("my-monitor-slug", CheckInStatus.Error, checkInId);
    throw;
}
```

---

## Pattern B: Heartbeat Check-In (Simpler)

Sends a single check-in **after** execution. Detects **missed jobs** only — cannot detect timeouts.

```csharp
try
{
    DoWork();
    SentrySdk.CaptureCheckIn("my-monitor-slug", CheckInStatus.Ok);
}
catch
{
    SentrySdk.CaptureCheckIn("my-monitor-slug", CheckInStatus.Error);
    throw;
}
```

Optionally report the actual runtime duration:

```csharp
var sw = Stopwatch.StartNew();
DoWork();
sw.Stop();

SentrySdk.CaptureCheckIn(
    "my-monitor-slug",
    CheckInStatus.Ok,
    duration: sw.Elapsed
);
```

---

## Programmatic Monitor Configuration (Upsert)

Create or update a monitor directly from code via `configureMonitorOptions`. This is sent with the **first** check-in and is idempotent — safe to call on every run.

### Crontab Schedule

```csharp
var checkInId = SentrySdk.CaptureCheckIn(
    "my-scheduled-job",
    CheckInStatus.InProgress,
    configureMonitorOptions: options =>
    {
        options.Schedule = "0 2 * * *";       // 2 AM daily (crontab expression)
        options.CheckInMargin = 5;             // 5 min grace period before "missed"
        options.MaxRuntime = 30;               // alert if running longer than 30 min
        options.TimeZone = "America/New_York"; // IANA timezone
        options.FailureIssueThreshold = 2;     // create issue after 2 consecutive failures
        options.RecoveryThreshold = 1;         // resolve issue after 1 consecutive success
    }
);
```

### Interval-Based Schedule

```csharp
var checkInId = SentrySdk.CaptureCheckIn(
    "my-interval-job",
    CheckInStatus.InProgress,
    configureMonitorOptions: options =>
    {
        options.Interval(6, SentryMonitorInterval.Hour); // every 6 hours
        options.CheckInMargin = 30;
        options.MaxRuntime = 120;
        options.TimeZone = "UTC";
        options.FailureIssueThreshold = 1;
        options.RecoveryThreshold = 3;
    }
);
```

### `SentryMonitorInterval` Values

| Value | Description |
|-------|-------------|
| `SentryMonitorInterval.Minute` | Per-minute interval |
| `SentryMonitorInterval.Hour` | Per-hour interval |
| `SentryMonitorInterval.Day` | Per-day interval |
| `SentryMonitorInterval.Week` | Per-week interval |
| `SentryMonitorInterval.Month` | Per-month interval |
| `SentryMonitorInterval.Year` | Per-year interval |

---

## Monitor Configuration Reference

| Option | Type | Description |
|--------|------|-------------|
| `Schedule` | `string` | Standard crontab expression (e.g., `"*/15 * * * *"`) |
| `Interval(n, unit)` | method | Interval-based schedule; alternative to `Schedule` |
| `CheckInMargin` | `int` | Minutes of grace period before a missing check-in is flagged |
| `MaxRuntime` | `int` | Maximum allowed runtime in minutes before a timeout alert |
| `TimeZone` | `string` | IANA timezone name (e.g., `"UTC"`, `"America/Chicago"`) |
| `FailureIssueThreshold` | `int` | Consecutive failures before a Sentry issue is opened |
| `RecoveryThreshold` | `int` | Consecutive successes before a Sentry issue is closed |

---

## ASP.NET Core — BackgroundService / IHostedService

The most common .NET pattern for scheduled jobs is a `BackgroundService`. Pair it with `CaptureCheckIn` for full monitoring:

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sentry;

public class NightlyReportJob : BackgroundService
{
    private readonly ILogger<NightlyReportJob> _logger;
    private const string MonitorSlug = "nightly-report";

    public NightlyReportJob(ILogger<NightlyReportJob> logger)
        => _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Wait until next scheduled time (e.g., 2 AM)
            await WaitUntilNextRunAsync(stoppingToken);

            var checkInId = SentrySdk.CaptureCheckIn(
                MonitorSlug,
                CheckInStatus.InProgress,
                configureMonitorOptions: o =>
                {
                    o.Schedule = "0 2 * * *"; // 2 AM daily
                    o.CheckInMargin = 15;
                    o.MaxRuntime = 60;
                    o.TimeZone = "UTC";
                    o.FailureIssueThreshold = 1;
                    o.RecoveryThreshold = 1;
                }
            );

            try
            {
                _logger.LogInformation("Starting nightly report generation");
                await GenerateReportAsync(stoppingToken);
                _logger.LogInformation("Nightly report completed successfully");

                SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Ok, checkInId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Nightly report failed");
                SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Error, checkInId);
            }
        }
    }

    private async Task WaitUntilNextRunAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var nextRun = now.Date.AddDays(now.Hour >= 2 ? 1 : 0).AddHours(2);
        var delay = nextRun - now;
        if (delay > TimeSpan.Zero)
            await Task.Delay(delay, ct);
    }

    private Task GenerateReportAsync(CancellationToken ct) => Task.CompletedTask; // replace with real logic
}
```

Register the hosted service in `Program.cs`:

```csharp
builder.Services.AddHostedService<NightlyReportJob>();
```

### Minimal IHostedService Implementation

For simpler one-shot or timer-based jobs:

```csharp
public class SyncJob : IHostedService, IDisposable
{
    private Timer? _timer;
    private const string MonitorSlug = "data-sync";

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _timer = new Timer(RunJob, null, TimeSpan.Zero, TimeSpan.FromHours(1));
        return Task.CompletedTask;
    }

    private void RunJob(object? state)
    {
        var checkInId = SentrySdk.CaptureCheckIn(
            MonitorSlug,
            CheckInStatus.InProgress,
            configureMonitorOptions: o =>
            {
                o.Interval(1, SentryMonitorInterval.Hour);
                o.CheckInMargin = 5;
                o.MaxRuntime = 30;
                o.TimeZone = "UTC";
            }
        );

        try
        {
            SyncData();
            SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Ok, checkInId);
        }
        catch
        {
            SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Error, checkInId);
            throw;
        }
    }

    private void SyncData() { /* real logic here */ }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();
}
```

---

## Hangfire Integration

A dedicated `Sentry.Hangfire` package wraps check-ins automatically around Hangfire job execution:

```shell
dotnet add package Sentry.Hangfire
```

Register the integration when configuring Hangfire:

```csharp
// Program.cs
builder.Services.AddHangfire(config =>
{
    config.UseSqlServerStorage(connectionString);
    config.UseSentry(); // ← enables automatic check-in wrapping
});
builder.Services.AddHangfireServer();
```

With Hangfire, check-ins are sent automatically for every recurring job — no manual `CaptureCheckIn` calls needed. Set the monitor slug using the job's `RecurringJobId`.

See the [Hangfire integration guide](https://docs.sentry.io/platforms/dotnet/guides/hangfire/) for full details.

---

## Quartz.NET Integration

**No official Quartz.NET package exists.** Use `CaptureCheckIn` manually inside `IJob.Execute()`:

```csharp
using Quartz;
using Sentry;

[DisallowConcurrentExecution]
public class MyQuartzJob : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var slug = $"quartz-{context.JobDetail.Key.Name}";

        var checkInId = SentrySdk.CaptureCheckIn(slug, CheckInStatus.InProgress,
            configureMonitorOptions: o =>
            {
                o.Schedule = "0 */6 * * *"; // every 6 hours
                o.CheckInMargin = 10;
                o.MaxRuntime = 60;
                o.TimeZone = "UTC";
            }
        );

        try
        {
            await DoWorkAsync(context.CancellationToken);
            SentrySdk.CaptureCheckIn(slug, CheckInStatus.Ok, checkInId);
        }
        catch (Exception ex)
        {
            SentrySdk.CaptureCheckIn(slug, CheckInStatus.Error, checkInId);
            throw new JobExecutionException(ex);
        }
    }
}
```

---

## Long-Running Job Pattern (Heartbeat Loop)

For processes that run continuously and should check in periodically:

```csharp
public class LongRunningProcessor : BackgroundService
{
    private const string MonitorSlug = "queue-processor";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var checkInId = SentrySdk.CaptureCheckIn(
                MonitorSlug,
                CheckInStatus.InProgress,
                configureMonitorOptions: o =>
                {
                    o.Interval(5, SentryMonitorInterval.Minute);
                    o.CheckInMargin = 2;
                    o.MaxRuntime = 10;
                    o.TimeZone = "UTC";
                }
            );

            try
            {
                await ProcessBatchAsync(stoppingToken);
                SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Ok, checkInId);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                SentrySdk.CaptureCheckIn(MonitorSlug, CheckInStatus.Error, checkInId);
                // optionally capture the exception too
                SentrySdk.CaptureException(ex);
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
```

---

## Alerting

Create issue alerts in Sentry:  
**Alerts → Create Alert → Issues → filter** by tag `monitor.slug equals my-monitor-slug`

---

## Rate Limits

Cron check-ins are rate-limited to **6 check-ins per minute per monitor per environment**. Each environment (`production`, `staging`, etc.) tracks independently. Exceeding this limit silently drops events — visible in Usage Stats.

---

## SDK Version Matrix

| Feature | Min SDK Version |
|---------|----------------|
| `SentrySdk.CaptureCheckIn()` | **4.2.0** |
| Heartbeat pattern | **4.2.0** |
| Programmatic monitor upsert (`configureMonitorOptions`) | **4.2.0** |
| Crontab schedule | **4.2.0** |
| Interval schedule (`SentryMonitorInterval`) | **4.2.0** |
| `Sentry.Hangfire` auto-integration | **4.x** |
| Quartz.NET | ❌ Manual API only |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Check-ins not appearing in Sentry | Verify `monitorSlug` matches the slug configured in Sentry; check DSN is correct and SDK is initialized |
| Monitor shows "missed" despite job running | Increase `CheckInMargin` to allow more grace time; check server clock sync (NTP) |
| Monitor shows "timeout" | Increase `MaxRuntime`; investigate why the job exceeds the expected duration |
| Monitor not auto-created | Pass `configureMonitorOptions` on the **first** `CaptureCheckIn` call — the upsert creates the monitor |
| `CheckInStatus.Error` but no Sentry issue | Configure `FailureIssueThreshold = 1` on the monitor options to create issues on first failure |
| Hangfire jobs not sending check-ins | Ensure `config.UseSentry()` is called inside `AddHangfire`; verify Sentry SDK is initialized before Hangfire starts |
| Quartz jobs not monitored | No official integration — add `CaptureCheckIn` manually inside `IJob.Execute()` |
| Duplicate check-ins from multiple instances | Use a distributed lock (e.g., `IDistributedLock`) around the check-in calls, or configure Quartz/Hangfire with single-instance scheduling |
