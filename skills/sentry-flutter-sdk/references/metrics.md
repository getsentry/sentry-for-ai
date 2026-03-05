# Metrics — Sentry Flutter SDK

> **Minimum SDK:** `sentry_flutter` ≥ **9.11.0** for trace-connected metrics  
> **Status:** ⚠️ **Open Beta** — API is stable but some edge cases may change  
> **Supported metric types:** Counter, Distribution, Gauge (no `set` type)  
> **Per-metric key limit:** 2 KB

Metrics let you track quantitative data about your app's behavior — things like button tap counts, API latency distributions, or active session gauges. Unlike error events, metrics are aggregated before being sent to Sentry.

---

## Table of Contents

1. [Metric Types Overview](#1-metric-types-overview)
2. [Counter](#2-counter)
3. [Distribution](#3-distribution)
4. [Gauge](#4-gauge)
5. [Tags and Trace Correlation](#5-tags-and-trace-correlation)
6. [Configuration Reference](#6-configuration-reference)
7. [Known Limitations](#7-known-limitations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Metric Types Overview

| Type | Method | Use Case | Example |
|------|--------|----------|---------|
| **Counter** | `Sentry.metrics.increment()` | Count occurrences | Button taps, API calls, errors |
| **Distribution** | `Sentry.metrics.distribution()` | Measure value distributions | API response times, image sizes |
| **Gauge** | `Sentry.metrics.gauge()` | Track min/max/avg of a value | Active sessions, queue depth |
| ~~Set~~ | ~~`Sentry.metrics.set()`~~ | ~~Count unique occurrences~~ | **Not supported in Flutter SDK** |

> **Note on `set` metrics:** The `set` type is not available in the Sentry Flutter/Dart SDK. Use a counter or external unique-value tracking if you need to count distinct users or IDs.

---

## 2. Counter

Counters track how many times something happens. Use `increment()` — each call adds to the running total.

```dart
import 'package:sentry/sentry.dart';

// Simple increment (adds 1)
Sentry.metrics.increment('button.tapped');

// Custom increment value
Sentry.metrics.increment('orders.processed', value: 5.0);

// With tags for segmentation
Sentry.metrics.increment(
  'api.request',
  value: 1.0,
  unit: SentryMeasurementUnit.none,
  tags: {
    'endpoint': '/api/search',
    'method': 'GET',
    'status': '200',
  },
);
```

### Practical examples

```dart
// Track feature usage
void onShareButtonTapped() {
  Sentry.metrics.increment('feature.share.tapped');
  // existing share logic...
}

// Count errors by type
void onPaymentError(String errorType) {
  Sentry.metrics.increment(
    'payment.error',
    tags: {'type': errorType},
  );
}

// Track A/B test variant interactions
void onExperimentAction(String variant, String action) {
  Sentry.metrics.increment(
    'experiment.action',
    tags: {
      'variant': variant,
      'action': action,
    },
  );
}
```

---

## 3. Distribution

Distributions capture the **spread of values** over time — min, max, sum, count, and percentiles (p50, p75, p95, p99). Ideal for latency and size measurements.

```dart
import 'package:sentry/sentry.dart';

// API response time in milliseconds
final stopwatch = Stopwatch()..start();
await fetchUserData(userId);
stopwatch.stop();

Sentry.metrics.distribution(
  'api.response_time',
  value: stopwatch.elapsedMilliseconds.toDouble(),
  unit: SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.milliSecond),
  tags: {'endpoint': '/users', 'cached': 'false'},
);
```

### Unit types

```dart
// Duration
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.nanoSecond)
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.microSecond)
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.milliSecond)
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.second)
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.minute)
SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.hour)

// Data sizes
SentryMeasurementUnit.information(InformationSentryMeasurementUnit.byte)
SentryMeasurementUnit.information(InformationSentryMeasurementUnit.kilobyte)
SentryMeasurementUnit.information(InformationSentryMeasurementUnit.megabyte)
SentryMeasurementUnit.information(InformationSentryMeasurementUnit.gigabyte)

// Fractions
SentryMeasurementUnit.fraction(FractionSentryMeasurementUnit.ratio)
SentryMeasurementUnit.fraction(FractionSentryMeasurementUnit.percent)

// Custom / unitless
SentryMeasurementUnit.none
SentryMeasurementUnit.custom('items')
```

### Practical examples

```dart
// Image load time
Future<void> loadImage(String url) async {
  final start = DateTime.now();
  await precacheImage(NetworkImage(url), context);
  final elapsed = DateTime.now().difference(start);

  Sentry.metrics.distribution(
    'image.load_time',
    value: elapsed.inMilliseconds.toDouble(),
    unit: SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.milliSecond),
    tags: {'cached': 'false'},
  );
}

// Payload size tracking
void onApiResponse(http.Response response) {
  Sentry.metrics.distribution(
    'api.response_size',
    value: response.contentLength?.toDouble() ?? 0,
    unit: SentryMeasurementUnit.information(InformationSentryMeasurementUnit.byte),
    tags: {'endpoint': response.request?.url.path ?? 'unknown'},
  );
}

// Cart value distribution
void onCheckoutCompleted(double cartTotal) {
  Sentry.metrics.distribution(
    'checkout.cart_value',
    value: cartTotal,
    unit: SentryMeasurementUnit.none,
  );
}
```

---

## 4. Gauge

Gauges track the **statistical properties** (last, min, max, sum, count) of a set of values emitted during the aggregation window. Use for things that have a meaningful current state.

```dart
import 'package:sentry/sentry.dart';

// Track active background operations
Sentry.metrics.gauge(
  'background.tasks.active',
  value: activeTaskCount.toDouble(),
);

// Track session depth
Sentry.metrics.gauge(
  'navigation.stack_depth',
  value: Navigator.of(context).canPop() ? stackDepth.toDouble() : 0,
);

// Monitor cache entries
Sentry.metrics.gauge(
  'cache.entry_count',
  value: imageCache.currentSize.toDouble(),
  tags: {'type': 'image_cache'},
);
```

---

## 5. Tags and Trace Correlation

### Tags

All metric types accept a `tags` map. Tags are key-value strings used to **filter and group metrics** in the Sentry Metrics UI:

```dart
Sentry.metrics.increment(
  'checkout.step',
  tags: {
    'step': 'payment',        // string values only
    'platform': 'ios',
    'user_type': 'subscriber',
  },
);
```

> **Tag value constraints:** Tag values must be strings. The metric key + all tags must fit within the **2 KB per-metric key limit** (key name + aggregated tag combinations).

### Trace correlation

As of `sentry_flutter` 9.11.0, metrics are **automatically linked to the active trace** when emitted inside a span. This allows you to view metric data alongside transaction performance in the Sentry UI:

```dart
await Sentry.startSpan(
  'checkout',
  operation: 'ui.action',
  fn: () async {
    // This increment is linked to the checkout span
    Sentry.metrics.increment('checkout.started');

    final start = DateTime.now();
    await processCheckout();
    final elapsed = DateTime.now().difference(start);

    Sentry.metrics.distribution(
      'checkout.duration',
      value: elapsed.inMilliseconds.toDouble(),
      unit: SentryMeasurementUnit.duration(DurationSentryMeasurementUnit.milliSecond),
    );

    Sentry.metrics.increment('checkout.completed');
  },
);
```

---

## 6. Configuration Reference

No special configuration is required for metrics beyond initializing the SDK with a valid DSN. Metrics are enabled by default.

| Method | Signature |
|--------|-----------|
| `Sentry.metrics.increment(key, {value, unit, tags})` | Increment a counter |
| `Sentry.metrics.distribution(key, {value, unit, tags})` | Record a distribution value |
| `Sentry.metrics.gauge(key, {value, unit, tags})` | Record a gauge observation |

### Version requirements

| Feature | Min SDK |
|---------|---------|
| `Sentry.metrics.*` basic API | `9.0.0` |
| Trace-connected metrics | `9.11.0` |

---

## 7. Known Limitations

| Limitation | Details |
|------------|---------|
| No `set` type | `Sentry.metrics.set()` is **not supported** in the Flutter/Dart SDK. Use counters or external tracking for unique-value counting. |
| 2 KB per-metric key limit | Key name + all tag combinations per metric must not exceed 2 KB total. Exceeding this may cause metrics to be silently dropped server-side. |
| Open Beta status | The metrics API is stable but under active development. Some edge cases may change in future minor versions. |
| Aggregation window | Metrics are aggregated locally before being flushed. Individual data points are not preserved — you see aggregations (sum, count, min, max). |
| No sampling for metrics | Unlike errors and transactions, there is no sample rate for metrics — all emitted metrics are sent. Use tags and filtering instead of emitting fewer data points. |
| Tag values must be strings | Passing non-string tag values will be coerced or dropped. |

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing in Sentry | Verify DSN is correct and the SDK is initialized. Check Sentry → Metrics to ensure the feature is enabled for your organization. |
| SDK version doesn't have `Sentry.metrics` | Upgrade `sentry_flutter` to ≥ 9.0.0 |
| Metrics not linked to traces | Upgrade to `sentry_flutter` ≥ 9.11.0 and emit metrics inside a `Sentry.startSpan()` callback |
| `set` metric type not available | Expected — not supported in Flutter SDK. Use `increment` with a counter instead. |
| Metrics appear intermittently | Expected — metrics are batched and flushed on a schedule. Low-volume metrics may appear in Sentry with a delay. |
| Tags not showing up correctly | Verify all tag values are strings; check total metric key + tags size is under 2 KB |
| High metric cardinality warning in Sentry | Avoid using high-cardinality values (user IDs, timestamps, request IDs) as tag values. Use categorical values instead. |
