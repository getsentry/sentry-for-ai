---
name: sentry-span-streaming-dart
description: Migrate Dart/Flutter SDK to Sentry span streaming (span-first trace lifecycle). Use when asked to "enable span streaming", "migrate to span streaming", "use traceLifecycle stream", "use Sentry.startSpan", or switch from transaction-based to streamed span delivery in a Dart or Flutter project.
license: Apache-2.0
category: feature-setup
parent: sentry-feature-setup
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

> [All Skills](../../SKILL_TREE.md) > [Feature Setup](../sentry-feature-setup/SKILL.md) > Span Streaming (Dart)

# Sentry Span Streaming Migration (Dart/Flutter)

Migrate from the default transaction-based trace lifecycle (`SentryTraceLifecycle.static`) to span streaming (`SentryTraceLifecycle.stream`), where spans are sent individually as they complete instead of being batched into a transaction at the end.

This skill covers the Dart and Flutter SDKs (`sentry`, `sentry_flutter`, and integration packages such as `sentry_dio`, `sentry_sqflite`, `sentry_drift`). For JavaScript, see [Span Streaming (JavaScript)](../sentry-span-streaming-js/SKILL.md). For Python, see [Span Streaming (Python)](../sentry-span-streaming-python/SKILL.md).

## Invoke This Skill When

- User asks to "enable span streaming" or "migrate to span streaming" in a Dart or Flutter project
- User wants to switch from transaction-based to streamed span delivery
- User mentions `traceLifecycle`, `SentryTraceLifecycle.stream`, `Sentry.startSpan`, or `SentrySpanV2`
- User wants lower latency span delivery or per-span processing

---

## Phase 1: Detect

### 1.1 Detect SDK and Version

```bash
# Which Sentry packages does the project use?
grep -n "sentry" pubspec.yaml 2>/dev/null

# Resolved versions — span streaming requires >= 9.19.0
grep -A8 '^  sentry:' pubspec.lock 2>/dev/null | grep -m1 version
grep -A8 '^  sentry_flutter:' pubspec.lock 2>/dev/null | grep -m1 version
```

Span streaming requires `sentry` / `sentry_flutter` `>=9.19.0`.

### 1.2 Find Existing Sentry Config and Tracing Usage

```bash
# Find init calls
grep -rn "SentryFlutter\.init\|Sentry\.init" lib/ bin/ test/ --include="*.dart" 2>/dev/null | head -10

# Find old transaction API usage (these become no-ops in streaming mode)
grep -rn "startTransaction\|\.startChild(" lib/ bin/ test/ --include="*.dart" 2>/dev/null | head -20

# Find callbacks affected by the migration
grep -rn "beforeSendTransaction\|beforeSendSpan\|ignoreSpans" lib/ bin/ test/ --include="*.dart" 2>/dev/null

# Find untyped span data/tag usage on transactions
grep -rn "\.setData(\|\.setTag(" lib/ bin/ test/ --include="*.dart" 2>/dev/null | head -20
```

### 1.3 Classify the Migration Work

| Finding | Migration Work |
|---|---|
| `Sentry.startTransaction(...)` calls | Replace with `Sentry.startSpan` / `Sentry.startSpanSync` / `Sentry.startInactiveSpan` |
| `span.startChild(...)` calls | Replace with nested `Sentry.startSpan` calls — parenting is automatic via zones |
| `setData` / `setTag` on spans | Replace with typed `span.setAttribute(...)` / `SentryAttribute` |
| `beforeSendTransaction` callback | Never called in streaming mode — migrate logic to `beforeSendSpan` or `ignoreSpans` |
| Existing `beforeSendSpan` / `ignoreSpans` usage | Review against streaming semantics — `beforeSendSpan` is mutation-only, `ignoreSpans` matches names only (see 2.5/2.6) |
| Only auto-instrumentation (no manual spans) | Just enable the option — integrations switch automatically |

---

## Phase 2: Migrate

**Prerequisites:** `sentry` / `sentry_flutter` `>=9.19.0` with tracing enabled (`tracesSampleRate` or `tracesSampler` configured).

### 2.1 Enable Span Streaming

Set `traceLifecycle` in the init options. This is the only required config change.

```dart
// Flutter
await SentryFlutter.init((options) {
  options.dsn = '__DSN__';
  options.tracesSampleRate = 1.0;
  options.traceLifecycle = SentryTraceLifecycle.stream;
}, appRunner: () => runApp(const MyApp()));

// Plain Dart
await Sentry.init((options) {
  options.dsn = '__DSN__';
  options.tracesSampleRate = 1.0;
  options.traceLifecycle = SentryTraceLifecycle.stream;
});
```

