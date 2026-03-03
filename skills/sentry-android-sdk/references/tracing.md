# Tracing & Performance Monitoring — Sentry Android SDK

> **Minimum SDK:** `io.sentry:sentry-android` ≥ 7.0.0 (≥ 8.0.0 recommended)
> **Gradle Plugin:** `io.sentry:sentry-android-gradle-plugin` ≥ 4.0.0 for zero-source-change instrumentation
> **Languages:** Kotlin and Java — all examples in Kotlin with Java equivalents where they differ
> **Mobile-first note:** Android has unique capabilities web SDKs lack — Activity TTID/TTFD, slow/frozen frame counts, app start tracking (cold/warm), and user interaction tracing. These are first-class citizens in `sentry-android`.

---

## Table of Contents

1. [Basic Tracing Setup](#1-basic-tracing-setup)
2. [Auto-Instrumentation Overview](#2-auto-instrumentation-overview)
3. [App Start Tracing — Cold & Warm](#3-app-start-tracing--cold--warm)
4. [Activity Lifecycle — TTID & TTFD](#4-activity-lifecycle--ttid--ttfd)
5. [Fragment Lifecycle Tracing](#5-fragment-lifecycle-tracing)
6. [OkHttp Network Tracing](#6-okhttp-network-tracing)
7. [SQLite / Room Database Tracing](#7-sqlite--room-database-tracing)
8. [Jetpack Compose Navigation](#8-jetpack-compose-navigation)
9. [File I/O Tracing](#9-file-io-tracing)
10. [User Interaction Tracing](#10-user-interaction-tracing)
11. [Slow & Frozen Frames](#11-slow--frozen-frames)
12. [Sentry Gradle Plugin — Zero-Source-Change Instrumentation](#12-sentry-gradle-plugin--zero-source-change-instrumentation)
13. [Custom Spans](#13-custom-spans)
14. [Distributed Tracing](#14-distributed-tracing)
15. [Dynamic Sampling](#15-dynamic-sampling)
16. [Configuration Reference](#16-configuration-reference)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Basic Tracing Setup

```kotlin
// Application.kt
import io.sentry.android.core.SentryAndroid

SentryAndroid.init(this) { options ->
    options.dsn = "YOUR_DSN"

    // Option A: uniform sample rate (0.0–1.0)
    // 1.0 = 100% of transactions — development/testing only
    options.tracesSampleRate = 1.0

    // Option B: dynamic sampler — overrides tracesSampleRate when set
    // options.tracesSampler = TracesSamplerCallback { ctx ->
    //     if (ctx.transactionContext.name.startsWith("Checkout")) 1.0 else 0.2
    // }
}
```

> **Production recommendation:** Use `tracesSampleRate = 0.2` or lower, or use `tracesSampler` for context-aware control. 100% sampling causes high volume at scale.

---

## 2. Auto-Instrumentation Overview

The SDK instruments three layers automatically. Each layer builds on the previous:

```
TIER 1 — Build-time bytecode (Gradle Plugin)
  DATABASE  →  Room / SQLite → db.sql.query spans (zero source changes)
  FILE_IO   →  FileInputStream/OutputStream → file.read/write spans
  OKHTTP    →  OkHttpClient.Builder.build() → SentryOkHttpInterceptor injected
  COMPOSE   →  rememberNavController() → withSentryObservableEffect() wrapped

TIER 2 — Runtime (SDK integrations, opt-in via options/manifest)
  ActivityLifecycleIntegration  →  ui.load + TTID + TTFD per Activity
  FragmentLifecycleIntegration  →  ui.load per Fragment
  SentryOkHttpInterceptor       →  http.client per request
  SentryOkHttpEventListener     →  9 DNS/TLS/connect sub-spans
  SQLiteSpanManager             →  db.sql.query per query
  SentryNavigationListener      →  navigation per route change
  UserInteractionIntegration    →  ui.action.click per gesture

TIER 3 — Manual (your code)
  Sentry.startTransaction() / ISpan.startChild() public API
```

**Binding matters:** For auto-instrumented child spans (OkHttp, SQLite, Fragment) to attach to your transaction, the transaction must be bound to scope: `opts.isBindToScope = true`.

---

## 3. App Start Tracing — Cold & Warm

**Unique to mobile.** Tracks from the earliest process initialization to first Activity render.

| Metric | Span operation | When |
|--------|---------------|------|
| **Cold start** | `app.start.cold` | Process launched from scratch |
| **Warm start** | `app.start.warm` | Process in memory, Activity recreated |

App start data appears as the **first child span** inside the first Activity's `ui.load` transaction. It is not a standalone transaction.

`SentryPerformanceProvider` — a `ContentProvider` in the SDK's manifest — captures the earliest possible timestamp before `Application.onCreate()`.

No configuration needed — app start tracking is automatic when Activity tracing is enabled.

---

## 4. Activity Lifecycle — TTID & TTFD

Activity tracing is **enabled by default**. Each Activity launch generates a `ui.load` transaction with TTID and optionally TTFD spans.

| Lifecycle event | SDK action |
|----------------|-----------|
| `onActivityPreCreated()` | Start `ui.load` transaction + `ui.load.initial_display` span |
| First frame rendered | Finish `ui.load.initial_display` (TTID complete) |
| `Sentry.reportFullyDisplayed()` | Finish `ui.load.full_display` (TTFD complete) |
| 25 s without `reportFullyDisplayed()` | Auto-finish TTFD with `DEADLINE_EXCEEDED` |

### TTID (Time to Initial Display)

Automatic — enabled with Activity tracing. Appears as `ui.load.initial_display` span.

### TTFD (Time to Full Display)

Opt-in. Call `Sentry.reportFullyDisplayed()` when all async content is loaded:

```kotlin
class ProductListActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_product_list)

        viewModel.products.observe(this) { products ->
            adapter.submitList(products)
            // Signal that the screen is fully populated with data
            Sentry.reportFullyDisplayed()
        }
    }
}
```

Enable in manifest:
```xml
<meta-data
    android:name="io.sentry.traces.time-to-full-display.enable"
    android:value="true" />
```

Or in code:
```kotlin
options.isEnableTimeToFullDisplayTracing = true
```

**Frame measurements** are automatically attached to every Activity transaction:

| Measurement key | Threshold |
|----------------|-----------|
| `frames_total` | All rendered frames |
| `frames_slow` | 16 ms – 700 ms per frame |
| `frames_frozen` | > 700 ms per frame |

Requires Android API 24+.

### Disable Activity tracing

```kotlin
options.isEnableAutoActivityLifecycleTracing = false
```

---

## 5. Fragment Lifecycle Tracing

Not enabled by default. Adds `FragmentLifecycleIntegration` to instrument Fragment screen loads.

```kotlin
import io.sentry.android.fragment.FragmentLifecycleIntegration

SentryAndroid.init(this) { options ->
    options.addIntegration(
        FragmentLifecycleIntegration(
            application = this,
            enableAutoFragmentLifecycleTracing = true,   // create spans (default: false)
            filterFragmentLifecycleBreadcrumbs = setOf(
                FragmentLifecycleState.CREATED,
                FragmentLifecycleState.RESUMED,
                FragmentLifecycleState.DESTROYED,
            )
        )
    )
}
```

Dependency:
```kotlin
implementation("io.sentry:sentry-android-fragment:8.33.0")
```

> **Important:** Fragment spans attach to `scopes.getTransaction()`. If no scope-bound transaction is active, fragment spans are silently dropped.

---

## 6. OkHttp Network Tracing

`SentryOkHttpInterceptor` creates a `http.client` span for every OkHttp request made while a transaction is active.

### Manual setup

```kotlin
import io.sentry.okhttp.SentryOkHttpInterceptor
import io.sentry.okhttp.SentryOkHttpEventListener

val okHttpClient = OkHttpClient.Builder()
    .eventListener(SentryOkHttpEventListener())    // 9 sub-spans (DNS, TLS, connect, etc.)
    .addInterceptor(
        SentryOkHttpInterceptor(
            captureFailedRequests = true,          // capture non-2xx as Sentry errors
            beforeSpan = { span, request, response ->
                // Return null to skip span for this request
                if (request.url.encodedPath.contains("/health")) null else span
            }
        )
    )
    .build()
```

Dependency:
```kotlin
implementation("io.sentry:sentry-okhttp:8.33.0")
```

### Sub-spans from `SentryOkHttpEventListener`

| Span | Phase |
|------|-------|
| `http.client.proxy_select_ms` | Proxy selection |
| `http.client.resolve_dns_ms` | DNS resolution |
| `http.connect_ms` | TCP connect |
| `http.connect.secure_connect_ms` | TLS handshake |
| `http.connection_ms` | Connection acquired from pool |
| `http.connection.request_headers_ms` | Request headers sent |
| `http.connection.request_body_ms` | Request body sent |
| `http.connection.response_headers_ms` | Response headers received |
| `http.connection.response_body_ms` | Response body consumed |

### Distributed tracing with OkHttp

OkHttp automatically attaches `sentry-trace` and `baggage` headers to requests targeting `tracePropagationTargets`. See [Distributed Tracing](#14-distributed-tracing).

> **Note:** On Android, OkHttp spans attach to the root transaction (not the innermost active span). HTTP spans always appear at transaction level.

---

## 7. SQLite / Room Database Tracing

Creates a `db.sql.query` span for every SQLite query when wrapped correctly.

### Manual setup (no Gradle Plugin)

```kotlin
import io.sentry.android.sqlite.SentrySupportSQLiteOpenHelper

// With Room:
val db = Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
    .openHelperFactory(SentrySupportSQLiteOpenHelper.Factory(FrameworkSQLiteOpenHelperFactory()))
    .build()
```

Dependency:
```kotlin
implementation("io.sentry:sentry-android-sqlite:8.33.0")
```

### Span data

Each `db.sql.query` span includes:
- `db.system`: `"sqlite"` or `"in-memory"`
- `db.name`: database file name
- `blocked_main_thread`: `true` if query ran on the main thread
- `call_stack`: in-app stack frames (when main thread is blocked)

> **Performance warning:** The `blocked_main_thread` field flags queries running on the main thread — a common source of UI jank. Move database queries to a background dispatcher.

---

## 8. Jetpack Compose Navigation

Creates a `navigation` transaction for each screen transition in `NavHost`.

### Manual setup

```kotlin
import io.sentry.compose.withSentryObservableEffect

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
        .withSentryObservableEffect(
            enableNavigationBreadcrumbs = true,
            enableNavigationTracing = true,
        )
    NavHost(navController = navController, startDestination = "home") {
        composable("home") { HomeScreen() }
        composable("profile/{userId}") { ProfileScreen() }
    }
}
```

### Labeling interactive elements

```kotlin
import io.sentry.compose.sentryTag

// sentryTag provides a label for user interaction transactions
Button(
    modifier = Modifier.sentryTag("checkout-button"),
    onClick = { onCheckout() }
) {
    Text("Checkout")
}
```

Dependency:
```kotlin
implementation("io.sentry:sentry-compose:8.33.0")
```

---

## 9. File I/O Tracing

Creates `file.read` and `file.write` spans for file operations. Manual setup wraps the standard Java I/O classes:

```kotlin
import io.sentry.instrumentation.file.SentryFileInputStream
import io.sentry.instrumentation.file.SentryFileOutputStream

// Reading
SentryFileInputStream(File(path)).use { input ->
    val buffer = ByteArray(4096)
    while (input.read(buffer) != -1) {
        // process
    }
} // span.finish() called automatically at close()

// Writing
SentryFileOutputStream(File(path)).use { output ->
    output.write(data)
}
```

Span description: `"report.pdf (512.0 kB)"` (with PII enabled) or `"***.pdf (512.0 kB)"` (default).

Enable full paths via:
```kotlin
options.isSendDefaultPii = true
```

---

## 10. User Interaction Tracing

Captures touch events (clicks, scrolls, swipes) as `ui.action.click` transactions. Disabled by default.

```kotlin
options.isEnableUserInteractionTracing = true
```

Via manifest:
```xml
<meta-data android:name="io.sentry.traces.user-interaction.enable" android:value="true" />
```

**Views require a resource ID** for meaningful transaction names. Views without IDs produce `"ActivityName.unknown_id"`.

```xml
<!-- Good — produces "HomeActivity.add_to_cart_button" -->
<Button android:id="@+id/add_to_cart_button" ... />

<!-- Bad — produces "HomeActivity.unknown_id" -->
<Button ... />
```

Transactions auto-finish after 3 s of inactivity (configurable via `options.idleTimeout`). Transactions with zero child spans are automatically discarded.

---

## 11. Slow & Frozen Frames

Automatically attached as **measurements** (not spans) to every Activity transaction. No configuration needed.

| Measurement | Threshold | Meaning |
|-------------|-----------|---------|
| `frames_total` | N/A | Total frames rendered during transaction |
| `frames_slow` | 16–700 ms | Frames that missed the vsync budget |
| `frames_frozen` | > 700 ms | Frames that caused visible freezes |

Requires Android API 24 (`FrameMetricsAggregator`). Silently disabled on older devices.

These appear in Sentry's **Mobile Vitals** section on transaction detail pages.

---

## 12. Sentry Gradle Plugin — Zero-Source-Change Instrumentation

The Gradle plugin instruments bytecode at build time, enabling all tracing features with **no source code changes**. Covers DATABASE, FILE_IO, OKHTTP, and COMPOSE.

```kotlin
// build.gradle.kts (app module)
plugins {
    id("io.sentry.android.gradle") version "5.1.0"
}

sentry {
    // Upload ProGuard/R8 mappings for de-obfuscated stack traces
    autoUploadProguardMapping = true

    // Upload native debug symbols
    uploadNativeSymbols = false
    includeNativeSources = false

    tracingInstrumentation {
        enabled = true
        features = setOf(
            InstrumentationFeature.DATABASE,  // Room/SQLite auto-instrumented
            InstrumentationFeature.FILE_IO,   // FileInputStream/OutputStream
            InstrumentationFeature.OKHTTP,    // OkHttpClient.Builder.build()
            InstrumentationFeature.COMPOSE,   // rememberNavController()
        )
        // Exclude specific packages from instrumentation
        excludes = setOf("com/third_party/generated/**")

        // Also instrument third-party libraries (default: true)
        forceInstrumentDependencies = true
    }
}
```

> **What the plugin transforms:**
> - `DATABASE`: Wraps `SupportSQLiteOpenHelper.Factory` with `SentrySupportSQLiteOpenHelper`
> - `FILE_IO`: Rewrites `new FileInputStream(f)` → `new SentryFileInputStream(f)` at all call sites
> - `OKHTTP`: Injects `.addInterceptor(new SentryOkHttpInterceptor())` before every `.build()` call
> - `COMPOSE`: Wraps `rememberNavController()` with `.withSentryObservableEffect()`

---

## 13. Custom Spans

### `Sentry.startTransaction()` — start a root transaction

```kotlin
import io.sentry.ITransaction
import io.sentry.Sentry
import io.sentry.SpanStatus
import io.sentry.TransactionOptions

// Option A: not bound to scope
// Auto-instrumented spans (OkHttp, SQLite) will NOT attach as children
val tx = Sentry.startTransaction("sync-contacts", "task")
try {
    doWork()
    tx.status = SpanStatus.OK
} catch (e: Exception) {
    tx.throwable = e
    tx.status = SpanStatus.INTERNAL_ERROR
    throw e
} finally {
    tx.finish() // MUST be called — otherwise the transaction is silently dropped
}

// Option B: bound to scope
// OkHttp, SQLite, Fragment spans from this thread attach automatically
val opts = TransactionOptions().apply {
    isBindToScope = true
}
val tx = Sentry.startTransaction("checkout-flow", "ui.action", opts)
try {
    placeOrder()   // OkHttp and DB spans attach as children automatically
    tx.status = SpanStatus.OK
} finally {
    tx.finish()
}
```

Java equivalent:
```java
TransactionOptions opts = new TransactionOptions();
opts.setBindToScope(true);
ITransaction tx = Sentry.startTransaction("checkout-flow", "ui.action", opts);
try {
    placeOrder();
    tx.setStatus(SpanStatus.OK);
} finally {
    tx.finish();
}
```

### `ISpan.startChild()` — add child spans

```kotlin
val tx = Sentry.startTransaction("data-sync", "task",
    TransactionOptions().apply { isBindToScope = true })

// Child span with try-finally (always correct — ensures finish() is called)
val fetchSpan = tx.startChild("http.client", "GET /api/users")
try {
    val users = apiClient.fetchUsers()
    fetchSpan.status = SpanStatus.OK
} catch (e: Exception) {
    fetchSpan.throwable = e
    fetchSpan.status = SpanStatus.INTERNAL_ERROR
    throw e
} finally {
    fetchSpan.finish() // MUST be called
}

tx.finish()
```

### `Sentry.getSpan()` — attach to current active span

```kotlin
// Attach a child to whatever span is currently active
fun processItem(item: Item) {
    val span = Sentry.getSpan()?.startChild("process.item", item.id)
    try {
        heavyProcessing(item)
        span?.status = SpanStatus.OK
    } finally {
        span?.finish()
    }
}
```

### Kotlin coroutines — propagate across dispatchers

Without `SentryContext`, spans started in one dispatcher won't see the parent from another.

```kotlin
import io.sentry.kotlin.SentryContext
import kotlinx.coroutines.withContext

suspend fun processOrder(orderId: String) {
    val tx = Sentry.startTransaction("process-order", "task",
        TransactionOptions().apply { isBindToScope = true })

    // SentryContext captures the current scope and propagates it to the IO dispatcher
    withContext(Dispatchers.IO + SentryContext()) {
        val order = db.getOrder(orderId)   // db.sql.query span attaches here
        paymentService.charge(order)       // http.client span attaches here
    }

    tx.status = SpanStatus.OK
    tx.finish()
}
```

Dependency:
```kotlin
implementation("io.sentry:sentry-kotlin-extensions:8.33.0")
```

### Span data, tags, and measurements

```kotlin
val span = Sentry.getSpan()?.startChild("encode.video", "720p")

// Arbitrary data (visible in span detail)
span?.setData("codec", "h264")
span?.setData("input.bytes", inputFile.length())
span?.setData("threads", Runtime.getRuntime().availableProcessors())

// String tags (indexed, filterable)
span?.setTag("format", "mp4")
span?.setTag("quality", "720p")

// Numeric measurements with units
span?.setMeasurement("encode.duration_ms", durationMs)
span?.setMeasurement("output.size", outputFile.length(), MeasurementUnit.Information.BYTE)

span?.status = SpanStatus.OK
span?.finish()
```

### `SpanStatus` reference

| Status | HTTP equivalent | When to use |
|--------|----------------|-------------|
| `OK` | 2xx/3xx | Success |
| `CANCELLED` | 499 | Client cancelled |
| `INTERNAL_ERROR` | 500 | Exception / internal failure |
| `DEADLINE_EXCEEDED` | 504 | Timed out |
| `NOT_FOUND` | 404 | Resource missing |
| `PERMISSION_DENIED` | 403 | Auth failure |
| `RESOURCE_EXHAUSTED` | 429 | Rate limited |
| `UNAVAILABLE` | 503 | Service down |
| `UNKNOWN` | — | Not yet classified |

```kotlin
// Convenience factory from HTTP status code
val status = SpanStatus.fromHttpStatusCode(response.code)
```

### Idle and deadline timeouts

```kotlin
val opts = TransactionOptions().apply {
    isBindToScope = true
    isWaitForChildren = true
    idleTimeout = 3_000L    // auto-finish 3 s after last child span ends
    deadlineTimeout = 30_000L // force-finish after 30 s regardless
}
```

### Hard span limit

Each transaction is capped at **1,000 child spans** (`options.maxSpans`, default `1000`). Spans beyond this are silently dropped. Increase if needed:

```kotlin
options.maxSpans = 2_000
```

---

## 14. Distributed Tracing

Connects Android traces to backend traces for end-to-end visibility.

### How it works

When a network request fires inside a transaction, the SDK attaches two headers:

| Header | Purpose |
|--------|---------|
| `sentry-trace` | Trace ID, span ID, sampling decision |
| `baggage` | Sampling metadata (release, environment, public key) |

The backend Sentry SDK reads these headers and links its spans to the same trace.

### `tracePropagationTargets`

Controls which URLs receive the headers. Default on Android: `".*"` (all URLs).

```kotlin
options.setTracePropagationTargets(listOf(
    "api.myapp.com",                         // string — matched against full URL
    "^https://.*\\.myapp\\.com/api/.*",      // regex — also matched against full URL
    "localhost",
))
```

Via manifest:
```xml
<meta-data
    android:name="io.sentry.traces.trace-propagation-targets"
    android:value="api.myapp.com,localhost" />
```

> **Security:** Remove `".*"` (the default) before going to production to avoid sending Sentry headers to third-party APIs.

### W3C `traceparent` header (SDK ≥ 8.22.0)

```kotlin
options.isPropagateTraceparent = true
// Adds: traceparent: 00-{traceId}-{spanId}-01
```

### Manual header attachment (non-OkHttp clients)

```kotlin
val span = Sentry.getSpan()
if (span != null) {
    myRequest.header("sentry-trace", span.toSentryTrace().value)
    span.toBaggageHeader(emptyList())?.let {
        myRequest.header("baggage", it.value)
    }
}
```

### Continuing a trace from incoming headers

```java
SentryTraceHeader traceHeader = new SentryTraceHeader(request.getHeader("sentry-trace"));
BaggageHeader baggageHeader = BaggageHeader.fromBaggageAndThirdPartyValues(
    request.getHeader("baggage"), null
);
TransactionContext ctx = TransactionContext.fromSentryTrace(
    "process-webhook", "task",
    traceHeader, baggageHeader,
    null
);
ITransaction tx = Sentry.startTransaction(ctx);
```

---

## 15. Dynamic Sampling

Use `tracesSampler` for context-aware sampling decisions instead of a uniform rate:

```kotlin
options.tracesSampler = TracesSamplerCallback { ctx ->
    val name = ctx.transactionContext.name
    when {
        // Always trace critical flows
        name.startsWith("Checkout") || name.startsWith("Payment") -> 1.0
        // Never trace health checks
        name.contains("HealthCheck") -> 0.0
        // Respect parent sampling for distributed traces
        ctx.transactionContext.parentSampled == true -> 1.0
        ctx.transactionContext.parentSampled == false -> 0.0
        // Default: 10%
        else -> 0.1
    }
}
```

Custom context (passed from `TransactionOptions`):

```kotlin
val opts = TransactionOptions().apply {
    customSamplingContext = CustomSamplingContext().apply {
        set("is_paying_user", userIsPaying)
    }
}
val tx = Sentry.startTransaction("user-action", "task", opts)

// In the sampler:
options.tracesSampler = TracesSamplerCallback { ctx ->
    if (ctx.customSamplingContext["is_paying_user"] == true) 1.0 else 0.1
}
```

---

## 16. Configuration Reference

### `SentryAndroid.init()` — tracing options

```kotlin
SentryAndroid.init(this) { options ->
    // ── Sampling ─────────────────────────────────────────────────────────
    options.tracesSampleRate = 0.2
    // options.tracesSampler = TracesSamplerCallback { ctx -> 0.1 }

    // ── Activity tracing ─────────────────────────────────────────────────
    options.isEnableAutoActivityLifecycleTracing = true        // default
    options.isEnableActivityLifecycleTracingAutoFinish = true  // default
    options.isEnableTimeToFullDisplayTracing = false            // opt-in

    // ── User interactions ────────────────────────────────────────────────
    options.isEnableUserInteractionTracing = false              // opt-in

    // ── Frame tracking ───────────────────────────────────────────────────
    options.isEnableFramesTracking = true                       // default (API 24+)

    // ── Transaction timeouts ─────────────────────────────────────────────
    options.idleTimeout = 3_000L                               // ms
    options.deadlineTimeout = 30_000L                          // ms
    options.maxSpans = 1_000                                    // per transaction

    // ── Distributed tracing ──────────────────────────────────────────────
    options.setTracePropagationTargets(listOf("api.myapp.com"))
    options.isPropagateTraceparent = false
}
```

### `AndroidManifest.xml` — tracing keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `io.sentry.traces.sample-rate` | Float | `null` | Traces sample rate 0.0–1.0 |
| `io.sentry.traces.activity.enable` | Boolean | `true` | Activity lifecycle tracing |
| `io.sentry.traces.activity.auto-finish.enable` | Boolean | `true` | Auto-finish Activity transactions |
| `io.sentry.traces.time-to-full-display.enable` | Boolean | `false` | TTFD tracking |
| `io.sentry.traces.user-interaction.enable` | Boolean | `false` | Gesture/click tracing |
| `io.sentry.traces.frames-tracking` | Boolean | `true` | Slow/frozen frame tracking |
| `io.sentry.traces.idle-timeout` | Long (ms) | `3000` | Idle transaction auto-finish delay |
| `io.sentry.traces.deadline-timeout` | Long (ms) | `30000` | Force-finish deadline |
| `io.sentry.traces.trace-propagation-targets` | String (CSV) | `".*"` | URLs that receive trace headers |

### Instrumentation approach comparison

| Feature | Enabled by default | Required setup | Source changes? | Gradle Plugin? |
|---------|-------------------|----------------|-----------------|---------------|
| Activity `ui.load` + TTID | ✅ | None | No | No |
| TTFD | ❌ | Manifest + `reportFullyDisplayed()` | 1 call | No |
| Fragment spans | ❌ | `addIntegration()` | No | No |
| OkHttp spans | ❌ | Add to builder | Yes | Optional |
| OkHttp sub-spans (DNS/TLS) | ❌ | Add `SentryOkHttpEventListener` | Yes | Optional |
| SQLite / Room | ❌ | Wrap factory | Yes | Optional |
| Compose navigation | ❌ | `.withSentryObservableEffect()` | Yes | Optional |
| File I/O | ❌ | Use `Sentry*` wrappers | Yes | Optional |
| User interaction | ❌ | Manifest flag | No | No |
| Slow/frozen frames | ✅ | None (API 24+) | No | No |
| **All above (plugin)** | N/A | Apply Gradle plugin | **No** | **Yes** |

---

## 17. Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No transactions in Sentry | `tracesSampleRate` not set or `0` | Set `tracesSampleRate > 0` |
| OkHttp spans missing | Interceptor not added | Add `SentryOkHttpInterceptor()` to `OkHttpClient.Builder` or apply Gradle plugin with `OKHTTP` feature |
| SQLite spans missing | Factory not wrapped | Use `SentrySupportSQLiteOpenHelper.Factory` or apply Gradle plugin with `DATABASE` feature |
| Fragment spans missing | No scope-bound parent transaction | Ensure the Activity transaction uses `isBindToScope = true` (it does by default for auto-instrumented transactions) |
| Child spans missing from custom transaction | `isBindToScope = false` | Set `TransactionOptions().isBindToScope = true` when starting a custom transaction |
| TTFD span shows `DEADLINE_EXCEEDED` | `reportFullyDisplayed()` not called within 25 s | Call `Sentry.reportFullyDisplayed()` when your async content finishes loading |
| TTID missing | Activity tracing disabled | Ensure `isEnableAutoActivityLifecycleTracing = true` (default) |
| App Start span missing | Not appearing correctly | App start appears as first child of first Activity `ui.load` transaction; verify Activity tracing is enabled |
| Slow/frozen frames not appearing | API < 24 or disabled | Requires Android 7.0+ (`FrameMetricsAggregator`); check `isEnableFramesTracking = true` |
| User interaction transactions missing | Views have no `android:id` | Add resource IDs to interactive views |
| `sentry-trace` header missing from OkHttp | `tracePropagationTargets` doesn't match URL | Check full URL against your patterns — matched against the entire URL string |
| Coroutine spans not linked | Missing `SentryContext` | Add `+ SentryContext()` to `withContext(Dispatchers.IO + SentryContext())` |
| Transaction never finishes | Idle timeout not reached | Verify `isWaitForChildren = true` and adjust `idleTimeout`; always call `tx.finish()` in `finally` |
| Spans silently dropped | Hit 1,000-span limit | Increase `options.maxSpans` or reduce instrumentation scope |
| Compose navigation spans missing | `COMPOSE` plugin feature not applied | Apply Gradle plugin with `InstrumentationFeature.COMPOSE` or call `.withSentryObservableEffect()` manually |
