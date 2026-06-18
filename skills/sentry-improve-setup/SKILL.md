---
name: sentry-improve-setup
description: Improve an existing Sentry setup — readable stack traces (source maps / debug files), releases with suspect commits and deploy tracking, data scrubbing / PII, reducing event volume and quota, enabling Sentry's AI code review, SDK upgrades, span streaming, and OpenTelemetry pipelines. Use when Sentry works but the user wants it cleaner, cheaper, safer, or more current.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Improve My Setup

Sentry already works — now make it better, cleaner, cheaper, safer, or more current. This page
covers quality fixes, hardening, repo features, and maintenance.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing
critical details.

    curl -sL https://skills.sentry.dev/sentry-source-maps/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not
guess or shorten URLs.

## Start Here — Read This Before Doing Anything

> **Prompting tip:** When presenting the choices below, use your harness's built-in interactive
> prompt or multiple-choice tool if one is available (for example a question/selection UI) — it
> gives the user a clearer, faster way to choose than free-form text. Otherwise, list the options
> plainly and wait for their reply.

Identify what the user wants to improve, confirm before acting, then load the matching skill.
Several of these depend on a connected source-control integration (GitHub/GitLab) the user must
authorize in Sentry — be upfront when a step needs that.

---

## Improvement Skills

| Improvement | Skill | Path |
|---|---|---|
| Stack traces are unreadable → source maps / debug files | [`sentry-source-maps`](../sentry-source-maps/SKILL.md) | `sentry-source-maps/SKILL.md` |
| Releases — suspect commits & deploy tracking | [`sentry-releases`](../sentry-releases/SKILL.md) | `sentry-releases/SKILL.md` |
| Data scrubbing / PII handling | [`sentry-data-scrubbing`](../sentry-data-scrubbing/SKILL.md) | `sentry-data-scrubbing/SKILL.md` |
| Reduce event volume / manage quota (sampling, filters) | [`sentry-reduce-volume`](../sentry-reduce-volume/SKILL.md) | `sentry-reduce-volume/SKILL.md` |
| Turn on Sentry's AI code review & bug prediction | [`sentry-enable-ai-review`](../sentry-enable-ai-review/SKILL.md) | `sentry-enable-ai-review/SKILL.md` |
| Upgrade the Sentry SDK across major versions | [`sentry-sdk-upgrade`](../sentry-sdk-upgrade/SKILL.md) | `sentry-sdk-upgrade/SKILL.md` |
| Migrate to span streaming (JavaScript) | [`sentry-span-streaming-js`](../sentry-span-streaming-js/SKILL.md) | `sentry-span-streaming-js/SKILL.md` |
| Migrate to span streaming (Python) | [`sentry-span-streaming-python`](../sentry-span-streaming-python/SKILL.md) | `sentry-span-streaming-python/SKILL.md` |
| OpenTelemetry Collector with Sentry Exporter | [`sentry-otel-exporter-setup`](../sentry-otel-exporter-setup/SKILL.md) | `sentry-otel-exporter-setup/SKILL.md` |

Each skill contains its own detection logic, prerequisites, and step-by-step instructions. Trust
the skill — read it carefully and follow it.

---

Looking for first-time setup, adding signals, debugging, or monitors/alerts instead? See the
[full Skill Tree](../../SKILL_TREE.md).
