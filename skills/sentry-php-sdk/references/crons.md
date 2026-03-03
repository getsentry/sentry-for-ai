# Crons — Sentry PHP SDK

> Minimum SDK versions: `sentry/sentry-php` ≥ 3.16.0 · `sentry/sentry-laravel` ≥ 3.3.1

## Overview

Sentry Crons monitors scheduled jobs by receiving check-ins at job start, success, and failure. Three approaches:

| Approach | Use when |
|----------|---------|
| `withMonitor()` wrapper | Simple wrapping of any callable |
| `captureCheckIn()` manually | Need control over timing, status, or heartbeats |
| `sentryMonitor()` macro (Laravel) | Laravel scheduled tasks — minimal boilerplate |

## Code Examples

### `withMonitor()` wrapper (simplest)

```php
\Sentry\withMonitor(
    slug: 'my-cron-job',
    callback: fn() => doSomething(),
);
// Sends IN_PROGRESS before, OK on success, ERROR on exception
```

### Manual check-ins with `captureCheckIn()`

```php
use Sentry\CheckInStatus;

// 1. Signal job started
$checkInId = \Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::inProgress(),
);

try {
    // 2. Do work
    runScheduledTask();

    // 3a. Signal success
    \Sentry\captureCheckIn(
        slug: 'my-cron-job',
        status: CheckInStatus::ok(),
        checkInId: $checkInId,
    );
} catch (\Throwable $e) {
    // 3b. Signal failure
    \Sentry\captureCheckIn(
        slug: 'my-cron-job',
        status: CheckInStatus::error(),
        checkInId: $checkInId,
    );
    throw $e;
}
```

### Heartbeat (single check-in)

Only notifies if the job **didn't start** when expected (missed). Does not detect max runtime exceeded.

```php
// Success
\Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::ok(),
    duration: 10, // optional: seconds
);

// Failure
\Sentry\captureCheckIn(
    slug: 'my-cron-job',
    status: CheckInStatus::error(),
);
```

### Upsert monitor config programmatically

Define monitor settings in code so Sentry creates/updates the monitor automatically on first check-in:

```php
use Sentry\CheckInStatus;
use Sentry\MonitorConfig;
use Sentry\MonitorSchedule;
use Sentry\MonitorScheduleUnit;

// Crontab schedule
$monitorConfig = new MonitorConfig(
    MonitorSchedule::crontab('0 2 * * *'),  // every day at 2 AM
    checkinMargin: 5,                        // minutes late before MISSED alert
    maxRuntime: 15,                          // minutes before TIMEOUT alert
    timezone: 'Europe/Vienna',
    failureIssueThreshold: 2,               // consecutive failures before issue
    recoveryThreshold: 5,                   // consecutive successes to resolve
);

$checkInId = \Sentry\captureCheckIn(
    slug: 'daily-backup',
    status: CheckInStatus::inProgress(),
    monitorConfig: $monitorConfig,
);

runBackup();

\Sentry\captureCheckIn(
    slug: 'daily-backup',
    status: CheckInStatus::ok(),
    checkInId: $checkInId,
);
```

```php
// Interval schedule
$monitorConfig = new MonitorConfig(
    MonitorSchedule::interval(10, MonitorScheduleUnit::minute()),
    checkinMargin: 5,
    maxRuntime: 8,
);
```

### Laravel — `sentryMonitor()` macro

Add `sentryMonitor()` to any scheduled task in `routes/console.php`:

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command(SendEmailsCommand::class)
    ->everyHour()
    ->sentryMonitor(); // that's it
```

With full configuration:

```php
Schedule::command(SendEmailsCommand::class)
    ->everyHour()
    ->sentryMonitor(
        monitorSlug: null,              // auto-generated if null
        checkInMargin: 5,              // minutes before MISSED alert
        maxRuntime: 15,                // minutes before TIMEOUT alert
        failureIssueThreshold: 1,      // consecutive failures before issue
        recoveryThreshold: 1,          // consecutive successes to resolve
        updateMonitorConfig: true,     // set false to manage config in UI only
    );
