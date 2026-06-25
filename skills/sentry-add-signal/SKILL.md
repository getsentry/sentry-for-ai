---
name: sentry-add-signal
description: Add telemetry to a project that already has Sentry — tracing, logging, metrics, cron monitoring, profiling, session replay, user feedback, and AI/LLM monitoring. Use when a user with Sentry already installed wants to capture more than errors.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Add a Signal

The project already reports errors to Sentry. This page helps you add more telemetry: tracing,
logs, metrics, crons, profiling, session replay, user feedback, or AI/LLM monitoring.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing
critical details.

    curl -sL https://skills.sentry.dev/sentry-tracing/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not
guess or shorten URLs.

## Two layers — keep them separate

- **WHAT / WHY (this page's concept skills)** — platform-agnostic best practices: what a signal
  is, when to reach for it, what's worth instrumenting, sampling strategy, and pitfalls (e.g. PII
  in logs). These do **not** contain platform code.
- **HOW (the SDK skill)** — the platform's `sentry-<platform>-sdk` skill is the source of truth
  for the actual code. Enter it **scoped to the requested capability** ("the user wants tracing —
  jump to that capability, don't re-run full setup").

Typical flow: (optionally) read the concept skill for the WHAT/WHY → then the SDK skill for the
HOW → then verify. Don't force the concept skill when the user just says "add tracing, pick sane
defaults."

## Start Here — Read This Before Doing Anything

> **Prompting tip:** When presenting the choices below, use your harness's built-in interactive
> prompt or multiple-choice tool if one is available (for example a question/selection UI) — it
> gives the user a clearer, faster way to choose than free-form text. Otherwise, list the options
> plainly and wait for their reply.

1. **Confirm Sentry is already set up.** If there's no `Sentry.init`/SDK present, this is
   first-time setup — use [`sentry-sdk-setup`](../sentry-sdk-setup/SKILL.md) instead.
2. **If the user doesn't know which signal they need** (log vs. span vs. metric, "what should I
   instrument here"), use the **Which signal?** decision section below first.
3. **Detect the platform**, then read the matching `sentry-<platform>-sdk` skill scoped to the
   chosen capability.
4. **Verify.** After instrumenting, load
   [`sentry-verify-instrumentation`](../sentry-verify-instrumentation/SKILL.md) to confirm the new
   signal actually lands in Sentry.

---

## Which signal? (decide first)

Errors, traces, logs, and metrics overlap enough that the choice is rarely obvious — but each
answers a **different question** and feeds a **different workflow**. Decide *what* to emit here;
the concept + SDK skills handle *how*.

| Signal | The question it answers |
|--------|-------------------------|
| **Error** | "What just broke?" — a stack trace, grouped into an Issue with an owner. If code threw, it's an error. |
| **Trace / span** | "Where did the time go / did the request flow as expected?" — mostly auto-instrumented. |
| **Log** | "What was true at this point, and why?" — one request's state as a structured event. |
| **Metric** | "How's this trending over time?" — counters/gauges/distributions to chart and alert on. |

Tiebreakers for the common overlaps:

- **Span attribute vs. metric?** Context about *one request's flow* you want while reading that
  trace → span attribute. A value you want to chart/alert/slice across *all* requests → metric.
- **Log vs. span?** Span = the timed node (where/how long). Log = the decision-point state inside
  it (what was true and why).
- **Log vs. metric?** Log finds the one request that went wrong (needle); metric counts how many
  did (haystack). Don't derive a rate by counting logs.
- **Error vs. log?** Needs a stack trace and an owner → error. Unexpected-but-handled → log.

Sampling falls out of the question: traces are sampled (`tracesSampleRate`), errors captured by
default, **logs and metrics are not sampled — filter instead** (`beforeSendLog`/`beforeSendMetric`).

Full reasoning and a request-handler instrumented end-to-end (Python + JS):
[`references/choosing-signals.md`](references/choosing-signals.md) and
[`references/instrumentation-examples.md`](references/instrumentation-examples.md).

---

## Signal Skills

| Signal | Skill | Path |
|---|---|---|
| Tracing / performance — what to instrument, sampling strategy | [`sentry-tracing`](../sentry-tracing/SKILL.md) | `sentry-tracing/SKILL.md` |
| Logging — structured, trace-connected logs; what to log | [`sentry-logging`](../sentry-logging/SKILL.md) | `sentry-logging/SKILL.md` |
| Metrics — counters/gauges/distributions; which KPIs | [`sentry-metrics`](../sentry-metrics/SKILL.md) | `sentry-metrics/SKILL.md` |
| Cron / recurring job monitoring (code check-ins) | [`sentry-crons`](../sentry-crons/SKILL.md) | `sentry-crons/SKILL.md` |
| Profiling — code-level performance sampling | [`sentry-profiling`](../sentry-profiling/SKILL.md) | `sentry-profiling/SKILL.md` |
| Session Replay — reproduce user sessions (browser/mobile) | [`sentry-session-replay`](../sentry-session-replay/SKILL.md) | `sentry-session-replay/SKILL.md` |
| User Feedback — widget / API / crash-report modal | [`sentry-user-feedback`](../sentry-user-feedback/SKILL.md) | `sentry-user-feedback/SKILL.md` |
| AI / LLM monitoring — OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI | [`sentry-setup-ai-monitoring`](../sentry-setup-ai-monitoring/SKILL.md) | `sentry-setup-ai-monitoring/SKILL.md` |

Each concept skill explains the WHAT/WHY and points you into the platform's SDK skill for the HOW.
Trust the skills — read them carefully and follow them.

---

Looking for first-time setup, debugging, or monitors/alerts instead? See the
[full Skill Tree](../../SKILL_TREE.md).
