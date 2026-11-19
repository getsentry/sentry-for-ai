# Crons — Sentry Python SDK

> Minimum SDK: `sentry-sdk` 1.x+ (stable); 1.44.1+ for async `@monitor`; 1.45.0+ for `MonitorConfig` upsert

## Overview

Sentry Crons monitors scheduled jobs by receiving check-ins at job start, success, and failure. Three approaches:

| Approach | Use when |
|----------|---------|
| `@monitor` decorator | Simple wrapping of any function |
| `capture_checkin()` manually | Need control over timing, status, or heartbeats |
| `CeleryIntegration(monitor_beat_tasks=True)` | Celery Beat tasks — zero boilerplate |

## Code Examples

### `@monitor` decorator (simplest)

```python
import sentry_sdk
from sentry_sdk.crons import monitor

@monitor(monitor_slug="nightly-report")
def generate_report():
    # Sends IN_PROGRESS on start, OK on success, ERROR on exception
    run_report()

# Async support (SDK 1.44.1+)
@monitor(monitor_slug="async-job")
async def async_task():
    await do_async_work()

# Context manager syntax
def generate_report():
    with monitor(monitor_slug="nightly-report"):
        run_report()
```

### `@monitor` with `MonitorConfig` — upsert monitor definition (SDK 1.45.0+)

```python
from sentry_sdk.crons import monitor

# Crontab schedule
@monitor(
    monitor_slug="nightly-report",
    monitor_config={
        "schedule": {"type": "crontab", "value": "0 2 * * *"},
        "timezone": "Europe/Vienna",
        "checkin_margin": 10,       # minutes late before MISSED alert
        "max_runtime": 30,          # minutes before TIMEOUT alert
        "failure_issue_threshold": 3,
        "recovery_threshold": 3,
    },
)
def nightly_report():
    generate_report()

# Interval schedule
@monitor(
    monitor_slug="sync-job",
    monitor_config={
        "schedule": {
            "type": "interval",
            "value": 2,
            "unit": "hour",   # minute | hour | day | week | month | year
        },
        "checkin_margin": 5,
        "max_runtime": 20,
    },
)
def sync_data():
    sync()
```

### Manual check-ins with `capture_checkin()`

```python
from sentry_sdk.crons import capture_checkin
from sentry_sdk.crons.consts import MonitorStatus

# 1. Signal job started
check_in_id = capture_checkin(
    monitor_slug="my-cron-job",
    status=MonitorStatus.IN_PROGRESS,
)

try:
    run_job()

    # 2a. Signal success
    capture_checkin(
        monitor_slug="my-cron-job",
        check_in_id=check_in_id,    # links back to IN_PROGRESS
        status=MonitorStatus.OK,
    )
except Exception:
    # 2b. Signal failure
    capture_checkin(
        monitor_slug="my-cron-job",
        check_in_id=check_in_id,
        status=MonitorStatus.ERROR,
    )
    raise
```

### Heartbeat pattern for long-running jobs

```python
from sentry_sdk.crons import capture_checkin
from sentry_sdk.crons.consts import MonitorStatus
import time

def long_running_job():
    check_in_id = capture_checkin(
        monitor_slug="data-pipeline",
        status=MonitorStatus.IN_PROGRESS,
    )

    for batch in get_batches():
        process_batch(batch)
        # Send periodic heartbeat to prevent TIMEOUT
        capture_checkin(
            monitor_slug="data-pipeline",
            check_in_id=check_in_id,
            status=MonitorStatus.IN_PROGRESS,
        )

    capture_checkin(
        monitor_slug="data-pipeline",
        check_in_id=check_in_id,
        status=MonitorStatus.OK,
    )
```

### Celery Beat auto-discovery

```python
import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn="...",
    integrations=[
        CeleryIntegration(
            monitor_beat_tasks=True,        # enables auto-discovery
            exclude_beat_tasks=[
                "some-noisy-task",          # exact match
                "health-check-.*",          # regex pattern
            ],
        ),
    ],
)

# In celery config — monitor slug = beat schedule entry name
from celery.schedules import crontab

app.conf.beat_schedule = {
    "nightly-cleanup": {                    # → monitor slug: "nightly-cleanup"
        "task": "tasks.cleanup_old_records",
        "schedule": crontab(hour="1", minute="0"),
    },
}
```

Celery Beat constraints:

| Rule | Detail |
|------|--------|
| Auto-parses | `crontab` schedules only |
| First-run creation | Monitor created lazily on first task execution |
| No double-decoration | Don't use `@monitor` on tasks with `monitor_beat_tasks=True` |
| Default | `monitor_beat_tasks=False` — must be explicitly enabled |

## `MonitorStatus` Reference

```python
from sentry_sdk.crons.consts import MonitorStatus

MonitorStatus.IN_PROGRESS   # job has started
MonitorStatus.OK            # job completed successfully
MonitorStatus.ERROR         # job failed
# MISSED and TIMEOUT are generated server-side — not sent by SDK
```

## `MonitorConfig` Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schedule` | `dict` | ✅ | `{"type": "crontab", "value": "* * * * *"}` or `{"type": "interval", "value": N, "unit": "..."}` |
| `timezone` | `str` | No | IANA timezone name, default `"UTC"` |
| `checkin_margin` | `int` | No | Minutes late before MISSED alert |
| `max_runtime` | `int` | No | Minutes after IN_PROGRESS before TIMEOUT |
| `failure_issue_threshold` | `int` | No | Consecutive failures before opening an issue |
| `recovery_threshold` | `int` | No | Consecutive successes to resolve an issue |

## Best Practices

- Use `@monitor` with `monitor_config` so monitors are created automatically on first run — no Sentry UI setup needed
- For Celery Beat, prefer `monitor_beat_tasks=True` over decorating individual tasks
- Send `IN_PROGRESS` before starting work so TIMEOUT detection starts immediately
- For jobs longer than `max_runtime`, send periodic `IN_PROGRESS` check-ins as heartbeats
- Sentry enforces a rate limit of **6 check-ins/minute per monitor-environment** — excess are dropped silently

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Monitor not created in Sentry | Provide `monitor_config` — monitors are not auto-created without it (unless Celery Beat) |
| MISSED alerts firing too early | Increase `checkin_margin` to allow for job startup time |
| TIMEOUT alerts on slow jobs | Increase `max_runtime` or send periodic `IN_PROGRESS` heartbeats |
| Duplicate check-ins for Celery tasks | Remove `@monitor` decorator from tasks that use `monitor_beat_tasks=True` |
| Async `@monitor` not working | Upgrade SDK to ≥ 1.44.1 |