You can only use one tracing system at a time:

- In `stream` mode, the transaction APIs (`Sentry.startTransaction`, `ISentrySpan.startChild`) do nothing and log a warning.
- In `static` mode (the default), the new span APIs (`Sentry.startSpan`) do nothing.
- Auto-instrumentations automatically switch to the correct API based on this setting.

### 2.2 Replace Transactions with Spans

`Sentry.startSpan` runs an async callback and ends the span when the returned future completes. Nested calls auto-parent through zones — there is no `startChild` equivalent to migrate to; just nest.

```dart
// Before (static mode)
final transaction = Sentry.startTransaction('checkout', 'task');
try {
  final child = transaction.startChild('db.query', description: 'load cart');
  final cart = await loadCart();
  await child.finish();
  transaction.setData('cart.item_count', cart.items.length);
  transaction.status = const SpanStatus.ok();
} catch (exception) {
  transaction.status = const SpanStatus.internalError();
  rethrow;
} finally {
  await transaction.finish();
}

// After (streaming mode)
await Sentry.startSpan('checkout', (span) async {
  final cart = await Sentry.startSpan('load cart', (_) => loadCart());
  span.setAttribute('cart.item_count', SentryAttribute.int(cart.items.length));
});
```

Error handling is automatic: if the callback throws (or the future errors), the span status is set to `SentrySpanStatusV2.error` before the span ends, and the error is rethrown.

For synchronous work, use `Sentry.startSpanSync`:

```dart
final config = Sentry.startSpanSync('parse-config', (_) {
  return Config.parse(raw);
});
```

Both variants can be freely nested — parent-child relationships resolve correctly across sync/async boundaries. If a span is not sampled, the callback still runs and receives a no-op span, so all span operations are safe.

### 2.3 Spans That Outlive a Callback

Use `Sentry.startInactiveSpan` when the work cannot be wrapped in a single callback — widget lifecycles, stream subscriptions, platform channel round-trips. You must call `end()` manually, and other spans do **not** automatically become its children.

```dart
final paymentSpan = Sentry.startInactiveSpan('payment',
    attributes: {'payment.provider': SentryAttribute.string('stripe')});

// ...later, from a different entry point
void onDeepLink(Uri uri) {
  paymentSpan.end();
}
```

By default the span is created as a child of the currently active span. To parent explicitly, pass `parentSpan:`; pass `parentSpan: null` to force a root span.

### 2.4 Migrate `setData` / `setTag` to Typed Attributes

Streamed spans use typed attributes instead of untyped data and tags:

```dart
// Before
transaction.setData('retry_count', 3);
transaction.setTag('payment.provider', 'stripe');

// After
span.setAttribute('retry_count', SentryAttribute.int(3));
span.setAttributes({
  'payment.provider': SentryAttribute.string('stripe'),
  'cache.hit': SentryAttribute.bool(true),
  'response_time_ms': SentryAttribute.double(12.5),
});
span.removeAttribute('old_key');
```

| Factory | Dart Type |
|---|---|
| `SentryAttribute.string(v)` | `String` |
| `SentryAttribute.int(v)` | `int` |
| `SentryAttribute.bool(v)` | `bool` |
| `SentryAttribute.double(v)` | `double` |

### 2.5 Migrate `beforeSendTransaction`

`beforeSendTransaction` has **no effect** in streaming mode — transactions are never created, so the callback is never invoked. Migrate its logic:

| Use Case | Streaming Replacement |
|---|---|
| Drop spans by name | `ignoreSpans` with `IgnoreSpanRule` |
| Scrub sensitive data / PII | `beforeSendSpan` |
| Modify span data before send | `beforeSendSpan` |

`beforeSendSpan` receives each `SentrySpanV2` before it is sent. Unlike other `beforeSend` callbacks, it **cannot drop spans** — it is mutation-only (`FutureOr<void>` return). Use `ignoreSpans` to drop.

```dart
await Sentry.init((options) {
  options.traceLifecycle = SentryTraceLifecycle.stream;
  options.beforeSendSpan = (span) {
    span.removeAttribute('http.request.body');
  };
});
```

Remove the `beforeSendTransaction` option after migrating its logic.

### 2.6 Configure `ignoreSpans` (Optional)

`ignoreSpans` drops spans by name before sampling. Matching is name-only (attribute matching is not yet supported in the Dart SDK).

