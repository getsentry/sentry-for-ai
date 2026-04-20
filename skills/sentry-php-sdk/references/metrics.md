# Metrics — Sentry PHP SDK

> Minimum SDK versions: `sentry/sentry` ≥ 4.19.0 · `sentry/sentry-laravel` ≥ 4.20.0 · `sentry/sentry-symfony` ≥ 5.8.0
> Status: ⚠️ Open beta

## Overview

Custom metrics (counters, distributions, gauges) are enabled by default — no extra flag required. Use `\Sentry\traceMetrics()` as the entry point.

> **Note:** The old `\Sentry\metrics()` API is **fully deprecated** — all methods are no-ops. Use `\Sentry\traceMetrics()` instead.

## Metric Types

| Type | Method | Aggregations | Use for |
|------|--------|--------------|---------|
| Counter | `count()` | sum | Event occurrences, request counts |
| Distribution | `distribution()` | p90, min, max, avg | Latencies, sizes — supports percentiles |
| Gauge | `gauge()` | min, max, avg, sum, count | Current values — no percentiles |

## Code Examples

### Counter — event occurrences

```php
\Sentry\traceMetrics()->count('button-click', 5, [
    'browser' => 'Firefox',
    'app_version' => '1.0.0',
]);
```

### Distribution — percentile analysis

Best for latencies, response sizes, durations where p90/p99 matter:

```php
use \Sentry\Metrics\Unit;

\Sentry\traceMetrics()->distribution('page-load', 15.0, ['page' => '/home'], Unit::millisecond());
```

### Gauge — space-efficient aggregates

Use when high cardinality is a concern; no percentile support:

```php
use \Sentry\Metrics\Unit;

\Sentry\traceMetrics()->gauge('active-connections', 42.0, ['region' => 'eu-west'], Unit::none());
```

### Flushing manually

Metrics are buffered (up to 1000 entries). Flush explicitly in CLI scripts or when emitting high volumes:

```php
\Sentry\traceMetrics()->flush();
```

### Filtering with `before_send_metric`

**PHP / Laravel:**
```php
use \Sentry\Metrics\Types\Metric;

\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'before_send_metric' => static function (Metric $metric): ?Metric {
        if ($metric->getName() === 'removed-metric') {
            return null;  // drop this metric
        }
        return $metric;
    },
]);
```

**Symfony** (uses service ID, not a closure):
```yaml
sentry:
  options:
    enable_metrics: true
    before_send_metric: 'App\Sentry\BeforeSendMetricCallback'
```

## Units

```php
use \Sentry\Metrics\Unit;

// Duration
Unit::nanosecond()    Unit::microsecond()   Unit::millisecond()
Unit::second()        Unit::minute()        Unit::hour()
Unit::day()           Unit::week()

// Information
Unit::bit()           Unit::byte()
Unit::kilobyte()      Unit::megabyte()      Unit::gigabyte()
Unit::terabyte()

// Fraction
Unit::ratio()         Unit::percent()

// Dimensionless
Unit::none()
```

## Flushing

Metrics are buffered in a ring buffer (capacity: 1000 entries):

| Context | Behavior |
|---------|----------|
| PHP (CLI/scripts) | Call `\Sentry\traceMetrics()->flush()` manually |
| Laravel | Auto-flushed at end of each request or command |
| Symfony (HTTP) | Auto-flushed on `kernel.terminate` |
| Symfony (console) | Auto-flushed on `console.terminate` |

**Buffer limit:** When more than 1000 metrics are buffered, the oldest entries are dropped. Flush periodically in high-volume scripts.

## Auto-Flush Threshold

Use `metric_flush_threshold` to automatically flush buffered metrics after N entries, without needing to call `flush()` manually:

**PHP / Laravel:**
```php
\Sentry\init([
    'dsn' => '___PUBLIC_DSN___',
    'metric_flush_threshold' => 500,  // flush automatically after 500 metrics
]);
```

**Symfony:**
```yaml
sentry:
  options:
    metric_flush_threshold: 500
```

This is useful in CLI scripts or workers that emit metrics continuously. The threshold triggers a flush mid-process so the buffer never fills to its 1000-entry cap.

## Symfony Configuration

```yaml
sentry:
  options:
    enable_metrics: true                      # default: true
    attach_metric_code_locations: true        # attach file/line info
    metric_flush_threshold: 500               # auto-flush after N metrics (optional)
    before_send_metric: 'App\Sentry\BeforeSendMetricCallback'
```

## Automatically Added Attributes

Every metric receives these automatically:

| Attribute | Description |
|-----------|-------------|
| `sentry.environment` | Environment from SDK config |
| `sentry.release` | Release from SDK config |
| `sentry.sdk.name` / `sentry.sdk.version` | SDK metadata |
| `server.address` | Server hostname |
| `user.id`, `user.name`, `user.email` | Active scope user (only if `send_default_pii: true`) |

## Best Practices

- Keep attribute cardinality low — avoid user IDs, UUIDs, or timestamps as attribute values
- Use `distribution` over `gauge` when you need percentile analysis (p90, p99)
- Prefix metric names with your service: `"payments.charge_time"` not `"charge_time"`
- In high-throughput scripts, flush periodically to prevent the buffer from dropping old entries
- Laravel closures in `config/sentry.php` may cause issues with `config:cache` — see [Laravel closures config docs](https://docs.sentry.io/platforms/php/guides/laravel/configuration/laravel-options/#closures-and-config-caching)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing | Verify SDK version meets minimum; check `enable_metrics` is `true` |
| Metrics being dropped | Buffer cap is 1000 — flush periodically with `\Sentry\traceMetrics()->flush()` |
| No percentiles in Sentry UI | Switch from `gauge` to `distribution` — gauges do not support percentiles |
| High cardinality warning | Reduce attribute values — avoid per-user or per-request identifiers |
| Old `\Sentry\metrics()` calls doing nothing | Migrate to `\Sentry\traceMetrics()` — the old API is fully deprecated |
