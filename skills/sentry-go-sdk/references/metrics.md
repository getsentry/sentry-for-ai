# Metrics — Sentry Go SDK

> Minimum SDK: `github.com/getsentry/sentry-go` v0.42.0+  
> **⚠️ Open Beta** — API may change in future releases.

## Configuration

```go
sentry.Init(sentry.ClientOptions{
    Dsn: os.Getenv("SENTRY_DSN"),
    // Metrics are enabled by default. Disable with:
    DisableMetrics: false,
    // Filter or mutate metrics before sending:
    BeforeSendMetric: func(metric *sentry.Metric) *sentry.Metric {
        return metric // return nil to drop
    },
})
```

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `DisableMetrics` | `bool` | `false` | Set `true` to disable all metrics emission |
| `BeforeSendMetric` | `func(*Metric) *Metric` | `nil` | Mutate or drop individual metrics |

## Meter API

Create a `Meter` from any context:

```go
meter := sentry.NewMeter(ctx)
```

Returns a no-op `Meter` (silently drops all calls) if no client is bound to the hub or `DisableMetrics: true`.

### Meter interface

```go
type Meter interface {
    Count(name string, count int64, opts ...MeterOption)
    Gauge(name string, value float64, opts ...MeterOption)
    Distribution(name string, sample float64, opts ...MeterOption)
    WithCtx(ctx context.Context) Meter       // returns meter linked to new context/span
    SetAttributes(attrs ...attribute.Builder) // permanent attributes on all metrics from this meter
}
```

> **The Go SDK has exactly three metric types: `Count`, `Gauge`, `Distribution`. Sets and timing helpers are not implemented.**

## Code Examples

### Basic metrics

```go
import (
    "context"
    "time"
    "github.com/getsentry/sentry-go"
    "github.com/getsentry/sentry-go/attribute"
)

func main() {
    sentry.Init(sentry.ClientOptions{Dsn: os.Getenv("SENTRY_DSN")})
    defer sentry.Flush(2 * time.Second)

    meter := sentry.NewMeter(context.Background())

    // Counter — integer increments
    meter.Count("emails.sent", 3,
        sentry.WithAttributes(
            attribute.String("provider", "sendgrid"),
            attribute.Bool("transactional", true),
        ),
    )

    // Gauge — current snapshot value
    meter.Gauge("queue.depth", 142.0,
        sentry.WithAttributes(
            attribute.String("queue.name", "orders"),
        ),
    )

    // Distribution — histogram / percentile-friendly samples
    meter.Distribution("api.response_time", 187.5,
        sentry.WithUnit(sentry.UnitMillisecond),
        sentry.WithAttributes(
            attribute.String("endpoint", "/checkout"),
            attribute.String("method", "POST"),
        ),
    )
}
```

### Permanent meter attributes

```go
meter := sentry.NewMeter(context.Background())
meter.SetAttributes(
    attribute.String("service", "payment-api"),
    attribute.String("region", "us-east-1"),
)

// All metrics from this meter include service and region
meter.Count("orders.created", 1)
meter.Gauge("cpu.usage", 0.73, sentry.WithUnit(sentry.UnitRatio))
```

### Trace-linked metrics

Associate metrics with the current request's trace span using `WithCtx`:

```go
http.HandleFunc("/checkout", func(w http.ResponseWriter, r *http.Request) {
    // meter.WithCtx links metrics to the active span in r.Context()
    meter.WithCtx(r.Context()).Count("checkout.attempts", 1,
        sentry.WithAttributes(
            attribute.String("method", r.Method),
        ),
    )
    // ... handler logic
})
```

### Timing a operation with Distribution

There is no built-in timer — measure elapsed time manually:

```go
func processOrder(ctx context.Context, orderID string) error {
    start := time.Now()

    err := doWork(ctx, orderID)

    elapsed := float64(time.Since(start).Milliseconds())
    meter.WithCtx(ctx).Distribution("order.processing_time", elapsed,
        sentry.WithUnit(sentry.UnitMillisecond),
        sentry.WithAttributes(
            attribute.String("order.id", orderID),
            attribute.Bool("success", err == nil),
        ),
    )
    return err
}
```

### Filtering metrics with BeforeSendMetric

