# Sampling Strategy for AI Agent Spans

> Applies to: `@sentry/node` >=9.x (`inheritOrSampleWith`), `sentry-sdk` >=2.x (`traces_sampler`)

## Why AI Spans Need Special Sampling Consideration

An agent run produces a span tree: one root span with child LLM calls, tool executions, and handoffs. Sampling decides at the root — children inherit. If the root is dropped, **every child span is lost**. There is no partial sampling of an agent run.

At any sample rate below 1.0, each dropped trace is an entire agent execution you will never see. For intermittent failures (hallucinations, wrong tool selection, context overflow), you need every run.

**Cost context:** A single LLM API call costs $0.001–$0.10+. The Sentry span event for that call costs a fraction of a cent. The AI workload itself is the expensive part — monitoring cost is negligible by comparison.

## How Head-Based Sampling Works

`tracesSampler` (JS) / `traces_sampler` (Python) only fires on **root spans**. Non-root spans inherit the parent's decision unconditionally.

```
Root span sampled?
├── YES → all child gen_ai.* spans are captured
└── NO  → all child gen_ai.* spans are lost
```

This means you cannot say "sample gen_ai child spans at 100% but the parent HTTP transaction at a lower rate." If the parent is dropped, children are dropped.

### Scenario 1: gen_ai span IS the root

When: standalone agent runs (cron jobs, queue consumers, CLI scripts). The `gen_ai.invoke_agent` or `gen_ai.request` span is the root.

The sampler sees the `gen_ai.*` name/op directly. Match on it and return 1.0.

### Scenario 2: gen_ai spans are CHILDREN of HTTP transactions

When: most web apps. `POST /api/chat` creates an `http.server` root span; `gen_ai.*` spans are children. The sampling decision was already made for the HTTP transaction before any AI code runs.

**Solution:** Identify which HTTP routes trigger AI calls and sample those routes at 1.0.

## JavaScript Configuration

### Pattern 1: Sample AI-related routes and standalone agents at 100%

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
    // Standalone gen_ai root spans (cron, queue consumers)
    if (attributes?.['sentry.op']?.startsWith('gen_ai.') || attributes?.['gen_ai.system']) {
      return 1.0;
    }

    // HTTP routes that serve AI features
    if (name?.includes('/api/chat') || name?.includes('/api/agent') || name?.includes('/api/generate')) {
      return 1.0;
    }

    // Everything else: inherit parent decision or use default rate
    return inheritOrSampleWith(0.2); // adjust to your baseline
  },
});
```

### Pattern 2: AI-heavy app — just sample everything

If AI is the core product (chatbot, agent runtime), keep it simple:

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

## Python Configuration

### Pattern 1: Sample AI-related routes and standalone agents at 100%

```python
def traces_sampler(sampling_context):
    tx_context = sampling_context.get("transaction_context", {})
    op = tx_context.get("op", "")
    name = tx_context.get("name", "")

    # Standalone gen_ai root spans (cron, queue consumers)
    if op.startswith("gen_ai."):
        return 1.0

    # HTTP routes that serve AI features
    if op == "http.server" and any(
        p in name for p in ["/api/chat", "/api/agent", "/api/generate"]
    ):
        return 1.0

    # Honour parent decision in distributed traces
    parent = sampling_context.get("parent_sampled")
    if parent is not None:
        return float(parent)

    return 0.2  # adjust to your baseline


sentry_sdk.init(
    dsn="...",
    traces_sampler=traces_sampler,
)
```

### Pattern 2: AI-heavy app — just sample everything

```python
sentry_sdk.init(
    dsn="...",
    traces_sample_rate=1.0,
)
```

## Decision Guide

| Situation | Recommendation |
|-----------|---------------|
| AI is the core product (chatbot backend, agent runtime) | `tracesSampleRate: 1.0` — sample everything |
| AI is a feature in a larger app (chat endpoint in e-commerce) | Use `tracesSampler` to sample AI routes at 1.0, other routes at your baseline |
| Sample rate is already 1.0 | No change needed — all gen_ai spans are captured |
| Using `tracesSampler` already | Add gen_ai route matching to existing sampler logic |

## Fallback: Metrics and Logs for Unsampled Calls

If 100% trace sampling genuinely isn't feasible (extreme volume, cost constraints), you can still capture the important signal from every AI call using **Metrics** and **Logs**. These are independent of trace sampling — they fire on every invocation regardless of whether the trace was sampled.

### JavaScript — emit metrics on every LLM call

```javascript
import * as Sentry from "@sentry/node";

