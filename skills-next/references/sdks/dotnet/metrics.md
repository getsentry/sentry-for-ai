# Metrics — Sentry .NET SDK

> Minimum SDK: `Sentry` ≥ 6.1.0  
> Roslyn Analyzer (`SENTRY1001`): `Sentry.Compiler.Extensions` (ships with `Sentry` NuGet)

---

## Overview

Sentry Trace-connected Metrics lets you emit counters, gauges, and distributions that are automatically linked to your Sentry traces. Metrics are batched and flushed periodically (every 5 seconds or 100 items).

Three metric types:

| Type | Method | Purpose |
|------|--------|---------|
| Counter | `EmitCounter` | Increment a value (e.g. request count, items processed) |
| Gauge | `EmitGauge` | Track a current value (e.g. queue depth, active connections) |
| Distribution | `EmitDistribution` | Record a measured value for statistical analysis (e.g. response time, payload size) |

---

## Enabling Metrics

Metrics are enabled via `SentryOptions.EnableMetrics`:

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "___YOUR_DSN___";
    options.EnableMetrics = true;
});
```

> **Without `EnableMetrics = true`**, all `EmitCounter` / `EmitGauge` / `EmitDistribution` calls are no-ops.

---

## Emitting Metrics

Access the metrics API via `SentrySdk.Metrics` or `hub.Metrics`:

### Counter

```csharp
// Simple counter — increment by 1
SentrySdk.Metrics.EmitCounter("orders.completed", 1);

// Counter with attributes and scope
SentrySdk.Metrics.EmitCounter("orders.completed", 1,
    new Dictionary<string, object> { ["region"] = "eu-west" },
    scope);
```

### Gauge

```csharp
// Simple gauge
SentrySdk.Metrics.EmitGauge("queue.depth", 42);

// Gauge with unit
SentrySdk.Metrics.EmitGauge("cpu.usage", 0.85, MeasurementUnit.Fraction.Ratio);
```

### Distribution

```csharp
// Simple distribution
SentrySdk.Metrics.EmitDistribution("response.time", 120.5);

// Distribution with unit and attributes
SentrySdk.Metrics.EmitDistribution("payload.size", 4096L,
    MeasurementUnit.Information.Byte,
    new Dictionary<string, object> { ["endpoint"] = "/api/orders" },
    scope);
```

---

## Supported Numeric Types

The metrics API accepts a generic `T` constrained to `struct`, but only the following numeric types are supported at runtime:

| Type | C# keyword | Supported |
|------|-----------|-----------|
| `System.Byte` | `byte` | ✅ Yes |
| `System.Int16` | `short` | ✅ Yes |
| `System.Int32` | `int` | ✅ Yes |
| `System.Int64` | `long` | ✅ Yes |
| `System.Single` | `float` | ✅ Yes |
| `System.Double` | `double` | ✅ Yes |
| `System.UInt32` | `uint` | ❌ No |
| `System.UInt64` | `ulong` | ❌ No |
| `System.Decimal` | `decimal` | ❌ No |
| `System.Int128` | `Int128` | ❌ No |

Unsupported types are silently dropped at runtime (no-op with a debug diagnostic log message). The Roslyn analyzer `SENTRY1001` catches these at compile time instead.

---

## `SENTRY1001` — Roslyn Diagnostic Analyzer

The SDK ships a compile-time Roslyn analyzer that reports a **warning** when a metrics API is called with an unsupported numeric type.

**Diagnostic ID:** `SENTRY1001`  
**Category:** `Sentry`  
**Severity:** Warning  
**Message:** `{type} is unsupported type for Sentry Metrics. The only supported types are byte, short, int, long, float, and double.`

**Triggers on:**
- `SentryMetricEmitter.EmitCounter<T>()` with unsupported `T`
- `SentryMetricEmitter.EmitGauge<T>()` with unsupported `T`
- `SentryMetricEmitter.EmitDistribution<T>()` with unsupported `T`
- `SentryMetric.TryGetValue<T>()` with unsupported `T`

```csharp
// ✅ No warning — supported types
SentrySdk.Metrics.EmitCounter("my.counter", 1);       // int → OK
SentrySdk.Metrics.EmitCounter("my.counter", 1L);      // long → OK
SentrySdk.Metrics.EmitCounter("my.counter", 1.5f);    // float → OK
SentrySdk.Metrics.EmitCounter("my.counter", 1.5);     // double → OK