```

> **Limitation:** Tasks using `between`, `unlessBetween`, `when`, or `skip` are not supported. Use Laravel's `cron()` method for schedule frequency in those cases.

### Symfony — same as base PHP SDK

The Symfony bundle has no dedicated cron integration. Use `captureCheckIn()` or `withMonitor()` directly:

```php
use Sentry\CheckInStatus;

// In a Console command or service
$checkInId = \Sentry\captureCheckIn(
    slug: 'symfony-cron',
    status: CheckInStatus::inProgress(),
);

$this->doWork();

\Sentry\captureCheckIn(
    slug: 'symfony-cron',
    status: CheckInStatus::ok(),
    checkInId: $checkInId,
);
```

## `CheckInStatus` Reference

```php
use Sentry\CheckInStatus;

CheckInStatus::inProgress()  // job has started
CheckInStatus::ok()          // job completed successfully
CheckInStatus::error()       // job failed
// MISSED and TIMEOUT are generated server-side — not sent by SDK
```

## `MonitorScheduleUnit` Reference

```php
use Sentry\MonitorScheduleUnit;

MonitorScheduleUnit::minute()
MonitorScheduleUnit::hour()
MonitorScheduleUnit::day()
MonitorScheduleUnit::week()
MonitorScheduleUnit::month()
MonitorScheduleUnit::year()
```

## `MonitorConfig` Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `$monitorSchedule` | `MonitorSchedule` | ✅ | Crontab or interval schedule |
| `$checkinMargin` | `int\|null` | No | Minutes late before MISSED alert |
| `$maxRuntime` | `int\|null` | No | Minutes after IN_PROGRESS before TIMEOUT |
| `$timezone` | `string\|null` | No | IANA timezone name, default `UTC` |
| `$failureIssueThreshold` | `int\|null` | No | Consecutive failures before opening an issue |
| `$recoveryThreshold` | `int\|null` | No | Consecutive successes to resolve an issue |

## Laravel `sentryMonitor()` Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `monitorSlug` | `null` | Custom slug; auto-generated from command name if null |
| `checkInMargin` | `5` | Minutes before check-in is considered missed |
| `maxRuntime` | `15` | Minutes before in-progress is marked timed out |
| `failureIssueThreshold` | `1` | Consecutive failures before creating issue |
| `recoveryThreshold` | `1` | Consecutive successes before resolving issue |
| `updateMonitorConfig` | `true` | `false` = configure monitor only in Sentry UI (requires `monitorSlug`) |

## Rate Limits

**6 check-ins per minute per monitor-environment.** Excess check-ins are silently dropped.

Example:
- `database-backup` in `production` → up to 6/min
- `database-backup` in `staging` → up to 6/min (separate limit)

Verify dropped check-ins on the Sentry Usage Stats page.

## Alerts Setup

When a job misses a check-in or reports failure, Sentry creates an error event tagged with `monitor.slug`:

1. Go to **Alerts** → **Create Alert** → select **Issues** under Errors
2. Filter: `The event's tags match monitor.slug equals my-monitor-slug-here`

## Best Practices

- Use `withMonitor()` for simple jobs; use manual `captureCheckIn()` when you need error handling or heartbeats
- Provide `MonitorConfig` on the first check-in so Sentry creates the monitor automatically — no UI setup needed
- For jobs longer than `maxRuntime`, send periodic `IN_PROGRESS` check-ins as heartbeats to reset the timeout clock
- In Laravel, prefer `sentryMonitor()` macro over manual check-ins for scheduled tasks
- Set `updateMonitorConfig: false` in Laravel when the monitor schedule is managed in the Sentry UI

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor not created in Sentry | Provide `MonitorConfig` — monitors are not auto-created without it |
| MISSED alerts firing too early | Increase `checkinMargin` to allow for job startup time |
| TIMEOUT alerts on slow jobs | Increase `maxRuntime` or send periodic `IN_PROGRESS` heartbeats |
| Laravel `sentryMonitor()` not working | Check SDK version ≥ 3.3.1; verify `ConsoleSchedulingIntegration` is active |
| `between`/`when` tasks not monitored | Use Laravel's `cron()` method for schedule frequency instead |
| Check-ins silently dropped | You may be hitting the 6/min rate limit — check Usage Stats page |
