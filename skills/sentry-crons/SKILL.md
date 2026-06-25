---
name: sentry-crons
description: Cron and recurring-job monitoring concepts and best practices for Sentry. Covers check-in lifecycle, choosing between SDK / HTTP / CLI check-ins, and monitor config — the WHAT and WHY. The platform SDK skill handles the HOW.
license: Apache-2.0
category: add-signal
parent: sentry-add-signal
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Add a Signal](../sentry-add-signal/SKILL.md) > Crons

# Cron Monitoring — What & Why

> **Stub — flesh out.** Strategy/best-practice layer. The platform's `sentry-<platform>-sdk` skill
> is the source of truth for the actual code; enter it scoped to "crons".

## What it is

Monitoring for scheduled jobs — detects missed runs, timeouts, and failures via **check-ins**
(`in_progress` → `ok`/`error`). The *monitor* itself (schedule, margins) is config; the *check-ins*
are code. (See also [`sentry-monitors`](../sentry-monitors/SKILL.md) for the monitor side.)

## When to reach for it

- You have cron jobs / scheduled tasks / queue workers that must run on time, and silent failure
  is dangerous.

## Best practices

- **Pick the right check-in path:** SDK decorator/`withMonitor` (cleanest if a Sentry SDK is
  present), HTTP check-in (any language, shell crontabs), or `sentry-cli` (CI/shell wrappers).
- **Set `maxRuntime` and `checkinMargin`** to match the job's real timing so you catch hangs
  without false alarms.
- **Wrap the whole job** so both success and failure report — a job that only sends `ok` never
  alerts on crashes.
- Use a stable, descriptive **monitor slug**.

## How

Read the platform SDK skill scoped to crons, or use the HTTP/CLI check-in path for non-SDK jobs.

## Verify

Confirm a check-in lands with [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md).