// After every LLM call, regardless of trace sampling:
Sentry.metrics.distribution("gen_ai.token_usage", result.usage.totalTokens, {
  unit: "none",
  attributes: {
    model: "gpt-4o",
    user_id: user.id,
    endpoint: "/api/chat",
  },
});

Sentry.metrics.distribution("gen_ai.latency", responseTimeMs, {
  unit: "millisecond",
  attributes: { model: "gpt-4o" },
});

Sentry.metrics.count("gen_ai.calls", 1, {
  attributes: {
    model: "gpt-4o",
    status: result.error ? "error" : "success",
  },
});
```

### JavaScript — log every LLM call

```javascript
Sentry.logger.info(
  Sentry.logger.fmt`LLM call to ${model}: ${inputTokens} in, ${outputTokens} out`,
  {
    model: "gpt-4o",
    user_id: user.id,
    input_tokens: result.usage.promptTokens,
    output_tokens: result.usage.completionTokens,
    latency_ms: responseTimeMs,
  }
);
```

### Python — emit metrics on every LLM call

```python
import sentry_sdk

# After every LLM call:
sentry_sdk.metrics.distribution(
    "gen_ai.token_usage",
    result.usage.total_tokens,
    attributes={
        "model": "gpt-4o",
        "user_id": str(user.id),
        "endpoint": "/api/chat",
    },
)

sentry_sdk.metrics.distribution(
    "gen_ai.latency",
    response_time_ms,
    unit="millisecond",
    attributes={"model": "gpt-4o"},
)

sentry_sdk.metrics.count(
    "gen_ai.calls",
    1,
    attributes={
        "model": "gpt-4o",
        "status": "error" if error else "success",
    },
)
```

### Python — log every LLM call

```python
sentry_sdk.logger.info(
    "LLM call to %s: %d in, %d out",
    model,
    result.usage.prompt_tokens,
    result.usage.completion_tokens,
    attributes={
        "model": "gpt-4o",
        "user_id": str(user.id),
        "input_tokens": result.usage.prompt_tokens,
        "output_tokens": result.usage.completion_tokens,
        "latency_ms": response_time_ms,
    },
)
```

### What this gives you

| Signal | Traces (sampled) | Metrics (100%) | Logs (100%) |
|--------|-------------------|----------------|-------------|
| Full span tree with prompts/responses | Yes | No | No |
| Token usage distributions (p50, p99) | Partial | Yes | No |
| Cost attribution by model/user | Partial | Yes | Yes |
| Error rates by model/endpoint | Partial | Yes | Yes |
| Latency distributions | Partial | Yes | No |
| Searchable per-call records | Yes | No | Yes |

**Best practice:** Use `tracesSampler` to capture 100% of AI routes (preferred). If that's not possible, combine a lower trace sample rate with 100% metrics + logs to maintain full visibility into cost, usage, and error patterns while still having traces for deep debugging when they're captured.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| gen_ai spans not appearing despite sampler returning 1.0 | The parent HTTP transaction was sampled at a lower rate before the AI code ran. Add the triggering route to your sampler. |
| `tracesSampler` not called for gen_ai spans | Expected — `tracesSampler` only runs on root spans. If gen_ai spans are children of an HTTP transaction, the sampler ran on the HTTP span. Sample the route instead. |
| All traces being sampled at 100% | Check the fallback rate in `inheritOrSampleWith()` (JS) or the default return value (Python). It should be your desired baseline, not 1.0. |
| Python `traces_sampler` not seeing `gen_ai.*` op | gen_ai spans from auto-instrumentation are children of framework transactions. Match on the parent HTTP route name instead. |
