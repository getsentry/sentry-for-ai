# Metrics — Sentry Python SDK

> Minimum SDK: `sentry-sdk` 2.44.0+ · Status: ⚠️ Open beta

## Overview

`sentry_sdk.metrics` provides custom counters, gauges, and distributions. Metrics are enabled by default — no extra `init()` flag needed.

## Metric Types

| Type | API | Use for |
|------|-----|---------|
| Counter | `metrics.count()` | Event occurrences, request counts |
| Distribution | `metrics.distribution()` | Latencies, sizes — supports p50/p90/p95/p99 |
| Gauge | `metrics.gauge()` | Current values (min, max, avg, sum, count — no percentiles) |

## Configuration

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@<org>.ingest.sentry.io/<project>",
    # No extra flag — metrics are on by default
)
```

Optional `before_send_metric` hook:

```python
from typing import Optional

def before_metric(metric, hint) -> Optional[dict]:
    if metric["name"] == "noisy-metric":
        return None                          # drop this metric
    metric["attributes"]["env"] = "prod"    # add attribute
    return metric

sentry_sdk.init(dsn="...", before_send_metric=before_metric)
```

## Code Examples

### Counter — event occurrences

```python
import sentry_sdk

sentry_sdk.metrics.count(
    "button_click",
    1,
    attributes={
        "browser": "Firefox",
        "page": "/checkout",
    },
)

# Increment by more than 1
sentry_sdk.metrics.count("api.request", 5, attributes={"endpoint": "/v2/users"})
```

### Distribution — percentile analysis

Best for latencies, response sizes, durations where p50/p90/p99 matter:

```python
import time
import sentry_sdk

start = time.time()
process_order(order)
duration_ms = (time.time() - start) * 1000

sentry_sdk.metrics.distribution(
    "order.processing_time",
    duration_ms,
    unit="millisecond",
    attributes={"order.type": "subscription", "region": "eu"},
)
```

### Gauge — space-efficient aggregates

Use when high cardinality is a concern; no percentile support:

```python
import sentry_sdk

sentry_sdk.metrics.gauge(
    "queue.depth",
    len(pending_jobs),
    unit="none",
    attributes={"queue": "billing"},
)
```

### All four attribute value types

```python
sentry_sdk.metrics.count(
    "api.request",
    1,
    attributes={
        "endpoint": "/v2/users",     # str
        "method": "POST",
        "success": True,             # bool
        "status_code": 201,          # int
        "latency": 0.042,            # float
    },
)
```

### Unit strings

| Category | Values |
|----------|--------|
| Time | `"nanosecond"`, `"microsecond"`, `"millisecond"`, `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"` |
| Data | `"bit"`, `"byte"`, `"kilobyte"`, `"megabyte"`, `"gigabyte"`, `"terabyte"` |
| Fractions | `"ratio"`, `"percent"` |
| Dimensionless | `"none"` (default when omitted) |

### `before_send_metric` — `Metric` schema

| Key | Type | Description |
|-----|------|-------------|
| `name` | `str` | Metric identifier |
| `type` | `str` | `"counter"` / `"gauge"` / `"distribution"` |
| `value` | `float` | Numeric measurement |
| `unit` | `str \| None` | Unit string |
| `attributes` | `dict` | Custom key-value pairs |
| `timestamp` | `float` | Epoch seconds |
| `trace_id` | `str \| None` | Associated trace ID |
| `span_id` | `str \| None` | Active span ID |

## Best Practices

- Keep attribute cardinality low — avoid user IDs, UUIDs, or timestamps as attribute values
- Use `distribution` over `gauge` when you need percentile analysis
- Prefix metric names with your service name: `"payments.charge_time"` not `"charge_time"`
- Use standard unit strings — Sentry renders them in the UI with proper labels
- Metrics are buffered and flushed periodically — avoid using them for critical alerting requiring sub-second latency

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing | Verify SDK version ≥ 2.44.0; check `debug=True` output |
| Metric dropped silently | Check `before_send_metric` hook; verify metric name contains no special characters |
| High cardinality warning | Reduce attribute values — avoid per-user or per-request identifiers |
| No percentiles in Sentry UI | Switch from `gauge` to `distribution` — gauges do not support percentiles |
