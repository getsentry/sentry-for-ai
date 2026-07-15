---
name: sentry-instrumentation-guide
description: Decide which Sentry signal to reach for when instrumenting code — error, span, span attribute, log, or metric. Use when adding instrumentation and unsure whether something should be a log vs a span vs a metric, when deciding "what to instrument where", when reviewing instrumentation for gaps, or when a coding agent needs a rule for choosing between errors, traces, logs, and metrics. This skill decides WHAT to emit; the sentry-*-sdk skills handle HOW to set each pillar up.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Instrumentation Guide

# Sentry Instrumentation Guide: When to Reach for What

Errors, traces, logs, and metrics are the four kinds of telemetry most apps run on, and they
overlap enough that the choice is rarely obvious. You can stuff context into a span attribute
instead of logging it. You can count log lines instead of emitting a metric. You can add a
duration to a log and call it a span.

But each signal exists because it answers a **different question** and feeds a **different
workflow** once it lands. Reaching for the wrong one means the data is technically there but
useless for the job you actually have later. This skill is the decision framework: given a value
or an event in front of you, which signal should carry it, and why.

It decides **what** to emit. For **how** to turn each pillar on for a given stack, hand off to the
`sentry-*-sdk` skills and `sentry-setup-ai-monitoring`.

## Invoke This Skill When

- You're instrumenting a piece of code and unsure whether something should be a log, a span, a
  span attribute, or a metric
- You're deciding "what to instrument where" across a service or request handler
- You're reviewing existing instrumentation for gaps (e.g. an error feed that's empty while users
  report problems)
- A coding agent needs a consistent rule for choosing between errors, traces, logs, and metrics

**Important:** The SDK APIs and code samples here are illustrative. Verify exact signatures and
minimum versions against [docs.sentry.io](https://docs.sentry.io) and the relevant `sentry-*-sdk`
skill before implementing.

## The Four Signals, One Question Each

| Signal | The question it answers | Docs |
|--------|-------------------------|------|
| **Errors** | "What just broke?" — a stack trace and exception type, grouped into a deduplicated Issue that gets assigned and tracked to resolution. If your code threw, it's an error. | [Issues](https://docs.sentry.io/product/issues/) |
| **Traces** | "Did the request flow the way it was supposed to?" — a waterfall of timed spans. Mostly auto-instrumented. | [Trace Explorer](https://docs.sentry.io/product/explore/trace-explorer/) |
| **Logs** | "What was true at this point in the code, and why?" — the system's state at one moment as a structured event: config, flags, inputs/outputs, the decision that was made. | [Logs](https://docs.sentry.io/product/explore/logs/) |
| **Metrics** | "How's this trending over time?" — counters, gauges, distributions you can slice by attribute and chart, alert on, or compare across a deploy. | [Metrics](https://docs.sentry.io/product/explore/metrics/) |

A useful mental split: a **log is one request's story** (the needle), a **metric is the aggregate**
(whether the haystack is normal), a **trace is where the time went**, and an **error is the thing
that needs a stack trace and an owner**.

## The Decision Table

Use this as a gut check:

| What you want to know | Reach for |
|-----------------------|-----------|
| Something crashed, show the stack trace | **Error** |
| How long did this take? Which step is slow? | **Traces / Spans** |
| Did the request flow through the steps I expected? | **Traces / Spans** |
| What was the state when the code made this decision? | **Log** |
| What did this function receive and return? | **Log** |
| How often does X happen? Is the rate normal? | **Metric** |
| Did something change after the deploy? | **Metric** |

## Resolving the Overlaps

The same value can legitimately appear in more than one signal. These four tiebreakers cover almost
every real case. (Full reasoning, gotchas, and the "why not just log everything / emit one wide
event?" arguments live in [`references/choosing-signals.md`](references/choosing-signals.md).)

- **Span attribute or metric?** Context about *one request's flow* that you want while reading that
  trace → **span attribute** (it rides on the span in the waterfall). A standalone value you want
  to chart, alert on, or slice over time across *all* requests → **metric**. The same number can
  warrant both: `candidate_count` on the span to read one request, `recommendations.served` as a
  metric to watch the rate.
- **Log or span?** The span is the timed node in the flow (mostly auto-instrumented, you rarely
  write it). The log is the decision-point state *inside* that node (you always write it on
  purpose). Span answers *where* and *how long*; log answers *what was true and why*.
- **Log or metric?** A log finds the one specific request that went wrong (the needle). A metric
  tells you how many requests went wrong (the haystack). Don't derive a rate by counting log lines —
  emit the metric directly.
- **Error or log?** Needs a stack trace and should be tracked as an Issue → **error**. An
  unexpected-but-handled condition worth recording → **log**. Truly non-critical with a traceback →
  `logger.warning(exc_info=True)` keeps the trace in logs without creating noise in the error feed.

## Sampling vs Filtering — Match Retention to the Question

Each signal's retention falls out of the question it answers:

- **Traces are sampled.** You don't need every request to understand where time goes, so keep a
  representative slice via `traces_sample_rate` (higher in dev, lower in production).
- **Errors are captured by default.** No sampling to think about for the baseline.
- **Logs and metrics are NOT sampled.** You keep every one and *filter* instead, with
  `before_send_log` and `before_send_metric`. This is the point: the whole reason for a log is to
  find the one rare request that went sideways, and you can't find what you sampled away.

(For the exact sampling and filtering config in your language, see the matching SDK skill's
`references/tracing.md` and `references/metrics.md`.)

Because all four signals come from one SDK, they share a `trace_id` and correlate on their own —
every log and metric is tied to its trace, so you can drill from a metric spike straight into the
samples behind it.

## What Deliberate Instrumentation Looks Like

Roughly 80% of spans are auto-instrumented by your framework and database integrations — you write
almost none of them. The deliberate work is the other 20%: a span attribute or two to enrich the
flow, a decision-point log, and a metric, placed at the spots where your code makes a choice worth
questioning later.

[`references/instrumentation-examples.md`](references/instrumentation-examples.md) walks through a
single request handler instrumented end to end, in both **Python** and **JavaScript/TypeScript**,
showing the span attribute, the log, and the metric side by side on the same decision.

## Handing Off to Setup

This skill tells you *what* to emit. To actually wire a pillar up:

- **Install the SDK and turn on tracing, logs, and metrics** → the matching `sentry-<platform>-sdk`
  skill (e.g. `sentry-python-sdk`, `sentry-nextjs-sdk`, `sentry-node-sdk`). Each has per-feature
  reference files for tracing, logging, metrics, and more.
- **Instrument LLM / agent calls** → `sentry-setup-ai-monitoring`.

Logs and metrics are the two pillars most projects haven't turned on yet, and both are included on
every plan. If they aren't enabled, route to the SDK skill first, then come back here to decide
what to put where.
