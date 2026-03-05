# Profiling — Sentry Flutter SDK

> **Minimum SDK:** `sentry_flutter` ≥ **7.12.0**  
> **Status:** ⚠️ **Alpha** — API may change without a major version bump  
> **Platforms:** **iOS and macOS only** — Android, Web, Linux, Windows not supported

Profiling samples the Dart and native call stack at regular intervals to surface hot code paths and slow functions. It requires tracing to be enabled — only transactions that are sampled can be profiled.

---

## Table of Contents

1. [How Profiling Works](#1-how-profiling-works)
2. [Basic Setup](#2-basic-setup)
3. [What Data Is Captured](#3-what-data-is-captured)
4. [Performance Overhead](#4-performance-overhead)
5. [Configuration Reference](#5-configuration-reference)
6. [Known Limitations](#6-known-limitations)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. How Profiling Works

When a transaction is sampled for profiling, the SDK starts sampling the call stack at a fixed interval for the duration of that transaction. The profile is attached to the transaction and uploaded to Sentry alongside it.

### Sampling relationship

`profilesSampleRate` is **relative to `tracesSampleRate`**, not to all transactions:

```
All transactions
    └── × tracesSampleRate → Traced transactions
             └── × profilesSampleRate → Profiled transactions
```

Example: `tracesSampleRate: 0.2` + `profilesSampleRate: 0.5` → 10% of all transactions are profiled.

### Platform constraint

The Flutter profiler hooks into the native iOS/macOS profiling infrastructure (equivalent to Instruments-style profiling). Android, Web, Linux, and Windows do **not** support profiling at the `profilesSampleRate` level — setting the option on those platforms has no effect.

---

## 2. Basic Setup

### Minimum configuration

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_DSN';

      // Tracing must be enabled — profiling only applies to traced transactions
      options.tracesSampleRate = 1.0;

      // profilesSampleRate is relative to tracesSampleRate
      // 1.0 = profile every traced transaction (development / testing only)
      options.profilesSampleRate = 1.0;
    },
    appRunner: () => runApp(MyApp()),
  );
}
```

### Recommended production configuration

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_DSN';

    // Trace 20% of transactions
    options.tracesSampleRate = 0.2;

    // Profile 50% of those → 10% of all transactions profiled
    options.profilesSampleRate = 0.5;
  },
  appRunner: () => runApp(MyApp()),
);
```

> **Production guidance:** Profiling adds overhead. Keep `profilesSampleRate` low in production. Values above 0.1 are not recommended without explicit performance validation on your minimum supported device.

### Verifying profiles appear in Sentry

1. Build and run on a **real iOS device** (not Simulator — see [Known Limitations](#6-known-limitations))
2. Trigger a user interaction that creates a transaction (e.g., navigate between screens with `SentryNavigatorObserver`)
3. Open Sentry → Performance → find the transaction → look for the **Profiling** tab in the transaction detail

---

## 3. What Data Is Captured

### In a profile

| Data | Description |
|------|-------------|
| **Call stack samples** | Sampled Dart + native stack frames at regular intervals |
| **Flame graph** | Aggregated view of time spent in each function |
| **Timeline** | Stack samples over time, correlated with transaction spans |
| **Thread info** | Main isolate thread, background threads, native threads |
| **Function names** | From Dart debug info + native debug symbols |

### What profiles are linked to

Each profile is attached to the transaction that triggered it. In the Sentry UI you can:
- View the flame graph alongside the transaction's span waterfall
- Identify which functions were executing during slow spans

### What is NOT captured

- Memory allocations (use Xcode Instruments for that)
- Network traffic details (captured separately via tracing spans)
- UI rendering frames (slow/frozen frames are a separate tracing metric via `SentryNavigatorObserver`)

---

## 4. Performance Overhead

Profiling adds CPU overhead during sampled transactions. The sampler uses a fixed-interval approach (not full instrumentation), which limits overhead but does not eliminate it.

| Factor | Impact |
|--------|--------|
| `profilesSampleRate: 1.0` | Higher — every traced transaction is profiled |
| `profilesSampleRate: 0.1` | Low — only 10% of traced transactions profiled |
| Real device (iPhone 12+) | Minimal visible impact |
| Older devices (iPhone 8 and below) | Measurable impact — validate before enabling |
| iOS Simulator | Works but results differ from device — don't use for benchmarking |

**Recommendations:**
- Use `profilesSampleRate: 1.0` only in development/testing
- In production, start at `profilesSampleRate: 0.05` and increase if needed
- Always validate on your minimum supported iOS device before shipping

---

## 5. Configuration Reference

### `SentryFlutter.init` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profilesSampleRate` | `double` (0–1) | `null` | Fraction of *traced* transactions to also profile. Relative to `tracesSampleRate`. iOS/macOS only. |
| `tracesSampleRate` | `double` (0–1) | `null` | Required for profiling. Fraction of transactions to trace. |
| `tracesSampler` | `function` | `null` | Dynamic trace sampling. Takes precedence over `tracesSampleRate` when set. |

### Minimum version table

| Feature | Min SDK | Platforms |
|---------|---------|-----------|
| `profilesSampleRate` | `7.12.0` | iOS, macOS |

---

## 6. Known Limitations

- **iOS and macOS only.** Android, Web, Linux, and Windows are **not supported**. The option is silently ignored on unsupported platforms.
- **Alpha status.** The profiling API and behavior may change in future minor versions. Pin your SDK version if stability matters for a critical workflow.
- **Simulator accuracy.** iOS Simulator profiling does not reflect real device characteristics. Always validate performance conclusions on real hardware.
- **Tracing required.** Setting `profilesSampleRate` without a non-zero `tracesSampleRate` has no effect — no transactions are sampled, so no profiles can be generated.
- **Obfuscation.** Dart obfuscated builds (common in release builds) will show obfuscated Dart frame names unless you upload Dart symbol files via `sentry_dart_plugin`. Configure the plugin to upload `.symbols` files on each release build.
- **No manual profiling API.** You cannot start/stop a profile programmatically — profiling is transaction-scoped only and controlled entirely by `profilesSampleRate`.
- **Background transactions.** If a transaction completes while the app is backgrounded, the profile may be truncated or absent.

---

## 7. Troubleshooting

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| No profiles appearing in Sentry | `profilesSampleRate` not set, or `tracesSampleRate` is `0` or `null` | Set both to `> 0`. Verify DSN is correct and events appear in Sentry at all. |
| Option is set but no profiles on Android | Android is not supported | Expected — profiling is iOS/macOS only in the Flutter SDK. |
| Dart frames show obfuscated names (e.g., `_f`, `_g`) | Release build without symbol upload | Configure `sentry_dart_plugin` to upload Dart symbol files (`--obfuscate` + `--split-debug-info`) |
| Native frames show as hex addresses | dSYM not uploaded | Configure the Sentry Xcode build phase to upload dSYMs, or use `sentry_dart_plugin` |
| Profiles appear only for some transactions | Expected behavior | `profilesSampleRate` controls the fraction. Increase if you want broader coverage. |
| Profile flame graph shows "unknown" functions | Missing both Dart symbols and dSYMs | Upload both via `sentry_dart_plugin` and the Xcode build phase |
| Profiling not working on iOS Simulator | Known limitation — Simulator profiling may not match device behavior | Validate on a real device. Simulator results are indicative only. |
| App performance degraded after enabling profiling | `profilesSampleRate` too high | Reduce `profilesSampleRate`; test on your minimum supported device |
| SDK crashes on startup with profiling enabled | SDK version < 7.12.0 | Upgrade `sentry_flutter` to ≥ 7.12.0 |
