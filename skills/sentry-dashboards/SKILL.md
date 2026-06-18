---
name: sentry-dashboards
description: Create and configure Sentry dashboards to visualize errors, spans, logs, and releases. Use when a user wants custom charts or prebuilt dashboards. Configured in the Sentry UI; the agent's leverage is enabling the upstream data.
license: Apache-2.0
category: monitors
parent: sentry-monitors
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Monitors & Alerts](../sentry-monitors/SKILL.md) > Dashboards

# Dashboards

> **Stub — flesh out.**

## What this is

Visualize error/perf/log/release data — custom dashboards via the Widget Builder, prebuilt
dashboards (Frontend, Backend, Mobile, AI), and a widget library.

## The agent's real leverage

Dashboards are pure visualization with no code of their own — **the data lives upstream in the
SDK.** The most useful thing the agent does is enable the instrumentation each dashboard needs
(tracing, web vitals, cache/queue spans, mobile perf, AI-agent spans), via
[`sentry-add-signal`](../sentry-add-signal/SKILL.md).

## Honesty about coverage

Dashboard creation itself is a Sentry UI task today. Be upfront and offer to walk the user through
it, while setting up the upstream signals the dashboard depends on.
