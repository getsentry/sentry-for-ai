# Profiling — Sentry React Native SDK

> **Minimum SDK:** `@sentry/react-native` ≥ 5.32.0 for basic profiling · ≥ 5.33.0 for JS-only mode · ≥ 7.9.0 (Android) / ≥ 7.12.0 (iOS) for UI Profiling

Profiling samples the call stack at regular intervals to surface hot code paths and slow functions. The React Native SDK profiles both layers of the stack simultaneously: **JavaScript via Hermes** and **native code via platform profilers** (iOS Instruments-style on iOS, Android profiling on Android).

> Profiling requires tracing to be enabled. Only transactions that are sampled for tracing can be profiled.

---

## Table of Contents

1. [How Profiling Works](#1-how-profiling-works)
2. [Basic Setup](#2-basic-setup)
3. [Hermes + Platform Profilers](#3-hermes--platform-profilers)
4. [UI Profiling (Experimental)](#4-ui-profiling-experimental)
5. [What Data Is Captured](#5-what-data-is-captured)
6. [Performance Overhead](#6-performance-overhead)
7. [Expo Compatibility](#7-expo-compatibility)
8. [iOS-Specific Notes](#8-ios-specific-notes)
9. [Android-Specific Notes](#9-android-specific-notes)
10. [Configuration Reference](#10-configuration-reference)
11. [Version Requirements](#11-version-requirements)
12. [Known Limitations](#12-known-limitations)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. How Profiling Works

When a transaction is sampled for profiling, the SDK starts sampling the call stack at a fixed interval for the duration of the transaction. Profiles are then attached to the transaction and uploaded to Sentry alongside it.

### Two-layer profiling

```
Transaction starts
│
├── Hermes profiler ─────── JS stack (your React components, business logic, etc.)
│
└── Platform profilers ──── Native stack (Obj-C/Swift on iOS, Kotlin/Java on Android)
                             Bridge calls, native modules, OS calls visible here
```

Both layers run simultaneously. The Sentry UI merges them into a single flame graph so you can trace a slow operation from JS → bridge → native.

### Sampling relationship

`profilesSampleRate` is **relative to `tracesSampleRate`**, not to all transactions:

```
All transactions
    └── × tracesSampleRate → Traced transactions
             └── × profilesSampleRate → Profiled transactions
```

Example: `tracesSampleRate: 0.2` + `profilesSampleRate: 0.5` → 10% of all transactions are profiled.

---

## 2. Basic Setup

### Minimum configuration

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",

  // Tracing must be enabled — profiling only applies to traced transactions
  tracesSampleRate: 1.0,

  // profilesSampleRate is relative to tracesSampleRate
  // 1.0 = profile every traced transaction (development / testing only)
  profilesSampleRate: 1.0,
});
```

### Recommended production rates

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 0.2,   // trace 20% of transactions
  profilesSampleRate: 0.5, // profile 50% of those → 10% of all transactions profiled
});
```

> **Production guidance:** Profiling adds overhead (see [Performance Overhead](#6-performance-overhead)). Keep `profilesSampleRate` low in production, especially on lower-end Android devices.

---

## 3. Hermes + Platform Profilers

By default, both Hermes (JS) and native platform profilers run simultaneously. Use `hermesProfilingIntegration` to control this behavior:

### Default: both JS and native (recommended)

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  // hermesProfilingIntegration is added automatically
  // platformProfilers defaults to true
});
```

### Explicit configuration

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    Sentry.hermesProfilingIntegration({
      platformProfilers: true,  // default: true — profile native code alongside Hermes JS
      // Set to false to profile ONLY JavaScript (Hermes), skipping native profiling
      // Useful for isolating JS performance issues or reducing overhead
      // Requires SDK ≥ 5.33.0
    }),
  ],
});
```

### When to disable `platformProfilers`

- Isolating a JS-only performance problem (want only the Hermes flame graph)
- Reducing profiling overhead on lower-end devices
- Debugging JS event loop stalls where native noise is distracting

---

## 4. UI Profiling (Experimental)

Standard profiling is transaction-scoped: it starts and stops with each sampled transaction. **UI Profiling** is continuous — it profiles the entire app session (or from app start), independent of transaction boundaries.

Useful for catching performance issues that span multiple transactions or occur outside instrumented code paths.

> **Experimental feature.** The API is under `_experiments` and may change without a major version bump. Available on Android (SDK ≥ 7.9.0) and iOS (SDK ≥ 7.12.0).

```typescript
Sentry.init({
  dsn: "YOUR_DSN",
  tracesSampleRate: 1.0,

  _experiments: {
    profilingOptions: {
      // Fraction of app sessions to profile (0.0–1.0)
      profileSessionSampleRate: 1.0,

      // "trace" = profile only while a transaction is active
      // (still continuous but gated on active traces)
      lifecycle: "trace",

      // Start profiling from the very first frame (captures cold start behavior)
      startOnAppStart: true,
    },
  },
});
```

> **Migration note:** `androidProfilingOptions` (the previous Android-only experimental flag) is **deprecated**. Use `profilingOptions` inside `_experiments` instead — it covers both platforms.

---

## 5. What Data Is Captured

### In a profile

| Data | Description |
|------|-------------|
| **Call stack samples** | Sampled JS + native stack frames at regular intervals |
| **Flame graph** | Aggregated view of time spent in each function |
| **Timeline** | Stack samples over time, correlated with transaction spans |
| **Thread info** | JS thread, main thread, background threads (native) |
| **Function names** | From JS source maps + native debug symbols |

### What profiles are linked to

Each profile is attached to the transaction that triggered it. In the Sentry UI you can:
- View the flame graph alongside the transaction's span waterfall
- Identify which functions were executing during slow spans
- Click through from a slow span to the corresponding stack samples

### What is NOT captured

- Memory allocations (use Instruments / Android Studio for that)
- Network traffic details (captured separately by tracing spans)
- UI rendering frames (slow/frozen frames are a separate tracing metric)

---

## 6. Performance Overhead

Profiling adds CPU and memory overhead. The Hermes profiler uses a sampling approach (not instrumentation), which keeps overhead lower than full instrumentation-based profilers, but it is not zero.

| Factor | Impact |
|--------|--------|
| Hermes profiler (JS only) | Low — sampling-based, not instrumented |
| Platform profilers (native) | Medium — involves OS-level hooks |
| UI Profiling (continuous) | Higher — always running, not transaction-gated |
| Sample rate in Sentry.init | Linear — 10% profiled = ~10× less overhead than 100% |

**Recommendations:**
- Use `profilesSampleRate: 1.0` only in development/testing
- In production, keep `profilesSampleRate ≤ 0.1` for most apps
- On lower-end Android devices (< 4GB RAM), consider even lower rates
- If using UI Profiling experimentally, keep `profileSessionSampleRate` very low in production (0.01–0.05)

---

## 7. Expo Compatibility

| Feature | Expo Go | Expo (Development Build / EAS Build) |
|---------|---------|--------------------------------------|
| Basic profiling (`profilesSampleRate`) | ❌ Not supported | ✅ Supported |
| Platform profilers (`platformProfilers: true`) | ❌ Not supported | ✅ Supported |
| UI Profiling (experimental) | ❌ Not supported | ✅ Supported |

Profiling requires native modules that are not available in Expo Go. You must use a [Development Build](https://docs.expo.dev/develop/development-builds/introduction/) or a production build via EAS Build.

For Expo projects, make sure the Sentry Expo plugin is configured in your `app.config.js` / `app.json`:

```json
{
  "plugins": [
    [
      "@sentry/react-native/expo",
      {
        "organization": "your-org",
        "project": "your-project"
      }
    ]
  ]
}
```

---

## 8. iOS-Specific Notes

- **Simulator:** Profiling works on the iOS Simulator but native platform profiler results may differ from real device behavior. Always validate on a real device before drawing conclusions.
- **Debug builds:** Symbol names are preserved automatically. Profile data is readable without extra configuration.
- **Release builds:** Native frames will show as addresses without symbols unless you upload dSYM files. Configure the Sentry Xcode build phase to upload dSYMs automatically.
- **Bitcode:** If your project uses bitcode (older setups), ensure dSYMs are downloaded from App Store Connect and uploaded to Sentry — these are the re-compiled symbols, not the ones from your local build.
- **Cold start profiling:** To capture profiling during app cold start (before the first transaction begins), use UI Profiling with `startOnAppStart: true`.

---

## 9. Android-Specific Notes

- **Hermes required:** The JS profiler targets the Hermes engine. JSC (JavaScriptCore) is not supported for JS profiling. Hermes is the default engine for React Native ≥ 0.70 and is required.
- **Release builds:** Native frame symbols require ProGuard/R8 mapping files to be uploaded to Sentry. Configure the Sentry Android Gradle plugin to upload them on each build.
- **Android version:** Platform profiling works on Android 5.0 (API 21) and above — the same minimum as React Native itself.
- **Low-end devices:** Profiling adds measurable overhead on devices with limited RAM or slow CPUs. Test on representative low-end devices before enabling in production.
- **Background processes:** Native platform profilers capture all threads, including those from third-party native libraries. Expect some noise from libraries that run background threads.

---

## 10. Configuration Reference

### `Sentry.init` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profilesSampleRate` | `number` (0–1) | `undefined` | Fraction of *traced* transactions to also profile. Relative to `tracesSampleRate`. |
| `tracesSampleRate` | `number` (0–1) | `undefined` | Required for profiling. Fraction of transactions to trace. |

### `hermesProfilingIntegration` options

| Option | Type | Default | SDK Version | Description |
|--------|------|---------|-------------|-------------|
| `platformProfilers` | `boolean` | `true` | ≥ 5.32.0 | Profile native code (Swift/ObjC/Kotlin/Java) alongside Hermes JS. Set `false` for JS-only profiling. |

### `_experiments.profilingOptions` (UI Profiling)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profileSessionSampleRate` | `number` (0–1) | — | Fraction of app sessions to profile continuously |
| `lifecycle` | `"trace"` | — | When to profile. Currently only `"trace"` is supported. |
| `startOnAppStart` | `boolean` | `false` | Begin profiling at the very first frame, before any transaction starts |

---

## 11. Version Requirements

| Feature | Min SDK | Platforms |
|---------|---------|-----------|
| `profilesSampleRate` (basic profiling) | `5.32.0` | iOS, Android |
| `platformProfilers: false` (JS-only mode) | `5.33.0` | iOS, Android |
| UI Profiling (experimental) | `7.9.0` (Android) · `7.12.0` (iOS) | iOS, Android |

---

## 12. Known Limitations

- **Expo Go:** Not supported. Requires a native build.
- **JSC engine:** JS profiling only supports Hermes. Projects using JavaScriptCore will not get JS profiles.
- **Web/SSR:** The profiling integration is mobile-only. Do not include `hermesProfilingIntegration` in web bundles.
- **Background transactions:** If a transaction completes in the background (app backgrounded mid-transaction), the profile may be truncated.
- **Profile size limits:** Very long transactions with many stack frames can produce large profiles. Sentry may truncate profiles that exceed server-side size limits. Keep `finalTimeoutMs` reasonable (default: 600,000 ms).
- **JS minification in production:** Hermes profile frame names will show minified names unless JS source maps are uploaded to Sentry. Configure the Sentry Metro plugin.
- **Native symbol resolution:** Native frames show as hex addresses unless dSYMs (iOS) or ProGuard mapping files (Android) are uploaded.
- **Simulator accuracy:** iOS Simulator profiling does not reflect real device performance characteristics, especially for native code. Validate on real devices.
- **UI Profiling API stability:** The `_experiments.profilingOptions` API may change. Pin your SDK version if stability matters.

---

## 13. Troubleshooting

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| No profiles appearing in Sentry | `profilesSampleRate` not set, or `tracesSampleRate` is `0` or unset | Ensure both are set to `> 0`. Check Sentry DSN is correct. |
| JS frames show as minified names (e.g., `t`, `n`, `r`) | Source maps not uploaded | Configure the Sentry Metro plugin to upload source maps on each build |
| Native frames show as hex addresses | dSYM (iOS) or ProGuard mapping (Android) not uploaded | Configure Sentry Xcode / Gradle plugin to upload symbols |
| Profiling causes visible app slowdown | `profilesSampleRate` too high, or `platformProfilers: true` on slow devices | Reduce `profilesSampleRate`; try `platformProfilers: false` |
| `hermesProfilingIntegration is not a function` | SDK version < 5.32.0 | Upgrade to `@sentry/react-native` ≥ 5.32.0 |
| Profiling not working in Expo Go | Expo Go lacks native modules | Switch to a Development Build or EAS Build |
| UI Profiling config has no effect | Using deprecated `androidProfilingOptions` | Migrate to `_experiments.profilingOptions` |
| Profile data appears but flame graph is mostly "unknown" | Missing both source maps AND native symbols | Upload both source maps and dSYMs/ProGuard files |
| Profiles appear only for some transactions | Expected behavior — `profilesSampleRate` controls the fraction | This is correct. Increase the rate if you want broader coverage. |
| App crashes on startup after adding profiling | Hermes not enabled | Verify Hermes is enabled in your React Native config (it's the default for RN ≥ 0.70) |
