# Profiling — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android` ≥ 7.0.0 for transaction-based profiling
> `io.sentry:sentry-android` ≥ 8.7.0 for continuous/UI profiling (recommended)
> **Requirement:** Profiling requires tracing to be enabled. Only transactions sampled for tracing can be profiled.
> **Platform requirement:** Android API 22+ (silently disabled on older devices)

Android profiling samples the call stack at ~101 Hz using `Debug.startMethodTracingSampling()` to surface hot code paths and slow functions. Profiles are attached to transactions and visible as flame graphs in Sentry.

---

## Table of Contents

1. [How Profiling Works](#1-how-profiling-works)
2. [Continuous / UI Profiling (Recommended)](#2-continuous--ui-profiling-recommended)
3. [Transaction-Based Profiling (Legacy)](#3-transaction-based-profiling-legacy)
4. [Choosing a Mode](#4-choosing-a-mode)
5. [What Data Is Captured](#5-what-data-is-captured)
6. [Performance Overhead](#6-performance-overhead)
7. [Configuration Reference](#7-configuration-reference)
8. [Known Limitations](#8-known-limitations)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. How Profiling Works

```
Transaction starts (sampled)
  │
  ├── Profiler starts: Debug.startMethodTracingSampling(file, 3MB, ~9901 μs)
  │     ├── Samples JS/Kotlin/Java call stack at ~101 Hz
  │     └── Writes binary trace to local file
  │
  ├── Transaction body executes
  │     ├── Your code: Kotlin/Java frames
  │     ├── Auto-instrumented spans (OkHttp, SQLite, etc.)
  │     └── Collected: frames_slow, frames_frozen, screen_frame_rate
  │
  └── Transaction finishes
        ├── Profiler stops: Debug.stopMethodTracing()
        ├── Profile data deserialized into ProfilingTraceData
        └── Attached to transaction envelope → uploaded to Sentry
```

### Sampling relationship

`profilesSampleRate` is **relative to `tracesSampleRate`** — not to all transactions:

```
All transactions
    └─ × tracesSampleRate  → Traced transactions
              └─ × profilesSampleRate → Profiled transactions
```

Example: `tracesSampleRate = 0.2` + `profilesSampleRate = 0.5` → 10% of all transactions are profiled.

---

## 2. Continuous / UI Profiling (Recommended)

Available since SDK 8.7.0. Profiles the entire app session (or only during active traces) rather than individual transactions. No 30-second hard cap.

### Setup

```kotlin
import io.sentry.ProfileLifecycle
import io.sentry.android.core.SentryAndroid

SentryAndroid.init(this) { options ->
    options.dsn = "YOUR_DSN"

    // Tracing is required for TRACE lifecycle; optional for MANUAL
    options.tracesSampleRate = 1.0

    // Fraction of app sessions to profile continuously (evaluated once per session)
    // 1.0 = all sessions — development/testing only
    options.profileSessionSampleRate = 1.0

    // TRACE: profile starts/stops automatically with root spans
    // MANUAL: you call Sentry.startProfiler() / Sentry.stopProfiler()
    options.profileLifecycle = ProfileLifecycle.TRACE

    // MANUAL lifecycle only: start profiling from the very first frame
    // options.isProfilingStartOnAppStart = true
}
```

### `TRACE` lifecycle

Profiler starts automatically when the first **sampled root span** begins, and stops when all root spans finish. No code changes needed beyond the options above.

```
App launches
  └─ First traced transaction starts → profiler starts
       ├─ Activity load transaction
       ├─ User taps → another transaction
       └─ All transactions finish → profiler stops
           └─ Profile chunks emitted every 60 s
```

### `MANUAL` lifecycle

You control start/stop explicitly. Does **not** require tracing.

```kotlin
import io.sentry.Sentry

// @ApiStatus.Experimental — API may change
Sentry.startProfiler()

// ... do work you want to profile ...

Sentry.stopProfiler()
```

> **Note:** `startProfiler()` and `stopProfiler()` are `@ApiStatus.Experimental`. Pin your SDK version if API stability matters.

### Profile chunks

Continuous profiling emits profile data in 60-second rolling chunks. Each chunk is a separate envelope item correlated to active transactions via `profilerId`:

```
Session start  → profilerId generated (shared across all chunks)
Every 60 s     → ProfileChunk(profilerId, chunkId, frames) uploaded
Each transaction → contexts.profile.profiler_id = profilerId (links tx → profile)
```

---

## 3. Transaction-Based Profiling (Legacy)

Available since SDK 7.0.0. Profiles are scoped to individual sampled transactions with a 30-second hard cap.

### Setup

```kotlin
SentryAndroid.init(this) { options ->
    options.dsn = "YOUR_DSN"

    // Both must be set — profiling is relative to tracing
    options.tracesSampleRate = 1.0
    options.profilesSampleRate = 1.0  // 1.0 = profile all traced transactions

    // Or: dynamic profiling sampler
    // options.profilesSampler = ProfilesSamplerCallback { ctx ->
    //     if (ctx.transactionContext.name.contains("Checkout")) 1.0 else 0.1
    // }
}
```

Java equivalent:
```java
options.setTracesSampleRate(1.0);
options.setProfilesSampleRate(1.0);
```

### 30-second hard cap

Transaction profiling uses `Debug.startMethodTracingSampling()` which is limited to 30 seconds. Profiles for transactions longer than 30 s are automatically truncated:

```
Android SDK constants:
  BUFFER_SIZE_BYTES    = 3_000_000  (3 MB ring buffer)
  PROFILING_TIMEOUT_MILLIS = 30_000 (30 s hard cap)
  Sampling interval    ≈ 9,901 μs   (101 Hz)
```

> **This is the primary reason to prefer continuous profiling.** Transactions that exceed 30 s (e.g., long-running background work) have incomplete profiles in the transaction-based mode.

### Mutual exclusivity

Setting `profilesSampleRate` (even to `0.0`) disables continuous profiling. The two modes cannot be used simultaneously:

```kotlin
// ✅ Continuous profiling only
options.profileSessionSampleRate = 0.5   // set this
// options.profilesSampleRate not set

// ✅ Transaction profiling only (legacy)
options.profilesSampleRate = 0.5         // set this
// options.profileSessionSampleRate not set

// ❌ Both set — continuous profiling silently disabled
options.profilesSampleRate = 0.5
options.profileSessionSampleRate = 0.5   // ignored
```

---

## 4. Choosing a Mode

| | Continuous / UI Profiling | Transaction-Based (Legacy) |
|--|--------------------------|---------------------------|
| **SDK version** | ≥ 8.7.0 | ≥ 7.0.0 |
| **Duration limit** | None (60 s chunks) | 30 s hard cap |
| **Tracing required** | `TRACE` lifecycle: yes. `MANUAL`: no | Yes |
| **Overhead** | Higher (always sampling) | Lower (transaction-gated) |
| **Recommended for** | All new projects | Existing projects not yet on 8.7+ |
| **App start coverage** | ✅ `isProfilingStartOnAppStart = true` | ❌ Profile starts with first transaction |
| **API stability** | `startProfiler/stopProfiler` are experimental | Stable |

**Choose continuous profiling** unless you are constrained to SDK < 8.7.0 or need to minimize profiling overhead on low-end devices.

---

## 5. What Data Is Captured

### In a profile

| Data | Description |
|------|-------------|
| **Call stack samples** | Java/Kotlin stack frames sampled at ~101 Hz |
| **Flame graph** | Aggregated time-per-function view |
| **Timeline** | Stack samples correlated with transaction spans |
| **Thread info** | Main thread, background threads, system threads |
| **Frame metrics** | `frames_slow`, `frames_frozen`, `screen_frame_rate` |
| **Function names** | Readable names require ProGuard mapping upload |

### What profiles are linked to

Each profile chunk (continuous) or profile (transaction-based) is correlated with transactions via `profilerId`. In the Sentry UI you can:
- View flame graph alongside the transaction's span waterfall
- Identify which functions executed during slow spans
- Click from a slow span to the corresponding stack samples

### What is NOT captured

- Memory allocations (use Android Studio Memory Profiler)
- Network traffic details (captured separately by OkHttp spans)
- GPU rendering details (slow/frozen frames are a separate measurement)

---

## 6. Performance Overhead

Profiling adds CPU overhead. `Debug.startMethodTracingSampling()` uses sampling (not full instrumentation), which keeps overhead lower than full instrumentation profilers.

| Factor | Impact |
|--------|--------|
| Transaction-based profiling | Low-medium — only active during traced transactions |
| Continuous (`TRACE` lifecycle) | Medium — always running while any transaction is active |
| Continuous (`MANUAL` lifecycle) | Higher — runs from `startProfiler()` to `stopProfiler()` |
| Low-end Android devices (< 4GB RAM) | More significant — test on representative devices |

**Recommendations:**
- Use `profilesSampleRate = 1.0` or `profileSessionSampleRate = 1.0` **only** in development/testing
- In production: keep `profilesSampleRate ≤ 0.1` or `profileSessionSampleRate ≤ 0.1`
- On low-end devices: reduce to `0.01`–`0.05`
- Use `TRACE` lifecycle instead of `MANUAL` to gate profiling to active transactions

---

## 7. Configuration Reference

### `SentryAndroid.init()` — profiling options

```kotlin
SentryAndroid.init(this) { options ->
    // ── Required: tracing ────────────────────────────────────────────────
    options.tracesSampleRate = 0.2       // required for TRACE lifecycle and transaction profiling

    // ── Continuous profiling (recommended, SDK ≥ 8.7.0) ──────────────────
    options.profileSessionSampleRate = 0.1          // 10% of sessions profiled
    options.profileLifecycle = ProfileLifecycle.TRACE  // or MANUAL
    options.isProfilingStartOnAppStart = false       // MANUAL only: start from first frame

    // ── Transaction-based profiling (legacy) ──────────────────────────────
    // options.profilesSampleRate = 0.1              // mutually exclusive with continuous
    // options.profilesSampler = ProfilesSamplerCallback { ctx -> 0.1 }
}
```

### `AndroidManifest.xml` — profiling keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `io.sentry.traces.profiling.sample-rate` | Float | `null` | Transaction profiling rate (legacy) |
| `io.sentry.traces.profiling.session-sample-rate` | Float | `null` | Continuous profiling session rate |
| `io.sentry.traces.profiling.lifecycle` | String | `"manual"` | `"manual"` or `"trace"` |
| `io.sentry.traces.profiling.start-on-app-start` | Boolean | `false` | Auto-start profiler at app launch |

Via manifest (continuous profiling):
```xml
<meta-data android:name="io.sentry.traces.profiling.session-sample-rate" android:value="0.1" />
<meta-data android:name="io.sentry.traces.profiling.lifecycle" android:value="trace" />
```

### `ProfileLifecycle` enum

| Value | Profiler starts | Profiler stops | Requires tracing |
|-------|----------------|----------------|-----------------|
| `TRACE` | First sampled root span | All root spans finished | Yes |
| `MANUAL` | `Sentry.startProfiler()` | `Sentry.stopProfiler()` | No |

### Manual start/stop (MANUAL lifecycle only)

```kotlin
// @ApiStatus.Experimental
Sentry.startProfiler()
// ... work to profile ...
Sentry.stopProfiler()
```

---

## 8. Known Limitations

### Android API minimum

Profiling uses `Debug.startMethodTracingSampling()`, which requires API 21+; effective minimum is **API 22**. Silently disabled on older devices with no error or warning.

### Transaction profiling: 30-second hard cap

Profiles for transactions longer than 30 s are automatically truncated. The transaction itself continues normally, but the profile has missing data for anything after 30 s. Use continuous profiling to avoid this.

### 3 MB ring buffer

Transaction profiling uses a 3 MB buffer. Very high-frequency call stacks on low-memory devices may overflow the buffer, causing early profile termination.

### ProGuard/R8 obfuscation

Release builds with ProGuard/R8 enabled produce obfuscated frame names (e.g., `a.b()`, `c.d()`). Upload mapping files to see readable names:

```kotlin
// build.gradle.kts
sentry {
    autoUploadProguardMapping = true
}
```

### Background transactions

If a transaction is abandoned while the app is backgrounded, the profile may be truncated. `DEADLINE_EXCEEDED` transactions may not have complete profiles.

### Continuous profiling API stability

`Sentry.startProfiler()` and `Sentry.stopProfiler()` are `@ApiStatus.Experimental`. The `_experiments` config block used in some SDKs is **not** used in Android — use `options.profileSessionSampleRate`, `options.profileLifecycle`, and `options.isProfilingStartOnAppStart` directly.

### Continuous profiling chunk duration

Chunks are emitted on a fixed 60-second cycle (`MAX_CHUNK_DURATION_MILLIS = 60_000`). This is not configurable.

---

## 9. Troubleshooting

| Issue | Likely cause | Solution |
|-------|-------------|----------|
| No profiles appearing | `profilesSampleRate` or `profileSessionSampleRate` not set, or `tracesSampleRate = 0` | Set both sample rates > 0; verify DSN is correct |
| Frame names appear obfuscated (`a.b`, `c.d`) | ProGuard/R8 mapping not uploaded | Configure `autoUploadProguardMapping = true` in the Sentry Gradle plugin |
| Transaction profiling stops at 30 s | Hard-coded 30 s cap | Switch to continuous profiling (`profileSessionSampleRate`) |
| Continuous profiling has no data | `TRACE` lifecycle but no transactions sampled | Verify `tracesSampleRate > 0`; check Sentry DSN and that events appear in Sentry |
| `startProfiler()` has no effect | `TRACE` lifecycle selected instead of `MANUAL` | Set `options.profileLifecycle = ProfileLifecycle.MANUAL` before calling `startProfiler()` |
| Profiling causes visible app slowdown | Sample rate too high on low-end device | Reduce `profilesSampleRate` or `profileSessionSampleRate` to ≤ 0.05 on low-end devices |
| `profileSessionSampleRate` ignored | `profilesSampleRate` is also set | Remove `profilesSampleRate` — the two modes are mutually exclusive |
| Profiles appear for some transactions only | Expected — sample rate controls the fraction | Increase rate if you want broader coverage |
| App start not profiled | `isProfilingStartOnAppStart = false` (default) | Set `options.isProfilingStartOnAppStart = true` with `MANUAL` lifecycle |
| API < 22 device not profiling | Silently disabled | Profiling requires Android API 22+; check device API level |
| Profile data incomplete for long sessions | 60 s chunk boundary | Normal behavior — chunks are separate envelope items; use the trace waterfall to correlate |
