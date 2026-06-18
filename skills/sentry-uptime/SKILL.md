---
name: sentry-uptime
description: Set up Sentry uptime monitoring for a URL. Use when a user wants to be alerted when an endpoint goes down or slow. Largely configured in the Sentry UI today.
license: Apache-2.0
category: monitors
parent: sentry-monitors
disable-model-invocation: true
---

> [All Skills](../../SKILL_TREE.md) > [Monitors & Alerts](../sentry-monitors/SKILL.md) > Uptime

# Uptime Monitoring

> **Stub — flesh out.** Coverage is thin: there is no agent-driven creation path wired up yet.

## What this is

Continuous checks of a URL for availability/latency; downtime becomes an issue with trace context.
If distributed tracing is on, uptime checks also add an uptime request span as the trace root
(automatic, free).

## Honesty about coverage

The agent **can't create an uptime monitor end-to-end yet** — the MCP is read-only for monitors
(`find_monitors` / `get_monitor_details`) and we haven't wired up an API-based creation skill.

Per the get-started honesty rule, say so and offer the fallback: *"I can't create the uptime
monitor directly yet, but I can read the Sentry docs and walk you through it in the UI."* The
config (URL, method, interval, timeout, failure/recovery tolerance) is set in Sentry.

The agent **can** tune the SDK `tracesSampler`/`beforeSend` for uptime-generated traffic if needed.

## TODO

Confirm whether the Sentry API supports creating uptime monitors; if so, build the API-driven flow
here.
