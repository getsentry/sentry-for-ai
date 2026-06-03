# Instrumentation Examples — Span Attribute vs Log vs Metric

One request handler, instrumented end to end, showing the three deliberate signals side by side on
the same decision. The handler loads a user, checks the `ranking_v2` feature flag, queries a
personalized-recommendations table, and falls back to popular items when the query comes back empty.

The route span and the database spans are **auto-instrumented** — you write none of them. What you
place by hand are exactly three things:

- a **span attribute** — context about *this* request's flow, read inside the trace
- a **decision-point log** — the state at the moment the code chose personalized vs. fallback (the
  only signal that records *why*), not sampled, so you can always find this request
- a **metric** — the rate across *all* requests, sliceable by version and outcome

> These examples show the *shape* of deliberate instrumentation, not how to set the SDK up. For
> exact API signatures, the init flags that enable logs and metrics, and current minimum versions,
> follow the matching SDK skill (`sentry-python-sdk`, `sentry-nextjs-sdk`, `sentry-node-sdk`, etc.)
> and its `references/tracing.md`, `references/logging.md`, and `references/metrics.md`. Those are
> the maintained source of truth; this guide intentionally doesn't duplicate them.

## Python (FastAPI)

```python
import sentry_sdk
from sentry_sdk import logger

# The route is auto-instrumented. FastAPI gives you the request span;
# the DB integration gives you a span for every query below. You write none of it.
@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: int):
    user = db.get_user(user_id)                          # auto-instrumented db span
    use_v2 = flag_enabled("ranking_v2", user)
    ranking_version = "v2" if use_v2 else "v1"

    candidates = db.personalized_recs(user_id, version=ranking_version)  # auto db span
    outcome = "personalized" if candidates else "fallback"
    items = candidates or db.popular_items()             # auto db span on the fallback

    # SPAN ATTRIBUTE: context about THIS request's flow, read inside the trace.
    # It rides on the auto-instrumented request span; no new span needed.
    span = sentry_sdk.get_current_span()
    span.set_data("ranking_version", ranking_version)
    span.set_data("recommendation.outcome", outcome)

    # LOG: the trail through the decision tree, the state at the moment the
    # code chose personalized vs. fallback. The only signal that records *why*.
    logger.info(
        "recommendations lookup",
        attributes={
            "user_id": user_id,
            "ranking_version": ranking_version,
            "flag.ranking_v2": use_v2,
            "source_table": f"recommendations_{ranking_version}",
            "candidate_count": len(candidates),
            "outcome": outcome,
        },
    )

    # METRIC: the rate across all requests, sliceable by version and outcome.
    sentry_sdk.metrics.count(
        "recommendations.served",
        1,
        attributes={"ranking_version": ranking_version, "outcome": outcome},
    )

    return items
```

If you *do* want a sub-operation timed in the waterfall (say the ranking step, or a call to an
external recommender), wrap it in a custom span with `sentry_sdk.start_span` (see
`sentry-python-sdk`'s `references/tracing.md` for the full custom-span API):

```python
with sentry_sdk.start_span(op="rank", name="rank_candidates") as span:
    ranked = rank(candidates)
    span.set_data("candidate_count", len(candidates))
```

## JavaScript / TypeScript (Express / Node)

The same three deliberate touches, with the Node SDK. The route and DB spans are auto-instrumented
by the framework and database integrations; logs require `enableLogs: true` at init.

```typescript
import * as Sentry from "@sentry/node";

// The route is auto-instrumented. The framework gives you the request span;
// the DB integration gives you a span for every query below. You write none of it.
app.get("/recommendations/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  const user = await db.getUser(userId);                 // auto-instrumented db span
  const useV2 = flagEnabled("ranking_v2", user);
  const rankingVersion = useV2 ? "v2" : "v1";

  const candidates = await db.personalizedRecs(userId, rankingVersion); // auto db span
  const outcome = candidates.length ? "personalized" : "fallback";
  const items = candidates.length ? candidates : await db.popularItems(); // auto db span

  // SPAN ATTRIBUTE: context about THIS request's flow, read inside the trace.
  // It rides on the auto-instrumented request span; no new span needed.
  Sentry.getActiveSpan()?.setAttributes({
    ranking_version: rankingVersion,
    "recommendation.outcome": outcome,
  });

  // LOG: the state at the moment the code chose personalized vs. fallback.
  // Requires `enableLogs: true` in Sentry.init(). The only signal that records *why*.
  Sentry.logger.info("recommendations lookup", {
    user_id: userId,
    ranking_version: rankingVersion,
    "flag.ranking_v2": useV2,
    source_table: `recommendations_${rankingVersion}`,
    candidate_count: candidates.length,
    outcome,
  });

  // METRIC: the rate across all requests, sliceable by version and outcome.
  Sentry.metrics.count("recommendations.served", 1, {
    attributes: { ranking_version: rankingVersion, outcome },
  });

  res.json(items);
});
```

For a sub-operation you want timed in the waterfall, wrap it in a custom span:

```typescript
const ranked = await Sentry.startSpan(
  { name: "rank_candidates", op: "rank" },
  (span) => {
    span.setAttribute("candidate_count", candidates.length);
    return rank(candidates);
  },
);
```

## Reading the Three Touches

Three deliberate touches, each carrying a piece the others can't:

| Touch | What it carries | When it earns its keep |
|-------|-----------------|------------------------|
| **Span attribute** (`ranking_version`, `outcome`) | Tags this request's flow so the path is right there when you open the trace | While reading a trace you've already found |
| **Log** (`recommendations lookup` + attributes) | What the function decided and *why*, at the instant it decided — never sampled | Pulling up the one request from a support ticket by `user_id` |
| **Metric** (`recommendations.served`) | The outcome counted with enough dimension to slice by version and outcome | Watching the rate, charting it, alerting when it moves after a deploy |

Beyond these, the SDK fills in the rest on its own: frontend SDKs tag everything with browser, OS,
and release; one `setUser()` call follows the user across errors, spans, logs, and metrics; and
because all four come from the same SDK they share a `trace_id` and correlate without any extra
work. See [`choosing-signals.md`](choosing-signals.md) for how to decide which touch a given value
deserves.
