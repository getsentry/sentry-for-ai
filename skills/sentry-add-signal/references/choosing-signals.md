# Choosing Signals — Deep Dive

The main [SKILL.md](../SKILL.md) gives the decision table and the four tiebreakers. This file is
the reasoning behind them: what each signal is *for*, how to resolve the overlaps when the same
value could go more than one place, why retention differs per signal, and the answer to "can't I
just log everything / emit one wide event and derive the rest?"

## Each Signal, In Depth

### Errors — "What just broke?"

A stack trace and an exception type, grouped into an **Issue** that gets deduplicated, assigned, and
tracked until it's resolved. The defining trait is the workflow: errors aren't just recorded, they
become work items with an owner and a lifecycle.

- **Reach for it when:** code threw an exception, or you have a condition serious enough that it
  *should* halt and be tracked to resolution.
- **Workflow it feeds:** the Issues feed — grouping, assignment, regression detection, alerting on
  new/regressed issues.
- **Gotcha:** a successful request is not an error. A query that returns zero rows succeeded. If
  nothing threw, the error feed will be empty even while users are unhappy — which is exactly the
  case where you need the other three signals.

### Traces and spans — "Did the request flow the way it was supposed to?"

Timed operations nested inside a trace, rendered as a waterfall. This is how you follow a request
across services and see the DB query that dragged, the API call that timed out, the LLM tool call
that took 8 seconds instead of 200ms.

- **Reach for it when:** you want timing, or you want to confirm the request took the path you
  expected.
- **Workflow it feeds:** the trace waterfall — a structured dependency tree with timing on every
  node. Critically, this is a format a coding agent can reason about directly: it can read the
  spans, find work that could run in parallel, and rewrite the code. Hand it the same information
  as a stream of log lines and it has to reconstruct the call graph from timestamps first.
- **Gotcha:** most spans are auto-instrumented (framework + DB integrations). You rarely write one
  by hand — and a clean trace can still hide a quietly wrong outcome. A span tells you the request
  *flowed* as designed; it can't tell you the design just failed this user.

### Logs — "What was true at this point, and why?"

The state of the system at one specific moment, captured as a structured event: config values,
feature flags, the inputs and outputs of a function, the user ID. Logs are the trail through a
function's decision tree — the markers you drop where the code makes a choice, so a human or an
agent can later follow the reasoning. They fill in the *why* once errors and traces have told you
*what* broke and *where* the time went.

- **Reach for it when:** you need to reconstruct one specific request's decisions after the fact,
  especially the request from a support ticket.
- **Workflow it feeds:** searchable structured records you can pull up by `user_id`, `trace_id`, or
  any attribute.
- **Gotcha:** logs are most valuable when they're **wide** — a structured event packed with context
  (the flag that was on, the inputs, the outcome), not a bare one-line string.

### Metrics — "How have the key parts behaved over time?"

Counters, gauges, and distributions, each kept as an individual measurement you can slice by any
attribute and drill from an aggregate back into the samples (and the trace) behind it. Not just
"12,000 checkouts this week," but how that splits by region and how the line moved across the last
deploy.

- **Reach for it when:** you want a rate, a trend, a threshold to alert on, or a number to chart on
  a dashboard. Metrics are a historical signal as much as a right-now one.
- **Workflow it feeds:** charts, dashboards, and alerts — and drill-down from an aggregate into the
  individual samples behind it.
- **Gotcha:** keep attribute cardinality low. High-cardinality attributes (like raw `user_id`)
  degrade backend performance — that level of detail belongs on a log, not a metric dimension.

## The Four Overlaps, In Full

### Span attribute or metric?

If it's context about *one request's flow through the system* and you want it while reading that
trace, it's a **span attribute** — it rides on the span in the waterfall. If it's a standalone value
you want to chart, alert on, or slice over time across *all* requests, it's a **metric**.

The same number can warrant both. `candidate_count` as a span attribute lets you read one request;
`recommendations.served` as a metric lets you watch the rate. One inspects a single flow, the other
watches the aggregate. The rule of thumb: if a value only makes sense in the context of a specific
span, it lives on the span.

