# Monitors → Issues → Alerts — The Model

Sentry separates **what you detect** from **what you do about it**, in three stages — **Monitors**
detect, **Issues** are the unit you triage, and **Alerts** respond:

- A **Monitor** decides *when* a signal becomes an **issue**.
- An **Issue** is the unit you triage — a grouped, stateful object (status, priority, assignee, history).
- An **Alert** decides *what to do* once an issue matches its conditions — notify Slack, page someone,
  open a ticket, hit a webhook.

Monitors detect; Alerts respond. They're configured independently: one alert can watch many
monitors/projects, and one monitor can feed several alerts.

> Terminology: this model uses **Metric Monitor** for the detection stage and reserves **Alert** for the
> response stage. Older docs and integrations still say "metric **alert**" for the same detection
> concept — treat them as the same thing; the rename isn't fully settled across the product.

## Monitors — when a signal becomes an issue

- **Default monitors** — auto-created per project: the **Issue Stream Monitor** and **Error Monitor**
  (the error-detection / grouping pipeline). Nothing to set up; worth knowing they're "monitors" in this
  model.
- **Custom monitors:**
  - **Metric Monitor** — a threshold on errors / spans / logs / releases / Application Metrics; the threshold
    can be **fixed**, a **percentage change** vs. a prior window, or **dynamic anomaly detection**. Often
    created straight from a saved Discover or Metrics-Explorer query.
  - **Cron Monitor** — a scheduled-job watch via check-ins ([`crons.md`](crons.md)).
  - **Uptime Monitor** — periodic HTTP checks against a URL.
  - **Mobile Builds Monitor** — app-size thresholds across iOS/Android builds.

**Monitor config also sets issue attributes at creation** — priority, auto-resolve, and assignee
(ownership rules can override the assignee). The monitor decides not just *that* something becomes an
issue but *how important* it is and *who owns it*.

## Alerts — acting on issues

An alert is **sources → triggers → filters → actions**:

- **Sources** — which projects/monitors it watches.
- **Triggers** — which issue-state changes fire it (new, regression, reappearance, resolved); triggers
  are OR'd.
- **Filters** — conditions the issue/event must match before actions run (priority, frequency, tags,
  assignment, age); filter groups can be ANY or ALL. **If an issue exists but no alert fired, a filter is
  usually why.**
- **Actions** — Slack, email, PagerDuty, Discord, Jira, webhook, …

## When to reach for what

- *"Tell me in Slack when a new issue shows up"* → an **Alert** (the default error monitor already makes
  the issues).
- *"Alert when error rate / latency / a metric crosses a line"* → a **Metric Monitor**, then an alert.
- *"My nightly job didn't run"* → a **Cron Monitor**. *"Is my endpoint up?"* → an **Uptime Monitor**.

## Coverage honesty

Alert creation is automatable via Sentry's workflow-engine API; several monitor types (uptime,
dashboards) are heavier UI/API hand-offs today — be upfront about what the agent can do end-to-end vs.
where it walks the user through the UI. The MCP can generally only **read** alert rules, still useful for
verifying after creation.

## Related

- [`crons.md`](crons.md)
- [`metrics.md`](metrics.md)
- [`releases.md`](releases.md)
- [`search-query-language.md`](search-query-language.md)
