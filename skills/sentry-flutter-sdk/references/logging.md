# Logging — Sentry Flutter SDK

> **Minimum SDK:** `sentry_flutter` ≥ **9.5.0** for structured logs (`enableLogs`)  
> **`sentry_logging` integration:** `sentry_logging` ≥ **9.5.0** + Dart `logging` package ≥ **1.0.0**  
> **`enableLogs` flag:** off by default — must be explicitly enabled

Flutter/Dart has two complementary logging paths:
1. **Sentry structured logs** — `Sentry.logger.*` API (direct) or via `sentry_logging` integration (bridges the Dart `logging` package)
2. **Breadcrumbs** — Automatic breadcrumbs from `sentry_logging` for navigation and debug events

---

## Table of Contents

1. [Enabling Logs](#1-enabling-logs)
2. [Direct Logger API](#2-direct-logger-api)
3. [sentry_logging Integration (Dart logging package)](#3-sentry_logging-integration-dart-logging-package)
4. [Structured Attributes](#4-structured-attributes)
5. [Filtering with beforeSendLog](#5-filtering-with-beforesendlog)
6. [Log Correlation with Traces](#6-log-correlation-with-traces)
7. [Configuration Reference](#7-configuration-reference)
8. [Known Limitations](#8-known-limitations)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Enabling Logs

`enableLogs` is **off by default** — opt in explicitly:

```dart
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_DSN';
      options.enableLogs = true; // required — logs are disabled unless this is set
    },
    appRunner: () => runApp(MyApp()),
  );
}
```

---

## 2. Direct Logger API

Use `Sentry.logger` to emit structured logs at six severity levels:

```dart
import 'package:sentry/sentry.dart';

// Fine-grained debugging — high volume, filter in production
Sentry.logger.trace('Starting checkout flow', {'step': 'init'});

// Development diagnostics
Sentry.logger.debug('Cache lookup', {'key': 'user:123', 'hit': false});

// Normal operations and business milestones
Sentry.logger.info('Order created', {'orderId': 'order_456', 'total': 99.99});

// Degraded state, approaching limits
Sentry.logger.warn('Rate limit approaching', {
  'endpoint': '/api/search/',
  'current': 95,
  'max': 100,
});

// Failures requiring attention
Sentry.logger.error('Payment failed', {
  'reason': 'card_declined',
  'userId': 'u_1',
});

// Critical failures — app or subsystem is down
Sentry.logger.fatal('Database unavailable', {'host': 'db-primary'});
```

### Level selection guide

| Level | When to use |
|-------|-------------|
| `trace` | Step-by-step internals, loop iterations, low-level flow tracking |
| `debug` | Diagnostic info useful during development |
| `info` | Business events, user actions, meaningful state transitions |
| `warn` | Recoverable errors, degraded performance, approaching limits |
| `error` | Failures that need investigation but don't crash the app |
| `fatal` | Unrecoverable failures — app or critical subsystem is down |

**Attribute value types:** `String`, `int`, `double`, and `bool` only. Other types will be dropped or coerced.

---

## 3. sentry_logging Integration (Dart logging package)

The `sentry_logging` package bridges the standard Dart `logging` package to Sentry. This is ideal for projects already using `logging` for structured output.

### Installation

```yaml
# pubspec.yaml
dependencies:
  sentry_flutter: ^9.14.0
  sentry_logging: ^9.14.0
  logging: ^1.0.0
```

### Configuration

```dart
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:sentry_logging/sentry_logging.dart';
import 'package:logging/logging.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_DSN';
      options.enableLogs = true;

      options.addIntegration(
        LoggingIntegration(
          // Minimum level that creates breadcrumbs (default: Level.INFO)
          minBreadcrumbLevel: Level.INFO,
          // Minimum level that creates Sentry error events (default: Level.SEVERE)
          minEventLevel: Level.SEVERE,
          // Minimum level that creates structured logs (default: Level.INFO)
          minSentryLogLevel: Level.INFO,
        ),
      );
    },
    appRunner: () => runApp(MyApp()),
  );
}
```

### Usage with the logging package

```dart
import 'package:logging/logging.dart';

final _logger = Logger('PaymentService');

class PaymentService {
  Future<void> processPayment(String orderId, double amount) async {
    _logger.info('Processing payment', {'orderId': orderId, 'amount': amount});

    try {
      final result = await _chargeCard(amount);
      _logger.info('Payment succeeded', {
        'orderId': orderId,
        'transactionId': result.transactionId,
      });
    } catch (e, stackTrace) {
      // Pass error and stackTrace for accurate reporting
      _logger.severe('Payment failed', e, stackTrace);
    }
  }
}
```

### Stack trace handling

The Dart `logging` package does **not** automatically capture stack traces. Configure it explicitly:

```dart
// Option 1 — automatic stack trace capture at SEVERE and above
Logger.root.recordStackTraceAtLevel = Level.SEVERE;

// Option 2 — pass stack trace manually to each log call
Logger('MyService').severe('Error occurred', error, stackTrace);
```

### What each log level produces

| Dart Level | ≥ `minBreadcrumbLevel` | ≥ `minSentryLogLevel` | ≥ `minEventLevel` |
|---|---|---|---|
| `Level.FINEST`/`FINER`/`FINE` | Breadcrumb (if configured) | Structured log | — |
| `Level.INFO`/`CONFIG` | ✅ Breadcrumb | ✅ Structured log | — |
| `Level.WARNING` | ✅ Breadcrumb | ✅ Structured log | — |
| `Level.SEVERE` | ✅ Breadcrumb | ✅ Structured log | ✅ Error event |
| `Level.SHOUT` | ✅ Breadcrumb | ✅ Structured log | ✅ Error event |

---

## 4. Structured Attributes

Attributes passed to `Sentry.logger.*` become **queryable columns** in the Sentry Logs UI:

```dart
Sentry.logger.info('Checkout completed', {
  'orderId': order.id,
  'userId': user.id,
  'cartValue': cart.total,
  'itemCount': cart.items.length,
  'paymentMethod': 'stripe',
  'durationMs': DateTime.now().difference(startTime).inMilliseconds,
});

Sentry.logger.error('Navigation failed', {
  'fromRoute': '/home',
  'toRoute': '/profile',
  'errorCode': err.code,
  'retryable': true,
});
```

### Scope-level attributes

Set attributes on the scope and they are automatically attached to all logs emitted while the scope is active:

```dart
// Global scope — set once at app startup
Sentry.configureScope((scope) {
  scope.setContexts('app', {
    'version': '2.1.0',
    'build': '42',
    'flavor': 'production',
  });
});

// Per-operation scope using withScope
await Sentry.withScope((scope) async {
  scope.setTag('orderId', 'ord_789');
  scope.setTag('paymentMethod', 'stripe');

  Sentry.logger.info('Validating cart', {'cartId': cart.id});
  await processPayment();
  Sentry.logger.info('Payment complete');
  // Both logs above carry orderId and paymentMethod tags
});
```

### Auto-attached attributes

The SDK automatically attaches these to every log:

| Attribute | Source |
|-----------|--------|
| `sentry.environment` | `options.environment` |
| `sentry.release` | `options.release` |
| `sentry.sdk.name` / `sentry.sdk.version` | SDK internals |
| `user.id`, `user.email` | `Sentry.setUser()` when set |
| `origin` | Identifies which integration emitted the log |

---

## 5. Filtering with beforeSendLog

Filter or mutate every log before it is transmitted. Return `null` to drop the log entirely:

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_DSN';
    options.enableLogs = true;

    options.beforeSendLog = (log) {
      // Drop trace/debug in production to reduce volume
      if (log.level == SentryLogLevel.trace ||
          log.level == SentryLogLevel.debug) {
        return null;
      }

      // Scrub sensitive attribute values
      if (log.attributes.containsKey('password')) {
        log.attributes.remove('password');
      }
      if (log.attributes.containsKey('creditCard')) {
        log.attributes['creditCard'] = '[REDACTED]';
      }

      return log;
    };
  },
  appRunner: () => runApp(MyApp()),
);
```

---

## 6. Log Correlation with Traces

When tracing is enabled, logs emitted inside an active span are **automatically correlated** in the Sentry UI. You can navigate from a log to its parent transaction.

```dart
import 'package:sentry/sentry.dart';

Future<void> processOrder(String orderId) async {
  await Sentry.startSpan(
    'process-order',
    operation: 'task',
    description: 'Processing order $orderId',
    fn: () async {
      Sentry.logger.info('Validating cart', {'orderId': orderId});
      await validateCart(orderId);

      Sentry.logger.info('Charging payment', {'orderId': orderId});
      await chargePayment(orderId);

      Sentry.logger.info('Confirming order', {'orderId': orderId});
      await confirmOrder(orderId);
    },
  );
  // All three logs are linked to the process-order span in the trace view
}
```

Enable tracing in `SentryFlutter.init`:

```dart
options.tracesSampleRate = 1.0; // required for log-to-trace correlation
options.enableLogs = true;
```

---

## 7. Configuration Reference

### `SentryFlutter.init` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLogs` | `bool` | `false` | Master switch — must be `true` for all structured logging |
| `beforeSendLog` | `SentryLog? Function(SentryLog)` | `null` | Filter/mutate logs before transmission. Return `null` to drop. |

### `LoggingIntegration` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minBreadcrumbLevel` | `Level` | `Level.INFO` | Minimum Dart log level to create Sentry breadcrumbs |
| `minEventLevel` | `Level` | `Level.SEVERE` | Minimum Dart log level to create Sentry error events |
| `minSentryLogLevel` | `Level` | `Level.INFO` | Minimum Dart log level to create Sentry structured logs |

### Version requirements

| Feature | Min Package | Min SDK Version |
|---------|-------------|-----------------|
| `enableLogs` / structured logs | `sentry_flutter` | `9.5.0` |
| `sentry_logging` integration | `sentry_logging` | `9.5.0` |
| `beforeSendLog` hook | `sentry_flutter` | `9.5.0` |

---

## 8. Known Limitations

| Limitation | Details |
|------------|---------|
| Crash buffer loss | Logs buffered since last flush are lost on unexpected termination before the buffer is sent |
| No per-log sampling | Use `beforeSendLog` to reduce volume — sampling is all-or-nothing |
| Dart logging package stack traces | Must be enabled manually via `Logger.root.recordStackTraceAtLevel` or passed explicitly |
| `sentry_logging` is separate package | Must be added to `pubspec.yaml` separately — not bundled with `sentry_flutter` |
| `enableLogs` is off by default | Logs are silently discarded if `enableLogs` is not `true` |

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing in Sentry | Verify `enableLogs: true` is set in `SentryFlutter.init()` |
| `Sentry.logger` not available | Import `package:sentry/sentry.dart`; check `sentry_flutter` ≥ 9.5.0 |
| `LoggingIntegration` type not found | Add `sentry_logging` to `pubspec.yaml` and import `package:sentry_logging/sentry_logging.dart` |
| Logs appear but no stack traces on errors | Set `Logger.root.recordStackTraceAtLevel = Level.SEVERE` or pass `stackTrace` manually |
| Attribute values showing `[Filtered]` | Server-side PII scrubbing rule matched — adjust **Data Scrubbing** settings in your Sentry project |
| Logs not linked to traces | Enable tracing (`tracesSampleRate > 0`) and emit logs inside a `Sentry.startSpan()` callback |
| Too many logs in production | Use `beforeSendLog` to drop `trace`/`debug` levels |
| `sentry_logging` logs not forwarded as structured logs | Check that `minSentryLogLevel` is set to the expected level and `enableLogs: true` |
| Logs disappearing silently | Check your Sentry org stats for rate limiting; verify log payload < 1 MB |
