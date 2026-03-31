# Sampling Strategy for AI Agent Spans

> `@sentry/node` >=9.x (`inheritOrSampleWith`), `sentry-sdk` >=2.x (`traces_sampler`)

## The Problem

Agent runs are span trees. Sampling decides at the root; children inherit. Drop the root, lose every child span. At any rate below 1.0, you lose entire agent executions.

## How It Works

`tracesSampler` / `traces_sampler` only fires on **root spans**. Non-root spans (including `gen_ai.*` children) inherit unconditionally.

**Scenario 1: gen_ai span IS the root** (cron, queue consumer, CLI). The sampler sees `gen_ai.*` directly. Match and return 1.0.

**Scenario 2: gen_ai spans are children of HTTP transactions** (most web apps). `POST /api/chat` is sampled before any AI code runs. Solution: sample AI routes at 1.0.

## JavaScript

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
    // Standalone gen_ai root spans
    if (attributes?.['sentry.op']?.startsWith('gen_ai.') || attributes?.['gen_ai.system']) {
      return 1.0;
    }
    // HTTP routes that trigger AI calls
    if (name?.includes('/api/chat') || name?.includes('/api/agent')) {
      return 1.0;
    }
    return inheritOrSampleWith(0.2); // adjust to your baseline
  },
});
```

## Python

```python
def traces_sampler(sampling_context):
    tx = sampling_context.get("transaction_context", {})
    op, name = tx.get("op", ""), tx.get("name", "")

    if op.startswith("gen_ai."):
        return 1.0
    if op == "http.server" and any(p in name for p in ["/api/chat", "/api/agent"]):
        return 1.0

    parent = sampling_context.get("parent_sampled")
    if parent is not None:
        return float(parent)
    return 0.2

sentry_sdk.init(dsn="...", traces_sampler=traces_sampler)
```

If AI is the core product, skip `tracesSampler` and use `tracesSampleRate: 1.0`.

## Fallback: Metrics + Logs

If 100% tracing isn't feasible, emit metrics and logs on every LLM call (independent of trace sampling):

```python
# Metrics - 100% coverage of cost/usage/latency
sentry_sdk.metrics.distribution("gen_ai.token_usage", usage.total_tokens,
    attributes={"model": model, "user_id": str(user.id)})
sentry_sdk.metrics.count("gen_ai.calls", 1,
    attributes={"model": model, "status": "error" if error else "success"})

# Logs - 100% searchable per-call records
sentry_sdk.logger.info("LLM call", model=model, input_tokens=usage.prompt_tokens,
    output_tokens=usage.completion_tokens, latency_ms=response_time_ms)
```

JS equivalent uses `Sentry.metrics.*` and `Sentry.logger.*` with the same attribute patterns.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| gen_ai spans missing despite sampler returning 1.0 | Parent HTTP transaction was sampled at a lower rate. Add the route to your sampler. |
| `tracesSampler` not called for gen_ai spans | Expected. It only runs on root spans. Sample the parent HTTP route instead. |
| All traces at 100% | Check the fallback rate in `inheritOrSampleWith()` / default return value. |
