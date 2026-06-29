# Cron / Scheduled-Job Monitoring — What & Why

## What it is

Monitoring for recurring jobs — cron jobs, scheduled tasks, queue workers. Sentry watches for
runs that are **missed**, **late**, **timed out**, or **failed**, and turns those into issues.

It works via **check-ins**: the job tells Sentry `in_progress` when it starts and `ok` /
`error` when it finishes. A run that never checks in (or checks in late) is flagged against
the monitor's schedule.

## When to reach for it

- You have scheduled jobs where **silent failure is dangerous** — a nightly billing run, a
  data sync, a cleanup task, a backup.
- "It didn't run" is as bad as "it crashed," and nothing else would tell you.

## The two halves (keep them straight)

- **Monitor config** is *data*: the cron schedule (crontab or interval), the timezone, the
  `checkinMargin` (how late counts as missed), and the `maxRuntime` (how long counts as
  hung). This is the server-side configuration.
- **Check-ins** are *code*: the calls your job makes to report start and outcome. This is the
  SDK side.

## Choosing the check-in path

- **SDK decorator / `withMonitor` wrapper** — cleanest when a Sentry SDK is already present;
  it sends `in_progress` and the `ok`/`error` automatically around your job.
- **HTTP check-in** — any language, no SDK; ideal for shell crontabs and non-instrumented
  jobs. A couple of HTTP calls (start, finish).
- **`sentry-cli`** — wrap a shell command in CI or a crontab and let the CLI send check-ins.

## Best practices

- **Wrap the whole job** so *both* success and failure report. A job that only sends `ok`
  never alerts on a crash — and a job that never sends anything looks "missed" forever.
- **Set `maxRuntime` and `checkinMargin` to the job's real timing** — tight enough to catch a
  hang, loose enough to avoid false alarms on a normally-slow run.
- **Use a stable, descriptive monitor slug** so the monitor survives redeploys and reads
  clearly (`nightly-invoice-sync`, not `job-1`).
- Set the **timezone** explicitly so schedule evaluation matches where the job actually runs.

## Pitfalls

- Reporting only success, so crashes are invisible.
- `maxRuntime` shorter than the job's real worst case → false "timed out" alerts.
- Slug churn on every deploy → a graveyard of orphaned monitors.

## Related

- [`monitors.md`](monitors.md) — a cron monitor is one kind of Monitor that creates issues.
