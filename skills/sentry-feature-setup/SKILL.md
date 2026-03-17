---
name: sentry-feature-setup
description: Configure specific Sentry features beyond basic SDK setup. Use when asked to monitor AI/LLM calls, set up OpenTelemetry pipelines, or create alerts and notifications.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Feature Setup

Configure specific Sentry capabilities beyond basic SDK setup — AI monitoring, OpenTelemetry pipelines, and alerts. This page helps you find the right feature skill for your task.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing critical details.

    curl -sL https://skills.sentry.dev/sentry-setup-ai-monitoring/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not guess or shorten URLs.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which feature the user needs. Ask first.

1. If the user mentions **AI monitoring, LLM tracing, or instrumenting an AI SDK** (OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI, Pydantic AI) → `sentry-setup-ai-monitoring`
2. If the user mentions **OpenTelemetry, OTel Collector, or multi-service telemetry routing** → `sentry-otel-exporter-setup`
3. If the user mentions **alerts, notifications, on-call, Slack/PagerDuty/Discord integration, or workflow rules** → `sentry-create-alert`
4. If the user mentions **Claude Code monitoring, tracking Claude Code usage, or Claude Code observability** → `sentry-setup-claude-code-monitoring`

When unclear, **ask the user** which feature they want to configure. Do not guess.

---

## Feature Skills

| Feature | Skill | Path |
|---|---|---|
| AI/LLM monitoring — instrument OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI, Pydantic AI | [`sentry-setup-ai-monitoring`](../sentry-setup-ai-monitoring/SKILL.md) | `sentry-setup-ai-monitoring/SKILL.md` |
| OpenTelemetry Collector with Sentry Exporter — multi-project routing, automatic project creation | [`sentry-otel-exporter-setup`](../sentry-otel-exporter-setup/SKILL.md) | `sentry-otel-exporter-setup/SKILL.md` |
| Alerts via workflow engine API — email, Slack, PagerDuty, Discord | [`sentry-create-alert`](../sentry-create-alert/SKILL.md) | `sentry-create-alert/SKILL.md` |
| Monitor Claude Code sessions — tool calls, tokens, cost in AI Agents dashboard | [`sentry-setup-claude-code-monitoring`](../sentry-setup-claude-code-monitoring/SKILL.md) | `sentry-setup-claude-code-monitoring/SKILL.md` |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or debugging workflows instead? See the [full Skill Tree](../../SKILL_TREE.md).
