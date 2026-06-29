# Monitors → Issues → Alerts — The Model

## The model

Sentry's detection-and-response pipeline has three stages:

```
Monitors  →  Issues  →  Alerts
(detect)     (the unit   (act:
             of work)     notify / ticket / webhook)
```

- A **Monitor** decides *when* a signal becomes an **issue**. It focuses on *when something is
  a problem*.
- An **Issue** is the unit you triage — created (or updated) by a Monitor.
- An **Alert** decides *what to do next* once an issue matches its conditions — notify Slack,
  email a team, open a Jira ticket, hit a webhook. It focuses on *response*.

Keep this separation straight: **Monitors detect; Alerts respond.** They're configured
independently, and one alert can watch many monitors/projects (and one monitor can feed
several alerts for different teams/environments).

> Terminology note: what used to be called a "metric **alert**" is now a Metric **Monitor**
> in this model. "Alert" now specifically means the act-on-issues stage.

## Monitors — when a signal becomes an issue

Two families:

- **Default monitors** — auto-created per project from your SDK integration: the error
  detection / issue-grouping pipeline (Issue Stream, Error grouping rules) that turns
  incoming errors and detected performance problems into issues. Nothing to set up; worth
  understanding that this is "a monitor" in the model.
- **Custom monitors** — things you explicitly watch on top of default error detection:
  - **Metric Monitor** — a threshold on errors / spans / logs / releases / custom app
    metrics. The threshold can be **fixed**, a **percentage change** vs. a prior window, or
    **dynamic anomaly detection**. Often created straight from a saved Discover or
    Metrics-Explorer query (save-query-as → monitor).
  - **Cron Monitor** — a scheduled-job watch; the check-in code is an SDK signal (see
    [`crons.md`](crons.md)).
  - **Uptime Monitor** — periodic HTTP checks against a URL.
  - **Mobile Build Monitor** — app-size thresholds on builds.

**Monitor config also sets issue attributes at creation** — priority, auto-resolve behavior,
and assignee. (Ownership rules can override the assignee.) So the monitor is where you decide
not just *that* something becomes an issue, but *how important* it is and *who owns it*.

## Issues — the triage unit

Whatever the source, the output is an **issue**: a grouped, stateful object with a status
(`unresolved` / `resolved` / `archived`), a priority, an assignee, and a history. The whole
point of monitors is to produce well-shaped issues; the whole point of alerts is to act on
their state changes.

## Alerts — acting on issues

An alert is **sources → triggers → filters → actions**:

- **Sources** — which projects or monitors this alert watches.
- **Triggers** — which issue-state changes fire it (new issue, regression, reappearance,
  resolved, …).
- **Filters** — conditions the issue/event must match before actions run (priority ≥ High,
  event frequency, tags, assignment, level, age, …).
- **Actions** — what happens (Slack, email, PagerDuty, Discord, Jira, webhook).

## When to reach for what

- *"Tell me when a new issue shows up in Slack"* → an **Alert** (new-issue trigger → Slack
  action). The default error monitor already creates the issues.
- *"Alert when error rate / latency / a custom metric crosses a line"* → a **Metric Monitor**
  (then an alert on the issue it creates).
- *"My nightly job didn't run"* → a **Cron Monitor**.
- *"Is my endpoint up?"* → an **Uptime Monitor**.

## Coverage honesty

Alert creation is automatable via Sentry's workflow-engine API. Several monitor types are
heavier UI/API hand-offs today (uptime, dashboards) — be upfront about what the agent can do
end-to-end versus where it walks the user through the UI. The MCP can generally only **read**
alert rules, which is still useful for verifying after creation.

## Related

- [`crons.md`](crons.md) · [`metrics.md`](metrics.md) · [`releases.md`](releases.md)
- [`search-query-language.md`](search-query-language.md) — monitors and alerts are authored on
  this grammar.