```go
sentry.Init(sentry.ClientOptions{
    Dsn: os.Getenv("SENTRY_DSN"),
    BeforeSendMetric: func(m *sentry.Metric) *sentry.Metric {
        // Drop sub-millisecond distributions (noise)
        if m.Type == sentry.MetricTypeDistribution {
            if v, ok := m.Value.Float64(); ok && v < 1.0 {
                return nil
            }
        }
        // Drop metrics from test environment
        if env, ok := m.Attributes["sentry.environment"]; ok && env.String() == "test" {
            return nil
        }
        return m
    },
})
```

### Scope override

Override per-metric user/environment context without changing the global scope:

```go
customScope := sentry.NewScope()
customScope.SetUser(sentry.User{ID: "user-42"})

meter.Gauge("memory.usage", 512.0,
    sentry.WithUnit(sentry.UnitMebibyte),
    sentry.WithScopeOverride(customScope),
)
```

## MeterOption Reference

```go
sentry.WithUnit(unit string)                    // set measurement unit
sentry.WithAttributes(attrs ...attribute.Builder) // per-call attributes
sentry.WithScopeOverride(scope *sentry.Scope)   // override scope for this metric
```

## Unit Constants

**Duration:**

| Constant | Value |
|----------|-------|
| `UnitNanosecond` | `"nanosecond"` |
| `UnitMicrosecond` | `"microsecond"` |
| `UnitMillisecond` | `"millisecond"` |
| `UnitSecond` | `"second"` |
| `UnitMinute` | `"minute"` |
| `UnitHour` | `"hour"` |
| `UnitDay` | `"day"` |
| `UnitWeek` | `"week"` |

**Information:**

| Constant | Value |
|----------|-------|
| `UnitByte` | `"byte"` |
| `UnitKilobyte` | `"kilobyte"` |
| `UnitMegabyte` | `"megabyte"` |
| `UnitGigabyte` | `"gigabyte"` |
| `UnitMebibyte` | `"mebibyte"` |
| `UnitGibibyte` | `"gibibyte"` |

**Fraction:**

| Constant | Value |
|----------|-------|
| `UnitRatio` | `"ratio"` |
| `UnitPercent` | `"percent"` |

## Attribute Package

```go
import "github.com/getsentry/sentry-go/attribute"

attribute.String(key, value string) Builder
attribute.Int(key string, value int) Builder
attribute.Int64(key string, value int64) Builder
attribute.Float64(key string, v float64) Builder
attribute.Bool(key string, v bool) Builder
```

## Auto-Attached Attributes

| Attribute | Source |
|-----------|--------|
| `sentry.release` | `ClientOptions.Release` |
| `sentry.environment` | `ClientOptions.Environment` |
| `sentry.server.address` | `ClientOptions.ServerName` or `os.Hostname()` |
| `sentry.sdk.name` / `.version` | SDK identifier |

## Metric Type Reference

| Method | Value type | Use for |
|--------|-----------|---------|
| `Count` | `int64` | Incrementing counters (events, errors, requests) |
| `Gauge` | `float64` | Current state snapshot (queue depth, memory, connections) |
| `Distribution` | `float64` | Variable measurements supporting percentiles (latency, file sizes) |

Note: `Count` takes `int64`, not `int`. `IntervalSchedule` also takes `int64`.

## Best Practices

- Use `Count` for events that accumulate (requests served, emails sent, errors thrown)
- Use `Gauge` for values that represent current state (queue depth, active connections, cache size)
- Use `Distribution` for latency and sizes — it enables P50/P95/P99 analysis
- Keep metric names lowercase, dot-separated (`api.response_time`, `queue.depth`)
- Avoid high-cardinality tag values (user IDs, request IDs) — prefer categorical values
- Call `meter.SetAttributes()` once with service-level tags rather than repeating them on every call
- Use `meter.WithCtx(ctx)` inside HTTP handlers to link metrics to the active trace span

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing | Check `DisableMetrics` is not `true`; verify `sentry.Flush()` is called |
| `NewMeter` returns no-op | No client bound to hub; check `sentry.Init` was called |
| `Count` type error | `count` parameter is `int64`, not `int` — use explicit `int64(n)` cast |
| Missing attributes | Use `meter.SetAttributes()` for permanent attributes; they apply to all subsequent calls |
| High-cardinality warnings | Avoid using dynamic values (user IDs, UUIDs) as tag values |
