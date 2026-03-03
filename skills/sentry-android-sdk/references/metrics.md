# Metrics — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android:8.30.0`  
> **⚠️ Status: Open Beta** — API surface is stable but subject to change  
> **Enabled by default:** Yes — no opt-in required  
> **Docs:** https://docs.sentry.io/platforms/android/metrics/

---

## ⚠️ Beta Notice

Metrics is currently in **Open Beta**. The feature is enabled by default as of SDK 8.30.0 and the API is stable in practice, but Sentry may revise the data model or UI. Test thoroughly before relying on metrics data in production dashboards.

---

## Overview

Sentry Metrics lets you track counters, distributions, and gauges from your Android app. Metrics are sent to Sentry and appear in the **Metrics** tab where you can create charts and alerts.

> **No Set metric type.** Unlike some observability platforms, this SDK does **not** have a `set()` method for tracking unique values. Only **Counter**, **Distribution**, and **Gauge** are available.

---

## Configuration

Metrics is enabled by default. To disable or add filtering:

```kotlin
SentryAndroid.init(this) { options ->
    // Disable metrics entirely
    options.metrics.setEnabled(false)

    // Or filter metrics before they are sent
    options.metrics.setBeforeSend { metric, _ ->
        // Drop debug-prefixed metrics in production
        if (!BuildConfig.DEBUG && metric.name.startsWith("debug.")) {
            return@setBeforeSend null  // null = drop the metric
        }
        metric
    }
}
```

**Via AndroidManifest.xml:**

```xml
<meta-data android:name="io.sentry.metrics.enabled" android:value="false" />
```

### Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `metrics.isEnabled` | `Boolean` | `true` | Master switch — metrics are ON by default |
| `metrics.setBeforeSend` | `BeforeSendMetricCallback?` | `null` | Filter or mutate metrics before transmission. Return `null` to drop. |

---

## Code Examples

### Counter

Track how many times something happens. Default increment is `1.0`.

```kotlin
import io.sentry.Sentry
import io.sentry.metrics.MetricsUnit
import io.sentry.metrics.SentryMetricsParameters
import io.sentry.SentryAttribute
import io.sentry.SentryAttributes

// Simple event count
Sentry.metrics().count("ui.button_tap")

// With explicit increment value
Sentry.metrics().count("feature.items_processed", 25.0)

// With unit
Sentry.metrics().count("network.bytes_sent", 8_192.0, MetricsUnit.Information.BYTE)

// With attributes (custom dimensions for filtering/grouping)
Sentry.metrics().count(
    "feature.used",
    1.0,
    null, // no unit for dimensionless counters
    SentryMetricsParameters.create(
        SentryAttributes.of(
            SentryAttribute.stringAttribute("feature",   "dark_mode"),
            SentryAttribute.stringAttribute("user_tier", "premium")
        )
    )
)
```

### Distribution

Record individual measurements — each call adds one data point to a histogram. Use for durations, sizes, and similar measurements.

```kotlin
// Response time
Sentry.metrics().distribution("api.response_time", 187.5, MetricsUnit.Duration.MILLISECOND)

// File size
Sentry.metrics().distribution("image.upload_size", fileBytes.toDouble(), MetricsUnit.Information.BYTE)

// With attributes
Sentry.metrics().distribution(
    "api.response_time",
    elapsed.toDouble(),
    MetricsUnit.Duration.MILLISECOND,
    SentryMetricsParameters.create(
        SentryAttributes.of(
            SentryAttribute.stringAttribute("endpoint",   "/api/v2/users"),
            SentryAttribute.stringAttribute("http.method", "GET"),
            SentryAttribute.integerAttribute("http.status", responseCode)
        )
    )
)
```

### Gauge

Capture a point-in-time snapshot of a value that can go up or down. Use for current levels, queue depths, and resource utilization.

```kotlin
// Active downloads
Sentry.metrics().gauge("app.active_downloads", activeDownloads.toDouble())

// Memory usage
val usedMemory = (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1_048_576.0
Sentry.metrics().gauge("app.memory_used_mb", usedMemory)

// Queue depth
Sentry.metrics().gauge("queue.pending_tasks", pendingTasks.toDouble())
```

### Backfilling with Custom Timestamp

```kotlin
Sentry.metrics().distribution(
    "checkout.duration",
    checkoutDurationMs.toDouble(),
    MetricsUnit.Duration.MILLISECOND,
    SentryMetricsParameters.create(
        SentryAutoDateProvider().now(),   // custom timestamp
        SentryAttributes.of(
            SentryAttribute.stringAttribute("payment_method", "card"),
            SentryAttribute.booleanAttribute("coupon_applied",  true)
        )
    )
)
```

### Practical Example — Tracking Checkout Flow

