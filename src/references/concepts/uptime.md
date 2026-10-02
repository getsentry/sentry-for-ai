# Uptime Monitoring — What & Why

Monitoring for whether a public URL is up.
Sentry sends an HTTP request to the URL on a fixed interval from its own checker
regions, and opens an issue when the URL stops responding with a success status.
Nothing runs in the app: there is no SDK code to add.
The monitor is server-side config, created through the MCP or the Sentry UI.

Reach for it for **every public endpoint whose downtime users would notice** — the
production site, a public API, a health endpoint.
Errors and traces only arrive while the app is running and receiving traffic; an app
that is down, unreachable, or failing at the edge sends nothing, and uptime is what
notices.

## Creating a monitor

- **The MCP can create, update, and delete uptime monitors.** The tools are
  `create_uptime_monitor`, `update_uptime_monitor`, `delete_uptime_monitor`,
  `find_uptime_monitors`, and `get_uptime_monitor_details`. They are catalog tools:
  reach them through `search_sentry_tools` / `execute_sentry_tool` if they aren’t
  exposed directly. Creating one needs `project:write`.
- **Check first.** Call `find_uptime_monitors` before creating, and update the existing
  monitor for a URL instead of adding a second one.
- **Create it in the project that owns the service**, with `environment` set to the
  production environment name, so uptime issues land next to that service’s errors.
- **Defaults are usually right:** `intervalSeconds=60`, `timeoutMs=5000`, method `GET`.
  An issue opens after 3 consecutive failed checks and resolves after 1 success; raise
  `downtimeThreshold` only for a URL that is known to be flaky.

## Picking the URL

Do this as soon as the app has a production host — usually during setup, since most apps
are already deployed when Sentry is added.
Don’t wait for a later deploy step; the session may end before it.

- **Find the production host, in this order:**
  1. The project’s own production events in Sentry — `search_events` for recent requests
     in the production environment, and read the host from the request URL. This is the
     host real traffic uses.
  2. The deploy setup — the hosting config, the production domain in env vars (`*_URL`,
     `*_SITE_URL`, `*_BASE_URL`), the README, or a deploy section in
     `AGENTS.md`/`CLAUDE.md`.
  3. Ask the user.

  Never monitor `localhost`, a preview deployment, or a host you guessed.

- **Build the URL from the host plus the route.** Account for a `basePath` or path
  prefix, rewrites and proxies, and an API served from a different host than the site.

- **Pick a cheap, public `GET`.** An existing health route (`/health`, `/healthz`,
  `/api/health`) is best: it answers fast, needs no auth, and doesn’t render a page.
  If there isn’t one, the site root is fine for a site; for an API, offer to add a
  minimal health route rather than pointing the check at an expensive or side-effecting
  endpoint.

- **Check it before creating.** Send a `GET` without credentials and confirm a `2xx`.
  Show the user the URL and the result, and create the monitor once they confirm.
  - A health route you just added isn’t deployed yet: monitor a URL that answers today
    (the site root), and suggest switching the monitor to the health route after the
    next deploy.
  - If nothing on the host answers yet, don’t create the monitor — it would open a
    downtime issue right away.
    Tell the user it is the first thing to add once the app is live.
  - If you can’t find or check a URL, ask; don’t guess.

- **One monitor per public service, not per route.** Uptime answers “is it reachable”;
  per-route failures are already errors and spans.
  Add a second monitor only for a separately deployed service (an API on its own host, a
  marketing site next to the app).

## Alerts

- **Usually nothing to set up.** An uptime issue opens as **high priority**, and every
  new project starts with an alert that emails the issue owners (or all active members)
  for new high-priority issues.
  So a new monitor already notifies someone when the URL goes down.
- **Check that the default alert is still there.** Older projects may have edited or
  deleted it: look with `find_alert_rules`. If no alert covers high-priority issues,
  offer to add one.
- **For a different destination** — Slack, PagerDuty, a specific team — use the
  `sentry-create-alert` skill.
  To alert only on downtime, filter on `issue_category` `10` (Outage, which covers
  uptime and cron issues).
  The MCP’s uptime tools don’t configure alerts themselves.

## Why an uptime issue often isn’t in the code

- **Auth and redirects look like downtime.** A URL that returns `401`/`403`, or
  redirects to a login page, fails the check while the app is healthy.
  Monitor a URL that answers anonymously.
- **Firewalls, WAFs, and bot protection can block the checker.** If checks fail while
  the site works in a browser, the requests are likely being blocked; see the
  [troubleshooting docs](https://docs.sentry.io/product/monitors-and-alerts/monitors/uptime-monitoring/troubleshooting/).
- **Look at the trace.** When the app runs a Sentry SDK with tracing, a failing check
  can carry a trace into the app, so the error behind a `5xx` is often on the same trace
  ([uptime tracing](https://docs.sentry.io/product/monitors-and-alerts/monitors/uptime-monitoring/uptime-tracing/)).

## Related

- [`monitors.md`](monitors.md) — an uptime monitor is one kind of Monitor that creates
  issues.
- [`crons.md`](crons.md) — the scheduled-job counterpart: crons notice a job that didn’t
  run, uptime notices a service that isn’t answering.
- [Uptime Monitoring docs](https://docs.sentry.io/product/monitors-and-alerts/monitors/uptime-monitoring/)