### Log or span?

The **span** is the timed node in the flow, and most are auto-instrumented, so you rarely write
them. The **log** is the decision-point state *inside* that node, and you always write it on
purpose. Span answers *where* and *how long*; log answers *what was true and why*.

Why not just attach the decision state as span attributes instead of logging it? Because **traces
are sampled**, and the one request a customer is complaining about usually turns out to be the one
that got sampled out. A span attribute is great for reading a trace you've *found*; it can't help
you *find* one. Logs aren't sampled, so you can always pull up the specific request.

### Log or metric?

A **log** is one request's story — the needle. A **metric** is the aggregate — the question of
whether the haystack is normal. When you want to find the specific request that went wrong, that's a
log. When you want to know how many requests went wrong, that's a metric.

Don't derive a rate by counting log lines: that means paying to store every line just to compute a
number you could have emitted directly and cheaply as a metric. Emit the metric *and* the log when
you need both the rate and the ability to reconstruct individual requests — same decision, two
shapes.

### Error or log?

If it needs a stack trace and should be tracked as an Issue, it's an **error**. If it's an
unexpected-but-handled condition worth recording, it's a **log**. If it's truly non-critical but you
still want the traceback, `logger.warning(exc_info=True)` (Python) captures the traceback into logs
without creating noise in your error feed.

## "Can't I Just Log Everything / Emit One Wide Event?"

There's a popular argument that four signals are overkill: emit one rich, wide event per request and
derive the rest later. It's half right.

**Emit wide, absolutely.** The best version of any signal is a structured event packed with context
(the flag that was on, the user, the inputs and outputs), not a bare number or a one-line string.

**But the shape you emit is the shape you get to work with.** One fat event in a columnar store
charts fine after the fact, but it can't group itself into a deduplicated Issue, render itself as a
waterfall, or fire a real-time alert on a threshold you haven't defined yet. Those are *workflows*,
and each needs its data in a particular shape. The APIs reflect this: the metrics API is built for
counts and measures you'll aggregate, the span API for durations and the shape of a request, the log
API integrates with your structured logging library so the lines you already write become queryable
events.

So emit wide — into the signal whose workflow you actually need. That's why a single decision often
warrants *both* a metric and a log: same decision, same trace, two shapes, because watching a rate
and reconstructing one request are different jobs.

## Why Retention Differs Per Signal

Match the retention to the question:

| Signal | Retention model | Why |
|--------|-----------------|-----|
| Traces | Sampled (`traces_sample_rate`) | A representative slice is enough to understand where time goes, and it's cheaper. Higher rate in dev, lower in production. |
| Errors | Captured by default | The baseline; you want to know about every distinct crash. |
| Logs | Not sampled — filtered with `before_send_log` | The whole point is finding the one rare request that went sideways; you can't find what you sampled away. |
| Metrics | Not sampled — filtered with `before_send_metric` | Aggregates must count every event to be accurate; you drop noisy metrics by name, not by random fraction. |

Because all four come from the same SDK, they share a `trace_id` and correlate automatically: every
log and metric carries the trace it belongs to, so you can jump from a metric spike straight into
the traces and logs behind it without gluing separate tools together.

## A Worked Investigation (Why the Mix Matters)

A storefront serves generic recommendations to a chunk of logged-in users. No exception is thrown
(every `/recommendations/{user_id}` returns 200), so the **error feed is empty**. A **trace** shows
the request flowed exactly as designed — load user, check the `ranking_v2` flag, query the new
table, fall back to popular items — because returning zero rows is a perfectly successful query. A
**metric** (`recommendations.served` tagged by `ranking_version` and `outcome`) reveals the v2
cohort is serving almost nothing but fallbacks and that the drop lines up with the flag rollout —
scope and trigger, without opening a trace. A **log**, pulled up by the `user_id` from the ticket,
finally says *why*: the flag is on, the source table is `recommendations_v2`, `candidate_count` is
0, outcome is fallback — the table shipped but the rows were never backfilled.

No single signal cracked it; each ruled something out. That's the case for instrumenting with the
right signal at each decision point, ahead of time.
