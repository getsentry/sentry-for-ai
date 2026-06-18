---
name: sentry-get-started
description: Guided entry point for using Sentry through your agent. Orients you based on your current setup and routes you into the right Sentry skill — first-time setup, adding telemetry, fixing issues, improving your setup, or monitors and alerts.
---

# Sentry — Get Started

The one place to start with Sentry in your agent. This command orients you, then hands off to the
right skill. Sentry in your agent can do almost everything you'd do in the Sentry web UI.

**Guiding rules:**

- **Orient cheaply, then let the user drive.** Run the quick probe below, then present only the
  relevant options. Do **not** read SDK or feature skills before the user picks a direction —
  that burns their token budget.
- **Used once, but nothing here is a dead end.** Everything this command opens is a normal skill
  the user can invoke again later (e.g. "add logging" → `sentry-add-signal`). You are just a
  friendly first run on top of those skills.
- **Prefer interactive prompts for every choice.** Whenever you offer the user options (the
  account branch, the menu), present them with your harness's built-in multiple-choice / question
  tool (e.g. `AskUserQuestion` in Claude Code) rather than printing a markdown table or numbered
  list. Only fall back to a plain text list if no such tool is available.

## Step 0 — Introduce Sentry, then orient

**Say this first, before you start probing** (keep it short and friendly — a few sentences, not a
lecture). Lead with what Sentry is and why it's useful, then transition into orienting. For
example:

> Sentry is an application monitoring platform. It captures errors and crashes from your code and
> ties each one to the release, request, and exact line that caused it — so you spend less time
> reproducing bugs and more time fixing them. Beyond errors, it also does distributed tracing &
> performance, structured logs, custom metrics, profiling, session replay, cron & uptime
> monitoring, release health, and AI/LLM monitoring — and **Seer**, its AI debugging agent that
> can root-cause issues and propose fixes. Right here in your agent, I can set most of this up
> directly in your code and confirm it's actually working end to end.
>
> Let me take a quick look at your project and Sentry setup so I can point you in the right
> direction…

Then run the orientation probe — gather three cheap signals (don't over-investigate):

1. **Is the Sentry MCP connected & authed?** Try `whoami` / `find_organizations`.
2. **Does this repo already use Sentry?** Grep for `@sentry`, `sentry-sdk`, `sentry_sdk`, or a DSN.
3. **Do they have a Sentry project?** `find_projects` (also confirms auth).

### If the MCP is not authed

Don't assume it's just disconnected — they may not have an account. Ask with your interactive
multiple-choice prompt tool:

- **"I don't have a Sentry account yet"** → point them to https://sentry.io/signup to register,
  then come back and connect the MCP. (No agent flow for signup itself yet.)
- **"I have an account — connect Sentry"** → walk them through `/mcp` to connect and authenticate,
  then continue.

## Step 1 — Route based on the probe

- **Brand-new user** (no Sentry in the repo): **don't show a menu — go straight into first-error
  setup.** Capturing one error is the only job that matters until it works. Surface other options
  *after* the loop is closed.
  → Use the `sentry-sdk-setup` skill. For a brand new user with no project, propose creating one
  with `create_project` (mints the project + DSN in one call) — create it on a yes; never
  silently. Instrument minimal error capture only. Then close the loop with the
  `sentry-verify-instrumentation` skill. Once confirmed, suggest next steps: ship to production,
  add a signal, or improve the setup.

- **Existing user** (Sentry already in the repo): show the relevant slice of the menu below and
  wait for them to choose. Skip "Start monitoring."

## The menu (existing users)

**Present these as a multiple-choice question using your interactive prompt tool (e.g.
`AskUserQuestion`) — not a markdown table.** Offer the relevant options below as the choices; the
user can also just say what they want.

- **Add a signal** — tracing, logging, metrics, crons, profiling, session replay, user feedback,
  AI/LLM monitoring.
  → the `sentry-add-signal` skill

- **Fix something — I have a problem now** — find/triage an issue, root-cause with Seer, resolve
  Sentry bot / Seer PR comments.
  → the `sentry-workflow` skill (or `/seer` for ad-hoc questions about your Sentry environment)

- **Fix something — show me what's possible** — no specific fire; briefly explain how the agent
  can help debug & fix with Sentry (Seer root-cause/autofix, issue triage, `/seer`, automated PR
  review), then point back here when they hit something.

- **Improve my setup** — readable stack traces (source maps), releases & suspect commits, data
  scrubbing/PII, reducing volume/quota, enabling Sentry's AI code review, SDK upgrades, span
  streaming, OpenTelemetry.
  → the `sentry-improve-setup` skill

- **Monitors & alerts** — alert rules & notifications, uptime, metric alerts, dashboards. Some of
  this is configured in the Sentry UI today; be honest and offer to walk them through it.
  → the `sentry-monitors` skill

## Honesty about coverage

The goal is for the agent to do anything you'd do in the Sentry web UI. Some of that isn't built
yet. When a user asks for something the agent can't do end-to-end, say so plainly and offer the
best fallback: *"The agent can't set this up directly yet, but I can read the Sentry docs and walk
you through doing it in the UI."* Never silently pretend it's a UI-only task.

## MCP unavailable

If the Sentry MCP tools aren't available, tell the user to connect it with `/mcp`, then re-run
`/sentry-get-started`.
