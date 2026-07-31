---
name: sentry-feature-setup
description: Configure specific Sentry features beyond basic SDK setup. Use when asked to set up OpenTelemetry pipelines, create alerts and notifications, or set up Sentry Snapshots.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Feature Setup

Configure specific Sentry capabilities beyond basic SDK setup — OpenTelemetry pipelines, alerts, and Sentry Snapshots. This page helps you find the right feature skill for your task.

## Start Here — Read This Before Doing Anything

**Do not skip this section.** Do not assume which feature the user needs. Ask first.

1. If the user mentions **OpenTelemetry, OTel Collector, or multi-service telemetry routing** → `sentry-otel-exporter-setup`
2. If the user mentions **alerts, notifications, on-call, Slack/PagerDuty/Discord integration, or workflow rules** → `sentry-create-alert`
3. If the user mentions **Apple/Cocoa snapshot testing or Sentry Snapshots for Apple platforms** — SnapshotPreviews, Apple Snapshots, Cocoa snapshots, Xcode snapshot testing, Swift previews for Sentry Snapshots, iOS, macOS, tvOS, watchOS, or visionOS → `sentry-snapshots-cocoa`.

When unclear, **ask the user** which feature they want to configure. Do not guess.

> Instrumenting a signal — tracing/spans, logging, metrics, AI/LLM monitoring, or deciding what to emit — is part of the standalone `sentry-instrument` skill.

---

## Feature Skills

| Feature | Skill |
|---|---|
| Sentry Snapshots for Apple/Cocoa — upload Apple snapshot images to Sentry; prefer SnapshotPreviews when Swift previews exist | [`sentry-snapshots-cocoa`](../sentry-snapshots-cocoa/SKILL.md) |
| OpenTelemetry Collector with Sentry Exporter — multi-project routing, automatic project creation | [`sentry-otel-exporter-setup`](../sentry-otel-exporter-setup/SKILL.md) |
| Alerts via workflow engine API — email, Slack, PagerDuty, Discord | [`sentry-create-alert`](../sentry-create-alert/SKILL.md) |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust the skill — read it carefully and follow it. Do not improvise or take shortcuts.

---

Looking for SDK setup or debugging workflows instead? See the [full Skill Tree](../../SKILL_TREE.md).
