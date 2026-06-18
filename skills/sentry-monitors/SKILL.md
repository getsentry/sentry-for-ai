---
name: sentry-monitors
description: Set up Sentry's Monitors and alerts — alert rules and notifications (Slack, PagerDuty, Discord, email), uptime monitors, metric alerts, and dashboards. Use when a user wants to be notified about errors, cron failures, uptime failures, or metric thresholds, or wants to visualize their data.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Monitors & Alerts

Sentry's **Monitors** umbrella plus alerting: get notified when something goes wrong (errors,
cron failures, uptime failures, metric thresholds) and visualize your data in dashboards.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing
critical details.

    curl -sL https://skills.sentry.dev/sentry-create-alert/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not
guess or shorten URLs.

## Start Here — Read This Before Doing Anything

> **Prompting tip:** When presenting the choices below, use your harness's built-in interactive
> prompt or multiple-choice tool if one is available (for example a question/selection UI) — it
> gives the user a clearer, faster way to choose than free-form text. Otherwise, list the options
> plainly and wait for their reply.

Be honest about coverage. Today only alert creation is fully automated (via the Sentry API);
uptime monitors, metric alerts, and dashboards are largely configured in the Sentry UI. When the
agent can't set something up end-to-end yet, say so plainly and offer to read the Sentry docs and
walk the user through the UI.

Note: **cron monitoring** has two halves — the *monitor* config lives here, but the *code
check-ins* are an [Add a Signal](../sentry-add-signal/SKILL.md) capability
([`sentry-crons`](../sentry-crons/SKILL.md)).

---

## Monitor & Alert Skills

| Monitor / Alert | Skill | Path |
|---|---|---|
| Alert rules & notifications (Slack, PagerDuty, Discord, email) | [`sentry-create-alert`](../sentry-create-alert/SKILL.md) | `sentry-create-alert/SKILL.md` |
| Uptime monitoring for a URL | [`sentry-uptime`](../sentry-uptime/SKILL.md) | `sentry-uptime/SKILL.md` |
| Metric alerts (thresholds, anomaly detection) | [`sentry-metric-alerts`](../sentry-metric-alerts/SKILL.md) | `sentry-metric-alerts/SKILL.md` |
| Dashboards — visualize errors, spans, logs, releases | [`sentry-dashboards`](../sentry-dashboards/SKILL.md) | `sentry-dashboards/SKILL.md` |

Each skill contains its own prerequisites and step-by-step instructions. Trust the skill — read it
carefully and follow it.

---

Looking for first-time setup, adding signals, or debugging instead? See the
[full Skill Tree](../../SKILL_TREE.md).
