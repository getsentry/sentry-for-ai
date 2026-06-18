---
name: sentry-metric-alerts
description: Set up Sentry metric alerts. Use when a user wants to alert on a metric threshold, percentage change, or anomaly detection. Related to alert rules in sentry-create-alert.
license: Apache-2.0
category: monitors
parent: sentry-monitors
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Monitors & Alerts](../sentry-monitors/SKILL.md) > Metric Alerts

# Metric Alerts

> **Stub — flesh out.**

## What this is

Alerts that fire when a metric crosses a threshold (absolute, % change, or **dynamic anomaly
detection**) — e.g. error rate, latency, or a custom application metric.

## Relationship to other skills

- General issue/alert rules and notification actions: [`sentry-create-alert`](../sentry-create-alert/SKILL.md).
- The underlying metric must be instrumented first: [`sentry-metrics`](../sentry-metrics/SKILL.md).

## Honesty about coverage

Largely configured in the Sentry UI today. If we can drive it via the alerts/workflow API, build
that here; otherwise be upfront and walk the user through the UI.

## TODO

Determine the API path for metric alerts vs. issue alerts (`sentry-create-alert` uses the
workflow-engine API) and flesh out the steps.
