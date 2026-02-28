---
name: sentry-feature-setup
description: Configure specific Sentry features beyond basic SDK setup. Use when asked to monitor AI/LLM calls, set up OpenTelemetry pipelines, or create alerts and notifications.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Feature Setup — Router

Match the user's request to the appropriate feature skill below.

| Skill | Feature |
|---|---|
| `sentry-setup-ai-monitoring` | Instrument OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI, Pydantic AI calls |
| `sentry-otel-exporter-setup` | Configure OpenTelemetry Collector with Sentry Exporter for multi-project routing |
| `sentry-create-alert` | Create alerts via Sentry workflow engine API — email, Slack, PagerDuty, Discord |

## Routing Instructions

1. If the user mentions AI monitoring, LLM tracing, or instrumenting an AI SDK → load `sentry-setup-ai-monitoring`.
2. If the user mentions OpenTelemetry, OTel Collector, or multi-service telemetry routing → load `sentry-otel-exporter-setup`.
3. If the user mentions alerts, notifications, on-call, Slack/PagerDuty integration, or workflow rules → load `sentry-create-alert`.