```kotlin
class CheckoutViewModel : ViewModel() {

    fun checkout(cart: Cart) {
        val t0 = SystemClock.elapsedRealtime()

        viewModelScope.launch {
            try {
                val order = repository.submitOrder(cart)

                // Count successful checkouts
                Sentry.metrics().count(
                    "checkout.success",
                    1.0,
                    null,
                    SentryMetricsParameters.create(
                        SentryAttributes.of(
                            SentryAttribute.stringAttribute("payment_method", cart.paymentMethod),
                            SentryAttribute.integerAttribute("item_count", cart.items.size)
                        )
                    )
                )

                // Record checkout duration
                Sentry.metrics().distribution(
                    "checkout.duration",
                    (SystemClock.elapsedRealtime() - t0).toDouble(),
                    MetricsUnit.Duration.MILLISECOND
                )

                // Record order value
                Sentry.metrics().distribution("order.value_usd", cart.totalUsd)

            } catch (e: Exception) {
                Sentry.metrics().count("checkout.failure")
                throw e
            }
        }
    }
}
```

---

## Units Reference — `MetricsUnit`

Use `MetricsUnit` constants for well-known units. Pass `null` for dimensionless values.

> **Custom unit strings are not supported.** Only `MetricsUnit.*` constants produce correct rendering in the Sentry UI. Passing an arbitrary string (e.g., `"frames"`) is accepted but displays incorrectly.

**Duration:**

```kotlin
MetricsUnit.Duration.NANOSECOND
MetricsUnit.Duration.MICROSECOND
MetricsUnit.Duration.MILLISECOND  // most common for Android
MetricsUnit.Duration.SECOND
MetricsUnit.Duration.MINUTE
MetricsUnit.Duration.HOUR
MetricsUnit.Duration.DAY
MetricsUnit.Duration.WEEK
```

**Information (data size):**

```kotlin
MetricsUnit.Information.BYTE
MetricsUnit.Information.KILOBYTE
MetricsUnit.Information.KIBIBYTE
MetricsUnit.Information.MEGABYTE
MetricsUnit.Information.MEBIBYTE
MetricsUnit.Information.GIGABYTE
MetricsUnit.Information.GIBIBYTE
MetricsUnit.Information.TERABYTE
```

**Fraction:**

```kotlin
MetricsUnit.Fraction.RATIO    // 0.0 to 1.0
MetricsUnit.Fraction.PERCENT  // 0.0 to 100.0
```

---

## Batch Processing

Metrics are batched and sent asynchronously:

| Parameter | Value |
|-----------|-------|
| Flush delay | 5 seconds after the first queued event |
| Max batch size | 1,000 metrics per HTTP envelope |
| Max queue size | 10,000 metrics (above this, new metrics are silently dropped) |
| Background flush | Yes — `AndroidMetricsBatchProcessor` flushes immediately on app background |

---

## Best Practices

1. **Use consistent key names** — metric names should be `snake_case.namespaced`, e.g. `checkout.duration` not `checkoutDuration`
2. **Use `MetricsUnit.*` constants** — custom strings render incorrectly in the UI
3. **Pass `null` unit for dimensionless metrics** — don't leave unit as an empty string
4. **Use attributes for dimensions** — prefer `Sentry.metrics().count("api.call", 1.0, null, paramsWithEndpointAttr)` over separate metric keys per endpoint
5. **Use `beforeSend` to drop debug metrics in production** — avoids quota usage and noise
6. **Counter vs. Distribution** — use Counter for event occurrences (how many times), Distribution for measurements (how long, how large)
7. **Gauge for instantaneous state** — gauges are best for values that fluctuate: queue depth, connection pool size, active sessions
8. **Avoid high-cardinality attribute values** — user IDs, UUIDs, or timestamps as attribute values create unbounded series in the Sentry backend

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing in Sentry | Verify SDK ≥ 8.30.0; check that metrics were not disabled via `options.metrics.setEnabled(false)` or manifest `io.sentry.metrics.enabled = false` |
| `set()` method not found | The Set type does not exist in this SDK — only Counter, Distribution, and Gauge are available |
| Metrics silently dropped | Queue is capped at 10,000 events; use `beforeSend` to filter high-volume metrics |
| Unit renders incorrectly in Sentry UI | Only `MetricsUnit.*` constants are supported; passing arbitrary strings is not |
| `beforeSend` dropping too many metrics | Ensure the return is `metric` (not `null`) for events you want to keep; a null return drops the event |
| Metrics data delayed by ~5s | Expected — the batch processor holds events for 5 seconds before flushing |
| High memory on metrics-heavy screens | Metrics are in-memory until flushed; avoid extremely high burst rates on low-memory devices |