```dart
options.ignoreSpans = [
  IgnoreSpanRule.nameEquals('health-check'),
  IgnoreSpanRule.nameStartsWith('internal.'),
  IgnoreSpanRule.nameContains('metrics'),
  IgnoreSpanRule.nameEndsWith('.bg'),
];
```

| Factory | Matches |
|---|---|
| `IgnoreSpanRule.nameEquals(String)` | Exact span name |
| `IgnoreSpanRule.nameStartsWith(Pattern)` | Name prefix (String or RegExp) |
| `IgnoreSpanRule.nameContains(Pattern)` | Name substring (String or RegExp) |
| `IgnoreSpanRule.nameEndsWith(String)` | Name suffix |

When an ignored span has children, the children are re-parented to the nearest recording ancestor rather than dropped.

### 2.7 Flutter Auto-Instrumentation

No code changes needed: frames tracking, app start, TTID/TTFD, navigation, user interaction, HTTP, database, and GraphQL instrumentations all switch to the streaming API automatically when `traceLifecycle` is `stream`.

### 2.8 Sampling

`tracesSampleRate` and `tracesSampler` work unchanged. Only **root spans** are sampled; child spans inherit the root's decision. When a root span is not sampled, the callback still executes with a no-op span.

---

## Phase 3: Verify

### 3.1 Static Check

```bash
dart analyze 2>&1 | head -30
# or for Flutter projects
flutter analyze 2>&1 | head -30
```

Expect no new analyzer errors from the migration.

### 3.2 Runtime Verification

Instruct the user to verify with `options.debug = true` or network inspection:

1. **Envelope content type**: span envelopes are sent with content type `application/vnd.sentry.items.span.v2+json` instead of transaction envelopes. Spans are buffered briefly and flushed in batches (after ~5 seconds, 100 spans, or 1 MiB — whichever comes first).
2. **Sentry dashboard**: spans appear in the Traces view shortly after each span completes, without waiting for a whole transaction to finish.
3. **No-op warnings**: a log line `startTransaction is not supported when traceLifecycle is 'streaming'` means old transaction API calls remain — find and migrate them.

### 3.3 Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Log: `startTransaction is not supported when traceLifecycle is 'streaming'` | Old transaction API still called in streaming mode | Replace with `Sentry.startSpan` / `startSpanSync` |
| `Sentry.startSpan` produces no spans | `traceLifecycle` still `static` (the default), or tracing disabled | Set `options.traceLifecycle = SentryTraceLifecycle.stream` and a `tracesSampleRate` |
| `beforeSendTransaction` never called | Expected in streaming mode | Migrate logic to `beforeSendSpan` or `ignoreSpans`, then remove it |
| Returning a value from `beforeSendSpan` to drop a span does nothing | `beforeSendSpan` is mutation-only (`FutureOr<void>` return) | Use `ignoreSpans` to drop spans |
| Compile error: `startSpan` callback type mismatch | Callback must return `Future<T>` for `startSpan` | Use `startSpanSync` for synchronous work |

---

## Quick Reference

### Minimal Flutter Setup

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init((options) {
    options.dsn = '__DSN__';
    options.tracesSampleRate = 1.0;
    options.traceLifecycle = SentryTraceLifecycle.stream;
  }, appRunner: () => runApp(const MyApp()));
}
```

### Minimal Dart Setup

```dart
import 'package:sentry/sentry.dart';

Future<void> main() async {
  await Sentry.init((options) {
    options.dsn = '__DSN__';
    options.tracesSampleRate = 1.0;
    options.traceLifecycle = SentryTraceLifecycle.stream;
  });

  await Sentry.startSpan('main-task', (span) async {
    span.setAttribute('job.id', SentryAttribute.string('42'));
    await doWork();
  });
}
```

### Full Migration Checklist

- [ ] SDK version is `>=9.19.0` (`sentry` / `sentry_flutter`)
- [ ] `options.traceLifecycle = SentryTraceLifecycle.stream` set in every init call
- [ ] All `Sentry.startTransaction` calls replaced with `Sentry.startSpan` / `startSpanSync` / `startInactiveSpan`
- [ ] All `startChild` calls replaced with nested `Sentry.startSpan` calls
- [ ] `setData` / `setTag` on spans replaced with typed `setAttribute` / `SentryAttribute`
- [ ] `beforeSendTransaction` logic migrated to `beforeSendSpan` or `ignoreSpans`, option removed
- [ ] `startInactiveSpan` spans have a guaranteed `end()` call path
- [ ] `dart analyze` / `flutter analyze` passes
- [ ] Spans visible in Sentry Traces view