// ⚠️ SENTRY1001 — unsupported types
SentrySdk.Metrics.EmitCounter("my.counter", 1m);          // decimal
SentrySdk.Metrics.EmitCounter("my.counter", (ulong)100);  // ulong
SentrySdk.Metrics.EmitCounter("my.counter", (uint)1);     // uint
```

**To suppress** (not recommended): Add `#pragma warning disable SENTRY1001` or `[SuppressMessage]`. However, the metric will still be silently dropped at runtime.

---

## `SetBeforeSendMetric` Callback

Filter or modify metrics before they are sent to Sentry. Return `null` to drop a metric.

```csharp
SentrySdk.Init(options =>
{
    options.Dsn = "___YOUR_DSN___";
    options.EnableMetrics = true;
    options.SetBeforeSendMetric(static (SentryMetric metric) =>
    {
        // Drop metrics with negative values
        if (metric.TryGetValue<double>(out var value) && value < 0)
        {
            return null;
        }

        return metric;
    });
});
```

**Signature:** `void SetBeforeSendMetric(Func<SentryMetric, SentryMetric?> callback)`

---

## `SentryMetric.TryGetValue<T>`

Extract the numeric value from a `SentryMetric` with a type check. Returns `false` if the metric's value type does not match `T`. The same supported-type rules apply — using an unsupported type triggers `SENTRY1001`.

```csharp
options.SetBeforeSendMetric(static (SentryMetric metric) =>
{
    // ✅ Supported — double
    if (metric.TryGetValue<double>(out var doubleValue))
    {
        Console.WriteLine($"Metric value: {doubleValue}");
    }

    // ✅ Supported — long
    if (metric.TryGetValue<long>(out var longValue) && longValue > 1000)
    {
        return null; // drop high-value metrics
    }

    return metric;
});
```

---

## `SentryMetric` Properties

| Property | Type | Description |
|----------|------|-------------|
| `Timestamp` | `DateTimeOffset` | When the metric was recorded |
| `TraceId` | `SentryId` | Trace ID linking metric to a trace |
| `SpanId` | `SpanId?` | Span that was active when metric was emitted |
| `Type` | `SentryMetricType` | `Counter`, `Gauge`, or `Distribution` |
| `Name` | `string` | Hierarchical name (e.g. `api.response_time`) |
| `Unit` | `string?` | Unit of measurement (only for Gauge/Distribution) |

---

## Config Options

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `EnableMetrics` | `bool` | `false` | Must be `true` to emit metrics |
| `SetBeforeSendMetric` | `Func<SentryMetric, SentryMetric?>` | — | Filter/modify metrics before send; return `null` to drop |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Metrics not appearing in Sentry | `EnableMetrics` not set | Set `options.EnableMetrics = true` in `SentrySdk.Init()` |
| `SENTRY1001` compiler warning | Unsupported numeric type | Use `byte`, `short`, `int`, `long`, `float`, or `double` instead |
| Metric emitted but silently dropped | Unsupported type at runtime (no analyzer) | Ensure the `Sentry.Compiler.Extensions` analyzer is loaded; check build output for `SENTRY1001` |
| `SetBeforeSendMetric` drops all metrics | Callback returns `null` unconditionally | Verify your filter logic; return `metric` for metrics you want to keep |
| `TryGetValue<T>` returns `false` | Type mismatch between emitted type and queried type | Use the same type that was passed to `EmitCounter`/`EmitGauge`/`EmitDistribution` |
